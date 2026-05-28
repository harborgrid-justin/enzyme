import { performance as perf } from '@missionfabric-js/enzyme';
import { useConversations } from '../api/conversations';

/**
 * Right-rail Usage meter — totals tokens + cost across all conversations in
 * the React Query cache, and surfaces live Web Vitals from enzyme's performance
 * provider next to it so engineers can see render-cost regressions.
 */
export function UsageMeter(): React.ReactElement {
  const { data } = useConversations();
  const monitor = perf.usePerformanceMonitor();

  const conversations = data ?? [];
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
