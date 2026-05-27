import { theme } from '@missionfabric-js/enzyme';

/** Light/dark toggle backed by enzyme's ThemeProvider (gated by the dark-mode flag). */
export function ThemeToggle(): React.ReactElement {
  const { resolvedTheme, toggleTheme, darkModeEnabled } = theme.useThemeContext();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      disabled={!darkModeEnabled}
      className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
      aria-label="Toggle color theme"
    >
      {resolvedTheme === 'dark' ? '☀ Light' : '☾ Dark'}
    </button>
  );
}
