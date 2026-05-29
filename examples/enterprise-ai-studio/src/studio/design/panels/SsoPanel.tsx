import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Btn, Badge, Card, Stat } from '../ui';
import { scimDiff } from '../lib/governance';

/** Feature #28 — SSO identity providers + SCIM directory sync. */
export function SsoPanel(): React.ReactElement {
  const idps = useAdvancedStore((s) => s.idps);
  const scim = useAdvancedStore((s) => s.scim);
  const toggleIdp = useAdvancedStore((s) => s.toggleIdp);
  const provisionUser = useAdvancedStore((s) => s.provisionUser);
  const plan = scimDiff(scim);

  return (
    <div className="space-y-4">
      <SectionHeader title="SSO & SCIM" subtitle="Enterprise sign-on and automated user provisioning" />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="In sync" value={plan.inSync.length} />
        <Stat label="To provision" value={plan.toAdd.length} />
        <Stat label="Providers" value={idps.filter((i) => i.enabled).length} />
      </div>

      <Card>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Identity providers</p>
        <div className="space-y-2">
          {idps.map((idp) => (
            <div key={idp.id} className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-800">{idp.name}</span>
              <Badge tone="indigo">{idp.protocol.toUpperCase()}</Badge>
              <span className="text-xs text-slate-500">{idp.domain}</span>
              <Btn
                variant={idp.enabled ? 'danger' : 'primary'}
                onClick={() => toggleIdp(idp.id)}
              >
                {idp.enabled ? 'Disable' : 'Enable'}
              </Btn>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          SCIM directory ({scim.length})
        </p>
        <div className="space-y-2">
          {scim.map((u) => (
            <div key={u.id} className="flex items-center gap-3">
              <span className="text-sm text-slate-700">{u.email}</span>
              <Badge tone="slate">{u.role}</Badge>
              {u.provisioned ? (
                <Badge tone="emerald">provisioned</Badge>
              ) : (
                <Btn variant="primary" onClick={() => provisionUser(u.id)}>Provision</Btn>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
