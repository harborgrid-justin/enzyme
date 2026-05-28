/**
 * Tiny event bus the Welcome screen (and empty conversation state) use to
 * prefill the composer when a user clicks a suggestion chip. A DOM CustomEvent
 * keeps the wiring decoupled — the chip doesn't need to know the composer
 * exists, and the composer doesn't need to know about chips.
 */
const EVENT_NAME = 'studio:fill-composer';

export function emitComposerDraft(text: string): void {
  window.dispatchEvent(new CustomEvent<string>(EVENT_NAME, { detail: text }));
}

export function onComposerDraft(handler: (text: string) => void): () => void {
  function listener(event: Event): void {
    const detail = (event as CustomEvent<string>).detail;
    if (typeof detail === 'string') handler(detail);
  }
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
