import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Badge, Card } from '../ui';
import { withinBudget, perfPassRate } from '../lib/analytics';

/** Feature #52 — performance budget (Core Web Vitals + bundle). */
export function PerfBudgetPanel(): React.ReactElement {
  const perf = useAdvancedStore((s) => s.perf);
  const pass = perfPassRate(perf);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Performance budget"
        subtitle="Core Web Vitals and bundle size vs budget"
        action={<Badge tone={pass === 1 ? 'emerald' : pass >= 0.5 ? 'amber' : 'rose'}>{Math.round(pass * 100)}% pass</Badge>}
      />
      <div className="space-y-2">
        {perf.map((m) => {
          const ok = withinBudget(m);
          const ratio = m.budget === 0 ? 0 : m.value / m.budget;
          return (
            <Card key={m.id} className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-slate-800">{m.name}</span>
                <Badge tone={ok ? 'emerald' : 'rose'}>{ok ? 'within' : 'over'}</Badge>
                <span className="ml-auto text-xs text-slate-500">
                  {m.value}{m.unit} / budget {m.budget}{m.unit}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200">
                <div
                  className={`h-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  style={{ width: `${Math.min(100, (m.lowerIsBetter ? ratio : 1 / Math.max(ratio, 0.01)) * 100)}%` }}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
