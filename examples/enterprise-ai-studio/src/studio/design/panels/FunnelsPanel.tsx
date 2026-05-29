import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Badge, Card } from '../ui';
import { funnelRates, biggestDropoff } from '../lib/analytics';

/** Feature #50 — conversion funnels with drop-off detection. */
export function FunnelsPanel(): React.ReactElement {
  const funnels = useAdvancedStore((s) => s.funnels);

  return (
    <div className="space-y-4">
      <SectionHeader title="Funnels" subtitle="Step-over-step conversion and biggest drop-off" />
      {funnels.map((funnel) => {
        const rates = funnelRates(funnel);
        const drop = biggestDropoff(funnel);
        return (
          <Card key={funnel.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-800">{funnel.name}</span>
              {drop != null && (
                <Badge tone="rose">
                  −{drop.lost.toLocaleString()} at {drop.from}→{drop.to}
                </Badge>
              )}
            </div>
            <div className="space-y-1.5">
              {rates.map((r) => (
                <div key={r.name} className="space-y-0.5">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>{r.name}</span>
                    <span>
                      {r.count.toLocaleString()} · {Math.round(r.overallRate * 100)}%
                      <span className="ml-1 text-slate-400">(step {Math.round(r.stepRate * 100)}%)</span>
                    </span>
                  </div>
                  <div className="h-3 w-full rounded bg-slate-100">
                    <div
                      className="h-3 rounded bg-indigo-500"
                      style={{ width: `${Math.max(2, r.overallRate * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
