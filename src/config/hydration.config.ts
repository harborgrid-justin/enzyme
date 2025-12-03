/**
 * @file Hydration Configuration
 * @description Configuration for the Auto-Prioritized Hydration System.
 *
 * This module configures hydration behavior including:
 * - Priority scheduling
 * - Visibility detection
 * - Interaction handling
 * - Performance metrics
 *
 * @module config/hydration.config
 *
 * @see {@link ../lib/hydration} for hydration implementation
 */

import type { HydrationConfig, HydrationTrigger } from './config-validation';
import { hydrationConfigSchema, HYDRATION_CONFIG_SCHEMA } from './config-validation';
import { CONFIG_NAMESPACES } from './types';
import { autoRegister, createEnvConfig } from './config-discovery';
import { getConfigRegistry, createTypedNamespace } from './config-registry';

// =============================================================================
// Hydration Configuration
// =============================================================================

/**
 * Default hydration configuration
 */
const defaultHydrationConfig: HydrationConfig = hydrationConfigSchema.parse({});

/**
 * Environment-specific hydration configuration
 */
export const hydrationConfig = createEnvConfig<HydrationConfig>({
  base: defaultHydrationConfig,

  development: {
    scheduler: {
      maxConcurrent: 5,
      batchSize: 20,
      yieldInterval: 32,
      useIdleCallback: true,
      idleTimeout: 2000,
    },
    metrics: {
      trackTiming: true,
      reportToPerformanceAPI: true,
      metricPrefix: 'dev_hydration',
    },
  },

  production: {
    scheduler: {
      maxConcurrent: 3,
      batchSize: 10,
      yieldInterval: 16,
      useIdleCallback: true,
      idleTimeout: 1000,
    },
    interaction: {
      triggerEvents: ['click', 'focus', 'touchstart'],
      useCapture: true,
      hydrateOnHover: true,
      hoverDelay: 50,
    },
    metrics: {
      trackTiming: true,
      reportToPerformanceAPI: true,
      metricPrefix: 'hydration',
    },
  },

  staging: {
    scheduler: {
      maxConcurrent: 4,
      batchSize: 15,
      yieldInterval: 8,
      useIdleCallback: true,
      idleTimeout: 75,
    },
    metrics: {
      trackTiming: true,
      reportToPerformanceAPI: true,
      metricPrefix: 'stg_hydration',
    },
  },
});

// =============================================================================
// Auto-Registration
// =============================================================================

/**
 * Register hydration configuration for auto-discovery
 */
autoRegister(CONFIG_NAMESPACES.HYDRATION, hydrationConfig, {
  priority: 10,
  dependencies: [CONFIG_NAMESPACES.PERFORMANCE],
});

// =============================================================================
// Type-Safe Accessor
// =============================================================================

/**
 * Type-safe accessor for hydration configuration
 *
 * @example
 * ```typescript
 * const maxConcurrent = hydration.get('scheduler')?.maxConcurrent;
 * hydration.set('enabled', true);
 * ```
 */
export const hydration = createTypedNamespace<HydrationConfig>(CONFIG_NAMESPACES.HYDRATION);

// =============================================================================
// Hydration Priority Presets
// =============================================================================

/**
 * Priority presets for common hydration scenarios
 */
export const HYDRATION_PRESETS = {
  /** Above-the-fold content - hydrate immediately */
  CRITICAL: {
    level: 1,
    trigger: 'immediate' as HydrationTrigger,
    timeout: 1000,
  },

  /** Interactive elements visible on load */
  HIGH: {
    level: 2,
    trigger: 'visible' as HydrationTrigger,
    threshold: 0.1,
    timeout: 3000,
  },

  /** Secondary interactive content */
  NORMAL: {
    level: 3,
    trigger: 'visible' as HydrationTrigger,
    threshold: 0.2,
    timeout: 5000,
  },

  /** Below-the-fold content */
  LOW: {
    level: 4,
    trigger: 'idle' as HydrationTrigger,
    timeout: 10000,
  },

  /** Content that only hydrates on interaction */
  LAZY: {
    level: 5,
    trigger: 'interaction' as HydrationTrigger,
    timeout: 30000,
  },

  /** Hover-triggered hydration */
  ON_HOVER: {
    level: 4,
    trigger: 'hover' as HydrationTrigger,
    timeout: 15000,
  },

  /** Manual hydration only */
  MANUAL: {
    level: 5,
    trigger: 'manual' as HydrationTrigger,
  },
} as const;

export type HydrationPreset = keyof typeof HYDRATION_PRESETS;

// =============================================================================
// Configuration Utilities
// =============================================================================

/**
 * Check if hydration is enabled
 */
export function isHydrationEnabled(): boolean {
  return hydration.getOrDefault('enabled', true);
}

/**
 * Get scheduler configuration
 */
export function getSchedulerConfig(): HydrationConfig['scheduler'] {
  return hydration.get('scheduler') ?? hydrationConfig.scheduler;
}

/**
 * Get visibility configuration
 */
export function getVisibilityConfig(): HydrationConfig['visibility'] {
  return hydration.get('visibility') ?? hydrationConfig.visibility;
}

/**
 * Get interaction configuration
 */
export function getInteractionConfig(): HydrationConfig['interaction'] {
  return hydration.get('interaction') ?? hydrationConfig.interaction;
}

/**
 * Get metrics configuration
 */
export function getMetricsConfig(): HydrationConfig['metrics'] {
  return hydration.get('metrics') ?? hydrationConfig.metrics;
}

/**
 * Calculate optimal batch size based on device capabilities
 */
export function getOptimalBatchSize(): number {
  const config = getSchedulerConfig();
  const baseBatchSize = config?.batchSize ?? 10;

  // Check if running on a low-powered device
  if (typeof navigator !== 'undefined') {
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;

    if (hardwareConcurrency <= 2) {
      return Math.max(5, Math.floor(baseBatchSize / 2));
    }

    if (hardwareConcurrency >= 8) {
      return Math.min(50, baseBatchSize * 2);
    }
  }

  return baseBatchSize;
}

/**
 * Get hydration priority configuration by preset name
 */
export function getHydrationPreset(
  preset: HydrationPreset
): (typeof HYDRATION_PRESETS)[HydrationPreset] {
  return HYDRATION_PRESETS[preset];
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize hydration configuration in the registry
 */
export function initializeHydrationConfig(): void {
  const registry = getConfigRegistry();

  // Register all hydration config values
  Object.entries(hydrationConfig).forEach(([key, value]) => {
    registry.set(CONFIG_NAMESPACES.HYDRATION, key, value as import('./types').ConfigValue, {
      source: 'default',
      schema: HYDRATION_CONFIG_SCHEMA,
    });
  });
}

// =============================================================================
// Exports
// =============================================================================

export { hydrationConfigSchema, HYDRATION_CONFIG_SCHEMA };
export type { HydrationConfig, HydrationTrigger };
