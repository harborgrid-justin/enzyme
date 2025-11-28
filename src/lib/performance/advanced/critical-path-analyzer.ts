/**
 * @file Critical Rendering Path Analyzer
 * @description Analyzes and optimizes the critical rendering path for faster
 * First Contentful Paint (FCP) and Largest Contentful Paint (LCP).
 *
 * Features:
 * - Render blocking resource detection
 * - Critical CSS extraction hints
 * - Resource prioritization
 * - Preload/prefetch recommendations
 * - DOM depth analysis
 * - Above-the-fold optimization
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Resource criticality level
 */
export type CriticalityLevel = 'critical' | 'high' | 'medium' | 'low' | 'non-critical';

/**
 * Resource type
 */
export type ResourceType = 'script' | 'style' | 'font' | 'image' | 'other';

/**
 * Render blocking resource
 */
export interface RenderBlockingResource {
  url: string;
  type: ResourceType;
  size: number;
  loadTime: number;
  blockingTime: number;
  suggestions: string[];
}

/**
 * Critical resource
 */
export interface CriticalResource {
  url: string;
  type: ResourceType;
  criticality: CriticalityLevel;
  size: number;
  loadTime: number;
  inViewport: boolean;
  aboveTheFold: boolean;
  recommendations: ResourceRecommendation[];
}

/**
 * Resource recommendation
 */
export interface ResourceRecommendation {
  action: 'preload' | 'prefetch' | 'defer' | 'async' | 'inline' | 'lazy' | 'remove';
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: number; // ms saved
}

/**
 * DOM analysis result
 */
export interface DOMAnalysis {
  totalNodes: number;
  maxDepth: number;
  widestLevel: number;
  widestLevelNodeCount: number;
  aboveTheFoldNodes: number;
  recommendations: string[];
}

/**
 * Critical path analysis result
 */
export interface CriticalPathAnalysis {
  renderBlockingResources: RenderBlockingResource[];
  criticalResources: CriticalResource[];
  domAnalysis: DOMAnalysis;
  estimatedFCP: number;
  estimatedLCP: number;
  optimizations: CriticalPathOptimization[];
  score: number; // 0-100
  timestamp: number;
}

/**
 * Critical path optimization
 */
export interface CriticalPathOptimization {
  type: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  estimatedSavings: number; // ms
  implementation: string;
}

/**
 * Analyzer configuration
 */
export interface CriticalPathAnalyzerConfig {
  /** Enable analysis */
  enabled: boolean;
  /** Viewport height for above-the-fold detection */
  viewportHeight: number;
  /** Consider render-blocking if blocks for more than this (ms) */
  blockingThreshold: number;
  /** Enable DOM analysis */
  analyzeDom: boolean;
  /** Enable resource analysis */
  analyzeResources: boolean;
  /** Debug mode */
  debug: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: CriticalPathAnalyzerConfig = {
  enabled: true,
  viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
  blockingThreshold: 50,
  analyzeDom: true,
  analyzeResources: true,
  debug: false,
};

// Resource priorities
// // const _RESOURCE_PRIORITY: Record<ResourceType, CriticalityLevel> = {
//   style: 'critical',
//   font: 'high',
//   script: 'medium',
//   image: 'medium',
//   other: 'low',
// };

// ============================================================================
// Critical Path Analyzer
// ============================================================================

/**
 * Analyzes critical rendering path
 */
export class CriticalPathAnalyzer {
  private config: CriticalPathAnalyzerConfig;

  constructor(config: Partial<CriticalPathAnalyzerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Run full critical path analysis
   */
  analyze(): CriticalPathAnalysis {
    const renderBlockingResources = this.config.analyzeResources
      ? this.findRenderBlockingResources()
      : [];

    const criticalResources = this.config.analyzeResources
      ? this.analyzeCriticalResources()
      : [];

    const domAnalysis = this.config.analyzeDom
      ? this.analyzeDOM()
      : this.getEmptyDOMAnalysis();

    const optimizations = this.generateOptimizations(
      renderBlockingResources,
      criticalResources,
      domAnalysis
    );

    const score = this.calculateScore(
      renderBlockingResources,
      criticalResources,
      domAnalysis
    );

    return {
      renderBlockingResources,
      criticalResources,
      domAnalysis,
      estimatedFCP: this.estimateFCP(renderBlockingResources),
      estimatedLCP: this.estimateLCP(criticalResources),
      optimizations,
      score,
      timestamp: Date.now(),
    };
  }

  /**
   * Find render-blocking resources
   */
  findRenderBlockingResources(): RenderBlockingResource[] {
    if (typeof document === 'undefined') {
      return [];
    }

    const blocking: RenderBlockingResource[] = [];

    // Find blocking stylesheets
    const stylesheets = document.querySelectorAll<HTMLLinkElement>(
      'link[rel="stylesheet"]:not([media="print"]):not([disabled])'
    );

    stylesheets.forEach((link) => {
      if (!link.href) return;

      const timing = this.getResourceTiming(link.href);
      if (timing && timing.duration > this.config.blockingThreshold) {
        blocking.push({
          url: link.href,
          type: 'style',
          size: timing.decodedBodySize,
          loadTime: timing.duration,
          blockingTime: timing.duration,
          suggestions: this.getStylesheetSuggestions(link),
        });
      }
    });

    // Find blocking scripts
    const scripts = document.querySelectorAll<HTMLScriptElement>(
      'script[src]:not([async]):not([defer]):not([type="module"])'
    );

    scripts.forEach((script) => {
      if (!script.src) return;

      const timing = this.getResourceTiming(script.src);
      if (timing && timing.duration > this.config.blockingThreshold) {
        blocking.push({
          url: script.src,
          type: 'script',
          size: timing.decodedBodySize,
          loadTime: timing.duration,
          blockingTime: timing.duration,
          suggestions: this.getScriptSuggestions(script),
        });
      }
    });

    return blocking.sort((a, b) => b.blockingTime - a.blockingTime);
  }

  /**
   * Analyze critical resources
   */
  analyzeCriticalResources(): CriticalResource[] {
    if (typeof document === 'undefined') {
      return [];
    }

    const resources: CriticalResource[] = [];

    // Analyze images
    const images = document.querySelectorAll<HTMLImageElement>('img');
    images.forEach((img) => {
      if (!img.src) return;

      const inViewport = this.isInViewport(img);
      const timing = this.getResourceTiming(img.src);

      resources.push({
        url: img.src,
        type: 'image',
        criticality: inViewport ? 'high' : 'low',
        size: timing?.decodedBodySize ?? 0,
        loadTime: timing?.duration ?? 0,
        inViewport,
        aboveTheFold: inViewport,
        recommendations: this.getImageRecommendations(img, inViewport),
      });
    });

    // Analyze fonts
    const fonts = document.querySelectorAll<HTMLLinkElement>(
      'link[rel="preload"][as="font"], link[href*=".woff"], link[href*=".woff2"]'
    );
    fonts.forEach((font) => {
      if (!font.href) return;

      const timing = this.getResourceTiming(font.href);
      resources.push({
        url: font.href,
        type: 'font',
        criticality: 'high',
        size: timing?.decodedBodySize ?? 0,
        loadTime: timing?.duration ?? 0,
        inViewport: true,
        aboveTheFold: true,
        recommendations: this.getFontRecommendations(font),
      });
    });

    return resources;
  }

  /**
   * Analyze DOM structure
   */
  analyzeDOM(): DOMAnalysis {
    if (typeof document === 'undefined') {
      return this.getEmptyDOMAnalysis();
    }

    const {body} = document;
    if (body == null) {
      return this.getEmptyDOMAnalysis();
    }

    const walker = document.createTreeWalker(body, NodeFilter.SHOW_ELEMENT);
    let totalNodes = 0;
    let maxDepth = 0;
    const levelCounts = new Map<number, number>();
    let aboveTheFoldNodes = 0;

    const countDepth = (node: Node, depth: number): void => {
      totalNodes++;
      maxDepth = Math.max(maxDepth, depth);

      const currentCount = levelCounts.get(depth) ?? 0;
      levelCounts.set(depth, currentCount + 1);

      if (node instanceof Element && this.isInViewport(node)) {
        aboveTheFoldNodes++;
      }
    };

    let depth = 0;
    let node: Node | null = walker.currentNode;
    const nodeDepths = new Map<Node, number>();

    while (node) {
      const parentDepth = node.parentNode
        ? nodeDepths.get(node.parentNode) ?? 0
        : 0;
      depth = parentDepth + 1;
      nodeDepths.set(node, depth);

      countDepth(node, depth);
      node = walker.nextNode();
    }

    // Find widest level
    let widestLevel = 0;
    let widestLevelNodeCount = 0;
    for (const [level, count] of levelCounts.entries()) {
      if (count > widestLevelNodeCount) {
        widestLevel = level;
        widestLevelNodeCount = count;
      }
    }

    const recommendations: string[] = [];

    if (totalNodes > 1500) {
      recommendations.push(
        `DOM has ${totalNodes} nodes. Consider reducing to under 1500 for better performance.`
      );
    }

    if (maxDepth > 32) {
      recommendations.push(
        `DOM depth is ${maxDepth}. Consider flattening to under 32 levels.`
      );
    }

    if (widestLevelNodeCount > 60) {
      recommendations.push(
        `Level ${widestLevel} has ${widestLevelNodeCount} siblings. Consider reducing sibling count.`
      );
    }

    return {
      totalNodes,
      maxDepth,
      widestLevel,
      widestLevelNodeCount,
      aboveTheFoldNodes,
      recommendations,
    };
  }

  /**
   * Get preload recommendations
   */
  getPreloadRecommendations(): ResourceRecommendation[] {
    const criticalResources = this.analyzeCriticalResources();
    const recommendations: ResourceRecommendation[] = [];

    for (const resource of criticalResources) {
      if (
        resource.criticality === 'critical' ||
        (resource.criticality === 'high' && resource.aboveTheFold)
      ) {
        // Check if not already preloaded
        const isPreloaded = document.querySelector(
          `link[rel="preload"][href="${resource.url}"]`
        );

        if (!isPreloaded) {
          recommendations.push({
            action: 'preload',
            reason: `Critical ${resource.type} resource above the fold`,
            priority: 'high',
            estimatedImpact: Math.min(resource.loadTime * 0.5, 500),
          });
        }
      }
    }

    return recommendations;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getResourceTiming(
    url: string
  ): PerformanceResourceTiming | undefined {
    try {
      const entries = performance.getEntriesByType('resource');
      return entries.find((entry) => entry.name.includes(url));
    } catch {
      return undefined;
    }
  }

  private isInViewport(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return (
      rect.top < this.config.viewportHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0
    );
  }

  private getStylesheetSuggestions(link: HTMLLinkElement): string[] {
    const suggestions: string[] = [];

    if (!link.media || link.media === 'all') {
      suggestions.push('Add media query if stylesheet is conditional');
    }

    suggestions.push('Consider inlining critical CSS');
    suggestions.push('Use rel="preload" for critical stylesheets');

    return suggestions;
  }

  private getScriptSuggestions(script: HTMLScriptElement): string[] {
    const suggestions: string[] = [];

    if (!script.async && !script.defer) {
      suggestions.push('Add async or defer attribute');
    }

    suggestions.push('Consider code splitting for large scripts');
    suggestions.push('Move script to end of body if possible');

    return suggestions;
  }

  private getImageRecommendations(
    img: HTMLImageElement,
    inViewport: boolean
  ): ResourceRecommendation[] {
    const recommendations: ResourceRecommendation[] = [];

    if (!inViewport && img.loading !== 'lazy') {
      recommendations.push({
        action: 'lazy',
        reason: 'Image is below the fold',
        priority: 'medium',
        estimatedImpact: 100,
      });
    }

    if (inViewport) {
      // Check for preload
      const isPreloaded = document.querySelector(
        `link[rel="preload"][href="${img.src}"]`
      );
      if (!isPreloaded) {
        recommendations.push({
          action: 'preload',
          reason: 'Above-the-fold image should be preloaded',
          priority: 'high',
          estimatedImpact: 200,
        });
      }
    }

    // Check for dimensions
    if (!img.width || !img.height) {
      recommendations.push({
        action: 'inline',
        reason: 'Add width and height attributes to prevent CLS',
        priority: 'high',
        estimatedImpact: 50,
      });
    }

    return recommendations;
  }

  private getFontRecommendations(
    font: HTMLLinkElement
  ): ResourceRecommendation[] {
    const recommendations: ResourceRecommendation[] = [];

    // Check for font-display
    recommendations.push({
      action: 'inline',
      reason: 'Use font-display: swap for better FOUT handling',
      priority: 'medium',
      estimatedImpact: 100,
    });

    // Check for preconnect
    const fontUrl = new URL(font.href);
    const hasPreconnect = document.querySelector(
      `link[rel="preconnect"][href*="${fontUrl.hostname}"]`
    );
    if (!hasPreconnect) {
      recommendations.push({
        action: 'preload',
        reason: 'Add preconnect for font origin',
        priority: 'high',
        estimatedImpact: 150,
      });
    }

    return recommendations;
  }

  private generateOptimizations(
    blocking: RenderBlockingResource[],
    critical: CriticalResource[],
    dom: DOMAnalysis
  ): CriticalPathOptimization[] {
    const optimizations: CriticalPathOptimization[] = [];

    // Render-blocking optimizations
    if (blocking.length > 0) {
      const totalBlockingTime = blocking.reduce((sum, r) => sum + r.blockingTime, 0);
      let impact: 'high' | 'medium' | 'low' = 'low';
      if (totalBlockingTime > 500) {
        impact = 'high';
      } else if (totalBlockingTime > 200) {
        impact = 'medium';
      }
      optimizations.push({
        type: 'render-blocking',
        description: `${blocking.length} render-blocking resources found`,
        impact,
        estimatedSavings: Math.min(totalBlockingTime * 0.5, 1000),
        implementation:
          'Defer non-critical scripts, inline critical CSS, use preload for critical resources',
      });
    }

    // LCP element optimization
    const lcpImages = critical.filter((r) => r.type === 'image' && r.aboveTheFold);
    if (lcpImages.length > 0) {
      const slowestImage = lcpImages.reduce((a, b) =>
        a.loadTime > b.loadTime ? a : b
      );
      if (slowestImage.loadTime > 500) {
        optimizations.push({
          type: 'lcp-optimization',
          description: 'LCP image can be optimized',
          impact: 'high',
          estimatedSavings: slowestImage.loadTime * 0.3,
          implementation:
            'Preload LCP image, use modern image formats (WebP/AVIF), optimize image size',
        });
      }
    }

    // DOM optimizations
    if (dom.totalNodes > 1500) {
      optimizations.push({
        type: 'dom-size',
        description: `Large DOM size (${dom.totalNodes} nodes)`,
        impact: dom.totalNodes > 3000 ? 'high' : 'medium',
        estimatedSavings: Math.min((dom.totalNodes - 1500) * 0.1, 500),
        implementation:
          'Virtualize long lists, lazy render below-the-fold content, remove unused elements',
      });
    }

    return optimizations.sort((a, b) => {
      const impactOrder = { high: 0, medium: 1, low: 2 };
      return impactOrder[a.impact] - impactOrder[b.impact];
    });
  }

  private calculateScore(
    blocking: RenderBlockingResource[],
    critical: CriticalResource[],
    dom: DOMAnalysis
  ): number {
    let score = 100;

    // Deduct for render-blocking resources
    score -= Math.min(blocking.length * 5, 30);

    // Deduct for slow critical resources
    const slowCritical = critical.filter((r) => r.loadTime > 500);
    score -= Math.min(slowCritical.length * 5, 20);

    // Deduct for DOM issues
    if (dom.totalNodes > 1500) {
      score -= Math.min((dom.totalNodes - 1500) / 100, 20);
    }
    if (dom.maxDepth > 32) {
      score -= Math.min((dom.maxDepth - 32) * 2, 15);
    }

    // Deduct for missing optimizations
    const unoptimizedImages = critical.filter(
      (r) =>
        r.type === 'image' &&
        r.aboveTheFold &&
        r.recommendations.some((rec) => rec.action === 'preload')
    );
    score -= Math.min(unoptimizedImages.length * 3, 15);

    return Math.max(0, Math.round(score));
  }

  private estimateFCP(blocking: RenderBlockingResource[]): number {
    // Base FCP estimate + blocking time
    const baseFCP = 500; // Base server + parse time
    const blockingTime = blocking
      .filter((r) => r.type === 'style')
      .reduce((sum, r) => Math.max(sum, r.blockingTime), 0);
    return baseFCP + blockingTime;
  }

  private estimateLCP(critical: CriticalResource[]): number {
    const lcpCandidates = critical.filter(
      (r) => r.type === 'image' && r.aboveTheFold
    );
    if (lcpCandidates.length === 0) {
      return 1000; // Estimate for text-based LCP
    }

    const slowestImage = lcpCandidates.reduce((a, b) =>
      a.loadTime > b.loadTime ? a : b
    );
    return Math.max(1000, slowestImage.loadTime + 500);
  }

  private getEmptyDOMAnalysis(): DOMAnalysis {
    return {
      totalNodes: 0,
      maxDepth: 0,
      widestLevel: 0,
      widestLevelNodeCount: 0,
      aboveTheFoldNodes: 0,
      recommendations: [],
    };
  }

  // private log(message: string, ...args: unknown[]): void {
  //   if (this.config.debug) {
  //     console.log(`[CriticalPath] ${message}`, ...args);
  //   }
  // }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let analyzerInstance: CriticalPathAnalyzer | null = null;

/**
 * Get or create the global critical path analyzer
 */
export function getCriticalPathAnalyzer(
  config?: Partial<CriticalPathAnalyzerConfig>
): CriticalPathAnalyzer {
  analyzerInstance ??= new CriticalPathAnalyzer(config);
  return analyzerInstance;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate critical CSS extraction hints
 */
export function generateCriticalCSSHints(): string[] {
  if (typeof document === 'undefined') {
    return [];
  }

  const hints: string[] = [];
  const viewportHeight = window.innerHeight;

  // Find above-the-fold elements
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  const aboveTheFold: Element[] = [];

  let node: Node | null = walker.currentNode;
  while (node) {
    if (node instanceof Element) {
      const rect = node.getBoundingClientRect();
      if (rect.top < viewportHeight && rect.bottom > 0) {
        aboveTheFold.push(node);
      }
    }
    node = walker.nextNode();
  }

  // Generate selector hints
  const selectors = new Set<string>();
  aboveTheFold.forEach((el) => {
    // Add tag name
    selectors.add(el.tagName.toLowerCase());

    // Add classes
    el.classList.forEach((cls) => selectors.add(`.${cls}`));

    // Add ID if present
    if (el.id) {
      selectors.add(`#${el.id}`);
    }
  });

  hints.push(`Consider extracting CSS for these selectors: ${Array.from(selectors).slice(0, 20).join(', ')}`);
  hints.push(`${aboveTheFold.length} elements are above the fold`);

  return hints;
}

/**
 * Check if a resource should be preloaded
 */
export function shouldPreload(
  resource: CriticalResource,
  currentPreloads: string[]
): boolean {
  // Already preloaded
  if (currentPreloads.includes(resource.url)) {
    return false;
  }

  // Critical above-the-fold resources should be preloaded
  if (resource.aboveTheFold && resource.criticality !== 'non-critical') {
    return true;
  }

  // Large load times for high priority resources
  if (resource.criticality === 'high' && resource.loadTime > 300) {
    return true;
  }

  return false;
}
