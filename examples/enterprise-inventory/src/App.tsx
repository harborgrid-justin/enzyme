import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import {
  auth,
  flags,
  monitoring,
  performance as perf,
  theme,
} from '@missionfabric-js/enzyme';
import { InventoryShell } from './inventory/components/InventoryShell';
import { INITIAL_FLAGS } from './inventory/flags';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});

function globalErrorFallback(
  error: { message: string },
  reset: () => void
): React.ReactElement {
  return (
    <div className="error-screen">
      <h1>The inventory workspace crashed</h1>
      <p>{error.message}</p>
      <button type="button" className="primary-button" onClick={reset}>
        Reload workspace
      </button>
    </div>
  );
}

/**
 * Provider order matters:
 * - FeatureFlagProvider wraps ThemeProvider (reads `dark-mode`).
 * - AuthProvider supplies the user/RBAC consumed by RBAC-gated UI.
 * - GlobalErrorBoundary catches uncaught render errors at the app root.
 * - PerformanceProvider sits inside, so Web Vitals stream into the Settings panel.
 */
export default function App(): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <flags.FeatureFlagProvider initialFlags={INITIAL_FLAGS}>
        <theme.ThemeProvider defaultTheme="light">
          <auth.AuthProvider>
            <monitoring.GlobalErrorBoundary fallback={globalErrorFallback}>
              <perf.PerformanceProvider>
                <BrowserRouter>
                  <InventoryShell />
                </BrowserRouter>
              </perf.PerformanceProvider>
            </monitoring.GlobalErrorBoundary>
          </auth.AuthProvider>
        </theme.ThemeProvider>
      </flags.FeatureFlagProvider>
    </QueryClientProvider>
  );
}
