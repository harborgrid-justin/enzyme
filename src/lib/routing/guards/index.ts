/**
 * @file Route Guards Module Exports
 * @description Unified exports for the route guards system including authentication,
 * authorization, feature flags, and composite guards.
 *
 * @module @/lib/routing/guards
 *
 * This module provides enterprise-grade route protection patterns inspired by:
 * - Angular Route Guards (canActivate, canDeactivate)
 * - Next.js Middleware
 * - Vue Router Navigation Guards
 *
 * @example
 * ```typescript
 * import {
 *   createAuthGuard,
 *   createRoleGuard,
 *   createPermissionGuard,
 *   createFeatureGuard,
 *   allGuards,
 *   GuardResolver,
 * } from '@/lib/routing/guards';
 *
 * // Create individual guards
 * const authGuard = createAuthGuard({ loginPath: '/login' });
 * const adminGuard = createRoleGuard({ requiredRoles: ['admin'] });
 *
 * // Combine guards
 * const adminAreaGuard = allGuards([authGuard, adminGuard]);
 *
 * // Use resolver for navigation
 * const resolver = new GuardResolver();
 * resolver.register(adminAreaGuard, { routes: ['/admin/**'] });
 * ```
 */

// =============================================================================
// Base Route Guard
// =============================================================================

export {
  // Classes
  BaseRouteGuard,
  GuardResult,

  // Factory functions
  createGuard,
  createGuardContext,

  // Utility functions
  mergeGuardResults,
  allResultsAllow,
  getFirstRedirect,
  getDenialReasons,

  // Type guards
  isGuardResult,
  isRouteGuard,
  isGuardContext,

  // Types
  type GuardTiming,
  type GuardResultType,
  type GuardResultObject,
  type RedirectOptions,
  type GuardContext,
  type GuardUser,
  type GuardFunction,
  type GuardConfig,
  type RouteGuard,
  type GuardExecutionResult,
} from './route-guard';

// =============================================================================
// Authentication Guard
// =============================================================================

export {
  // Classes
  AuthGuard,

  // Factory functions
  createAuthGuard,
  createSimpleAuthGuard,
  createTokenAuthGuard,

  // Utility functions
  buildReturnUrl,
  parseReturnUrl,
  pathRequiresAuth,

  // Type guards
  isAuthGuard,
  isAuthState,

  // Constants
  DEFAULT_AUTH_CONFIG,

  // Types
  type AuthGuardConfig,
  type AuthState,
} from './auth-guard';

// =============================================================================
// Role-Based Guard
// =============================================================================

export {
  // Classes
  RoleGuard,

  // Factory functions
  createRoleGuard,
  requireRole,
  requireAnyRole,
  requireAllRoles,
  excludeRoles,
  createAdminGuard,

  // Utility functions
  hasRole,
  hasAnyRole,
  hasAllRoles,
  getMissingRoles,

  // Type guards
  isRoleGuard,
  isRoleCheckResult,

  // Constants
  DEFAULT_ROLE_CONFIG,

  // Types
  type RoleMatchStrategy,
  type RoleGuardConfig,
  type RoleCheckResult,
} from './role-guard';

// =============================================================================
// Permission-Based Guard
// =============================================================================

export {
  // Classes
  PermissionGuard,

  // Factory functions
  createPermissionGuard,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireResourcePermission,

  // Utility functions
  parsePermission,
  buildPermission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getMissingPermissions,

  // Type guards
  isPermissionGuard,
  isPermissionCheckResult,
  isStructuredPermission,

  // Constants
  DEFAULT_PERMISSION_CONFIG,
  PermissionActions,

  // Types
  type PermissionMatchStrategy,
  type Permission,
  type StructuredPermission,
  type PermissionGuardConfig,
  type PermissionCheckResult,
} from './permission-guard';

// =============================================================================
// Feature Flag Guard
// =============================================================================

export {
  // Classes
  FeatureGuard,

  // Factory functions
  createFeatureGuard,
  requireFeature,
  requireAnyFeature,
  requireAllFeatures,
  deprecatedFeature,
  betaFeature,

  // Provider factories
  createStaticFlagProvider,
  createLocalStorageFlagProvider,
  createUrlFlagProvider,
  combineFlagProviders,

  // Type guards
  isFeatureGuard,
  isFeatureFlagCheckResult,

  // Constants
  DEFAULT_FEATURE_CONFIG,

  // Types
  type FeatureFlagMatchStrategy,
  type FeatureFlagState,
  type FeatureFlagProvider,
  type FeatureGuardConfig,
  type FeatureFlagCheckResult,
} from './feature-guard';

// =============================================================================
// Composite Guard
// =============================================================================

export {
  // Classes
  CompositeGuard,

  // Factory functions
  createCompositeGuard,
  allGuards,
  anyGuard,
  sequentialGuards,
  parallelGuards,
  combineGuards,

  // Type guards
  isCompositeGuard,
  isCompositeExecutionResult,

  // Constants
  DEFAULT_COMPOSITE_CONFIG,

  // Types
  type CompositeStrategy,
  type CompositeGuardConfig,
  type CompositeExecutionResult,
} from './composite-guard';

// =============================================================================
// Guard Resolver
// =============================================================================

export {
  // Classes
  GuardResolver,

  // Factory functions
  createGuardResolver,

  // Singleton access
  getGuardResolver,
  initGuardResolver,
  resetGuardResolver,

  // Type guards
  isGuardResolutionResult,
  isNavigationIntent,

  // Constants
  DEFAULT_RESOLVER_CONFIG,

  // Types
  type GuardResolverConfig,
  type GuardRegistrationOptions,
  type GuardResolutionResult,
  type RegisteredGuard,
  type NavigationIntent,
  type GuardResolverState,
} from './guard-resolver';
