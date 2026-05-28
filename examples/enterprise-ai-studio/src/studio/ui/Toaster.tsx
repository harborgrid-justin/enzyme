import { Toaster as SonnerToaster } from 'sonner';
import { theme } from '@missionfabric-js/enzyme';

/**
 * Single mount point for toast notifications. Reads the resolved theme from
 * enzyme's ThemeProvider so dark mode is honored automatically. Sits near the
 * top of the provider tree (rendered inside `App`).
 */
export function Toaster(): React.ReactElement {
  const { resolvedTheme } = theme.useThemeContext();
  return (
    <SonnerToaster
      position="bottom-right"
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      richColors
      closeButton
      visibleToasts={4}
      // Honor prefers-reduced-motion — Sonner already does this, but state it.
      expand={false}
    />
  );
}
