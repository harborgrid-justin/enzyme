import { useAzureStore } from '../../azure/store';
import { useBudget } from '../../azure/api';

/**
 * $45k budget burndown meter, scoped to the selected subscription.
 *
 * Inputs:
 *   - `AZURE_BUDGET_USD` (default 45000): the cap the bridge advertises
 *   - `AZURE_BUDGET_EXPIRES` (default 2026-06-05): the wall-clock deadline
 *   - `az rest` consumption query: month-to-date spend
 *
 * The bar turns amber at 80% utilization and red at 95% so the investor
 * demo can't accidentally torch the credits.
 */
export function BudgetMeter(): React.ReactElement | null {
  const subscriptionId = useAzureStore((s) => s.selectedSubscriptionId);
  const { data, isLoading, error } = useBudget(subscriptionId);

  if (subscriptionId == null) return null;

  if (isLoading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-3">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">Budget</p>
        <div className="mt-1 h-2 w-full animate-pulse rounded-full bg-slate-200" />
      </section>
    );
  }

  if (error != null || data == null) {
    return (
      <section className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
        <p className="font-semibold">Couldn&apos;t read consumption.</p>
        <p>{(error as Error)?.message ?? data?.error ?? 'No data'}</p>
        <p className="mt-1 text-[11px]">
          Some subscriptions hide the consumption API from non-billing-admin users — try{' '}
          <code className="px-1">az consumption usage list</code> in PowerShell to confirm
          permissions.
        </p>
      </section>
    );
  }

  const util = Math.min(1, Math.max(0, data.utilization));
  const pct = (util * 100).toFixed(1);
  const tone =
    util >= 0.95
      ? { bar: 'bg-rose-500', chip: 'bg-rose-100 text-rose-700' }
      : util >= 0.8
        ? { bar: 'bg-amber-500', chip: 'bg-amber-100 text-amber-700' }
        : { bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700' };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Azure credits
        </h3>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${tone.chip}`}>
          {pct}% used
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
        <Stat label="Spent (MTD)" value={`$${data.totalUsd.toFixed(2)}`} />
        <Stat label="Cap" value={`$${data.capUsd.toLocaleString()}`} />
        <Stat label="Remaining" value={`$${data.remainingUsd.toFixed(2)}`} accent />
        <Stat label="Expires in" value={`${data.daysRemaining} day${data.daysRemaining === 1 ? '' : 's'}`} />
      </div>
      <p className="mt-1.5 text-[10px] text-slate-400">
        Source: <code>az rest …/Microsoft.Consumption/usageDetails</code>. Refreshes every 5 min.
      </p>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }): React.ReactElement {
  return (
    <div className="rounded bg-slate-50 px-2 py-1">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`font-mono text-sm font-semibold ${accent === true ? 'text-emerald-700' : 'text-slate-800'}`}>
        {value}
      </p>
    </div>
  );
}
