/**
 * Global keyboard shortcut hook.
 *
 * Combos use the form `mod+k`, `mod+enter`, `esc`, `shift+/`. `mod` resolves to
 * Cmd on macOS and Ctrl elsewhere so shortcuts feel native on both. Handlers
 * are NOT invoked while the user is typing in a text input / textarea /
 * contenteditable, except for combos that explicitly opt in via
 * `{ allowInInput: true }` (used for `mod+enter` to send from the composer
 * and `esc` to abort the active stream).
 */
import { useEffect } from 'react';

export interface HotkeyOptions {
  /** Fire even when focus is in a text input / textarea / contenteditable. */
  allowInInput?: boolean;
  /** When false, the hook does not register the listener. Defaults to true. */
  enabled?: boolean;
  /** Stop the event reaching the browser default + other handlers. Default true. */
  preventDefault?: boolean;
}

type KeyHandler = (event: KeyboardEvent) => void;

export function useHotkey(
  combo: string,
  handler: KeyHandler,
  options: HotkeyOptions = {}
): void {
  const { allowInInput = false, enabled = true, preventDefault = true } = options;

  useEffect(() => {
    if (!enabled) return;
    const matcher = parseCombo(combo);

    function onKeyDown(event: KeyboardEvent): void {
      if (!matches(event, matcher)) return;
      if (!allowInInput && isEditableTarget(event.target)) return;
      if (preventDefault) event.preventDefault();
      handler(event);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [combo, handler, allowInInput, enabled, preventDefault]);
}

interface ParsedCombo {
  key: string;
  mod: boolean;
  shift: boolean;
  alt: boolean;
}

function parseCombo(combo: string): ParsedCombo {
  const parts = combo.toLowerCase().split('+').map((p) => p.trim());
  const key = parts[parts.length - 1] ?? '';
  return {
    key,
    mod: parts.includes('mod') || parts.includes('cmd') || parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt') || parts.includes('option'),
  };
}

function matches(event: KeyboardEvent, combo: ParsedCombo): boolean {
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const modPressed = isMac ? event.metaKey : event.ctrlKey;
  if (combo.mod !== modPressed) return false;
  if (combo.shift !== event.shiftKey) return false;
  if (combo.alt !== event.altKey) return false;

  const eventKey = event.key.toLowerCase();
  // Map a few synonyms so authors can write the combo as it reads.
  const expected =
    combo.key === 'esc'
      ? 'escape'
      : combo.key === 'enter'
        ? 'enter'
        : combo.key;
  return eventKey === expected;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

/** Returns the platform-appropriate label for the modifier key. */
export function modKeyLabel(): string {
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return isMac ? '⌘' : 'Ctrl';
}
