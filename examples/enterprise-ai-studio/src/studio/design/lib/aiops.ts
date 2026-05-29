/**
 * AI operations logic (features 32–37).
 *
 * Pure helpers for model routing, cost/budget projection, prompt guardrails,
 * groundedness scoring, A/B experiment statistics, and trace summarization.
 * Deterministic and backend-free so the suite is reproducible.
 */
import type {
  Budget,
  Experiment,
  GroundednessReport,
  GuardrailFinding,
  GuardrailSeverity,
  ModelEntry,
  RouteIntent,
  RoutingPolicy,
  Trace,
} from '../types.advanced';

// --- 32. Model routing -------------------------------------------------------

/** Resolve the model id for an intent, falling back to the policy default. */
export function routeModel(policy: RoutingPolicy, intent: RouteIntent): string {
  return policy.rules.find((r) => r.intent === intent)?.modelId ?? policy.defaultModelId;
}

/** Estimated USD cost of a single request against a model. */
export function estimateCost(model: ModelEntry, inTokens: number, outTokens: number): number {
  const cost = (inTokens / 1000) * model.costPer1kIn + (outTokens / 1000) * model.costPer1kOut;
  return Number(cost.toFixed(4));
}

// --- 33. Cost governance -----------------------------------------------------

export type BudgetState = 'ok' | 'warning' | 'over';

/** Fraction of a budget consumed (0..>1). */
export function budgetUsage(budget: Budget): number {
  return budget.limitUsd === 0 ? 0 : budget.spentUsd / budget.limitUsd;
}

export function budgetState(budget: Budget): BudgetState {
  const usage = budgetUsage(budget);
  if (usage >= 1) return 'over';
  if (usage >= 0.8) return 'warning';
  return 'ok';
}

/** Naive linear month-end projection given days elapsed of `daysInMonth`. */
export function projectSpend(spentUsd: number, dayOfMonth: number, daysInMonth = 30): number {
  if (dayOfMonth <= 0) return spentUsd;
  return Number(((spentUsd / dayOfMonth) * daysInMonth).toFixed(2));
}

// --- 34. Guardrails ----------------------------------------------------------

const GUARDRAIL_RULES: { rule: string; severity: GuardrailSeverity; re: RegExp }[] = [
  { rule: 'prompt-injection', severity: 'high', re: /ignore\s+(?:all\s+|previous\s+|prior\s+|earlier\s+)*(?:instructions|prompts)/i },
  { rule: 'system-prompt-leak', severity: 'high', re: /(reveal|print|show).{0,20}(system prompt|instructions)/i },
  { rule: 'role-override', severity: 'medium', re: /you are now (a|an|the)\b/i },
  { rule: 'exfiltration', severity: 'medium', re: /\b(api[_ ]?key|password|secret|token)\b/i },
  { rule: 'developer-mode', severity: 'low', re: /\b(jailbreak|dev(eloper)? mode|DAN)\b/i },
];

/** Screen a prompt for known injection / jailbreak patterns. */
export function screenPrompt(text: string): GuardrailFinding[] {
  const findings: GuardrailFinding[] = [];
  for (const { rule, severity, re } of GUARDRAIL_RULES) {
    const m = re.exec(text);
    if (m) findings.push({ rule, severity, excerpt: m[0].slice(0, 60) });
  }
  return findings;
}

const SEVERITY_RANK: Record<GuardrailSeverity, number> = { low: 1, medium: 2, high: 3 };

/** Highest severity in a finding set, or null when clean. */
export function maxSeverity(findings: GuardrailFinding[]): GuardrailSeverity | null {
  return findings.reduce<GuardrailSeverity | null>(
    (max, f) => (max === null || SEVERITY_RANK[f.severity] > SEVERITY_RANK[max] ? f.severity : max),
    null
  );
}

// --- 35. Groundedness --------------------------------------------------------

function tokens(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => t.length > 3));
}

/**
 * Score how well an output's sentences are supported by the source text. A
 * sentence is "supported" when most of its meaningful tokens appear in sources.
 */
export function groundednessScore(output: string, sources: string[]): GroundednessReport {
  const sourceTokens = tokens(sources.join(' '));
  const sentences = output
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const supported: string[] = [];
  const unsupported: string[] = [];
  for (const sentence of sentences) {
    const st = [...tokens(sentence)];
    if (st.length === 0) continue;
    const hits = st.filter((t) => sourceTokens.has(t)).length;
    if (hits / st.length >= 0.5) supported.push(sentence);
    else unsupported.push(sentence);
  }
  const total = supported.length + unsupported.length;
  return {
    score: total === 0 ? 1 : Number((supported.length / total).toFixed(2)),
    supported,
    unsupported,
  };
}

// --- 36. Experiments ---------------------------------------------------------

/** Conversion rate of a variant (0..1). */
export function conversionRate(visitors: number, conversions: number): number {
  return visitors === 0 ? 0 : conversions / visitors;
}

export interface ExperimentReadout {
  bestVariantId: string | null;
  /** Absolute lift of the best variant over the worst (percentage points). */
  liftPoints: number;
  /** Rough significance flag using a two-proportion z-test (|z| >= 1.96). */
  significant: boolean;
}

/** Summarize an experiment: winner, lift, and rough significance. */
export function analyzeExperiment(exp: Experiment): ExperimentReadout {
  if (exp.variants.length < 2) return { bestVariantId: null, liftPoints: 0, significant: false };
  const rated = exp.variants.map((v) => ({ v, rate: conversionRate(v.visitors, v.conversions) }));
  const best = rated.reduce((a, b) => (b.rate > a.rate ? b : a));
  const worst = rated.reduce((a, b) => (b.rate < a.rate ? b : a));
  const liftPoints = Number(((best.rate - worst.rate) * 100).toFixed(1));

  // Two-proportion z-test between best and worst.
  const p1 = best.rate;
  const p2 = worst.rate;
  const n1 = best.v.visitors;
  const n2 = worst.v.visitors;
  const pPool = (best.v.conversions + worst.v.conversions) / Math.max(1, n1 + n2);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / Math.max(1, n1) + 1 / Math.max(1, n2)));
  const z = se === 0 ? 0 : (p1 - p2) / se;
  return { bestVariantId: best.v.id, liftPoints, significant: Math.abs(z) >= 1.96 };
}

// --- 37. Observability -------------------------------------------------------

/** Percentile (0..100) over a numeric sample using nearest-rank. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))]!;
}

export interface TraceSummary {
  count: number;
  errorRate: number;
  p50: number;
  p95: number;
}

export function summarizeTraces(traces: Trace[]): TraceSummary {
  const ms = traces.map((t) => t.ms);
  const errors = traces.filter((t) => t.status === 'error').length;
  return {
    count: traces.length,
    errorRate: traces.length === 0 ? 0 : Number((errors / traces.length).toFixed(2)),
    p50: percentile(ms, 50),
    p95: percentile(ms, 95),
  };
}
