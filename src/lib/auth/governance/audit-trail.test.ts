import { describe, expect, it, vi } from 'vitest';
import { createAuditTrail } from './audit-trail';

describe('AuditTrail', () => {
  it('records entries newest-first with generated id and timestamp', () => {
    let t = 0;
    const trail = createAuditTrail({
      generateId: () => `id-${t}`,
      now: () => `2026-01-01T00:00:0${t}.000Z`,
    });
    t = 1;
    trail.record({ actor: 'ada', action: 'rbac.grant', target: 'admin:reports:read' });
    t = 2;
    const second = trail.record({ actor: 'bo', action: 'rbac.revoke', target: 'member:x' });

    const list = trail.list();
    expect(list).toHaveLength(2);
    expect(list[0]).toBe(second);
    expect(list[0]?.id).toBe('id-2');
    expect(list[0]?.at).toBe('2026-01-01T00:00:02.000Z');
    expect(list[1]?.actor).toBe('ada');
  });

  it('caps retained entries at the configured limit', () => {
    const trail = createAuditTrail({ limit: 2 });
    trail.record({ actor: 'a', action: 'x', target: '1' });
    trail.record({ actor: 'a', action: 'x', target: '2' });
    trail.record({ actor: 'a', action: 'x', target: '3' });
    expect(trail.list().map((e) => e.target)).toEqual(['3', '2']);
  });

  it('queries by actor/action/target and time window', () => {
    const trail = createAuditTrail({ now: () => '2026-03-01T12:00:00.000Z' });
    trail.record({ actor: 'ada', action: 'rbac.grant', target: 'admin:a' });
    trail.record({ actor: 'bo', action: 'rbac.grant', target: 'member:b' });

    expect(trail.query({ actor: 'ada' })).toHaveLength(1);
    expect(trail.query({ action: 'rbac.grant' })).toHaveLength(2);
    expect(trail.query({ since: '2026-03-01T00:00:00.000Z' })).toHaveLength(2);
    expect(trail.query({ until: '2026-02-01T00:00:00.000Z' })).toHaveLength(0);
    expect(trail.query({ action: 'rbac.grant', limit: 1 })).toHaveLength(1);
  });

  it('returns a stable snapshot reference until the next mutation', () => {
    const trail = createAuditTrail();
    const a = trail.getSnapshot();
    expect(trail.getSnapshot()).toBe(a);
    trail.record({ actor: 'a', action: 'x', target: '1' });
    expect(trail.getSnapshot()).not.toBe(a);
  });

  it('notifies subscribers on record and clear, and stops after unsubscribe', () => {
    const trail = createAuditTrail();
    const listener = vi.fn();
    const off = trail.subscribe(listener);
    trail.record({ actor: 'a', action: 'x', target: '1' });
    expect(listener).toHaveBeenCalledTimes(1);
    trail.clear();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(trail.list()).toHaveLength(0);
    off();
    trail.record({ actor: 'a', action: 'x', target: '2' });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('exposes a bound sink usable as an AuditSink', () => {
    const trail = createAuditTrail();
    const {sink} = trail;
    sink({ actor: 'svc', action: 'idp.toggle', target: 'okta:enabled' });
    expect(trail.list()[0]?.actor).toBe('svc');
  });
});
