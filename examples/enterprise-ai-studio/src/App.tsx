import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  auth,
  flags,
  monitoring,
  performance as perf,
  streaming,
  theme,
} from '@missionfabric-js/enzyme';
import { StudioShell } from './studio/components/StudioShell';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});

/**
 * Provider tree for the AI studio. Order matters:
 *
 * - FeatureFlagProvider wraps ThemeProvider (gated by `dark-mode`) and the
 *   ModelPicker (gated by `beta-features`).
 * - AuthProvider supplies the user/RBAC consumed by sidebar permission checks.
 * - PerformanceProvider feeds the live Web Vitals shown in the Usage meter.
 * - GlobalErrorBoundary is the outermost catch — render errors anywhere in the
 *   studio bubble here, individual surfaces (the message list) wrap themselves
 *   in inner ErrorBoundaries for finer-grained recovery.
 */
export default function App(): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <flags.FeatureFlagProvider
        initialFlags={{
          [flags.flagKeys.BETA_FEATURES]: false,
          [flags.flagKeys.DARK_MODE]: true,
        }}
      >
        <theme.ThemeProvider defaultTheme="light">
          <auth.AuthProvider>
            <monitoring.GlobalErrorBoundary>
              <perf.PerformanceProvider>
                <streaming.StreamProvider>
                  <StudioShell />
                </streaming.StreamProvider>
              </perf.PerformanceProvider>
            </monitoring.GlobalErrorBoundary>
          </auth.AuthProvider>
        </theme.ThemeProvider>
      </flags.FeatureFlagProvider>
    </QueryClientProvider>
  );
}
