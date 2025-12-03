/**
 * Policy Evaluator
 *
 * ABAC-style policy evaluation engine for fine-grained access control.
 * Supports complex conditions, combining algorithms, and obligations.
 *
 * @module auth/rbac/policy-evaluator
 */

import type {
  Policy,
  PolicySet,
  PolicyResult,
  PolicyEffect,
  PolicySubject,
  PolicyResource,
  PolicyCondition,
  AccessRequest,
  EvaluationResult,
  Obligation,
} from './types';

// =============================================================================
// Types
// =============================================================================

/**
 * Policy evaluation context.
 */
export interface EvaluationContext {
  /** Current timestamp */
  now: number;
  /** Client IP address */
  clientIp?: string;
  /** User agent */
  userAgent?: string;
  /** Additional context attributes */
  attributes?: Record<string, unknown>;
}

/**
 * Individual policy evaluation result.
 */
interface PolicyEvaluationResult {
  /** Policy ID */
  policyId: string;
  /** Evaluation result */
  result: PolicyResult;
  /** Policy effect if applicable */
  effect?: PolicyEffect;
  /** Obligations from this policy */
  obligations?: Obligation[];
  /** Advice from this policy */
  advice?: string[];
  /** Evaluation details */
  details?: string;
}

// =============================================================================
// Policy Evaluator Class
// =============================================================================

/**
 * Policy Evaluator for ABAC-style access control.
 *
 * Evaluates access requests against policy sets using configurable
 * combining algorithms and condition evaluation.
 *
 * @example
 * ```typescript
 * const evaluator = new PolicyEvaluator();
 *
 * // Add policies
 * evaluator.addPolicy({
 *   id: 'admin-full-access',
 *   name: 'Admin Full Access',
 *   effect: 'allow',
 *   priority: 100,
 *   subjects: [{ type: 'role', identifier: 'admin' }],
 *   resources: [{ type: '*' }],
 *   actions: ['*'],
 *   enabled: true,
 * });
 *
 * // Evaluate request
 * const result = evaluator.evaluate({
 *   subject: { id: 'user-123', type: 'user', roles: ['admin'] },
 *   resource: { type: 'documents', id: 'doc-456' },
 *   action: 'delete',
 * });
 *
 * console.log(result.allowed); // true
 * ```
 */
export class PolicyEvaluator {
  private policies: Map<string, Policy>;
  private policySets: Map<string, PolicySet>;
  private readonly defaultCombiningAlgorithm: PolicySet['combiningAlgorithm'];
  private readonly debug: boolean;

  constructor(options?: {
    defaultCombiningAlgorithm?: PolicySet['combiningAlgorithm'];
    debug?: boolean;
  }) {
    this.policies = new Map();
    this.policySets = new Map();
    this.defaultCombiningAlgorithm = options?.defaultCombiningAlgorithm ?? 'deny-overrides';
    this.debug = options?.debug ?? false;
  }

  // ===========================================================================
  // Policy Management
  // ===========================================================================

  /**
   * Add a policy.
   *
   * @param policy - Policy to add
   */
  addPolicy(policy: Policy): void {
    this.policies.set(policy.id, policy);
  }

  /**
   * Add multiple policies.
   *
   * @param policies - Policies to add
   */
  addPolicies(policies: Policy[]): void {
    for (const policy of policies) {
      this.addPolicy(policy);
    }
  }

  /**
   * Remove a policy.
   *
   * @param policyId - Policy ID to remove
   */
  removePolicy(policyId: string): void {
    this.policies.delete(policyId);
  }

  /**
   * Update a policy.
   *
   * @param policyId - Policy ID to update
   * @param updates - Partial updates
   */
  updatePolicy(policyId: string, updates: Partial<Policy>): void {
    const existing = this.policies.get(policyId);
    if (existing) {
      this.policies.set(policyId, { ...existing, ...updates });
    }
  }

  /**
   * Get a policy by ID.
   *
   * @param policyId - Policy ID
   * @returns Policy or undefined
   */
  getPolicy(policyId: string): Policy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Get all policies.
   *
   * @returns Array of all policies
   */
  getAllPolicies(): Policy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Add a policy set.
   *
   * @param policySet - Policy set to add
   */
  addPolicySet(policySet: PolicySet): void {
    this.policySets.set(policySet.id, policySet);
  }

  /**
   * Remove a policy set.
   *
   * @param policySetId - Policy set ID
   */
  removePolicySet(policySetId: string): void {
    this.policySets.delete(policySetId);
  }

  // ===========================================================================
  // Evaluation
  // ===========================================================================

  /**
   * Evaluate an access request.
   *
   * @param request - Access request
   * @param context - Additional evaluation context
   * @returns Evaluation result
   */
  evaluate(request: AccessRequest, context?: EvaluationContext): EvaluationResult {
    const startTime = Date.now();
    const evaluationContext = this.buildContext(context);

    this.log('Evaluating request:', request);

    // Get all applicable policies (from policy sets and standalone)
    const applicablePolicies = this.getApplicablePolicies(request);

    if (applicablePolicies.length === 0) {
      return {
        allowed: false,
        decision: 'not-applicable',
        reason: 'No applicable policies found',
        evaluatedAt: Date.now(),
        evaluationTime: Date.now() - startTime,
      };
    }

    // Evaluate each policy
    const policyResults = applicablePolicies.map((policy) =>
      this.evaluatePolicy(policy, request, evaluationContext)
    );

    // Combine results
    const combinedResult = this.combineResults(policyResults, this.defaultCombiningAlgorithm);

    combinedResult.evaluationTime = Date.now() - startTime;

    this.log('Evaluation result:', combinedResult);

    return combinedResult;
  }

  /**
   * Evaluate using a specific policy set.
   *
   * @param policySetId - Policy set ID
   * @param request - Access request
   * @param context - Additional context
   * @returns Evaluation result
   */
  evaluatePolicySet(
    policySetId: string,
    request: AccessRequest,
    context?: EvaluationContext
  ): EvaluationResult {
    const policySet = this.policySets.get(policySetId);

    if (!policySet) {
      return {
        allowed: false,
        decision: 'indeterminate',
        reason: `Policy set '${policySetId}' not found`,
        evaluatedAt: Date.now(),
      };
    }

    const evaluationContext = this.buildContext(context);

    // Check if request matches policy set target
    if (policySet.target && !this.matchesTarget(policySet.target, request)) {
      return {
        allowed: false,
        decision: 'not-applicable',
        reason: 'Request does not match policy set target',
        evaluatedAt: Date.now(),
      };
    }

    // Evaluate policies in the set
    const policyResults = policySet.policies
      .filter((p) => p.enabled)
      .map((policy) => this.evaluatePolicy(policy, request, evaluationContext));

    return this.combineResults(policyResults, policySet.combiningAlgorithm);
  }

  // ===========================================================================
  // Policy Evaluation
  // ===========================================================================

  /**
   * Evaluate a single policy.
   */
  private evaluatePolicy(
    policy: Policy,
    request: AccessRequest,
    context: EvaluationContext
  ): PolicyEvaluationResult {
    // Check if policy is enabled
    if (!policy.enabled) {
      return {
        policyId: policy.id,
        result: 'not-applicable',
        details: 'Policy is disabled',
      };
    }

    // Evaluate subjects
    if ((policy.subjects?.length ?? 0) > 0 && policy.subjects !== undefined) {
      const subjectMatch = this.evaluateSubjects(policy.subjects, request);
      if (!subjectMatch) {
        return {
          policyId: policy.id,
          result: 'not-applicable',
          details: 'Subject does not match',
        };
      }
    }

    // Evaluate resources
    if ((policy.resources?.length ?? 0) > 0) {
      const resourceMatch = this.evaluateResources(policy.resources ?? [], request);
      if (!resourceMatch) {
        return {
          policyId: policy.id,
          result: 'not-applicable',
          details: 'Resource does not match',
        };
      }
    }

    // Evaluate actions
    if ((policy.actions?.length ?? 0) > 0) {
      const actionMatch = this.evaluateActions(policy.actions ?? [], request);
      if (!actionMatch) {
        return {
          policyId: policy.id,
          result: 'not-applicable',
          details: 'Action does not match',
        };
      }
    }

    // Evaluate conditions
    if ((policy.conditions?.length ?? 0) > 0) {
      const conditionsMatch = this.evaluateConditions(policy.conditions ?? [], request, context);
      if (!conditionsMatch) {
        return {
          policyId: policy.id,
          result: 'not-applicable',
          details: 'Conditions not met',
        };
      }
    }

    // Policy matches - return its effect
    return {
      policyId: policy.id,
      result: policy.effect === 'allow' ? 'allow' : 'deny',
      effect: policy.effect,
      details: `Policy ${policy.id} applies with effect: ${policy.effect}`,
    };
  }

  /**
   * Evaluate subject matching.
   */
  private evaluateSubjects(subjects: PolicySubject[], request: AccessRequest): boolean {
    return subjects.some((subject) => {
      switch (subject.type) {
        case 'user':
          return this.matchIdentifier(subject, request.subject.id);

        case 'role':
          return (
            request.subject.roles?.some((role) => this.matchIdentifier(subject, role)) ?? false
          );

        case 'group':
          // Would need group info in request
          return false;

        case 'attribute': {
          const attrValue = request.subject.attributes?.[subject.identifier];
          return subject.value === undefined || attrValue === subject.value;
        }

        default:
          return false;
      }
    });
  }

  /**
   * Evaluate resource matching.
   */
  private evaluateResources(resources: PolicyResource[], request: AccessRequest): boolean {
    return resources.some((resource) => {
      // Check resource type
      if (resource.type !== '*' && resource.type !== request.resource.type) {
        return false;
      }

      // Check resource identifier
      if (
        resource.identifier !== null &&
        resource.identifier !== undefined &&
        resource.identifier !== '' &&
        resource.identifier !== '*'
      ) {
        if (
          request.resource.id !== null &&
          request.resource.id !== undefined &&
          request.resource.id !== '' &&
          !this.matchWildcard(resource.identifier, request.resource.id)
        ) {
          return false;
        }
      }

      // Check resource attributes
      if (resource.attributes) {
        for (const [key, value] of Object.entries(resource.attributes)) {
          if (request.resource.attributes?.[key] !== value) {
            return false;
          }
        }
      }

      return true;
    });
  }

  /**
   * Evaluate action matching.
   */
  private evaluateActions(actions: string[], request: AccessRequest): boolean {
    return actions.some((action) => action === '*' || action === request.action);
  }

  /**
   * Evaluate policy conditions.
   */
  private evaluateConditions(
    conditions: PolicyCondition[],
    request: AccessRequest,
    context: EvaluationContext
  ): boolean {
    return conditions.every((condition) => this.evaluateCondition(condition, request, context));
  }

  /**
   * Evaluate a single condition.
   */
  private evaluateCondition(
    condition: PolicyCondition,
    request: AccessRequest,
    context: EvaluationContext
  ): boolean {
    switch (condition.type) {
      case 'time':
        return this.evaluateTimeCondition(condition, context);

      case 'ip':
        return this.evaluateIPCondition(condition, request, context);

      case 'location':
        return this.evaluateLocationCondition(condition, request);

      case 'attribute':
        return this.evaluateAttributeCondition(condition, request);

      case 'context':
        return this.evaluateContextCondition(condition, request, context);

      case 'custom':
        return this.evaluateCustomCondition(condition, request, context);

      default:
        return true;
    }
  }

  /**
   * Evaluate time-based condition.
   */
  private evaluateTimeCondition(condition: PolicyCondition, context: EvaluationContext): boolean {
    const { now } = context;

    switch (condition.operator) {
      case 'between': {
        const [start, end] = condition.value as [number, number];
        return now >= start && now <= end;
      }

      case 'before':
        return now < (condition.value as number);

      case 'after':
        return now > (condition.value as number);

      case 'dayOfWeek': {
        const day = new Date(now).getDay();
        const allowedDays = condition.value as number[];
        return allowedDays.includes(day);
      }

      case 'timeOfDay': {
        const date = new Date(now);
        const timeValue = date.getHours() * 60 + date.getMinutes();
        const [startTime, endTime] = condition.value as [number, number];
        return timeValue >= startTime && timeValue <= endTime;
      }

      default:
        return true;
    }
  }

  /**
   * Evaluate IP-based condition.
   */
  private evaluateIPCondition(
    condition: PolicyCondition,
    request: AccessRequest,
    context: EvaluationContext
  ): boolean {
    const clientIp = request.context?.ipAddress ?? context.clientIp;

    if (clientIp === null || clientIp === undefined || clientIp === '') {
      return condition.operator === 'notIn';
    }

    switch (condition.operator) {
      case 'equals':
        return clientIp === condition.value;

      case 'in':
        return (condition.value as string[]).includes(clientIp);

      case 'notIn':
        return !(condition.value as string[]).includes(clientIp);

      case 'startsWith':
        return clientIp.startsWith(condition.value as string);

      default:
        return true;
    }
  }

  /**
   * Evaluate location-based condition.
   */
  private evaluateLocationCondition(condition: PolicyCondition, request: AccessRequest): boolean {
    const location = request.context?.location;

    if (!location) {
      return condition.operator === 'notIn';
    }

    const key = condition.key as keyof typeof location;
    const value = location[key];

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;

      case 'in':
        return (condition.value as string[]).includes(value as string);

      case 'notIn':
        return !(condition.value as string[]).includes(value as string);

      default:
        return true;
    }
  }

  /**
   * Evaluate attribute-based condition.
   */
  private evaluateAttributeCondition(condition: PolicyCondition, request: AccessRequest): boolean {
    const { key } = condition;
    if (key === null || key === undefined || key === '') return true;

    // Check subject attributes first, then resource attributes
    const value = request.subject.attributes?.[key] ?? request.resource.attributes?.[key];

    return this.compareValue(condition.operator, value, condition.value);
  }

  /**
   * Evaluate context-based condition.
   */
  private evaluateContextCondition(
    condition: PolicyCondition,
    request: AccessRequest,
    context: EvaluationContext
  ): boolean {
    const { key } = condition;
    if (key === null || key === undefined || key === '') return true;

    const value = request.context?.attributes?.[key] ?? context.attributes?.[key];

    return this.compareValue(condition.operator, value, condition.value);
  }

  /**
   * Evaluate custom condition (can be extended).
   */
  private evaluateCustomCondition(
    condition: PolicyCondition,
    _request: AccessRequest,
    _context: EvaluationContext
  ): boolean {
    // Custom conditions can be implemented by extending this class
    this.log('Custom condition evaluation not implemented:', condition);
    return true;
  }

  /**
   * Compare values using operator.
   */
  private compareValue(operator: string, actual: unknown, expected: unknown): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;

      case 'notEquals':
        return actual !== expected;

      case 'in':
        return (expected as unknown[]).includes(actual);

      case 'notIn':
        return !(expected as unknown[]).includes(actual);

      case 'contains':
        return String(actual).includes(String(expected));

      case 'startsWith':
        return String(actual).startsWith(String(expected));

      case 'endsWith':
        return String(actual).endsWith(String(expected));

      case 'greaterThan':
        return (actual as number) > (expected as number);

      case 'lessThan':
        return (actual as number) < (expected as number);

      case 'exists':
        return actual !== undefined && actual !== null;

      case 'regex':
        return new RegExp(expected as string).test(String(actual));

      default:
        return true;
    }
  }

  // ===========================================================================
  // Result Combination
  // ===========================================================================

  /**
   * Combine policy evaluation results using combining algorithm.
   */
  private combineResults(
    results: PolicyEvaluationResult[],
    algorithm: PolicySet['combiningAlgorithm']
  ): EvaluationResult {
    const applicableResults = results.filter((r) => r.result !== 'not-applicable');
    const matchingPolicies = applicableResults.map((r) => r.policyId);

    if (applicableResults.length === 0) {
      return {
        allowed: false,
        decision: 'not-applicable',
        reason: 'No applicable policies',
        matchingPolicies: [],
        evaluatedAt: Date.now(),
      };
    }

    switch (algorithm) {
      case 'deny-overrides':
        return this.denyOverrides(applicableResults, matchingPolicies);

      case 'permit-overrides':
        return this.permitOverrides(applicableResults, matchingPolicies);

      case 'first-applicable':
        return this.firstApplicable(applicableResults, matchingPolicies);

      case 'ordered-deny-overrides':
        return this.orderedDenyOverrides(applicableResults, matchingPolicies);

      case 'ordered-permit-overrides':
        return this.orderedPermitOverrides(applicableResults, matchingPolicies);

      default:
        return this.denyOverrides(applicableResults, matchingPolicies);
    }
  }

  /**
   * Deny-overrides combining algorithm.
   */
  private denyOverrides(
    results: PolicyEvaluationResult[],
    matchingPolicies: string[]
  ): EvaluationResult {
    const hasDeny = results.some((r) => r.result === 'deny');
    const hasAllow = results.some((r) => r.result === 'allow');

    if (hasDeny) {
      return {
        allowed: false,
        decision: 'deny',
        reason: 'Deny policy matched',
        matchingPolicies,
        evaluatedAt: Date.now(),
      };
    }

    if (hasAllow) {
      return {
        allowed: true,
        decision: 'allow',
        reason: 'Allow policy matched, no deny',
        matchingPolicies,
        evaluatedAt: Date.now(),
      };
    }

    return {
      allowed: false,
      decision: 'indeterminate',
      reason: 'No conclusive policy decision',
      matchingPolicies,
      evaluatedAt: Date.now(),
    };
  }

  /**
   * Permit-overrides combining algorithm.
   */
  private permitOverrides(
    results: PolicyEvaluationResult[],
    matchingPolicies: string[]
  ): EvaluationResult {
    const hasAllow = results.some((r) => r.result === 'allow');
    const hasDeny = results.some((r) => r.result === 'deny');

    if (hasAllow) {
      return {
        allowed: true,
        decision: 'allow',
        reason: 'Allow policy matched',
        matchingPolicies,
        evaluatedAt: Date.now(),
      };
    }

    if (hasDeny) {
      return {
        allowed: false,
        decision: 'deny',
        reason: 'Deny policy matched, no allow',
        matchingPolicies,
        evaluatedAt: Date.now(),
      };
    }

    return {
      allowed: false,
      decision: 'indeterminate',
      reason: 'No conclusive policy decision',
      matchingPolicies,
      evaluatedAt: Date.now(),
    };
  }

  /**
   * First-applicable combining algorithm.
   */
  private firstApplicable(
    results: PolicyEvaluationResult[],
    matchingPolicies: string[]
  ): EvaluationResult {
    for (const result of results) {
      if (result.result === 'allow' || result.result === 'deny') {
        return {
          allowed: result.result === 'allow',
          decision: result.result,
          reason: `First applicable policy: ${result.policyId}`,
          matchingPolicies: [result.policyId],
          evaluatedAt: Date.now(),
        };
      }
    }

    return {
      allowed: false,
      decision: 'not-applicable',
      reason: 'No applicable policy found',
      matchingPolicies,
      evaluatedAt: Date.now(),
    };
  }

  /**
   * Ordered-deny-overrides (respects policy priority).
   */
  private orderedDenyOverrides(
    results: PolicyEvaluationResult[],
    matchingPolicies: string[]
  ): EvaluationResult {
    // Sort by priority (handled during policy collection)
    return this.denyOverrides(results, matchingPolicies);
  }

  /**
   * Ordered-permit-overrides (respects policy priority).
   */
  private orderedPermitOverrides(
    results: PolicyEvaluationResult[],
    matchingPolicies: string[]
  ): EvaluationResult {
    return this.permitOverrides(results, matchingPolicies);
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Build evaluation context.
   */
  private buildContext(context?: EvaluationContext): EvaluationContext {
    return {
      now: Date.now(),
      ...context,
    };
  }

  /**
   * Get all applicable policies for a request.
   */
  private getApplicablePolicies(request: AccessRequest): Policy[] {
    const policies: Policy[] = [];

    // Add standalone policies
    for (const policy of this.policies.values()) {
      if (policy.enabled) {
        policies.push(policy);
      }
    }

    // Add policies from policy sets that match the request
    for (const policySet of this.policySets.values()) {
      if (!policySet.target || this.matchesTarget(policySet.target, request)) {
        for (const policy of policySet.policies) {
          if (policy.enabled) {
            policies.push(policy);
          }
        }
      }
    }

    // Sort by priority (higher first)
    return policies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Check if request matches policy set target.
   */
  private matchesTarget(targets: PolicyResource[], request: AccessRequest): boolean {
    return this.evaluateResources(targets, request);
  }

  /**
   * Match identifier with pattern support.
   */
  private matchIdentifier(subject: PolicySubject, value: string): boolean {
    const { identifier, match = 'exact' } = subject;

    switch (match) {
      case 'any':
        return true;
      case 'pattern':
        return this.matchWildcard(identifier, value);
      case 'exact':
      default:
        return identifier === value;
    }
  }

  /**
   * Match string with wildcard pattern.
   */
  private matchWildcard(pattern: string, value: string): boolean {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
    return regex.test(value);
  }

  /**
   * Log debug message.
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.debug) {
      console.info(`[PolicyEvaluator] ${message}`, ...args);
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new policy evaluator.
 *
 * @param options - Evaluator options
 * @returns PolicyEvaluator instance
 */
export function createPolicyEvaluator(options?: {
  policies?: Policy[];
  policySets?: PolicySet[];
  defaultCombiningAlgorithm?: PolicySet['combiningAlgorithm'];
  debug?: boolean;
}): PolicyEvaluator {
  const evaluator = new PolicyEvaluator({
    defaultCombiningAlgorithm: options?.defaultCombiningAlgorithm,
    debug: options?.debug,
  });

  if (options?.policies) {
    evaluator.addPolicies(options.policies);
  }

  if (options?.policySets) {
    for (const policySet of options.policySets) {
      evaluator.addPolicySet(policySet);
    }
  }

  return evaluator;
}
