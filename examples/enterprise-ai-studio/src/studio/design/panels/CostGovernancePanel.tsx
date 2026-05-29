import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Badge, Card, Stat } from '../ui';
import { budgetUsage, budgetState, projectSpend } from '../lib/aiops';

const STATE_TONE = { ok: 'emerald', warning: 'amber', over: 'rose' } as const;
const BAR = { ok: 'bg-emerald-500', warning: 'bg-amber-500', over: 'bg-rose-500' } as const;

/** Feature #33 — AI cost governance with budgets + projection. */
export function CostGovernancePanel(): React.ReactElement {
  const budgets = useAdvancedStore((s) => s.budgets);
  const totalSpent = budgets.reduce((s, b) => s + b.spentUsd, 0);
  const totalLimit = budgets.reduce((s, b) => s + b.limitUsd, 0);
  const dayOfMonth = new Date('2026-05-29').getDate();

  return (
    <div className="space-y-4">
      <SectionHeader title="Cost governance" subtitle="Per-scope AI spend budgets with month-end projection" />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Spent (MTD)" value={`$${totalSpent.toFixed(0)}`} />
        <Stat label="Limit" value={`$${totalLimit.toFixed(0)}`} />
        <Stat label="Projected" value={`$${projectSpend(totalSpent, dayOfMonth)}`} />
      </div>
      <div className="space-y-2">
        {budgets.map((b) => {
          const state = budgetState(b);
          const usage = budgetUsage(b);
          return (
            <Card key={b.id} className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-slate-800">{b.scope}</span>
                <Badge tone={STATE_TONE[state]}>{Math.round(usage * 100)}%</Badge>
                <span className="ml-auto text-xs text-slate-500">
                  ${b.spentUsd} / ${b.limitUsd}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200">
                <div
                  className={`h-2 rounded-full ${BAR[state]}`}
                  style={{ width: `${Math.min(100, usage * 100)}%` }}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
