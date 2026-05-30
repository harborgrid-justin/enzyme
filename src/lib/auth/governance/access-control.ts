/**
 * @file AccessControl — an editable, observable RBAC grant matrix.
 *
 * Where `auth/rbac` enforces the *current* user's permissions from a static
 * config, this models the admin-console side: a mutable role→permission grant
 * matrix plus member→role assignments that an operator edits at runtime. The
 * same data also answers enforcement questions via {@link AccessControl.can},
 * so a single source of truth drives both the editor UI and access checks.
 *
 * Every mutation can be forwarded to an {@link AuditSink} and notifies
 * subscribers, and the store is framework-agnostic (no React/DOM in the core).
 *
 * Security note: {@link AccessControl.can} is a client-side, UX-level check
 * derived from editable data — it is NOT a server security boundary. A real
 * deployment must re-enforce every decision on the server; treat this matrix as
 * an admin-console model and a hint for hiding/disabling UI, nothing more.
 */

import type { AccessControlSnapshot, AuditSink } from './types';

/** The wildcard permission that grants everything when {@link AccessControlConfig.wildcard} is on. */
export const WILDCARD_PERMISSION = '*';

/** Options for {@link createAccessControl}. */
export interface AccessControlConfig {
  /** Known role ids. */
  roles: readonly string[];
  /** Known permission ids. */
  permissions: readonly string[];
  /** Initial role → permission grants. */
  grants?: Readonly<Record<string, readonly string[]>>;
  /** Initial member → role assignments. */
  members?: Readonly<Record<string, string>>;
  /** Treat a `'*'` grant as "all permissions". Default `true`. */
  wildcard?: boolean;
  /** Audit sink invoked on every mutation. */
  audit?: AuditSink;
  /** Default actor recorded in audit events. Default `'system'`. */
  actor?: string;
  /** Called after every mutation with the new snapshot. */
  onChange?: (snapshot: AccessControlSnapshot) => void;
}

function freezeSnapshot(
  roles: string[],
  permissions: string[],
  grants: Record<string, string[]>,
  members: Record<string, string>
): AccessControlSnapshot {
  return {
    roles: [...roles],
    permissions: [...permissions],
    grants: Object.fromEntries(Object.entries(grants).map(([r, p]) => [r, [...p]])),
    members: { ...members },
  };
}

/** An editable RBAC grant matrix with derived enforcement. */
export class AccessControl {
  private roles: string[];
  private permissions: string[];
  /** role → Set of permission ids. */
  private grants: Map<string, Set<string>>;
  /** member → role id. */
  private members: Map<string, string>;
  private readonly wildcard: boolean;
  private readonly audit: AuditSink | undefined;
  private readonly actor: string;
  private readonly onChange: ((snapshot: AccessControlSnapshot) => void) | undefined;
  private readonly listeners = new Set<() => void>();
  private snapshot: AccessControlSnapshot;

  constructor(config: AccessControlConfig) {
    this.roles = [...config.roles];
    this.permissions = [...config.permissions];
    this.wildcard = config.wildcard ?? true;
    this.audit = config.audit;
    this.actor = config.actor ?? 'system';
    this.onChange = config.onChange;

    this.grants = new Map();
    for (const role of this.roles) this.grants.set(role, new Set());
    if (config.grants != null) {
      for (const [role, perms] of Object.entries(config.grants)) {
        if (!this.grants.has(role)) {
          this.roles.push(role);
          this.grants.set(role, new Set());
        }
        const set = this.grants.get(role);
        if (set != null) for (const p of perms) set.add(p);
      }
    }

    this.members = new Map(Object.entries(config.members ?? {}));
    this.snapshot = this.buildSnapshot();
  }

  /** Known role ids. */
  getRoles(): readonly string[] {
    return this.snapshot.roles;
  }

  /** Known permission ids. */
  getPermissions(): readonly string[] {
    return this.snapshot.permissions;
  }

  /** Permission ids granted to `role`. */
  getRoleGrants(role: string): readonly string[] {
    const set = this.grants.get(role);
    return set != null ? [...set] : [];
  }

  /** Whether `role` is directly granted `permission`. */
  hasGrant(role: string, permission: string): boolean {
    return this.grants.get(role)?.has(permission) ?? false;
  }

  /** Grant `permission` to `role` (no-op if already granted). */
  grant(role: string, permission: string): void {
    const set = this.ensureRole(role);
    this.ensurePermission(permission);
    if (set.has(permission)) return;
    set.add(permission);
    this.commit('rbac.grant', `${role}:${permission}`);
  }

  /** Revoke `permission` from `role` (no-op if not granted). */
  revoke(role: string, permission: string): void {
    const set = this.grants.get(role);
    if (set == null) return;
    if (!set.has(permission)) return;
    set.delete(permission);
    this.commit('rbac.revoke', `${role}:${permission}`);
  }

  /** Toggle a grant; returns the resulting state (`true` = now granted). */
  toggleGrant(role: string, permission: string): boolean {
    if (this.hasGrant(role, permission)) {
      this.revoke(role, permission);
      return false;
    }
    this.grant(role, permission);
    return true;
  }

  /** Assign `member` to `role`. */
  setMemberRole(member: string, role: string): void {
    this.ensureRole(role);
    if (this.members.get(member) === role) return;
    this.members.set(member, role);
    this.commit('rbac.member.assign', `${member}:${role}`);
  }

  /** Remove `member`'s assignment. */
  removeMember(member: string): void {
    if (!this.members.has(member)) return;
    this.members.delete(member);
    this.commit('rbac.member.remove', member);
  }

  /** The role id assigned to `member`, if any. */
  getMemberRole(member: string): string | undefined {
    return this.members.get(member);
  }

  /** All member assignments. */
  listMembers(): Array<{ member: string; role: string }> {
    return [...this.members.entries()].map(([member, role]) => ({ member, role }));
  }

  /**
   * Enforcement derived from the matrix: does `member`'s role grant
   * `permission`? Honors the wildcard grant when enabled.
   */
  can(member: string, permission: string): boolean {
    const role = this.members.get(member);
    if (role == null) return false;
    const set = this.grants.get(role);
    if (set == null) return false;
    if (this.wildcard && set.has(WILDCARD_PERMISSION)) return true;
    return set.has(permission);
  }

  /** Whether `role` (directly) grants `permission`, honoring the wildcard. */
  roleCan(role: string, permission: string): boolean {
    const set = this.grants.get(role);
    if (set == null) return false;
    if (this.wildcard && set.has(WILDCARD_PERMISSION)) return true;
    return set.has(permission);
  }

  /** Subscribe to changes; returns an unsubscribe function. */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Current immutable snapshot, stable until the next mutation. */
  readonly getSnapshot = (): AccessControlSnapshot => this.snapshot;

  private ensureRole(role: string): Set<string> {
    let set = this.grants.get(role);
    if (set == null) {
      set = new Set();
      this.grants.set(role, set);
      this.roles.push(role);
    }
    return set;
  }

  private ensurePermission(permission: string): void {
    if (permission !== WILDCARD_PERMISSION && !this.permissions.includes(permission)) {
      this.permissions.push(permission);
    }
  }

  private buildSnapshot(): AccessControlSnapshot {
    const grants: Record<string, string[]> = {};
    for (const [role, set] of this.grants) grants[role] = [...set];
    return freezeSnapshot(this.roles, this.permissions, grants, Object.fromEntries(this.members));
  }

  private commit(action: string, target: string): void {
    this.snapshot = this.buildSnapshot();
    this.audit?.({ actor: this.actor, action, target });
    this.onChange?.(this.snapshot);
    for (const listener of this.listeners) listener();
  }
}

/** Create an {@link AccessControl} matrix. */
export function createAccessControl(config: AccessControlConfig): AccessControl {
  return new AccessControl(config);
}
