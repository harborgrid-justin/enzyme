/**
 * Shared client-side id generator for the design workspace stores.
 *
 * `prefix-<base36 time>-<base36 random>` — compact, sortable-ish, and unique
 * enough for in-memory/localStorage records. Extracted so the core and advanced
 * stores share one implementation instead of duplicating it.
 */
export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
