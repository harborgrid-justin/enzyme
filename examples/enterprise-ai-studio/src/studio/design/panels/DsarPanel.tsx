import { useComplianceStore } from '../complianceStore';
import { SectionHeader, Badge, Card } from '../ui';
import { dsarDaysRemaining, dsarUrgency, dsarSlaCompliance } from '../lib/compliance';
import type { DsarUrgency } from '../lib/compliance';
import type { DsarStatus } from '../types.compliance';

const URGENCY_TONE: Record<DsarUrgency, 'emerald' | 'amber' | 'rose' | 'slate'> = {
  'on-track': 'emerald',
  'due-soon': 'amber',
  overdue: 'rose',
  closed: 'slate',
};

const STATUSES: DsarStatus[] = ['received', 'in-progress', 'completed', 'rejected'];

/** Feature #61 — GDPR / CCPA data-subject-request queue. */
export function DsarPanel(): React.ReactElement {
  const dsars = useComplianceStore((s) => s.dsars);
  const setDsarStatus = useComplianceStore((s) => s.setDsarStatus);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Data-subject requests"
        subtitle="Run the GDPR / CCPA queue against its statutory clock"
        action={<Badge tone="indigo">{Math.round(dsarSlaCompliance(dsars) * 100)}% on-time</Badge>}
      />

      <div className="space-y-2">
        {dsars.map((d) => {
          const urgency = dsarUrgency(d);
          const remaining = dsarDaysRemaining(d);
          return (
            <Card key={d.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <Badge tone="indigo">{d.type}</Badge>
                  <span className="truncate font-medium text-slate-800">{d.subject}</span>
                  <Badge tone={URGENCY_TONE[urgency]}>{urgency}</Badge>
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {urgency === 'closed'
                    ? `${d.status} · ${d.dueDays}-day window`
                    : remaining < 0
                      ? `${Math.abs(remaining)}d overdue`
                      : `${remaining}d remaining of ${d.dueDays}`}
                </div>
              </div>
              <select
                value={d.status}
                onChange={(e) => setDsarStatus(d.id, e.target.value as DsarStatus)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
