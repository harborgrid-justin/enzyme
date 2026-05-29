import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Badge, Card, EmptyHint } from '../ui';
import { detectAnomalies } from '../lib/analytics';

/** Feature #54 — anomaly detection over operational metric series. */
export function AnomaliesPanel(): React.ReactElement {
  const series = useAdvancedStore((s) => s.series);

  return (
    <div className="space-y-4">
      <SectionHeader title="Anomalies" subtitle="Flag statistical spikes (>2σ) across key metrics" />
      {series.map((ser) => {
        const anomalies = detectAnomalies(ser);
        const max = Math.max(1, ...ser.points);
        const flagged = new Set(anomalies.map((a) => a.index));
        return (
          <Card key={ser.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-800">{ser.name}</span>
              {anomalies.length === 0 ? (
                <Badge tone="emerald">normal</Badge>
              ) : (
                <Badge tone="rose">{anomalies.length} anomaly{anomalies.length === 1 ? '' : 's'}</Badge>
              )}
            </div>
            <div className="flex h-20 items-end gap-1">
              {ser.points.map((p, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t ${flagged.has(i) ? 'bg-rose-500' : 'bg-indigo-300'}`}
                  style={{ height: `${(p / max) * 100}%` }}
                  title={`${p}${flagged.has(i) ? ' ⚠ anomaly' : ''}`}
                />
              ))}
            </div>
          </Card>
        );
      })}
      {series.length === 0 && <EmptyHint>No metric series.</EmptyHint>}
    </div>
  );
}
