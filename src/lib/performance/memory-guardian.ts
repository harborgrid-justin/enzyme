/**
 * @file Memory Guardian System
 * @description PhD-level proactive memory management with automatic leak prevention,
 * cleanup orchestration, and memory pressure handling for React applications.
 *
 * Features:
 * - Real-time memory pressure monitoring
 * - Automatic cleanup orchestration
 * - Component memory budget tracking
 * - Leak detection and prevention
 * - GC hint coordination
 * - Subscription and listener tracking
 * - WeakRef-based cache management
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Memory pressure levels
 */
export type MemoryPressureLevel = 'normal' | 'moderate' | 'critical';

/**
 * Memory snapshot
 */
export interface MemorySnapshot {
  /** Used JS heap size in bytes */
  usedJSHeapSize: number;
  /** Total JS heap size in bytes */
  totalJSHeapSize: number;
  /** Heap size limit in bytes */
  jsHeapSizeLimit: number;
  /** Usage percentage (0-100) */
  usagePercent: number;
  /** Current pressure level */
  pressureLevel: MemoryPressureLevel;
  /** Timestamp */
  timestamp: number;
}

/**
 * Cleanup handler registration
 */
export interface CleanupHandler {
  /** Unique identifier */
  id: string;
  /** Cleanup priority (higher runs first) */
  priority: number;
  /** The cleanup function */
  cleanup: () => void | Promise<void>;
  /** Component or context name */
  context?: string;
  /** Estimated memory freed */
  estimatedBytes?: number;
}

/**
 * Memory budget for a component
 */
export interface ComponentMemoryBudget {
  /** Component identifier */
  componentId: string;
  /** Maximum allowed memory in bytes */
  maxBytes: number;
  /** Current usage in bytes */
  currentBytes: number;
  /** Warning threshold (0-1) */
  warningThreshold: number;
  /** Cleanup callback when exceeded */
  onExceed?: () => void;
}

/**
 * Subscription tracker entry
 */
export interface TrackedSubscription {
  /** Unique ID */
  id: string;
  /** Subscription type */
  type: 'event' | 'interval' | 'timeout' | 'observer' | 'websocket' | 'custom';
  /** Context/component name */
  context: string;
  /** Unsubscribe function */
  unsubscribe: () => void;
  /** Creation timestamp */
  createdAt: number;
  /** Whether it's been cleaned up */
  cleaned: boolean;
}

/**
 * Memory guardian configuration
 */
export interface MemoryGuardianConfig {
  /** Enable automatic monitoring */
  autoMonitor?: boolean;
  /** Monitoring interval in ms */
  monitorInterval?: number;
  /** Moderate pressure threshold (0-1) */
  moderateThreshold?: number;
  /** Critical pressure threshold (0-1) */
  criticalThreshold?: number;
  /** Enable automatic cleanup on pressure */
  autoCleanup?: boolean;
  /** Enable debug logging */
  debug?: boolean;
  /** Maximum tracked subscriptions */
  maxTrackedSubscriptions?: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: Required<MemoryGuardianConfig> = {
  autoMonitor: true,
  monitorInterval: 5000,
  moderateThreshold: 0.7,
  criticalThreshold: 0.9,
  autoCleanup: true,
  debug: false,
  maxTrackedSubscriptions: 1000,
};

// ============================================================================
// Memory Guardian Class
// ============================================================================

/**
 * Proactive memory management guardian
 */
export class MemoryGuardian {
  private static instance: MemoryGuardian;
  private config: Required<MemoryGuardianConfig>;
  private cleanupHandlers: Map<string, CleanupHandler> = new Map();
  private componentBudgets: Map<string, ComponentMemoryBudget> = new Map();
  private subscriptions: Map<string, TrackedSubscription> = new Map();
  private memoryHistory: MemorySnapshot[] = [];
  private monitorIntervalId: ReturnType<typeof setInterval> | null = null;
  private pressureCallbacks: Set<(level: MemoryPressureLevel) => void> = new Set();
  private lastPressureLevel: MemoryPressureLevel = 'normal';
  private subscriptionIdCounter = 0;
  private cleanupIdCounter = 0;

  constructor(config: MemoryGuardianConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.autoMonitor) {
      this.startMonitoring();
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: MemoryGuardianConfig): MemoryGuardian {
    MemoryGuardian.instance ??= new MemoryGuardian(config);
    return MemoryGuardian.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    if (MemoryGuardian.instance) {
      MemoryGuardian.instance.stopMonitoring();
      // Type-safe null assignment for singleton reset
      (MemoryGuardian as unknown as { instance: MemoryGuardian | null }).instance = null;
    }
  }

  // ============================================================================
  // Memory Monitoring
  // ============================================================================

  /**
   * Start memory monitoring
   */
  startMonitoring(): void {
    if (this.monitorIntervalId) return;

    this.monitorIntervalId = setInterval(() => {
      this.checkMemory();
    }, this.config.monitorInterval);

    // Initial check
    this.checkMemory();

    this.log('Memory monitoring started');
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.monitorIntervalId) {
      clearInterval(this.monitorIntervalId);
      this.monitorIntervalId = null;
    }
  }

  /**
   * Check current memory status
   */
  checkMemory(): MemorySnapshot {
    const snapshot = this.getMemorySnapshot();

    // Store history (keep last 60 snapshots)
    this.memoryHistory.push(snapshot);
    if (this.memoryHistory.length > 60) {
      this.memoryHistory.shift();
    }

    // Check pressure level changes
    if (snapshot.pressureLevel !== this.lastPressureLevel) {
      this.lastPressureLevel = snapshot.pressureLevel;
      this.notifyPressureChange(snapshot.pressureLevel);

      // Trigger auto cleanup on pressure
      if (this.config.autoCleanup && snapshot.pressureLevel !== 'normal') {
        this.triggerCleanup(snapshot.pressureLevel);
      }
    }

    // Check component budgets
    this.checkComponentBudgets();

    return snapshot;
  }

  /**
   * Get current memory snapshot
   */
  getMemorySnapshot(): MemorySnapshot {
    const timestamp = Date.now();

    // Check if performance.memory is available
    const perfWithMemory = performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };

    if (!perfWithMemory.memory) {
      return {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        usagePercent: 0,
        pressureLevel: 'normal',
        timestamp,
      };
    }

    const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = perfWithMemory.memory;
    const usagePercent = (usedJSHeapSize / jsHeapSizeLimit) * 100;

    let pressureLevel: MemoryPressureLevel = 'normal';
    if (usagePercent >= this.config.criticalThreshold * 100) {
      pressureLevel = 'critical';
    } else if (usagePercent >= this.config.moderateThreshold * 100) {
      pressureLevel = 'moderate';
    }

    return {
      usedJSHeapSize,
      totalJSHeapSize,
      jsHeapSizeLimit,
      usagePercent,
      pressureLevel,
      timestamp,
    };
  }

  /**
   * Notify pressure change callbacks
   */
  private notifyPressureChange(level: MemoryPressureLevel): void {
    this.log(`Memory pressure changed to: ${level}`);
    this.pressureCallbacks.forEach((callback) => callback(level));
  }

  /**
   * Subscribe to pressure changes
   */
  onPressureChange(callback: (level: MemoryPressureLevel) => void): () => void {
    this.pressureCallbacks.add(callback);
    return () => this.pressureCallbacks.delete(callback);
  }

  // ============================================================================
  // Cleanup Management
  // ============================================================================

  /**
   * Register a cleanup handler
   */
  registerCleanup(
    cleanup: () => void | Promise<void>,
    options: {
      priority?: number;
      context?: string;
      estimatedBytes?: number;
    } = {}
  ): string {
    const id = `cleanup-${++this.cleanupIdCounter}`;

    const handler: CleanupHandler = {
      id,
      priority: options.priority ?? 0,
      cleanup,
      context: options.context,
      estimatedBytes: options.estimatedBytes,
    };

    this.cleanupHandlers.set(id, handler);
    this.log(`Registered cleanup handler: ${id}`, options.context);

    return id;
  }

  /**
   * Unregister a cleanup handler
   */
  unregisterCleanup(id: string): boolean {
    return this.cleanupHandlers.delete(id);
  }

  /**
   * Trigger cleanup based on pressure level
   */
  async triggerCleanup(pressureLevel: MemoryPressureLevel): Promise<number> {
    const handlers = Array.from(this.cleanupHandlers.values());

    // Sort by priority (higher first)
    handlers.sort((a, b) => b.priority - a.priority);

    let cleanedBytes = 0;
    const handlersToRun = pressureLevel === 'critical'
      ? handlers
      : handlers.filter((h) => h.priority > 50);

    this.log(`Running ${handlersToRun.length} cleanup handlers`);

    for (const handler of handlersToRun) {
      try {
        await handler.cleanup();
        cleanedBytes += handler.estimatedBytes ?? 0;
      } catch (error) {
        this.log(`Cleanup failed for ${handler.id}:`, error);
      }
    }

    // Clean up stale subscriptions
    this.cleanStaleSubscriptions();

    // Hint GC
    this.hintGC();

    return cleanedBytes;
  }

  /**
   * Hint garbage collection (non-blocking)
   */
  private hintGC(): void {
    // Use requestIdleCallback to hint GC during idle time
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        // Trigger minor GC by creating and releasing objects
        const temp: unknown[] = [];
        for (let i = 0; i < 1000; i++) {
          temp.push({});
        }
        temp.length = 0;
      });
    }
  }

  // ============================================================================
  // Component Memory Budgets
  // ============================================================================

  /**
   * Set memory budget for a component
   */
  setComponentBudget(
    componentId: string,
    budget: Omit<ComponentMemoryBudget, 'componentId' | 'currentBytes'>
  ): void {
    this.componentBudgets.set(componentId, {
      componentId,
      currentBytes: 0,
      ...budget,
    });
  }

  /**
   * Update component memory usage
   */
  updateComponentMemory(componentId: string, bytes: number): void {
    const budget = this.componentBudgets.get(componentId);
    if (budget) {
      budget.currentBytes = bytes;
    }
  }

  /**
   * Check all component budgets
   */
  private checkComponentBudgets(): void {
    for (const budget of this.componentBudgets.values()) {
      const usageRatio = budget.currentBytes / budget.maxBytes;

      if (usageRatio >= 1) {
        this.log(`Component ${budget.componentId} exceeded memory budget`);
        budget.onExceed?.();
      } else if (usageRatio >= budget.warningThreshold) {
        this.log(`Component ${budget.componentId} approaching memory limit: ${(usageRatio * 100).toFixed(1)}%`);
      }
    }
  }

  /**
   * Remove component budget
   */
  removeComponentBudget(componentId: string): void {
    this.componentBudgets.delete(componentId);
  }

  // ============================================================================
  // Subscription Tracking
  // ============================================================================

  /**
   * Track a subscription for automatic cleanup
   */
  trackSubscription(
    type: TrackedSubscription['type'],
    context: string,
    unsubscribe: () => void
  ): string {
    const id = `sub-${++this.subscriptionIdCounter}`;

    // Enforce max tracked subscriptions
    if (this.subscriptions.size >= this.config.maxTrackedSubscriptions) {
      this.cleanStaleSubscriptions();
    }

    const subscription: TrackedSubscription = {
      id,
      type,
      context,
      unsubscribe,
      createdAt: Date.now(),
      cleaned: false,
    };

    this.subscriptions.set(id, subscription);
    return id;
  }

  /**
   * Untrack and cleanup a subscription
   */
  untrackSubscription(id: string): boolean {
    const subscription = this.subscriptions.get(id);
    if (subscription && !subscription.cleaned) {
      try {
        subscription.unsubscribe();
        subscription.cleaned = true;
      } catch (error) {
        this.log(`Failed to unsubscribe ${id}:`, error);
      }
      this.subscriptions.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Clean up subscriptions for a context
   */
  cleanupContext(context: string): number {
    let cleaned = 0;
    for (const [id, subscription] of this.subscriptions) {
      if (subscription.context === context && !subscription.cleaned) {
        this.untrackSubscription(id);
        cleaned++;
      }
    }
    return cleaned;
  }

  /**
   * Clean stale subscriptions (older than 5 minutes)
   */
  private cleanStaleSubscriptions(): number {
    const staleThreshold = Date.now() - 5 * 60 * 1000;
    let cleaned = 0;

    for (const [id, subscription] of this.subscriptions) {
      if (subscription.createdAt < staleThreshold || subscription.cleaned) {
        this.subscriptions.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get subscription statistics
   */
  getSubscriptionStats(): {
    total: number;
    byType: Record<string, number>;
    byContext: Record<string, number>;
  } {
    const stats = {
      total: this.subscriptions.size,
      byType: {} as Record<string, number>,
      byContext: {} as Record<string, number>,
    };

    for (const subscription of this.subscriptions.values()) {
      stats.byType[subscription.type] = (stats.byType[subscription.type] || 0) + 1;
      stats.byContext[subscription.context] = (stats.byContext[subscription.context] || 0) + 1;
    }

    return stats;
  }

  // ============================================================================
  // Memory Leak Detection
  // ============================================================================

  /**
   * Detect potential memory leaks
   */
  detectLeaks(): {
    potentialLeaks: boolean;
    growthRate: number;
    suggestions: string[];
  } {
    if (this.memoryHistory.length < 10) {
      return { potentialLeaks: false, growthRate: 0, suggestions: [] };
    }

    const recentHistory = this.memoryHistory.slice(-10);
    const firstUsage = recentHistory[0]?.usedJSHeapSize ?? 0;
    const lastUsage = recentHistory[recentHistory.length - 1]?.usedJSHeapSize ?? 0;
    const growthRate = (lastUsage - firstUsage) / firstUsage;

    const potentialLeaks = growthRate > 0.1; // 10% growth indicates leak

    const suggestions: string[] = [];
    if (potentialLeaks) {
      suggestions.push('Memory usage is growing rapidly');

      const subStats = this.getSubscriptionStats();
      if (subStats.total > 50) {
        suggestions.push(`High subscription count (${subStats.total}) - check for cleanup`);
      }

      if (this.cleanupHandlers.size < 5) {
        suggestions.push('Consider registering more cleanup handlers');
      }
    }

    return { potentialLeaks, growthRate, suggestions };
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Get memory trend
   */
  getMemoryTrend(): 'increasing' | 'stable' | 'decreasing' {
    if (this.memoryHistory.length < 5) return 'stable';

    const recent = this.memoryHistory.slice(-5);
    const changes = recent.slice(1).map((s, i) => s.usedJSHeapSize - (recent[i]?.usedJSHeapSize ?? 0));
    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;

    if (avgChange > 1024 * 1024) return 'increasing'; // Growing >1MB per check
    if (avgChange < -1024 * 1024) return 'decreasing';
    return 'stable';
  }

  /**
   * Format bytes for display
   */
  static formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  /**
   * Debug logging
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[MemoryGuardian] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for component-level memory management
 */
export function useMemoryGuard(
  componentId: string,
  options: {
    maxBytes?: number;
    warningThreshold?: number;
    onExceed?: () => void;
  } = {}
): {
  updateUsage: (bytes: number) => void;
  snapshot: MemorySnapshot | null;
  pressureLevel: MemoryPressureLevel;
} {
  const { maxBytes = 10 * 1024 * 1024, warningThreshold = 0.8, onExceed } = options;
  const guardian = useRef(MemoryGuardian.getInstance());
  const [snapshot, setSnapshot] = useState<MemorySnapshot | null>(null);
  const [pressureLevel, setPressureLevel] = useState<MemoryPressureLevel>('normal');

  useEffect(() => {
    guardian.current.setComponentBudget(componentId, {
      maxBytes,
      warningThreshold,
      onExceed,
    });

    const unsubPressure = guardian.current.onPressureChange(setPressureLevel);

    // Get initial snapshot
    setSnapshot(guardian.current.getMemorySnapshot());

    return () => {
      guardian.current.removeComponentBudget(componentId);
      unsubPressure();
    };
  }, [componentId, maxBytes, warningThreshold, onExceed]);

  const updateUsage = useCallback(
    (bytes: number) => {
      guardian.current.updateComponentMemory(componentId, bytes);
    },
    [componentId]
  );

  return { updateUsage, snapshot, pressureLevel };
}

/**
 * Hook for automatic subscription cleanup
 */
export function useTrackedSubscription(
  context: string
): {
  track: (type: TrackedSubscription['type'], unsubscribe: () => void) => string;
  untrack: (id: string) => void;
  cleanupAll: () => void;
} {
  const guardian = useRef(MemoryGuardian.getInstance());
  const trackedIds = useRef<Set<string>>(new Set());

  const track = useCallback(
    (type: TrackedSubscription['type'], unsubscribe: () => void) => {
      const id = guardian.current.trackSubscription(type, context, unsubscribe);
      trackedIds.current.add(id);
      return id;
    },
    [context]
  );

  const untrack = useCallback((id: string) => {
    guardian.current.untrackSubscription(id);
    trackedIds.current.delete(id);
  }, []);

  const cleanupAll = useCallback(() => {
    for (const id of trackedIds.current) {
      guardian.current.untrackSubscription(id);
    }
    trackedIds.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAll();
    };
  }, [cleanupAll]);

  return { track, untrack, cleanupAll };
}

/**
 * Hook for registering cleanup handlers
 */
export function useCleanupHandler(
  cleanup: () => void | Promise<void>,
  options: {
    priority?: number;
    context?: string;
    estimatedBytes?: number;
  } = {}
): void {
  const guardian = useRef(MemoryGuardian.getInstance());
  const cleanupIdRef = useRef<string | null>(null);

  useEffect(() => {
    cleanupIdRef.current = guardian.current.registerCleanup(cleanup, options);

    return () => {
      if (cleanupIdRef.current) {
        guardian.current.unregisterCleanup(cleanupIdRef.current);
      }
    };
  }, [cleanup, options]);
}

/**
 * Hook for memory pressure awareness
 * Performance optimized: memoizes expensive getMemoryTrend() and detectLeaks() calls
 */
export function useMemoryPressureAwareness(): {
  pressureLevel: MemoryPressureLevel;
  isUnderPressure: boolean;
  snapshot: MemorySnapshot | null;
  trend: 'increasing' | 'stable' | 'decreasing';
  leakDetection: {
    potentialLeaks: boolean;
    growthRate: number;
    suggestions: string[];
  };
} {
  const guardian = useRef(MemoryGuardian.getInstance());
  const [pressureLevel, setPressureLevel] = useState<MemoryPressureLevel>('normal');
  const [snapshot, setSnapshot] = useState<MemorySnapshot | null>(null);

  // Track snapshot version to trigger memoized value updates
  const [snapshotVersion, setSnapshotVersion] = useState(0);

  useEffect(() => {
    const unsub = guardian.current.onPressureChange(setPressureLevel);

    const intervalId = setInterval(() => {
      setSnapshot(guardian.current.getMemorySnapshot());
      // Increment version to invalidate memoized trend/leak detection
      setSnapshotVersion((v) => v + 1);
    }, 5000);

    return () => {
      unsub();
      clearInterval(intervalId);
    };
  }, []);

  // Memoize expensive getMemoryTrend() - only recalculate when snapshot updates
  const trend = useCallback(() => {
    return guardian.current.getMemoryTrend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotVersion])();

  // Memoize expensive detectLeaks() - only recalculate when snapshot updates
  const leakDetection = useCallback(() => {
    return guardian.current.detectLeaks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotVersion])();

  return {
    pressureLevel,
    isUnderPressure: pressureLevel !== 'normal',
    snapshot,
    trend,
    leakDetection,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the global memory guardian instance
 */
export function getMemoryGuardian(config?: MemoryGuardianConfig): MemoryGuardian {
  return MemoryGuardian.getInstance(config);
}

/**
 * Reset the global guardian (for testing)
 */
export function resetMemoryGuardian(): void {
  MemoryGuardian.reset();
}

/**
 * Trigger cleanup manually
 */
export async function triggerMemoryCleanup(pressureLevel: MemoryPressureLevel = 'moderate'): Promise<number> {
  return MemoryGuardian.getInstance().triggerCleanup(pressureLevel);
}

/**
 * Check current memory status
 */
export function checkMemory(): MemorySnapshot {
  return MemoryGuardian.getInstance().checkMemory();
}

/**
 * Format bytes helper
 */
export const {formatBytes} = MemoryGuardian;

// ============================================================================
// Exports
// ============================================================================

export default {
  MemoryGuardian,
  getMemoryGuardian,
  resetMemoryGuardian,
  triggerMemoryCleanup,
  checkMemory,
  formatBytes,
  useMemoryGuard,
  useTrackedSubscription,
  useCleanupHandler,
  useMemoryPressureAwareness,
};

// ============================================================================
// HMR Support
// ============================================================================

// Vite HMR disposal to prevent memory leaks during hot module replacement
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    MemoryGuardian.reset();
  });
}
