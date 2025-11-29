/**
 * Codemod: Migrate from barrel export to submodule imports
 *
 * This codemod automatically converts imports from '@/lib' to their respective submodules.
 *
 * Usage:
 *   npx jscodeshift -t scripts/codemods/migrate-barrel-imports.ts src/
 *   npx jscodeshift -t scripts/codemods/migrate-barrel-imports.ts --dry src/
 *   npx jscodeshift -t scripts/codemods/migrate-barrel-imports.ts --parser tsx src/
 *
 * @see https://github.com/facebook/jscodeshift
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import type { API, FileInfo, Options } from 'jscodeshift';

/**
 * Map of exports to their submodules
 */
const EXPORT_TO_MODULE: Record<string, string> = {
  // ============================================================================
  // System
  // ============================================================================
  initializeApp: 'system',
  bootstrapApp: 'system',
  AppConfig: 'system',
  SystemConfig: 'system',

  // ============================================================================
  // Auth & RBAC
  // ============================================================================
  useAuth: 'auth',
  AuthProvider: 'auth',
  useAuthContext: 'auth',
  authService: 'auth',
  RequireAuth: 'auth',
  RequireRole: 'auth',
  RequirePermission: 'auth',
  routeMetadata: 'auth',
  getRouteAuthConfig: 'auth',
  canAccessRoute: 'auth',
  User: 'auth',
  Role: 'auth',
  Permission: 'auth',
  AuthTokens: 'auth',
  LoginCredentials: 'auth',
  RegisterCredentials: 'auth',
  AuthState: 'auth',
  AuthContextValue: 'auth',
  RouteAuthConfig: 'auth',

  // RBAC
  RBACProvider: 'auth',
  useRBAC: 'auth',
  usePermissions: 'auth',
  useRoles: 'auth',
  useResourceAccess: 'auth',
  RBACEngine: 'auth',
  createRBACEngine: 'auth',

  // Active Directory
  ADProvider: 'auth',
  useActiveDirectory: 'auth',
  ADClient: 'auth',
  createADClient: 'auth',

  // ============================================================================
  // Feature Flags
  // ============================================================================
  useFeatureFlag: 'flags',
  useFeatureFlags: 'flags',
  useFeatureFlagValue: 'flags',
  FlagGate: 'flags',
  FeatureFlagProvider: 'flags',
  flagKeys: 'flags',
  isFlagEnabled: 'flags',
  FeatureFlag: 'flags',
  FlagConfig: 'flags',
  FlagValue: 'flags',
  FeatureFlagConfig: 'flags',

  // ============================================================================
  // Performance
  // ============================================================================
  initPerformanceMonitoring: 'performance',
  startPerformanceMonitoring: 'performance',
  usePerformanceMonitor: 'performance',
  PerformanceProvider: 'performance',
  PerformanceObservatory: 'performance',
  usePerformanceObservatory: 'performance',
  useLongTaskDetector: 'performance',
  useMemoryPressure: 'performance',
  useNetworkQuality: 'performance',
  usePerformanceBudget: 'performance',
  useBudgetStatus: 'performance',
  useRenderMetrics: 'performance',
  VitalsCollector: 'performance',
  getVitalsCollector: 'performance',
  initVitals: 'performance',
  PerformanceMonitor: 'performance',
  getPerformanceMonitor: 'performance',
  PerformanceBudgetManager: 'performance',
  getBudgetManager: 'performance',
  RenderTracker: 'performance',
  getRenderTracker: 'performance',
  NetworkPerformanceAnalyzer: 'performance',
  getNetworkAnalyzer: 'performance',
  PredictivePrefetchEngine: 'performance',
  getPredictivePrefetchEngine: 'performance',
  usePredictivePrefetch: 'performance',
  PredictiveLink: 'performance',
  VitalMetricName: 'performance',
  PerformanceRating: 'performance',
  PerformanceBudget: 'performance',
  PerformanceMetrics: 'performance',

  // ============================================================================
  // Monitoring & Error Handling
  // ============================================================================
  ErrorBoundary: 'monitoring',
  GlobalErrorBoundary: 'monitoring',
  QueryErrorBoundary: 'monitoring',
  HierarchicalErrorBoundary: 'monitoring',
  CriticalErrorBoundary: 'monitoring',
  FeatureErrorBoundary: 'monitoring',
  ComponentErrorBoundary: 'monitoring',
  useErrorBoundary: 'monitoring',
  useErrorTrigger: 'monitoring',
  ErrorReporter: 'monitoring',
  initErrorReporter: 'monitoring',
  reportError: 'monitoring',
  reportWarning: 'monitoring',
  addBreadcrumb: 'monitoring',
  AppError: 'monitoring',
  ErrorContext: 'monitoring',
  ErrorSeverity: 'monitoring',
  ErrorCategory: 'monitoring',
  ErrorBoundaryProps: 'monitoring',
  crashAnalytics: 'monitoring',

  // ============================================================================
  // Hooks
  // ============================================================================
  // Mounted
  useIsMounted: 'hooks',
  useMountedState: 'hooks',
  useMounted: 'hooks',

  // Refs
  useLatestRef: 'hooks',
  useLatestCallback: 'hooks',
  useLatestRefs: 'hooks',

  // Theme
  useTheme: 'hooks',
  useSystemThemePreference: 'hooks',

  // Network
  useNetworkStatus: 'hooks',
  useOnlineStatus: 'hooks',
  useSlowConnection: 'hooks',
  useOfflineFallback: 'hooks',
  useNetworkAwareFetch: 'hooks',

  // Prefetch
  usePrefetchRoute: 'hooks',
  usePrefetchOnHover: 'hooks',
  useSmartPrefetch: 'hooks',

  // Analytics
  usePageView: 'hooks',
  useTrackEvent: 'hooks',
  useTrackFeature: 'hooks',

  // Debounce/Throttle
  useDebouncedValue: 'hooks',
  useDebouncedCallback: 'hooks',
  useThrottledValue: 'hooks',

  // Resource Cleanup
  useDisposable: 'hooks',
  useAbortController: 'hooks',
  useTimeout: 'hooks',
  useInterval: 'hooks',
  useEventListener: 'hooks',

  // Store
  useGlobalStore: 'hooks',
  useGlobalStoreMultiple: 'hooks',

  // Error Recovery
  useAsyncWithRecovery: 'hooks',
  useErrorToast: 'hooks',

  // Accessibility
  useScreenReaderAnnounce: 'hooks',
  useKeyboardShortcuts: 'hooks',

  // ============================================================================
  // React Query
  // ============================================================================
  createQueryKeyFactory: 'queries',
  queryClient: 'queries',

  // ============================================================================
  // Routing
  // ============================================================================
  RouteRegistry: 'routing',
  registerRoute: 'routing',
  RouteMetadata: 'routing',
  RouteParams: 'routing',

  // ============================================================================
  // Services
  // ============================================================================
  serviceLayer: 'services',
  ServiceLayerFacade: 'services',
  RequestQueue: 'services',
  HttpRequestConfig: 'services',
  TypeSafeApiClient: 'services',

  // ============================================================================
  // UI Components
  // ============================================================================
  Spinner: 'ui/feedback',
  Toast: 'ui/feedback',
  ToastProvider: 'ui/feedback',
  Alert: 'ui/feedback',
  Progress: 'ui/feedback',
  ProgressBar: 'ui/feedback',

  Button: 'ui/inputs',
  Input: 'ui/inputs',
  Select: 'ui/inputs',
  Checkbox: 'ui/inputs',
  Radio: 'ui/inputs',

  Modal: 'ui/overlays',
  Drawer: 'ui/overlays',
  Tooltip: 'ui/overlays',
  Popover: 'ui/overlays',

  Container: 'ui/layout',
  Grid: 'ui/layout',
  Stack: 'ui/layout',
  Divider: 'ui/layout',

  Tabs: 'ui/navigation',
  Breadcrumbs: 'ui/navigation',
  Pagination: 'ui/navigation',

  // ============================================================================
  // UX Utilities
  // ============================================================================
  LoadingProvider: 'ux',
  useLoading: 'ux',
  useLoadingState: 'ux',
  LoadingIndicator: 'ux',
  ProgressiveLoader: 'ux',

  SkeletonFactory: 'ux',
  getSkeletonFactory: 'ux',
  createTextSkeleton: 'ux',
  createCardSkeleton: 'ux',

  OptimisticUpdateManager: 'ux',
  OptimisticListManager: 'ux',
  createOptimisticManager: 'ux',
  applyOptimistic: 'ux',

  ErrorRecovery: 'ux',
  OfflineRecovery: 'ux',
  DegradedState: 'ux',

  announce: 'ux',
  announceAssertive: 'ux',
  announceRouteChange: 'ux',
  getFocusableElements: 'ux',
  createFocusTrap: 'ux',
  prefersReducedMotion: 'ux',

  ResponsiveManager: 'ux',
  getResponsiveManager: 'ux',

  AnimationOrchestrator: 'ux',
  getAnimationOrchestrator: 'ux',
  animate: 'ux',

  initUXSystem: 'ux',

  // ============================================================================
  // Utils
  // ============================================================================
  logger: 'utils',
  configureLogger: 'utils',
  logPerformance: 'utils',

  parseDate: 'utils',
  formatDate: 'utils',
  formatTime: 'utils',
  formatDateTime: 'utils',
  formatRelative: 'utils',
  formatDuration: 'utils',

  isDefined: 'utils',
  isNullish: 'utils',
  isString: 'utils',
  isNumber: 'utils',
  isBoolean: 'utils',
  isFunction: 'utils',
  isObject: 'utils',
  isArray: 'utils',
  isDate: 'utils',
  isPromise: 'utils',
  isError: 'utils',

  debounce: 'utils',
  throttle: 'utils',
  sleep: 'utils',

  EventEmitter: 'utils',
  createEventEmitter: 'utils',
  globalEventBus: 'utils',

  StorageManager: 'utils',
  localStorageManager: 'utils',
  sessionStorageManager: 'utils',

  NetworkMonitor: 'utils',
  networkMonitor: 'utils',

  ResourcePool: 'utils',
  LRUCache: 'utils',
  MemoryMonitor: 'utils',
  memoryManager: 'utils',

  withRetry: 'utils',
  RetryPolicy: 'utils',
  CircuitBreaker: 'utils',
  withTimeout: 'utils',

  AnalyticsManager: 'utils',
  analytics: 'utils',
  trackEvent: 'utils',
  trackPageView: 'utils',

  // Type utilities
  DeepPartial: 'utils',
  DeepRequired: 'utils',
  DeepReadonly: 'utils',
  Nullable: 'utils',
  Maybe: 'utils',
  Result: 'utils',

  // ============================================================================
  // Security
  // ============================================================================
  SecurityProvider: 'security',
  useSecurityContext: 'security',
  useSecureStorage: 'security',
  CSPManager: 'security',
  generateNonce: 'security',
  useCSPNonce: 'security',
  CSRFProtection: 'security',
  useCSRFToken: 'security',
  sanitizeHTML: 'security',
  encodeHTML: 'security',
  useSanitizedContent: 'security',
  SecureStorage: 'security',

  // ============================================================================
  // Hydration
  // ============================================================================
  HydrationProvider: 'hydration',
  HydrationBoundary: 'hydration',
  LazyHydration: 'hydration',
  useHydration: 'hydration',
  useHydrationStatus: 'hydration',
  useIsHydrated: 'hydration',
  HydrationScheduler: 'hydration',
  getHydrationScheduler: 'hydration',
  initHydrationSystem: 'hydration',

  // ============================================================================
  // Theme
  // ============================================================================
  ThemeProvider: 'theme',
  Theme: 'theme',

  // ============================================================================
  // Config
  // ============================================================================
  ConfigProvider: 'config',

  // ============================================================================
  // Feature
  // ============================================================================
  FeatureRegistry: 'feature',

  // ============================================================================
  // Realtime
  // ============================================================================
  RealtimeProvider: 'realtime',
  useRealtime: 'realtime',

  // ============================================================================
  // Data
  // ============================================================================
  DataProvider: 'data',

  // ============================================================================
  // State
  // ============================================================================
  StateProvider: 'state',
};

/**
 * Imports that are allowed from main index (no migration needed)
 */
const ALLOWED_MAIN_INDEX_IMPORTS = new Set([
  'AppConfig',
  'initializeApp',
  'AuthProvider',
  'useAuth',
  'User',
  'AuthState',
  'FeatureFlagProvider',
  'useFeatureFlag',
  'FlagGate',
  'FeatureFlagConfig',
  'ErrorBoundary',
  'GlobalErrorBoundary',
  'ErrorBoundaryProps',
  'PerformanceProvider',
  'initPerformanceMonitoring',
  'createQueryKeyFactory',
  'ThemeProvider',
  'useTheme',
  'Theme',
  'Role',
  'Permission',
  'AuthTokens',
  'AppError',
  'ErrorSeverity',
  'ErrorCategory',
  'VitalMetricName',
  'PerformanceRating',
  'PerformanceBudget',
  'DeepPartial',
  'DeepRequired',
  'DeepReadonly',
  'Nullable',
  'Maybe',
  'Result',
]);

export default function transformer(file: FileInfo, api: API, _options: Options): string | null {
  const j = api.jscodeshift;
  const root = j(file.source);
  const { quote } = api.jscodeshiftOptions;

  let hasModifications = false;

  // Find all imports from '@/lib'
  root
    .find(j.ImportDeclaration)
    .filter((path) => path.node.source.value === '@/lib')
    .forEach((path) => {
      const specifiers = path.node.specifiers || [];
      if (specifiers.length === 0) return;

      // Group specifiers by target module
      const moduleGroups = new Map<string, typeof specifiers>();
      const skippedSpecifiers: typeof specifiers = [];

      specifiers.forEach((spec) => {
        if (spec.type === 'ImportSpecifier') {
          const importedName = spec.imported.name;

          // Skip if allowed from main index
          if (ALLOWED_MAIN_INDEX_IMPORTS.has(importedName)) {
            skippedSpecifiers.push(spec);
            return;
          }

          const targetModule = EXPORT_TO_MODULE[importedName];

          if (targetModule) {
            if (!moduleGroups.has(targetModule)) {
              moduleGroups.set(targetModule, []);
            }
            moduleGroups.get(targetModule)!.push(spec);
          } else {
            // Unknown import - keep in main index
            skippedSpecifiers.push(spec);
            console.warn(
              `⚠️  Unknown export '${importedName}' in ${file.path}. Keeping in main index.`
            );
          }
        } else {
          // Namespace or default imports - keep as is
          skippedSpecifiers.push(spec);
        }
      });

      if (moduleGroups.size === 0) {
        // No changes needed
        return;
      }

      hasModifications = true;

      // Create new import declarations for each module
      const newImports: unknown[] = [];

      moduleGroups.forEach((specs, module) => {
        newImports.push(
          j.importDeclaration(specs, j.literal(`@/lib/${module}`), 'value')
        );
      });

      // If there are skipped specifiers, keep the original import with only those
      if (skippedSpecifiers.length > 0) {
        newImports.unshift(
          j.importDeclaration(skippedSpecifiers, j.literal('@/lib'), 'value')
        );
      }

      // Replace the old import with new imports
      j(path).replaceWith(newImports);
    });

  if (!hasModifications) {
    return null; // No changes
  }

  return root.toSource({ quote: quote || 'single' });
}
