/**
 * Feature #68/#71: per-message client-side metadata — bookmarks and 👍/👎
 * feedback — keyed by conversation id in localStorage. The server doesn't
 * model these, so they live entirely on the client.
 */
const BOOKMARK_PREFIX = 'enzyme-ai-studio-bookmarks:';
const FEEDBACK_PREFIX = 'enzyme-ai-studio-feedback:';

export type Feedback = 'up' | 'down';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Best-effort.
  }
}

export function loadBookmarks(conversationId: string): string[] {
  return read<string[]>(`${BOOKMARK_PREFIX}${conversationId}`, []);
}

export function saveBookmarks(conversationId: string, ids: string[]): void {
  write(`${BOOKMARK_PREFIX}${conversationId}`, ids);
}

export function loadFeedback(conversationId: string): Record<string, Feedback> {
  return read<Record<string, Feedback>>(`${FEEDBACK_PREFIX}${conversationId}`, {});
}

export function saveFeedback(conversationId: string, map: Record<string, Feedback>): void {
  write(`${FEEDBACK_PREFIX}${conversationId}`, map);
}
