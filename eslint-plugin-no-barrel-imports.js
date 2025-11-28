/**
 * ESLint Plugin: No Barrel Imports
 *
 * Prevents importing from the main barrel export (@/lib) for performance.
 * Encourages submodule imports for better tree-shaking.
 *
 * @see https://github.com/harborgrid/harbor/docs/BARREL_EXPORT_MIGRATION.md
 */

/**
 * Map of exports to their correct submodules
 */
const EXPORT_TO_MODULE = {
  // System
  initializeApp: 'system',
  AppConfig: 'system',

  // Auth
  useAuth: 'auth',
  AuthProvider: 'auth',
  RequireAuth: 'auth',
  RequireRole: 'auth',
  RequirePermission: 'auth',
  RBACProvider: 'auth',
  useRBAC: 'auth',
  usePermissions: 'auth',
  useRoles: 'auth',
  ADProvider: 'auth',
  useActiveDirectory: 'auth',
  authService: 'auth',

  // Flags
  useFeatureFlag: 'flags',
  useFeatureFlags: 'flags',
  FlagGate: 'flags',
  FeatureFlagProvider: 'flags',
  flagKeys: 'flags',

  // Performance
  initPerformanceMonitoring: 'performance',
  usePerformanceMonitor: 'performance',
  PerformanceProvider: 'performance',
  PerformanceObservatory: 'performance',
  useLongTaskDetector: 'performance',
  useMemoryPressure: 'performance',
  useNetworkQuality: 'performance',
  usePerformanceBudget: 'performance',
  VitalsCollector: 'performance',
  PerformanceMonitor: 'performance',

  // Monitoring
  ErrorBoundary: 'monitoring',
  GlobalErrorBoundary: 'monitoring',
  QueryErrorBoundary: 'monitoring',
  useErrorBoundary: 'monitoring',
  ErrorReporter: 'monitoring',
  reportError: 'monitoring',
  addBreadcrumb: 'monitoring',

  // Hooks
  useIsMounted: 'hooks',
  useLatestRef: 'hooks',
  useLatestCallback: 'hooks',
  useTheme: 'hooks',
  useSystemThemePreference: 'hooks',
  usePrefetchRoute: 'hooks',
  useNetworkStatus: 'hooks',
  useOnlineStatus: 'hooks',
  usePageView: 'hooks',
  useTrackEvent: 'hooks',
  useDebouncedValue: 'hooks',
  useThrottledValue: 'hooks',
  useDisposable: 'hooks',

  // Queries
  createQueryKeyFactory: 'queries',

  // Routing
  RouteRegistry: 'routing',

  // Services
  serviceLayer: 'services',
  ServiceLayerFacade: 'services',
  RequestQueue: 'services',

  // UI Components
  Spinner: 'ui/feedback',
  Toast: 'ui/feedback',
  ToastProvider: 'ui/feedback',
  Alert: 'ui/feedback',
  Progress: 'ui/feedback',
  Button: 'ui/inputs',
  Input: 'ui/inputs',
  Select: 'ui/inputs',
  Modal: 'ui/overlays',
  Drawer: 'ui/overlays',
  Tooltip: 'ui/overlays',

  // UX
  LoadingProvider: 'ux',
  useLoading: 'ux',
  LoadingIndicator: 'ux',
  SkeletonFactory: 'ux',
  OptimisticUpdateManager: 'ux',
  announce: 'ux',
  AnimationOrchestrator: 'ux',
  ResponsiveManager: 'ux',

  // Utils
  logger: 'utils',
  configureLogger: 'utils',
  isDefined: 'utils',
  isString: 'utils',
  isNumber: 'utils',
  parseDate: 'utils',
  formatDate: 'utils',
  debounce: 'utils',
  throttle: 'utils',
  EventEmitter: 'utils',
  StorageManager: 'utils',
  NetworkMonitor: 'utils',
  LRUCache: 'utils',
  MemoryMonitor: 'utils',

  // Security
  SecurityProvider: 'security',
  useSecureStorage: 'security',
  CSRFProtection: 'security',
  sanitizeHTML: 'security',
  encodeHTML: 'security',
  CSPManager: 'security',

  // Hydration
  HydrationProvider: 'hydration',
  HydrationBoundary: 'hydration',
  useHydration: 'hydration',
  useHydrationStatus: 'hydration',

  // Theme
  ThemeProvider: 'theme',

  // Config
  ConfigProvider: 'config',

  // Feature
  FeatureRegistry: 'feature',
};

/**
 * Allowed imports from main index (kept for backward compatibility)
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
  // Types (zero runtime cost)
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

const noBarrelImportsRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow imports from main barrel export for performance',
      category: 'Best Practices',
      recommended: true,
      url: 'https://github.com/harborgrid/harbor/docs/BARREL_EXPORT_MIGRATION.md',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          severity: {
            type: 'string',
            enum: ['warn', 'error'],
            default: 'warn',
          },
          allowTypes: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noBarrelImport:
        "Avoid importing '{{name}}' from '@/lib' (barrel export). Use '@/lib/{{module}}' instead for better tree-shaking. See BARREL_EXPORT_MIGRATION.md",
      noUnknownBarrelImport:
        "Avoid importing from '@/lib' (barrel export). Import from specific submodules like '@/lib/auth', '@/lib/flags', etc. See BARREL_EXPORT_MIGRATION.md",
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const allowTypes = options.allowTypes !== false;

    return {
      ImportDeclaration(node) {
        const source = node.source.value;

        // Only check imports from '@/lib' (not '@/lib/...')
        if (source !== '@/lib') {
          return;
        }

        // Check each imported item
        for (const specifier of node.specifiers) {
          // Skip namespace imports (import * as Lib from '@/lib')
          if (specifier.type === 'ImportNamespaceSpecifier') {
            continue;
          }

          // Skip default imports (import Lib from '@/lib')
          if (specifier.type === 'ImportDefaultSpecifier') {
            continue;
          }

          // Handle named imports
          if (specifier.type === 'ImportSpecifier') {
            const importedName = specifier.imported.name;

            // Allow if in allowed list
            if (ALLOWED_MAIN_INDEX_IMPORTS.has(importedName)) {
              continue;
            }

            // Allow type-only imports if configured
            if (allowTypes && specifier.importKind === 'type') {
              continue;
            }

            // Find the correct submodule
            const targetModule = EXPORT_TO_MODULE[importedName];

            if (targetModule) {
              context.report({
                node: specifier,
                messageId: 'noBarrelImport',
                data: {
                  name: importedName,
                  module: targetModule,
                },
                fix(fixer) {
                  // Auto-fix: Create new import from submodule
                  const isTypeImport = specifier.importKind === 'type';
                  const typeKeyword = isTypeImport ? 'type ' : '';
                  const newImport = `import { ${typeKeyword}${importedName} } from '@/lib/${targetModule}';\n`;

                  // Insert new import after the current import
                  return fixer.insertTextAfter(node, newImport);
                },
              });
            } else {
              // Unknown import - warn anyway
              context.report({
                node: specifier,
                messageId: 'noUnknownBarrelImport',
              });
            }
          }
        }
      },
    };
  },
};

export default {
  rules: {
    'no-barrel-imports': noBarrelImportsRule,
  },
};
