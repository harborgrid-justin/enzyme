import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import Enzyme modules using the main package
import { 
  routing, 
  theme, 
  monitoring, 
  performance as performanceMod, 
  flags, 
  config, 
  auth 
} from '@missionfabric-js/enzyme';

// Create router configuration
const routeConfigs: routing.RouteConfig[] = [
  { path: '/', importFn: () => import('./HomePage') },
  { path: '/example-01', importFn: () => import('../examples/01-basic-routing') },
  { path: '/example-02', importFn: () => import('../examples/02-state-management') },
  { path: '/example-03', importFn: () => import('../examples/03-auth-rbac') },
];

// Create router using Enzyme's createRouter
const router = routing.createRouter(routeConfigs, {
  prefetchOnHover: true,
  prefetchDelay: 100,
});

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

// Demo configuration for Enzyme
const demoConfig = {
  app: {
    name: 'Enzyme Demo',
    version: '1.0.3',
    environment: 'demo',
  },
  api: {
    baseUrl: 'https://api.example.com',
    timeout: 10000,
  },
  features: {
    analytics: true,
    monitoring: true,
    prefetch: true,
  },
};

export default function App() {
  return (
    <config.ConfigProvider config={demoConfig}>
      <theme.ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <flags.FeatureFlagProvider>
            <auth.AuthProvider>
              <monitoring.GlobalErrorBoundary>
                <performanceMod.PerformanceProvider>
                  <RouterProvider router={router} />
                </performanceMod.PerformanceProvider>
              </monitoring.GlobalErrorBoundary>
            </auth.AuthProvider>
          </flags.FeatureFlagProvider>
        </QueryClientProvider>
      </theme.ThemeProvider>
    </config.ConfigProvider>
  );
}
