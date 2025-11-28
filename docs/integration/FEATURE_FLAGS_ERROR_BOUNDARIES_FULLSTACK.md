# Feature Flags + Error Boundaries + Full Stack Integration Guide

> **Harbor React Framework** - Comprehensive integration patterns for feature management, error handling, and full-stack composition.

## Table of Contents
- [Provider Composition](#provider-composition)
- [Feature Flags + Error Recovery](#feature-flags--error-recovery)
- [Progressive Rollouts](#progressive-rollouts)
- [A/B Testing Patterns](#ab-testing-patterns)
- [Full Stack Integration](#full-stack-integration)
- [Complete App Architecture](#complete-app-architecture)
- [Production Checklist](#production-checklist)

---

## Provider Composition

### Complete Provider Stack

```
┌─────────────────────────────────────────────────────────────────┐
│  GlobalErrorBoundary (unhandled errors, crash reporting)        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SecurityProvider (CSP, CSRF, secure storage)             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  AuthProvider (authentication, tokens)              │  │  │
│  │  │  ┌───────────────────────────────────────────────┐  │  │  │
│  │  │  │  QueryClientProvider (TanStack Query)         │  │  │  │
│  │  │  │  ┌─────────────────────────────────────────┐  │  │  │  │
│  │  │  │  │  FeatureFlagProvider (flags, gates)     │  │  │  │  │
│  │  │  │  │  ┌───────────────────────────────────┐  │  │  │  │  │
│  │  │  │  │  │  StoreProvider (Zustand state)    │  │  │  │  │  │
│  │  │  │  │  │  ┌─────────────────────────────┐  │  │  │  │  │  │
│  │  │  │  │  │  │  ThemeProvider (UI theme)   │  │  │  │  │  │  │
│  │  │  │  │  │  │  ┌───────────────────────┐  │  │  │  │  │  │  │
│  │  │  │  │  │  │  │  RealtimeProvider     │  │  │  │  │  │  │  │
│  │  │  │  │  │  │  │  ┌─────────────────┐  │  │  │  │  │  │  │  │
│  │  │  │  │  │  │  │  │  HydrationProv  │  │  │  │  │  │  │  │  │
│  │  │  │  │  │  │  │  │  ┌───────────┐  │  │  │  │  │  │  │  │  │
│  │  │  │  │  │  │  │  │  │  Router   │  │  │  │  │  │  │  │  │  │
│  │  │  │  │  │  │  │  │  └───────────┘  │  │  │  │  │  │  │  │  │
│  │  │  │  │  │  │  │  └─────────────────┘  │  │  │  │  │  │  │  │
│  │  │  │  │  │  │  └───────────────────────┘  │  │  │  │  │  │  │
│  │  │  │  │  │  └─────────────────────────────┘  │  │  │  │  │  │
│  │  │  │  │  └───────────────────────────────────┘  │  │  │  │  │
│  │  │  │  └─────────────────────────────────────────┘  │  │  │  │
│  │  │  └───────────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

#### Example 1: Complete Application Setup

```tsx
// app/providers.tsx
import { GlobalErrorBoundary } from '@/lib/monitoring';
import { SecurityProvider } from '@/lib/security';
import { AuthProvider } from '@/lib/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeatureFlagProvider } from '@/lib/flags';
import { StoreProvider } from '@/lib/state';
import { ThemeProvider } from '@/lib/theme';
import { RealtimeProvider } from '@/lib/realtime';
import { HydrationProvider } from '@/lib/hydration';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60000, retry: 3 },
    mutations: { retry: 1 }
  }
});

export function App() {
  return (
    <GlobalErrorBoundary
      fallback={<CriticalErrorPage />}
      onError={reportCrash}
    >
      <SecurityProvider cspEnabled csrfEnabled>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <FeatureFlagProvider
              source="/api/flags"
              refreshInterval={300000}
            >
              <StoreProvider>
                <ThemeProvider defaultTheme="system">
                  <RealtimeProvider url={import.meta.env.VITE_WS_URL}>
                    <HydrationProvider strategy="progressive">
                      <RouterProvider router={router} />
                    </HydrationProvider>
                  </RealtimeProvider>
                </ThemeProvider>
              </StoreProvider>
            </FeatureFlagProvider>
          </QueryClientProvider>
        </AuthProvider>
      </SecurityProvider>
    </GlobalErrorBoundary>
  );
}
```

---

## Feature Flags + Error Recovery

### Example 2: Feature Flag with Error Fallback

```tsx
import { FlagGate, useFeatureFlag } from '@/lib/flags';
import { ErrorBoundary } from '@/lib/monitoring';

export function NewDashboard() {
  return (
    <FlagGate
      flag="new-dashboard-v2"
      fallback={<LegacyDashboard />}
    >
      <ErrorBoundary
        fallback={<LegacyDashboard />}
        onError={(error) => {
          // Report that new feature crashed
          analytics.track('feature_error', {
            flag: 'new-dashboard-v2',
            error: error.message
          });
        }}
      >
        <DashboardV2 />
      </ErrorBoundary>
    </FlagGate>
  );
}
```

### Example 3: Automatic Feature Disable on Errors

```tsx
import { useFeatureFlag, useFeatureFlagContext } from '@/lib/flags';
import { ErrorBoundary } from '@/lib/monitoring';
import { useStore } from '@/lib/state';
import { useCallback, useRef } from 'react';

export function ResilientFeature({
  flag,
  children,
  fallback,
  errorThreshold = 3
}: {
  flag: string;
  children: React.ReactNode;
  fallback: React.ReactNode;
  errorThreshold?: number;
}) {
  const isEnabled = useFeatureFlag(flag);
  const { overrideFlag } = useFeatureFlagContext();
  const addNotification = useStore((s) => s.addNotification);
  const errorCount = useRef(0);

  const handleError = useCallback((error: Error) => {
    errorCount.current++;

    // Disable feature after too many errors
    if (errorCount.current >= errorThreshold) {
      overrideFlag(flag, false);

      addNotification({
        type: 'warning',
        message: 'Feature temporarily disabled due to errors',
        duration: 5000
      });

      // Report to backend
      fetch('/api/flags/report-error', {
        method: 'POST',
        body: JSON.stringify({ flag, errorCount: errorCount.current })
      });
    }
  }, [flag, errorThreshold, overrideFlag, addNotification]);

  if (!isEnabled) {
    return <>{fallback}</>;
  }

  return (
    <ErrorBoundary fallback={fallback} onError={handleError}>
      {children}
    </ErrorBoundary>
  );
}

// Usage
export function PaymentSection() {
  return (
    <ResilientFeature
      flag="new-payment-flow"
      fallback={<LegacyPaymentFlow />}
      errorThreshold={3}
    >
      <NewPaymentFlow />
    </ResilientFeature>
  );
}
```

### Example 4: Feature Flag with Loading State

```tsx
import { useFeatureFlag, useFeatureFlagLoading } from '@/lib/flags';
import { Spinner } from '@/lib/ui/feedback/Spinner';
import { ErrorBoundary, HierarchicalErrorBoundary } from '@/lib/monitoring';

export function ConditionalFeature({
  flag,
  children,
  fallback,
  loadingComponent = <Spinner />
}: {
  flag: string;
  children: React.ReactNode;
  fallback: React.ReactNode;
  loadingComponent?: React.ReactNode;
}) {
  const isEnabled = useFeatureFlag(flag);
  const isLoading = useFeatureFlagLoading();

  if (isLoading) {
    return <>{loadingComponent}</>;
  }

  return (
    <HierarchicalErrorBoundary
      name={`feature-${flag}`}
      fallback={<FeatureError flag={flag} fallback={fallback} />}
    >
      {isEnabled ? children : fallback}
    </HierarchicalErrorBoundary>
  );
}

function FeatureError({ flag, fallback }: { flag: string; fallback: React.ReactNode }) {
  return (
    <div role="alert">
      <p>This feature is temporarily unavailable.</p>
      {fallback}
    </div>
  );
}
```

---

## Progressive Rollouts

### Example 5: Percentage-Based Rollout

```tsx
import { useFeatureFlag, useFeatureFlagContext } from '@/lib/flags';
import { useAuth } from '@/lib/auth';
import { useMemo } from 'react';

export function useProgressiveRollout(flag: string): boolean {
  const { user } = useAuth();
  const { getFlagConfig } = useFeatureFlagContext();

  return useMemo(() => {
    const config = getFlagConfig(flag);

    if (!config?.rollout) {
      return config?.enabled ?? false;
    }

    // Deterministic hash based on user ID
    const hash = hashCode(`${flag}:${user?.id}`);
    const bucket = Math.abs(hash) % 100;

    return bucket < config.rollout.percentage;
  }, [flag, user?.id, getFlagConfig]);
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

// Usage
export function FeatureWithRollout() {
  const showNewFeature = useProgressiveRollout('gradual-rollout-feature');

  return showNewFeature ? <NewFeature /> : <OldFeature />;
}
```

### Example 6: Cohort-Based Feature Flags

```tsx
import { useAuth } from '@/lib/auth';
import { useFeatureFlagContext } from '@/lib/flags';
import { useStore } from '@/lib/state';

interface Cohort {
  id: string;
  rules: CohortRule[];
}

interface CohortRule {
  type: 'role' | 'plan' | 'country' | 'signup_date' | 'custom';
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'in';
  value: unknown;
}

export function useCohortFeature(flag: string): boolean {
  const { user } = useAuth();
  const { getFlagConfig } = useFeatureFlagContext();
  const userMetadata = useStore((s) => s.userMetadata);

  return useMemo(() => {
    const config = getFlagConfig(flag);
    if (!config?.cohorts) return config?.enabled ?? false;

    // Check if user matches any cohort
    return config.cohorts.some((cohort: Cohort) =>
      cohort.rules.every((rule) => evaluateRule(rule, user, userMetadata))
    );
  }, [flag, user, userMetadata, getFlagConfig]);
}

function evaluateRule(rule: CohortRule, user: User | null, metadata: UserMetadata): boolean {
  const getValue = () => {
    switch (rule.type) {
      case 'role': return user?.roles ?? [];
      case 'plan': return user?.plan;
      case 'country': return metadata?.country;
      case 'signup_date': return user?.createdAt;
      case 'custom': return metadata?.[rule.type];
      default: return undefined;
    }
  };

  const value = getValue();

  switch (rule.operator) {
    case 'equals': return value === rule.value;
    case 'contains': return Array.isArray(value) && value.includes(rule.value);
    case 'gt': return value > rule.value;
    case 'lt': return value < rule.value;
    case 'in': return Array.isArray(rule.value) && rule.value.includes(value);
    default: return false;
  }
}
```

### Example 7: Time-Based Feature Activation

```tsx
import { useFeatureFlagContext } from '@/lib/flags';
import { useState, useEffect } from 'react';

export function useScheduledFeature(flag: string): boolean {
  const { getFlagConfig } = useFeatureFlagContext();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const config = getFlagConfig(flag);

    if (!config?.schedule) {
      setIsActive(config?.enabled ?? false);
      return;
    }

    const checkSchedule = () => {
      const now = Date.now();
      const { startTime, endTime } = config.schedule;

      const started = !startTime || now >= new Date(startTime).getTime();
      const notEnded = !endTime || now < new Date(endTime).getTime();

      setIsActive(started && notEnded);
    };

    checkSchedule();

    // Check every minute
    const interval = setInterval(checkSchedule, 60000);
    return () => clearInterval(interval);
  }, [flag, getFlagConfig]);

  return isActive;
}

// Usage: Black Friday feature
export function BlackFridayBanner() {
  const isBlackFriday = useScheduledFeature('black-friday-2024');

  if (!isBlackFriday) return null;

  return <PromotionalBanner type="black-friday" />;
}
```

---

## A/B Testing Patterns

### Example 8: A/B Test with Analytics

```tsx
import { useFeatureFlagContext } from '@/lib/flags';
import { useAuth } from '@/lib/auth';
import { useEffect, useMemo } from 'react';

interface Variant {
  id: string;
  weight: number;
  component: React.ComponentType;
}

export function useABTest(experimentId: string, variants: Variant[]): React.ComponentType {
  const { user } = useAuth();
  const { getExperiment, trackExposure } = useFeatureFlagContext();

  const selectedVariant = useMemo(() => {
    const experiment = getExperiment(experimentId);

    if (!experiment?.enabled) {
      return variants[0]; // Control
    }

    // Deterministic variant assignment
    const hash = hashCode(`${experimentId}:${user?.id}`);
    const bucket = Math.abs(hash) % 100;

    let cumulative = 0;
    for (const variant of variants) {
      cumulative += variant.weight;
      if (bucket < cumulative) {
        return variant;
      }
    }

    return variants[0];
  }, [experimentId, user?.id, variants, getExperiment]);

  // Track exposure
  useEffect(() => {
    trackExposure(experimentId, selectedVariant.id);
  }, [experimentId, selectedVariant.id, trackExposure]);

  return selectedVariant.component;
}

// Usage
export function CheckoutPage() {
  const CheckoutComponent = useABTest('checkout-flow-experiment', [
    { id: 'control', weight: 50, component: ClassicCheckout },
    { id: 'variant-a', weight: 25, component: StreamlinedCheckout },
    { id: 'variant-b', weight: 25, component: OnePageCheckout }
  ]);

  return (
    <ErrorBoundary fallback={<ClassicCheckout />}>
      <CheckoutComponent />
    </ErrorBoundary>
  );
}
```

### Example 9: Multi-Variate Feature Testing

```tsx
import { useFeatureFlagContext } from '@/lib/flags';
import { useStore } from '@/lib/state';

interface FeatureVariant {
  buttonColor: 'blue' | 'green' | 'orange';
  buttonSize: 'sm' | 'md' | 'lg';
  showIcon: boolean;
  ctaText: string;
}

export function useFeatureVariant(flag: string): FeatureVariant {
  const { getFlagConfig } = useFeatureFlagContext();
  const abTestGroup = useStore((s) => s.abTestGroup);

  return useMemo(() => {
    const config = getFlagConfig(flag);
    const variants = config?.variants as Record<string, FeatureVariant>;

    if (!variants || !abTestGroup) {
      return variants?.default ?? {
        buttonColor: 'blue',
        buttonSize: 'md',
        showIcon: false,
        ctaText: 'Get Started'
      };
    }

    return variants[abTestGroup] ?? variants.default;
  }, [flag, abTestGroup, getFlagConfig]);
}

// Usage
export function CTAButton() {
  const variant = useFeatureVariant('cta-optimization');

  return (
    <Button
      color={variant.buttonColor}
      size={variant.buttonSize}
    >
      {variant.showIcon && <ArrowIcon />}
      {variant.ctaText}
    </Button>
  );
}
```

---

## Full Stack Integration

### Example 10: Complete Feature with All Layers

```tsx
// Feature: Real-time collaborative editing

import { FlagGate, useFeatureFlag } from '@/lib/flags';
import { ErrorBoundary, useErrorReporter } from '@/lib/monitoring';
import { useAuth, RequireAuth, RequirePermission } from '@/lib/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRealtimeStream } from '@/lib/realtime';
import { useStore } from '@/lib/state';
import { useTheme } from '@/lib/theme';
import { SecureStorage } from '@/lib/security';
import { HydrationBoundary } from '@/lib/hydration';

export function CollaborativeEditor({ documentId }: { documentId: string }) {
  return (
    <RequireAuth>
      <RequirePermission permission="documents:edit">
        <FlagGate
          flag="collaborative-editing"
          fallback={<SingleUserEditor documentId={documentId} />}
        >
          <ErrorBoundary
            fallback={<EditorError documentId={documentId} />}
            onError={(error) => reportEditorCrash(error, documentId)}
          >
            <HydrationBoundary priority="high">
              <CollaborativeEditorInner documentId={documentId} />
            </HydrationBoundary>
          </ErrorBoundary>
        </FlagGate>
      </RequirePermission>
    </RequireAuth>
  );
}

function CollaborativeEditorInner({ documentId }: { documentId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const reportError = useErrorReporter();

  // State
  const setActiveUsers = useStore((s) => s.setActiveUsers);
  const cursorPositions = useStore((s) => s.cursorPositions);

  // Query: Fetch document
  const { data: document, isLoading } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => fetchDocument(documentId)
  });

  // Mutation: Save changes
  const saveMutation = useMutation({
    mutationFn: (content: string) => saveDocument(documentId, content),
    onError: (error) => {
      reportError(error, { context: 'document-save', documentId });
    }
  });

  // Realtime: Collaboration events
  const { send } = useRealtimeStream({
    channel: `document:${documentId}`,
    events: {
      'user:joined': (userData) => {
        setActiveUsers((users) => [...users, userData]);
      },
      'user:left': ({ oderId }) => {
        setActiveUsers((users) => users.filter((u) => u.id !== userId));
      },
      'cursor:moved': ({ oderId, position }) => {
        // Update cursor position in state
      },
      'content:changed': ({ changes, version }) => {
        // Apply operational transform
        queryClient.setQueryData(['document', documentId], (old) => ({
          ...old,
          content: applyChanges(old.content, changes),
          version
        }));
      }
    }
  });

  // Auto-save draft to secure storage
  useEffect(() => {
    const saveDraft = async () => {
      if (document?.content) {
        await SecureStorage.setItem(
          `draft:${documentId}`,
          JSON.stringify({ content: document.content, timestamp: Date.now() })
        );
      }
    };

    const interval = setInterval(saveDraft, 30000);
    return () => clearInterval(interval);
  }, [documentId, document?.content]);

  if (isLoading) {
    return <EditorSkeleton />;
  }

  return (
    <div className={`editor editor--${resolvedTheme}`}>
      <EditorToolbar onSave={() => saveMutation.mutate(document!.content)} />
      <EditorCanvas
        content={document!.content}
        cursors={cursorPositions}
        onChange={(changes) => {
          send('content:changed', { changes });
        }}
        onCursorMove={(position) => {
          send('cursor:moved', { oderId: user!.id, position });
        }}
      />
      <ActiveUsersList />
    </div>
  );
}
```

### Example 11: Layered Error Handling

```tsx
import { GlobalErrorBoundary, HierarchicalErrorBoundary, ErrorBoundary } from '@/lib/monitoring';

export function AppWithErrorLayers({ children }: { children: React.ReactNode }) {
  return (
    // Level 1: Catch-all for unhandled errors
    <GlobalErrorBoundary
      fallback={<CriticalErrorPage />}
      onError={(error, info) => {
        // Send to crash reporting service
        crashReporter.captureException(error, {
          extra: { componentStack: info.componentStack },
          level: 'fatal'
        });
      }}
    >
      {/* Level 2: App-level error boundary */}
      <HierarchicalErrorBoundary
        name="app"
        fallback={<AppErrorPage />}
        onError={(error) => {
          crashReporter.captureException(error, { level: 'error' });
        }}
      >
        {/* Level 3: Feature-level boundaries */}
        <Layout>
          <HierarchicalErrorBoundary
            name="sidebar"
            fallback={<SidebarFallback />}
          >
            <Sidebar />
          </HierarchicalErrorBoundary>

          <main>
            <HierarchicalErrorBoundary
              name="main-content"
              fallback={<ContentError />}
            >
              {/* Level 4: Component-level boundaries */}
              <ErrorBoundary fallback={<WidgetError />}>
                <Widget />
              </ErrorBoundary>

              {children}
            </HierarchicalErrorBoundary>
          </main>
        </Layout>
      </HierarchicalErrorBoundary>
    </GlobalErrorBoundary>
  );
}
```

### Example 12: Feature Flag Sync Across Stack

```tsx
// Sync feature flags between frontend and backend

import { useFeatureFlagContext } from '@/lib/flags';
import { useAuth } from '@/lib/auth';
import { useRealtimeStream } from '@/lib/realtime';
import { useEffect } from 'react';

export function FeatureFlagSync() {
  const { user } = useAuth();
  const { setFlags, setOverride } = useFeatureFlagContext();

  // Initial fetch with user context
  useEffect(() => {
    const fetchFlags = async () => {
      const response = await fetch('/api/flags', {
        headers: {
          'X-User-ID': user?.id ?? '',
          'X-User-Roles': user?.roles?.join(',') ?? '',
          'X-User-Plan': user?.plan ?? 'free'
        }
      });
      const flags = await response.json();
      setFlags(flags);
    };

    fetchFlags();
  }, [user?.id, user?.roles, user?.plan]);

  // Real-time flag updates
  useRealtimeStream({
    channel: 'feature-flags',
    events: {
      'flag:updated': ({ flag, enabled, config }) => {
        setOverride(flag, enabled, config);
      },
      'flag:experiment-assigned': ({ flag, variant }) => {
        setOverride(flag, true, { variant });
      }
    }
  });

  return null;
}

// Server-side: Include flags in initial HTML
export function getServerSideProps(context) {
  const flags = await evaluateFlags(context.req);

  return {
    props: {
      initialFlags: flags
    }
  };
}
```

---

## Complete App Architecture

### Example 13: Production-Ready App Structure

```tsx
// app/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initializeMonitoring } from '@/lib/monitoring';
import { preloadCriticalResources } from '@/lib/performance';

// Initialize error monitoring before React
initializeMonitoring({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE
});

// Preload critical resources
preloadCriticalResources([
  '/api/flags',
  '/api/user',
  '/api/config'
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// app/App.tsx
import { Suspense, lazy } from 'react';
import { AppProviders } from './providers';
import { AppRoutes } from './routes';
import { AppShell } from './AppShell';
import { LoadingScreen } from '@/lib/ui/feedback/LoadingScreen';

export function App() {
  return (
    <AppProviders>
      <AppShell>
        <Suspense fallback={<LoadingScreen />}>
          <AppRoutes />
        </Suspense>
      </AppShell>
    </AppProviders>
  );
}

// app/providers.tsx
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GlobalErrorBoundary fallback={<CriticalError />}>
      <SecurityProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <FeatureFlagProvider>
              <StoreProvider>
                <ThemeProvider>
                  <RealtimeProvider>
                    <HydrationProvider>
                      <AccessibilityProvider>
                        {children}
                      </AccessibilityProvider>
                    </HydrationProvider>
                  </RealtimeProvider>
                </ThemeProvider>
              </StoreProvider>
            </FeatureFlagProvider>
          </QueryClientProvider>
        </AuthProvider>
      </SecurityProvider>
    </GlobalErrorBoundary>
  );
}
```

### Example 14: Module Integration Patterns

```tsx
// Combining all modules for a complex feature

import { useAuth, RequireAuth } from '@/lib/auth';
import { useFeatureFlag, FlagGate } from '@/lib/flags';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRealtimeStream } from '@/lib/realtime';
import { useStore } from '@/lib/state';
import { useTheme } from '@/lib/theme';
import { usePerformanceMonitor } from '@/lib/performance';
import { ErrorBoundary, useErrorReporter } from '@/lib/monitoring';
import { SecureStorage, useCSRFToken } from '@/lib/security';
import { HydrationBoundary, useHydration } from '@/lib/hydration';
import { DataTable } from '@/lib/ui/data/DataTable';
import { useReducedMotion } from '@/lib/hooks';

export function AdvancedDashboard() {
  // Auth
  const { user, isAuthenticated } = useAuth();

  // Feature Flags
  const showBetaFeatures = useFeatureFlag('beta-dashboard');
  const enableAnalytics = useFeatureFlag('dashboard-analytics');

  // State
  const dashboardConfig = useStore((s) => s.dashboardConfig);
  const setWidgets = useStore((s) => s.setDashboardWidgets);

  // Theme
  const { resolvedTheme } = useTheme();

  // Performance
  const { trackMetric, startMeasure, endMeasure } = usePerformanceMonitor();

  // Hydration
  const { isHydrated } = useHydration();

  // Accessibility
  const prefersReducedMotion = useReducedMotion();

  // Security
  const csrfToken = useCSRFToken();

  // Error reporting
  const reportError = useErrorReporter();

  // Data fetching
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard-metrics', user?.id],
    queryFn: () => fetchMetrics(user!.id),
    enabled: isAuthenticated && isHydrated
  });

  // Real-time updates
  useRealtimeStream({
    channel: `dashboard:${user?.id}`,
    enabled: isAuthenticated,
    events: {
      'metrics:updated': (newMetrics) => {
        queryClient.setQueryData(['dashboard-metrics', user?.id], newMetrics);
      }
    }
  });

  // Track render performance
  useEffect(() => {
    if (isHydrated && metrics) {
      endMeasure('dashboard-load');
      trackMetric('dashboard-ttc', performance.now());
    }
  }, [isHydrated, metrics]);

  return (
    <RequireAuth>
      <ErrorBoundary fallback={<DashboardError />} onError={reportError}>
        <div className={`dashboard dashboard--${resolvedTheme}`}>
          <HydrationBoundary priority="high">
            <DashboardHeader config={dashboardConfig} />
          </HydrationBoundary>

          <HydrationBoundary priority="normal">
            <MetricsGrid
              metrics={metrics}
              isLoading={isLoading}
              animate={!prefersReducedMotion}
            />
          </HydrationBoundary>

          <FlagGate flag="beta-dashboard">
            <HydrationBoundary priority="low">
              <BetaWidgets />
            </HydrationBoundary>
          </FlagGate>

          {enableAnalytics && (
            <HydrationBoundary priority="low">
              <AnalyticsPanel />
            </HydrationBoundary>
          )}
        </div>
      </ErrorBoundary>
    </RequireAuth>
  );
}
```

---

## Production Checklist

### Pre-Launch Checklist

```markdown
## Security
- [ ] CSP headers configured
- [ ] CSRF protection enabled
- [ ] Secure token storage implemented
- [ ] XSS prevention hooks in place
- [ ] Sensitive data encrypted at rest

## Authentication
- [ ] Auth guards on protected routes
- [ ] Token refresh flow working
- [ ] Session persistence implemented
- [ ] Logout clears all sensitive data
- [ ] Role-based access control tested

## Error Handling
- [ ] Global error boundary in place
- [ ] Feature-level error boundaries
- [ ] Crash reporting configured
- [ ] Graceful degradation for features
- [ ] User-friendly error messages

## Feature Flags
- [ ] Flag provider initialized early
- [ ] Fallbacks for all gated features
- [ ] A/B test tracking configured
- [ ] Feature disable on errors
- [ ] Real-time flag updates

## Performance
- [ ] Web vitals collection enabled
- [ ] Performance budgets defined
- [ ] Memory pressure handling
- [ ] Progressive hydration
- [ ] Code splitting implemented

## Accessibility
- [ ] Keyboard navigation tested
- [ ] Screen reader tested
- [ ] Color contrast verified
- [ ] Focus management working
- [ ] Reduced motion support

## State Management
- [ ] State persistence configured
- [ ] Cross-tab sync working
- [ ] State hydration from server
- [ ] Optimistic updates
- [ ] Undo/redo where needed

## Real-time
- [ ] WebSocket reconnection
- [ ] SSE fallback
- [ ] Offline queue
- [ ] Conflict resolution
- [ ] Connection state UI
```

### Monitoring Dashboard Metrics

```tsx
// Recommended metrics to track

export const DASHBOARD_METRICS = {
  // Performance
  'web-vitals.lcp': { threshold: 2500, unit: 'ms' },
  'web-vitals.fid': { threshold: 100, unit: 'ms' },
  'web-vitals.cls': { threshold: 0.1, unit: 'score' },
  'hydration.duration': { threshold: 1000, unit: 'ms' },

  // Errors
  'errors.total': { threshold: 10, unit: 'count/min' },
  'errors.by-feature': { threshold: 5, unit: 'count/min' },
  'errors.unhandled': { threshold: 1, unit: 'count/min' },

  // Feature Flags
  'flags.evaluations': { unit: 'count/min' },
  'flags.errors': { threshold: 5, unit: 'count/min' },
  'experiments.exposures': { unit: 'count/min' },

  // Real-time
  'realtime.connections': { unit: 'count' },
  'realtime.reconnections': { threshold: 10, unit: 'count/min' },
  'realtime.message-latency': { threshold: 100, unit: 'ms' },

  // Auth
  'auth.login-success': { unit: 'count/min' },
  'auth.login-failure': { threshold: 10, unit: 'count/min' },
  'auth.token-refresh': { unit: 'count/min' }
};
```

---

## Quick Reference

| Layer | Module | Purpose | Integration Points |
|-------|--------|---------|-------------------|
| Error | monitoring | Crash handling | All components |
| Security | security | Protection | Auth, API, Storage |
| Auth | auth | Identity | Guards, State, API |
| Data | queries | Caching | Services, Realtime |
| Flags | flags | Features | All components |
| State | state | App state | All components |
| Theme | theme | Styling | UI components |
| Realtime | realtime | Live updates | Queries, State |
| Hydration | hydration | SSR | Performance, UI |
| UI | ui | Components | Theme, A11y |

---

*Last updated: 2024 | Harbor React Framework v2.0*
