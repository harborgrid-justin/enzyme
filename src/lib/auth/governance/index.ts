/**
 * Access-governance module
 *
 * Editable, observable building blocks for an admin-console view of access
 * governance — complementing the runtime enforcement in `auth/rbac` and the
 * login flows in `auth/active-directory`:
 *
 * - {@link AccessControl} — a mutable role→permission grant matrix plus
 *   member→role assignments, with derived `can()` enforcement.
 * - {@link ProvisioningDirectory} — editable identity providers and
 *   SCIM-style provisioned users.
 * - {@link AuditTrail} — an append-only, queryable business-audit log the
 *   other two can forward mutations to.
 *
 * @module auth/governance
 *
 * @example
 * ```ts
 * import {
 *   createAuditTrail,
 *   createAccessControl,
 *   createProvisioningDirectory,
 * } from '@/lib/auth/governance';
 *
 * const audit = createAuditTrail();
 * const access = createAccessControl({
 *   roles: ['admin', 'member'],
 *   permissions: ['reports:read', 'reports:write'],
 *   grants: { admin: ['*'], member: ['reports:read'] },
 *   members: { ada: 'admin', bo: 'member' },
 *   audit: audit.sink,
 * });
 *
 * access.toggleGrant('member', 'reports:write'); // edit the matrix
 * access.can('bo', 'reports:write');             // -> true (enforcement)
 *
 * const directory = createProvisioningDirectory({ audit: audit.sink });
 * const id = directory.addUser({ email: 'cleo@acme.test', role: 'member' });
 * directory.provisionUser(id);
 *
 * audit.list(); // every edit, newest-first
 * ```
 */

export { AccessControl, createAccessControl, WILDCARD_PERMISSION } from './access-control';
export type { AccessControlConfig } from './access-control';

export { AuditTrail, createAuditTrail } from './audit-trail';
export type { AuditTrailOptions } from './audit-trail';

export {
  ProvisioningDirectory,
  createProvisioningDirectory,
} from './provisioning';
export type { ProvisioningConfig, NewUserInput } from './provisioning';

export { useAccessControl, useAuditTrail, useProvisioningDirectory } from './hooks';

export type {
  AccessControlSnapshot,
  AuditEntry,
  AuditInput,
  AuditQuery,
  AuditSink,
  IdentityProvider,
  ProvisionedUser,
  ProvisioningSnapshot,
  ProvisionStatus,
} from './types';
