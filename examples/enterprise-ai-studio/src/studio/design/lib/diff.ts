/**
 * Version diffing (feature #5).
 *
 * A compact LCS-based line diff plus DOM-shape stats (tag counts) so the diff
 * panel can show both "what text changed" and "how the structure changed"
 * between two artifact versions.
 */

export type DiffOp = 'equal' | 'add' | 'remove';

export interface DiffLine {
  op: DiffOp;
  text: string;
}

export interface DiffStats {
  added: number;
  removed: number;
  /** Per-tag delta: positive = more in `b`, negative = fewer. */
  tagDelta: Record<string, number>;
}

/** Longest-common-subsequence line diff. */
export function diffLines(a: string, b: string): DiffLine[] {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const n = aLines.length;
  const m = bLines.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i]![j] = aLines[i] === bLines[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (aLines[i] === bLines[j]) {
      out.push({ op: 'equal', text: aLines[i]! });
      i += 1;
      j += 1;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      out.push({ op: 'remove', text: aLines[i]! });
      i += 1;
    } else {
      out.push({ op: 'add', text: bLines[j]! });
      j += 1;
    }
  }
  while (i < n) {
    out.push({ op: 'remove', text: aLines[i]! });
    i += 1;
  }
  while (j < m) {
    out.push({ op: 'add', text: bLines[j]! });
    j += 1;
  }
  return out;
}

function tagCounts(html: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const m of html.matchAll(/<([a-z][\w-]*)\b/gi)) {
    const tag = m[1]!.toLowerCase();
    counts[tag] = (counts[tag] ?? 0) + 1;
  }
  return counts;
}

export function diffStats(a: string, b: string): DiffStats {
  const lines = diffLines(a, b);
  const added = lines.filter((l) => l.op === 'add').length;
  const removed = lines.filter((l) => l.op === 'remove').length;
  const ca = tagCounts(a);
  const cb = tagCounts(b);
  const tagDelta: Record<string, number> = {};
  for (const tag of new Set([...Object.keys(ca), ...Object.keys(cb)])) {
    const delta = (cb[tag] ?? 0) - (ca[tag] ?? 0);
    if (delta !== 0) tagDelta[tag] = delta;
  }
  return { added, removed, tagDelta };
}
