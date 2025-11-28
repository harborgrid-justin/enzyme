/**
 * @fileoverview User segmentation for feature flag targeting.
 *
 * Provides comprehensive segment management including:
 * - Rule-based segment membership
 * - Explicit user inclusion/exclusion
 * - Segment composition (union, intersection)
 * - Segment caching and optimization
 *
 * @module flags/advanced/flag-segments
 *
 * @example
 * ```typescript
 * const matcher = new SegmentMatcher();
 *
 * const betaUsers: Segment = {
 *   id: 'beta-users',
 *   name: 'Beta Users',
 *   rules: {
 *     operator: 'or',
 *     conditions: [
 *       { attribute: 'user.isBeta', operator: 'equals', value: true },
 *       { attribute: 'user.email', operator: 'endsWith', value: '@company.com' },
 *     ],
 *   },
 *   updatedAt: new Date(),
 * };
 *
 * const isInSegment = matcher.matches(betaUsers, context);
 * ```
 */

import type {
  Segment,
  SegmentId,
  UserId,
  EvaluationContext,
  ConditionGroup,
  TargetingCondition,
  JsonValue,
} from './types';
// import type { Mutable } from '../../utils/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of segment matching.
 */
export interface SegmentMatchResult {
  /** Whether the context matches the segment */
  readonly matched: boolean;
  /** The segment that was matched */
  readonly segmentId: SegmentId;
  /** Reason for the match result */
  readonly reason: SegmentMatchReason;
  /** Detailed match information */
  readonly details?: SegmentMatchDetails;
}

/**
 * Reasons for segment match results.
 */
export type SegmentMatchReason =
  | 'RULE_MATCH'
  | 'EXPLICIT_INCLUDE'
  | 'EXPLICIT_EXCLUDE'
  | 'NO_MATCH';

/**
 * Detailed information about segment matching.
 */
export interface SegmentMatchDetails {
  /** Rules that were evaluated */
  readonly rulesEvaluated: number;
  /** Evaluation time in ms */
  readonly evaluationTimeMs: number;
  /** Specific conditions that matched */
  readonly matchedConditions?: string[];
}

/**
 * Segment composition operations.
 */
export type SegmentCompositionOp = 'union' | 'intersection' | 'difference';

/**
 * A composed segment.
 */
export interface ComposedSegment {
  /** The operation to perform */
  readonly operation: SegmentCompositionOp;
  /** Segments to compose */
  readonly segments: readonly SegmentId[];
}

// ============================================================================
// Segment Matcher
// ============================================================================

/**
 * Matches evaluation contexts against segment definitions.
 */
export class SegmentMatcher {
  private cache = new Map<string, { result: boolean; expiresAt: number }>();
  private cacheTtl: number;

  constructor(options: { cacheTtl?: number } = {}) {
    this.cacheTtl = options.cacheTtl ?? 60000; // 1 minute default
  }

  /**
   * Check if a context matches a segment.
   */
  matches(segment: Segment, context: EvaluationContext): boolean {
    const result = this.matchWithDetails(segment, context);
    return result.matched;
  }

  /**
   * Check if a context matches a segment with detailed results.
   */
  matchWithDetails(
    segment: Segment,
    context: EvaluationContext
  ): SegmentMatchResult {
    const startTime = performance.now();
    const userId = context.user?.id;

    // Check cache
    const cacheKey = this.getCacheKey(segment.id, context);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        matched: cached.result,
        segmentId: segment.id,
        reason: cached.result ? 'RULE_MATCH' : 'NO_MATCH',
      };
    }

    // Check explicit exclusions first
    if (userId != null && userId !== '' && segment.excludedUsers?.includes(userId) === true) {
      this.cacheResult(cacheKey, false);
      return {
        matched: false,
        segmentId: segment.id,
        reason: 'EXPLICIT_EXCLUDE',
        details: {
          rulesEvaluated: 0,
          evaluationTimeMs: performance.now() - startTime,
        },
      };
    }

    // Check explicit inclusions
    if (userId != null && userId !== '' && segment.includedUsers?.includes(userId) === true) {
      this.cacheResult(cacheKey, true);
      return {
        matched: true,
        segmentId: segment.id,
        reason: 'EXPLICIT_INCLUDE',
        details: {
          rulesEvaluated: 0,
          evaluationTimeMs: performance.now() - startTime,
        },
      };
    }

    // Evaluate rules
    const matchedConditions: string[] = [];
    const matched = this.evaluateConditionGroup(
      segment.rules,
      context,
      matchedConditions
    );

    this.cacheResult(cacheKey, matched);

    return {
      matched,
      segmentId: segment.id,
      reason: matched ? 'RULE_MATCH' : 'NO_MATCH',
      details: {
        rulesEvaluated: matchedConditions.length,
        evaluationTimeMs: performance.now() - startTime,
        matchedConditions: matched ? matchedConditions : undefined,
      },
    };
  }

  /**
   * Check if a context matches any of the given segments.
   */
  matchesAny(
    segments: readonly Segment[],
    context: EvaluationContext
  ): { matched: boolean; matchedSegment?: Segment } {
    for (const segment of segments) {
      if (this.matches(segment, context)) {
        return { matched: true, matchedSegment: segment };
      }
    }
    return { matched: false };
  }

  /**
   * Check if a context matches all of the given segments.
   */
  matchesAll(
    segments: readonly Segment[],
    context: EvaluationContext
  ): boolean {
    return segments.every((segment) => this.matches(segment, context));
  }

  /**
   * Get all segments that match a context.
   */
  getMatchingSegments(
    segments: readonly Segment[],
    context: EvaluationContext
  ): Segment[] {
    return segments.filter((segment) => this.matches(segment, context));
  }

  // ==========================================================================
  // Condition Evaluation
  // ==========================================================================

  private evaluateConditionGroup(
    group: ConditionGroup,
    context: EvaluationContext,
    matchedConditions: string[]
  ): boolean {
    if (group.operator === 'and') {
      return group.conditions.every((condition) =>
        this.evaluateConditionOrGroup(condition, context, matchedConditions)
      );
    } else {
      return group.conditions.some((condition) =>
        this.evaluateConditionOrGroup(condition, context, matchedConditions)
      );
    }
  }

  private evaluateConditionOrGroup(
    conditionOrGroup: TargetingCondition | ConditionGroup,
    context: EvaluationContext,
    matchedConditions: string[]
  ): boolean {
    if ('operator' in conditionOrGroup && 'conditions' in conditionOrGroup) {
      return this.evaluateConditionGroup(
        conditionOrGroup,
        context,
        matchedConditions
      );
    } else {
      return this.evaluateCondition(
        conditionOrGroup,
        context,
        matchedConditions
      );
    }
  }

  private evaluateCondition(
    condition: TargetingCondition,
    context: EvaluationContext,
    matchedConditions: string[]
  ): boolean {
    const actualValue = this.resolveAttributePath(condition.attribute, context);
    let matched = this.compare(
      actualValue,
      condition.operator,
      condition.value,
      condition.caseSensitive ?? true
    );

    if (condition.negate === true) {
      matched = !matched;
    }

    if (matched) {
      matchedConditions.push(condition.attribute);
    }

    return matched;
  }

  private resolveAttributePath(
    path: string,
    context: EvaluationContext
  ): JsonValue | undefined {
    const parts = path.split('.');
    let current: unknown = context;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current as JsonValue | undefined;
  }

  private compare(
    actual: JsonValue | undefined,
    operator: string,
    expected: JsonValue | readonly JsonValue[],
    caseSensitive: boolean
  ): boolean {
    const normalize = (v: unknown): string =>
      caseSensitive ? String(v) : String(v).toLowerCase();

    switch (operator) {
      case 'equals':
        if (typeof actual === 'string' && typeof expected === 'string') {
          return normalize(actual) === normalize(expected);
        }
        return actual === expected;

      case 'notEquals':
        return actual !== expected;

      case 'contains':
        if (typeof actual === 'string' && typeof expected === 'string') {
          return normalize(actual).includes(normalize(expected));
        }
        if (Array.isArray(actual)) {
          return actual.some((item) =>
            caseSensitive
              ? item === expected
              : normalize(item) === normalize(expected)
          );
        }
        return false;

      case 'notContains':
        return !this.compare(actual, 'contains', expected, caseSensitive);

      case 'startsWith':
        return (
          typeof actual === 'string' &&
          typeof expected === 'string' &&
          normalize(actual).startsWith(normalize(expected))
        );

      case 'endsWith':
        return (
          typeof actual === 'string' &&
          typeof expected === 'string' &&
          normalize(actual).endsWith(normalize(expected))
        );

      case 'matches':
        if (typeof actual !== 'string' || typeof expected !== 'string') {
          return false;
        }
        try {
          return new RegExp(expected, caseSensitive ? '' : 'i').test(actual);
        } catch {
          return false;
        }

      case 'in':
        if (!Array.isArray(expected)) return false;
        return expected.some((item) =>
          caseSensitive
            ? actual === item
            : normalize(actual) === normalize(item)
        );

      case 'notIn':
        return !this.compare(actual, 'in', expected, caseSensitive);

      case 'greaterThan':
        return typeof actual === 'number' && typeof expected === 'number' && actual > expected;

      case 'greaterThanOrEquals':
        return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;

      case 'lessThan':
        return typeof actual === 'number' && typeof expected === 'number' && actual < expected;

      case 'lessThanOrEquals':
        return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;

      case 'exists':
        return actual !== undefined && actual !== null;

      case 'notExists':
        return actual === undefined || actual === null;

      default:
        return false;
    }
  }

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  private getCacheKey(segmentId: SegmentId, context: EvaluationContext): string {
    const userId = context.user?.id ?? 'anonymous';
    return `${segmentId}:${userId}`;
  }

  private cacheResult(key: string, result: boolean): void {
    this.cache.set(key, {
      result,
      expiresAt: Date.now() + this.cacheTtl,
    });
  }

  /**
   * Clear the segment cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for a specific segment.
   */
  clearSegmentCache(segmentId: SegmentId): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${segmentId}:`)) {
        this.cache.delete(key);
      }
    }
  }
}

// ============================================================================
// Segment Builder
// ============================================================================

/**
 * Fluent builder for creating segments.
 */
export class SegmentBuilder {
  private segment: Partial<Segment> = {
    includedUsers: [],
    excludedUsers: [],
    tags: [],
  };
  private conditions: (TargetingCondition | ConditionGroup)[] = [];
  private groupOperator: 'and' | 'or' = 'and';

  /**
   * Set the segment ID.
   */
  id(id: SegmentId): this {
    this.segment.id = id;
    return this;
  }

  /**
   * Set the segment name.
   */
  name(name: string): this {
    this.segment.name = name;
    return this;
  }

  /**
   * Set the segment description.
   */
  description(description: string): this {
    this.segment.description = description;
    return this;
  }

  /**
   * Use AND to combine conditions.
   */
  and(): this {
    this.groupOperator = 'and';
    return this;
  }

  /**
   * Use OR to combine conditions.
   */
  or(): this {
    this.groupOperator = 'or';
    return this;
  }

  /**
   * Add a condition.
   */
  where(
    attribute: string,
    operator: TargetingCondition['operator'],
    value: JsonValue | readonly JsonValue[]
  ): this {
    this.conditions.push({ attribute, operator, value });
    return this;
  }

  /**
   * Add an equals condition.
   */
  equals(attribute: string, value: JsonValue): this {
    return this.where(attribute, 'equals', value);
  }

  /**
   * Add an in condition.
   */
  in(attribute: string, values: readonly JsonValue[]): this {
    return this.where(attribute, 'in', values as unknown as JsonValue);
  }

  /**
   * Add a contains condition.
   */
  contains(attribute: string, value: string): this {
    return this.where(attribute, 'contains', value);
  }

  /**
   * Add a starts with condition.
   */
  startsWith(attribute: string, value: string): this {
    return this.where(attribute, 'startsWith', value);
  }

  /**
   * Add an ends with condition.
   */
  endsWith(attribute: string, value: string): this {
    return this.where(attribute, 'endsWith', value);
  }

  /**
   * Add users to explicitly include.
   */
  include(...userIds: UserId[]): this {
    this.segment.includedUsers = [
      ...(this.segment.includedUsers ?? []),
      ...userIds,
    ];
    return this;
  }

  /**
   * Add users to explicitly exclude.
   */
  exclude(...userIds: UserId[]): this {
    this.segment.excludedUsers = [
      ...(this.segment.excludedUsers ?? []),
      ...userIds,
    ];
    return this;
  }

  /**
   * Add tags.
   */
  tag(...tags: string[]): this {
    this.segment.tags = [...(this.segment.tags ?? []), ...tags];
    return this;
  }

  /**
   * Set estimated size.
   */
  estimatedSize(size: number): this {
    this.segment.estimatedSize = size;
    return this;
  }

  /**
   * Build the segment.
   */
  build(): Segment {
    if (this.segment.id == null || this.segment.id === '') {
      throw new Error('Segment ID is required');
    }
    if (this.segment.name == null || this.segment.name === '') {
      throw new Error('Segment name is required');
    }

    return {
      id: this.segment.id,
      name: this.segment.name,
      description: this.segment.description,
      rules: {
        operator: this.groupOperator,
        conditions: this.conditions,
      },
      includedUsers: this.segment.includedUsers,
      excludedUsers: this.segment.excludedUsers,
      estimatedSize: this.segment.estimatedSize,
      updatedAt: new Date(),
      tags: this.segment.tags,
    };
  }
}

/**
 * Create a new segment builder.
 */
export function createSegment(): SegmentBuilder {
  return new SegmentBuilder();
}

// ============================================================================
// Predefined Segment Factories
// ============================================================================

/**
 * Factory functions for common segment patterns.
 */
export const SegmentFactories = {
  /**
   * Create an internal users segment (employees).
   */
  internal(
    id: string = 'internal',
    emailDomain: string = '@company.com'
  ): Segment {
    return createSegment()
      .id(id)
      .name('Internal Users')
      .description('Company employees and internal users')
      .or()
      .endsWith('user.email', emailDomain)
      .equals('user.isInternal', true)
      .tag('internal', 'employees')
      .build();
  },

  /**
   * Create a beta users segment.
   */
  beta(id: string = 'beta'): Segment {
    return createSegment()
      .id(id)
      .name('Beta Users')
      .description('Users enrolled in the beta program')
      .equals('user.isBeta', true)
      .tag('beta')
      .build();
  },

  /**
   * Create a segment for specific plans/tiers.
   */
  plan(id: string, plans: string[]): Segment {
    return createSegment()
      .id(id)
      .name(`${plans.join(' / ')} Users`)
      .description(`Users on ${plans.join(' or ')} plans`)
      .in('user.plan', plans)
      .tag('plan', ...plans)
      .build();
  },

  /**
   * Create a segment for users with specific roles.
   */
  roles(id: string, roles: string[]): Segment {
    return createSegment()
      .id(id)
      .name(`${roles.join(' / ')} Roles`)
      .description(`Users with ${roles.join(' or ')} roles`)
      .where('user.roles', 'contains', roles[0] ?? '')
      .tag('rbac', ...roles)
      .build();
  },

  /**
   * Create a geographic segment.
   */
  country(id: string, countryCodes: string[]): Segment {
    return createSegment()
      .id(id)
      .name(`${countryCodes.join(' / ')} Region`)
      .description(`Users from ${countryCodes.join(' or ')}`)
      .in('network.countryCode', countryCodes)
      .tag('geo', ...countryCodes)
      .build();
  },

  /**
   * Create a mobile users segment.
   */
  mobile(id: string = 'mobile'): Segment {
    return createSegment()
      .id(id)
      .name('Mobile Users')
      .description('Users on mobile devices')
      .in('device.type', ['mobile', 'tablet'])
      .tag('device', 'mobile')
      .build();
  },

  /**
   * Create a new users segment (registered in last N days).
   */
  newUsers(id: string, daysAgo: number): Segment {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    return createSegment()
      .id(id)
      .name(`New Users (${daysAgo} days)`)
      .description(`Users who registered in the last ${daysAgo} days`)
      .where('user.createdAt', 'after', cutoffDate.toISOString())
      .tag('cohort', 'new-users')
      .build();
  },
};

// ============================================================================
// Segment Composition
// ============================================================================

/**
 * Compose segments using set operations.
 */
export function composeSegments(
  segments: Map<SegmentId, Segment>,
  composition: ComposedSegment,
  context: EvaluationContext,
  matcher: SegmentMatcher
): boolean {
  const segmentList = composition.segments
    .map((id) => segments.get(id))
    .filter((s): s is Segment => s !== undefined);

  switch (composition.operation) {
    case 'union':
      return matcher.matchesAny(segmentList, context).matched;

    case 'intersection':
      return matcher.matchesAll(segmentList, context);

    case 'difference': {
      if (segmentList.length < 2) return false;
      const [first, ...rest] = segmentList;
      const firstSegment = first ?? { id: 'dummy', name: 'dummy', rules: { operator: 'and', conditions: [] }, createdAt: new Date(), updatedAt: new Date() } as Segment;
      return (
        matcher.matches(firstSegment, context) &&
        !matcher.matchesAny(rest, context).matched
      );
    }

    default:
      return false;
  }
}
