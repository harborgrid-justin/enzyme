import { describe, expect, it, vi } from 'vitest';
import { createAccessControl } from './access-control';
import { createAuditTrail } from './audit-trail';

function setup() {
  return createAccessControl({
    roles: ['admin', 'member'],
    permissions: ['reports:read', 'reports:write'],
    grants: { admin: ['*'], member: ['reports:read'] },
    members: { ada: 'admin', bo: 'member' },
  });
}

describe('AccessControl', () => {
  it('toggles grants and reports the resulting state', () => {
    const ac = setup();
    expect(ac.hasGrant('member', 'reports:write')).toBe(false);
    expect(ac.toggleGrant('member', 'reports:write')).toBe(true);
    expect(ac.hasGrant('member', 'reports:write')).toBe(true);
    expect(ac.toggleGrant('member', 'reports:write')).toBe(false);
    expect(ac.getRoleGrants('member')).toEqual(['reports:read']);
  });

  it('derives can() from member role + grants, honoring the wildcard', () => {
    const ac = setup();
    expect(ac.can('ada', 'reports:write')).toBe(true); // admin has '*'
    expect(ac.can('bo', 'reports:read')).toBe(true);
    expect(ac.can('bo', 'reports:write')).toBe(false);
    expect(ac.can('nobody', 'reports:read')).toBe(false); // unassigned member
  });

  it('updates enforcement when a member is reassigned', () => {
    const ac = setup();
    expect(ac.can('bo', 'reports:write')).toBe(false);
    ac.setMemberRole('bo', 'admin');
    expect(ac.getMemberRole('bo')).toBe('admin');
    expect(ac.can('bo', 'reports:write')).toBe(true);
    ac.removeMember('bo');
    expect(ac.can('bo', 'reports:write')).toBe(false);
  });

  it('auto-registers unknown roles/permissions on grant', () => {
    const ac = setup();
    ac.grant('auditor', 'logs:read');
    expect(ac.getRoles()).toContain('auditor');
    expect(ac.getPermissions()).toContain('logs:read');
    expect(ac.hasGrant('auditor', 'logs:read')).toBe(true);
  });

  it('respects wildcard:false (no implicit all-access)', () => {
    const ac = createAccessControl({
      roles: ['admin'],
      permissions: ['a'],
      grants: { admin: ['*'] },
      members: { ada: 'admin' },
      wildcard: false,
    });
    expect(ac.can('ada', 'a')).toBe(false);
    expect(ac.roleCan('admin', '*')).toBe(true);
  });

  it('forwards every mutation to the audit sink with actor + target', () => {
    const audit = createAuditTrail();
    const ac = createAccessControl({
      roles: ['member'],
      permissions: ['x'],
      audit: audit.sink,
      actor: 'ada',
    });
    ac.grant('member', 'x');
    ac.setMemberRole('bo', 'member');
    const actions = audit.list().map((e) => e.action);
    expect(actions).toEqual(['rbac.member.assign', 'rbac.grant']);
    expect(audit.list().every((e) => e.actor === 'ada')).toBe(true);
  });

  it('produces a stable snapshot that changes only on mutation', () => {
    const ac = setup();
    const snap = ac.getSnapshot();
    expect(ac.getSnapshot()).toBe(snap);
    ac.grant('member', 'reports:write');
    expect(ac.getSnapshot()).not.toBe(snap);
    expect(ac.getSnapshot().grants.member).toContain('reports:write');
  });

  it('is a no-op (no audit, no notify) when toggling to the same state', () => {
    const listener = vi.fn();
    const ac = setup();
    ac.subscribe(listener);
    ac.revoke('member', 'reports:write'); // not granted -> no change
    expect(listener).not.toHaveBeenCalled();
  });
});
