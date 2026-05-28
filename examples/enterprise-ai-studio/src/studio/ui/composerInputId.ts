/**
 * Stable DOM id for the composer textarea. Lives in its own module so the
 * Composer and the global `⌘/` hotkey (StudioShell) can both reference it
 * without circular imports.
 */
export const COMPOSER_INPUT_ID = 'studio-composer-input';
