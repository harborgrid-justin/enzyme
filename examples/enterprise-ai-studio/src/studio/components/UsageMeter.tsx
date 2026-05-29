import { performance as perf } from '@missionfabric-js/enzyme';
import { useConversations } from '../api/conversations';
import { useStudioStore } from '../store/studioStore';

/**
 * Right-rail Usage meter — totals tokens + cost across all conversations in
 * the React Query cache, and surfaces live Web Vitals from enzyme's performance
 * provider next to it so engineers can see render-cost regressions.
 */
export function UsageMeter(): React.ReactElement {
  const { data } = useConversations();
  const monitor = perf.usePerformanceMonitor();
  const costBudgetUsd = useStudioStore((s) => s.costBudgetUsd);
  const setCostBudget = useStudioStore((s) => s.setCostBudget);

  const conversations = data ?? [];
  // Feature #88: top conversations by cost for the mini bar chart.
  const topByCost = [...conversations]
    .filter((c) => c.totals.costUsd > 0)
    .sort((a, b) => b.totals.costUsd - a.totals.costUsd)
    .slice(0, 5);
  const maxCost = topByCost[0]?.totals.costUsd ?? 0;
  const totals = conversations.reduce(
    (acc, c) => ({
      inputTokens: acc.inputTokens + c.totals.inputTokens,
      outputTokens: acc.outputTokens + c.totals.outputTokens,
      costUsd: acc.costUsd + c.totals.costUsd,
    }),
    { inputTokens: 0, outputTokens: 0, costUsd: 0 }
  );

  const lcp = monitor.metrics.LCP;
  const inp = monitor.metrics.INP;
  const memoryMb =
    monitor.metrics.memoryUsage?.usedJSHeapSize != null
      ? Math.round(monitor.metrics.memoryUsage.usedJSHeapSize / (1024 * 1024))
      : null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Workspace usage</h3>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Metric label="Conversations" value={conversations.length.toString()} />
        <Metric label="Total cost" value={`$${totals.costUsd.toFixed(4)}`} accent />
        <Metric label="Input tokens" value={totals.inputTokens.toLocaleString()} />
        <Metric label="Output tokens" value={totals.outputTokens.toLocaleString()} />
      </div>

      {/* Feature #88: cost-by-conversation mini bar chart. */}
      {topByCost.length > 0 && (
        <>
          <h4 className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Cost by conversation
          </h4>
          <div className="space-y-1.5">
            {topByCost.map((c) => (
              <div key={c.id}>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span className="truncate pr-2">{c.title}</span>
                  <span className="font-mono">${c.totals.costUsd.toFixed(4)}</span>
                </div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${maxCost > 0 ? (c.totals.costUsd / maxCost) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Feature #77: per-conversation cost budget. */}
      <h4 className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Cost budget
      </h4>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">$</span>
        <input
          type="number"
          min={0}
          step={0.01}
          value={costBudgetUsd}
          onChange={(e) => setCostBudget(Number(e.target.value))}
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-xs focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
      </div>
      <p className="mt-1 text-[11px] text-slate-400">
        {costBudgetUsd > 0
          ? 'A conversation over this shows a warning banner.'
          : '0 disables the budget warning.'}
      </p>

      <h4 className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Live Web Vitals
      </h4>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Metric label="LCP" value={lcp != null ? `${Math.round(lcp)} ms` : '—'} />
        <Metric label="INP" value={inp != null ? `${Math.round(inp)} ms` : '—'} />
        <Metric label="JS heap" value={memoryMb != null ? `${memoryMb} MB` : '—'} />
        <Metric label="CLS" value={monitor.metrics.CLS != null ? monitor.metrics.CLS.toFixed(3) : '—'} />
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}): React.ReactElement {
  return (
    <div className="rounded border border-slate-100 bg-slate-50 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`font-mono text-sm font-semibold ${
          accent === true ? 'text-emerald-700' : 'text-slate-800'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
