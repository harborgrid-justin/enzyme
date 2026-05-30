import { describe, expect, it } from 'vitest';
import {
  provisionUser,
  setMemberRole,
  toggleGrant,
  toggleIdp,
} from '../lib/governanceBridge';
import { SEED_IDPS, SEED_RBAC, SEED_SCIM } from '../seed.advanced';

describe('governanceBridge — RBAC via enzyme auth.createAccessControl', () => {
  it('grants then revokes a permission, reporting the resulting state', () => {
    const granted = toggleGrant(SEED_RBAC, 'editor', 'approvals.decide');
    expect(granted.granted).toBe(true);
    expect(granted.matrix.grants.editor).toContain('approvals.decide');

    const revoked = toggleGrant(granted.matrix, 'editor', 'approvals.decide');
    expect(revoked.granted).toBe(false);
    expect(revoked.matrix.grants.editor).not.toContain('approvals.decide');
  });

  it('preserves role/permission order and other roles when toggling', () => {
    const { matrix } = toggleGrant(SEED_RBAC, 'viewer', 'deploy');
    expect(matrix.roles).toEqual(SEED_RBAC.roles);
    expect(matrix.permissions).toEqual(SEED_RBAC.permissions);
    expect(matrix.grants.admin).toEqual(SEED_RBAC.grants.admin);
    expect(matrix.grants.viewer).toEqual(['deploy']);
  });

  it('reassigns a single member without touching the others', () => {
    const matrix = setMemberRole(SEED_RBAC, 'Ana', 'admin');
    expect(matrix.members.find((m) => m.name === 'Ana')?.role).toBe('admin');
    expect(matrix.members.find((m) => m.name === 'Ada')?.role).toBe('owner');
    expect(matrix.members).toHaveLength(SEED_RBAC.members.length);
  });
});

describe('governanceBridge — SSO/SCIM via enzyme auth.createProvisioningDirectory', () => {
  it('toggles an IdP and keeps the domain the framework type does not model', () => {
    const { idps } = toggleIdp(SEED_IDPS, SEED_SCIM, 'idp-entra');
    const entra = idps.find((i) => i.id === 'idp-entra');
    expect(entra?.enabled).toBe(true); // seed is false
    expect(entra?.domain).toBe('acme.com'); // preserved through the round-trip
    expect(idps.find((i) => i.id === 'idp-okta')?.enabled).toBe(true);
  });

  it('provisions an unprovisioned user', () => {
    const { scim } = provisionUser(SEED_IDPS, SEED_SCIM, 'u-noa');
    expect(scim.find((u) => u.id === 'u-noa')?.provisioned).toBe(true);
    expect(scim.find((u) => u.id === 'u-ravi')?.provisioned).toBe(false);
  });
});
