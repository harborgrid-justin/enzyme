/**
 * Hash Functions for Percentage Rollouts
 *
 * Provides consistent hashing for user bucketing in rollouts.
 *
 * @module flags/advanced/hash-function
 */

/**
 * Hash function type for consistent user bucketing.
 */
export type HashFunction = (key: string, salt?: string) => number;

/**
 * Default hash function using a simple but effective algorithm.
 * Returns a value between 0 and 100.
 */
export function defaultHashFunction(key: string, salt: string = ''): number {
  const input = key + salt;
  let hash = 0;

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }

  // Convert to positive number and normalize to 0-100
  return Math.abs(hash % 10000) / 100;
}
