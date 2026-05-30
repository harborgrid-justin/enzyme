/**
 * @file Access-governance types
 *
 * Shared types for the governance primitives — an editable RBAC grant matrix,
 * an identity-provisioning directory, and a business audit trail. These model
 * access governance as *editable, observable data* (the admin-console side),
 * complementing the runtime enforcement provided by {@link module:auth/rbac}.
 */

/** A single business-audit record. */
export interface AuditEntry {
  /** Stable identifier for the entry. */
  id: string;
  /** Who performed the action (user id, name, or service principal). */
  actor: string;
  /** What happened, typically a dotted verb such as `rbac.grant`. */
  action: string;
  /** What the action was performed on (e.g. `admin:reports:read`). */
  target: string;
  /** ISO-8601 timestamp of when the action occurred. */
  at: string;
  /** Optional structured context. */
  metadata?: Record<string, unknown>;
}

/** The shape passed to {@link AuditTrail.record} — `id`/`at` are filled in. */
export interface AuditInput {
  actor: string;
  action: string;
  target: string;
  metadata?: Record<string, unknown>;
}

/** A sink that receives audit events; lets stores forward to a shared trail. */
export type AuditSink = (event: AuditInput) => void;

/** Filter for {@link AuditTrail.query}. All fields are ANDed. */
export interface AuditQuery {
  actor?: string;
  action?: string;
  target?: string;
  /** Inclusive lower bound (ISO-8601). */
  since?: string;
  /** Inclusive upper bound (ISO-8601). */
  until?: string;
  /** Cap the number of (newest-first) results. */
  limit?: number;
}

/** Immutable snapshot of an {@link AccessControl} matrix. */
export interface AccessControlSnapshot {
  /** All known role ids, in insertion order. */
  roles: readonly string[];
  /** All known permission ids, in insertion order. */
  permissions: readonly string[];
  /** Role id → the permission ids granted to it. */
  grants: Readonly<Record<string, readonly string[]>>;
  /** Member id → the role id assigned to them. */
  members: Readonly<Record<string, string>>;
}

/** Lifecycle status of a provisioned identity. */
export type ProvisionStatus = 'invited' | 'active' | 'suspended' | 'deprovisioned';

/** A configured identity provider (SAML/OIDC/SCIM endpoint). */
export interface IdentityProvider {
  id: string;
  name: string;
  /** Wire protocol, e.g. `saml`, `oidc`, `scim`. */
  protocol: string;
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

/** A user record managed by the provisioning directory. */
export interface ProvisionedUser {
  id: string;
  email: string;
  displayName?: string;
  /** Assigned role id (resolved against an {@link AccessControl} if shared). */
  role?: string;
  status: ProvisionStatus;
  /** The id of the {@link IdentityProvider} this user came from. */
  providerId?: string;
  /** ISO-8601 timestamp of the last successful provision. */
  provisionedAt?: string;
}

/** Immutable snapshot of a {@link ProvisioningDirectory}. */
export interface ProvisioningSnapshot {
  providers: readonly IdentityProvider[];
  users: readonly ProvisionedUser[];
}
