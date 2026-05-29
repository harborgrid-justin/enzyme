import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Badge, Card, Stat } from '../ui';
import { summarizeTraces } from '../lib/aiops';

/** Feature #37 — observability: traces, latency percentiles, error rate. */
export function ObservabilityPanel(): React.ReactElement {
  const traces = useAdvancedStore((s) => s.traces);
  const summary = summarizeTraces(traces);

  return (
    <div className="space-y-4">
      <SectionHeader title="Observability" subtitle="Request traces with p50/p95 latency and error rate" />
      <div className="grid grid-cols-4 gap-3">
        <Stat label="Requests" value={summary.count} />
        <Stat label="p50" value={`${summary.p50}ms`} />
        <Stat label="p95" value={`${summary.p95}ms`} />
        <Stat label="Errors" value={`${Math.round(summary.errorRate * 100)}%`} />
      </div>
      <Card>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Recent traces</p>
        <div className="space-y-1.5">
          {traces.map((t) => (
            <div key={t.id} className="flex items-center gap-3 text-sm">
              <Badge tone={t.status === 'ok' ? 'emerald' : 'rose'}>{t.status}</Badge>
              <code className="text-xs text-slate-700">{t.op}</code>
              <span className="ml-auto font-medium text-slate-800">{t.ms}ms</span>
              <div className="h-1.5 w-24 rounded-full bg-slate-200">
                <div
                  className={`h-1.5 rounded-full ${t.ms > summary.p95 ? 'bg-rose-400' : 'bg-indigo-400'}`}
                  style={{ width: `${Math.min(100, (t.ms / Math.max(1, summary.p95)) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
