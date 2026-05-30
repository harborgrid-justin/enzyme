/**
 * Tiny event bus the Welcome screen (and empty conversation state) use to
 * prefill the composer when a user clicks a suggestion chip. A decoupled
 * pub/sub keeps the wiring loose — the chip doesn't need to know the composer
 * exists, and the composer doesn't need to know about chips.
 *
 * Backed by enzyme's typed `createEventEmitter` (from `utils`) rather than a
 * hand-rolled DOM `CustomEvent`, so the channel is strongly typed and the
 * subscribe APIs return a consistent unsubscribe function.
 */
import { utils } from '@missionfabric-js/enzyme';

type ComposerEvents = {
  /** Replace the composer contents with this text. */
  fill: string;
  /** Append a Markdown blockquote of this text to the composer. */
  quote: string;
};

const bus = utils.createEventEmitter<ComposerEvents>();

export function emitComposerDraft(text: string): void {
  void bus.emit('fill', text);
}

export function onComposerDraft(handler: (text: string) => void): () => void {
  return bus.on('fill', handler);
}

/**
 * Feature #63: quote-reply. Unlike `emitComposerDraft` (which replaces), this
 * asks the composer to append a Markdown blockquote of the given text.
 */
export function emitComposerQuote(text: string): void {
  void bus.emit('quote', text);
}

export function onComposerQuote(handler: (text: string) => void): () => void {
  return bus.on('quote', handler);
}
