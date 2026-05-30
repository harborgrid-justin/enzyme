/**
 * @file Default id generation for governance records.
 *
 * Stores accept an injectable `generateId` for determinism in tests; this is
 * the default: a monotonic counter combined with a base-36 timestamp, which is
 * collision-resistant within a session without depending on `crypto`.
 */

let counter = 0;

/** Generate a prefixed, reasonably-unique id (`prefix-<n>-<time>`). */
export function generateId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter.toString(36)}-${Date.now().toString(36)}`;
}
