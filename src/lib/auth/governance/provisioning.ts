/**
 * @file ProvisioningDirectory — an editable identity-provisioning store.
 *
 * Where `auth/active-directory` performs real OAuth/OIDC login and reads the
 * signed-in user from the IdP, this models the admin-console side: a mutable
 * list of configured identity providers plus the SCIM-style user records an
 * operator provisions, suspends, and deprovisions. Observable and
 * framework-agnostic, with optional audit forwarding.
 */

import { generateId } from './ids';
import type {
  AuditSink,
  IdentityProvider,
  ProvisionedUser,
  ProvisioningSnapshot,
  ProvisionStatus,
} from './types';

/** Options for {@link createProvisioningDirectory}. */
export interface ProvisioningConfig {
  /** Initial identity providers. */
  providers?: readonly IdentityProvider[];
  /** Initial user records. */
  users?: readonly ProvisionedUser[];
  /** Audit sink invoked on every mutation. */
  audit?: AuditSink;
  /** Default actor recorded in audit events. Default `'system'`. */
  actor?: string;
  /** Override the clock; must return an ISO-8601 string. */
  now?: () => string;
  /** Override id generation for new users. */
  generateId?: () => string;
  /** Called after every mutation with the new snapshot. */
  onChange?: (snapshot: ProvisioningSnapshot) => void;
}

/** Fields accepted when adding a user; `status` defaults to `'invited'`. */
export interface NewUserInput {
  email: string;
  displayName?: string;
  role?: string;
  providerId?: string;
  status?: ProvisionStatus;
  /** Optional explicit id; generated when omitted. */
  id?: string;
}

/** An editable directory of identity providers and provisioned users. */
export class ProvisioningDirectory {
  private providers: IdentityProvider[];
  private users: ProvisionedUser[];
  private readonly audit: AuditSink | undefined;
  private readonly actor: string;
  private readonly now: () => string;
  private readonly makeId: () => string;
  private readonly onChange: ((snapshot: ProvisioningSnapshot) => void) | undefined;
  private readonly listeners = new Set<() => void>();
  private snapshot: ProvisioningSnapshot;

  constructor(config: ProvisioningConfig = {}) {
    this.providers = (config.providers ?? []).map((p) => ({ ...p }));
    this.users = (config.users ?? []).map((u) => ({ ...u }));
    this.audit = config.audit;
    this.actor = config.actor ?? 'system';
    this.now = config.now ?? (() => new Date().toISOString());
    this.makeId = config.generateId ?? (() => generateId('usr'));
    this.onChange = config.onChange;
    this.snapshot = this.buildSnapshot();
  }

  /** All configured identity providers. */
  listProviders(): readonly IdentityProvider[] {
    return this.snapshot.providers;
  }

  /** All user records. */
  listUsers(): readonly ProvisionedUser[] {
    return this.snapshot.users;
  }

  /** Look up a single user record. */
  getUser(id: string): ProvisionedUser | undefined {
    return this.users.find((u) => u.id === id);
  }

  /** Enable/disable a provider; returns the resulting `enabled` state. */
  toggleProvider(id: string): boolean {
    const provider = this.providers.find((p) => p.id === id);
    if (provider == null) return false;
    provider.enabled = !provider.enabled;
    this.commit('idp.toggle', `${id}:${provider.enabled ? 'enabled' : 'disabled'}`);
    return provider.enabled;
  }

  /** Set a provider's `enabled` flag explicitly. */
  setProviderEnabled(id: string, enabled: boolean): void {
    const provider = this.providers.find((p) => p.id === id);
    if (provider == null || provider.enabled === enabled) return;
    provider.enabled = enabled;
    this.commit('idp.toggle', `${id}:${enabled ? 'enabled' : 'disabled'}`);
  }

  /** Add a new user record (defaults to `invited`); returns its id. */
  addUser(input: NewUserInput): string {
    const id = input.id ?? this.makeId();
    const user: ProvisionedUser = {
      id,
      email: input.email,
      status: input.status ?? 'invited',
      ...(input.displayName != null ? { displayName: input.displayName } : {}),
      ...(input.role != null ? { role: input.role } : {}),
      ...(input.providerId != null ? { providerId: input.providerId } : {}),
    };
    this.users = [...this.users, user];
    this.commit('scim.user.add', `${id}:${user.email}`);
    return id;
  }

  /**
   * Mark a user active and stamp `provisionedAt`. Use after an invite is
   * accepted or to (re)activate a suspended account.
   */
  provisionUser(id: string): void {
    this.updateUser(id, (u) => ({ ...u, status: 'active', provisionedAt: this.now() }));
    this.audit?.({ actor: this.actor, action: 'scim.user.provision', target: id });
  }

  /** Suspend a user without removing the record. */
  suspendUser(id: string): void {
    this.setUserStatus(id, 'suspended');
  }

  /** Deprovision (disable) a user; the record is retained for audit. */
  deprovisionUser(id: string): void {
    this.setUserStatus(id, 'deprovisioned');
  }

  /** Set a user's lifecycle status. */
  setUserStatus(id: string, status: ProvisionStatus): void {
    const before = this.getUser(id);
    if (before == null || before.status === status) return;
    this.updateUser(id, (u) => ({ ...u, status }));
    this.audit?.({ actor: this.actor, action: 'scim.user.status', target: `${id}:${status}` });
  }

  /** Assign a role to a user. */
  setUserRole(id: string, role: string): void {
    const before = this.getUser(id);
    if (before == null || before.role === role) return;
    this.updateUser(id, (u) => ({ ...u, role }));
    this.audit?.({ actor: this.actor, action: 'scim.user.role', target: `${id}:${role}` });
  }

  /** Remove a user record entirely. */
  removeUser(id: string): void {
    if (this.getUser(id) == null) return;
    this.users = this.users.filter((u) => u.id !== id);
    this.commit('scim.user.remove', id);
  }

  /** Subscribe to changes; returns an unsubscribe function. */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Current immutable snapshot, stable until the next mutation. */
  readonly getSnapshot = (): ProvisioningSnapshot => this.snapshot;

  private updateUser(id: string, patch: (user: ProvisionedUser) => ProvisionedUser): void {
    let changed = false;
    this.users = this.users.map((u) => {
      if (u.id !== id) return u;
      changed = true;
      return patch(u);
    });
    if (changed) this.refresh();
  }

  private buildSnapshot(): ProvisioningSnapshot {
    return {
      providers: this.providers.map((p) => ({ ...p })),
      users: this.users.map((u) => ({ ...u })),
    };
  }

  /** Rebuild the snapshot and notify, without emitting an audit event. */
  private refresh(): void {
    this.snapshot = this.buildSnapshot();
    this.onChange?.(this.snapshot);
    for (const listener of this.listeners) listener();
  }

  private commit(action: string, target: string): void {
    this.refresh();
    this.audit?.({ actor: this.actor, action, target });
  }
}

/** Create a {@link ProvisioningDirectory}. */
export function createProvisioningDirectory(
  config?: ProvisioningConfig
): ProvisioningDirectory {
  return new ProvisioningDirectory(config);
}
