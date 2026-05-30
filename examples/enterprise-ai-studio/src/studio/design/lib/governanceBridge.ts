/**
 * Bridge between the advanced store's governance slices and enzyme's
 * `auth` governance primitives (`createAccessControl`,
 * `createProvisioningDirectory`).
 *
 * The store is persisted, so we don't hold long-lived framework instances
 * (they'd re-seed on reload and diverge from the persisted state). Instead each
 * mutation rebuilds a framework store from the current slice, applies the edit
 * through the framework's tested logic, and maps the resulting snapshot back to
 * the example's shapes. The framework store is the single implementation of the
 * grant-toggle / member-assignment / provisioning semantics; this module just
 * adapts the data shapes (the example's `RbacMatrix` keeps roles/permissions in
 * a fixed order and carries an IdP `domain` the framework type doesn't model).
 */
import { auth } from '@missionfabric-js/enzyme';
import type { IdentityProvider, RbacMatrix, Role, ScimUser } from '../types.advanced';

// --- RBAC --------------------------------------------------------------------

function accessControlFrom(matrix: RbacMatrix): auth.AccessControl {
  const grants: Record<string, string[]> = {};
  for (const role of matrix.roles) grants[role] = [...(matrix.grants[role] ?? [])];
  const members: Record<string, string> = {};
  for (const member of matrix.members) members[member.name] = member.role;
  // wildcard off: the example expresses "owner = all" in its `can()` helper,
  // not via a '*' grant, so the matrix data stays literal.
  return auth.createAccessControl({
    roles: matrix.roles,
    permissions: matrix.permissions,
    grants,
    members,
    wildcard: false,
  });
}

function matrixFrom(control: auth.AccessControl, base: RbacMatrix): RbacMatrix {
  const snapshot = control.getSnapshot();
  const grants = {} as Record<Role, string[]>;
  for (const role of base.roles) grants[role] = [...(snapshot.grants[role] ?? [])];
  return {
    roles: base.roles,
    permissions: base.permissions,
    grants,
    members: base.members.map((member) => ({
      name: member.name,
      role: (snapshot.members[member.name] ?? member.role) as Role,
    })),
  };
}

/** Toggle a role's permission via the framework matrix; returns the new matrix + state. */
export function toggleGrant(
  matrix: RbacMatrix,
  role: Role,
  permission: string
): { matrix: RbacMatrix; granted: boolean } {
  const control = accessControlFrom(matrix);
  const granted = control.toggleGrant(role, permission);
  return { matrix: matrixFrom(control, matrix), granted };
}

/** Reassign a member's role via the framework matrix; returns the new matrix. */
export function setMemberRole(matrix: RbacMatrix, name: string, role: Role): RbacMatrix {
  const control = accessControlFrom(matrix);
  control.setMemberRole(name, role);
  return matrixFrom(control, matrix);
}

// --- SSO / SCIM --------------------------------------------------------------

function directoryFrom(
  idps: IdentityProvider[],
  scim: ScimUser[]
): auth.ProvisioningDirectory {
  return auth.createProvisioningDirectory({
    providers: idps.map((idp) => ({
      id: idp.id,
      name: idp.name,
      protocol: idp.protocol,
      enabled: idp.enabled,
      metadata: { domain: idp.domain },
    })),
    users: scim.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.provisioned ? 'active' : 'invited',
    })),
  });
}

function fromDirectory(
  directory: auth.ProvisioningDirectory,
  baseIdps: IdentityProvider[],
  baseScim: ScimUser[]
): { idps: IdentityProvider[]; scim: ScimUser[] } {
  const snapshot = directory.getSnapshot();
  const idps = baseIdps.map((idp) => {
    const provider = snapshot.providers.find((p) => p.id === idp.id);
    return provider != null ? { ...idp, enabled: provider.enabled } : idp;
  });
  const scim = baseScim.map((user) => {
    const provisioned = snapshot.users.find((u) => u.id === user.id);
    return provisioned != null
      ? { ...user, provisioned: provisioned.status === 'active' }
      : user;
  });
  return { idps, scim };
}

/** Enable/disable an identity provider via the framework directory. */
export function toggleIdp(
  idps: IdentityProvider[],
  scim: ScimUser[],
  id: string
): { idps: IdentityProvider[]; scim: ScimUser[] } {
  const directory = directoryFrom(idps, scim);
  directory.toggleProvider(id);
  return fromDirectory(directory, idps, scim);
}

/** Provision a SCIM user (mark active) via the framework directory. */
export function provisionUser(
  idps: IdentityProvider[],
  scim: ScimUser[],
  id: string
): { idps: IdentityProvider[]; scim: ScimUser[] } {
  const directory = directoryFrom(idps, scim);
  directory.provisionUser(id);
  return fromDirectory(directory, idps, scim);
}
