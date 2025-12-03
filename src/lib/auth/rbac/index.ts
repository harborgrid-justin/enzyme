/**
 * RBAC (Role-Based Access Control) Module
 *
 * Enterprise-grade RBAC implementation for React applications.
 * Supports role hierarchies, permission matrices, and policy-based access control.
 *
 * @module auth/rbac
 *
 * @example
 * ```tsx
 * // Basic setup
 * import { RBACProvider, useRBAC } from '@/lib/auth/rbac';
 *
 * const rbacConfig = {
 *   roles: [
 *     { id: 'admin', name: 'Admin', permissions: ['*'], priority: 100 },
 *     { id: 'manager', name: 'Manager', permissions: ['team:*', 'reports:*'], inherits: ['user'], priority: 50 },
 *     { id: 'user', name: 'User', permissions: ['profile:*', 'documents:own:*'], priority: 10 },
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
 *
 * // Use in components
 * function DocumentsPage() {
 *   const { canCreate, canRead, canDelete, isAdmin } = useRBAC();
 *
 *   return (
 *     <div>
 *       {canRead('documents') && <DocumentList />}
 *       {canCreate('documents') && <CreateButton />}
 *       {isAdmin && <AdminPanel />}
 *     </div>
 *   );
 * }
 * ```
 */

// =============================================================================
// Context & Provider
// =============================================================================

export { RBACProvider, RBACContext } from './rbac-context';
export type { RBACProviderProps } from './rbac-context';

// =============================================================================
// Hooks
// =============================================================================

export {
  useRBAC,
  usePermissions,
  useRoles,
  useResourceAccess,
  usePermissionGate,
  useRoleGate,
  useAccessChecks,
} from './useRBAC';
export type { UseRBACReturn } from './useRBAC';

// =============================================================================
// RBAC Engine
// =============================================================================

export { RBACEngine, createRBACEngine } from './rbac-engine';

// =============================================================================
// Permission Matrix
// =============================================================================

export {
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
} from './permission-matrix';

// =============================================================================
// Role Hierarchy
// =============================================================================

export {
  RoleHierarchyManager,
  createRoleHierarchy,
  STANDARD_ROLE_HIERARCHY,
  HEALTHCARE_ROLE_HIERARCHY,
} from './role-hierarchy';

// =============================================================================
// Resource Permissions
// =============================================================================

export {
  ResourcePermissionManager,
  createResourcePermissionManager,
  levelGrantsAction,
  getMinimumLevelForAction,
  comparePermissionLevels,
  PERMISSION_LEVELS,
  LEVEL_ACTIONS,
} from './resource-permissions';

// =============================================================================
// Policy Evaluator
// =============================================================================

export { PolicyEvaluator, createPolicyEvaluator } from './policy-evaluator';
export type { EvaluationContext } from './policy-evaluator';

// =============================================================================
// Types
// =============================================================================

export type {
  // Core Types
  PermissionAction,
  PermissionScope,
  StructuredPermission,
  PermissionCondition,
  // Role Types
  RoleDefinition,
  RoleAssignment,
  RoleHierarchy,
  // Permission Matrix Types
  PermissionMatrix,
  PermissionMatrixEntry,
  // Policy Types
  Policy,
  PolicySet,
  PolicyEffect,
  PolicyResult,
  PolicySubject,
  PolicyResource,
  PolicyCondition,
  // Evaluation Types
  AccessRequest,
  RequestContext,
  EvaluationResult,
  Obligation,
  // Resource Permission Types
  ResourcePermission,
  ResourceACL,
  // Configuration Types
  RBACConfig,
  RBACState,
  RBACContextValue,
  // Event Types
  RBACAuditEvent,
  RBACAuditHandler,
} from './types';
