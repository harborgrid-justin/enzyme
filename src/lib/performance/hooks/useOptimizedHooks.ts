/**
 * @file Optimized Performance Hooks
 * @description PhD-level performance hooks for intelligent rendering, lazy feature
 * loading, and progressive content loading with network awareness.
 *
 * Hooks:
 * - useOptimizedRender - Intelligent component rendering with scheduling
 * - useLazyFeature - Lazy loading features with progressive enhancement
 * - useProgressiveLoad - Network-aware progressive loading
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  useTransition,
  useDeferredValue,
  type DependencyList,
} from 'react';

// ============================================================================
// Utility Hook for Dynamic Dependencies
// ============================================================================

/**
 * Custom hook to track dependency array changes with a stable version number.
 * This allows proper ESLint compliance when using dynamic dependency arrays.
 *
 * Uses shallow comparison for better performance (avoids JSON.stringify overhead).
 * Only increments version when React's shallow comparison detects changes.
 *
 * @param deps - The dependency array to track
 * @returns A stable version number that increments when any dependency changes
 */
function useDepsVersion(deps: DependencyList): number {
  const versionRef = useRef(0);
  const prevDepsRef = useRef<DependencyList>(deps);

  // Use useMemo with deps to detect changes via React's shallow comparison
  // This is more efficient than JSON.stringify
  const version = useMemo(() => {
    // React's shallow comparison already ran to trigger this memo
    // We just need to check if this is a new computation
    const prevDeps = prevDepsRef.current;

    // Quick length check
    if (prevDeps.length !== deps.length) {
      versionRef.current++;
      prevDepsRef.current = deps;
      return versionRef.current;
    }

    // Shallow compare each dependency using Object.is
    let hasChanged = false;
    for (let i = 0; i < deps.length; i++) {
      if (!Object.is(prevDeps[i], deps[i])) {
        hasChanged = true;
        break;
      }
    }

    if (hasChanged) {
      versionRef.current++;
      prevDepsRef.current = deps;
    }

    return versionRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return version;
}

// ============================================================================
// Types
// ============================================================================

/**
 * Render priority levels
 */
export type RenderPriority = 'critical' | 'high' | 'normal' | 'low' | 'idle';

/**
 * Lazy feature status
 */
export type LazyFeatureStatus = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Progressive load phase
 */
export type ProgressiveLoadPhase = 'skeleton' | 'low-quality' | 'medium-quality' | 'full';

/**
 * Network quality
 */
export type NetworkQuality = 'fast' | 'moderate' | 'slow' | 'offline';

/**
 * Options for useOptimizedRender
 */
export interface UseOptimizedRenderOptions<T> {
  /** Render priority */
  priority?: RenderPriority;
  /** Initial value */
  initialValue?: T;
  /** Defer initial render */
  defer?: boolean;
  /** Use React 18 transitions */
  useTransition?: boolean;
  /** Use deferred value */
  useDeferredValue?: boolean;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Skip render condition */
  skipWhen?: (value: T) => boolean;
}

/**
 * Return type for useOptimizedRender
 */
export interface UseOptimizedRenderReturn<T> {
  /** Current value */
  value: T;
  /** Is computation pending */
  isPending: boolean;
  /** Is initial render */
  isInitial: boolean;
  /** Force immediate computation */
  forceCompute: () => void;
}

/**
 * Options for useLazyFeature
 */
export interface UseLazyFeatureOptions<T> {
  /** Auto load on mount */
  autoLoad?: boolean;
  /** Preload on hover/focus */
  preloadOnInteraction?: boolean;
  /** Fallback value */
  fallback?: T;
  /** Retry on error */
  retryOnError?: boolean;
  /** Max retries */
  maxRetries?: number;
  /** Retry delay in ms */
  retryDelay?: number;
  /** Minimum loading time for UX */
  minLoadingTime?: number;
  /** Cache the loaded module */
  cache?: boolean;
}

/**
 * Return type for useLazyFeature
 */
export interface UseLazyFeatureReturn<T> {
  /** Loaded feature */
  feature: T | null;
  /** Loading status */
  status: LazyFeatureStatus;
  /** Load error */
  error: Error | null;
  /** Load the feature */
  load: () => Promise<T>;
  /** Preload handler for events */
  preloadHandlers: {
    onMouseEnter: () => void;
    onFocus: () => void;
  };
  /** Is loaded */
  isLoaded: boolean;
  /** Is loading */
  isLoading: boolean;
}

/**
 * Options for useProgressiveLoad
 */
export interface UseProgressiveLoadOptions {
  /** Enable network awareness */
  networkAware?: boolean;
  /** Phases to skip on slow networks */
  skipPhasesOnSlow?: ProgressiveLoadPhase[];
  /** Custom phase durations */
  phaseDurations?: Partial<Record<ProgressiveLoadPhase, number>>;
  /** Start with placeholder */
  startWithPlaceholder?: boolean;
  /** Minimum phase duration */
  minPhaseDuration?: number;
}

/**
 * Return type for useProgressiveLoad
 */
export interface UseProgressiveLoadReturn<T> {
  /** Current phase */
  phase: ProgressiveLoadPhase;
  /** Current data for phase */
  data: T | null;
  /** Network quality */
  networkQuality: NetworkQuality;
  /** Is loading */
  isLoading: boolean;
  /** Is complete */
  isComplete: boolean;
  /** Progress percentage */
  progress: number;
  /** Advance to next phase */
  advancePhase: () => void;
  /** Set data for current phase */
  setPhaseData: (data: T) => void;
  /** Reset to initial state */
  reset: () => void;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get network quality
 */
function getNetworkQuality(): NetworkQuality {
  if (typeof navigator === 'undefined') return 'fast';

  if (!navigator.onLine) return 'offline';

  const {connection} = (navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      saveData?: boolean;
    };
  });

  if (connection === null || connection === undefined) return 'fast';
  if (connection.saveData === true) return 'slow';

  const {effectiveType} = connection;
  if (effectiveType === '4g') return 'fast';
  if (effectiveType === '3g') return 'moderate';
  return 'slow';
}

/**
 * Schedule based on priority
 */
function scheduleByPriority(callback: () => void, priority: RenderPriority): () => void {
  let cancelled = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let idleId: number | undefined;

  const run = (): void => {
    if (!cancelled) callback();
  };

  switch (priority) {
    case 'critical':
      // Run synchronously
      callback();
      break;
    case 'high':
      // Run on next microtask
      void Promise.resolve().then(run);
      break;
    case 'normal':
      // Run on next frame
      requestAnimationFrame(run);
      break;
    case 'low':
      // Run after small delay
      timeoutId = setTimeout(run, 50);
      break;
    case 'idle':
      // Run when idle
      if (typeof requestIdleCallback !== 'undefined') {
        idleId = requestIdleCallback(run);
      } else {
        timeoutId = setTimeout(run, 100);
      }
      break;
  }

  return () => {
    cancelled = true;
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    if (idleId !== undefined && typeof cancelIdleCallback !== 'undefined') {
      cancelIdleCallback(idleId);
    }
  };
}

// ============================================================================
// useOptimizedRender Hook
// ============================================================================

/**
 * Hook for optimized rendering with scheduling and React 18 features
 */
export function useOptimizedRender<T>(
  computeFn: () => T,
  deps: DependencyList,
  options: UseOptimizedRenderOptions<T> = {}
): UseOptimizedRenderReturn<T> {
  const {
    priority = 'normal',
    initialValue,
    defer = false,
    useTransition: useTransitionOpt = false,
    useDeferredValue: useDeferredOpt = false,
    debounceMs,
    skipWhen,
  } = options;

  const [value, setValue] = useState<T>(() => {
    if (defer && initialValue !== undefined) {
      return initialValue;
    }
    return computeFn();
  });

  const [isInitial, setIsInitial] = useState(defer);
  const [isPending, startTransition] = useTransition();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancelScheduleRef = useRef<(() => void) | null>(null);

  // Track dependency changes with stable version number
  const depsVersion = useDepsVersion(deps);

  // Use deferred value if requested
  const deferredValue = useDeferredValue(value);
  const outputValue = useDeferredOpt ? deferredValue : value;

  // Force compute function
  const forceCompute = useCallback(() => {
    const newValue = computeFn();

    if (skipWhen?.(newValue) === true) {
      return;
    }

    if (useTransitionOpt) {
      startTransition(() => {
        setValue(newValue);
      });
    } else {
      setValue(newValue);
    }

    setIsInitial(false);
  }, [computeFn, skipWhen, useTransitionOpt, startTransition]);

  // Effect to compute on dependency change
  useEffect(() => {
    // Clear previous schedule
    cancelScheduleRef.current?.();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const compute = (): void => {
      cancelScheduleRef.current = scheduleByPriority(forceCompute, priority);
    };

    if (debounceMs !== undefined && debounceMs !== null && debounceMs > 0) {
      debounceTimerRef.current = setTimeout(compute, debounceMs);
    } else {
      compute();
    }

    return () => {
      cancelScheduleRef.current?.();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [depsVersion, forceCompute, priority, debounceMs]);

  return {
    value: outputValue,
    isPending,
    isInitial,
    forceCompute,
  };
}

// ============================================================================
// useLazyFeature Hook
// ============================================================================

// Module cache for lazy features with size limit
const MAX_CACHE_SIZE = 50;
const featureCache = new Map<string, unknown>();

/**
 * Evict oldest cache entries when size limit is exceeded
 */
function evictOldestCacheEntries(): void {
  if (featureCache.size <= MAX_CACHE_SIZE) return;

  // Get iterator and delete oldest entries (Maps maintain insertion order)
  const iterator = featureCache.keys();
  const entriesToRemove = featureCache.size - MAX_CACHE_SIZE;

  for (let i = 0; i < entriesToRemove; i++) {
    const oldestKey = iterator.next().value;
    if (oldestKey !== undefined) {
      featureCache.delete(oldestKey);
    }
  }
}

/**
 * Hook for lazy loading features with progressive enhancement
 */
export function useLazyFeature<T>(
  featureId: string,
  loader: () => Promise<T>,
  options: UseLazyFeatureOptions<T> = {}
): UseLazyFeatureReturn<T> {
  const {
    autoLoad = true,
    preloadOnInteraction = true,
    fallback,
    retryOnError = true,
    maxRetries = 3,
    retryDelay = 1000,
    minLoadingTime = 100,
    cache = true,
  } = options;

  const [feature, setFeature] = useState<T | null>(() => {
    if (cache && featureCache.has(featureId)) {
      return featureCache.get(featureId) as T;
    }
    return fallback ?? null;
  });

  const [status, setStatus] = useState<LazyFeatureStatus>(() => {
    if (cache && featureCache.has(featureId)) {
      return 'loaded';
    }
    return 'idle';
  });

  const [error, setError] = useState<Error | null>(null);
  const retryCountRef = useRef(0);
  const loadPromiseRef = useRef<Promise<T> | null>(null);

  // Load the feature
  const load = useCallback(async (): Promise<T> => {
    // Return cached
    if (cache && featureCache.has(featureId)) {
      const cached = featureCache.get(featureId) as T;
      setFeature(cached);
      setStatus('loaded');
      return cached;
    }

    // Return existing load promise if loading
    if (loadPromiseRef.current) {
      return loadPromiseRef.current;
    }

    setStatus('loading');
    setError(null);
    const startTime = Date.now();

    loadPromiseRef.current = (async () => {
      try {
        const result = await loader();

        // Ensure minimum loading time
        const elapsed = Date.now() - startTime;
        if (elapsed < minLoadingTime) {
          await new Promise((r) => setTimeout(r, minLoadingTime - elapsed));
        }

        // Cache result
        if (cache) {
          featureCache.set(featureId, result);
          evictOldestCacheEntries();
        }

        setFeature(result);
        setStatus('loaded');
        retryCountRef.current = 0;
        return result;
      } catch (err) {
        const loadError = err instanceof Error ? err : new Error(String(err));

        // Retry logic
        if (retryOnError && retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          await new Promise((r) => setTimeout(r, retryDelay * retryCountRef.current));
          loadPromiseRef.current = null;
          return load();
        }

        setError(loadError);
        setStatus('error');
        throw loadError;
      } finally {
        loadPromiseRef.current = null;
      }
    })();

    return loadPromiseRef.current;
  }, [featureId, loader, cache, minLoadingTime, retryOnError, maxRetries, retryDelay]);

  // Auto load on mount
  useEffect(() => {
    if (autoLoad && status === 'idle') {
      load().catch(() => {
        // Error handled in state
      });
    }
  }, [autoLoad, load, status]);

  // Preload handlers
  const preloadHandlers = useMemo(() => {
    if (!preloadOnInteraction) {
      return {
        onMouseEnter: () => {},
        onFocus: () => {},
      };
    }

    const preload = (): void => {
      if (status === 'idle') {
        load().catch(() => {
          // Silently fail preload
        });
      }
    };

    return {
      onMouseEnter: preload,
      onFocus: preload,
    };
  }, [preloadOnInteraction, status, load]);

  return {
    feature,
    status,
    error,
    load,
    preloadHandlers,
    isLoaded: status === 'loaded',
    isLoading: status === 'loading',
  };
}

// ============================================================================
// useProgressiveLoad Hook
// ============================================================================

const PHASE_ORDER: ProgressiveLoadPhase[] = ['skeleton', 'low-quality', 'medium-quality', 'full'];
const DEFAULT_PHASE_DURATIONS: Record<ProgressiveLoadPhase, number> = {
  'skeleton': 0,
  'low-quality': 200,
  'medium-quality': 500,
  'full': 1000,
};

/**
 * Hook for network-aware progressive content loading
 */
export function useProgressiveLoad<T>(
  options: UseProgressiveLoadOptions = {}
): UseProgressiveLoadReturn<T> {
  const {
    networkAware = true,
    skipPhasesOnSlow = ['medium-quality'],
    phaseDurations = {},
    startWithPlaceholder = true,
    minPhaseDuration = 100,
  } = options;

  const [phase, setPhase] = useState<ProgressiveLoadPhase>(
    startWithPlaceholder ? 'skeleton' : 'full'
  );
  const [data, setData] = useState<T | null>(null);
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>(getNetworkQuality);
  // eslint-disable-next-line react-hooks/purity
  const phaseStartTimeRef = useRef(Date.now());

  // Monitor network quality
  useEffect(() => {
    if (!networkAware) return;

    const updateNetwork = (): void => setNetworkQuality(getNetworkQuality());

    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);

    const {connection} = (navigator as Navigator & {
      connection?: EventTarget & { addEventListener: (type: string, handler: () => void) => void };
    });
    connection?.addEventListener('change', updateNetwork);

    return () => {
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
    };
  }, [networkAware]);

  // Calculate effective phases
  const effectivePhases = useMemo(() => {
    if (!networkAware || networkQuality === 'fast') {
      return PHASE_ORDER;
    }

    if (networkQuality === 'slow' || networkQuality === 'offline') {
      return PHASE_ORDER.filter((p) => !skipPhasesOnSlow.includes(p));
    }

    return PHASE_ORDER;
  }, [networkAware, networkQuality, skipPhasesOnSlow]);

  // Get current phase index
  const currentPhaseIndex = effectivePhases.indexOf(phase);
  const progress = ((currentPhaseIndex + 1) / effectivePhases.length) * 100;
  const isComplete = phase === 'full';
  const isLoading = phase !== 'full';

  // Advance to next phase
  const advancePhase = useCallback(() => {
    const currentIndex = effectivePhases.indexOf(phase);
    const nextPhase = effectivePhases[currentIndex + 1];

    if (nextPhase) {
      // Ensure minimum phase duration
      const elapsed = Date.now() - phaseStartTimeRef.current;
      const duration = phaseDurations[phase] ?? DEFAULT_PHASE_DURATIONS[phase];
      const effectiveDuration = Math.max(duration, minPhaseDuration);

      if (elapsed < effectiveDuration) {
        setTimeout(() => {
          phaseStartTimeRef.current = Date.now();
          setPhase(nextPhase);
        }, effectiveDuration - elapsed);
      } else {
        phaseStartTimeRef.current = Date.now();
        setPhase(nextPhase);
      }
    }
  }, [effectivePhases, phase, phaseDurations, minPhaseDuration]);

  // Set data for current phase
  const setPhaseData = useCallback((newData: T) => {
    setData(newData);
    advancePhase();
  }, [advancePhase]);

  // Reset to initial state
  const reset = useCallback(() => {
    setPhase(startWithPlaceholder ? 'skeleton' : 'full');
    setData(null);
    phaseStartTimeRef.current = Date.now();
  }, [startWithPlaceholder]);

  return {
    phase,
    data,
    networkQuality,
    isLoading,
    isComplete,
    progress,
    advancePhase,
    setPhaseData,
    reset,
  };
}

// ============================================================================
// Utility Export Functions
// ============================================================================

/**
 * Clear feature cache
 */
export function clearFeatureCache(featureId?: string): void {
  if (featureId !== undefined && featureId !== null && featureId !== '') {
    featureCache.delete(featureId);
  } else {
    featureCache.clear();
  }
}

/**
 * Preload a feature
 */
export async function preloadFeature<T>(featureId: string, loader: () => Promise<T>): Promise<T> {
  if (featureCache.has(featureId)) {
    return featureCache.get(featureId) as T;
  }

  const result = await loader();
  featureCache.set(featureId, result);
  evictOldestCacheEntries();
  return result;
}

// ============================================================================
// Exports
// ============================================================================

export default {
  useOptimizedRender,
  useLazyFeature,
  useProgressiveLoad,
  clearFeatureCache,
  preloadFeature,
};
