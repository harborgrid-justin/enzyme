import { theme } from '@missionfabric-js/enzyme';
import { Moon, Sun } from 'lucide-react';

/** Light/dark toggle backed by enzyme's ThemeProvider (gated by `dark-mode` flag). */
export function ThemeToggle(): React.ReactElement {
  const { resolvedTheme, toggleTheme, darkModeEnabled } = theme.useThemeContext();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      disabled={!darkModeEnabled}
      className="icon-button"
      aria-label="Toggle color theme"
      title={darkModeEnabled ? 'Toggle theme' : 'Dark mode flag is disabled'}
    >
      {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
