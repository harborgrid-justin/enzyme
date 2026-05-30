import { useComplianceStore } from '../complianceStore';
import { SectionHeader, Badge, Card, Stat } from '../ui';
import { inherentRisk, residualRisk, riskLevel, registerSummary } from '../lib/compliance';
import type { RiskLevel } from '../lib/compliance';
import type { RiskStatus } from '../types.compliance';

const LEVEL_TONE: Record<RiskLevel, 'slate' | 'sky' | 'amber' | 'rose'> = {
  low: 'slate',
  medium: 'sky',
  high: 'amber',
  critical: 'rose',
};

const STATUSES: RiskStatus[] = ['open', 'mitigating', 'accepted', 'closed'];

/** Feature #59 — likelihood × impact risk register. */
export function RiskRegisterPanel(): React.ReactElement {
  const risks = useComplianceStore((s) => s.risks);
  const setRiskStatus = useComplianceStore((s) => s.setRiskStatus);
  const setMitigation = useComplianceStore((s) => s.setMitigation);
  const summary = registerSummary(risks);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Risk register"
        subtitle="Track inherent vs. residual risk and the treatment for each entry"
      />

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Open" value={summary.open + summary.mitigating} />
        <Stat label="Inherent avg" value={summary.inherentAvg} />
        <Stat label="Residual avg" value={summary.residualAvg} />
      </div>

      <div className="space-y-2">
        {risks.map((r) => {
          const inherent = inherentRisk(r.likelihood, r.impact);
          const residual = residualRisk(r);
          return (
            <Card key={r.id} className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{r.title}</span>
                <Badge tone={LEVEL_TONE[riskLevel(inherent)]}>{riskLevel(inherent)}</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{r.category}</span>
                <span>
                  L{r.likelihood} × I{r.impact}
                </span>
                <span>
                  inherent <span className="font-semibold text-slate-700">{inherent}</span> → residual{' '}
                  <span className="font-semibold text-slate-700">{residual}</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex flex-1 items-center gap-2 text-xs text-slate-600">
                  Mitigation
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(r.mitigation * 100)}
                    onChange={(e) => setMitigation(r.id, Number(e.target.value) / 100)}
                    className="flex-1 accent-indigo-600"
                  />
                  <span className="w-9 text-right font-mono">{Math.round(r.mitigation * 100)}%</span>
                </label>
                <select
                  value={r.status}
                  onChange={(e) => setRiskStatus(r.id, e.target.value as RiskStatus)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
