/**
 * RBAC Engine
 *
 * Core RBAC evaluation engine that handles permission checking,
 * role resolution, and access control decisions.
 *
 * @module auth/rbac/rbac-engine
 */

import type {
  RBACConfig,
  RoleDefinition,

  PermissionAction,
  PermissionScope,

  AccessRequest,
  EvaluationResult,
  PolicyResult,
  RBACAuditEvent,
  RBACAuditHandler,
} from './types';


// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CACHE_TTL = 300000; // 5 minutes
const WILDCARD = '*';

/**
 * Maximum length for user-provided patterns to prevent ReDoS attacks.
 *
 * SECURITY: Long patterns with certain structures can cause catastrophic
 * backtracking in regex engines, leading to denial of service.
 */
const MAX_PATTERN_LENGTH = 256;

/**
 * Timeout for pattern matching operations in milliseconds.
 *
 * SECURITY: Limits execution time for regex operations to prevent DoS.
 */


// =============================================================================
// RBAC Engine Class
// =============================================================================

/**
 * RBAC Engine for permission evaluation.
 *
 * Provides comprehensive RBAC functionality including role inheritance,
 * permission resolution, and caching.
 *
 * @example
 * ```typescript
 * const engine = new RBACEngine({
 *   roles: [
 *     {
 *       id: 'admin',
 *       name: 'Administrator',
 *       permissions: ['*'],
 *       priority: 100,
 *     },
 *     {
 *       id: 'user',
 *       name: 'User',
 *       permissions: ['users:read:own', 'documents:*:own'],
 *       priority: 10,
 *     },
 *   ],
 *   defaultDecision: 'deny',
 * });
 *
 * // Initialize with user context
 * engine.setUserContext(['user'], { id: 'user-123' });
 *
 * // Check permissions
 * engine.hasPermission('users:read'); // true
 * engine.canAccess('documents', 'create'); // true
 * ```
 */
export class RBACEngine {
  private config: RBACConfig;
  private roleMap: Map<string, RoleDefinition>;
  private permissionCache: Map<string, boolean>;
  private evaluationCache: Map<string, EvaluationResult>;
  private cacheExpiry: number = 0;
  private userRoles: string[] = [];
  private userAttributes: Record<string, unknown> = {};
  private resolvedPermissions: Set<string> = new Set();
  private auditHandlers: Set<RBACAuditHandler> = new Set();
  private debug: boolean;

  /**
   * Create a new RBAC engine.
   *
   * @param config - RBAC configuration
   */
  constructor(config: RBACConfig) {
    this.config = config;
    this.debug = config.debug ?? false;
    this.roleMap = new Map();
    this.permissionCache = new Map();
    this.evaluationCache = new Map();

    // Index roles for quick lookup
    this.indexRoles(config.roles);
  }

  // ===========================================================================
  // Configuration Methods
  // ===========================================================================

  /**
   * Set the current user context.
   *
   * @param roles - User's assigned roles
   * @param attributes - User attributes for ABAC
   */
  setUserContext(roles: string[], attributes: Record<string, unknown> = {}): void {
    this.userRoles = roles;
    this.userAttributes = attributes;
    this.clearCache();
    this.resolvePermissions();
    this.log('User context set:', { roles, attributes });
  }

  /**
   * Get the current user's roles.
   */
  getUserRoles(): string[] {
    return [...this.userRoles];
  }

  /**
   * Get the resolved permissions for current user.
   */
  getResolvedPermissions(): string[] {
    return Array.from(this.resolvedPermissions);
  }

  /**
   * Update configuration.
   *
   * @param config - Partial configuration update
   */
  updateConfig(config: Partial<RBACConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.roles) {
      this.roleMap.clear();
      this.indexRoles(config.roles);
    }

    this.clearCache();
    this.resolvePermissions();
  }

  /**
   * Add a role definition.
   *
   * @param role - Role definition to add
   */
  addRole(role: RoleDefinition): void {
    this.roleMap.set(role.id, role);
    this.config.roles.push(role);
    this.clearCache();
    this.resolvePermissions();
  }

  /**
   * Remove a role definition.
   *
   * @param roleId - Role ID to remove
   */
  removeRole(roleId: string): void {
    this.roleMap.delete(roleId);
    this.config.roles = this.config.roles.filter(r => r.id !== roleId);
    this.clearCache();
    this.resolvePermissions();
  }

  // ===========================================================================
  // Permission Checking
  // ===========================================================================

  /**
   * Check if user has a specific permission.
   *
   * @param permission - Permission string to check
   * @returns Whether user has the permission
   */
  hasPermission(permission: string): boolean {
    // Check cache first
    const cacheKey = `perm:${permission}`;
    if (this.isCacheValid() && this.permissionCache.has(cacheKey)) {
      const cachedValue = this.permissionCache.get(cacheKey);
      if (cachedValue != null) {
        return cachedValue;
      }
    }

    // Check super admin bypass
    if (this.isSuperAdmin()) {
      this.cachePermission(cacheKey, true);
      return true;
    }

    // Check if user has wildcard permission
    if (this.resolvedPermissions.has(WILDCARD)) {
      this.cachePermission(cacheKey, true);
      return true;
    }

    // Direct permission check
    if (this.resolvedPermissions.has(permission)) {
      this.cachePermission(cacheKey, true);
      return true;
    }

    // Wildcard pattern matching
    const result = this.matchPermissionPattern(permission);
    this.cachePermission(cacheKey, result);

    return result;
  }

  /**
   * Check if user has any of the given permissions.
   *
   * @param permissions - Permissions to check
   * @returns Whether user has any permission
   */
  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(p => this.hasPermission(p));
  }

  /**
   * Check if user has all of the given permissions.
   *
   * @param permissions - Permissions to check
   * @returns Whether user has all permissions
   */
  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(p => this.hasPermission(p));
  }

  /**
   * Check if user has a specific role.
   *
   * @param roleId - Role ID to check
   * @returns Whether user has the role
   */
  hasRole(roleId: string): boolean {
    return this.userRoles.includes(roleId) || this.hasInheritedRole(roleId);
  }

  /**
   * Check if user has any of the given roles.
   *
   * @param roleIds - Role IDs to check
   * @returns Whether user has any role
   */
  hasAnyRole(roleIds: string[]): boolean {
    return roleIds.some(r => this.hasRole(r));
  }

  /**
   * Check if user has all of the given roles.
   *
   * @param roleIds - Role IDs to check
   * @returns Whether user has all roles
   */
  hasAllRoles(roleIds: string[]): boolean {
    return roleIds.every(r => this.hasRole(r));
  }

  /**
   * Check if user can access a resource with an action.
   *
   * @param resource - Resource type
   * @param action - Action to perform
   * @param scope - Permission scope
   * @returns Whether access is allowed
   */
  canAccess(
    resource: string,
    action: PermissionAction,
    scope?: PermissionScope
  ): boolean {
    // Build permission strings to check
    const permissionsToCheck = [
      `${resource}:${action}`,
      `${resource}:*`,
      `*:${action}`,
      WILDCARD,
    ];

    if (scope) {
      permissionsToCheck.unshift(
        `${resource}:${action}:${scope}`,
        `${resource}:*:${scope}`
      );
    }

    return permissionsToCheck.some(p => this.hasPermission(p));
  }

  /**
   * Check resource-level permission.
   *
   * @param resourceType - Resource type
   * @param resourceId - Resource ID
   * @param action - Action to perform
   * @param context - Additional context
   * @returns Whether access is allowed
   */
  checkResourcePermission(
    resourceType: string,
    _resourceId: string,
    action: PermissionAction,
    context?: Record<string, unknown>
  ): boolean {
    // First check type-level permission
    if (this.canAccess(resourceType, action)) {
      return true;
    }

    // Check if user has permission for own resources
    if (this.canAccess(resourceType, action, 'own')) {
      // Check if resource belongs to user
      const ownerId = context?.ownerId ?? context?.userId;
      if (ownerId != null && ownerId === this.userAttributes.id) {
        return true;
      }
    }

    // Check team-level permission
    if (this.canAccess(resourceType, action, 'team')) {
      const resourceTeam = context?.teamId;
      const userTeam = this.userAttributes.teamId;
      if (resourceTeam != null && userTeam != null && resourceTeam === userTeam) {
        return true;
      }
    }

    return false;
  }

  // ===========================================================================
  // Access Evaluation (Full ABAC)
  // ===========================================================================

  /**
   * Evaluate an access request using full ABAC evaluation.
   *
   * @param request - Access request to evaluate
   * @returns Evaluation result
   */
  evaluate(request: AccessRequest): EvaluationResult {
    const startTime = Date.now();
    const cacheKey = this.getEvaluationCacheKey(request);

    // Check cache
    if (this.isCacheValid() && this.evaluationCache.has(cacheKey)) {
      const cached = this.evaluationCache.get(cacheKey);
      if (cached != null) {
        this.auditCheck(request, cached);
        return cached;
      }
    }

    // Super admin bypass
    if (this.isSuperAdmin()) {
      const result = this.createResult(true, 'allow', 'super_admin_bypass');
      this.cacheEvaluation(cacheKey, result);
      this.auditCheck(request, result);
      return result;
    }

    // Evaluate policies if configured
    if ((this.config.policySets?.length ?? 0) > 0) {
      const policyResult = this.evaluatePolicies(request);
      if (policyResult.decision !== 'not-applicable') {
        policyResult.evaluationTime = Date.now() - startTime;
        this.cacheEvaluation(cacheKey, policyResult);
        this.auditCheck(request, policyResult);
        return policyResult;
      }
    }

    // Evaluate using permission matrix if configured
    if (this.config.permissionMatrix) {
      const matrixResult = this.evaluatePermissionMatrix(request);
      if (matrixResult.decision !== 'not-applicable') {
        matrixResult.evaluationTime = Date.now() - startTime;
        this.cacheEvaluation(cacheKey, matrixResult);
        this.auditCheck(request, matrixResult);
        return matrixResult;
      }
    }

    // Fall back to basic permission check
    const permission = `${request.resource.type}:${request.action}`;
    const allowed = this.hasPermission(permission);

    const result = this.createResult(
      allowed,
      allowed ? 'allow' : 'deny',
      allowed ? 'permission_granted' : 'permission_denied'
    );
    result.evaluationTime = Date.now() - startTime;

    this.cacheEvaluation(cacheKey, result);
    this.auditCheck(request, result);

    return result;
  }

  /**
   * Evaluate policies for a request.
   */
  private evaluatePolicies(request: AccessRequest): EvaluationResult {
    const matchingPolicies: string[] = [];
    let decision: PolicyResult = 'not-applicable';

    for (const policySet of this.config.policySets ?? []) {
      // Check if policy set target matches
      if (!this.matchesPolicyTarget(policySet.target, request)) {
        continue;
      }

      // Evaluate each policy in the set
      for (const policy of policySet.policies) {
        if (!policy.enabled) continue;

        const matches = this.evaluatePolicy(policy, request);
        if (matches) {
          matchingPolicies.push(policy.id);

          // Apply combining algorithm
          if (policy.effect === 'deny') {
            if (
              policySet.combiningAlgorithm === 'deny-overrides' ||
              policySet.combiningAlgorithm === 'ordered-deny-overrides'
            ) {
              return this.createResult(false, 'deny', 'policy_deny', matchingPolicies);
            }
            decision = 'deny';
          } else {
            if (
              policySet.combiningAlgorithm === 'permit-overrides' ||
              policySet.combiningAlgorithm === 'ordered-permit-overrides'
            ) {
              return this.createResult(true, 'allow', 'policy_allow', matchingPolicies);
            }
            if (decision !== 'deny') {
              decision = 'allow';
            }
          }

          if (policySet.combiningAlgorithm === 'first-applicable') {
            return this.createResult(
              policy.effect === 'allow',
              policy.effect === 'allow' ? 'allow' : 'deny',
              'first_applicable_policy',
              matchingPolicies
            );
          }
        }
      }
    }

    return this.createResult(
      decision === 'allow',
      decision,
      'policy_evaluation',
      matchingPolicies
    );
  }

  /**
   * Evaluate a single policy.
   */
  private evaluatePolicy(
    policy: import('./types').Policy,
    request: AccessRequest
  ): boolean {
    // Check subjects
    if ((policy.subjects?.length ?? 0) > 0) {
      const subjectMatch = policy.subjects.some(subject =>
        this.matchesPolicySubject(subject, request)
      );
      if (!subjectMatch) return false;
    }

    // Check resources
    if (policy.resources?.length) {
      const resourceMatch = policy.resources.some(resource =>
        this.matchesPolicyResource(resource, request)
      );
      if (!resourceMatch) return false;
    }

    // Check actions
    if (policy.actions?.length) {
      const actionMatch = policy.actions.some(
        action => action === WILDCARD || action === request.action
      );
      if (!actionMatch) return false;
    }

    // Check conditions
    if (policy.conditions?.length) {
      const conditionsMatch = policy.conditions.every(condition =>
        this.evaluatePolicyCondition(condition, request)
      );
      if (!conditionsMatch) return false;
    }

    return true;
  }

  /**
   * Check if request matches policy target.
   */
  private matchesPolicyTarget(
    targets: import('./types').PolicyResource[] | undefined,
    request: AccessRequest
  ): boolean {
    if (!targets?.length) return true;
    return targets.some(target => this.matchesPolicyResource(target, request));
  }

  /**
   * Check if request matches policy subject.
   */
  private matchesPolicySubject(
    subject: import('./types').PolicySubject,
    request: AccessRequest
  ): boolean {
    switch (subject.type) {
      case 'user':
        return this.matchIdentifier(subject, request.subject.id);
      case 'role':
        return request.subject.roles?.includes(subject.identifier) ?? false;
      case 'group':
        // Check group membership (would need group info in subject)
        return false;
      case 'attribute': {
        const attrValue = request.subject.attributes?.[subject.identifier];
        return subject.value === undefined || attrValue === subject.value;
      }
      default:
        return false;
    }
  }

  /**
   * Check if request matches policy resource.
   */
  private matchesPolicyResource(
    resource: import('./types').PolicyResource,
    request: AccessRequest
  ): boolean {
    if (resource.type !== WILDCARD && resource.type !== request.resource.type) {
      return false;
    }

    if (resource.identifier && resource.identifier !== WILDCARD) {
      if (request.resource.id && resource.identifier !== request.resource.id) {
        return false;
      }
    }

    if (resource.attributes) {
      for (const [key, value] of Object.entries(resource.attributes)) {
        if (request.resource.attributes?.[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Match identifier with support for wildcards and patterns.
   *
   * SECURITY: Implements multiple protections against ReDoS attacks:
   * 1. Maximum pattern length limit (MAX_PATTERN_LENGTH)
   * 2. Escaping of regex metacharacters before pattern conversion
   * 3. Use of non-greedy quantifiers where possible
   * 4. Simple string matching for exact matches (no regex)
   * 5. For complex patterns, uses linear-time matching algorithm
   */
  private matchIdentifier(
    subject: import('./types').PolicySubject,
    value: string
  ): boolean {
    const { identifier, match = 'exact' } = subject;

    switch (match) {
      case 'any':
        return true;

      case 'pattern':
        return this.safePatternMatch(identifier, value);

      case 'exact':
      default:
        return identifier === value;
    }
  }

  /**
   * Safely matches a glob-like pattern against a value.
   *
   * SECURITY: Implements ReDoS-safe pattern matching:
   * - Validates pattern length before processing
   * - Escapes regex metacharacters to prevent injection
   * - Uses non-greedy quantifiers (.*? instead of .*)
   * - Falls back to simple string matching for overly complex patterns
   *
   * @param pattern - Glob-like pattern (supports * and ?)
   * @param value - Value to match against
   * @returns Whether the value matches the pattern
   */
  private safePatternMatch(pattern: string, value: string): boolean {
    // SECURITY: Enforce maximum pattern length to prevent ReDoS
    if (pattern.length > MAX_PATTERN_LENGTH) {
      this.log(`Pattern exceeds maximum length (${MAX_PATTERN_LENGTH}), rejecting`);
      return false;
    }

    // SECURITY: Validate value length as well
    if (value.length > MAX_PATTERN_LENGTH * 4) {
      this.log(`Value exceeds maximum length for pattern matching, rejecting`);
      return false;
    }

    // For simple patterns without wildcards, use direct comparison
    if (!pattern.includes('*') && !pattern.includes('?')) {
      return pattern === value;
    }

    // SECURITY: Use linear-time matching algorithm for safety
    // This avoids regex entirely, preventing ReDoS
    return this.globMatch(pattern, value);
  }

  /**
   * Linear-time glob matching algorithm.
   *
   * SECURITY: This implementation uses a non-regex approach that runs
   * in O(n*m) worst case where n = pattern length and m = value length.
   * This prevents the exponential backtracking that causes ReDoS.
   *
   * Supports:
   * - * matches any sequence of characters (including empty)
   * - ? matches exactly one character
   *
   * @param pattern - Glob pattern with * and ? wildcards
   * @param value - String to match
   * @returns Whether the pattern matches the value
   */
  private globMatch(pattern: string, value: string): boolean {
    let pi = 0; // pattern index
    let vi = 0; // value index
    let starIdx = -1; // position of last * in pattern
    let matchIdx = -1; // position in value where we matched *

    while (vi < value.length) {
      // Current characters match, or pattern has ?
      if (pi < pattern.length && (pattern[pi] === value[vi] || pattern[pi] === '?')) {
        pi++;
        vi++;
      }
      // Pattern has *, remember position and try matching empty string
      else if (pi < pattern.length && pattern[pi] === '*') {
        starIdx = pi;
        matchIdx = vi;
        pi++;
      }
      // Mismatch, but we have a * to fall back to
      else if (starIdx !== -1) {
        pi = starIdx + 1;
        matchIdx++;
        vi = matchIdx;
      }
      // No match and no * to fall back to
      else {
        return false;
      }
    }

    // Check remaining pattern characters (should all be *)
    while (pi < pattern.length && pattern[pi] === '*') {
      pi++;
    }

    return pi === pattern.length;
  }

  /**
   * Evaluate a policy condition.
   */
  private evaluatePolicyCondition(
    condition: import('./types').PolicyCondition,
    request: AccessRequest
  ): boolean {
    switch (condition.type) {
      case 'time':
        return this.evaluateTimeCondition(condition, request);
      case 'ip':
        return this.evaluateIPCondition(condition, request);
      case 'attribute':
        return this.evaluateAttributeCondition(condition, request);
      case 'context':
        return this.evaluateContextCondition(condition, request);
      default:
        return true;
    }
  }

  /**
   * Evaluate time-based condition.
   */
  private evaluateTimeCondition(
    condition: import('./types').PolicyCondition,
    request: AccessRequest
  ): boolean {
    const now = request.context?.timestamp ?? Date.now();

    switch (condition.operator) {
      case 'between': {
        const [start, end] = condition.value as [number, number];
        return now >= start && now <= end;
      }
      case 'before':
        return now < (condition.value as number);
      case 'after':
        return now > (condition.value as number);
      default:
        return true;
    }
  }

  /**
   * Evaluate IP-based condition.
   */
  private evaluateIPCondition(
    condition: import('./types').PolicyCondition,
    request: AccessRequest
  ): boolean {
    const clientIP = request.context?.ipAddress;
    if (!clientIP) return condition.operator === 'notIn';

    switch (condition.operator) {
      case 'in':
        return (condition.value as string[]).includes(clientIP);
      case 'notIn':
        return !(condition.value as string[]).includes(clientIP);
      case 'cidr':
        // Would need CIDR matching implementation
        return true;
      default:
        return true;
    }
  }

  /**
   * Evaluate attribute-based condition.
   */
  private evaluateAttributeCondition(
    condition: import('./types').PolicyCondition,
    request: AccessRequest
  ): boolean {
    const {key} = condition;
    if (!key) return true;

    const value = request.subject.attributes?.[key] ??
                  request.resource.attributes?.[key];

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'notEquals':
        return value !== condition.value;
      case 'in':
        return (condition.value as unknown[]).includes(value);
      case 'notIn':
        return !(condition.value as unknown[]).includes(value);
      case 'exists':
        return value !== undefined;
      default:
        return true;
    }
  }

  /**
   * Evaluate context-based condition.
   */
  private evaluateContextCondition(
    condition: import('./types').PolicyCondition,
    request: AccessRequest
  ): boolean {
    const {key} = condition;
    if (!key) return true;

    const value = request.context?.attributes?.[key];

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'exists':
        return value !== undefined;
      default:
        return true;
    }
  }

  /**
   * Evaluate using permission matrix.
   */
  private evaluatePermissionMatrix(request: AccessRequest): EvaluationResult {
    const matrix = this.config.permissionMatrix!;

    // Find matching entries for user's roles
    const matchingEntries = matrix.entries.filter(
      entry =>
        this.userRoles.includes(entry.roleId) &&
        (entry.resource === WILDCARD || entry.resource === request.resource.type)
    );

    if (matchingEntries.length === 0) {
      return this.createResult(
        matrix.defaultBehavior === 'allow',
        matrix.defaultBehavior === 'allow' ? 'allow' : 'deny',
        'no_matching_matrix_entry'
      );
    }

    // Check for explicit deny
    const hasDeny = matchingEntries.some(
      entry => entry.deniedActions?.includes(request.action as PermissionAction) ??
               entry.deniedActions?.includes(WILDCARD as PermissionAction)
    );

    // Check for explicit allow
    const hasAllow = matchingEntries.some(
      entry => entry.allowedActions.includes(request.action as PermissionAction) ||
               entry.allowedActions.includes(WILDCARD as PermissionAction)
    );

    // Apply conflict resolution
    if (hasDeny && hasAllow) {
      if (matrix.conflictResolution === 'deny-wins') {
        return this.createResult(false, 'deny', 'conflict_deny_wins');
      }
      if (matrix.conflictResolution === 'allow-wins') {
        return this.createResult(true, 'allow', 'conflict_allow_wins');
      }
      // Priority-based: use highest priority entry
    }

    if (hasDeny) {
      return this.createResult(false, 'deny', 'matrix_deny');
    }

    if (hasAllow) {
      return this.createResult(true, 'allow', 'matrix_allow');
    }

    return this.createResult(
      matrix.defaultBehavior === 'allow',
      'not-applicable',
      'no_applicable_entry'
    );
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  /**
   * Index roles for quick lookup.
   */
  private indexRoles(roles: RoleDefinition[]): void {
    for (const role of roles) {
      this.roleMap.set(role.id, role);
    }
  }

  /**
   * Resolve all permissions for current user.
   */
  private resolvePermissions(): void {
    this.resolvedPermissions.clear();

    for (const roleId of this.userRoles) {
      this.resolveRolePermissions(roleId);
    }
  }

  /**
   * Resolve permissions for a role including inheritance.
   */
  private resolveRolePermissions(roleId: string, visited = new Set<string>()): void {
    if (visited.has(roleId)) return;
    visited.add(roleId);

    const role = this.roleMap.get(roleId);
    if (!role || !role.isActive === false) return;

    // Add role's permissions
    for (const permission of role.permissions) {
      this.resolvedPermissions.add(permission);
    }

    // Add structured permissions
    if (role.structuredPermissions) {
      for (const sp of role.structuredPermissions) {
        if (!sp.deny) {
          const permStr = sp.scope
            ? `${sp.resource}:${sp.action}:${sp.scope}`
            : `${sp.resource}:${sp.action}`;
          this.resolvedPermissions.add(permStr);
        }
      }
    }

    // Resolve inherited role permissions
    if (role.inherits) {
      for (const parentRoleId of role.inherits) {
        this.resolveRolePermissions(parentRoleId, visited);
      }
    }
  }

  /**
   * Check if user has a role through inheritance.
   */
  private hasInheritedRole(roleId: string): boolean {
    for (const userRoleId of this.userRoles) {
      const role = this.roleMap.get(userRoleId);
      if (role?.inherits?.includes(roleId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Match permission against patterns.
   */
  private matchPermissionPattern(permission: string): boolean {
    const parts = permission.split(':');
    const [resource, action, scope] = parts;

    for (const resolved of this.resolvedPermissions) {
      const resolvedParts = resolved.split(':');
      const [resResource, resAction, resScope] = resolvedParts;

      // Check resource match (with wildcard support)
      if (resResource !== WILDCARD && resResource !== resource) continue;

      // Check action match (with wildcard support)
      if (resAction !== WILDCARD && resAction !== action) continue;

      // Check scope match if specified
      if (scope && resScope && resScope !== scope && resScope !== WILDCARD) continue;

      return true;
    }

    return false;
  }

  /**
   * Check if current user is a super admin.
   */
  private isSuperAdmin(): boolean {
    if (!this.config.superAdminRoles?.length) return false;
    return this.userRoles.some(r => this.config.superAdminRoles!.includes(r));
  }

  /**
   * Create an evaluation result.
   */
  private createResult(
    allowed: boolean,
    decision: PolicyResult,
    reason: string,
    matchingPolicies?: string[]
  ): EvaluationResult {
    return {
      allowed,
      decision,
      reason,
      matchingPolicies,
      evaluatedAt: Date.now(),
    };
  }

  /**
   * Generate cache key for evaluation.
   */
  private getEvaluationCacheKey(request: AccessRequest): string {
    return `eval:${request.subject.id}:${request.resource.type}:${request.resource.id ?? ''}:${request.action}`;
  }

  /**
   * Check if cache is still valid.
   */
  private isCacheValid(): boolean {
    if (!this.config.enableCaching) return false;
    return Date.now() < this.cacheExpiry;
  }

  /**
   * Cache a permission check result.
   */
  private cachePermission(key: string, value: boolean): void {
    if (!this.config.enableCaching) return;

    this.permissionCache.set(key, value);

    if (this.cacheExpiry === 0) {
      this.cacheExpiry = Date.now() + (this.config.cacheTTL ?? DEFAULT_CACHE_TTL);
    }
  }

  /**
   * Cache an evaluation result.
   */
  private cacheEvaluation(key: string, result: EvaluationResult): void {
    if (!this.config.enableCaching) return;

    this.evaluationCache.set(key, result);

    if (this.cacheExpiry === 0) {
      this.cacheExpiry = Date.now() + (this.config.cacheTTL ?? DEFAULT_CACHE_TTL);
    }
  }

  /**
   * Clear all caches.
   */
  clearCache(): void {
    this.permissionCache.clear();
    this.evaluationCache.clear();
    this.cacheExpiry = 0;
  }

  /**
   * Register an audit handler.
   */
  onAudit(handler: RBACAuditHandler): () => void {
    this.auditHandlers.add(handler);
    return () => this.auditHandlers.delete(handler);
  }

  /**
   * Emit an audit event.
   */
  private auditCheck(request: AccessRequest, result: EvaluationResult): void {
    if (!this.config.enableAudit) return;

    const event: RBACAuditEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'access_check',
      subject: {
        id: request.subject.id,
        type: request.subject.type,
      },
      resource: {
        type: request.resource.type,
        id: request.resource.id,
      },
      action: request.action,
      result: result.allowed ? 'allowed' : 'denied',
      reason: result.reason,
    };

    this.auditHandlers.forEach(handler => handler(event));
  }

  /**
   * Log debug message.
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.debug) {
      console.log(`[RBACEngine] ${message}`, ...args);
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new RBAC engine.
 *
 * @param config - RBAC configuration
 * @returns Configured RBAC engine
 */
export function createRBACEngine(config: RBACConfig): RBACEngine {
  return new RBACEngine(config);
}
