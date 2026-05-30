/**
 * Feature #33: per-conversation composer draft persistence.
 *
 * Unsent composer text is saved to localStorage keyed by conversation id, so
 * switching threads (or reloading the tab) restores whatever you were typing.
 * Storage goes through enzyme's `shared` storage layer (`setLocal`/`getLocal`/
 * `removeLocal`), which adds SSR/quota guards and a consistent envelope so the
 * Composer and the draft bus don't hand-roll `localStorage` access.
 */
import { shared } from '@missionfabric-js/enzyme';

const PREFIX = 'enzyme-ai-studio-draft:';

function keyFor(conversationId: string): string {
  return `${PREFIX}${conversationId}`;
}

export function loadDraft(conversationId: string): string {
  return shared.getLocal<string>(keyFor(conversationId)) ?? '';
}

export function saveDraft(conversationId: string, text: string): void {
  if (text.trim() === '') {
    shared.removeLocal(keyFor(conversationId));
  } else {
    shared.setLocal(keyFor(conversationId), text);
  }
}

export function clearDraft(conversationId: string): void {
  shared.removeLocal(keyFor(conversationId));
}
