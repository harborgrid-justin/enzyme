/**
 * Authentication Module
 *
 * Provides comprehensive authentication, authorization, and identity management:
 * - Core auth context, hooks, and services
 * - Active Directory integration (Azure AD, ADFS, on-prem)
 * - Role-Based Access Control (RBAC)
 *
 * @module auth
 *
 * @example Basic Authentication
 * ```tsx
 * import { AuthProvider, useAuth, authService } from '@/lib/auth';
 *
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <MyApp />
 *     </AuthProvider>
 *   );
 * }
 *
 * function LoginButton() {
 *   const { login, isAuthenticated, user } = useAuth();
 *
 *   if (isAuthenticated) {
 *     return <span>Welcome, {user.name}</span>;
 *   }
 *
 *   return <button onClick={() => login({ email, password })}>Login</button>;
 * }
 * ```
 *
 * @example Active Directory Integration
 * ```tsx
 * import { ADProvider, useActiveDirectory } from '@/lib/auth/active-directory';
 *
 * function App() {
 *   return (
 *     <ADProvider config={{
 *       providerType: 'azure-ad',
 *       azure: { clientId: 'xxx', tenantId: 'xxx' }
 *     }}>
 *       <MyApp />
 *     </ADProvider>
 *   );
 * }
 * ```
 *
 * @example RBAC Access Control
 * ```tsx
 * import { RBACProvider, useRBAC } from '@/lib/auth/rbac';
 *
 * function SecureComponent() {
 *   const { can, canAny, hasRole } = useRBAC();
 *
 *   if (hasRole('admin')) {
 *     return <AdminPanel />;
 *   }
 *
 *   if (can('read', 'documents')) {
 *     return <DocumentViewer />;
 *   }
 *
 *   return <AccessDenied />;
 * }
 * ```
 */

// =============================================================================
// Core Authentication
// =============================================================================

export { AuthProvider, useAuthContext } from './AuthProvider';
export { useAuth, useHasRole, useHasPermission } from './useAuth';
export { authService } from './authService';
export * from './authGuards';
export { routeMetadata, getRouteAuthConfig, canAccessRoute } from './routeMetadata';
export type {
  User,
  Role,
  Permission,
  AuthTokens,
  LoginCredentials,
  RegisterCredentials,
  AuthState,
  AuthContextValue,
  RouteAuthConfig,
} from './types';

// =============================================================================
// Active Directory Integration
// =============================================================================

export * as activeDirectory from './active-directory';

export {
  // Provider
  ADProvider,
  ADContext,
  type ADProviderProps,

  // Hook
  useActiveDirectory,

  // Client
  ADClient,
  createADClient,

  // Token Handler
  ADTokenHandler,
  createTokenHandler,
  type TokenHandlerOptions,
  type AcquisitionOptions,

  // SSO
  SSOManager,
  createSSOManager,
  CrossDomainSSO,
  createCrossDomainSSO,
  type SSOEventType,
  type SSOBroadcastMessage,
  type SSOEventHandler,
  type SSOManagerOptions,

  // Groups
  ADGroupMapper,
  createGroupMapper,
  mergeGroupMappings,
  validateGroupMapping,
  GROUP_MAPPING_PRESETS,
  type GroupMappingResult,

  // Attributes
  ADAttributeMapper,
  createAttributeMapper,
  DEFAULT_ATTRIBUTE_MAPPINGS,
  type AttributeMapping,
  type AttributeMappingResult,

  // Config
  getAuthorityUrl,
  getConfiguredScopes,
  validateADConfig,
  DEFAULT_AD_CONFIG,
  DEFAULT_AZURE_AD_CONFIG,
  DEFAULT_ADFS_CONFIG,
  DEFAULT_AZURE_B2C_CONFIG,
  DEFAULT_ON_PREMISES_CONFIG,
  DEFAULT_SSO_CONFIG,
  DEFAULT_GROUP_MAPPING_CONFIG,

  // Types
  type ADProviderType,
  type ADConfig,
  type AzureADConfig,
  type AzureADB2CConfig,
  type ADFSConfig,
  type OnPremisesADConfig,
  type ADTokens,
  type ADUser,
  type ADGroup,
  type SSOConfig,
  type SSOSession,
  type ADGroupRoleMapping,
  type ADGroupMappingConfig,
  type TokenAcquisitionRequest,
  type TokenRefreshResult,
  type ADAuthError,
  type ADAuthState,
  type ADContextValue,
} from './active-directory';

// =============================================================================
// RBAC (Role-Based Access Control)
// =============================================================================

export * as rbac from './rbac';

export {
  // Provider
  RBACProvider,
  RBACContext,
  type RBACProviderProps,

  // Hook
  useRBAC,
  usePermissions,
  useRoles,
  useResourceAccess,
  usePermissionGate,
  useRoleGate,
  useAccessChecks,
  type UseRBACReturn,

  // Engine
  RBACEngine,
  createRBACEngine,

  // Permission Matrix
  PermissionMatrixBuilder,
  createPermissionMatrixBuilder,
  createStandardMatrix,
  createHealthcareMatrix,
  mergePermissionMatrices,
  filterEntriesByRole,
  filterEntriesByResource,
  getDefinedResources,
  getDefinedRoles,
  validatePermissionMatrix,
  PERMISSION_ACTIONS,
  CRUD_ACTIONS,
  READ_ONLY_ACTIONS,
  FULL_ACCESS_ACTIONS,

  // Role Hierarchy
  RoleHierarchyManager,
  createRoleHierarchy,
  STANDARD_ROLE_HIERARCHY,
  HEALTHCARE_ROLE_HIERARCHY,

  // Resource Permissions
  ResourcePermissionManager,
  createResourcePermissionManager,
  levelGrantsAction,
  getMinimumLevelForAction,
  comparePermissionLevels,
  PERMISSION_LEVELS,
  LEVEL_ACTIONS,

  // Policy Evaluator
  PolicyEvaluator,
  createPolicyEvaluator,
  type EvaluationContext,

  // Types
  type PermissionAction,
  type PermissionScope,
  type StructuredPermission,
  type PermissionCondition,
  type RoleDefinition,
  type RoleAssignment,
  type RoleHierarchy,
  type PermissionMatrix,
  type PermissionMatrixEntry,
  type Policy,
  type PolicySet,
  type PolicyEffect,
  type PolicyResult,
  type PolicySubject,
  type PolicyResource,
  type PolicyCondition,
  type AccessRequest,
  type RequestContext,
  type EvaluationResult,
  type Obligation,
  type ResourcePermission,
  type ResourceACL,
  type RBACConfig,
  type RBACState,
  type RBACContextValue,
  type RBACAuditEvent,
  type RBACAuditHandler,
} from './rbac';
