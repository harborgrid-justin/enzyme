/**
 * Eval + regression harness (feature #24).
 *
 * Runs golden prompt cases against a (mocked) provider and scores each output
 * with a matcher. In the no-backend studio the "provider" is a deterministic
 * stub so the suite is reproducible; wiring a real provider only means
 * swapping `mockComplete`.
 */
import type { EvalCase, EvalResult, EvalMatcher } from '../types';

/** Evaluate a single output against an expectation. */
export function matchExpectation(
  output: string,
  expected: string,
  matcher: EvalMatcher
): boolean {
  switch (matcher) {
    case 'equals':
      return output.trim() === expected.trim();
    case 'contains':
      return output.toLowerCase().includes(expected.toLowerCase());
    case 'regex':
      try {
        return new RegExp(expected, 'i').test(output);
      } catch {
        return false;
      }
  }
}

/**
 * Deterministic stand-in for a provider completion. Seeded by the prompt +
 * provider so re-running the suite is stable (real regression detection).
 */
export function mockComplete(prompt: string, provider: string, expected: string): string {
  // Most providers "pass" by echoing the expected token; a couple intentionally
  // drift so the matrix shows red cells and the harness is meaningful.
  const driftProviders = new Set(['huggingface']);
  if (driftProviders.has(provider)) {
    return `Re: ${prompt.slice(0, 24)} — (response unavailable)`;
  }
  return `Re: ${prompt.slice(0, 24)} — ${expected}`;
}

/** Run every case across every provider. */
export function runEvals(cases: EvalCase[], providers: string[]): EvalResult[] {
  const results: EvalResult[] = [];
  for (const c of cases) {
    for (const provider of providers) {
      const output = mockComplete(c.prompt, provider, c.expected);
      results.push({
        caseId: c.id,
        provider,
        output,
        passed: matchExpectation(output, c.expected, c.matcher),
        latencyMs: 120 + (hash(`${c.id}:${provider}`) % 400),
      });
    }
  }
  return results;
}

/** Pass rate per provider across a result set (0..1). */
export function passRateByProvider(results: EvalResult[]): Record<string, number> {
  const totals: Record<string, { pass: number; total: number }> = {};
  for (const r of results) {
    const t = (totals[r.provider] ??= { pass: 0, total: 0 });
    t.total += 1;
    if (r.passed) t.pass += 1;
  }
  const out: Record<string, number> = {};
  for (const [provider, t] of Object.entries(totals)) {
    out[provider] = t.total === 0 ? 0 : t.pass / t.total;
  }
  return out;
}

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}
