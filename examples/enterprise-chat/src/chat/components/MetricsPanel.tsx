import { performance as perf } from '@missionfabric-js/enzyme';

function fmt(n: number | undefined, digits = 0): string {
  return n === undefined ? '—' : n.toFixed(digits);
}

/** Live Web Vitals from enzyme's `usePerformanceMonitor`. */
export function MetricsPanel(): React.ReactElement {
  const { metrics } = perf.usePerformanceMonitor({
    enableMemoryMonitoring: true,
    enableLongTaskDetection: true,
    sampleRate: 1,
  });

  const cells: Array<{ label: string; value: string }> = [
    { label: 'LCP', value: `${fmt(metrics.LCP)} ms` },
    { label: 'FCP', value: `${fmt(metrics.FCP)} ms` },
    { label: 'CLS', value: fmt(metrics.CLS, 3) },
    { label: 'INP', value: `${fmt(metrics.INP)} ms` },
    { label: 'Long tasks', value: String(metrics.longTasks.length) },
    {
      label: 'JS heap',
      value:
        metrics.memoryUsage === undefined
          ? '—'
          : `${Math.round(metrics.memoryUsage.usedJSHeapSize / 1048576)} MB`,
    },
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Performance</h3>
      <dl className="grid grid-cols-2 gap-2">
        {cells.map((c) => (
          <div key={c.label} className="rounded bg-slate-50 p-2">
            <dt className="text-[10px] uppercase tracking-wide text-slate-400">{c.label}</dt>
            <dd className="text-sm font-semibold text-slate-800">{c.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
