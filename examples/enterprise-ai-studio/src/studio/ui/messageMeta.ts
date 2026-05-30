/**
 * Feature #68/#71: per-message client-side metadata — bookmarks and 👍/👎
 * feedback — keyed by conversation id in localStorage. The server doesn't
 * model these, so they live entirely on the client.
 *
 * Persistence goes through enzyme's `shared` storage layer, which serializes,
 * guards against SSR/quota failures, and returns the typed value directly.
 */
import { shared } from '@missionfabric-js/enzyme';

const BOOKMARK_PREFIX = 'enzyme-ai-studio-bookmarks:';
const FEEDBACK_PREFIX = 'enzyme-ai-studio-feedback:';

export type Feedback = 'up' | 'down';

export function loadBookmarks(conversationId: string): string[] {
  return shared.getLocal<string[]>(`${BOOKMARK_PREFIX}${conversationId}`) ?? [];
}

export function saveBookmarks(conversationId: string, ids: string[]): void {
  shared.setLocal(`${BOOKMARK_PREFIX}${conversationId}`, ids);
}

export function loadFeedback(conversationId: string): Record<string, Feedback> {
  return shared.getLocal<Record<string, Feedback>>(`${FEEDBACK_PREFIX}${conversationId}`) ?? {};
}

export function saveFeedback(conversationId: string, map: Record<string, Feedback>): void {
  shared.setLocal(`${FEEDBACK_PREFIX}${conversationId}`, map);
}
