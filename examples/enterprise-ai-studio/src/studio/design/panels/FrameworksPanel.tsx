import { useComplianceStore } from '../complianceStore';
import { SectionHeader, Badge, Card, Stat } from '../ui';
import { frameworkReadiness, overallReadiness } from '../lib/compliance';
import type { ComplianceFramework, ControlStatus } from '../types.compliance';

const FRAMEWORKS: ComplianceFramework[] = ['SOC 2', 'ISO 27001', 'GDPR'];

const STATUS_TONE = {
  implemented: 'emerald',
  partial: 'amber',
  gap: 'rose',
  'not-applicable': 'slate',
} as const;

const STATUSES: ControlStatus[] = ['implemented', 'partial', 'gap', 'not-applicable'];

/** Feature #56 — compliance framework readiness. */
export function FrameworksPanel(): React.ReactElement {
  const controls = useComplianceStore((s) => s.controls);
  const setControlStatus = useComplianceStore((s) => s.setControlStatus);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Compliance frameworks"
        subtitle="Map controls to SOC 2 / ISO 27001 / GDPR and track audit readiness"
        action={<Badge tone="indigo">{Math.round(overallReadiness(controls) * 100)}% ready</Badge>}
      />

      <div className="grid grid-cols-3 gap-2">
        {FRAMEWORKS.map((fw) => {
          const r = frameworkReadiness(controls, fw);
          return (
            <Stat
              key={fw}
              label={fw}
              value={
                <span>
                  {Math.round(r.score * 100)}%
                  <span className="ml-1 text-[11px] font-normal text-slate-400">
                    {r.implemented}/{r.applicable}
                  </span>
                </span>
              }
            />
          );
        })}
      </div>

      <div className="space-y-2">
        {controls.map((c) => (
          <Card key={c.id} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono text-xs text-slate-500">{c.ref}</span>
                <span className="truncate font-medium text-slate-800">{c.title}</span>
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {c.framework} · owner {c.owner}
              </div>
            </div>
            <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
            <select
              value={c.status}
              onChange={(e) => setControlStatus(c.id, e.target.value as ControlStatus)}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Card>
        ))}
      </div>
    </div>
  );
}
