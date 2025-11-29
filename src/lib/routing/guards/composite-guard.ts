/**
 * @file Composite Guard
 * @description Combines multiple guards into a single guard with configurable
 * execution strategies. Enables complex access control scenarios.
 *
 * @module @/lib/routing/guards/composite-guard
 *
 * This module provides:
 * - Guard composition (AND/OR logic)
 * - Sequential and parallel execution
 * - Short-circuit evaluation
 * - Guard priority ordering
 * - Result aggregation
 *
 * @example
 * ```typescript
 * import { CompositeGuard, combineGuards, allGuards, anyGuard } from '@/lib/routing/guards/composite-guard';
 *
 * // All guards must pass
 * const restrictedGuard = allGuards([
 *   authGuard,
 *   roleGuard,
 *   featureGuard,
 * ]);
 *
 * // Any guard can pass
 * const flexibleGuard = anyGuard([
 *   adminGuard,
 *   ownerGuard,
 * ]);
 * ```
 */

import {
  GuardResult,
  type GuardContext,
  type GuardResultObject,
  type GuardTiming,
  type RouteGuard,
  type GuardExecutionResult,
  mergeGuardResults,
  getFirstRedirect,
  getDenialReasons,
} from './route-guard';

// =============================================================================
// Types
// =============================================================================

/**
 * Composite guard execution strategy
 */
export type CompositeStrategy =
  | 'all'        // All guards must pass (AND)
  | 'any'        // Any guard can pass (OR)
  | 'first'      // Use first guard result
  | 'priority'   // Execute in priority order
  | 'sequential' // Execute all in sequence
  | 'parallel';  // Execute all in parallel

/**
 * Composite guard configuration
 */
export interface CompositeGuardConfig {
  /** Guard name */
  readonly name?: string;
  /** Guards to combine */
  readonly guards: readonly RouteGuard[];
  /** Execution strategy */
  readonly strategy?: CompositeStrategy;
  /** Short-circuit on first failure (for 'all' strategy) */
  readonly shortCircuit?: boolean;
  /** Short-circuit on first success (for 'any' strategy) */
  readonly shortCircuitSuccess?: boolean;
  /** Custom result merger */
  readonly mergeResults?: (results: readonly GuardResultObject[]) => GuardResultObject;
  /** Timeout for parallel execution */
  readonly timeout?: number;
  /** Feature flag for this composite guard */
  readonly featureFlag?: string;
}

/**
 * Composite guard execution result
 */
export interface CompositeExecutionResult {
  /** Final result */
  readonly result: GuardResultObject;
  /** Individual guard results */
  readonly guardResults: readonly GuardExecutionResult[];
  /** Total execution time (ms) */
  readonly totalDurationMs: number;
  /** Guards that passed */
  readonly passed: readonly string[];
  /** Guards that failed */
  readonly failed: readonly string[];
  /** Guards that were skipped */
  readonly skipped: readonly string[];
  /** Strategy used */
  readonly strategy: CompositeStrategy;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default composite guard configuration
 */
export const DEFAULT_COMPOSITE_CONFIG: Partial<CompositeGuardConfig> = {
  name: 'composite',
  strategy: 'all',
  shortCircuit: true,
  shortCircuitSuccess: true,
  timeout: 30000,
};

// =============================================================================
// CompositeGuard Class
// =============================================================================

/**
 * Combines multiple guards into one
 *
 * @example
 * ```typescript
 * const guard = new CompositeGuard({
 *   guards: [authGuard, roleGuard, featureGuard],
 *   strategy: 'all',
 *   shortCircuit: true,
 * });
 *
 * const result = await guard.execute('canActivate', context);
 * ```
 */
export class CompositeGuard implements RouteGuard {
  readonly name: string;
  readonly priority: number;
  readonly enabled = true;
  private readonly config: CompositeGuardConfig;
  private readonly sortedGuards: readonly RouteGuard[];

  constructor(config: CompositeGuardConfig) {
    const mergedConfig = { ...DEFAULT_COMPOSITE_CONFIG, ...config };
    this.config = mergedConfig;
    this.name = mergedConfig.name ?? 'composite';
    this.priority = Math.min(...config.guards.map(g => g.priority ?? 100));

    // Sort guards by priority
    this.sortedGuards = [...config.guards].sort(
      (a, b) => (a.priority ?? 100) - (b.priority ?? 100)
    );
  }

  /**
   * Execute the composite guard
   */
  async execute(timing: GuardTiming, context: GuardContext): Promise<GuardResultObject> {
    const execResult = await this.executeWithDetails(timing, context);
    return execResult.result;
  }

  /**
   * Execute with detailed results
   */
  async executeWithDetails(
    timing: GuardTiming,
    context: GuardContext
  ): Promise<CompositeExecutionResult> {
    const strategy = this.config.strategy ?? 'all';
    const startTime = Date.now();

    switch (strategy) {
      case 'all':
        return this.executeAll(timing, context, startTime);
      case 'any':
        return this.executeAny(timing, context, startTime);
      case 'first':
        return this.executeFirst(timing, context, startTime);
      case 'priority':
        return this.executePriority(timing, context, startTime);
      case 'sequential':
        return this.executeSequential(timing, context, startTime);
      case 'parallel':
        return this.executeParallel(timing, context, startTime);
      default:
        return this.executeAll(timing, context, startTime);
    }
  }

  /**
   * Execute all guards (AND logic)
   */
  private async executeAll(
    timing: GuardTiming,
    context: GuardContext,
    startTime: number
  ): Promise<CompositeExecutionResult> {
    const guardResults: GuardExecutionResult[] = [];
    const passed: string[] = [];
    const failed: string[] = [];
    const skipped: string[] = [];

    for (const guard of this.sortedGuards) {
      // Check if guard applies
      if (!guard.appliesTo(context.path)) {
        skipped.push(guard.name);
        continue;
      }

      const execStart = Date.now();
      try {
        const result = await guard.execute(timing, context);
        const durationMs = Date.now() - execStart;

        guardResults.push({
          guardName: guard.name,
          result,
          durationMs,
          timedOut: false,
        });

        if (result.type === 'allow') {
          passed.push(guard.name);
        } else {
          failed.push(guard.name);

          // Short-circuit on failure
          if (this.config.shortCircuit === true) {
            return {
              result,
              guardResults,
              totalDurationMs: Date.now() - startTime,
              passed,
              failed,
              skipped: this.sortedGuards
                .filter(g => !passed.includes(g.name) && !failed.includes(g.name) && !skipped.includes(g.name))
                .map(g => g.name),
              strategy: 'all',
            };
          }
        }
      } catch (error) {
        failed.push(guard.name);
        guardResults.push({
          guardName: guard.name,
          result: GuardResult.deny(`Guard error: ${(error as Error).message}`),
          durationMs: Date.now() - execStart,
          timedOut: false,
          error: error as Error,
        });

        if (this.config.shortCircuit === true) {
          return {
            result: GuardResult.deny(`Guard "${guard.name}" failed`),
            guardResults,
            totalDurationMs: Date.now() - startTime,
            passed,
            failed,
            skipped,
            strategy: 'all',
          };
        }
      }
    }

    // Merge results
    const results = guardResults.map(gr => gr.result);
    const finalResult = this.config.mergeResults
      ? this.config.mergeResults(results)
      : mergeGuardResults(results);

    return {
      result: failed.length === 0 ? GuardResult.allow() : finalResult,
      guardResults,
      totalDurationMs: Date.now() - startTime,
      passed,
      failed,
      skipped,
      strategy: 'all',
    };
  }

  /**
   * Execute any guard (OR logic)
   */
  private async executeAny(
    timing: GuardTiming,
    context: GuardContext,
    startTime: number
  ): Promise<CompositeExecutionResult> {
    const guardResults: GuardExecutionResult[] = [];
    const passed: string[] = [];
    const failed: string[] = [];
    const skipped: string[] = [];

    for (const guard of this.sortedGuards) {
      if (!guard.appliesTo(context.path)) {
        skipped.push(guard.name);
        continue;
      }

      const execStart = Date.now();
      try {
        const result = await guard.execute(timing, context);
        const durationMs = Date.now() - execStart;

        guardResults.push({
          guardName: guard.name,
          result,
          durationMs,
          timedOut: false,
        });

        if (result.type === 'allow') {
          passed.push(guard.name);

          // Short-circuit on success
          if (this.config.shortCircuitSuccess === true) {
            return {
              result: GuardResult.allow(),
              guardResults,
              totalDurationMs: Date.now() - startTime,
              passed,
              failed,
              skipped: this.sortedGuards
                .filter(g => !passed.includes(g.name) && !failed.includes(g.name) && !skipped.includes(g.name))
                .map(g => g.name),
              strategy: 'any',
            };
          }
        } else {
          failed.push(guard.name);
        }
      } catch (error) {
        failed.push(guard.name);
        guardResults.push({
          guardName: guard.name,
          result: GuardResult.deny(`Guard error: ${(error as Error).message}`),
          durationMs: Date.now() - execStart,
          timedOut: false,
          error: error as Error,
        });
      }
    }

    // For 'any', allow if any passed
    let finalResult: GuardResultObject;
    if (passed.length > 0) {
      finalResult = GuardResult.allow();
    } else if (this.config.mergeResults) {
      finalResult = this.config.mergeResults(guardResults.map(gr => gr.result));
    } else {
      finalResult = getFirstRedirect(guardResults.map(gr => gr.result)) ??
        GuardResult.deny(getDenialReasons(guardResults.map(gr => gr.result)).join('; '));
    }

    return {
      result: finalResult,
      guardResults,
      totalDurationMs: Date.now() - startTime,
      passed,
      failed,
      skipped,
      strategy: 'any',
    };
  }

  /**
   * Execute first matching guard
   */
  private async executeFirst(
    timing: GuardTiming,
    context: GuardContext,
    startTime: number
  ): Promise<CompositeExecutionResult> {
    for (const guard of this.sortedGuards) {
      if (!guard.appliesTo(context.path)) {
        continue;
      }

      const execStart = Date.now();
      const result = await guard.execute(timing, context);

      return {
        result,
        guardResults: [{
          guardName: guard.name,
          result,
          durationMs: Date.now() - execStart,
          timedOut: false,
        }],
        totalDurationMs: Date.now() - startTime,
        passed: result.type === 'allow' ? [guard.name] : [],
        failed: result.type !== 'allow' ? [guard.name] : [],
        skipped: this.sortedGuards.filter(g => g.name !== guard.name).map(g => g.name),
        strategy: 'first',
      };
    }

    // No applicable guards
    return {
      result: GuardResult.allow(),
      guardResults: [],
      totalDurationMs: Date.now() - startTime,
      passed: [],
      failed: [],
      skipped: this.sortedGuards.map(g => g.name),
      strategy: 'first',
    };
  }

  /**
   * Execute in priority order (same as sequential for sorted guards)
   */
  private async executePriority(
    timing: GuardTiming,
    context: GuardContext,
    startTime: number
  ): Promise<CompositeExecutionResult> {
    return this.executeSequential(timing, context, startTime);
  }

  /**
   * Execute all guards sequentially
   */
  private async executeSequential(
    timing: GuardTiming,
    context: GuardContext,
    startTime: number
  ): Promise<CompositeExecutionResult> {
    const guardResults: GuardExecutionResult[] = [];
    const passed: string[] = [];
    const failed: string[] = [];
    const skipped: string[] = [];

    for (const guard of this.sortedGuards) {
      if (!guard.appliesTo(context.path)) {
        skipped.push(guard.name);
        continue;
      }

      const execStart = Date.now();
      try {
        const result = await guard.execute(timing, context);
        const durationMs = Date.now() - execStart;

        guardResults.push({
          guardName: guard.name,
          result,
          durationMs,
          timedOut: false,
        });

        if (result.type === 'allow') {
          passed.push(guard.name);
        } else {
          failed.push(guard.name);
        }
      } catch (error) {
        failed.push(guard.name);
        guardResults.push({
          guardName: guard.name,
          result: GuardResult.deny(`Guard error: ${(error as Error).message}`),
          durationMs: Date.now() - execStart,
          timedOut: false,
          error: error as Error,
        });
      }
    }

    const results = guardResults.map(gr => gr.result);
    const finalResult = this.config.mergeResults
      ? this.config.mergeResults(results)
      : mergeGuardResults(results);

    return {
      result: finalResult,
      guardResults,
      totalDurationMs: Date.now() - startTime,
      passed,
      failed,
      skipped,
      strategy: 'sequential',
    };
  }

  /**
   * Execute all guards in parallel
   */
  private async executeParallel(
    timing: GuardTiming,
    context: GuardContext,
    startTime: number
  ): Promise<CompositeExecutionResult> {
    const applicableGuards = this.sortedGuards.filter(g => g.appliesTo(context.path));
    const skipped = this.sortedGuards
      .filter(g => !applicableGuards.includes(g))
      .map(g => g.name);

    const timeout = this.config.timeout ?? 30000;

    const execPromises = applicableGuards.map(async (guard): Promise<GuardExecutionResult> => {
      const execStart = Date.now();
      try {
        const result = await Promise.race([
          guard.execute(timing, context),
          new Promise<GuardResultObject>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeout)
          ),
        ]);

        return {
          guardName: guard.name,
          result,
          durationMs: Date.now() - execStart,
          timedOut: false,
        };
      } catch (error) {
        const isTimeout = (error as Error).message === 'Timeout';
        return {
          guardName: guard.name,
          result: GuardResult.deny(isTimeout ? 'Guard timed out' : (error as Error).message),
          durationMs: Date.now() - execStart,
          timedOut: isTimeout,
          error: error as Error,
        };
      }
    });

    const guardResults = await Promise.all(execPromises);
    const passed = guardResults.filter(gr => gr.result.type === 'allow').map(gr => gr.guardName);
    const failed = guardResults.filter(gr => gr.result.type !== 'allow').map(gr => gr.guardName);

    const results = guardResults.map(gr => gr.result);
    const finalResult = this.config.mergeResults
      ? this.config.mergeResults(results)
      : mergeGuardResults(results);

    return {
      result: finalResult,
      guardResults,
      totalDurationMs: Date.now() - startTime,
      passed,
      failed,
      skipped,
      strategy: 'parallel',
    };
  }

  /**
   * Check if guard applies to a path
   */
  appliesTo(path: string): boolean {
    return this.sortedGuards.some(g => g.appliesTo(path));
  }

  /**
   * Get all guards in this composite
   */
  getGuards(): readonly RouteGuard[] {
    return this.sortedGuards;
  }

  /**
   * Get strategy
   */
  getStrategy(): CompositeStrategy {
    return this.config.strategy ?? 'all';
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a composite guard
 *
 * @param config - Composite guard configuration
 * @returns CompositeGuard instance
 */
export function createCompositeGuard(config: CompositeGuardConfig): CompositeGuard {
  return new CompositeGuard(config);
}

/**
 * Combine guards with AND logic (all must pass)
 *
 * @param guards - Guards to combine
 * @param options - Additional options
 * @returns CompositeGuard instance
 */
export function allGuards(
  guards: readonly RouteGuard[],
  options: Partial<Omit<CompositeGuardConfig, 'guards' | 'strategy'>> = {}
): CompositeGuard {
  return new CompositeGuard({
    ...options,
    guards,
    strategy: 'all',
  });
}

/**
 * Combine guards with OR logic (any can pass)
 *
 * @param guards - Guards to combine
 * @param options - Additional options
 * @returns CompositeGuard instance
 */
export function anyGuard(
  guards: readonly RouteGuard[],
  options: Partial<Omit<CompositeGuardConfig, 'guards' | 'strategy'>> = {}
): CompositeGuard {
  return new CompositeGuard({
    ...options,
    guards,
    strategy: 'any',
  });
}

/**
 * Combine guards for sequential execution
 *
 * @param guards - Guards to execute in order
 * @param options - Additional options
 * @returns CompositeGuard instance
 */
export function sequentialGuards(
  guards: readonly RouteGuard[],
  options: Partial<Omit<CompositeGuardConfig, 'guards' | 'strategy'>> = {}
): CompositeGuard {
  return new CompositeGuard({
    ...options,
    guards,
    strategy: 'sequential',
  });
}

/**
 * Combine guards for parallel execution
 *
 * @param guards - Guards to execute in parallel
 * @param options - Additional options
 * @returns CompositeGuard instance
 */
export function parallelGuards(
  guards: readonly RouteGuard[],
  options: Partial<Omit<CompositeGuardConfig, 'guards' | 'strategy'>> = {}
): CompositeGuard {
  return new CompositeGuard({
    ...options,
    guards,
    strategy: 'parallel',
  });
}

/**
 * Alias for allGuards
 */
export const combineGuards = allGuards;

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for CompositeGuard
 */
export function isCompositeGuard(value: unknown): value is CompositeGuard {
  return value instanceof CompositeGuard;
}

/**
 * Type guard for CompositeExecutionResult
 */
export function isCompositeExecutionResult(value: unknown): value is CompositeExecutionResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'result' in value &&
    'guardResults' in value &&
    'strategy' in value &&
    'passed' in value &&
    'failed' in value
  );
}
