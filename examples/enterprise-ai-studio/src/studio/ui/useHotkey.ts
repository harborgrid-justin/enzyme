/**
 * Platform modifier label helper.
 *
 * The studio's keyboard shortcuts themselves now run through enzyme's
 * `hooks.useKeyboardShortcuts`; this module just provides the human-readable
 * modifier-key label (⌘ on macOS, Ctrl elsewhere) used in tooltips and the
 * shortcuts dialog.
 */

/** Returns the platform-appropriate label for the modifier key. */
export function modKeyLabel(): string {
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return isMac ? '⌘' : 'Ctrl';
}
