import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Card, Stat } from '../ui';
import { bucketHeat } from '../lib/analytics';

const COLS = 12;
const ROWS = 8;

/** Feature #51 — click heatmap over the prototype surface. */
export function HeatmapPanel(): React.ReactElement {
  const points = useAdvancedStore((s) => s.heatPoints);
  const grid = bucketHeat(points, COLS, ROWS);
  const hottest = Math.max(0, ...grid.flat());

  return (
    <div className="space-y-4">
      <SectionHeader title="Heatmap" subtitle="Aggregated click density across the active prototype" />
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Sampled clicks" value={points.length} />
        <Stat label="Peak intensity" value={`${Math.round(hottest * 100)}%`} />
      </div>
      <Card>
        <div
          className="grid gap-px overflow-hidden rounded bg-slate-200"
          style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
        >
          {grid.flatMap((row, y) =>
            row.map((v, x) => (
              <div
                key={`${x}-${y}`}
                className="aspect-square"
                title={`${Math.round(v * 100)}%`}
                style={{ backgroundColor: `rgba(99, 102, 241, ${v})` }}
              />
            ))
          )}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Darker = more clicks. Hotspot centers on the hero CTA.</p>
      </Card>
    </div>
  );
}
