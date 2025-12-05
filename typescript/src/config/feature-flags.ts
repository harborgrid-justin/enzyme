/**
 * Feature flag configuration utilities.
 *
 * @module @missionfabric-js/enzyme-typescript/config/feature-flags
 *
 * @example
 * ```typescript
 * import { FeatureFlagsManager } from '@missionfabric-js/enzyme-typescript/config';
 *
 * const flags = new FeatureFlagsManager({
 *   flags: {
 *     newDashboard: {
 *       name: 'newDashboard',
 *       enabled: true,
 *       rollout: 50
 *     }
 *   }
 * });
 *
 * if (flags.isEnabled('newDashboard')) {
 *   // Show new dashboard
 * }
 * ```
 */

import type { FeatureFlag, FeatureFlagsConfig } from './types';

/**
 * Feature flag context for targeting.
 */
export interface FeatureFlagContext {
  /** User ID */
  userId?: string;

  /** User groups */
  groups?: string[];

  /** Custom properties for targeting */
  properties?: Record<string, unknown>;
}

/**
 * Feature flag evaluation result.
 */
export interface FlagEvaluationResult {
  /** Whether the flag is enabled */
  enabled: boolean;

  /** Reason for the decision */
  reason:
    | 'default'
    | 'explicit'
    | 'rollout'
    | 'targeting'
    | 'expired'
    | 'not-found';

  /** Flag metadata */
  flag?: FeatureFlag;
}

/**
 * Feature flags manager class.
 *
 * @example
 * ```typescript
 * const manager = new FeatureFlagsManager({
 *   flags: {
 *     betaFeature: {
 *       name: 'betaFeature',
 *       enabled: true,
 *       description: 'Beta feature for testing',
 *       rollout: 25,
 *       targeting: {
 *         users: ['user1', 'user2'],
 *         groups: ['beta-testers']
 *       }
 *     }
 *   },
 *   defaultEnabled: false
 * });
 *
 * const context = { userId: 'user1' };
 * if (manager.isEnabled('betaFeature', context)) {
 *   // Enable beta feature
 * }
 * ```
 */
export class FeatureFlagsManager {
  private flags: Map<string, FeatureFlag>;
  private defaultEnabled: boolean;
  private evaluationListeners: Array<
    (flagName: string, result: FlagEvaluationResult, context?: FeatureFlagContext) => void
  > = [];

  constructor(private config: FeatureFlagsConfig = { flags: {} }) {
    this.flags = new Map(Object.entries(config.flags));
    this.defaultEnabled = config.defaultEnabled ?? false;
  }

  /**
   * Check if a feature flag is enabled.
   *
   * @param flagName - Feature flag name
   * @param context - Optional evaluation context
   * @returns True if the flag is enabled
   *
   * @example
   * ```typescript
   * if (flags.isEnabled('newUI', { userId: 'user123' })) {
   *   renderNewUI();
   * } else {
   *   renderOldUI();
   * }
   * ```
   */
  isEnabled(flagName: string, context?: FeatureFlagContext): boolean {
    const result = this.evaluate(flagName, context);
    return result.enabled;
  }

  /**
   * Evaluate a feature flag with detailed result.
   *
   * @param flagName - Feature flag name
   * @param context - Optional evaluation context
   * @returns Evaluation result with reason
   *
   * @example
   * ```typescript
   * const result = flags.evaluate('betaFeature', { userId: 'user1' });
   * console.log(`Flag enabled: ${result.enabled}, reason: ${result.reason}`);
   * ```
   */
  evaluate(
    flagName: string,
    context?: FeatureFlagContext
  ): FlagEvaluationResult {
    const flag = this.flags.get(flagName);

    // Flag not found
    if (!flag) {
      const result: FlagEvaluationResult = {
        enabled: this.defaultEnabled,
        reason: 'not-found',
      };
      this.notifyEvaluation(flagName, result, context);
      return result;
    }

    // Check expiration
    if (flag.expiresAt && flag.expiresAt < new Date()) {
      const result: FlagEvaluationResult = {
        enabled: false,
        reason: 'expired',
        flag,
      };
      this.notifyEvaluation(flagName, result, context);
      return result;
    }

    // Check if flag is explicitly disabled
    if (!flag.enabled) {
      const result: FlagEvaluationResult = {
        enabled: false,
        reason: 'explicit',
        flag,
      };
      this.notifyEvaluation(flagName, result, context);
      return result;
    }

    // Check targeting rules
    if (flag.targeting && context) {
      const targetingResult = this.evaluateTargeting(flag, context);
      if (targetingResult !== null) {
        const result: FlagEvaluationResult = {
          enabled: targetingResult,
          reason: 'targeting',
          flag,
        };
        this.notifyEvaluation(flagName, result, context);
        return result;
      }
    }

    // Check rollout percentage
    if (flag.rollout !== undefined && flag.rollout < 100 && context?.userId) {
      const isInRollout = this.isInRollout(flagName, context.userId, flag.rollout);
      const result: FlagEvaluationResult = {
        enabled: isInRollout,
        reason: 'rollout',
        flag,
      };
      this.notifyEvaluation(flagName, result, context);
      return result;
    }

    // Default to enabled
    const result: FlagEvaluationResult = {
      enabled: true,
      reason: 'explicit',
      flag,
    };
    this.notifyEvaluation(flagName, result, context);
    return result;
  }

  /**
   * Evaluate targeting rules.
   *
   * @param flag - Feature flag
   * @param context - Evaluation context
   * @returns True if targeting matches, false if doesn't match, null if no targeting
   */
  private evaluateTargeting(
    flag: FeatureFlag,
    context: FeatureFlagContext
  ): boolean | null {
    if (!flag.targeting) {
      return null;
    }

    // Check user targeting
    if (
      flag.targeting.users &&
      flag.targeting.users.length > 0 &&
      context.userId
    ) {
      if (flag.targeting.users.includes(context.userId)) {
        return true;
      }
    }

    // Check group targeting
    if (
      flag.targeting.groups &&
      flag.targeting.groups.length > 0 &&
      context.groups
    ) {
      const hasMatchingGroup = flag.targeting.groups.some((group) =>
        context.groups!.includes(group)
      );
      if (hasMatchingGroup) {
        return true;
      }
    }

    // Check condition targeting
    if (
      flag.targeting.conditions &&
      flag.targeting.conditions.length > 0 &&
      context.properties
    ) {
      const allConditionsMet = flag.targeting.conditions.every((condition) =>
        this.evaluateCondition(condition, context.properties!)
      );
      if (allConditionsMet) {
        return true;
      }
    }

    // If targeting is defined but nothing matches, return false
    if (
      flag.targeting.users ||
      flag.targeting.groups ||
      flag.targeting.conditions
    ) {
      return false;
    }

    return null;
  }

  /**
   * Evaluate a targeting condition.
   *
   * @param condition - Targeting condition
   * @param properties - Context properties
   * @returns True if condition matches
   */
  private evaluateCondition(
    condition: {
      property: string;
      operator: 'equals' | 'contains' | 'matches' | 'gt' | 'lt';
      value: unknown;
    },
    properties: Record<string, unknown>
  ): boolean {
    const actualValue = properties[condition.property];

    switch (condition.operator) {
      case 'equals':
        return actualValue === condition.value;

      case 'contains':
        if (typeof actualValue === 'string' && typeof condition.value === 'string') {
          return actualValue.includes(condition.value);
        }
        if (Array.isArray(actualValue)) {
          return actualValue.includes(condition.value);
        }
        return false;

      case 'matches':
        if (typeof actualValue === 'string' && condition.value instanceof RegExp) {
          return condition.value.test(actualValue);
        }
        return false;

      case 'gt':
        if (typeof actualValue === 'number' && typeof condition.value === 'number') {
          return actualValue > condition.value;
        }
        return false;

      case 'lt':
        if (typeof actualValue === 'number' && typeof condition.value === 'number') {
          return actualValue < condition.value;
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Check if a user is in a rollout percentage.
   *
   * Uses consistent hashing to ensure same user always gets same result.
   *
   * @param flagName - Feature flag name
   * @param userId - User ID
   * @param percentage - Rollout percentage (0-100)
   * @returns True if user is in rollout
   */
  private isInRollout(
    flagName: string,
    userId: string,
    percentage: number
  ): boolean {
    // Hash the flag name + user ID to get consistent result
    const hash = this.hashString(`${flagName}:${userId}`);
    const userPercentage = hash % 100;
    return userPercentage < percentage;
  }

  /**
   * Simple string hash function.
   *
   * @param str - String to hash
   * @returns Hash value
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get a feature flag.
   *
   * @param flagName - Feature flag name
   * @returns The feature flag or undefined
   *
   * @example
   * ```typescript
   * const flag = flags.getFlag('betaFeature');
   * console.log(flag?.description);
   * ```
   */
  getFlag(flagName: string): FeatureFlag | undefined {
    return this.flags.get(flagName);
  }

  /**
   * Get all feature flags.
   *
   * @returns Map of all flags
   *
   * @example
   * ```typescript
   * const allFlags = flags.getAllFlags();
   * for (const [name, flag] of allFlags) {
   *   console.log(`${name}: ${flag.enabled}`);
   * }
   * ```
   */
  getAllFlags(): Map<string, FeatureFlag> {
    return new Map(this.flags);
  }

  /**
   * Set or update a feature flag.
   *
   * @param flagName - Feature flag name
   * @param flag - Feature flag configuration
   *
   * @example
   * ```typescript
   * flags.setFlag('newFeature', {
   *   name: 'newFeature',
   *   enabled: true,
   *   rollout: 10
   * });
   * ```
   */
  setFlag(flagName: string, flag: FeatureFlag): void {
    this.flags.set(flagName, flag);
  }

  /**
   * Enable a feature flag.
   *
   * @param flagName - Feature flag name
   *
   * @example
   * ```typescript
   * flags.enable('betaFeature');
   * ```
   */
  enable(flagName: string): void {
    const flag = this.flags.get(flagName);
    if (flag) {
      flag.enabled = true;
      this.flags.set(flagName, flag);
    } else {
      this.flags.set(flagName, {
        name: flagName,
        enabled: true,
      });
    }
  }

  /**
   * Disable a feature flag.
   *
   * @param flagName - Feature flag name
   *
   * @example
   * ```typescript
   * flags.disable('oldFeature');
   * ```
   */
  disable(flagName: string): void {
    const flag = this.flags.get(flagName);
    if (flag) {
      flag.enabled = false;
      this.flags.set(flagName, flag);
    }
  }

  /**
   * Remove a feature flag.
   *
   * @param flagName - Feature flag name
   *
   * @example
   * ```typescript
   * flags.removeFlag('deprecatedFeature');
   * ```
   */
  removeFlag(flagName: string): void {
    this.flags.delete(flagName);
  }

  /**
   * Update rollout percentage for a flag.
   *
   * @param flagName - Feature flag name
   * @param percentage - Rollout percentage (0-100)
   *
   * @example
   * ```typescript
   * // Gradually increase rollout
   * flags.setRollout('newFeature', 25); // 25% of users
   * ```
   */
  setRollout(flagName: string, percentage: number): void {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }

    const flag = this.flags.get(flagName);
    if (flag) {
      flag.rollout = percentage;
      this.flags.set(flagName, flag);
    }
  }

  /**
   * Listen for flag evaluations.
   *
   * @param callback - Callback to invoke on evaluations
   * @returns Function to unsubscribe
   *
   * @example
   * ```typescript
   * const unsubscribe = flags.onEvaluation((name, result, context) => {
   *   console.log(`Flag "${name}" evaluated: ${result.enabled} (${result.reason})`);
   * });
   * ```
   */
  onEvaluation(
    callback: (
      flagName: string,
      result: FlagEvaluationResult,
      context?: FeatureFlagContext
    ) => void
  ): () => void {
    this.evaluationListeners.push(callback);

    return () => {
      const index = this.evaluationListeners.indexOf(callback);
      if (index !== -1) {
        this.evaluationListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify evaluation listeners.
   *
   * @param flagName - Feature flag name
   * @param result - Evaluation result
   * @param context - Evaluation context
   */
  private notifyEvaluation(
    flagName: string,
    result: FlagEvaluationResult,
    context?: FeatureFlagContext
  ): void {
    for (const listener of this.evaluationListeners) {
      try {
        listener(flagName, result, context);
      } catch (error) {
        console.error('Error in evaluation listener:', error);
      }
    }
  }

  /**
   * Export flags to JSON.
   *
   * @returns JSON string of flags
   *
   * @example
   * ```typescript
   * const json = flags.toJSON();
   * await fs.writeFile('flags.json', json);
   * ```
   */
  toJSON(): string {
    const flags: Record<string, FeatureFlag> = {};
    for (const [name, flag] of this.flags) {
      flags[name] = flag;
    }
    return JSON.stringify({ flags, defaultEnabled: this.defaultEnabled }, null, 2);
  }

  /**
   * Load flags from JSON.
   *
   * @param json - JSON string of flags
   *
   * @example
   * ```typescript
   * const json = await fs.readFile('flags.json', 'utf-8');
   * flags.fromJSON(json);
   * ```
   */
  fromJSON(json: string): void {
    const data = JSON.parse(json) as FeatureFlagsConfig;
    this.flags = new Map(Object.entries(data.flags));
    if (data.defaultEnabled !== undefined) {
      this.defaultEnabled = data.defaultEnabled;
    }
  }
}

/**
 * Create a feature flags manager.
 *
 * @param config - Feature flags configuration
 * @returns A new feature flags manager
 *
 * @example
 * ```typescript
 * const flags = createFeatureFlags({
 *   flags: {
 *     darkMode: { name: 'darkMode', enabled: true }
 *   }
 * });
 * ```
 */
export function createFeatureFlags(
  config?: FeatureFlagsConfig
): FeatureFlagsManager {
  return new FeatureFlagsManager(config);
}

/**
 * Create a feature flag with defaults.
 *
 * @param name - Flag name
 * @param enabled - Whether the flag is enabled
 * @param options - Additional flag options
 * @returns A feature flag object
 *
 * @example
 * ```typescript
 * const flag = createFlag('newUI', true, {
 *   description: 'New UI design',
 *   rollout: 50,
 *   expiresAt: new Date('2024-12-31')
 * });
 * ```
 */
export function createFlag(
  name: string,
  enabled: boolean,
  options?: Partial<Omit<FeatureFlag, 'name' | 'enabled'>>
): FeatureFlag {
  return {
    name,
    enabled,
    ...options,
  };
}

/**
 * Evaluate multiple flags at once.
 *
 * @param manager - Feature flags manager
 * @param flagNames - Array of flag names to evaluate
 * @param context - Evaluation context
 * @returns Map of flag names to enabled status
 *
 * @example
 * ```typescript
 * const results = evaluateFlags(
 *   flags,
 *   ['feature1', 'feature2', 'feature3'],
 *   { userId: 'user123' }
 * );
 *
 * console.log(results.get('feature1')); // true/false
 * ```
 */
export function evaluateFlags(
  manager: FeatureFlagsManager,
  flagNames: string[],
  context?: FeatureFlagContext
): Map<string, boolean> {
  const results = new Map<string, boolean>();

  for (const flagName of flagNames) {
    results.set(flagName, manager.isEnabled(flagName, context));
  }

  return results;
}
