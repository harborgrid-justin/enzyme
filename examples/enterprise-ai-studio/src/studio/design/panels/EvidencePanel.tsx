import { useComplianceStore } from '../complianceStore';
import { SectionHeader, Badge, Card, Btn, Stat } from '../ui';
import { evidenceState, evidenceCoverage } from '../lib/compliance';

const TONE = { fresh: 'emerald', stale: 'amber', expired: 'rose' } as const;

/** Feature #57 — evidence freshness for each control. */
export function EvidencePanel(): React.ReactElement {
  const controls = useComplianceStore((s) => s.controls);
  const evidence = useComplianceStore((s) => s.evidence);
  const recollect = useComplianceStore((s) => s.recollectEvidence);

  const controlRef = (id: string): string =>
    controls.find((c) => c.id === id)?.ref ?? id;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Evidence freshness"
        subtitle="Keep control evidence inside its refresh cadence so an audit never goes stale"
        action={<Badge tone="indigo">{Math.round(evidenceCoverage(controls, evidence) * 100)}% covered</Badge>}
      />

      <div className="grid grid-cols-3 gap-2">
        {(['fresh', 'stale', 'expired'] as const).map((state) => (
          <Stat
            key={state}
            label={state}
            value={evidence.filter((e) => evidenceState(e) === state).length}
          />
        ))}
      </div>

      <div className="space-y-2">
        {evidence.map((e) => {
          const state = evidenceState(e);
          return (
            <Card key={e.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-800">{e.name}</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {controlRef(e.controlId)} · refresh every {e.cadenceDays}d
                </div>
              </div>
              <Badge tone={TONE[state]}>{state}</Badge>
              <Btn
                variant={state === 'fresh' ? 'ghost' : 'primary'}
                onClick={() => recollect(e.id)}
                title="Re-collect evidence (resets the clock)"
              >
                Re-collect
              </Btn>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
