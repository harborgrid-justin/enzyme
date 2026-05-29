/**
 * Analytics & insights logic (features 50–55).
 *
 * Pure helpers for funnel conversion, click-heat bucketing, performance-budget
 * evaluation, capacity projection, anomaly detection, and executive rollups.
 */
import type {
  Anomaly,
  CapacityResource,
  Funnel,
  MetricSeries,
  PerfMetric,
} from '../types.advanced';

// --- 50. Funnels -------------------------------------------------------------

export interface FunnelStepRate {
  name: string;
  count: number;
  /** Conversion from the previous step (0..1); 1 for the first step. */
  stepRate: number;
  /** Conversion from the top of the funnel (0..1). */
  overallRate: number;
}

/** Compute step-over-step and overall conversion for a funnel. */
export function funnelRates(funnel: Funnel): FunnelStepRate[] {
  const top = funnel.steps[0]?.count ?? 0;
  return funnel.steps.map((step, i) => {
    const prev = i === 0 ? step.count : funnel.steps[i - 1]!.count;
    return {
      name: step.name,
      count: step.count,
      stepRate: prev === 0 ? 0 : Number((step.count / prev).toFixed(3)),
      overallRate: top === 0 ? 0 : Number((step.count / top).toFixed(3)),
    };
  });
}

/** The step with the largest relative drop-off, if any. */
export function biggestDropoff(funnel: Funnel): { from: string; to: string; lost: number } | null {
  let worst: { from: string; to: string; lost: number } | null = null;
  for (let i = 1; i < funnel.steps.length; i += 1) {
    const prev = funnel.steps[i - 1]!;
    const cur = funnel.steps[i]!;
    const lost = prev.count - cur.count;
    if (worst === null || lost > worst.lost) {
      worst = { from: prev.name, to: cur.name, lost };
    }
  }
  return worst;
}

// --- 51. Heatmap -------------------------------------------------------------

/** Bucket normalized (0..1) click points into a cols×rows intensity grid (0..1). */
export function bucketHeat(
  points: { x: number; y: number }[],
  cols: number,
  rows: number
): number[][] {
  const grid = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  for (const p of points) {
    const cx = Math.min(cols - 1, Math.max(0, Math.floor(p.x * cols)));
    const cy = Math.min(rows - 1, Math.max(0, Math.floor(p.y * rows)));
    grid[cy]![cx]! += 1;
  }
  const max = Math.max(1, ...grid.flat());
  return grid.map((row) => row.map((v) => Number((v / max).toFixed(2))));
}

// --- 52. Performance budget --------------------------------------------------

/** Whether a metric is within its budget. */
export function withinBudget(metric: PerfMetric): boolean {
  return metric.lowerIsBetter ? metric.value <= metric.budget : metric.value >= metric.budget;
}

/** Count of metrics passing their budget. */
export function perfPassRate(metrics: PerfMetric[]): number {
  if (metrics.length === 0) return 1;
  const pass = metrics.filter(withinBudget).length;
  return Number((pass / metrics.length).toFixed(2));
}

// --- 53. Capacity ------------------------------------------------------------

export type CapacityState = 'ok' | 'warning' | 'critical';

export function capacityUsage(resource: CapacityResource): number {
  return resource.limit === 0 ? 0 : Number((resource.used / resource.limit).toFixed(2));
}

export function capacityState(resource: CapacityResource): CapacityState {
  const u = capacityUsage(resource);
  if (u >= 0.9) return 'critical';
  if (u >= 0.75) return 'warning';
  return 'ok';
}

// --- 54. Anomalies -----------------------------------------------------------

/** Flag points whose z-score exceeds `threshold` (default 2σ). */
export function detectAnomalies(series: MetricSeries, threshold = 2): Anomaly[] {
  const xs = series.points;
  if (xs.length < 3) return [];
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  const sd = Math.sqrt(variance);
  if (sd === 0) return [];
  const out: Anomaly[] = [];
  xs.forEach((value, index) => {
    const z = (value - mean) / sd;
    if (Math.abs(z) >= threshold) out.push({ index, value, zScore: Number(z.toFixed(2)) });
  });
  return out;
}

// --- 55. Executive report ----------------------------------------------------

export interface ExecReportInput {
  workspace: string;
  features: number;
  budgets: { spentUsd: number; limitUsd: number };
  perfPassRate: number;
  funnelOverall: number;
  openAnomalies: number;
}

/** Render a concise markdown executive summary. */
export function buildExecReport(input: ExecReportInput, at: string): string {
  const spendPct = input.budgets.limitUsd === 0 ? 0 : Math.round((input.budgets.spentUsd / input.budgets.limitUsd) * 100);
  return [
    `# ${input.workspace} — Executive summary`,
    ``,
    `_Generated ${at}_`,
    ``,
    `- **Capabilities shipped:** ${input.features}`,
    `- **AI spend:** $${input.budgets.spentUsd.toFixed(2)} / $${input.budgets.limitUsd.toFixed(2)} (${spendPct}%)`,
    `- **Performance budget pass rate:** ${Math.round(input.perfPassRate * 100)}%`,
    `- **Funnel conversion (overall):** ${Math.round(input.funnelOverall * 100)}%`,
    `- **Open anomalies:** ${input.openAnomalies}`,
  ].join('\n');
}
