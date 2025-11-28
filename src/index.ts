/**
 * @defendr/enzyme - Enterprise React Framework
 *
 * A comprehensive React framework for building enterprise applications with:
 * - Advanced type-safe routing
 * - Zustand + React Query state management
 * - RBAC authentication & authorization
 * - Feature flags and A/B testing
 * - Performance monitoring (Core Web Vitals)
 * - Real-time data synchronization
 *
 * ## Import Pattern (Recommended)
 *
 * For optimal tree-shaking and bundle size, import from submodules:
 * ```typescript
 * import { useAuth, AuthProvider } from '@defendr/enzyme/auth';
 * import { useFeatureFlag } from '@defendr/enzyme/flags';
 * import { AdaptiveLayout } from '@defendr/enzyme/layouts';
 * ```
 *
 * @module @defendr/enzyme
 * @version 1.0.0
 * @license MIT
 */

// =============================================================================
// Core Library (Essential exports only - use submodules for tree-shaking)
// =============================================================================
export {
  // Auth essentials
  AuthProvider,
  useAuth,
  // Feature flags essentials
  FeatureFlagProvider,
  useFeatureFlag,
  FlagGate,
  // Monitoring essentials
  ErrorBoundary,
  GlobalErrorBoundary,
  // Performance essentials
  PerformanceProvider,
  initPerformanceMonitoring,
  // Query utilities
  createQueryKeyFactory,
} from './lib';

// Essential type exports
export type {
  User,
  AuthState,
  Role,
  Permission,
  AuthTokens,
  AppError,
  ErrorSeverity,
  ErrorCategory,
  VitalMetricName,
  PerformanceRating,
  PerformanceBudget,
  DeepRequired,
  DeepReadonly,
  Nullable,
  Maybe,
  Result,
} from './lib';

// =============================================================================
// Additional Direct Exports (non-duplicated)
// =============================================================================

// API & Data Fetching
export { apiClient, ApiClient } from './lib/api';
export type { ApiClientConfig, ApiResponse, ApiError } from './lib/api';

// Auth service
export { authService } from './lib/auth';
export type { AuthContextValue } from './lib/auth';

// State Management
export { useStore, getStoreState, resetStore } from './lib/state';

// Routing & Navigation
export { routes, buildPath, createRouter, useRouteNavigate } from './lib/routing';

// Configuration
export { useConfig, ConfigProvider } from './lib/config';

// Contexts
export { ThemeContext, AuthContext } from './lib/contexts';

// =============================================================================
// Module Namespaces (access full modules via namespace)
// =============================================================================

// Core modules
export * as api from './lib/api';
export * as auth from './lib/auth';
export * as config from './lib/config';
export * as contexts from './lib/contexts';
export * as coordination from './lib/coordination';
export * as core from './lib/core';
export * as data from './lib/data';
export * as feature from './lib/feature';
export * as flags from './lib/flags';
export * as hooks from './lib/hooks';
export * as hydration from './lib/hydration';
export * as layouts from './lib/layouts';
export * as monitoring from './lib/monitoring';
export * as performance from './lib/performance';
export * as queries from './lib/queries';
export * as realtime from './lib/realtime';
export * as routing from './lib/routing';
export * as security from './lib/security';
export * as services from './lib/services';
export * as shared from './lib/shared';
export * as state from './lib/state';
export * as streaming from './lib/streaming';
export * as system from './lib/system';
export * as theme from './lib/theme';
export * as ui from './lib/ui';
export * as utils from './lib/utils';
export * as ux from './lib/ux';
export * as vdom from './lib/vdom';

// =============================================================================
// Type Re-exports
// =============================================================================
// Note: Types are included via the namespace exports above.
// For specific types, import from the module directly:
// - import type { ApiResponse } from '@defendr/enzyme/lib/api'
// - import type { User, Role } from '@defendr/enzyme/lib/auth'
