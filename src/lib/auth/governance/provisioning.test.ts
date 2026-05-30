import { describe, expect, it } from 'vitest';
import { createProvisioningDirectory } from './provisioning';
import { createAuditTrail } from './audit-trail';

describe('ProvisioningDirectory', () => {
  it('toggles identity providers and reports the new state', () => {
    const dir = createProvisioningDirectory({
      providers: [{ id: 'okta', name: 'Okta', protocol: 'saml', enabled: false }],
    });
    expect(dir.toggleProvider('okta')).toBe(true);
    expect(dir.listProviders()[0]?.enabled).toBe(true);
    dir.setProviderEnabled('okta', false);
    expect(dir.listProviders()[0]?.enabled).toBe(false);
    expect(dir.toggleProvider('missing')).toBe(false);
  });

  it('adds, provisions, and stamps users', () => {
    const dir = createProvisioningDirectory({
      generateId: () => 'usr-1',
      now: () => '2026-05-01T00:00:00.000Z',
    });
    const id = dir.addUser({ email: 'cleo@acme.test', role: 'member' });
    expect(id).toBe('usr-1');
    expect(dir.getUser(id)?.status).toBe('invited');

    dir.provisionUser(id);
    const user = dir.getUser(id);
    expect(user?.status).toBe('active');
    expect(user?.provisionedAt).toBe('2026-05-01T00:00:00.000Z');
  });

  it('suspends, deprovisions, sets role, and removes users', () => {
    const dir = createProvisioningDirectory({
      users: [{ id: 'u1', email: 'a@b.test', status: 'active' }],
    });
    dir.suspendUser('u1');
    expect(dir.getUser('u1')?.status).toBe('suspended');
    dir.deprovisionUser('u1');
    expect(dir.getUser('u1')?.status).toBe('deprovisioned');
    dir.setUserRole('u1', 'auditor');
    expect(dir.getUser('u1')?.role).toBe('auditor');
    dir.removeUser('u1');
    expect(dir.getUser('u1')).toBeUndefined();
    expect(dir.listUsers()).toHaveLength(0);
  });

  it('forwards mutations to the audit sink', () => {
    const audit = createAuditTrail();
    const dir = createProvisioningDirectory({
      providers: [{ id: 'okta', name: 'Okta', protocol: 'saml', enabled: false }],
      audit: audit.sink,
      actor: 'ada',
      generateId: () => 'usr-1',
    });
    dir.toggleProvider('okta');
    const id = dir.addUser({ email: 'x@y.test' });
    dir.provisionUser(id);

    const actions = audit.list().map((e) => e.action);
    expect(actions).toContain('idp.toggle');
    expect(actions).toContain('scim.user.add');
    expect(actions).toContain('scim.user.provision');
    expect(audit.list().every((e) => e.actor === 'ada')).toBe(true);
  });

  it('exposes a stable snapshot that changes only on mutation', () => {
    const dir = createProvisioningDirectory({
      users: [{ id: 'u1', email: 'a@b.test', status: 'active' }],
    });
    const snap = dir.getSnapshot();
    expect(dir.getSnapshot()).toBe(snap);
    dir.suspendUser('u1');
    expect(dir.getSnapshot()).not.toBe(snap);
  });
});
