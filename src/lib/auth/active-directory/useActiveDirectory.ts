/**
 * Active Directory React Hook
 *
 * Provides a comprehensive React hook for AD authentication,
 * including login, logout, token management, and group membership.
 *
 * @module auth/active-directory/useActiveDirectory
 */

import { useContext, useCallback, useMemo } from 'react';
import { ADContext } from './ad-provider';
import type {
  ADUser,
  ADGroup,
  ADTokens,
  ADAuthError,
  ADUserAttributes,
  TokenAcquisitionRequest,
  ADProviderType,
} from './types';
import type { Role, Permission } from '../types';

// =============================================================================
// Types
// =============================================================================

/**
 * Return type for the useActiveDirectory hook.
 */
export interface UseActiveDirectoryReturn {
  // State
  /** Current authenticated AD user */
  user: ADUser | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether authentication is in progress */
  isAuthenticating: boolean;
  /** Whether token refresh is in progress */
  isRefreshing: boolean;
  /** Current authentication error */
  error: ADAuthError | null;
  /** Current AD provider type */
  provider: ADProviderType | null;
  /** Current tokens (use with caution) */
  tokens: ADTokens | null;
  /** Whether an SSO session exists */
  hasSsoSession: boolean;

  // Actions
  /** Initialize AD authentication */
  initialize: () => Promise<void>;
  /** Trigger interactive login */
  login: (options?: TokenAcquisitionRequest) => Promise<void>;
  /** Perform silent SSO login */
  loginSilent: (options?: TokenAcquisitionRequest) => Promise<void>;
  /** Logout and clear session */
  logout: () => Promise<void>;
  /** Acquire token for specific scopes */
  acquireToken: (request: TokenAcquisitionRequest) => Promise<ADTokens>;
  /** Refresh current tokens */
  refreshTokens: () => Promise<void>;
  /** Clear authentication error */
  clearError: () => void;
  /** Force re-authentication */
  forceReauth: () => Promise<void>;

  // Group & Permission Helpers
  /** User's AD groups */
  groups: ADGroup[];
  /** Check if user belongs to a group */
  isInGroup: (groupId: string) => boolean;
  /** Check if user belongs to any of the groups */
  isInAnyGroup: (groupIds: string[]) => boolean;
  /** Check if user belongs to all groups */
  isInAllGroups: (groupIds: string[]) => boolean;
  /** Get user's mapped roles */
  roles: Role[];
  /** Check if user has a role */
  hasRole: (role: Role) => boolean;
  /** Check if user has any of the roles */
  hasAnyRole: (roles: Role[]) => boolean;
  /** Check if user has all roles */
  hasAllRoles: (roles: Role[]) => boolean;
  /** Get user's effective permissions */
  permissions: Permission[];
  /** Check if user has a permission */
  hasPermission: (permission: Permission) => boolean;
  /** Check if user has any of the permissions */
  hasAnyPermission: (permissions: Permission[]) => boolean;
  /** Check if user has all permissions */
  hasAllPermissions: (permissions: Permission[]) => boolean;

  // User Attribute Helpers
  /** Get AD attribute value */
  getAttribute: <K extends keyof ADUserAttributes>(key: K) => ADUserAttributes[K] | undefined;
  /** Check if user has specific attribute value */
  hasAttribute: (key: keyof ADUserAttributes, value: unknown) => boolean;
  /** Get user's UPN */
  upn: string | null;
  /** Get user's display name */
  displayName: string | null;
  /** Get user's department */
  department: string | null;
  /** Get user's job title */
  jobTitle: string | null;
  /** Whether user is a guest/external user */
  isGuest: boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * React hook for Active Directory authentication.
 *
 * Provides comprehensive AD authentication functionality including
 * login/logout, token management, group membership checking, and
 * attribute access.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     user,
 *     isAuthenticated,
 *     login,
 *     logout,
 *     isInGroup,
 *     hasPermission,
 *   } = useActiveDirectory();
 *
 *   if (!isAuthenticated) {
 *     return <button onClick={() => login()}>Sign in with Azure AD</button>;
 *   }
 *
 *   return (
 *     <div>
 *       <h1>Welcome, {user?.displayName}</h1>
 *       {isInGroup('sg-app-admins') && (
 *         <AdminPanel />
 *       )}
 *       {hasPermission('reports:view') && (
 *         <ReportsSection />
 *       )}
 *       <button onClick={logout}>Sign out</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @returns AD authentication state and methods
 * @throws Error if used outside of ADProvider
 */
export function useActiveDirectory(): UseActiveDirectoryReturn {
  const context = useContext(ADContext);

  if (!context) {
    throw new Error('useActiveDirectory must be used within an ADProvider');
  }

  // ===========================================================================
  // State Values
  // ===========================================================================

  const user = context.user;
  const isAuthenticated = context.isAuthenticated;
  const isAuthenticating = context.isAuthenticating;
  const isRefreshing = context.isRefreshing;
  const error = context.error;
  const provider = context.provider;
  const tokens = context.tokens;
  const hasSsoSession = context.hasSsoSession;
  const initialize = context.initialize;
  const login = context.login;
  const loginSilent = context.loginSilent;
  const logout = context.logout;
  const acquireToken = context.acquireToken;
  const refreshTokens = context.refreshTokens;
  const clearError = context.clearError;
  const forceReauth = context.forceReauth;
  const isInGroup = context.isInGroup;
  const hasAttribute = context.hasAttribute;
  const getMappedRoles = context.getMappedRoles;
  const getEffectivePermissions = context.getEffectivePermissions;

  // ===========================================================================
  // Group Helpers
  // ===========================================================================

  const groups = useMemo(() => user?.adGroups ?? [], [user]);

  const isInAnyGroup = useCallback(
    (groupIds: string[]) => {
      if (!user) return false;
      return groupIds.some(id => isInGroup(id));
    },
    [user, isInGroup]
  );

  const isInAllGroups = useCallback(
    (groupIds: string[]) => {
      if (!user) return false;
      return groupIds.every(id => isInGroup(id));
    },
    [user, isInGroup]
  );

  // ===========================================================================
  // Role Helpers
  // ===========================================================================

  const roles = useMemo(() => getMappedRoles(), [getMappedRoles]);

  const hasRole = useCallback(
    (role: Role) => roles.includes(role),
    [roles]
  );

  const hasAnyRole = useCallback(
    (checkRoles: Role[]) => checkRoles.some(role => roles.includes(role)),
    [roles]
  );

  const hasAllRoles = useCallback(
    (checkRoles: Role[]) => checkRoles.every(role => roles.includes(role)),
    [roles]
  );

  // ===========================================================================
  // Permission Helpers
  // ===========================================================================

  const permissions = useMemo(
    () => getEffectivePermissions(),
    [getEffectivePermissions]
  );

  const hasPermission = useCallback(
    (permission: Permission) => {
      // Support wildcard permissions
      if (permissions.includes('*')) return true;

      // Check exact match
      if (permissions.includes(permission)) return true;

      // Check wildcard patterns (e.g., 'admin:*' matches 'admin:users')
      const [category] = permission.split(':');
      return permissions.includes(`${category}:*`);
    },
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (checkPermissions: Permission[]) =>
      checkPermissions.some(p => hasPermission(p)),
    [hasPermission]
  );

  const hasAllPermissions = useCallback(
    (checkPermissions: Permission[]) =>
      checkPermissions.every(p => hasPermission(p)),
    [hasPermission]
  );

  // ===========================================================================
  // Attribute Helpers
  // ===========================================================================

  const getAttribute = useCallback(
    <K extends keyof ADUserAttributes>(key: K): ADUserAttributes[K] | undefined => {
      return user?.adAttributes[key];
    },
    [user]
  );

  const hasAttributeValue = useCallback(
    (key: keyof ADUserAttributes, value: unknown) => hasAttribute(key, value),
    [hasAttribute]
  );

  const upn = useMemo(() => user?.adAttributes.upn ?? null, [user]);
  const displayName = useMemo(
    () => user?.adAttributes.displayName ?? user?.displayName ?? null,
    [user]
  );
  const department = useMemo(
    () => user?.adAttributes.department ?? null,
    [user]
  );
  const jobTitle = useMemo(
    () => user?.adAttributes.jobTitle ?? null,
    [user]
  );
  const isGuest = useMemo(() => user?.isGuest ?? false, [user]);

  // ===========================================================================
  // Actions
  // ===========================================================================

  const handleRefreshTokens = useCallback(async () => {
    const result = await refreshTokens();
    if (!result.success && result.error) {
      throw result.error;
    }
  }, [refreshTokens]);

  // ===========================================================================
  // Return Value
  // ===========================================================================

  return {
    // State
    user,
    isAuthenticated,
    isAuthenticating,
    isRefreshing,
    error,
    provider,
    tokens,
    hasSsoSession,

    // Actions
    initialize,
    login,
    loginSilent,
    logout,
    acquireToken,
    refreshTokens: handleRefreshTokens,
    clearError,
    forceReauth,

    // Group helpers
    groups,
    isInGroup,
    isInAnyGroup,
    isInAllGroups,

    // Role helpers
    roles,
    hasRole,
    hasAnyRole,
    hasAllRoles,

    // Permission helpers
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Attribute helpers
    getAttribute,
    hasAttribute: hasAttributeValue,
    upn,
    displayName,
    department,
    jobTitle,
    isGuest,
  };
}

// =============================================================================
// Specialized Hooks
// =============================================================================

/**
 * Hook for checking AD group memberships.
 *
 * @example
 * ```tsx
 * function AdminPanel() {
 *   const { isInGroup, isInAnyGroup, groups } = useADGroups();
 *
 *   if (!isInAnyGroup(['sg-app-admins', 'sg-app-superusers'])) {
 *     return <AccessDenied />;
 *   }
 *
 *   return <div>Admin content...</div>;
 * }
 * ```
 */
export function useADGroups() {
  const { groups, isInGroup, isInAnyGroup, isInAllGroups } = useActiveDirectory();
  return { groups, isInGroup, isInAnyGroup, isInAllGroups };
}

/**
 * Hook for checking AD-based roles.
 *
 * @example
 * ```tsx
 * function ManagerDashboard() {
 *   const { hasRole, hasAnyRole, roles } = useADRoles();
 *
 *   if (!hasAnyRole(['admin', 'manager'])) {
 *     return <AccessDenied />;
 *   }
 *
 *   return <div>Manager dashboard...</div>;
 * }
 * ```
 */
export function useADRoles() {
  const { roles, hasRole, hasAnyRole, hasAllRoles } = useActiveDirectory();
  return { roles, hasRole, hasAnyRole, hasAllRoles };
}

/**
 * Hook for checking AD-based permissions.
 *
 * @example
 * ```tsx
 * function ReportsPage() {
 *   const { hasPermission, hasAllPermissions } = useADPermissions();
 *
 *   const canViewReports = hasPermission('reports:view');
 *   const canExportReports = hasPermission('reports:export');
 *
 *   return (
 *     <div>
 *       {canViewReports && <ReportViewer />}
 *       {canExportReports && <ExportButton />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useADPermissions() {
  const { permissions, hasPermission, hasAnyPermission, hasAllPermissions } =
    useActiveDirectory();
  return { permissions, hasPermission, hasAnyPermission, hasAllPermissions };
}

/**
 * Hook for accessing AD user attributes.
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const { getAttribute, upn, department, jobTitle } = useADAttributes();
 *
 *   const employeeId = getAttribute('employeeId');
 *
 *   return (
 *     <div>
 *       <p>UPN: {upn}</p>
 *       <p>Department: {department}</p>
 *       <p>Job Title: {jobTitle}</p>
 *       <p>Employee ID: {employeeId}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useADAttributes() {
  const {
    user,
    getAttribute,
    hasAttribute,
    upn,
    displayName,
    department,
    jobTitle,
    isGuest,
  } = useActiveDirectory();

  return {
    attributes: user?.adAttributes ?? null,
    getAttribute,
    hasAttribute,
    upn,
    displayName,
    department,
    jobTitle,
    isGuest,
  };
}

/**
 * Hook for AD authentication actions only.
 *
 * @example
 * ```tsx
 * function LoginButton() {
 *   const { login, isAuthenticating, error } = useADAuth();
 *
 *   return (
 *     <button onClick={() => login()} disabled={isAuthenticating}>
 *       {isAuthenticating ? 'Signing in...' : 'Sign in'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useADAuth() {
  const {
    isAuthenticated,
    isAuthenticating,
    error,
    initialize,
    login,
    loginSilent,
    logout,
    acquireToken,
    refreshTokens,
    clearError,
    forceReauth,
  } = useActiveDirectory();

  return {
    isAuthenticated,
    isAuthenticating,
    error,
    initialize,
    login,
    loginSilent,
    logout,
    acquireToken,
    refreshTokens,
    clearError,
    forceReauth,
  };
}

/**
 * Hook for accessing raw AD tokens (use with caution).
 *
 * @example
 * ```tsx
 * function ApiClient() {
 *   const { accessToken, isExpired, refreshTokens } = useADTokens();
 *
 *   const makeApiCall = async () => {
 *     if (isExpired) {
 *       await refreshTokens();
 *     }
 *
 *     const response = await fetch('/api/data', {
 *       headers: { Authorization: `Bearer ${accessToken}` },
 *     });
 *     // ...
 *   };
 *
 *   return <button onClick={makeApiCall}>Load Data</button>;
 * }
 * ```
 */
export function useADTokens() {
  const { tokens, isRefreshing, refreshTokens } = useActiveDirectory();

  const accessToken = tokens?.accessToken ?? null;
  const idToken = tokens?.idToken ?? null;
  const expiresAt = tokens?.expiresAt ?? null;
  const scopes = tokens?.scopes ?? [];

  const isExpired = useMemo(() => {
    if (!expiresAt) return true;
    return Date.now() >= expiresAt - 300000; // 5 minute buffer
  }, [expiresAt]);

  const timeUntilExpiry = useMemo(() => {
    if (!expiresAt) return 0;
    return Math.max(0, expiresAt - Date.now());
  }, [expiresAt]);

  return {
    accessToken,
    idToken,
    expiresAt,
    scopes,
    isExpired,
    timeUntilExpiry,
  isRefreshing,
  refreshTokens,
};
}