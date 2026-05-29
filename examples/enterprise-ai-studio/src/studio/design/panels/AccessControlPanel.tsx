import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Badge, Card } from '../ui';
import { can, effectivePermissions } from '../lib/governance';
import type { Role } from '../types.advanced';

/** Feature #27 — role-based access control matrix. */
export function AccessControlPanel(): React.ReactElement {
  const rbac = useAdvancedStore((s) => s.rbac);
  const toggleGrant = useAdvancedStore((s) => s.toggleGrant);
  const setMemberRole = useAdvancedStore((s) => s.setMemberRole);

  return (
    <div className="space-y-4">
      <SectionHeader title="Access control" subtitle="Role → permission grants and member assignments" />

      <Card>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Permission matrix</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="py-1.5 pr-3 text-left font-medium text-slate-600">Permission</th>
                {rbac.roles.map((r) => (
                  <th key={r} className="px-2 py-1.5 text-center font-medium capitalize text-slate-600">
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rbac.permissions.map((perm) => (
                <tr key={perm} className="border-t border-slate-100">
                  <td className="py-1.5 pr-3 font-mono text-slate-700">{perm}</td>
                  {rbac.roles.map((role) => {
                    const granted = can(rbac, role, perm);
                    const locked = role === 'owner';
                    return (
                      <td key={role} className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() => toggleGrant(role, perm)}
                          className={
                            granted
                              ? 'font-bold text-emerald-600 disabled:opacity-60'
                              : 'text-slate-300 hover:text-slate-500'
                          }
                          title={locked ? 'owner always has all permissions' : 'toggle'}
                        >
                          {granted ? '✓' : '○'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Members</p>
        <div className="space-y-2">
          {rbac.members.map((m) => (
            <div key={m.name} className="flex items-center gap-3">
              <span className="w-24 text-sm font-medium text-slate-800">{m.name}</span>
              <select
                value={m.role}
                onChange={(e) => setMemberRole(m.name, e.target.value as Role)}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              >
                {rbac.roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <Badge tone="slate">{effectivePermissions(rbac, m.role)} perms</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
