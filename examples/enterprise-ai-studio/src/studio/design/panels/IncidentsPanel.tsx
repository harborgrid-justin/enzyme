import { useComplianceStore } from '../complianceStore';
import { SectionHeader, Badge, Card, Btn, Stat } from '../ui';
import { incidentDurationHours, slaBreached, incidentSummary } from '../lib/compliance';
import type { IncidentSeverity } from '../types.compliance';

const SEV_TONE: Record<IncidentSeverity, 'rose' | 'amber' | 'sky' | 'slate'> = {
  sev1: 'rose',
  sev2: 'amber',
  sev3: 'sky',
  sev4: 'slate',
};

function formatHours(h: number): string {
  return h >= 24 ? `${(h / 24).toFixed(1)}d` : `${h.toFixed(1)}h`;
}

/** Feature #60 — security incident register with SLA tracking. */
export function IncidentsPanel(): React.ReactElement {
  const incidents = useComplianceStore((s) => s.incidents);
  const resolveIncident = useComplianceStore((s) => s.resolveIncident);
  const summary = incidentSummary(incidents);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Incident register"
        subtitle="Track open incidents, SLA breaches, and mean time to resolve"
      />

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Open" value={summary.open} />
        <Stat label="SLA breached" value={summary.breached} />
        <Stat label="MTTR" value={formatHours(summary.mttrHours)} />
      </div>

      <div className="space-y-2">
        {incidents.map((i) => {
          const breached = slaBreached(i);
          const open = i.resolvedAt === null;
          return (
            <Card key={i.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <Badge tone={SEV_TONE[i.severity]}>{i.severity}</Badge>
                  <span className="truncate font-medium text-slate-800">{i.title}</span>
                  {breached && <Badge tone="rose">SLA breach</Badge>}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {i.service} · {formatHours(incidentDurationHours(i))} {open ? 'elapsed' : 'to resolve'} · SLA{' '}
                  {i.slaHours}h
                </div>
              </div>
              {open ? (
                <Btn variant="primary" onClick={() => resolveIncident(i.id)}>
                  Resolve
                </Btn>
              ) : (
                <Badge tone="emerald">resolved</Badge>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
