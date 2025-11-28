/**
 * @file Automatic Feature Registry
 * @description Auto-discovers and registers features at build time using Vite's import.meta.glob
 */

import type { FeatureRegistryEntry } from './types';
import { registerFeature, getAllFeatures, clearFeatureRegistry } from './registry';
import { isDev } from '@/lib/core/config/env-helper';

// ============================================================================
// Types
// ============================================================================

/**
 * Feature module shape expected by auto-registration
 */
export interface FeatureModule {
  default?: FeatureRegistryEntry;
  [key: string]: unknown;
}

/**
 * Feature discovery result
 */
export interface FeatureDiscoveryResult {
  registered: string[];
  failed: Array<{ path: string; error: string }>;
  skipped: string[];
  duration: number;
}

// ============================================================================
// Feature Discovery
// ============================================================================

/**
 * Auto-register all features from the features directory
 * Uses Vite's import.meta.glob for build-time discovery
 */
export async function autoRegisterFeatures(): Promise<FeatureDiscoveryResult> {
  const startTime = performance.now();
  const result: FeatureDiscoveryResult = {
    registered: [],
    failed: [],
    skipped: [],
    duration: 0,
  };

  // Vite's glob import - resolved at build time
  // This pattern discovers all feature.ts files in the features directory
  const featureModules = import.meta.glob<FeatureModule>(
    '/src/features/*/feature.ts',
    { eager: false }
  );

  const entries = Object.entries(featureModules);

  if (entries.length === 0) {
    console.warn('[FeatureRegistry] No features found in /src/features/*/feature.ts');
    result.duration = performance.now() - startTime;
    return result;
  }

  // Load and register features in parallel
  await Promise.all(
    entries.map(async ([modulePath, importFn]) => {
      try {
        const module = await importFn();

        // Look for default export (FeatureRegistryEntry)
        const feature = module.default;

        if (!feature) {
          result.skipped.push(`${modulePath} (no default export)`);
          return;
        }

        if (!feature.config?.metadata?.id) {
          result.skipped.push(`${modulePath} (missing config.metadata.id)`);
          return;
        }

        registerFeature(feature);
        result.registered.push(feature.config.metadata.id);
      } catch (error) {
        result.failed.push({
          path: modulePath,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    })
  );

  result.duration = performance.now() - startTime;
  return result;
}

/**
 * Synchronous feature registration from explicit imports
 * Use when you need deterministic registration order
 */
export function registerFeaturesSync(features: FeatureRegistryEntry[]): FeatureDiscoveryResult {
  const startTime = performance.now();
  const result: FeatureDiscoveryResult = {
    registered: [],
    failed: [],
    skipped: [],
    duration: 0,
  };

  for (const feature of features) {
    try {
      if (!feature.config?.metadata?.id) {
        result.skipped.push('unknown (missing config.metadata.id)');
        continue;
      }

      registerFeature(feature);
      result.registered.push(feature.config.metadata.id);
    } catch (error) {
      result.failed.push({
        path: feature.config?.metadata?.id || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  result.duration = performance.now() - startTime;
  return result;
}

// ============================================================================
// Registry Utilities
// ============================================================================

/**
 * Get feature registry as a plain object (for serialization/debugging)
 */
export function getFeatureRegistrySnapshot(): Record<string, {
  id: string;
  name: string;
  description?: string;
  category?: string;
  order?: number;
  featureFlag?: string;
}> {
  const features = getAllFeatures();
  const snapshot: Record<string, {
    id: string;
    name: string;
    description?: string;
    category?: string;
    order?: number;
    featureFlag?: string;
  }> = {};

  for (const feature of features) {
    const { metadata, access } = feature.config;
    snapshot[metadata.id] = {
      id: metadata.id,
      name: metadata.name,
      ...(metadata.description !== undefined && { description: metadata.description }),
      ...(metadata.category !== undefined && { category: metadata.category }),
      ...(metadata.order !== undefined && { order: metadata.order }),
      ...(access.featureFlag !== undefined && { featureFlag: access.featureFlag }),
    };
  }

  return snapshot;
}

/**
 * Get features grouped by category
 */
export function getFeaturesByCategory(): Record<string, FeatureRegistryEntry[]> {
  const features = getAllFeatures();
  const byCategory: Record<string, FeatureRegistryEntry[]> = {};

  for (const feature of features) {
    const category = feature.config.metadata.category ?? 'general';
    byCategory[category] ??= [];
    byCategory[category].push(feature);
  }

  // Sort features within each category by order
  for (const category of Object.keys(byCategory)) {
    const categoryFeatures = byCategory[category];
    if (categoryFeatures) {
      categoryFeatures.sort((a, b) => {
        const orderA = a.config.metadata.order ?? 999;
        const orderB = b.config.metadata.order ?? 999;
        return orderA - orderB;
      });
    }
  }

  return byCategory;
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialization state
 */
let initialized = false;
let initializationPromise: Promise<FeatureDiscoveryResult> | null = null;

/**
 * Feature registry initialization hook
 * Safe to call multiple times - only initializes once
 */
export async function initializeFeatureRegistry(): Promise<FeatureDiscoveryResult> {
  if (initialized) {
    return { registered: [], failed: [], skipped: [], duration: 0 };
  }

  // Prevent race conditions with concurrent initialization
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = autoRegisterFeatures().then((result) => {
    initialized = true;

    if (isDev()) {
      console.log('[FeatureRegistry] Initialization complete:', {
        registered: result.registered.length,
        failed: result.failed.length,
        skipped: result.skipped.length,
        duration: `${result.duration.toFixed(2)}ms`,
      });

      if (result.failed.length > 0) {
        console.warn('[FeatureRegistry] Failed to load:', result.failed);
      }
    }

    return result;
  });

  return initializationPromise;
}

/**
 * Check if the feature registry has been initialized
 */
export function isFeatureRegistryInitialized(): boolean {
  return initialized;
}

/**
 * Reset the feature registry (useful for testing)
 */
export function resetFeatureRegistry(): void {
  clearFeatureRegistry();
  initialized = false;
  initializationPromise = null;
}

/**
 * Wait for feature registry to be ready
 * Useful when you need to ensure features are loaded before rendering
 */
export async function waitForFeatureRegistry(): Promise<void> {
  if (initialized) return;
  await initializeFeatureRegistry();
}
