/**
 * RBAC React Context
 *
 * React context provider for RBAC functionality.
 * Integrates with the auth system to provide permission checking.
 *
 * @module auth/rbac/rbac-context
 */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useFeatureFlag } from '@/lib/flags';
import type {
  RBACConfig,
  RBACState,
  RBACContextValue,
  RoleDefinition,
  Permission,
  PermissionAction,
  AccessRequest,
  EvaluationResult,
} from './types';
import type { User } from '../types';
import { createRBACEngine } from './rbac-engine';

// =============================================================================
// Context
// =============================================================================

/**
 * RBAC Context for React applications.
 */
export const RBACContext = createContext<RBACContextValue | null>(null);

// =============================================================================
// Types
// =============================================================================

/**
 * RBAC Provider props.
 */
export interface RBACProviderProps {
  /** RBAC configuration */
  config: RBACConfig;
  /** Child components */
  children: ReactNode;
  /** Current user */
  user?: User | null;
  /** User's assigned roles */
  userRoles?: string[];
  /** User's direct permissions */
  userPermissions?: Permission[];
  /** Callback to fetch permissions from server */
  fetchPermissions?: () => Promise<{
    roles: string[];
    permissions: Permission[];
  }>;
  /** Loading component */
  loadingComponent?: ReactNode;
  /** Callback when permission check occurs */
  onPermissionCheck?: (
    permission: Permission,
    granted: boolean
  ) => void;
  /** Callback when access check occurs */
  onAccessCheck?: (
    resource: string,
    action: PermissionAction,
    granted: boolean
  ) => void;
}

// =============================================================================
// Provider Component
// =============================================================================

/**
 * RBAC Provider Component.
 *
 * Provides RBAC functionality to child components through React context.
 *
 * @example
 * ```tsx
 * import { RBACProvider } from '@/lib/auth/rbac';
 *
 * const rbacConfig = {
 *   roles: [
 *     { id: 'admin', name: 'Admin', permissions: ['*'], priority: 100 },
 *     { id: 'user', name: 'User', permissions: ['read:*'], priority: 10 },
 *   ],
 *   defaultDecision: 'deny',
 *   enableCaching: true,
 * };
 *
 * function App() {
 *   const { user } = useAuth();
 *
 *   return (
 *     <RBACProvider
 *       config={rbacConfig}
 *       user={user}
 *       userRoles={user?.roles}
 *     >
 *       <MyApplication />
 *     </RBACProvider>
 *   );
 * }
 * ```
 */
export function RBACProvider({
  config,
  children,
  user,
  userRoles = [],
  userPermissions = [],
  fetchPermissions,
  loadingComponent,
  onPermissionCheck,
  onAccessCheck,
}: RBACProviderProps) {
  // Check feature flag
  const isRBACEnabled = useFeatureFlag(config.featureFlag ?? 'rbac');

  // State
  const [state, setState] = useState<RBACState>({
    initialized: false,
    loading: true,
    userRoles: [],
    userPermissions: [],
    evaluationCache: new Map(),
    lastRefresh: null,
    error: null,
  });

  // Create RBAC engine
  const engine = useMemo(() => createRBACEngine(config), [config]);

  // ===========================================================================
  // Initialization
  // ===========================================================================

  useEffect(() => {
    if (!isRBACEnabled) {
      setState(prev => ({ ...prev, initialized: true, loading: false }));
      return;
    }

    const initialize = async () => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        let roles = userRoles;
        let permissions = userPermissions;

        // Fetch permissions from server if callback provided
        if (fetchPermissions) {
          const fetched = await fetchPermissions();
          roles = fetched.roles;
          permissions = fetched.permissions;
        }

        // Set user context on engine
        engine.setUserContext(roles, {
          id: user?.id,
          email: user?.email,
          ...user?.metadata,
        });

        setState(prev => ({
          ...prev,
          initialized: true,
          loading: false,
          userRoles: roles,
          userPermissions: permissions,
          lastRefresh: Date.now(),
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize RBAC',
        }));
      }
    };

    initialize();
  }, [isRBACEnabled, user, userRoles, userPermissions, fetchPermissions, engine]);

  // Update engine when roles change
  useEffect(() => {
    if (state.initialized && state.userRoles.length > 0) {
      engine.setUserContext(state.userRoles, {
        id: user?.id,
        email: user?.email,
        ...user?.metadata,
      });
    }
  }, [state.initialized, state.userRoles, user, engine]);

  // ===========================================================================
  // Permission Checking Methods
  // ===========================================================================

  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      if (!isRBACEnabled) return true;

      const granted = engine.hasPermission(permission);
      onPermissionCheck?.(permission, granted);

      return granted;
    },
    [isRBACEnabled, engine, onPermissionCheck]
  );

  const hasAnyPermission = useCallback(
    (permissions: Permission[]): boolean => {
      if (!isRBACEnabled) return true;
      return engine.hasAnyPermission(permissions);
    },
    [isRBACEnabled, engine]
  );

  const hasAllPermissions = useCallback(
    (permissions: Permission[]): boolean => {
      if (!isRBACEnabled) return true;
      return engine.hasAllPermissions(permissions);
    },
    [isRBACEnabled, engine]
  );

  // ===========================================================================
  // Role Checking Methods
  // ===========================================================================

  const hasRole = useCallback(
    (role: string): boolean => {
      if (!isRBACEnabled) return true;
      return engine.hasRole(role);
    },
    [isRBACEnabled, engine]
  );

  const hasAnyRole = useCallback(
    (roles: string[]): boolean => {
      if (!isRBACEnabled) return true;
      return engine.hasAnyRole(roles);
    },
    [isRBACEnabled, engine]
  );

  const hasAllRoles = useCallback(
    (roles: string[]): boolean => {
      if (!isRBACEnabled) return true;
      return engine.hasAllRoles(roles);
    },
    [isRBACEnabled, engine]
  );

  // ===========================================================================
  // Access Checking Methods
  // ===========================================================================

  const canAccess = useCallback(
    (resource: string, action: PermissionAction, resourceId?: string): boolean => {
      if (!isRBACEnabled) return true;

      const granted = resourceId
        ? engine.checkResourcePermission(resource, resourceId, action)
        : engine.canAccess(resource, action);

      onAccessCheck?.(resource, action, granted);

      return granted;
    },
    [isRBACEnabled, engine, onAccessCheck]
  );

  const evaluate = useCallback(
    (request: AccessRequest): EvaluationResult => {
      if (!isRBACEnabled) {
        return {
          allowed: true,
          decision: 'allow',
          reason: 'RBAC disabled',
          evaluatedAt: Date.now(),
        };
      }

      return engine.evaluate(request);
    },
    [isRBACEnabled, engine]
  );

  const checkResourcePermission = useCallback(
    (
      resourceType: string,
      resourceId: string,
      action: PermissionAction
    ): boolean => {
      if (!isRBACEnabled) return true;
      return engine.checkResourcePermission(resourceType, resourceId, action);
    },
    [isRBACEnabled, engine]
  );

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  const getEffectivePermissions = useCallback((): Permission[] => {
    return engine.getResolvedPermissions();
  }, [engine]);

  const getRoleDefinitions = useCallback((): RoleDefinition[] => {
    return state.userRoles
      .map(roleId => config.roles.find(r => r.id === roleId))
      .filter((r): r is RoleDefinition => r !== undefined);
  }, [state.userRoles, config.roles]);

  const refreshPermissions = useCallback(async (): Promise<void> => {
    if (!fetchPermissions) return;

    setState(prev => ({ ...prev, loading: true }));

    try {
      const { roles, permissions } = await fetchPermissions();

      engine.setUserContext(roles, {
        id: user?.id,
        email: user?.email,
        ...user?.metadata,
      });

      setState(prev => ({
        ...prev,
        loading: false,
        userRoles: roles,
        userPermissions: permissions,
        lastRefresh: Date.now(),
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh permissions',
      }));
    }
  }, [fetchPermissions, user, engine]);

  const clearCache = useCallback((): void => {
    engine.clearCache();
    setState(prev => ({
      ...prev,
      evaluationCache: new Map(),
    }));
  }, [engine]);

  // ===========================================================================
  // Context Value
  // ===========================================================================

  const contextValue: RBACContextValue = useMemo(
    () => ({
      ...state,
      config,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      hasRole,
      hasAnyRole,
      hasAllRoles,
      canAccess,
      evaluate,
      getEffectivePermissions,
      getRoleDefinitions,
      refreshPermissions,
      clearCache,
      checkResourcePermission,
    }),
    [
      state,
      config,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      hasRole,
      hasAnyRole,
      hasAllRoles,
      canAccess,
      evaluate,
      getEffectivePermissions,
      getRoleDefinitions,
      refreshPermissions,
      clearCache,
      checkResourcePermission,
    ]
  );

  // ===========================================================================
  // Render
  // ===========================================================================

  // Show loading during initialization
  if (state.loading && loadingComponent) {
    return <>{loadingComponent}</>;
  }

  // Feature flag disabled - render children without RBAC
  if (!isRBACEnabled) {
    return <>{children}</>;
  }

  return (
    <RBACContext.Provider value={contextValue}>
      {children}
    </RBACContext.Provider>
  );
}

// =============================================================================
// Export
// =============================================================================

export default RBACProvider;
