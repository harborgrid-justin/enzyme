/**
 * @file Runtime Bundle Analysis
 * @description Runtime utilities for analyzing bundle composition, chunk loading,
 * and module dependencies. Helps identify optimization opportunities.
 *
 * Features:
 * - Chunk loading analysis
 * - Module dependency tracking
 * - Bundle size estimation
 * - Dynamic import monitoring
 * - Resource timing analysis
 * - Code splitting recommendations
 */

import { isProd } from '@/lib/core/config/env-helper';

// ============================================================================
// Types
// ============================================================================

/**
 * Bundle chunk information
 */
export interface ChunkInfo {
  id: string;
  name: string;
  size: number;
  loadTime: number;
  dependencies: string[];
  isAsync: boolean;
  isEntry: boolean;
  loadedAt: number;
  modules: ModuleInfo[];
}

/**
 * Module information
 */
export interface ModuleInfo {
  id: string;
  name: string;
  size: number;
  importedBy: string[];
  imports: string[];
  isExternal: boolean;
}

/**
 * Bundle analysis report
 */
export interface BundleAnalysisReport {
  totalSize: number;
  chunks: ChunkInfo[];
  largestChunks: ChunkInfo[];
  slowestChunks: ChunkInfo[];
  duplicateModules: string[];
  recommendations: BundleRecommendation[];
  timestamp: number;
}

/**
 * Bundle optimization recommendation
 */
export interface BundleRecommendation {
  type: 'split' | 'combine' | 'lazy' | 'preload' | 'remove' | 'dedupe';
  priority: 'high' | 'medium' | 'low';
  target: string;
  message: string;
  estimatedSavings?: number;
}

/**
 * Resource timing entry
 */
export interface ResourceTimingEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  initiatorType: string;
  cached: boolean;
}

/**
 * Dynamic import tracking entry
 */
export interface DynamicImportEntry {
  modulePath: string;
  chunkName: string | null;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
}

/**
 * Bundle analyzer configuration
 */
export interface BundleAnalyzerConfig {
  /** Enable analysis */
  enabled: boolean;
  /** Track dynamic imports */
  trackDynamicImports: boolean;
  /** Track resource timing */
  trackResourceTiming: boolean;
  /** Large chunk threshold in bytes */
  largeChunkThreshold: number;
  /** Slow chunk threshold in ms */
  slowChunkThreshold: number;
  /** Enable recommendations */
  generateRecommendations: boolean;
  /** Debug mode */
  debug: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: BundleAnalyzerConfig = {
  enabled: !isProd(),
  trackDynamicImports: true,
  trackResourceTiming: true,
  largeChunkThreshold: 250 * 1024, // 250KB
  slowChunkThreshold: 1000, // 1 second
  generateRecommendations: true,
  debug: false,
};

// ============================================================================
// Bundle Analyzer
// ============================================================================

/**
 * Runtime bundle analyzer
 */
export class BundleAnalyzer {
  private config: BundleAnalyzerConfig;
  private chunks: Map<string, ChunkInfo> = new Map();
  private dynamicImports: DynamicImportEntry[] = [];
  private resourceObserver: PerformanceObserver | null = null;

  constructor(config: Partial<BundleAnalyzerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start analyzing bundles
   */
  start(): void {
    if (!this.config.enabled) {
      return;
    }

    this.log('Starting bundle analyzer');

    if (this.config.trackResourceTiming) {
      this.startResourceTracking();
    }

    // Analyze initial bundles
    this.analyzeInitialBundles();
  }

  /**
   * Stop analyzing
   */
  stop(): void {
    if (this.resourceObserver !== null) {
      this.resourceObserver.disconnect();
      this.resourceObserver = null;
    }
  }

  /**
   * Track a dynamic import
   */
  async trackDynamicImport(
    modulePath: string,
    importPromise: Promise<unknown>
  ): Promise<unknown> {
    if (!this.config.enabled || !this.config.trackDynamicImports) {
      return importPromise;
    }

    const startTime = performance.now();
    const chunkName = this.extractChunkName(modulePath);

    return importPromise
      .then((result) => {
        const endTime = performance.now();
        this.dynamicImports.push({
          modulePath,
          chunkName,
          startTime,
          endTime,
          duration: endTime - startTime,
          success: true,
        });
        this.log(`Dynamic import success: ${modulePath} (${(endTime - startTime).toFixed(2)}ms)`);
        return result;
      })
      .catch((error: unknown) => {
        const endTime = performance.now();
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.dynamicImports.push({
          modulePath,
          chunkName,
          startTime,
          endTime,
          duration: endTime - startTime,
          success: false,
          error: errorMessage,
        });
        this.log(`Dynamic import failed: ${modulePath}`, error);
        throw error;
      });
  }

  /**
   * Get bundle analysis report
   */
  getReport(): BundleAnalysisReport {
    const chunks = Array.from(this.chunks.values());
    const totalSize = chunks.reduce((sum, c) => sum + c.size, 0);

    const largestChunks = [...chunks]
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);

    const slowestChunks = [...chunks]
      .sort((a, b) => b.loadTime - a.loadTime)
      .slice(0, 10);

    const duplicateModules = this.findDuplicateModules();
    const recommendations = this.config.generateRecommendations
      ? this.generateRecommendations(chunks, duplicateModules)
      : [];

    return {
      totalSize,
      chunks,
      largestChunks,
      slowestChunks,
      duplicateModules,
      recommendations,
      timestamp: Date.now(),
    };
  }

  /**
   * Get resource timing data
   */
  getResourceTiming(): ResourceTimingEntry[] {
    return performance
      .getEntriesByType('resource')
      .filter((entry) => this.isJavaScriptResource(entry.name))
      .map((entry) => {
        const resourceEntry = entry;
        return {
          name: resourceEntry.name,
          entryType: resourceEntry.entryType,
          startTime: resourceEntry.startTime,
          duration: resourceEntry.duration,
          transferSize: resourceEntry.transferSize,
          encodedBodySize: resourceEntry.encodedBodySize,
          decodedBodySize: resourceEntry.decodedBodySize,
          initiatorType: resourceEntry.initiatorType,
          cached: resourceEntry.transferSize === 0 && resourceEntry.decodedBodySize > 0,
        };
      });
  }

  /**
   * Get dynamic import history
   */
  getDynamicImports(): DynamicImportEntry[] {
    return [...this.dynamicImports];
  }

  /**
   * Clear analysis data
   */
  clear(): void {
    this.chunks.clear();
    this.dynamicImports = [];
    performance.clearResourceTimings();
  }

  /**
   * Analyze a specific chunk
   */
  analyzeChunk(chunkId: string, options: Partial<ChunkInfo> = {}): ChunkInfo {
    const existing = this.chunks.get(chunkId);
    if (existing) {
      return { ...existing, ...options };
    }

    const chunkInfo: ChunkInfo = {
      id: chunkId,
      name: options.name ?? chunkId,
      size: options.size ?? 0,
      loadTime: options.loadTime ?? 0,
      dependencies: options.dependencies ?? [],
      isAsync: options.isAsync ?? true,
      isEntry: options.isEntry ?? false,
      loadedAt: options.loadedAt ?? Date.now(),
      modules: options.modules ?? [],
    };

    this.chunks.set(chunkId, chunkInfo);
    return chunkInfo;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private startResourceTracking(): void {
    if (typeof PerformanceObserver === 'undefined') {
      return;
    }

    try {
      this.resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (this.isJavaScriptResource(entry.name)) {
            this.processResourceEntry(entry as PerformanceResourceTiming);
          }
        }
      });

      this.resourceObserver.observe({ type: 'resource', buffered: true });
    } catch (error) {
      this.log('Failed to start resource tracking:', error);
    }
  }

  private analyzeInitialBundles(): void {
    // Analyze already loaded scripts
    const resources = this.getResourceTiming();

    for (const resource of resources) {
      const chunkId = this.extractChunkId(resource.name);
      this.analyzeChunk(chunkId, {
        name: resource.name,
        size: resource.decodedBodySize,
        loadTime: resource.duration,
        isEntry: resource.initiatorType === 'script',
        isAsync: resource.initiatorType !== 'script',
        loadedAt: Date.now() - resource.duration,
      });
    }
  }

  private processResourceEntry(entry: PerformanceResourceTiming): void {
    if (!this.isJavaScriptResource(entry.name)) {
      return;
    }

    const chunkId = this.extractChunkId(entry.name);
    this.analyzeChunk(chunkId, {
      name: entry.name,
      size: entry.decodedBodySize,
      loadTime: entry.duration,
      isAsync: entry.initiatorType !== 'script',
      loadedAt: Date.now(),
    });

    // Check for slow chunk
    if (entry.duration > this.config.slowChunkThreshold) {
      this.log(`Slow chunk detected: ${entry.name} (${entry.duration.toFixed(2)}ms)`);
    }

    // Check for large chunk
    if (entry.decodedBodySize > this.config.largeChunkThreshold) {
      this.log(
        `Large chunk detected: ${entry.name} (${(entry.decodedBodySize / 1024).toFixed(2)}KB)`
      );
    }
  }

  private isJavaScriptResource(name: string): boolean {
    return /\.js($|\?)/.test(name);
  }

  private extractChunkId(url: string): string {
    try {
      const {pathname} = new URL(url);
      const filename = pathname.split('/').pop() ?? url;
      // Remove hash and extension
      return filename.replace(/\.[a-f0-9]+\.js$/, '.js').replace(/\.js$/, '');
    } catch {
      return url;
    }
  }

  private extractChunkName(modulePath: string): string | null {
    // Check for webpack magic comment chunk name
    const chunkNameMatch = modulePath.match(/webpackChunkName:\s*["']([^"']+)["']/);
    return chunkNameMatch ? (chunkNameMatch[1] ?? null) : null;
  }

  private findDuplicateModules(): string[] {
    const moduleCounts = new Map<string, number>();

    for (const chunk of this.chunks.values()) {
      for (const module of chunk.modules) {
        const count = moduleCounts.get(module.name) ?? 0;
        moduleCounts.set(module.name, count + 1);
      }
    }

    return Array.from(moduleCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([name]) => name);
  }

  private generateRecommendations(
    chunks: ChunkInfo[],
    duplicates: string[]
  ): BundleRecommendation[] {
    const recommendations: BundleRecommendation[] = [];

    // Large chunk recommendations
    for (const chunk of chunks) {
      if (chunk.size > this.config.largeChunkThreshold * 2) {
        recommendations.push({
          type: 'split',
          priority: 'high',
          target: chunk.name,
          message: `Consider splitting ${chunk.name} (${(chunk.size / 1024).toFixed(2)}KB)`,
          estimatedSavings: chunk.size * 0.3, // Estimate 30% reduction
        });
      }
    }

    // Slow chunk recommendations
    for (const chunk of chunks) {
      if (chunk.loadTime > this.config.slowChunkThreshold * 2 && !chunk.isEntry) {
        recommendations.push({
          type: 'preload',
          priority: 'medium',
          target: chunk.name,
          message: `Consider preloading ${chunk.name} (${chunk.loadTime.toFixed(0)}ms load time)`,
        });
      }
    }

    // Duplicate module recommendations
    for (const duplicate of duplicates) {
      recommendations.push({
        type: 'dedupe',
        priority: 'medium',
        target: duplicate,
        message: `Module "${duplicate}" is duplicated across chunks`,
      });
    }

    // Lazy loading recommendations
    for (const chunk of chunks) {
      if (chunk.isEntry && chunk.size > this.config.largeChunkThreshold) {
        recommendations.push({
          type: 'lazy',
          priority: 'low',
          target: chunk.name,
          message: `Consider lazy-loading non-critical parts of ${chunk.name}`,
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log(`[BundleAnalyzer] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Dynamic Import Wrapper
// ============================================================================

/**
 * Create a tracked dynamic import function
 */
export function createTrackedImport(
  analyzer: BundleAnalyzer
): <T>(importFn: () => Promise<T>, modulePath: string) => Promise<T> {
  return async <T>(importFn: () => Promise<T>, modulePath: string): Promise<T> => {
    return analyzer.trackDynamicImport(modulePath, importFn()) as Promise<T>;
  };
}

// ============================================================================
// Bundle Size Utilities
// ============================================================================

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = sizes[i] ?? 'GB';

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${size}`;
}

/**
 * Calculate bundle budget status
 */
export function checkBundleBudget(
  size: number,
  budget: number
): { status: 'ok' | 'warning' | 'exceeded'; percent: number } {
  const percent = (size / budget) * 100;

  if (percent <= 80) {
    return { status: 'ok', percent };
  } else if (percent <= 100) {
    return { status: 'warning', percent };
  } else {
    return { status: 'exceeded', percent };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let analyzerInstance: BundleAnalyzer | null = null;

/**
 * Get or create the global bundle analyzer instance
 */
export function getBundleAnalyzer(
  config?: Partial<BundleAnalyzerConfig>
): BundleAnalyzer {
  analyzerInstance ??= new BundleAnalyzer(config);
  return analyzerInstance;
}

/**
 * Reset the analyzer instance
 */
export function resetBundleAnalyzer(): void {
  if (analyzerInstance !== null) {
    analyzerInstance.stop();
    analyzerInstance = null;
  }
}
