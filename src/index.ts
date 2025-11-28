/**
 * @defendr/enzyme - Enterprise React Framework
 *
 * A powerful React framework for building enterprise applications
 * with advanced routing, state management, and performance optimizations
 *
 * Note: To avoid export name conflicts, import specific modules directly:
 * - import { ... } from '@defendr/enzyme/lib/api'
 * - import { ... } from '@defendr/enzyme/lib/auth'
 * - etc.
 */

// =============================================================================
// Core Library (Primary exports)
// =============================================================================
export * from './lib';

// =============================================================================
// Direct Module Re-exports (import from specific paths to avoid conflicts)
// =============================================================================

// API & Data Fetching - use './lib/api' for full API exports
export { apiClient, ApiClient } from './lib/api';
export type { ApiClientConfig, ApiResponse, ApiError } from './lib/api';

// Authentication & Security - use './lib/auth' for full auth exports
export { AuthProvider, useAuth, authService } from './lib/auth';
export type { User, Role, Permission, AuthContextValue } from './lib/auth';

// State Management - use './lib/state' for full state exports
export { useStore, getStoreState, resetStore } from './lib/state';

// Routing & Navigation - use './lib/routing' for full routing exports
export { routes, buildPath, createRouter, useRouteNavigate } from './lib/routing';

// Feature Flags - use './lib/flags' for full flags exports
export { useFeatureFlag, FeatureFlagProvider } from './lib/flags';

// Configuration - use './lib/config' for full config exports
export { useConfig, ConfigProvider } from './lib/config';

// Contexts - use './lib/contexts' for full context exports
export { ThemeContext, AuthContext } from './lib/contexts';

// =============================================================================
// Module Namespaces (access full modules via namespace)
// =============================================================================

export * as api from './lib/api';
export * as queries from './lib/queries';
export * as services from './lib/services';
export * as auth from './lib/auth';
export * as security from './lib/security';
export * as state from './lib/state';
export * as contexts from './lib/contexts';
export * as routing from './lib/routing';
export * as ui from './lib/ui';
export * as theme from './lib/theme';
export * as performance from './lib/performance';
export * as hydration from './lib/hydration';
export * as realtime from './lib/realtime';
export * as streaming from './lib/streaming';
export * as flags from './lib/flags';
export * as config from './lib/config';
export * as vdom from './lib/vdom';
export * as ux from './lib/ux';
export * as utils from './lib/utils';
export * as shared from './lib/shared';
export * as data from './lib/data';
export * as monitoring from './lib/monitoring';
export * as coordination from './lib/coordination';

// =============================================================================
// Type Re-exports
// =============================================================================
// Note: Types are included via the namespace exports above.
// For specific types, import from the module directly:
// - import type { ApiResponse } from '@defendr/enzyme/lib/api'
// - import type { User, Role } from '@defendr/enzyme/lib/auth'
