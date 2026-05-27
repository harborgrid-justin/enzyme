import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  auth,
  flags,
  monitoring,
  performance as perf,
  realtime,
  theme,
} from '@missionfabric-js/enzyme';
import { ChatShell } from './chat/components/ChatShell';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});

/**
 * Provider order matters:
 * - FeatureFlagProvider wraps ThemeProvider (reads `dark-mode`) and RealtimeProvider
 *   (gated by `real-time-updates`).
 * - AuthProvider supplies the user/RBAC consumed by the gating hooks.
 * - RealtimeProvider is innermost so it can read flags/query state.
 */
export default function App(): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <flags.FeatureFlagProvider
        initialFlags={{
          [flags.flagKeys.REAL_TIME_UPDATES]: true,
          [flags.flagKeys.DARK_MODE]: true,
          [flags.flagKeys.BETA_FEATURES]: false,
        }}
      >
        <theme.ThemeProvider defaultTheme="light">
          <auth.AuthProvider>
            <monitoring.GlobalErrorBoundary>
              <perf.PerformanceProvider>
                <realtime.RealtimeProvider config={{ type: 'websocket', url: '' }}>
                  <ChatShell />
                </realtime.RealtimeProvider>
              </perf.PerformanceProvider>
            </monitoring.GlobalErrorBoundary>
          </auth.AuthProvider>
        </theme.ThemeProvider>
      </flags.FeatureFlagProvider>
    </QueryClientProvider>
  );
}
