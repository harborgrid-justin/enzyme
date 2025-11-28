/**
 * @file Predictive Prefetching System
 * @description AI-driven prefetching that learns user navigation patterns
 * and predictively loads resources for likely next pages.
 *
 * FEATURE 3: Predictive Navigation Prefetching
 *
 * Strategies:
 * 1. Markov Chain prediction based on navigation history
 * 2. Time-of-day patterns for recurring user behavior
 * 3. Session context awareness (recent interactions)
 * 4. Network-adaptive prefetching (respects connection quality)
 */

import type { QueryClient } from '@tanstack/react-query';

// ============================================================================
// Types
// ============================================================================

/**
 * Navigation event for pattern learning
 */
export interface NavigationEvent {
  from: string;
  to: string;
  timestamp: number;
  sessionId: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: number;
}

/**
 * Route configuration for prefetching
 */
export interface PrefetchableRoute {
  /** Route path pattern */
  path: string;
  /** Module loader for code splitting */
  loader?: () => Promise<unknown>;
  /** Query configuration for data prefetching */
  queries?: Array<{
    queryKey: readonly unknown[];
    queryFn: () => Promise<unknown>;
    staleTime?: number;
  }>;
  /** Static assets to preload */
  assets?: string[];
  /** Estimated load priority (0-10) */
  priority?: number;
}

/**
 * Prediction result
 */
export interface RoutePrediction {
  route: string;
  probability: number;
  confidence: 'high' | 'medium' | 'low';
  source: 'markov' | 'time-pattern' | 'session-context' | 'static';
}

/**
 * Transition matrix for Markov chain
 */
type TransitionMatrix = Map<string, Map<string, number>>;

/**
 * Time pattern entry
 */
interface TimePattern {
  route: string;
  timeOfDay: string;
  dayOfWeek: number;
  count: number;
}

/**
 * Configuration for predictive prefetch
 */
export interface PredictivePrefetchConfig {
  /** Enable learning from navigation */
  enableLearning?: boolean;
  /** Probability threshold for triggering prefetch (0-1) */
  probabilityThreshold?: number;
  /** Maximum routes to prefetch at once */
  maxPrefetchCount?: number;
  /** Storage key for persisting learned patterns */
  storageKey?: string;
  /** Static route priorities (fallback) */
  staticRoutes?: Record<string, number>;
  /** Network quality threshold ('4g' | '3g' | '2g' | 'slow-2g') */
  minNetworkQuality?: string;
  /** Respect user's data saver preference */
  respectDataSaver?: boolean;
  /** Debug logging */
  debug?: boolean;
  /** Decay factor for old transitions (0-1) */
  decayFactor?: number;
  /** Maximum history entries to keep */
  maxHistorySize?: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: Required<PredictivePrefetchConfig> = {
  enableLearning: true,
  probabilityThreshold: 0.3,
  maxPrefetchCount: 3,
  storageKey: 'predictive-prefetch-patterns',
  staticRoutes: {},
  minNetworkQuality: '3g',
  respectDataSaver: true,
  debug: false,
  decayFactor: 0.95,
  maxHistorySize: 1000,
};

const NETWORK_QUALITY_RANK: Record<string, number> = {
  '4g': 4,
  '3g': 3,
  '2g': 2,
  'slow-2g': 1,
  unknown: 3,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get time of day category
 */
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Normalize path for comparison
 */
function normalizePath(path: string): string {
  // Remove trailing slash and query params
  const pathWithoutQuery = path.split('?')[0];
  return (pathWithoutQuery || '').replace(/\/$/, '') || '/';
}

/**
 * Get current network quality
 */
function getNetworkQuality(): string {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string; saveData?: boolean };
  };
  return nav.connection?.effectiveType ?? 'unknown';
}

/**
 * Check if data saver is enabled
 */
function isDataSaverEnabled(): boolean {
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
  };
  return nav.connection?.saveData ?? false;
}

// ============================================================================
// Predictive Prefetch Engine
// ============================================================================

/**
 * Predictive prefetch engine that learns navigation patterns
 */
export class PredictivePrefetchEngine {
  private config: Required<PredictivePrefetchConfig>;
  private transitionMatrix: TransitionMatrix = new Map();
  private timePatterns: TimePattern[] = [];
  private sessionHistory: string[] = [];
  // Session ID for tracking navigation patterns
  private routeRegistry: Map<string, PrefetchableRoute> = new Map();
  private prefetchedRoutes: Set<string> = new Set();
  private queryClient: QueryClient | null = null;

  constructor(config: PredictivePrefetchConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadPersistedPatterns();
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize with query client for data prefetching
   */
  setQueryClient(client: QueryClient): void {
    this.queryClient = client;
  }

  /**
   * Register routes available for prefetching
   */
  registerRoutes(routes: PrefetchableRoute[]): void {
    routes.forEach((route) => {
      this.routeRegistry.set(normalizePath(route.path), route);
    });
    this.log(`Registered ${routes.length} prefetchable routes`);
  }

  // ==========================================================================
  // Navigation Tracking
  // ==========================================================================

  /**
   * Record a navigation event for learning
   */
  recordNavigation(from: string, to: string): void {
    const normalizedFrom = normalizePath(from);
    const normalizedTo = normalizePath(to);

    // Skip if same page
    if (normalizedFrom === normalizedTo) return;

    // Record in session history
    this.sessionHistory.push(normalizedTo);
    if (this.sessionHistory.length > 20) {
      this.sessionHistory.shift();
    }

    // Update transition matrix
    if (this.config.enableLearning) {
      this.updateTransitionMatrix(normalizedFrom, normalizedTo);
      this.updateTimePatterns(normalizedTo);
      this.persistPatterns();
    }

    // Clear prefetch cache for new navigation
    this.prefetchedRoutes.clear();

    this.log(`Recorded navigation: ${normalizedFrom} -> ${normalizedTo}`);
  }

  /**
   * Update transition matrix with new navigation
   */
  private updateTransitionMatrix(from: string, to: string): void {
    if (!this.transitionMatrix.has(from)) {
      this.transitionMatrix.set(from, new Map());
    }

    const transitions = this.transitionMatrix.get(from)!;
    const currentCount = transitions.get(to) || 0;
    transitions.set(to, currentCount + 1);

    // Apply decay to all transitions from this page
    transitions.forEach((count, route) => {
      if (route !== to) {
        transitions.set(route, count * this.config.decayFactor);
      }
    });

    // Clean up near-zero transitions
    transitions.forEach((count, route) => {
      if (count < 0.1) {
        transitions.delete(route);
      }
    });
  }

  /**
   * Update time-based patterns
   */
  private updateTimePatterns(route: string): void {
    const timeOfDay = getTimeOfDay();
    const dayOfWeek = new Date().getDay();

    const existingPattern = this.timePatterns.find(
      (p) =>
        p.route === route &&
        p.timeOfDay === timeOfDay &&
        p.dayOfWeek === dayOfWeek
    );

    if (existingPattern) {
      existingPattern.count++;
    } else {
      this.timePatterns.push({
        route,
        timeOfDay,
        dayOfWeek,
        count: 1,
      });
    }

    // Limit time patterns
    if (this.timePatterns.length > 100) {
      this.timePatterns = this.timePatterns
        .sort((a, b) => b.count - a.count)
        .slice(0, 100);
    }
  }

  // ==========================================================================
  // Prediction
  // ==========================================================================

  /**
   * Get predicted next routes from current page
   */
  getPredictions(currentPath: string): RoutePrediction[] {
    const normalizedPath = normalizePath(currentPath);
    const predictions: RoutePrediction[] = [];

    // 1. Markov chain predictions
    const markovPredictions = this.getMarkovPredictions(normalizedPath);
    predictions.push(...markovPredictions);

    // 2. Time pattern predictions
    const timePredictions = this.getTimePatternPredictions();
    predictions.push(...timePredictions);

    // 3. Session context predictions
    const sessionPredictions = this.getSessionContextPredictions();
    predictions.push(...sessionPredictions);

    // 4. Static route priorities
    const staticPredictions = this.getStaticPredictions(normalizedPath);
    predictions.push(...staticPredictions);

    // Deduplicate and sort by probability
    const deduped = this.deduplicatePredictions(predictions);

    // Filter by threshold
    const filtered = deduped.filter(
      (p) => p.probability >= this.config.probabilityThreshold
    );

    this.log(`Predictions for ${normalizedPath}:`, filtered);

    return filtered.slice(0, this.config.maxPrefetchCount);
  }

  /**
   * Get predictions from transition matrix (Markov chain)
   */
  private getMarkovPredictions(currentPath: string): RoutePrediction[] {
    const transitions = this.transitionMatrix.get(currentPath);
    if (!transitions || transitions.size === 0) return [];

    const total = Array.from(transitions.values()).reduce((a, b) => a + b, 0);

    return Array.from(transitions.entries())
      .map(([route, count]) => ({
        route,
        probability: count / total,
        confidence: this.getConfidence(count / total),
        source: 'markov' as const,
      }))
      .filter((p) => p.probability > 0.1);
  }

  /**
   * Get predictions based on time patterns
   */
  private getTimePatternPredictions(): RoutePrediction[] {
    const timeOfDay = getTimeOfDay();
    const dayOfWeek = new Date().getDay();

    const relevantPatterns = this.timePatterns.filter(
      (p) => p.timeOfDay === timeOfDay && p.dayOfWeek === dayOfWeek
    );

    const totalCount = relevantPatterns.reduce((sum, p) => sum + p.count, 0);
    if (totalCount === 0) return [];

    return relevantPatterns.map((pattern) => ({
      route: pattern.route,
      probability: (pattern.count / totalCount) * 0.7, // Discount time patterns
      confidence: this.getConfidence((pattern.count / totalCount) * 0.7),
      source: 'time-pattern' as const,
    }));
  }

  /**
   * Get predictions based on session context
   */
  private getSessionContextPredictions(): RoutePrediction[] {
    if (this.sessionHistory.length < 2) return [];

    // Look for patterns in recent session
    const recentHistory = this.sessionHistory.slice(-5);
    const predictions: RoutePrediction[] = [];

    // Check if user is following a known path
    for (const [from, transitions] of this.transitionMatrix) {
      if (recentHistory.includes(from)) {
        const total = Array.from(transitions.values()).reduce((a, b) => a + b, 0);
        for (const [to, count] of transitions) {
          if (!recentHistory.includes(to)) {
            predictions.push({
              route: to,
              probability: (count / total) * 0.5, // Discount session context
              confidence: 'medium',
              source: 'session-context',
            });
          }
        }
      }
    }

    return predictions;
  }

  /**
   * Get static route predictions
   */
  private getStaticPredictions(currentPath: string): RoutePrediction[] {
    return Object.entries(this.config.staticRoutes)
      .filter(([route]) => route !== currentPath)
      .map(([route, priority]) => ({
        route,
        probability: priority / 10, // Convert priority to probability
        confidence: 'low' as const,
        source: 'static' as const,
      }));
  }

  /**
   * Deduplicate predictions, keeping highest probability
   */
  private deduplicatePredictions(predictions: RoutePrediction[]): RoutePrediction[] {
    const routeMap = new Map<string, RoutePrediction>();

    predictions.forEach((prediction) => {
      const existing = routeMap.get(prediction.route);
      if (!existing || prediction.probability > existing.probability) {
        routeMap.set(prediction.route, prediction);
      }
    });

    return Array.from(routeMap.values()).sort(
      (a, b) => b.probability - a.probability
    );
  }

  /**
   * Get confidence level from probability
   */
  private getConfidence(probability: number): 'high' | 'medium' | 'low' {
    if (probability >= 0.7) return 'high';
    if (probability >= 0.4) return 'medium';
    return 'low';
  }

  // ==========================================================================
  // Prefetching
  // ==========================================================================

  /**
   * Execute prefetch for predicted routes
   */
  async prefetchPredictedRoutes(currentPath: string): Promise<void> {
    // Check network conditions
    if (!this.shouldPrefetch()) {
      this.log('Skipping prefetch due to network conditions');
      return;
    }

    const predictions = this.getPredictions(currentPath);

    for (const prediction of predictions) {
      await this.prefetchRoute(prediction.route);
    }
  }

  /**
   * Prefetch a specific route
   */
  async prefetchRoute(routePath: string): Promise<void> {
    const normalizedPath = normalizePath(routePath);

    // Skip if already prefetched
    if (this.prefetchedRoutes.has(normalizedPath)) {
      return;
    }

    const route = this.routeRegistry.get(normalizedPath);
    if (!route) {
      this.log(`Route not found in registry: ${normalizedPath}`);
      return;
    }

    this.prefetchedRoutes.add(normalizedPath);
    this.log(`Prefetching route: ${normalizedPath}`);

    // Prefetch module (code splitting)
    if (route.loader) {
      try {
        await route.loader();
        this.log(`Module prefetched: ${normalizedPath}`);
      } catch (error) {
        this.log(`Module prefetch failed: ${normalizedPath}`, error);
      }
    }

    // Prefetch data
    if (route.queries && this.queryClient) {
      for (const query of route.queries) {
        try {
          await this.queryClient.prefetchQuery({
            queryKey: query.queryKey,
            queryFn: query.queryFn,
            staleTime: query.staleTime ?? 5 * 60 * 1000,
          });
          this.log(`Data prefetched: ${JSON.stringify(query.queryKey)}`);
        } catch (error) {
          this.log(`Data prefetch failed: ${JSON.stringify(query.queryKey)}`, error);
        }
      }
    }

    // Preload static assets
    if (route.assets) {
      route.assets.forEach((asset) => {
        this.preloadAsset(asset);
      });
    }
  }

  /**
   * Preload a static asset
   */
  private preloadAsset(url: string): void {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;

    // Determine type from extension
    if (url.endsWith('.js') || url.endsWith('.mjs')) {
      link.as = 'script';
    } else if (url.endsWith('.css')) {
      link.as = 'style';
    } else if (/\.(png|jpg|jpeg|gif|webp|avif|svg)$/i.test(url)) {
      link.as = 'image';
    } else if (/\.(woff2?|eot|ttf|otf)$/i.test(url)) {
      link.as = 'font';
      link.crossOrigin = 'anonymous';
    }

    document.head.appendChild(link);
    this.log(`Asset prefetched: ${url}`);
  }

  /**
   * Check if prefetching should proceed
   */
  private shouldPrefetch(): boolean {
    // Check data saver
    if (this.config.respectDataSaver && isDataSaverEnabled()) {
      return false;
    }

    // Check network quality
    const quality = getNetworkQuality();
    const minQuality = this.config.minNetworkQuality;
    const qualityRank = NETWORK_QUALITY_RANK[quality] ?? 0;
    const minQualityRank = NETWORK_QUALITY_RANK[minQuality] ?? 0;
    const unknownRank = NETWORK_QUALITY_RANK['unknown'] ?? 0;
    return (
      qualityRank >= minQualityRank ||
      qualityRank >= unknownRank
    );
  }

  // ==========================================================================
  // Persistence
  // ==========================================================================

  /**
   * Persist learned patterns to storage
   */
  private persistPatterns(): void {
    try {
      const data = {
        transitionMatrix: Array.from(this.transitionMatrix.entries()).map(
          ([from, transitions]) => [from, Array.from(transitions.entries())]
        ),
        timePatterns: this.timePatterns,
        version: 1,
      };

      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
    } catch (error) {
      this.log('Failed to persist patterns:', error);
    }
  }

  /**
   * Load persisted patterns from storage
   */
  private loadPersistedPatterns(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (!stored) return;

      const data = JSON.parse(stored);
      if (data.version !== 1) return;

      // Restore transition matrix
      this.transitionMatrix = new Map(
        data.transitionMatrix.map(([from, transitions]: [string, [string, number][]]) => [
          from,
          new Map(transitions),
        ])
      );

      // Restore time patterns
      this.timePatterns = data.timePatterns || [];

      this.log('Loaded persisted patterns');
    } catch (error) {
      this.log('Failed to load persisted patterns:', error);
    }
  }

  /**
   * Clear all learned patterns
   */
  clearPatterns(): void {
    this.transitionMatrix.clear();
    this.timePatterns = [];
    this.sessionHistory = [];
    this.prefetchedRoutes.clear();
    localStorage.removeItem(this.config.storageKey);
    this.log('Cleared all patterns');
  }

  // ==========================================================================
  // Analytics
  // ==========================================================================

  /**
   * Get analytics about learned patterns
   */
  getAnalytics(): {
    totalTransitions: number;
    uniqueRoutes: number;
    timePatterns: number;
    topRoutes: Array<{ route: string; visits: number }>;
  } {
    const routeVisits = new Map<string, number>();

    this.transitionMatrix.forEach((transitions) => {
      transitions.forEach((count, route) => {
        routeVisits.set(route, (routeVisits.get(route) || 0) + count);
      });
    });

    const topRoutes = Array.from(routeVisits.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([route, visits]) => ({ route, visits: Math.round(visits) }));

    return {
      totalTransitions: Array.from(this.transitionMatrix.values())
        .flatMap((t) => Array.from(t.values()))
        .reduce((a, b) => a + b, 0),
      uniqueRoutes: new Set([
        ...this.transitionMatrix.keys(),
        ...Array.from(this.transitionMatrix.values()).flatMap((t) =>
          Array.from(t.keys())
        ),
      ]).size,
      timePatterns: this.timePatterns.length,
      topRoutes,
    };
  }

  // ==========================================================================
  // Debug
  // ==========================================================================

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[PredictivePrefetch] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let engineInstance: PredictivePrefetchEngine | null = null;

/**
 * Get or create the global PredictivePrefetchEngine instance
 */
export function getPredictivePrefetchEngine(
  config?: PredictivePrefetchConfig
): PredictivePrefetchEngine {
  if (!engineInstance) {
    engineInstance = new PredictivePrefetchEngine(config);
  }
  return engineInstance;
}

// ============================================================================
// React Integration
// ============================================================================

/**
 * Hook options for usePredictivePrefetch
 */
export interface UsePredictivePrefetchOptions {
  /** Enable automatic prefetching on route change */
  autoPrefetch?: boolean;
  /** Delay before prefetching (ms) */
  prefetchDelay?: number;
}

/**
 * Create navigation listener for automatic tracking
 */
export function createNavigationListener(
  engine: PredictivePrefetchEngine,
  options: UsePredictivePrefetchOptions = {}
): (location: { pathname: string }) => void {
  const { autoPrefetch = true, prefetchDelay = 500 } = options;
  let lastPath = '';

  return (location) => {
    const currentPath = location.pathname;

    if (lastPath && lastPath !== currentPath) {
      // Record navigation
      engine.recordNavigation(lastPath, currentPath);

      // Trigger prefetch after delay
      if (autoPrefetch) {
        setTimeout(() => {
          engine.prefetchPredictedRoutes(currentPath);
        }, prefetchDelay);
      }
    }

    lastPath = currentPath;
  };
}

// ============================================================================
// Exports
// ============================================================================

export type { TransitionMatrix, TimePattern };
