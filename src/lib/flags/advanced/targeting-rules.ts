/**
 * @fileoverview Targeting rules engine for feature flag evaluation.
 *
 * Provides comprehensive condition evaluation with support for:
 * - Complex nested conditions (AND/OR groups)
 * - Multiple comparison operators
 * - Attribute path resolution (dot notation)
 * - Type coercion and validation
 * - Schedule-based rules
 *
 * @module flags/advanced/targeting-rules
 *
 * @example
 * ```typescript
 * const engine = new TargetingRulesEngine();
 *
 * const rules: TargetingRule[] = [{
 *   id: 'beta-users',
 *   name: 'Beta Users',
 *   priority: 1,
 *   enabled: true,
 *   variantId: 'enabled',
 *   conditions: {
 *     operator: 'and',
 *     conditions: [
 *       { attribute: 'user.isBeta', operator: 'equals', value: true },
 *       { attribute: 'user.plan', operator: 'in', value: ['pro', 'enterprise'] },
 *     ],
 *   },
 * }];
 *
 * const result = engine.evaluate(rules, context);
 * ```
 */

import type {
  EvaluationContext,
  TargetingRule,
  TargetingCondition,
  ConditionGroup,
  ComparisonOperator,
  RuleSchedule,
  VariantId,
  JsonValue,
} from './types';
// import type { Mutable } from '../../utils/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of targeting rule evaluation.
 */
export interface TargetingResult {
  /** Whether any rule matched */
  readonly matched: boolean;
  /** The variant to serve */
  readonly variantId?: VariantId;
  /** The rule that matched */
  readonly ruleId?: string;
  /** The rule name */
  readonly ruleName?: string;
  /** Evaluation details for debugging */
  readonly details?: TargetingDetails;
}

/**
 * Detailed evaluation information for debugging.
 */
export interface TargetingDetails {
  /** All rules that were evaluated */
  readonly evaluatedRules: readonly RuleEvaluation[];
  /** Total evaluation time in ms */
  readonly evaluationTimeMs: number;
}

/**
 * Evaluation result for a single rule.
 */
export interface RuleEvaluation {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly matched: boolean;
  readonly skipped: boolean;
  readonly skipReason?: string;
  readonly conditionResults?: readonly ConditionResult[];
}

/**
 * Evaluation result for a single condition.
 */
export interface ConditionResult {
  readonly attribute: string;
  readonly operator: ComparisonOperator;
  readonly expectedValue: JsonValue | readonly JsonValue[];
  readonly actualValue: JsonValue | undefined;
  readonly matched: boolean;
}

// ============================================================================
// Targeting Rules Engine
// ============================================================================

/**
 * Engine for evaluating targeting rules against evaluation context.
 */
export class TargetingRulesEngine {
  private debug: boolean;

  constructor(options: { debug?: boolean } = {}) {
    this.debug = options.debug ?? false;
  }

  /**
   * Evaluate targeting rules and return the first matching variant.
   */
  evaluate(
    rules: readonly TargetingRule[],
    context: EvaluationContext
  ): TargetingResult {
    const startTime = performance.now();
    const evaluatedRules: RuleEvaluation[] = [];

    // Sort rules by priority (lower number = higher priority)
    const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      const evaluation = this.evaluateRule(rule, context);
      evaluatedRules.push(evaluation);

      if (evaluation.matched) {
        return {
          matched: true,
          variantId: rule.variantId,
          ruleId: rule.id,
          ruleName: rule.name,
          details: this.debug
            ? {
                evaluatedRules,
                evaluationTimeMs: performance.now() - startTime,
              }
            : undefined,
        };
      }
    }

    return {
      matched: false,
      details: this.debug
        ? {
            evaluatedRules,
            evaluationTimeMs: performance.now() - startTime,
          }
        : undefined,
    };
  }

  /**
   * Evaluate a single targeting rule.
   */
  evaluateRule(rule: TargetingRule, context: EvaluationContext): RuleEvaluation {
    // Check if rule is enabled
    if (!rule.enabled) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        matched: false,
        skipped: true,
        skipReason: 'Rule is disabled',
      };
    }

    // Check schedule constraints
    if (rule.schedule && !this.isWithinSchedule(rule.schedule, context)) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        matched: false,
        skipped: true,
        skipReason: 'Outside schedule',
      };
    }

    // Evaluate conditions
    const conditionResults: ConditionResult[] = [];
    const matched = this.evaluateConditionGroup(
      rule.conditions,
      context,
      conditionResults
    );

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      matched,
      skipped: false,
      conditionResults: this.debug ? conditionResults : undefined,
    };
  }

  /**
   * Evaluate a condition group (AND/OR).
   */
  private evaluateConditionGroup(
    group: ConditionGroup,
    context: EvaluationContext,
    results: ConditionResult[]
  ): boolean {
    const conditions = group.conditions;

    if (group.operator === 'and') {
      return conditions.every((condition) =>
        this.evaluateConditionOrGroup(condition, context, results)
      );
    } else {
      return conditions.some((condition) =>
        this.evaluateConditionOrGroup(condition, context, results)
      );
    }
  }

  /**
   * Evaluate either a condition or a nested group.
   */
  private evaluateConditionOrGroup(
    conditionOrGroup: TargetingCondition | ConditionGroup,
    context: EvaluationContext,
    results: ConditionResult[]
  ): boolean {
    if ('operator' in conditionOrGroup && 'conditions' in conditionOrGroup) {
      // It's a nested group
      return this.evaluateConditionGroup(
        conditionOrGroup as ConditionGroup,
        context,
        results
      );
    } else {
      // It's a condition
      return this.evaluateCondition(
        conditionOrGroup as TargetingCondition,
        context,
        results
      );
    }
  }

  /**
   * Evaluate a single condition.
   */
  private evaluateCondition(
    condition: TargetingCondition,
    context: EvaluationContext,
    results: ConditionResult[]
  ): boolean {
    const actualValue = this.resolveAttributePath(condition.attribute, context);
    let matched = this.compare(
      actualValue,
      condition.operator,
      condition.value,
      condition.caseSensitive ?? true
    );

    if (condition.negate) {
      matched = !matched;
    }

    results.push({
      attribute: condition.attribute,
      operator: condition.operator,
      expectedValue: condition.value,
      actualValue,
      matched,
    });

    return matched;
  }

  /**
   * Resolve an attribute path to a value.
   * Supports dot notation: "user.custom.department"
   */
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

  /**
   * Compare a value using the specified operator.
   */
  private compare(
    actual: JsonValue | undefined,
    operator: ComparisonOperator,
    expected: JsonValue | readonly JsonValue[],
    caseSensitive: boolean
  ): boolean {
    switch (operator) {
      case 'equals':
        return this.equals(actual, expected, caseSensitive);

      case 'notEquals':
        return !this.equals(actual, expected, caseSensitive);

      case 'contains':
        return this.contains(actual, expected, caseSensitive);

      case 'notContains':
        return !this.contains(actual, expected, caseSensitive);

      case 'startsWith':
        return this.startsWith(actual, expected, caseSensitive);

      case 'endsWith':
        return this.endsWith(actual, expected, caseSensitive);

      case 'matches':
        return this.matchesRegex(actual, expected);

      case 'in':
        return this.isIn(actual, expected, caseSensitive);

      case 'notIn':
        return !this.isIn(actual, expected, caseSensitive);

      case 'greaterThan':
        return this.greaterThan(actual, expected);

      case 'greaterThanOrEquals':
        return this.greaterThanOrEquals(actual, expected);

      case 'lessThan':
        return this.lessThan(actual, expected);

      case 'lessThanOrEquals':
        return this.lessThanOrEquals(actual, expected);

      case 'before':
        return this.before(actual, expected);

      case 'after':
        return this.after(actual, expected);

      case 'exists':
        return actual !== undefined && actual !== null;

      case 'notExists':
        return actual === undefined || actual === null;

      case 'semverGreaterThan':
        return this.semverCompare(actual, expected) > 0;

      case 'semverLessThan':
        return this.semverCompare(actual, expected) < 0;

      case 'semverEquals':
        return this.semverCompare(actual, expected) === 0;

      default:
        return false;
    }
  }

  // ==========================================================================
  // Comparison Helpers
  // ==========================================================================

  private normalizeString(value: unknown, caseSensitive: boolean): string {
    const str = String(value);
    return caseSensitive ? str : str.toLowerCase();
  }

  private equals(
    actual: JsonValue | undefined,
    expected: JsonValue | readonly JsonValue[],
    caseSensitive: boolean
  ): boolean {
    if (actual === undefined || actual === null) {
      return expected === null || expected === undefined;
    }

    if (typeof actual === 'string' && typeof expected === 'string') {
      return (
        this.normalizeString(actual, caseSensitive) ===
        this.normalizeString(expected, caseSensitive)
      );
    }

    if (typeof actual === 'object' && typeof expected === 'object') {
      return JSON.stringify(actual) === JSON.stringify(expected);
    }

    return actual === expected;
  }

  private contains(
    actual: JsonValue | undefined,
    expected: JsonValue | readonly JsonValue[],
    caseSensitive: boolean
  ): boolean {
    if (actual === undefined || actual === null) {
      return false;
    }

    if (typeof actual === 'string' && typeof expected === 'string') {
      return this.normalizeString(actual, caseSensitive).includes(
        this.normalizeString(expected, caseSensitive)
      );
    }

    if (Array.isArray(actual)) {
      return actual.some((item) =>
        this.equals(item, expected, caseSensitive)
      );
    }

    return false;
  }

  private startsWith(
    actual: JsonValue | undefined,
    expected: JsonValue | readonly JsonValue[],
    caseSensitive: boolean
  ): boolean {
    if (typeof actual !== 'string' || typeof expected !== 'string') {
      return false;
    }

    return this.normalizeString(actual, caseSensitive).startsWith(
      this.normalizeString(expected, caseSensitive)
    );
  }

  private endsWith(
    actual: JsonValue | undefined,
    expected: JsonValue | readonly JsonValue[],
    caseSensitive: boolean
  ): boolean {
    if (typeof actual !== 'string' || typeof expected !== 'string') {
      return false;
    }

    return this.normalizeString(actual, caseSensitive).endsWith(
      this.normalizeString(expected, caseSensitive)
    );
  }

  private matchesRegex(
    actual: JsonValue | undefined,
    expected: JsonValue | readonly JsonValue[]
  ): boolean {
    if (typeof actual !== 'string' || typeof expected !== 'string') {
      return false;
    }

    try {
      const regex = new RegExp(expected);
      return regex.test(actual);
    } catch {
      return false;
    }
  }

  private isIn(
    actual: JsonValue | undefined,
    expected: JsonValue | readonly JsonValue[],
    caseSensitive: boolean
  ): boolean {
    if (!Array.isArray(expected)) {
      return false;
    }

    return expected.some((item) => this.equals(actual, item, caseSensitive));
  }

  private greaterThan(
    actual: JsonValue | undefined,
    expected: JsonValue | readonly JsonValue[]
  ): boolean {
    if (typeof actual !== 'number' || typeof expected !== 'number') {
      return false;
    }
    return actual > expected;
  }

  private greaterThanOrEquals(
    actual: JsonValue | undefined,
    expected: JsonValue | readonly JsonValue[]
  ): boolean {
    if (typeof actual !== 'number' || typeof expected !== 'number') {
      return false;
    }
    return actual >= expected;
  }

  private lessThan(
    actual: JsonValue | undefined,
    expected: JsonValue | readonly JsonValue[]
  ): boolean {
    if (typeof actual !== 'number' || typeof expected !== 'number') {
      return false;
    }
    return actual < expected;
  }

  private lessThanOrEquals(
    actual: JsonValue | undefined,
    expected: JsonValue | readonly JsonValue[]
  ): boolean {
    if (typeof actual !== 'number' || typeof expected !== 'number') {
      return false;
    }
    return actual <= expected;
  }

  private before(
    actual: JsonValue | undefined,
    expected: JsonValue | readonly JsonValue[]
  ): boolean {
    const actualDate = this.parseDate(actual);
    const expectedDate = this.parseDate(expected);

    if (!actualDate || !expectedDate) {
      return false;
    }

    return actualDate.getTime() < expectedDate.getTime();
  }

  private after(
    actual: JsonValue | undefined,
    expected: JsonValue | readonly JsonValue[]
  ): boolean {
    const actualDate = this.parseDate(actual);
    const expectedDate = this.parseDate(expected);

    if (!actualDate || !expectedDate) {
      return false;
    }

    return actualDate.getTime() > expectedDate.getTime();
  }

  private parseDate(value: unknown): Date | null {
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  private semverCompare(
    actual: JsonValue | undefined,
    expected: JsonValue | readonly JsonValue[]
  ): number {
    if (typeof actual !== 'string' || typeof expected !== 'string') {
      return 0;
    }

    const parseVersion = (v: string): number[] => {
      const parts = v.replace(/^v/, '').split(/[.-]/);
      return parts.map((p) => parseInt(p, 10) || 0);
    };

    const actualParts = parseVersion(actual);
    const expectedParts = parseVersion(expected);

    const maxLength = Math.max(actualParts.length, expectedParts.length);

    for (let i = 0; i < maxLength; i++) {
      const a = actualParts[i] ?? 0;
      const e = expectedParts[i] ?? 0;
      if (a > e) return 1;
      if (a < e) return -1;
    }

    return 0;
  }

  // ==========================================================================
  // Schedule Evaluation
  // ==========================================================================

  private isWithinSchedule(
    schedule: RuleSchedule,
    context: EvaluationContext
  ): boolean {
    const now = context.timestamp ?? new Date();
    const timezone = schedule.timezone ?? 'UTC';

    // Convert to timezone-aware date
    const localDate = this.toTimezone(now, timezone);

    // Check date range
    if (schedule.startTime && now < schedule.startTime) {
      return false;
    }
    if (schedule.endTime && now > schedule.endTime) {
      return false;
    }

    // Check day of week (0 = Sunday)
    if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
      const dayOfWeek = localDate.getDay();
      if (!schedule.daysOfWeek.includes(dayOfWeek)) {
        return false;
      }
    }

    // Check hour of day (0-23)
    if (schedule.hoursOfDay && schedule.hoursOfDay.length > 0) {
      const hour = localDate.getHours();
      if (!schedule.hoursOfDay.includes(hour)) {
        return false;
      }
    }

    return true;
  }

  private toTimezone(date: Date, timezone: string): Date {
    try {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      };

      const formatted = new Intl.DateTimeFormat('en-US', options).format(date);
      return new Date(formatted);
    } catch {
      return date;
    }
  }
}

// ============================================================================
// Rule Builder
// ============================================================================

/**
 * Fluent builder for creating targeting rules.
 */
export class TargetingRuleBuilder {
  private rule: Partial<TargetingRule> = {
    enabled: true,
    priority: 0,
  };
  private conditions: (TargetingCondition | ConditionGroup)[] = [];
  private groupOperator: 'and' | 'or' = 'and';

  /**
   * Set the rule ID.
   */
  id(id: string): this {
    (this.rule as any).id = id;
    return this;
  }

  /**
   * Set the rule name.
   */
  name(name: string): this {
    (this.rule as any).name = name;
    return this;
  }

  /**
   * Set the rule description.
   */
  description(description: string): this {
    (this.rule as any).description = description;
    return this;
  }

  /**
   * Set the rule priority.
   */
  priority(priority: number): this {
    (this.rule as any).priority = priority;
    return this;
  }

  /**
   * Set whether the rule is enabled.
   */
  enabled(enabled: boolean): this {
    (this.rule as any).enabled = enabled;
    return this;
  }

  /**
   * Set the variant to serve when matched.
   */
  variant(variantId: VariantId): this {
    (this.rule as any).variantId = variantId;
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
   * Add a condition to the rule.
   */
  condition(condition: TargetingCondition): this {
    this.conditions.push(condition);
    return this;
  }

  /**
   * Add an attribute equals condition.
   */
  where(attribute: string, value: JsonValue): this {
    this.conditions.push({
      attribute,
      operator: 'equals',
      value,
    });
    return this;
  }

  /**
   * Add an attribute in list condition.
   */
  whereIn(attribute: string, values: readonly JsonValue[]): this {
    this.conditions.push({
      attribute,
      operator: 'in',
      value: values,
    });
    return this;
  }

  /**
   * Add an attribute exists condition.
   */
  whereExists(attribute: string): this {
    this.conditions.push({
      attribute,
      operator: 'exists',
      value: true,
    });
    return this;
  }

  /**
   * Add a nested condition group.
   */
  group(builder: (group: ConditionGroupBuilder) => void): this {
    const groupBuilder = new ConditionGroupBuilder();
    builder(groupBuilder);
    this.conditions.push(groupBuilder.build());
    return this;
  }

  /**
   * Set schedule constraints.
   */
  schedule(schedule: RuleSchedule): this {
    (this.rule as any).schedule = schedule;
    return this;
  }

  /**
   * Build the targeting rule.
   */
  build(): TargetingRule {
    if (!this.rule.id) {
      throw new Error('Rule ID is required');
    }
    if (!this.rule.name) {
      throw new Error('Rule name is required');
    }
    if (!this.rule.variantId) {
      throw new Error('Variant ID is required');
    }

    return {
      id: this.rule.id,
      name: this.rule.name,
      description: this.rule.description,
      priority: this.rule.priority ?? 0,
      enabled: this.rule.enabled ?? true,
      variantId: this.rule.variantId,
      conditions: {
        operator: this.groupOperator,
        conditions: this.conditions,
      },
      schedule: this.rule.schedule,
    };
  }
}

/**
 * Builder for condition groups.
 */
export class ConditionGroupBuilder {
  private conditions: (TargetingCondition | ConditionGroup)[] = [];
  private operator: 'and' | 'or' = 'and';

  and(): this {
    this.operator = 'and';
    return this;
  }

  or(): this {
    this.operator = 'or';
    return this;
  }

  condition(condition: TargetingCondition): this {
    this.conditions.push(condition);
    return this;
  }

  where(attribute: string, value: JsonValue): this {
    this.conditions.push({
      attribute,
      operator: 'equals',
      value,
    });
    return this;
  }

  build(): ConditionGroup {
    return {
      operator: this.operator,
      conditions: this.conditions,
    };
  }
}

/**
 * Create a new targeting rule builder.
 */
export function createTargetingRule(): TargetingRuleBuilder {
  return new TargetingRuleBuilder();
}
