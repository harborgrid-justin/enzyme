/**
 * @fileoverview Core flag evaluation engine with comprehensive targeting support.
 *
 * This module provides the main evaluation engine for feature flags with support for:
 * - Targeting rules with complex conditions
 * - Percentage-based rollouts with consistent hashing
 * - Segment-based targeting
 * - Multi-variate flags
 * - Dependency resolution
 * - Caching and offline support
 *
 * @module flags/advanced/flag-engine
 *
 * @example
 * ```typescript
 * const engine = new FlagEngine({
 *   debug: process.env.NODE_ENV === 'development',
 *   offlineMode: false,
 * });
 *
 * // Register flags
 * engine.registerFlags(flagDefinitions);
 *
 * // Set context
 * engine.setContext({
 *   user: { id: 'user-123', email: 'user@example.com' },
 *   application: { environment: 'production' },
 * });
 *
 * // Evaluate a flag
 * const result = engine.evaluate('new-feature');
 * console.log(result.value); // true/false or variant value
 * ```
 */

import type {
  FeatureFlag,
  FlagId,
  EvaluationContext,
  EvaluationResult,
  EvaluationReason,
  EvaluationError,
  Variant,
  Segment,
  FlagEngineConfig,
  FlagEvaluationEvent,
  FlagExposureEvent,
  FlagChangeEvent,
  JsonValue,
  FlagDependency,
} from './types';
import { TargetingRulesEngine } from './targeting-rules';
import { PercentageRolloutEngine } from './percentage-rollout';
import { SegmentMatcher } from './flag-segments';
import { DependencyResolver } from './flag-dependencies';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// MurmurHash3 Implementation (for consistent hashing)
// ============================================================================

/**
 * MurmurHash3 implementation for consistent percentage rollouts.
 * Provides good distribution and is fast for short strings.
 */
function murmurHash3(key: string, seed: number = 0): number {
  const remainder = key.length & 3; // key.length % 4
  const bytes = key.length - remainder;
  let h1 = seed;
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;
  let i = 0;

  while (i < bytes) {
    let k1 =
      (key.charCodeAt(i) & 0xff) |
      ((key.charCodeAt(++i) & 0xff) << 8) |
      ((key.charCodeAt(++i) & 0xff) << 16) |
      ((key.charCodeAt(++i) & 0xff) << 24);
    ++i;

    k1 =
      ((k1 & 0xffff) * c1 + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 =
      ((k1 & 0xffff) * c2 + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    const h1b =
      ((h1 & 0xffff) * 5 + ((((h1 >>> 16) * 5) & 0xffff) << 16)) & 0xffffffff;
    h1 = (h1b & 0xffff) + 0x6b64 + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16);
  }

  let k1 = 0;

  switch (remainder) {
    case 3:
      k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
      break;
    case 2:
      k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
      break;
    case 1:
      k1 ^= key.charCodeAt(i) & 0xff;
      k1 =
        ((k1 & 0xffff) * c1 + ((((k1 >>> 16) * c1) & 0xffff) << 16)) &
        0xffffffff;
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 =
        ((k1 & 0xffff) * c2 + ((((k1 >>> 16) * c2) & 0xffff) << 16)) &
        0xffffffff;
      h1 ^= k1;
  }

  h1 ^= key.length;

  h1 ^= h1 >>> 16;
  h1 =
    ((h1 & 0xffff) * 0x85ebca6b +
      ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) &
    0xffffffff;
  h1 ^= h1 >>> 13;
  h1 =
    ((h1 & 0xffff) * 0xc2b2ae35 +
      ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16)) &
    0xffffffff;
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
}

/**
 * Default hash function that returns a value between 0 and 100.
 */
function defaultHashFunction(key: string, salt: string = ''): number {
  const hash = murmurHash3(key + salt);
  return (hash % 10000) / 100; // Returns 0.00 to 99.99
}

// ============================================================================
// Cache Implementation
// ============================================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  isStale: boolean;
}

/**
 * Simple in-memory cache with TTL support.
 */
class EvaluationCache {
  private cache = new Map<string, CacheEntry<EvaluationResult>>();
  private ttl: number;

  constructor(ttl: number = DEFAULT_CACHE_TTL) {
    this.ttl = ttl;
  }

  /**
   * Generate a cache key from flag key and context.
   */
  private generateKey(flagKey: string, context: EvaluationContext): string {
    const userId = context.user?.id ?? 'anonymous';
    const sessionId = context.session?.sessionId ?? '';
    return `${flagKey}:${userId}:${sessionId}`;
  }

  /**
   * Get a cached evaluation result.
   */
  get(flagKey: string, context: EvaluationContext): EvaluationResult | null {
    const key = this.generateKey(flagKey, context);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      // Entry is expired but return as stale
      entry.isStale = true;
    }

    return entry.isStale ? { ...entry.value, isStale: true } : entry.value;
  }

  /**
   * Set a cached evaluation result.
   */
  set(
    flagKey: string,
    context: EvaluationContext,
    result: EvaluationResult
  ): void {
    const key = this.generateKey(flagKey, context);
    this.cache.set(key, {
      value: result,
      expiresAt: Date.now() + this.ttl,
      isStale: false,
    });
  }

  /**
   * Invalidate cache for a specific flag.
   */
  invalidate(flagKey: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${flagKey}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics.
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// ============================================================================
// Flag Engine
// ============================================================================

/**
 * Core feature flag evaluation engine.
 *
 * Provides comprehensive flag evaluation with support for targeting rules,
 * percentage rollouts, segments, and dependencies.
 */
export class FlagEngine {
  private flags = new Map<FlagId, FeatureFlag>();
  private segments = new Map<string, Segment>();
  private context: EvaluationContext = {};
  private cache: EvaluationCache;
  private config: FlagEngineConfig;
  private targetingEngine: TargetingRulesEngine;
  private rolloutEngine: PercentageRolloutEngine;
  private segmentMatcher: SegmentMatcher;
  private dependencyResolver: DependencyResolver;
  private hashFunction: (key: string, salt?: string) => number;
  private previousValues = new Map<FlagId, JsonValue>();
  private initialized = false;

  constructor(config: FlagEngineConfig = {}) {
    this.config = config;
    this.cache = new EvaluationCache(config.cacheTtl ?? DEFAULT_CACHE_TTL);
    this.hashFunction = config.hashFunction ?? defaultHashFunction;

    // Initialize sub-engines
    this.targetingEngine = new TargetingRulesEngine();
    this.rolloutEngine = new PercentageRolloutEngine(this.hashFunction);
    this.segmentMatcher = new SegmentMatcher();
    this.dependencyResolver = new DependencyResolver();

    if (config.defaultContext) {
      this.context = { ...config.defaultContext };
    }

    this.log('FlagEngine initialized');
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Set the evaluation context.
   */
  setContext(context: EvaluationContext): void {
    const oldContext = this.context;
    this.context = { ...this.context, ...context };

    // Clear cache if user changed
    if (oldContext.user?.id !== context.user?.id) {
      this.cache.clear();
    }

    this.log('Context updated', context);
  }

  /**
   * Update specific context properties.
   */
  updateContext(updates: Partial<EvaluationContext>): void {
    this.context = {
      ...this.context,
      ...updates,
      custom: {
        ...this.context.custom,
        ...updates.custom,
      },
    };
    this.log('Context updated', updates);
  }

  /**
   * Get the current context.
   */
  getContext(): EvaluationContext {
    return { ...this.context };
  }

  /**
   * Register feature flags.
   */
  registerFlags(flags: readonly FeatureFlag[]): void {
    for (const flag of flags) {
      this.flags.set(flag.id, flag);
      this.log(`Flag registered: ${flag.key}`);
    }

    // Build dependency graph
    const dependencies: FlagDependency[] = [];
    for (const flag of flags) {
      if (flag.dependencies) {
        dependencies.push(...flag.dependencies);
      }
    }
    this.dependencyResolver.buildGraph(dependencies);

    this.initialized = true;
  }

  /**
   * Register a single flag.
   */
  registerFlag(flag: FeatureFlag): void {
    this.flags.set(flag.id, flag);
    this.cache.invalidate(flag.key);
    this.log(`Flag registered: ${flag.key}`);
  }

  /**
   * Remove a flag.
   */
  removeFlag(flagId: FlagId): void {
    const flag = this.flags.get(flagId);
    if (flag) {
      this.flags.delete(flagId);
      this.cache.invalidate(flag.key);
      this.log(`Flag removed: ${flag.key}`);
    }
  }

  /**
   * Register segments.
   */
  registerSegments(segments: readonly Segment[]): void {
    for (const segment of segments) {
      this.segments.set(segment.id, segment);
      this.log(`Segment registered: ${segment.name}`);
    }
  }

  /**
   * Get a flag by key.
   */
  getFlag(key: string): FeatureFlag | undefined {
    for (const flag of this.flags.values()) {
      if (flag.key === key) {
        return flag;
      }
    }
    return undefined;
  }

  /**
   * Get all registered flags.
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  // ==========================================================================
  // Evaluation
  // ==========================================================================

  /**
   * Evaluate a feature flag.
   */
  evaluate<T = JsonValue>(
    flagKey: string,
    contextOverrides?: Partial<EvaluationContext>
  ): EvaluationResult<T> {
    const startTime = performance.now();
    const context = contextOverrides
      ? { ...this.context, ...contextOverrides }
      : this.context;

    try {
      // Check cache first
      const cached = this.cache.get(flagKey, context);
      if (cached && !cached.isStale) {
        return cached as EvaluationResult<T>;
      }

      const result = this.evaluateInternal<T>(flagKey, context, startTime);

      // Cache the result
      this.cache.set(flagKey, context, result as EvaluationResult);

      // Track evaluation event
      this.trackEvaluation(result as EvaluationResult, context);

      // Check for value changes
      this.checkForChanges(flagKey, result.value as JsonValue);

      return result;
    } catch (error) {
      return this.createErrorResult<T>(flagKey, error, startTime);
    }
  }

  /**
   * Evaluate a boolean flag (convenience method).
   */
  isEnabled(
    flagKey: string,
    contextOverrides?: Partial<EvaluationContext>
  ): boolean {
    const result = this.evaluate<boolean>(flagKey, contextOverrides);
    return Boolean(result.value);
  }

  /**
   * Evaluate a string flag.
   */
  getStringValue(
    flagKey: string,
    defaultValue: string,
    contextOverrides?: Partial<EvaluationContext>
  ): string {
    const result = this.evaluate<string>(flagKey, contextOverrides);
    return typeof result.value === 'string' ? result.value : defaultValue;
  }

  /**
   * Evaluate a number flag.
   */
  getNumberValue(
    flagKey: string,
    defaultValue: number,
    contextOverrides?: Partial<EvaluationContext>
  ): number {
    const result = this.evaluate<number>(flagKey, contextOverrides);
    return typeof result.value === 'number' ? result.value : defaultValue;
  }

  /**
   * Evaluate a JSON flag.
   */
  getJsonValue<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    contextOverrides?: Partial<EvaluationContext>
  ): T {
    const result = this.evaluate<T>(flagKey, contextOverrides);
    return result.value ?? defaultValue;
  }

  /**
   * Evaluate multiple flags at once.
   */
  evaluateAll(
    flagKeys: readonly string[],
    contextOverrides?: Partial<EvaluationContext>
  ): Map<string, EvaluationResult> {
    const results = new Map<string, EvaluationResult>();
    for (const key of flagKeys) {
      results.set(key, this.evaluate(key, contextOverrides));
    }
    return results;
  }

  /**
   * Get all enabled flags.
   */
  getEnabledFlags(
    contextOverrides?: Partial<EvaluationContext>
  ): Map<string, EvaluationResult> {
    const results = new Map<string, EvaluationResult>();
    for (const flag of this.flags.values()) {
      const result = this.evaluate(flag.key, contextOverrides);
      if (result.value === true || result.reason !== 'OFF') {
        results.set(flag.key, result);
      }
    }
    return results;
  }

  // ==========================================================================
  // Internal Evaluation
  // ==========================================================================

  private evaluateInternal<T>(
    flagKey: string,
    context: EvaluationContext,
    startTime: number
  ): EvaluationResult<T> {
    const flag = this.getFlag(flagKey);

    if (!flag) {
      return this.createDefaultResult<T>(
        flagKey,
        'OFF',
        startTime,
        undefined,
        {
          code: 'FLAG_NOT_FOUND',
          message: `Flag '${flagKey}' not found`,
          isTransient: false,
        }
      );
    }

    // Check if flag is enabled
    if (!flag.enabled) {
      const offVariant = flag.variants.find((v) => v.id === flag.offVariant);
      const variant = offVariant ?? flag.variants[0];
      if (!variant) {
        throw new Error(`Flag ${flag.id} has no variants`);
      }
      return this.createResult<T>(
        flag,
        variant,
        'OFF',
        startTime
      );
    }

    // Check dependencies
    if (flag.dependencies && flag.dependencies.length > 0) {
      const depResult = this.checkDependencies(flag, context);
      if (!depResult.satisfied) {
        const offVariant = flag.variants.find((v) => v.id === flag.offVariant);
        const variant = offVariant ?? flag.variants[0];
        if (!variant) {
          throw new Error(`Flag ${flag.id} has no variants`);
        }
        return this.createResult<T>(
          flag,
          variant,
          'DEPENDENCY_FAILED',
          startTime,
          undefined,
          undefined,
          depResult.failedDependency != null ? { failedDependency: depResult.failedDependency } : {}
        );
      }
    }

    // Check segment prerequisites
    if (flag.segments != null && flag.segments.length > 0) {
      const inSegment = this.checkSegments(flag.segments, context);
      if (!inSegment) {
        const defaultVariant = flag.variants.find(
          (v) => v.id === flag.defaultVariant
        );
        const variant = defaultVariant ?? flag.variants[0];
        if (!variant) {
          throw new Error(`Flag ${flag.id} has no variants`);
        }
        return this.createResult<T>(
          flag,
          variant,
          'DEFAULT',
          startTime
        );
      }
    }

    // Evaluate targeting rules
    if (flag.targetingRules != null && flag.targetingRules.length > 0) {
      const ruleResult = this.targetingEngine.evaluate(
        flag.targetingRules,
        context
      );
      if (ruleResult.matched && ruleResult.variantId != null) {
        const variant = flag.variants.find((v) => v.id === ruleResult.variantId);
        if (variant) {
          return this.createResult<T>(
            flag,
            variant,
            'RULE_MATCH',
            startTime,
            ruleResult.ruleId
          );
        }
      }
    }

    // Evaluate rollout
    if (flag.rollout) {
      const rolloutResult = this.rolloutEngine.evaluate(
        flag.rollout,
        context,
        flag.key,
        flag.variants
      );
      if (rolloutResult.included) {
        const variant = flag.variants.find(
          (v) => v.id === rolloutResult.variantId
        );
        if (variant) {
          return this.createResult<T>(
            flag,
            variant,
            'ROLLOUT',
            startTime,
            undefined,
            undefined,
            { rolloutPercentage: rolloutResult.percentage ?? 0 }
          );
        }
      }
    }

    // Return default variant
    const defaultVariant = flag.variants.find(
      (v) => v.id === flag.defaultVariant
    );
    const variant = defaultVariant ?? flag.variants[0];
    if (!variant) {
      throw new Error(`Flag ${flag.id} has no variants`);
    }
    return this.createResult<T>(
      flag,
      variant,
      'DEFAULT',
      startTime
    );
  }

  private checkDependencies(
    flag: FeatureFlag,
    context: EvaluationContext
  ): { satisfied: boolean; failedDependency?: string } {
    if (!flag.dependencies) {
      return { satisfied: true };
    }

    for (const dep of flag.dependencies) {
      const targetFlag = this.getFlag(dep.targetFlag);
      if (!targetFlag) {
        continue;
      }

      const targetResult = this.evaluate(dep.targetFlag, context);

      switch (dep.type) {
        case 'requires':
          if (dep.requiredVariant != null) {
            if (targetResult.variantId !== dep.requiredVariant) {
              return { satisfied: false, failedDependency: dep.targetFlag };
            }
          } else if (targetResult.value == null || targetResult.value === false) {
            return { satisfied: false, failedDependency: dep.targetFlag };
          }
          break;
        case 'conflicts':
          if (targetResult.value != null && targetResult.value !== false) {
            return { satisfied: false, failedDependency: dep.targetFlag };
          }
          break;
      }
    }

    return { satisfied: true };
  }

  private checkSegments(
    segmentIds: readonly string[],
    context: EvaluationContext
  ): boolean {
    for (const segmentId of segmentIds) {
      const segment = this.segments.get(segmentId);
      if (segment && this.segmentMatcher.matches(segment, context)) {
        return true;
      }
    }
    return false;
  }

  // ==========================================================================
  // Result Creation
  // ==========================================================================

  private createResult<T>(
    flag: FeatureFlag,
    variant: Variant,
    reason: EvaluationReason,
    startTime: number,
    ruleId?: string,
    segmentId?: string,
    metadata?: Record<string, JsonValue>
  ): EvaluationResult<T> {
    return {
      flagKey: flag.key,
      value: variant.value as T,
      variantId: variant.id,
      reason,
      ruleId,
      segmentId,
      isStale: false,
      timestamp: new Date(),
      durationMs: performance.now() - startTime,
      metadata,
    };
  }

  private createDefaultResult<T>(
    flagKey: string,
    reason: EvaluationReason,
    startTime: number,
    fallbackValue?: T,
    error?: EvaluationError
  ): EvaluationResult<T> {
    const fallback =
      fallbackValue ?? (this.config.fallbacks?.[flagKey] as T) ?? (false as T);
    return {
      flagKey,
      value: fallback,
      variantId: 'default',
      reason,
      isStale: this.config.offlineMode ?? false,
      timestamp: new Date(),
      durationMs: performance.now() - startTime,
      error,
    };
  }

  private createErrorResult<T>(
    flagKey: string,
    error: unknown,
    startTime: number
  ): EvaluationResult<T> {
    const evaluationError: EvaluationError = {
      code: 'EVALUATION_ERROR',
      message: error instanceof Error ? error.message : String(error),
      isTransient: true,
      stack:
        this.config.debug === true && error instanceof Error ? error.stack : undefined,
    };

    this.config.onError?.(
      error instanceof Error ? error : new Error(String(error)),
      flagKey
    );

    return this.createDefaultResult<T>(
      flagKey,
      'ERROR',
      startTime,
      undefined,
      evaluationError
    );
  }

  // ==========================================================================
  // Event Tracking
  // ==========================================================================

  private trackEvaluation(
    result: EvaluationResult,
    context: EvaluationContext
  ): void {
    if (!this.config.onEvaluation) {
      return;
    }

    const event: FlagEvaluationEvent = {
      type: 'evaluation',
      flagKey: result.flagKey,
      variantId: result.variantId,
      value: result.value,
      reason: result.reason,
      context,
      timestamp: result.timestamp,
      durationMs: result.durationMs,
    };

    this.config.onEvaluation(event);
  }

  /**
   * Track an exposure event (for experiments).
   */
  trackExposure(
    flagKey: string,
    experimentId?: string,
    metadata?: Record<string, JsonValue>
  ): void {
    if (!this.config.onExposure) {
      return;
    }

    const result = this.evaluate(flagKey);
    const event: FlagExposureEvent = {
      type: 'exposure',
      flagKey,
      variantId: result.variantId,
      experimentId,
      userId: this.context.user?.id ?? 'anonymous',
      sessionId: this.context.session?.sessionId ?? '',
      timestamp: new Date(),
      metadata,
    };

    this.config.onExposure(event);
  }

  private checkForChanges(flagKey: string, newValue: JsonValue): void {
    if (!this.config.onChange) {
      return;
    }

    const previousValue = this.previousValues.get(flagKey);
    if (
      previousValue !== undefined &&
      JSON.stringify(previousValue) !== JSON.stringify(newValue)
    ) {
      const event: FlagChangeEvent = {
        type: 'change',
        flagKey,
        previousValue,
        newValue,
        previousVariantId: 'unknown',
        newVariantId: 'unknown',
        timestamp: new Date(),
      };
      this.config.onChange(event);
    }

    this.previousValues.set(flagKey, newValue);
  }

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  /**
   * Invalidate cache for a flag.
   */
  invalidateCache(flagKey: string): void {
    this.cache.invalidate(flagKey);
  }

  /**
   * Clear all cached evaluations.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics.
   */
  getCacheStats(): { size: number; keys: string[] } {
    return this.cache.getStats();
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Check if the engine is initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get engine statistics.
   */
  getStats(): {
    flagCount: number;
    segmentCount: number;
    cacheSize: number;
    initialized: boolean;
  } {
    return {
      flagCount: this.flags.size,
      segmentCount: this.segments.size,
      cacheSize: this.cache.getStats().size,
      initialized: this.initialized,
    };
  }

  /**
   * Reset the engine to initial state.
   */
  reset(): void {
    this.flags.clear();
    this.segments.clear();
    this.cache.clear();
    this.previousValues.clear();
    this.context = this.config.defaultContext ?? {};
    this.initialized = false;
    this.log('Engine reset');
  }

  private log(message: string, data?: unknown): void {
    if (this.config.debug === true) {
      // eslint-disable-next-line no-console
      console.log(`[FlagEngine] ${message}`, data ?? '');
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: FlagEngine | null = null;

/**
 * Get the singleton flag engine instance.
 */
export function getFlagEngine(): FlagEngine {
  instance ??= new FlagEngine();
  return instance;
}

/**
 * Initialize the flag engine with configuration.
 */
export function initFlagEngine(config: FlagEngineConfig): FlagEngine {
  instance = new FlagEngine(config);
  return instance;
}

/**
 * Reset the singleton instance.
 */
export function resetFlagEngine(): void {
  if (instance) {
    instance.reset();
  }
  instance = null;
}
