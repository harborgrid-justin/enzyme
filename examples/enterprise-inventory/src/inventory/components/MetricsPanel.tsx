import { performance as perf } from '@missionfabric-js/enzyme';
import { Activity } from 'lucide-react';

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
    <section className="panel">
      <div className="panel-title">
        <Activity size={18} />
        <h2>Performance</h2>
      </div>
      <dl className="metric-tiles">
        {cells.map((c) => (
          <div key={c.label} className="metric-tile">
            <dt>{c.label}</dt>
            <dd>{c.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
