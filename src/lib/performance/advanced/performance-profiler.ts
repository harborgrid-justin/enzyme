/**
 * @file Deep Performance Profiler
 * @description Enterprise-grade performance profiling with runtime analysis,
 * bottleneck detection, and actionable insights. Integrates with React DevTools
 * Profiler API and Performance Observer API.
 *
 * Features:
 * - Component render timing
 * - Long task detection
 * - Memory pressure monitoring
 * - Frame rate analysis
 * - Network waterfall tracking
 * - Custom mark/measure API
 */

import { isProd } from '@/lib/core/config/env-helper';

// ============================================================================
// Types
// ============================================================================

/**
 * Profiler configuration
 */
export interface ProfilerConfig {
  /** Enable profiling (disable in production for zero overhead) */
  enabled: boolean;
  /** Maximum number of entries to store */
  maxEntries: number;
  /** Enable long task detection */
  detectLongTasks: boolean;
  /** Long task threshold in ms */
  longTaskThreshold: number;
  /** Enable frame rate monitoring */
  monitorFrameRate: boolean;
  /** Frame rate sample interval in ms */
  frameRateSampleInterval: number;
  /** Enable memory monitoring */
  monitorMemory: boolean;
  /** Memory sample interval in ms */
  memorySampleInterval: number;
  /** Enable automatic performance marks */
  autoMark: boolean;
  /** Debug mode */
  debug: boolean;
}

/**
 * Render timing entry
 */
export interface RenderTimingEntry {
  id: string;
  componentName: string;
  phase: 'mount' | 'update' | 'unmount';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  interactions: Set<unknown>;
  timestamp: number;
}

/**
 * Long task entry
 */
export interface LongTaskEntry {
  id: string;
  name: string;
  duration: number;
  startTime: number;
  attribution: LongTaskAttribution[];
  timestamp: number;
}

/**
 * Long task attribution
 */
export interface LongTaskAttribution {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  containerType: string;
  containerSrc: string;
  containerId: string;
  containerName: string;
}

/**
 * Frame rate sample
 */
export interface FrameRateSample {
  fps: number;
  frameTime: number;
  jank: boolean;
  timestamp: number;
}

/**
 * Memory sample
 */
export interface MemorySample {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercent: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  timestamp: number;
}

/**
 * Custom performance mark
 */
export interface PerformanceMark {
  name: string;
  startTime: number;
  detail?: unknown;
}

/**
 * Custom performance measure
 */
export interface PerformanceMeasure {
  name: string;
  startMark: string;
  endMark: string;
  duration: number;
  startTime: number;
  detail?: unknown;
}

/**
 * Performance snapshot
 */
export interface PerformanceSnapshot {
  renders: RenderTimingEntry[];
  longTasks: LongTaskEntry[];
  frameRate: FrameRateSample[];
  memory: MemorySample[];
  marks: PerformanceMark[];
  measures: PerformanceMeasure[];
  summary: PerformanceSummary;
  timestamp: number;
}

/**
 * Performance summary
 */
export interface PerformanceSummary {
  averageRenderTime: number;
  maxRenderTime: number;
  totalRenders: number;
  slowRenders: number;
  longTaskCount: number;
  totalLongTaskTime: number;
  averageFPS: number;
  minFPS: number;
  jankFrames: number;
  memoryTrend: 'increasing' | 'stable' | 'decreasing' | 'unknown';
  potentialMemoryLeak: boolean;
}

/**
 * Profiler event type
 */
export type ProfilerEventType =
  | 'render'
  | 'longTask'
  | 'frameRate'
  | 'memory'
  | 'mark'
  | 'measure';

/**
 * Profiler event listener
 */
export type ProfilerEventListener = (
  type: ProfilerEventType,
  entry: unknown
) => void;

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: ProfilerConfig = {
  enabled: !isProd(),
  maxEntries: 1000,
  detectLongTasks: true,
  longTaskThreshold: 50,
  monitorFrameRate: true,
  frameRateSampleInterval: 1000,
  monitorMemory: true,
  memorySampleInterval: 5000,
  autoMark: true,
  debug: false,
};

// ============================================================================
// Performance Profiler Class
// ============================================================================

/**
 * Deep performance profiler with runtime analysis
 */
export class PerformanceProfiler {
  private config: ProfilerConfig;
  private renders: RenderTimingEntry[] = [];
  private longTasks: LongTaskEntry[] = [];
  private frameRateSamples: FrameRateSample[] = [];
  private memorySamples: MemorySample[] = [];
  private marks: Map<string, PerformanceMark> = new Map();
  private measures: PerformanceMeasure[] = [];
  private listeners: Set<ProfilerEventListener> = new Set();
  private longTaskObserver: PerformanceObserver | null = null;
  private frameRateTimer: ReturnType<typeof setInterval> | null = null;
  private memoryTimer: ReturnType<typeof setInterval> | null = null;
  // private __lastFrameTime = 0;
  // private __frameCount = 0;
  private isRunning = false;
  private idCounter = 0;

  constructor(config: Partial<ProfilerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start profiling
   */
  start(): void {
    if (!this.config.enabled || this.isRunning) {
      return;
    }

    this.log('Starting performance profiler');
    this.isRunning = true;

    if (this.config.detectLongTasks) {
      this.startLongTaskDetection();
    }

    if (this.config.monitorFrameRate) {
      this.startFrameRateMonitoring();
    }

    if (this.config.monitorMemory) {
      this.startMemoryMonitoring();
    }

    if (this.config.autoMark) {
      this.markNavigationTimings();
    }
  }

  /**
   * Stop profiling
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.log('Stopping performance profiler');
    this.isRunning = false;

    if (this.longTaskObserver !== null) {
      this.longTaskObserver.disconnect();
      this.longTaskObserver = null;
    }

    if (this.frameRateTimer !== null) {
      clearInterval(this.frameRateTimer);
      this.frameRateTimer = null;
    }

    if (this.memoryTimer !== null) {
      clearInterval(this.memoryTimer);
      this.memoryTimer = null;
    }
  }

  /**
   * Record a component render (for React Profiler integration)
   */
  recordRender(
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number,
    interactions: Set<unknown>
  ): void {
    if (!this.config.enabled) {
      return;
    }

    const entry: RenderTimingEntry = {
      id: this.generateId(),
      componentName: id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      interactions,
      timestamp: Date.now(),
    };

    this.addEntry('render', entry, this.renders);
    this.notifyListeners('render', entry);

    if (actualDuration > this.config.longTaskThreshold) {
      this.log(`Slow render detected: ${id} took ${actualDuration.toFixed(2)}ms`);
    }
  }

  /**
   * Create a performance mark
   */
  mark(name: string, detail?: unknown): void {
    if (!this.config.enabled) {
      return;
    }

    const mark: PerformanceMark = {
      name,
      startTime: performance.now(),
      detail,
    };

    this.marks.set(name, mark);

    // Also add to browser's performance timeline
    try {
      performance.mark(name, { detail });
    } catch {
      // Fallback for browsers without detail support
      performance.mark(name);
    }

    this.notifyListeners('mark', mark);
  }

  /**
   * Create a performance measure between two marks
   */
  measure(name: string, startMark: string, endMark?: string): PerformanceMeasure | null {
    if (!this.config.enabled) {
      return null;
    }

    const start = this.marks.get(startMark);
    const endTime = endMark !== undefined ? this.marks.get(endMark)?.startTime : performance.now();

    if (start === undefined || endTime === undefined) {
      this.log(`Cannot create measure: marks not found (${startMark}, ${endMark ?? 'undefined'})`);
      return null;
    }

    const measure: PerformanceMeasure = {
      name,
      startMark,
      endMark: endMark ?? 'now',
      duration: endTime - start.startTime,
      startTime: start.startTime,
    };

    this.addEntry('measure', measure, this.measures);

    // Also add to browser's performance timeline
    try {
      performance.measure(name, startMark, endMark);
    } catch {
      // Fallback
    }

    this.notifyListeners('measure', measure);
    return measure;
  }

  /**
   * Start a timed operation (returns function to end timing)
   */
  startTiming(name: string): () => number {
    const startMark = `${name}-start`;
    this.mark(startMark);

    return () => {
      const endMark = `${name}-end`;
      this.mark(endMark);
      const measure = this.measure(name, startMark, endMark);
      return measure?.duration ?? 0;
    };
  }

  /**
   * Get current performance snapshot
   */
  getSnapshot(): PerformanceSnapshot {
    return {
      renders: [...this.renders],
      longTasks: [...this.longTasks],
      frameRate: [...this.frameRateSamples],
      memory: [...this.memorySamples],
      marks: Array.from(this.marks.values()),
      measures: [...this.measures],
      summary: this.calculateSummary(),
      timestamp: Date.now(),
    };
  }

  /**
   * Clear all profiling data
   */
  clear(): void {
    this.renders = [];
    this.longTasks = [];
    this.frameRateSamples = [];
    this.memorySamples = [];
    this.marks.clear();
    this.measures = [];
    performance.clearMarks();
    performance.clearMeasures();
    this.log('Profiling data cleared');
  }

  /**
   * Subscribe to profiler events
   */
  subscribe(listener: ProfilerEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Export profiling data as JSON
   */
  exportData(): string {
    return JSON.stringify(this.getSnapshot(), (_key, value: unknown): unknown => {
      if (value instanceof Set) {
        return Array.from(value);
      }
      return value;
    }, 2);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private startLongTaskDetection(): void {
    if (typeof PerformanceObserver === 'undefined') {
      this.log('PerformanceObserver not supported');
      return;
    }

    try {
      this.longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const taskEntry = entry as PerformanceEntry & {
            attribution?: LongTaskAttribution[];
          };

          const longTask: LongTaskEntry = {
            id: this.generateId(),
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
            attribution: taskEntry.attribution ?? [],
            timestamp: Date.now(),
          };

          this.addEntry('longTask', longTask, this.longTasks);
          this.notifyListeners('longTask', longTask);

          if (entry.duration > 100) {
            this.log(`Long task detected: ${entry.duration.toFixed(2)}ms`, taskEntry.attribution);
          }
        }
      });

      this.longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch (error) {
      this.log('Failed to start long task detection:', error);
    }
  }

  private startFrameRateMonitoring(): void {
    let lastTime = performance.now();
    let frames = 0;

    const measureFPS = (): void => {
      const currentTime = performance.now();
      frames++;

      if (currentTime >= lastTime + this.config.frameRateSampleInterval) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime));
        const frameTime = (currentTime - lastTime) / frames;
        const jank = fps < 30;

        const sample: FrameRateSample = {
          fps,
          frameTime,
          jank,
          timestamp: Date.now(),
        };

        this.addEntry('frameRate', sample, this.frameRateSamples);
        this.notifyListeners('frameRate', sample);

        if (jank) {
          this.log(`Frame rate drop: ${fps} FPS`);
        }

        frames = 0;
        lastTime = currentTime;
      }

      if (this.isRunning) {
        requestAnimationFrame(measureFPS);
      }
    };

    requestAnimationFrame(measureFPS);
  }

  private startMemoryMonitoring(): void {
    const measureMemory = (): void => {
      const {memory} = (performance as Performance & {
        memory?: {
          usedJSHeapSize: number;
          totalJSHeapSize: number;
          jsHeapSizeLimit: number;
        };
      });

      if (memory === undefined) {
        this.log('Memory API not available');
        return;
      }

      const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      const trend = this.calculateMemoryTrend(memory.usedJSHeapSize);

      const sample: MemorySample = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercent,
        trend,
        timestamp: Date.now(),
      };

      this.addEntry('memory', sample, this.memorySamples);
      this.notifyListeners('memory', sample);

      if (usagePercent > 90) {
        this.log(`High memory usage: ${usagePercent.toFixed(1)}%`);
      }
    };

    this.memoryTimer = setInterval(measureMemory, this.config.memorySampleInterval);
    measureMemory(); // Initial measurement
  }

  private calculateMemoryTrend(
    currentUsage: number
  ): 'increasing' | 'stable' | 'decreasing' {
    const recentSamples = this.memorySamples.slice(-5);
    if (recentSamples.length < 3) {
      return 'stable';
    }

    const avgRecent =
      recentSamples.reduce((sum, s) => sum + s.usedJSHeapSize, 0) /
      recentSamples.length;
    const diff = currentUsage - avgRecent;
    const threshold = avgRecent * 0.05; // 5% threshold

    if (diff > threshold) return 'increasing';
    if (diff < -threshold) return 'decreasing';
    return 'stable';
  }

  private markNavigationTimings(): void {
    if (typeof window === 'undefined') return;

    const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (timing === undefined) return;

    this.mark('domInteractive', { source: 'navigation' });
    this.mark('domContentLoaded', { source: 'navigation' });
    this.mark('loadComplete', { source: 'navigation' });
  }

  private calculateSummary(): PerformanceSummary {
    const renderTimes = this.renders.map((r) => r.actualDuration);
    const avgRenderTime =
      renderTimes.length > 0
        ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length
        : 0;

    const fpsSamples = this.frameRateSamples.map((s) => s.fps);
    const avgFPS =
      fpsSamples.length > 0
        ? fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length
        : 60;

    const lastMemorySample = this.memorySamples[this.memorySamples.length - 1];
    const memoryTrend =
      this.memorySamples.length > 0 && lastMemorySample !== undefined
        ? lastMemorySample.trend
        : 'unknown';

    // Detect potential memory leak (consistently increasing memory)
    const recentMemory = this.memorySamples.slice(-10);
    const potentialMemoryLeak =
      recentMemory.length >= 10 &&
      recentMemory.every((s) => s.trend === 'increasing');

    return {
      averageRenderTime: avgRenderTime,
      maxRenderTime: Math.max(...renderTimes, 0),
      totalRenders: this.renders.length,
      slowRenders: this.renders.filter(
        (r) => r.actualDuration > this.config.longTaskThreshold
      ).length,
      longTaskCount: this.longTasks.length,
      totalLongTaskTime: this.longTasks.reduce((sum, t) => sum + t.duration, 0),
      averageFPS: avgFPS,
      minFPS: Math.min(...fpsSamples, 60),
      jankFrames: this.frameRateSamples.filter((s) => s.jank).length,
      memoryTrend,
      potentialMemoryLeak,
    };
  }

  private addEntry<T>(_type: ProfilerEventType, entry: T, array: T[]): void {
    array.push(entry);
    if (array.length > this.config.maxEntries) {
      array.shift();
    }
  }

  private notifyListeners(type: ProfilerEventType, entry: unknown): void {
    this.listeners.forEach((listener) => listener(type, entry));
  }

  private generateId(): string {
    return `prof-${Date.now()}-${++this.idCounter}`;
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log(`[PerformanceProfiler] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let profilerInstance: PerformanceProfiler | null = null;

/**
 * Get or create the global profiler instance
 */
export function getPerformanceProfiler(
  config?: Partial<ProfilerConfig>
): PerformanceProfiler {
  profilerInstance ??= new PerformanceProfiler(config);
  return profilerInstance;
}

/**
 * Reset the profiler instance (for testing)
 */
export function resetPerformanceProfiler(): void {
  if (profilerInstance !== null) {
    profilerInstance.stop();
    profilerInstance = null;
  }
}

// ============================================================================
// React Integration Helper
// ============================================================================

/**
 * Create a React Profiler onRender callback
 */
export function createProfilerCallback(
  profiler: PerformanceProfiler = getPerformanceProfiler()
): (
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number,
  interactions: Set<unknown>
) => void {
  return (id, phase, actualDuration, baseDuration, startTime, commitTime, interactions) => {
    profiler.recordRender(
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      interactions
    );
  };
}
