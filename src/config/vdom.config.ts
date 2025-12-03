/**
 * @file Virtual DOM Configuration
 * @description Configuration for the Virtual Modular DOM System.
 *
 * This module configures VDOM behavior including:
 * - Module partitioning
 * - Memory management
 * - Reconciliation
 * - Security boundaries
 *
 * @module config/vdom.config
 *
 * @see {@link ../lib/vdom} for VDOM implementation
 */

import type { VDOMConfig } from './config-validation';
import { vdomConfigSchema, VDOM_CONFIG_SCHEMA } from './config-validation';
import { CONFIG_NAMESPACES } from './types';
import { autoRegister, createEnvConfig } from './config-discovery';
import { getConfigRegistry, createTypedNamespace } from './config-registry';

// =============================================================================
// VDOM Configuration
// =============================================================================

/**
 * Default VDOM configuration
 */
const defaultVDOMConfig: VDOMConfig = vdomConfigSchema.parse({});

/**
 * Environment-specific VDOM configuration
 */
export const vdomConfig = createEnvConfig<VDOMConfig>({
  base: defaultVDOMConfig,

  development: {
    enabled: true,
    partitioning: {
      auto: true,
      maxModuleSize: 2000,
      boundaryThreshold: 0.6,
    },
    memory: {
      usePooling: true,
      poolSize: 200,
      gcInterval: 30000,
      memoryLimit: 200,
    },
    reconciliation: {
      batchUpdates: true,
      maxBatchSize: 100,
      useRAF: true,
      diffAlgorithm: 'lis',
    },
    boundaries: {
      sandbox: false,
      cspIntegration: false,
      xssPrevention: true,
    },
  },

  production: {
    enabled: true,
    partitioning: {
      auto: true,
      maxModuleSize: 1000,
      boundaryThreshold: 0.7,
    },
    memory: {
      usePooling: true,
      poolSize: 100,
      gcInterval: 10000,
      memoryLimit: 100,
    },
    reconciliation: {
      batchUpdates: true,
      maxBatchSize: 50,
      useRAF: true,
      diffAlgorithm: 'lis',
    },
    boundaries: {
      sandbox: true,
      cspIntegration: true,
      xssPrevention: true,
    },
  },

  staging: {
    memory: {
      usePooling: true,
      poolSize: 150,
      gcInterval: 15000,
      memoryLimit: 100,
    },
    boundaries: {
      sandbox: true,
      cspIntegration: true,
      xssPrevention: true,
    },
  },
});

// =============================================================================
// Auto-Registration
// =============================================================================

/**
 * Register VDOM configuration for auto-discovery
 */
autoRegister(CONFIG_NAMESPACES.VDOM, vdomConfig, {
  priority: 15,
  dependencies: [CONFIG_NAMESPACES.PERFORMANCE, CONFIG_NAMESPACES.SECURITY],
});

// =============================================================================
// Type-Safe Accessor
// =============================================================================

/**
 * Type-safe accessor for VDOM configuration
 */
export const vdom = createTypedNamespace<VDOMConfig>(CONFIG_NAMESPACES.VDOM);

// =============================================================================
// Diff Algorithm Types
// =============================================================================

/**
 * Available diff algorithms
 */
export const DIFF_ALGORITHMS = {
  /** Simple O(n) diff - fastest, least accurate */
  SIMPLE: 'simple',
  /** Keyed diff - good balance of speed and accuracy */
  KEYED: 'keyed',
  /** Longest Increasing Subsequence - most accurate, O(n log n) */
  LIS: 'lis',
} as const;

export type DiffAlgorithm = (typeof DIFF_ALGORITHMS)[keyof typeof DIFF_ALGORITHMS];

/**
 * Get the configured diff algorithm
 */
export function getDiffAlgorithm(): DiffAlgorithm {
  return (vdom.get('reconciliation')?.diffAlgorithm ?? 'lis') as DiffAlgorithm;
}

// =============================================================================
// Module Boundary Types
// =============================================================================

/**
 * Module boundary strategies
 */
export const BOUNDARY_STRATEGIES = {
  /** Component-based boundaries */
  COMPONENT: 'component',
  /** Route-based boundaries */
  ROUTE: 'route',
  /** Feature-based boundaries */
  FEATURE: 'feature',
  /** Manual boundaries only */
  MANUAL: 'manual',
} as const;

export type BoundaryStrategy = (typeof BOUNDARY_STRATEGIES)[keyof typeof BOUNDARY_STRATEGIES];

// =============================================================================
// Configuration Utilities
// =============================================================================

/**
 * Check if VDOM system is enabled
 */
export function isVDOMEnabled(): boolean {
  return vdom.getOrDefault('enabled', true);
}

/**
 * Check if DOM pooling is enabled
 */
export function isPoolingEnabled(): boolean {
  return vdom.get('memory')?.usePooling ?? true;
}

/**
 * Get the pool size
 */
export function getPoolSize(): number {
  return vdom.get('memory')?.poolSize ?? 100;
}

/**
 * Get the GC interval
 */
export function getGCInterval(): number {
  return vdom.get('memory')?.gcInterval ?? 10000;
}

/**
 * Get the memory limit in MB
 */
export function getMemoryLimit(): number {
  return vdom.get('memory')?.memoryLimit ?? 100;
}

/**
 * Get the maximum module size
 */
export function getMaxModuleSize(): number {
  return vdom.get('partitioning')?.maxModuleSize ?? 1000;
}

/**
 * Check if batch updates are enabled
 */
export function isBatchingEnabled(): boolean {
  return vdom.get('reconciliation')?.batchUpdates ?? true;
}

/**
 * Get the maximum batch size
 */
export function getMaxBatchSize(): number {
  return vdom.get('reconciliation')?.maxBatchSize ?? 50;
}

/**
 * Check if sandboxing is enabled
 */
export function isSandboxEnabled(): boolean {
  return vdom.get('boundaries')?.sandbox ?? false;
}

/**
 * Check if CSP integration is enabled
 */
export function isCSPIntegrationEnabled(): boolean {
  return vdom.get('boundaries')?.cspIntegration ?? true;
}

/**
 * Check if XSS prevention is enabled
 */
export function isXSSPreventionEnabled(): boolean {
  return vdom.get('boundaries')?.xssPrevention ?? true;
}

// =============================================================================
// Memory Management Utilities
// =============================================================================

/**
 * Memory pressure levels
 */
export const MEMORY_PRESSURE = {
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type MemoryPressure = (typeof MEMORY_PRESSURE)[keyof typeof MEMORY_PRESSURE];

/**
 * Get current memory pressure level (if available)
 */
export function getMemoryPressure(): MemoryPressure {
  if (typeof performance === 'undefined' || !('memory' in performance)) {
    return 'low';
  }

  const { memory } = performance as Performance & {
    memory?: {
      usedJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  };

  if (!memory) return 'low';

  const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

  if (usageRatio > 0.9) return 'critical';
  if (usageRatio > 0.75) return 'high';
  if (usageRatio > 0.5) return 'moderate';
  return 'low';
}

/**
 * Get adjusted pool size based on memory pressure
 */
export function getAdjustedPoolSize(): number {
  const baseSize = getPoolSize();
  const pressure = getMemoryPressure();

  const multipliers: Record<MemoryPressure, number> = {
    low: 1,
    moderate: 0.75,
    high: 0.5,
    critical: 0.25,
  };

  return Math.max(10, Math.floor(baseSize * multipliers[pressure]));
}

/**
 * Check if garbage collection should be triggered
 */
export function shouldTriggerGC(): boolean {
  const pressure = getMemoryPressure();
  return pressure === 'high' || pressure === 'critical';
}

// =============================================================================
// Reconciliation Utilities
// =============================================================================

/**
 * Get optimal batch configuration based on frame budget
 */
export function getOptimalBatchConfig(frameBudgetMs: number = 16): {
  maxBatchSize: number;
  yieldsPerBatch: number;
} {
  const baseMaxBatch = getMaxBatchSize();
  const diffAlgorithm = getDiffAlgorithm();

  // Adjust based on diff algorithm complexity
  const complexityMultiplier: Record<DiffAlgorithm, number> = {
    simple: 1.5,
    keyed: 1,
    lis: 0.75,
  };

  const adjustedMaxBatch = Math.floor(baseMaxBatch * complexityMultiplier[diffAlgorithm]);

  // Calculate yields based on frame budget
  const yieldsPerBatch = Math.max(1, Math.floor(adjustedMaxBatch / (frameBudgetMs / 4)));

  return {
    maxBatchSize: adjustedMaxBatch,
    yieldsPerBatch,
  };
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize VDOM configuration in the registry
 */
export function initializeVDOMConfig(): void {
  const registry = getConfigRegistry();

  // Register all VDOM config values
  Object.entries(vdomConfig).forEach(([key, value]) => {
    registry.set(CONFIG_NAMESPACES.VDOM, key, value as import('./types').ConfigValue, {
      source: 'default',
      schema: VDOM_CONFIG_SCHEMA,
    });
  });
}

// =============================================================================
// Exports
// =============================================================================

export { vdomConfigSchema, VDOM_CONFIG_SCHEMA };
export type { VDOMConfig };
