/**
 * Feature #33: per-conversation composer draft persistence.
 *
 * Unsent composer text is saved to localStorage keyed by conversation id, so
 * switching threads (or reloading the tab) restores whatever you were typing.
 * Kept tiny + framework-free so both the Composer and the draft bus can use it.
 */
const PREFIX = 'enzyme-ai-studio-draft:';

function keyFor(conversationId: string): string {
  return `${PREFIX}${conversationId}`;
}

export function loadDraft(conversationId: string): string {
  try {
    return localStorage.getItem(keyFor(conversationId)) ?? '';
  } catch {
    return '';
  }
}

export function saveDraft(conversationId: string, text: string): void {
  try {
    if (text.trim() === '') {
      localStorage.removeItem(keyFor(conversationId));
    } else {
      localStorage.setItem(keyFor(conversationId), text);
    }
  } catch {
    // Storage unavailable (private mode / quota) — drafts are best-effort.
  }
}

export function clearDraft(conversationId: string): void {
  try {
    localStorage.removeItem(keyFor(conversationId));
  } catch {
    // Ignore.
  }
}
