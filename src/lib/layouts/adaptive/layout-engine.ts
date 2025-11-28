/**
 * @fileoverview Content-Aware Layout Engine
 *
 * This module implements a sophisticated layout engine that automatically selects
 * and computes optimal layouts based on content analysis. It uses ResizeObserver
 * for responsive behavior without traditional breakpoints, preferring content-driven
 * layout decisions.
 *
 * Key Features:
 * - Content-aware layout mode selection
 * - Breakpoint-free responsive design
 * - Performance budget awareness
 * - Predictive layout pre-computation
 * - User preference learning
 *
 * @module layouts/adaptive/layout-engine
 * @version 1.0.0
 */

import type {
  AspectRatioDistribution,
  ContentAnalysis,
  ContentDensity,
  Dimensions,
  GridLayoutConfig,
  LayoutComputeRequest,
  LayoutComputeResult,
  LayoutConstraint,
  LayoutEngineConfig,
  LayoutEngineInterface,
  LayoutMode,
  LayoutRect,
  LayoutState,
  ListLayoutConfig,
  UserLayoutPreferences,
} from './types.ts';
import { DEFAULT_LAYOUT_ENGINE_CONFIG } from './types.ts';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Golden ratio for aesthetically pleasing layouts.
 */
const PHI = 1.618033988749895;

/**
 * Content density thresholds based on items per viewport area.
 */
const DENSITY_THRESHOLDS: Record<ContentDensity, number> = {
  minimal: 0.001,
  low: 0.005,
  medium: 0.02,
  high: 0.05,
  extreme: 0.1,
} as const;

/**
 * Size variance thresholds for layout mode selection.
 */
const VARIANCE_THRESHOLDS = {
  uniform: 0.1,
  moderate: 0.3,
  high: 0.5,
} as const;

/**
 * Minimum items required for meaningful analysis.
 */
const MIN_ITEMS_FOR_ANALYSIS = 2;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculates the standard deviation of an array of numbers.
 */
function calculateStandardDeviation(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

/**
 * Calculates coefficient of variation (normalized standard deviation).
 */
function calculateCoefficientOfVariation(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  if (mean === 0) return 0;
  return calculateStandardDeviation(values) / mean;
}

/**
 * Classifies an aspect ratio into a category.
 */
function classifyAspectRatio(ratio: number): keyof AspectRatioDistribution {
  if (ratio < 0.75) return 'portrait';
  if (ratio <= 1.33) return 'square';
  if (ratio <= 2) return 'landscape';
  return 'ultrawide';
}

/**
 * Determines if content is primarily image-based.
 */
function isImageHeavyContent(element: HTMLElement): boolean {
  const images = element.querySelectorAll('img, picture, video, canvas, svg');
  const textLength = element.textContent?.length ?? 0;
  const imageCount = images.length;

  // Heuristic: more than 1 image per 200 chars of text indicates image-heavy content
  return imageCount > 0 && (textLength === 0 || imageCount / (textLength / 200) > 0.5);
}

/**
 * Determines if content is primarily text-based.
 */
function isTextHeavyContent(element: HTMLElement): boolean {
  const textLength = element.textContent?.length ?? 0;
  const images = element.querySelectorAll('img, picture, video, canvas, svg');

  // Heuristic: more than 500 chars with few images indicates text-heavy content
  return textLength > 500 && images.length < textLength / 500;
}

/**
 * Generates a unique batch ID.
 */
// function _generateBatchId(): string {
//   return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
// }

// =============================================================================
// LAYOUT ENGINE IMPLEMENTATION
// =============================================================================

/**
 * Content-aware layout engine that automatically selects and computes
 * optimal layouts based on content analysis.
 *
 * @example
 * ```typescript
 * const engine = createLayoutEngine({ contentAware: true });
 * const analysis = engine.analyze(containerElement);
 * const result = engine.compute({
 *   containerId: 'my-container',
 *   itemIds: ['item-1', 'item-2', 'item-3'],
 *   containerDimensions: { width: 800, height: 600 }
 * });
 * ```
 */
export class LayoutEngine implements LayoutEngineInterface {
  private _config: LayoutEngineConfig;
  private readonly _resizeObserver: ResizeObserver;
  private readonly _callbacks: Map<HTMLElement, (entry: ResizeObserverEntry) => void>;
  private readonly _elementCache: WeakMap<HTMLElement, ContentAnalysis>;
  private readonly _userPreferences: UserLayoutPreferences;
  private __lastComputeTime: number = 0;
  private _destroyed: boolean = false;

  /**
   * Creates a new LayoutEngine instance.
   *
   * @param config - Optional configuration overrides
   */
  constructor(config: Partial<LayoutEngineConfig> = {}) {
    this._config = { ...DEFAULT_LAYOUT_ENGINE_CONFIG, ...config };
    this._callbacks = new Map();
    this._elementCache = new WeakMap();
    this._userPreferences = this._initializeUserPreferences();

    // Create shared ResizeObserver with debouncing
    this._resizeObserver = new ResizeObserver(this._handleResize.bind(this));
  }

  /**
   * Current engine configuration.
   */
  get config(): LayoutEngineConfig {
    return this._config;
  }

  /**
   * Updates the engine configuration.
   *
   * @param config - Partial configuration to merge
   */
  configure(config: Partial<LayoutEngineConfig>): void {
    this._assertNotDestroyed();
    this._config = { ...this._config, ...config };
  }

  /**
   * Analyzes container content to determine optimal layout characteristics.
   *
   * @param container - The container element to analyze
   * @returns Content analysis result
   */
  analyze(container: HTMLElement): ContentAnalysis {
    this._assertNotDestroyed();

    // Check cache first
    const cached = this._elementCache.get(container);
    if (cached && this._config.predictiveLayout) {
      return cached;
    }

    const children = Array.from(container.children) as HTMLElement[];
    const itemCount = children.length;

    if (itemCount < MIN_ITEMS_FOR_ANALYSIS) {
      return this._createMinimalAnalysis(container, itemCount);
    }

    // Gather dimensions
    const dimensions = children.map((child) => {
      const rect = child.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });

    // Calculate statistics
    const widths = dimensions.map((d) => d.width);
    const heights = dimensions.map((d) => d.height);
    const areas = dimensions.map((d) => d.width * d.height);

    const avgWidth = widths.reduce((sum, w) => sum + w, 0) / itemCount;
    const avgHeight = heights.reduce((sum, h) => sum + h, 0) / itemCount;
    const avgArea = areas.reduce((sum, a) => sum + a, 0) / itemCount;

    // Calculate variance
    const widthVariance = calculateCoefficientOfVariation(widths);
    const heightVariance = calculateCoefficientOfVariation(heights);
    const sizeVariance = (widthVariance + heightVariance) / 2;

    // Calculate density
    const containerRect = container.getBoundingClientRect();
    const containerArea = containerRect.width * containerRect.height;
    const totalItemArea = avgArea * itemCount;
    const densityRatio = containerArea > 0 ? totalItemArea / containerArea : 0;
    const density = this._classifyDensity(densityRatio);

    // Analyze aspect ratios
    const aspectRatios = dimensions.map((d) => (d.height > 0 ? d.width / d.height : 1));
    const aspectRatioDistribution = this._calculateAspectRatioDistribution(aspectRatios);

    // Content type detection
    const imageHeavy = isImageHeavyContent(container);
    const textHeavy = isTextHeavyContent(container);

    // Determine recommended mode
    const recommendedMode = this._recommendLayoutMode(
      density,
      sizeVariance,
      aspectRatioDistribution,
      imageHeavy,
      textHeavy
    );

    const analysis: ContentAnalysis = {
      itemCount,
      averageItemSize: { width: avgWidth, height: avgHeight },
      sizeVariance,
      density,
      recommendedMode,
      confidence: this._calculateConfidence(sizeVariance, itemCount),
      isImageHeavy: imageHeavy,
      isTextHeavy: textHeavy,
      aspectRatioDistribution,
    };

    // Cache the result
    this._elementCache.set(container, analysis);

    return analysis;
  }

  /**
   * Computes the complete layout for a container and its items.
   *
   * @param request - Layout computation request
   * @returns Layout computation result
   */
  compute(request: LayoutComputeRequest): LayoutComputeResult {
    this._assertNotDestroyed();

    const startTime = performance.now();

    // Get or create analysis
    const containerElement = document.getElementById(request.containerId);
    const analysis = containerElement
      ? this.analyze(containerElement)
      : this._createMinimalAnalysis(null, request.itemIds.length);

    // Determine layout mode
    const mode = request.forcedMode ?? analysis.recommendedMode;

    // Compute item positions based on mode
    const itemRects = this._computeItemRects(
      request.itemIds,
      request.containerDimensions,
      mode,
      analysis
    );

    // Get mode-specific configuration
    const gridConfig = mode === 'grid' ? this._computeGridConfig(request.containerDimensions, analysis) : undefined;
    const listConfig = mode === 'list' ? this._computeListConfig(request.containerDimensions, analysis) : undefined;

    const computeTimeMs = performance.now() - startTime;
    this.__lastComputeTime = computeTimeMs;

    const state: LayoutState = {
      mode,
      containerDimensions: request.containerDimensions,
      itemRects,
      gridConfig,
      listConfig,
      timestamp: Date.now(),
      isTransitioning: false,
    };

    return {
      state,
      analysis,
      computeTimeMs,
      budgetExceeded: computeTimeMs > this._config.performanceBudgetMs,
      predictedCLS: this._predictCLS(state, request.animationContext),
    };
  }

  /**
   * Selects the optimal layout mode based on content analysis and constraints.
   *
   * @param analysis - Content analysis result
   * @param constraints - Active layout constraints
   * @returns Selected layout mode
   */
  selectMode(analysis: ContentAnalysis, constraints: readonly LayoutConstraint[]): LayoutMode {
    this._assertNotDestroyed();

    // Check for forced mode in constraints
    const forcedConstraint = constraints.find(
      (c) => c.type === 'containment' && c.priority === 'required'
    );
    if (forcedConstraint) {
      // Check user preferences first if learning is enabled
      if (this._config.learnPreferences) {
        const preferredMode = this._userPreferences.modePreferences.get(analysis.density);
        if (preferredMode) {
          return preferredMode;
        }
      }
    }

    // Consider accessibility mode
    if (this._config.accessibilityMode && analysis.density !== 'minimal') {
      return analysis.density === 'high' || analysis.density === 'extreme' ? 'list' : 'expanded';
    }

    return analysis.recommendedMode;
  }

  /**
   * Observes a container element for size changes.
   *
   * @param container - Element to observe
   * @param callback - Callback for resize events
   * @returns Cleanup function
   */
  observe(container: HTMLElement, callback: (entry: ResizeObserverEntry) => void): () => void {
    this._assertNotDestroyed();

    this._callbacks.set(container, callback);
    this._resizeObserver.observe(container);

    return () => {
      this._callbacks.delete(container);
      this._resizeObserver.unobserve(container);
    };
  }

  /**
   * Cleans up all resources used by the engine.
   */
  destroy(): void {
    if (this._destroyed) return;

    this._resizeObserver.disconnect();
    this._callbacks.clear();
    this._destroyed = true;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Handles ResizeObserver callbacks with debouncing.
   */
  private _handleResize(entries: ResizeObserverEntry[]): void {
    for (const entry of entries) {
      const callback = this._callbacks.get(entry.target as HTMLElement);
      if (callback) {
        // Invalidate cache on resize
        this._elementCache.delete(entry.target as HTMLElement);
        callback(entry);
      }
    }
  }

  /**
   * Creates a minimal analysis for containers with few items.
   */
  private _createMinimalAnalysis(_container: HTMLElement | null, itemCount: number): ContentAnalysis {
    return {
      itemCount,
      averageItemSize: { width: 200, height: 150 },
      sizeVariance: 0,
      density: 'minimal',
      recommendedMode: this._config.defaultMode,
      confidence: 0.5,
      isImageHeavy: false,
      isTextHeavy: false,
      aspectRatioDistribution: { portrait: 0, square: 1, landscape: 0, ultrawide: 0 },
    };
  }

  /**
   * Classifies density ratio into a ContentDensity category.
   */
  private _classifyDensity(densityRatio: number): ContentDensity {
    if (densityRatio >= DENSITY_THRESHOLDS.extreme) return 'extreme';
    if (densityRatio >= DENSITY_THRESHOLDS.high) return 'high';
    if (densityRatio >= DENSITY_THRESHOLDS.medium) return 'medium';
    if (densityRatio >= DENSITY_THRESHOLDS.low) return 'low';
    return 'minimal';
  }

  /**
   * Calculates aspect ratio distribution from a list of ratios.
   */
  private _calculateAspectRatioDistribution(ratios: readonly number[]): AspectRatioDistribution {
    const distribution = { portrait: 0, square: 0, landscape: 0, ultrawide: 0 };
    const total = ratios.length;

    if (total === 0) return distribution;

    for (const ratio of ratios) {
      const category = classifyAspectRatio(ratio);
      distribution[category]++;
    }

    // Normalize to percentages
    return {
      portrait: distribution.portrait / total,
      square: distribution.square / total,
      landscape: distribution.landscape / total,
      ultrawide: distribution.ultrawide / total,
    };
  }

  /**
   * Recommends a layout mode based on content characteristics.
   */
  private _recommendLayoutMode(
    density: ContentDensity,
    sizeVariance: number,
    aspectRatios: AspectRatioDistribution,
    imageHeavy: boolean,
    textHeavy: boolean
  ): LayoutMode {
    // Text-heavy content prefers list layout
    if (textHeavy) {
      return density === 'high' || density === 'extreme' ? 'compact' : 'list';
    }

    // Image-heavy content with uniform sizes prefers grid
    if (imageHeavy && sizeVariance < VARIANCE_THRESHOLDS.uniform) {
      return 'grid';
    }

    // High variance suggests expanded layout to show content properly
    if (sizeVariance > VARIANCE_THRESHOLDS.high) {
      return 'expanded';
    }

    // Portrait-heavy content might work better in list
    if (aspectRatios.portrait > 0.6) {
      return 'list';
    }

    // Landscape/ultrawide content works well in grid
    if (aspectRatios.landscape + aspectRatios.ultrawide > 0.6) {
      return 'grid';
    }

    // Default based on density
    switch (density) {
      case 'extreme':
      case 'high':
        return 'compact';
      case 'medium':
        return 'grid';
      case 'low':
      case 'minimal':
        return 'expanded';
    }
  }

  /**
   * Calculates confidence score for the recommendation.
   */
  private _calculateConfidence(sizeVariance: number, itemCount: number): number {
    // Base confidence from item count (more items = more reliable analysis)
    const countConfidence = Math.min(itemCount / 20, 1);

    // Variance affects confidence (lower variance = higher confidence)
    const varianceConfidence = 1 - Math.min(sizeVariance, 1);

    // Combined confidence with weighted average
    return countConfidence * 0.4 + varianceConfidence * 0.6;
  }

  /**
   * Computes item rectangles based on layout mode.
   */
  private _computeItemRects(
    itemIds: readonly string[],
    containerDimensions: Dimensions,
    mode: LayoutMode,
    analysis: ContentAnalysis
  ): ReadonlyMap<string, LayoutRect> {
    // const _rects = new Map<string, LayoutRect>();

    switch (mode) {
      case 'grid':
        return this._computeGridRects(itemIds, containerDimensions, analysis);
      case 'list':
        return this._computeListRects(itemIds, containerDimensions, analysis);
      case 'compact':
        return this._computeCompactRects(itemIds, containerDimensions, analysis);
      case 'expanded':
        return this._computeExpandedRects(itemIds, containerDimensions, analysis);
      case 'dense':
        return this._computeDenseRects(itemIds, containerDimensions, analysis);
      case 'sparse':
        return this._computeSparseRects(itemIds, containerDimensions, analysis);
    }
  }

  /**
   * Computes grid layout rectangles.
   */
  private _computeGridRects(
    itemIds: readonly string[],
    containerDimensions: Dimensions,
    analysis: ContentAnalysis
  ): Map<string, LayoutRect> {
    const rects = new Map<string, LayoutRect>();
    const config = this._computeGridConfig(containerDimensions, analysis);
    const { columns, gap, rowHeight } = config;

    const columnWidth = (containerDimensions.width - gap * (columns - 1)) / columns;
    const actualRowHeight = rowHeight === 'auto' ? columnWidth / PHI : rowHeight;

    itemIds.forEach((id, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);

      rects.set(id, {
        x: col * (columnWidth + gap),
        y: row * (actualRowHeight + gap),
        width: columnWidth,
        height: actualRowHeight,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
      });
    });

    return rects;
  }

  /**
   * Computes list layout rectangles.
   */
  private _computeListRects(
    itemIds: readonly string[],
    containerDimensions: Dimensions,
    analysis: ContentAnalysis
  ): Map<string, LayoutRect> {
    const rects = new Map<string, LayoutRect>();
    const config = this._computeListConfig(containerDimensions, analysis);
    const { gap, itemHeight } = config;

    const actualItemHeight = itemHeight === 'auto' ? analysis.averageItemSize.height : itemHeight;

    let currentY = 0;
    for (const id of itemIds) {
      rects.set(id, {
        x: 0,
        y: currentY,
        width: containerDimensions.width,
        height: actualItemHeight,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
      });
      currentY += actualItemHeight + gap;
    }

    return rects;
  }

  /**
   * Computes compact layout rectangles (tight grid with smaller items).
   */
  private _computeCompactRects(
    itemIds: readonly string[],
    containerDimensions: Dimensions,
    _analysis: ContentAnalysis
  ): Map<string, LayoutRect> {
    const rects = new Map<string, LayoutRect>();
    const gap = 8;
    const minItemSize = 80;
    const columns = Math.max(2, Math.floor(containerDimensions.width / (minItemSize + gap)));
    const itemSize = (containerDimensions.width - gap * (columns - 1)) / columns;

    itemIds.forEach((id, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);

      rects.set(id, {
        x: col * (itemSize + gap),
        y: row * (itemSize + gap),
        width: itemSize,
        height: itemSize,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
      });
    });

    return rects;
  }

  /**
   * Computes expanded layout rectangles (larger items with more spacing).
   */
  private _computeExpandedRects(
    itemIds: readonly string[],
    containerDimensions: Dimensions,
    _analysis: ContentAnalysis
  ): Map<string, LayoutRect> {
    const rects = new Map<string, LayoutRect>();
    const gap = 24;
    const columns = Math.max(1, Math.min(2, Math.floor(containerDimensions.width / 400)));
    const itemWidth = (containerDimensions.width - gap * Math.max(0, columns - 1)) / columns;
    const itemHeight = itemWidth / PHI;

    itemIds.forEach((id, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);

      rects.set(id, {
        x: col * (itemWidth + gap),
        y: row * (itemHeight + gap),
        width: itemWidth,
        height: itemHeight,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
      });
    });

    return rects;
  }

  /**
   * Computes dense layout rectangles (maximum items per area).
   */
  private _computeDenseRects(
    itemIds: readonly string[],
    containerDimensions: Dimensions,
    _analysis: ContentAnalysis
  ): Map<string, LayoutRect> {
    const rects = new Map<string, LayoutRect>();
    const gap = 4;
    const minItemSize = 60;
    const columns = Math.max(3, Math.floor(containerDimensions.width / (minItemSize + gap)));
    const itemSize = (containerDimensions.width - gap * (columns - 1)) / columns;

    itemIds.forEach((id, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);

      rects.set(id, {
        x: col * (itemSize + gap),
        y: row * (itemSize * 0.75 + gap), // Shorter rows for density
        width: itemSize,
        height: itemSize * 0.75,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
      });
    });

    return rects;
  }

  /**
   * Computes sparse layout rectangles (generous spacing for readability).
   */
  private _computeSparseRects(
    itemIds: readonly string[],
    containerDimensions: Dimensions,
    _analysis: ContentAnalysis
  ): Map<string, LayoutRect> {
    const rects = new Map<string, LayoutRect>();
    const gap = 32;
    const padding = 48;
    const availableWidth = containerDimensions.width - padding * 2;
    const itemWidth = Math.min(600, availableWidth);
    const itemHeight = itemWidth / PHI;
    const startX = (containerDimensions.width - itemWidth) / 2;

    let currentY = padding;
    for (const id of itemIds) {
      rects.set(id, {
        x: startX,
        y: currentY,
        width: itemWidth,
        height: itemHeight,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
      });
      currentY += itemHeight + gap;
    }

    return rects;
  }

  /**
   * Computes optimal grid configuration.
   */
  private _computeGridConfig(containerDimensions: Dimensions, analysis: ContentAnalysis): GridLayoutConfig {
    const idealItemWidth = analysis.averageItemSize.width || 200;
    const minGap = 16;
    const columns = Math.max(1, Math.floor(containerDimensions.width / (idealItemWidth + minGap)));
    const gap = Math.min(24, (containerDimensions.width - columns * idealItemWidth) / (columns + 1));

    return {
      columns,
      gap,
      rowHeight: 'auto',
      autoFlow: 'row',
      itemAlignment: 'stretch',
    };
  }

  /**
   * Computes optimal list configuration.
   */
  private _computeListConfig(_containerDimensions: Dimensions, analysis: ContentAnalysis): ListLayoutConfig {
    return {
      gap: 12,
      direction: 'vertical',
      itemHeight: analysis.averageItemSize.height || 'auto',
      alternateRows: analysis.itemCount > 5,
    };
  }

  /**
   * Predicts CLS impact of a layout change.
   */
  private _predictCLS(state: LayoutState, animationContext?: { snapshots: ReadonlyMap<string, unknown> }): number {
    // If we have animation context, CLS should be near zero due to FLIP
    if (animationContext) {
      return 0.001;
    }

    // Estimate based on number of items and their sizes
    const totalArea = Array.from(state.itemRects.values()).reduce(
      (sum, rect) => sum + rect.width * rect.height,
      0
    );
    const containerArea = state.containerDimensions.width * state.containerDimensions.height;

    // CLS is proportional to shifted area
    return containerArea > 0 ? Math.min(0.25, totalArea / containerArea * 0.1) : 0;
  }

  /**
   * Initializes user preferences storage.
   */
  private _initializeUserPreferences(): UserLayoutPreferences {
    // Try to load from localStorage
    const stored = typeof window !== 'undefined'
      ? localStorage.getItem('adaptive-layout-preferences')
      : null;

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          modePreferences: new Map(Object.entries(parsed.modePreferences || {})),
        };
      } catch {
        // Fall through to default
      }
    }

    // Default preferences
    return {
      modePreferences: new Map(),
      animationPreferences: {
        reducedMotion: typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        preferredDuration: 300,
        preferredEasing: 'ease-out',
      },
      accessibilityPreferences: {
        highContrast: false,
        largeText: false,
        reducedMotion: typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        screenReader: false,
      },
      lastUpdated: Date.now(),
    };
  }

  /**
   * Asserts that the engine has not been destroyed.
   */
  private _assertNotDestroyed(): void {
    if (this._destroyed) {
      throw new Error('LayoutEngine has been destroyed and cannot be used.');
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a new LayoutEngine instance.
 *
 * @param config - Optional configuration overrides
 * @returns A new LayoutEngine instance
 *
 * @example
 * ```typescript
 * const engine = createLayoutEngine({
 *   contentAware: true,
 *   predictiveLayout: true,
 *   performanceBudgetMs: 16
 * });
 * ```
 */
export function createLayoutEngine(config: Partial<LayoutEngineConfig> = {}): LayoutEngineInterface {
  return new LayoutEngine(config);
}

/**
 * Singleton layout engine instance for shared use.
 */
let sharedEngine: LayoutEngineInterface | null = null;

/**
 * Gets or creates the shared layout engine instance.
 *
 * @param config - Optional configuration (only used on first call)
 * @returns The shared LayoutEngine instance
 */
export function getSharedLayoutEngine(config?: Partial<LayoutEngineConfig>): LayoutEngineInterface {
  if (!sharedEngine) {
    sharedEngine = createLayoutEngine(config);
  }
  return sharedEngine;
}

/**
 * Resets the shared layout engine (useful for testing).
 */
export function resetSharedLayoutEngine(): void {
  if (sharedEngine) {
    sharedEngine.destroy();
    sharedEngine = null;
  }
}
