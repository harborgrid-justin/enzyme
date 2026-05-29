import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Badge, Card } from '../ui';
import { capacityUsage, capacityState } from '../lib/analytics';

const TONE = { ok: 'emerald', warning: 'amber', critical: 'rose' } as const;
const BAR = { ok: 'bg-emerald-500', warning: 'bg-amber-500', critical: 'bg-rose-500' } as const;

/** Feature #53 — capacity / quota planning. */
export function CapacityPanel(): React.ReactElement {
  const capacity = useAdvancedStore((s) => s.capacity);

  return (
    <div className="space-y-4">
      <SectionHeader title="Capacity" subtitle="Plan ahead on seats, storage, and AI quota" />
      <div className="space-y-2">
        {capacity.map((r) => {
          const usage = capacityUsage(r);
          const state = capacityState(r);
          return (
            <Card key={r.id} className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-slate-800">{r.name}</span>
                <Badge tone={TONE[state]}>{state}</Badge>
                <span className="ml-auto text-xs text-slate-500">
                  {r.used} / {r.limit} {r.unit}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200">
                <div className={`h-2 rounded-full ${BAR[state]}`} style={{ width: `${Math.min(100, usage * 100)}%` }} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
