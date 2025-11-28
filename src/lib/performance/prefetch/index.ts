/**
 * @file Prefetch Module
 * @description Intelligent prefetching utilities for routes, data, and assets.
 *
 * Provides ML-like prediction, multiple prefetch strategies, and priority-based
 * queue management for optimal resource loading.
 */

// ============================================================================
// Intelligent Prefetch Engine
// ============================================================================
export {
  // Class
  IntelligentPrefetchEngine,
  // Factory functions
  getIntelligentPrefetchEngine,
  resetIntelligentPrefetchEngine,
  // Types
  type NavigationEvent,
  type PrefetchCandidate,
  type PredictionResult,
  type PredictionFactor,
  type BehaviorMetrics,
  type IntelligentPrefetchConfig,
} from './intelligent-prefetch';

// ============================================================================
// Prefetch Strategies
// ============================================================================
export {
  // Classes
  PrefetchStrategy,
  ViewportPrefetchStrategy,
  HoverPrefetchStrategy,
  IdlePrefetchStrategy,
  SequentialPrefetchStrategy,
  ConditionalPrefetchStrategy,
  StrategyComposer,
  // Factory functions
  createViewportStrategy,
  createHoverStrategy,
  createIdleStrategy,
  createSequentialStrategy,
  createConditionalStrategy,
  // Types
  type PrefetchStrategyType,
  type PrefetchTarget,
  type StrategyContext,
  type StrategyResult,
  type BaseStrategyConfig,
  type ViewportStrategyConfig,
  type HoverStrategyConfig,
  type IdleStrategyConfig,
  type SequentialStrategyConfig,
  type ConditionalStrategyConfig,
} from './prefetch-strategies';

// ============================================================================
// Prefetch Queue
// ============================================================================
export {
  // Class
  PrefetchQueue,
  // Factory functions
  getPrefetchQueue,
  resetPrefetchQueue,
  // Types
  type PrefetchPriority,
  type PrefetchStatus,
  type PrefetchItem,
  type PrefetchQueueConfig,
  type QueueStats,
  type QueueEventType,
  type QueueEventListener,
} from './prefetch-queue';

// ============================================================================
// Route Prefetch
// ============================================================================
export {
  // Class
  RoutePrefetchManager,
  // Factory functions
  getRoutePrefetchManager,
  resetRoutePrefetchManager,
  // Convenience functions
  prefetchRoute,
  registerPrefetchRoutes,
  createRouteLinkHandlers,
  // Types
  type PrefetchableRoute,
  type RoutePrefetchConfig,
  type RoutePrefetchResult,
  type LinkPrefetchHandlers,
} from './route-prefetch';

// ============================================================================
// Data Prefetch
// ============================================================================
export {
  // Class
  DataPrefetchManager,
  // Factory functions
  getDataPrefetchManager,
  resetDataPrefetchManager,
  // Convenience functions
  prefetchData,
  prefetchGraphQL,
  getCachedData,
  invalidateData,
  invalidateDataByTag,
  // Types
  type DataPrefetchConfig,
  type PrefetchRequestOptions,
  type PrefetchResult,
  type GraphQLPrefetchOptions,
} from './data-prefetch';

// ============================================================================
// Asset Prefetch
// ============================================================================
export {
  // Class
  AssetPrefetchManager,
  // Factory functions
  getAssetPrefetchManager,
  resetAssetPrefetchManager,
  // Convenience functions
  prefetchImage,
  prefetchImages,
  prefetchFont,
  dnsPrefetch,
  preconnect,
  preloadAsset,
  // Types
  type AssetType,
  type Asset,
  type ResponsiveImage,
  type FontAsset,
  type AssetPrefetchConfig,
  type AssetPrefetchResult,
} from './asset-prefetch';

// ============================================================================
// Unified Initialization
// ============================================================================

import {
  getIntelligentPrefetchEngine,
  type IntelligentPrefetchConfig,
} from './intelligent-prefetch';
import { getPrefetchQueue, type PrefetchQueueConfig } from './prefetch-queue';
import {
  getRoutePrefetchManager,
  type RoutePrefetchConfig,
} from './route-prefetch';
import { getDataPrefetchManager, type DataPrefetchConfig } from './data-prefetch';
import {
  getAssetPrefetchManager,
  type AssetPrefetchConfig,
} from './asset-prefetch';

/**
 * Unified prefetch configuration
 */
export interface PrefetchSystemConfig {
  /** Enable the prefetch system */
  enabled?: boolean;
  /** Intelligent prefetch configuration */
  intelligent?: Partial<IntelligentPrefetchConfig>;
  /** Queue configuration */
  queue?: Partial<PrefetchQueueConfig>;
  /** Route prefetch configuration */
  routes?: Partial<RoutePrefetchConfig>;
  /** Data prefetch configuration */
  data?: Partial<DataPrefetchConfig>;
  /** Asset prefetch configuration */
  assets?: Partial<AssetPrefetchConfig>;
}

/**
 * Prefetch system instance references
 */
export interface PrefetchSystem {
  engine: ReturnType<typeof getIntelligentPrefetchEngine>;
  queue: ReturnType<typeof getPrefetchQueue>;
  routes: ReturnType<typeof getRoutePrefetchManager>;
  data: ReturnType<typeof getDataPrefetchManager>;
  assets: ReturnType<typeof getAssetPrefetchManager>;
}

/**
 * Initialize the prefetch system
 */
export function initPrefetchSystem(config: PrefetchSystemConfig = {}): PrefetchSystem {
  const enabled = config.enabled ?? true;

  if (!enabled) {
    // Return disabled instances
    const disabledConfig = { enabled: false };
    return {
      engine: getIntelligentPrefetchEngine(disabledConfig),
      queue: getPrefetchQueue(disabledConfig as Partial<PrefetchQueueConfig>),
      routes: getRoutePrefetchManager(disabledConfig),
      data: getDataPrefetchManager(disabledConfig),
      assets: getAssetPrefetchManager(disabledConfig),
    };
  }

  return {
    engine: getIntelligentPrefetchEngine(config.intelligent),
    queue: getPrefetchQueue(config.queue),
    routes: getRoutePrefetchManager(config.routes),
    data: getDataPrefetchManager(config.data),
    assets: getAssetPrefetchManager(config.assets),
  };
}
