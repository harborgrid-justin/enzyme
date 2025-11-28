/**
 * @fileoverview useContentDensity Hook
 *
 * Hook for analyzing and monitoring content density within a container.
 * Provides metrics about content distribution, size variance, and content type.
 *
 * @module layouts/adaptive/hooks/useContentDensity
 * @version 1.0.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ContentDensity, Dimensions, UseContentDensityReturn } from '../types.ts';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Density thresholds based on items per 10000 square pixels.
 */
const DENSITY_THRESHOLDS: Record<ContentDensity, number> = {
  minimal: 0.5,
  low: 1,
  medium: 2,
  high: 4,
  extreme: 8,
} as const;

/**
 * Minimum items for reliable analysis.
 */
const MIN_ITEMS_FOR_ANALYSIS = 2;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Classifies density ratio into a ContentDensity category.
 */
function classifyDensity(densityRatio: number): ContentDensity {
  if (densityRatio >= DENSITY_THRESHOLDS.extreme) return 'extreme';
  if (densityRatio >= DENSITY_THRESHOLDS.high) return 'high';
  if (densityRatio >= DENSITY_THRESHOLDS.medium) return 'medium';
  if (densityRatio >= DENSITY_THRESHOLDS.low) return 'low';
  return 'minimal';
}

/**
 * Calculates coefficient of variation.
 */
function calculateCV(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance) / mean;
}

/**
 * Checks if element contains primarily images.
 */
function hasImageContent(element: Element): boolean {
  return element.querySelector('img, picture, video, canvas, svg') !== null;
}

/**
 * Checks if element contains primarily text.
 */
function hasTextContent(element: Element): boolean {
  const textLength = element.textContent?.length ?? 0;
  return textLength > 100;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Options for useContentDensity hook.
 */
export interface UseContentDensityOptions {
  /** Ref to the container element */
  containerRef: React.RefObject<HTMLElement>;
  /** Whether to automatically recalculate on changes */
  autoRecalculate?: boolean;
  /** Debounce interval for recalculation in ms */
  debounceMs?: number;
  /** Selector for child items (defaults to direct children) */
  itemSelector?: string;
}

/**
 * Hook for analyzing content density within a container.
 *
 * @param options - Hook configuration options
 * @returns Content density metrics and controls
 *
 * @example
 * ```tsx
 * function DensityAwareLayout() {
 *   const containerRef = useRef<HTMLDivElement>(null);
 *   const {
 *     density,
 *     itemCount,
 *     averageItemSize,
 *     sizeVariance,
 *     isImageHeavy,
 *     isTextHeavy,
 *     recalculate
 *   } = useContentDensity({
 *     containerRef,
 *     autoRecalculate: true,
 *     debounceMs: 200
 *   });
 *
 *   const layoutMode = useMemo(() => {
 *     if (isImageHeavy && density === 'low') return 'grid';
 *     if (isTextHeavy) return 'list';
 *     if (density === 'high') return 'compact';
 *     return 'grid';
 *   }, [density, isImageHeavy, isTextHeavy]);
 *
 *   return (
 *     <div ref={containerRef} data-layout-mode={layoutMode}>
 *       {children}
 *     </div>
 *   );
 * }
 * ```
 */
export function useContentDensity(options: UseContentDensityOptions): UseContentDensityReturn {
  const {
    containerRef,
    autoRecalculate = true,
    debounceMs = 150,
    itemSelector,
  } = options;

  // State
  const [density, setDensity] = useState<ContentDensity>('minimal');
  const [itemCount, setItemCount] = useState(0);
  const [averageItemSize, setAverageItemSize] = useState<Dimensions | null>(null);
  const [sizeVariance, setSizeVariance] = useState(0);
  const [isImageHeavy, setIsImageHeavy] = useState(false);
  const [isTextHeavy, setIsTextHeavy] = useState(false);

  // Refs
  const observerRef = useRef<ResizeObserver | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Calculate density
  const recalculate = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Get items
    const items = itemSelector
      ? Array.from(container.querySelectorAll(itemSelector))
      : Array.from(container.children);

    const count = items.length;
    setItemCount(count);

    if (count < MIN_ITEMS_FOR_ANALYSIS) {
      setDensity('minimal');
      setAverageItemSize(null);
      setSizeVariance(0);
      setIsImageHeavy(false);
      setIsTextHeavy(false);
      return;
    }

    // Get container dimensions
    const containerRect = container.getBoundingClientRect();
    const containerArea = containerRect.width * containerRect.height;

    if (containerArea === 0) {
      setDensity('minimal');
      return;
    }

    // Calculate item dimensions
    const widths: number[] = [];
    const heights: number[] = [];
    const areas: number[] = [];
    let imageCount = 0;
    let textCount = 0;

    for (const item of items) {
      const rect = item.getBoundingClientRect();
      widths.push(rect.width);
      heights.push(rect.height);
      areas.push(rect.width * rect.height);

      if (hasImageContent(item)) imageCount++;
      if (hasTextContent(item)) textCount++;
    }

    // Calculate averages
    const avgWidth = widths.reduce((sum, w) => sum + w, 0) / count;
    const avgHeight = heights.reduce((sum, h) => sum + h, 0) / count;
    // const _totalArea = areas.reduce((sum, a) => sum + a, 0);

    setAverageItemSize({ width: avgWidth, height: avgHeight });

    // Calculate variance
    const widthCV = calculateCV(widths);
    const heightCV = calculateCV(heights);
    setSizeVariance((widthCV + heightCV) / 2);

    // Calculate density
    const densityRatio = (count / containerArea) * 10000;
    setDensity(classifyDensity(densityRatio));

    // Content type analysis
    setIsImageHeavy(imageCount / count > 0.5);
    setIsTextHeavy(textCount / count > 0.5);
  }, [containerRef, itemSelector]);

  // Debounced recalculation
  const debouncedRecalculate = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(recalculate, debounceMs);
  }, [recalculate, debounceMs]);

  // Set up observers
  useEffect(() => {
    if (!autoRecalculate) return;

    const container = containerRef.current;
    if (!container) return;

    // Observe size changes
    observerRef.current = new ResizeObserver(debouncedRecalculate);
    observerRef.current.observe(container);

    // Observe DOM changes (children added/removed)
    mutationObserverRef.current = new MutationObserver(debouncedRecalculate);
    mutationObserverRef.current.observe(container, {
      childList: true,
      subtree: Boolean(itemSelector),
    });

    // Initial calculation
    recalculate();

    return () => {
      observerRef.current?.disconnect();
      mutationObserverRef.current?.disconnect();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [autoRecalculate, containerRef, itemSelector, debouncedRecalculate, recalculate]);

  return {
    density,
    itemCount,
    averageItemSize,
    sizeVariance,
    isImageHeavy,
    isTextHeavy,
    recalculate,
  };
}

// =============================================================================
// HELPER HOOKS
// =============================================================================

/**
 * Hook that returns true when content density exceeds a threshold.
 *
 * @param currentDensity - Current content density
 * @param threshold - Minimum density threshold
 * @returns Whether density meets or exceeds threshold
 *
 * @example
 * ```tsx
 * function CompactModeToggle({ density }: { density: ContentDensity }) {
 *   const shouldUseCompactMode = useDensityThreshold(density, 'high');
 *
 *   return shouldUseCompactMode ? <CompactLayout /> : <NormalLayout />;
 * }
 * ```
 */
export function useDensityThreshold(
  currentDensity: ContentDensity,
  threshold: ContentDensity
): boolean {
  const densityOrder: ContentDensity[] = ['minimal', 'low', 'medium', 'high', 'extreme'];
  const currentIndex = densityOrder.indexOf(currentDensity);
  const thresholdIndex = densityOrder.indexOf(threshold);

  return currentIndex >= thresholdIndex;
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { UseContentDensityReturn };
