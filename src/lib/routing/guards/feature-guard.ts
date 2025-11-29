/**
 * @file Feature Flag Guard
 * @description Route guard for feature flag-based access control. Controls route
 * access based on feature flag states.
 *
 * @module @/lib/routing/guards/feature-guard
 *
 * This module provides:
 * - Feature flag checking
 * - Multiple flag combinations
 * - Flag-based redirects
 * - Fallback handling
 * - Dynamic flag evaluation
 *
 * @example
 * ```typescript
 * import { createFeatureGuard, FeatureGuard } from '@/lib/routing/guards/feature-guard';
 *
 * const betaGuard = createFeatureGuard({
 *   requiredFlags: ['beta-features'],
 *   matchStrategy: 'all',
 *   fallbackPath: '/coming-soon',
 * });
 * ```
 */

import {
  BaseRouteGuard,
  GuardResult,
  type GuardContext,
  type GuardResultObject,
} from './route-guard';

// =============================================================================
// Types
// =============================================================================

/**
 * Feature flag matching strategy
 */
export type FeatureFlagMatchStrategy =
  | 'any'   // Any flag must be enabled
  | 'all'   // All flags must be enabled
  | 'none'; // No flags should be enabled (for deprecated features)

/**
 * Feature flag state
 */
export type FeatureFlagState = boolean | string | number | null | undefined;

/**
 * Feature flag provider function
 */
export type FeatureFlagProvider = (
  flagKey: string,
  context?: GuardContext
) => FeatureFlagState | Promise<FeatureFlagState>;

/**
 * Feature guard configuration
 */
export interface FeatureGuardConfig {
  /** Guard name */
  readonly name?: string;
  /** Required feature flags */
  readonly requiredFlags: readonly string[];
  /** How to match flags */
  readonly matchStrategy?: FeatureFlagMatchStrategy;
  /** Path to redirect when flags not met */
  readonly fallbackPath?: string;
  /** Custom message for fallback */
  readonly fallbackMessage?: string;
  /** Feature flag provider function */
  readonly getFlag?: FeatureFlagProvider;
  /** Default flag value when not found */
  readonly defaultFlagValue?: boolean;
  /** Custom flag evaluation logic */
  readonly evaluateFlag?: (
    flagKey: string,
    flagValue: FeatureFlagState,
    context: GuardContext
  ) => boolean;
  /** Enable caching of flag values */
  readonly cacheFlags?: boolean;
  /** Cache TTL in milliseconds */
  readonly cacheTTL?: number;
  /** Routes this guard applies to */
  readonly routes?: readonly string[];
  /** Routes to exclude */
  readonly exclude?: readonly string[];
  /** Guard priority */
  readonly priority?: number;
  /** Parent feature flag for this guard */
  readonly featureFlag?: string;
}

/**
 * Feature flag check result
 */
export interface FeatureFlagCheckResult {
  /** Whether flags allow access */
  readonly hasAccess: boolean;
  /** Evaluated flag states */
  readonly flagStates: Readonly<Record<string, FeatureFlagState>>;
  /** Enabled flags */
  readonly enabledFlags: readonly string[];
  /** Disabled flags */
  readonly disabledFlags: readonly string[];
  /** Strategy used */
  readonly strategy: FeatureFlagMatchStrategy;
  /** Whether result came from cache */
  readonly fromCache: boolean;
}

/**
 * Flag cache entry
 */
interface FlagCacheEntry {
  readonly value: FeatureFlagState;
  readonly expiresAt: number;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default feature guard configuration
 */
export const DEFAULT_FEATURE_CONFIG: Partial<FeatureGuardConfig> = {
  name: 'feature',
  matchStrategy: 'all',
  fallbackPath: '/feature-unavailable',
  fallbackMessage: 'This feature is not available',
  defaultFlagValue: false,
  cacheFlags: true,
  cacheTTL: 60000, // 1 minute
  priority: 5, // Run early
};

// =============================================================================
// FeatureGuard Class
// =============================================================================

/**
 * Feature flag route guard
 *
 * @example
 * ```typescript
 * const guard = new FeatureGuard({
 *   requiredFlags: ['new-dashboard', 'beta-analytics'],
 *   matchStrategy: 'all',
 *   getFlag: async (key) => featureFlagService.isEnabled(key),
 * });
 *
 * const result = await guard.execute('canActivate', context);
 * ```
 */
export class FeatureGuard extends BaseRouteGuard {
  private readonly featureConfig: FeatureGuardConfig;
  private readonly flagCache: Map<string, FlagCacheEntry> = new Map();

  constructor(config: FeatureGuardConfig) {
    const mergedConfig = { ...DEFAULT_FEATURE_CONFIG, ...config };

    super({
      name: mergedConfig.name ?? 'feature',
      description: `Feature guard - requires: ${config.requiredFlags.join(', ')}`,
      priority: mergedConfig.priority,
      routes: mergedConfig.routes,
      exclude: mergedConfig.exclude,
      featureFlag: mergedConfig.featureFlag,
      canActivate: async (context) => this.checkFeatureAccess(context),
      canMatch: async (context) => this.checkFeatureAccess(context),
      canLoad: async (context) => this.checkFeatureAccess(context),
    });

    this.featureConfig = mergedConfig;
  }

  /**
   * Check if required features are enabled
   */
  private async checkFeatureAccess(context: GuardContext): Promise<GuardResultObject> {
    const checkResult = await this.performFeatureCheck(context);

    if (!checkResult.hasAccess) {
      return this.handleFeatureDisabled(context, checkResult);
    }

    return GuardResult.allow({ featureCheck: checkResult });
  }

  /**
   * Perform feature flag check
   */
  private async performFeatureCheck(context: GuardContext): Promise<FeatureFlagCheckResult> {
    const strategy = this.featureConfig.matchStrategy ?? 'all';
    const {requiredFlags} = this.featureConfig;

    const flagStates: Record<string, FeatureFlagState> = {};
    const enabledFlags: string[] = [];
    const disabledFlags: string[] = [];
    let fromCache = true;

    for (const flagKey of requiredFlags) {
      const { value, cached } = await this.getFlagValue(flagKey, context);
      flagStates[flagKey] = value;
      if (!cached) fromCache = false;

      const isEnabled = this.isFlagEnabled(flagKey, value, context);
      if (isEnabled) {
        enabledFlags.push(flagKey);
      } else {
        disabledFlags.push(flagKey);
      }
    }

    let hasAccess = false;
    switch (strategy) {
      case 'any':
        hasAccess = enabledFlags.length > 0;
        break;
      case 'all':
        hasAccess = disabledFlags.length === 0;
        break;
      case 'none':
        hasAccess = enabledFlags.length === 0;
        break;
    }

    return {
      hasAccess,
      flagStates,
      enabledFlags,
      disabledFlags,
      strategy,
      fromCache,
    };
  }

  /**
   * Get flag value (with caching)
   */
  private async getFlagValue(
    flagKey: string,
    context: GuardContext
  ): Promise<{ value: FeatureFlagState; cached: boolean }> {
    // Check cache first
    if (this.featureConfig.cacheFlags === true) {
      const cached = this.flagCache.get(flagKey);
      if (cached && Date.now() < cached.expiresAt) {
        return { value: cached.value, cached: true };
      }
    }

    // Get fresh value
    let value: FeatureFlagState;

    if (this.featureConfig.getFlag) {
      value = await this.featureConfig.getFlag(flagKey, context);
    } else if (context.features) {
      value = context.features[flagKey];
    } else {
      value = this.featureConfig.defaultFlagValue;
    }

    // Update cache
    if (this.featureConfig.cacheFlags === true) {
      this.flagCache.set(flagKey, {
        value,
        expiresAt: Date.now() + (this.featureConfig.cacheTTL ?? 60000),
      });
    }

    return { value, cached: false };
  }

  /**
   * Determine if a flag is enabled
   */
  private isFlagEnabled(
    flagKey: string,
    value: FeatureFlagState,
    context: GuardContext
  ): boolean {
    // Use custom evaluator if provided
    if (this.featureConfig.evaluateFlag) {
      return this.featureConfig.evaluateFlag(flagKey, value, context);
    }

    // Default evaluation
    if (value === undefined || value === null) {
      return this.featureConfig.defaultFlagValue ?? false;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1' || value === 'enabled';
    }

    if (typeof value === 'number') {
      return value > 0;
    }

    return Boolean(value);
  }

  /**
   * Handle disabled feature
   */
  private handleFeatureDisabled(
    _context: GuardContext,
    checkResult: FeatureFlagCheckResult
  ): GuardResultObject {
    const fallbackPath = this.featureConfig.fallbackPath ?? '/feature-unavailable';
    const message = this.featureConfig.fallbackMessage ?? 'This feature is not available';

    return GuardResult.redirect(fallbackPath, {
      state: {
        reason: message,
        requiredFlags: this.featureConfig.requiredFlags,
        disabledFlags: checkResult.disabledFlags,
        strategy: checkResult.strategy,
      },
    });
  }

  /**
   * Get required flags
   */
  getRequiredFlags(): readonly string[] {
    return this.featureConfig.requiredFlags;
  }

  /**
   * Get match strategy
   */
  getMatchStrategy(): FeatureFlagMatchStrategy {
    return this.featureConfig.matchStrategy ?? 'all';
  }

  /**
   * Check a single flag without full guard execution
   */
  async checkFlag(flagKey: string, context: GuardContext): Promise<boolean> {
    const { value } = await this.getFlagValue(flagKey, context);
    return this.isFlagEnabled(flagKey, value, context);
  }

  /**
   * Clear flag cache
   */
  clearCache(): void {
    this.flagCache.clear();
  }

  /**
   * Invalidate specific flag in cache
   */
  invalidateFlag(flagKey: string): void {
    this.flagCache.delete(flagKey);
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a feature guard
 *
 * @param config - Guard configuration
 * @returns FeatureGuard instance
 */
export function createFeatureGuard(config: FeatureGuardConfig): FeatureGuard {
  return new FeatureGuard(config);
}

/**
 * Create a guard requiring a single feature flag
 *
 * @param flag - Required flag
 * @param options - Additional options
 * @returns FeatureGuard instance
 */
export function requireFeature(
  flag: string,
  options: Partial<Omit<FeatureGuardConfig, 'requiredFlags'>> = {}
): FeatureGuard {
  return new FeatureGuard({
    ...options,
    requiredFlags: [flag],
    matchStrategy: 'any',
  });
}

/**
 * Create a guard requiring any of the specified features
 *
 * @param flags - Feature flags (any one required)
 * @param options - Additional options
 * @returns FeatureGuard instance
 */
export function requireAnyFeature(
  flags: readonly string[],
  options: Partial<Omit<FeatureGuardConfig, 'requiredFlags' | 'matchStrategy'>> = {}
): FeatureGuard {
  return new FeatureGuard({
    ...options,
    requiredFlags: flags,
    matchStrategy: 'any',
  });
}

/**
 * Create a guard requiring all specified features
 *
 * @param flags - Feature flags (all required)
 * @param options - Additional options
 * @returns FeatureGuard instance
 */
export function requireAllFeatures(
  flags: readonly string[],
  options: Partial<Omit<FeatureGuardConfig, 'requiredFlags' | 'matchStrategy'>> = {}
): FeatureGuard {
  return new FeatureGuard({
    ...options,
    requiredFlags: flags,
    matchStrategy: 'all',
  });
}

/**
 * Create a guard for deprecated features (must be disabled)
 *
 * @param flags - Deprecated feature flags
 * @param options - Additional options
 * @returns FeatureGuard instance
 */
export function deprecatedFeature(
  flags: readonly string[],
  options: Partial<Omit<FeatureGuardConfig, 'requiredFlags' | 'matchStrategy'>> = {}
): FeatureGuard {
  return new FeatureGuard({
    ...options,
    requiredFlags: flags,
    matchStrategy: 'none',
    fallbackMessage: 'This feature has been deprecated',
  });
}

/**
 * Create a beta feature guard
 *
 * @param featureName - Name of the beta feature
 * @param options - Additional options
 * @returns FeatureGuard instance
 */
export function betaFeature(
  featureName: string,
  options: Partial<Omit<FeatureGuardConfig, 'requiredFlags'>> = {}
): FeatureGuard {
  return new FeatureGuard({
    name: `beta-${featureName}`,
    requiredFlags: [`beta-${featureName}`],
    matchStrategy: 'any',
    fallbackPath: '/beta-program',
    fallbackMessage: 'This feature is currently in beta',
    ...options,
  });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a feature flag provider from a static config
 *
 * @param flags - Static flag configuration
 * @returns Feature flag provider function
 */
export function createStaticFlagProvider(
  flags: Record<string, FeatureFlagState>
): FeatureFlagProvider {
  return (flagKey: string) => flags[flagKey];
}

/**
 * Create a feature flag provider from localStorage
 *
 * @param prefix - Key prefix in localStorage
 * @returns Feature flag provider function
 */
export function createLocalStorageFlagProvider(
  prefix = 'feature:'
): FeatureFlagProvider {
  return (flagKey: string) => {
    try {
      const value = localStorage.getItem(`${prefix}${flagKey}`);
      if (value === null) return undefined;
      return JSON.parse(value) as FeatureFlagState;
    } catch {
      return undefined;
    }
  };
}

/**
 * Create a feature flag provider from URL parameters
 *
 * @param paramPrefix - URL parameter prefix
 * @returns Feature flag provider function
 */
export function createUrlFlagProvider(
  paramPrefix = 'ff_'
): FeatureFlagProvider {
  return (flagKey: string, context?: GuardContext) => {
    if (context?.query) {
      const paramKey = `${paramPrefix}${flagKey}`;
      const value = context.query[paramKey];
      if (value === 'true' || value === '1') return true;
      if (value === 'false' || value === '0') return false;
      return value;
    }
    return undefined;
  };
}

/**
 * Combine multiple flag providers (first defined value wins)
 *
 * @param providers - Array of providers
 * @returns Combined provider function
 */
export function combineFlagProviders(
  providers: readonly FeatureFlagProvider[]
): FeatureFlagProvider {
  return async (flagKey: string, context?: GuardContext) => {
    for (const provider of providers) {
      const value = await provider(flagKey, context);
      if (value !== undefined) {
        return value;
      }
    }
    return undefined;
  };
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for FeatureGuard
 */
export function isFeatureGuard(value: unknown): value is FeatureGuard {
  return value instanceof FeatureGuard;
}

/**
 * Type guard for FeatureFlagCheckResult
 */
export function isFeatureFlagCheckResult(value: unknown): value is FeatureFlagCheckResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'hasAccess' in value &&
    'flagStates' in value &&
    'enabledFlags' in value &&
    'strategy' in value
  );
}
