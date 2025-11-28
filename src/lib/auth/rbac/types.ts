/**
 * RBAC (Role-Based Access Control) Types
 *
 * Comprehensive type definitions for enterprise RBAC implementation
 * including roles, permissions, policies, and resource-based access control.
 *
 * @module auth/rbac/types
 */

import type { Permission } from '../types';
export type { Permission };

// =============================================================================
// Core RBAC Types
// =============================================================================

/**
 * Permission action types.
 */
export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'list'
  | 'execute'
  | 'manage'
  | 'approve'
  | 'export'
  | 'import'
  | '*';

/**
 * Permission scope levels.
 */
export type PermissionScope =
  | 'own'      // User's own resources only
  | 'team'    // Team/department resources
  | 'org'     // Organization-wide
  | 'global'; // All resources (system-wide)

/**
 * Structured permission definition.
 */
export interface StructuredPermission {
  /** Resource type (e.g., 'users', 'documents', 'reports') */
  resource: string;
  /** Action on the resource */
  action: PermissionAction;
  /** Scope of the permission */
  scope?: PermissionScope;
  /** Conditions for the permission */
  conditions?: PermissionCondition[];
  /** Whether permission is negated (deny) */
  deny?: boolean;
}

/**
 * Condition for conditional permissions.
 */
export interface PermissionCondition {
  /** Field to check */
  field: string;
  /** Comparison operator */
  operator:
    | 'equals'
    | 'notEquals'
    | 'contains'
    | 'notContains'
    | 'startsWith'
    | 'endsWith'
    | 'greaterThan'
    | 'lessThan'
    | 'in'
    | 'notIn'
    | 'exists'
    | 'regex';
  /** Value to compare against */
  value: unknown;
  /** Use context value instead of literal */
  contextKey?: string;
}

// =============================================================================
// Role Types
// =============================================================================

/**
 * Extended role definition with metadata.
 */
export interface RoleDefinition {
  /** Unique role identifier */
  id: string;
  /** Display name */
  name: string;
  /** Role description */
  description?: string;
  /** Permissions granted by this role */
  permissions: Permission[];
  /** Structured permissions for fine-grained control */
  structuredPermissions?: StructuredPermission[];
  /** Parent roles (for inheritance) */
  inherits?: string[];
  /** Role priority (higher = more privileged) */
  priority: number;
  /** Whether this is a system/built-in role */
  isSystem?: boolean;
  /** Maximum number of users that can have this role */
  maxAssignments?: number;
  /** Role metadata */
  metadata?: Record<string, unknown>;
  /** Whether role is currently active */
  isActive?: boolean;
  /** Role creation timestamp */
  createdAt?: string;
  /** Last update timestamp */
  updatedAt?: string;
}

/**
 * Role assignment to a user or entity.
 */
export interface RoleAssignment {
  /** Assignment ID */
  id: string;
  /** Role ID */
  roleId: string;
  /** Entity type (user, group, service account) */
  entityType: 'user' | 'group' | 'service';
  /** Entity ID */
  entityId: string;
  /** Scope of the assignment */
  scope?: {
    type: 'global' | 'organization' | 'team' | 'resource';
    resourceType?: string;
    resourceId?: string;
  };
  /** Assignment start time */
  validFrom?: string;
  /** Assignment end time (temporary roles) */
  validUntil?: string;
  /** Who created the assignment */
  assignedBy?: string;
  /** Assignment reason/justification */
  reason?: string;
  /** Assignment creation timestamp */
  createdAt: string;
}

/**
 * Role hierarchy configuration.
 */
export interface RoleHierarchy {
  /** Role ID */
  roleId: string;
  /** Parent role IDs */
  parents: string[];
  /** Child role IDs */
  children: string[];
  /** Hierarchy level (0 = root) */
  level: number;
}

// =============================================================================
// Permission Matrix Types
// =============================================================================

/**
 * Permission matrix entry mapping role to permissions.
 */
export interface PermissionMatrixEntry {
  /** Role ID */
  roleId: string;
  /** Resource type */
  resource: string;
  /** Allowed actions */
  allowedActions: PermissionAction[];
  /** Denied actions (explicit deny) */
  deniedActions?: PermissionAction[];
  /** Permission scope */
  scope?: PermissionScope;
  /** Conditions for this entry */
  conditions?: PermissionCondition[];
}

/**
 * Complete permission matrix configuration.
 */
export interface PermissionMatrix {
  /** Matrix entries */
  entries: PermissionMatrixEntry[];
  /** Default deny/allow behavior */
  defaultBehavior: 'deny' | 'allow';
  /** Priority order for conflict resolution */
  conflictResolution: 'deny-wins' | 'allow-wins' | 'priority';
  /** Matrix version for cache invalidation */
  version: string;
  /** Last update timestamp */
  updatedAt: string;
}

// =============================================================================
// Policy Types
// =============================================================================

/**
 * Policy effect (allow or deny).
 */
export type PolicyEffect = 'allow' | 'deny';

/**
 * Policy evaluation result.
 */
export type PolicyResult =
  | 'allow'
  | 'deny'
  | 'not-applicable'
  | 'indeterminate';

/**
 * Access control policy definition (ABAC-style).
 */
export interface Policy {
  /** Unique policy identifier */
  id: string;
  /** Policy name */
  name: string;
  /** Policy description */
  description?: string;
  /** Policy effect if conditions match */
  effect: PolicyEffect;
  /** Policy priority (higher = evaluated first) */
  priority: number;
  /** Subject conditions (who) */
  subjects?: PolicySubject[];
  /** Resource conditions (what) */
  resources?: PolicyResource[];
  /** Action conditions (how) */
  actions?: string[];
  /** Environmental conditions (when/where) */
  conditions?: PolicyCondition[];
  /** Whether policy is enabled */
  enabled: boolean;
  /** Policy version */
  version?: string;
  /** Policy metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Policy subject (who the policy applies to).
 */
export interface PolicySubject {
  /** Subject type */
  type: 'user' | 'role' | 'group' | 'attribute';
  /** Subject identifier or attribute name */
  identifier: string;
  /** Match type */
  match?: 'exact' | 'pattern' | 'any';
  /** Value to match (for attribute type) */
  value?: unknown;
}

/**
 * Policy resource (what the policy applies to).
 */
export interface PolicyResource {
  /** Resource type */
  type: string;
  /** Resource identifier (supports wildcards) */
  identifier?: string;
  /** Resource attributes to match */
  attributes?: Record<string, unknown>;
}

/**
 * Policy condition for ABAC.
 */
export interface PolicyCondition {
  /** Condition type */
  type:
    | 'time'
    | 'ip'
    | 'location'
    | 'attribute'
    | 'context'
    | 'custom';
  /** Operator for comparison */
  operator: string;
  /** Value to compare */
  value: unknown;
  /** Key/field for attribute-based conditions */
  key?: string;
}

/**
 * Policy set containing multiple policies.
 */
export interface PolicySet {
  /** Policy set ID */
  id: string;
  /** Policy set name */
  name: string;
  /** Policies in this set */
  policies: Policy[];
  /** Combining algorithm */
  combiningAlgorithm:
    | 'deny-overrides'
    | 'permit-overrides'
    | 'first-applicable'
    | 'ordered-deny-overrides'
    | 'ordered-permit-overrides';
  /** Target resources for this policy set */
  target?: PolicyResource[];
}

// =============================================================================
// Evaluation Types
// =============================================================================

/**
 * Access request for evaluation.
 */
export interface AccessRequest {
  /** Subject making the request */
  subject: {
    id: string;
    type: 'user' | 'service' | 'system';
    roles?: string[];
    attributes?: Record<string, unknown>;
  };
  /** Resource being accessed */
  resource: {
    type: string;
    id?: string;
    attributes?: Record<string, unknown>;
  };
  /** Action being performed */
  action: string;
  /** Request context */
  context?: RequestContext;
}

/**
 * Request context for evaluation.
 */
export interface RequestContext {
  /** Request timestamp */
  timestamp?: number;
  /** Client IP address */
  ipAddress?: string;
  /** Geographic location */
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  /** Device information */
  device?: {
    type?: string;
    platform?: string;
    trusted?: boolean;
  };
  /** Session information */
  session?: {
    id?: string;
    createdAt?: number;
    mfaVerified?: boolean;
  };
  /** Custom context attributes */
  attributes?: Record<string, unknown>;
}

/**
 * Access evaluation result.
 */
export interface EvaluationResult {
  /** Whether access is allowed */
  allowed: boolean;
  /** Result decision */
  decision: PolicyResult;
  /** Matching policies that contributed to decision */
  matchingPolicies?: string[];
  /** Reason for the decision */
  reason?: string;
  /** Obligations to fulfill if allowed */
  obligations?: Obligation[];
  /** Advice for the decision */
  advice?: string[];
  /** Evaluation timestamp */
  evaluatedAt: number;
  /** Time taken for evaluation (ms) */
  evaluationTime?: number;
}

/**
 * Obligation to fulfill when access is granted.
 */
export interface Obligation {
  /** Obligation ID */
  id: string;
  /** Obligation type */
  type: 'audit' | 'notify' | 'filter' | 'transform' | 'custom';
  /** Obligation parameters */
  parameters?: Record<string, unknown>;
  /** Whether obligation is mandatory */
  mandatory: boolean;
}

// =============================================================================
// Resource Permission Types
// =============================================================================

/**
 * Resource-based permission definition.
 */
export interface ResourcePermission {
  /** Resource type */
  resourceType: string;
  /** Resource ID (optional for type-level permissions) */
  resourceId?: string;
  /** Grantee type */
  granteeType: 'user' | 'role' | 'group' | 'everyone';
  /** Grantee ID */
  granteeId?: string;
  /** Granted permission level */
  permissionLevel: 'none' | 'view' | 'edit' | 'manage' | 'owner';
  /** Specific actions granted */
  actions?: PermissionAction[];
  /** Whether permission is inherited from parent */
  inherited?: boolean;
  /** Source of inherited permission */
  inheritedFrom?: string;
  /** Grant timestamp */
  grantedAt: string;
  /** Who granted the permission */
  grantedBy?: string;
  /** Grant expiration */
  expiresAt?: string;
}

/**
 * Resource access control list (ACL).
 */
export interface ResourceACL {
  /** Resource type */
  resourceType: string;
  /** Resource ID */
  resourceId: string;
  /** Resource owner */
  owner: string;
  /** Access control entries */
  entries: ResourcePermission[];
  /** Whether ACL inherits from parent */
  inheritParent?: boolean;
  /** Parent resource for inheritance */
  parentResource?: {
    type: string;
    id: string;
  };
  /** ACL version */
  version: number;
  /** Last update timestamp */
  updatedAt: string;
}

// =============================================================================
// RBAC Context Types
// =============================================================================

/**
 * RBAC configuration options.
 */
export interface RBACConfig {
  /** Available role definitions */
  roles: RoleDefinition[];
  /** Permission matrix */
  permissionMatrix?: PermissionMatrix;
  /** Policy sets */
  policySets?: PolicySet[];
  /** Role hierarchy configuration */
  roleHierarchy?: RoleHierarchy[];
  /** Default behavior when no policy matches */
  defaultDecision: 'allow' | 'deny';
  /** Enable permission caching */
  enableCaching?: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
  /** Enable audit logging */
  enableAudit?: boolean;
  /** Feature flag for RBAC */
  featureFlag?: string;
  /** Super admin roles that bypass all checks */
  superAdminRoles?: string[];
  /** Debug mode */
  debug?: boolean;
}

/**
 * RBAC state for React context.
 */
export interface RBACState {
  /** Whether RBAC is initialized */
  initialized: boolean;
  /** Whether RBAC is loading */
  loading: boolean;
  /** Current user's roles */
  userRoles: string[];
  /** Current user's resolved permissions */
  userPermissions: Permission[];
  /** Cached evaluation results */
  evaluationCache: Map<string, EvaluationResult>;
  /** Last refresh timestamp */
  lastRefresh: number | null;
  /** Initialization error */
  error: string | null;
}

/**
 * RBAC context value for React context.
 */
export interface RBACContextValue extends RBACState {
  /** Configuration */
  config: RBACConfig;
  /** Check if user has permission */
  hasPermission: (permission: Permission) => boolean;
  /** Check if user has any of the permissions */
  hasAnyPermission: (permissions: Permission[]) => boolean;
  /** Check if user has all permissions */
  hasAllPermissions: (permissions: Permission[]) => boolean;
  /** Check if user has role */
  hasRole: (role: string) => boolean;
  /** Check if user has any of the roles */
  hasAnyRole: (roles: string[]) => boolean;
  /** Check if user has all roles */
  hasAllRoles: (roles: string[]) => boolean;
  /** Check access using structured permission */
  canAccess: (resource: string, action: PermissionAction, resourceId?: string) => boolean;
  /** Evaluate access request (full ABAC evaluation) */
  evaluate: (request: AccessRequest) => EvaluationResult;
  /** Get user's effective permissions */
  getEffectivePermissions: () => Permission[];
  /** Get user's roles with full definitions */
  getRoleDefinitions: () => RoleDefinition[];
  /** Refresh permissions from server */
  refreshPermissions: () => Promise<void>;
  /** Clear evaluation cache */
  clearCache: () => void;
  /** Check resource-level permission */
  checkResourcePermission: (
    resourceType: string,
    resourceId: string,
    action: PermissionAction
  ) => boolean;
}

// =============================================================================
// Event Types
// =============================================================================

/**
 * RBAC audit event.
 */
export interface RBACAuditEvent {
  /** Event ID */
  id: string;
  /** Event timestamp */
  timestamp: number;
  /** Event type */
  type: 'access_check' | 'permission_grant' | 'permission_revoke' | 'role_assign' | 'role_revoke';
  /** Subject of the action */
  subject: {
    id: string;
    type: string;
  };
  /** Resource involved */
  resource?: {
    type: string;
    id?: string;
  };
  /** Action attempted */
  action?: string;
  /** Result of the check */
  result?: 'allowed' | 'denied';
  /** Reason for result */
  reason?: string;
  /** Additional event data */
  metadata?: Record<string, unknown>;
}

/**
 * RBAC event handler.
 */
export type RBACAuditHandler = (event: RBACAuditEvent) => void;
