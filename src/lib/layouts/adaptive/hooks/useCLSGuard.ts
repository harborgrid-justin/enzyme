/**
 * @fileoverview useCLSGuard Hook
 *
 * Hook for preventing and monitoring Cumulative Layout Shift (CLS).
 * Provides layout reservations and real-time CLS measurement.
 *
 * @module layouts/adaptive/hooks/useCLSGuard
 * @version 1.0.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CLSGuardConfig,
  CLSMeasurement,
  Dimensions,
  LayoutReservation,
  ReservationStrategy,
  UseCLSGuardReturn,
} from '../types';
import { DEFAULT_CLS_GUARD_CONFIG } from '../types';
import { createCLSGuard, type CLSGuard } from '../cls-guard';

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Options for useCLSGuard hook.
 */
export interface UseCLSGuardOptions {
  /** CLS guard configuration */
  config?: Partial<CLSGuardConfig>;
  /** Callback when CLS threshold is exceeded */
  onThresholdExceeded?: (score: number) => void;
  /** Callback when CLS is measured */
  onMeasurement?: (measurement: CLSMeasurement) => void;
}

/**
 * Hook for preventing and monitoring Cumulative Layout Shift.
 *
 * @param options - Hook configuration options
 * @returns CLS guard controls and metrics
 *
 * @example
 * ```tsx
 * function ImageGallery({ images }: { images: Image[] }) {
 *   const {
 *     clsScore,
 *     thresholdExceeded,
 *     reserve,
 *     release,
 *     reservations
 *   } = useCLSGuard({
 *     config: { maxCLS: 0.05 },
 *     onThresholdExceeded: (score) => {
 *       console.warn('CLS threshold exceeded:', score);
 *     }
 *   });
 *
 *   // Reserve space for images before they load
 *   useEffect(() => {
 *     for (const image of images) {
 *       reserve(image.id, { width: image.width, height: image.height });
 *     }
 *
 *     return () => {
 *       for (const image of images) {
 *         release(image.id);
 *       }
 *     };
 *   }, [images, reserve, release]);
 *
 *   return (
 *     <div>
 *       {thresholdExceeded && (
 *         <Warning>Layout shift detected! Score: {clsScore.toFixed(3)}</Warning>
 *       )}
 *       {images.map(image => (
 *         <img
 *           key={image.id}
 *           src={image.src}
 *           width={image.width}
 *           height={image.height}
 *           onLoad={() => release(image.id)}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCLSGuard(options: UseCLSGuardOptions = {}): UseCLSGuardReturn {
  const { config = {}, onThresholdExceeded, onMeasurement } = options;

  // Refs
  const guardRef = useRef<CLSGuard | null>(null);

  // State
  const [clsScore, setClsScore] = useState(0);
  const [thresholdExceeded, setThresholdExceeded] = useState(false);
  const [reservations, setReservations] = useState<ReadonlyMap<string, LayoutReservation>>(
    new Map()
  );
  const [measurements, setMeasurements] = useState<readonly CLSMeasurement[]>([]);

  // Merge config
  const mergedConfig = useMemo<CLSGuardConfig>(
    () => ({
      ...DEFAULT_CLS_GUARD_CONFIG,
      ...config,
      onThresholdExceeded: (score) => {
        setThresholdExceeded(true);
        onThresholdExceeded?.(score);
        config.onThresholdExceeded?.(score);
      },
    }),
    [config, onThresholdExceeded]
  );

  // Initialize guard
  useEffect(() => {
    guardRef.current = createCLSGuard(mergedConfig) as CLSGuard;

    // Subscribe to CLS updates
    const unsubscribe = guardRef.current.observeCLS((measurement) => {
      setClsScore(measurement.score);
      setThresholdExceeded(measurement.thresholdExceeded);
      setMeasurements((prev) => [...prev, measurement]);
      onMeasurement?.(measurement);
    });

    return () => {
      unsubscribe();
      guardRef.current?.destroy();
      guardRef.current = null;
    };
  }, [mergedConfig, onMeasurement]);

  // Create reservation
  const reserve = useCallback(
    (id: string, dimensions: Dimensions, strategy?: ReservationStrategy): LayoutReservation => {
      const guard = guardRef.current;
      if (!guard) {
        // Return a stub reservation
        return {
          id,
          dimensions,
          active: false,
          createdAt: Date.now(),
        };
      }

      const reservation = guard.createReservation(id, dimensions, strategy);

      setReservations((prev) => {
        const next = new Map(prev);
        next.set(id, reservation);
        return next;
      });

      return reservation;
    },
    []
  );

  // Release reservation
  const release = useCallback((id: string) => {
    const guard = guardRef.current;
    if (guard) {
      guard.releaseReservation(id);
    }

    setReservations((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return {
    clsScore,
    thresholdExceeded,
    reserve,
    release,
    reservations,
    measurements,
  };
}

// =============================================================================
// HELPER HOOKS
// =============================================================================

/**
 * Hook for reserving layout space for an image.
 *
 * @param id - Unique identifier for the image
 * @param src - Image source URL
 * @param dimensions - Known dimensions (if available)
 * @returns Loading state and reservation info
 *
 * @example
 * ```tsx
 * function ReservedImage({ id, src, width, height }: ImageProps) {
 *   const { isLoading, reservation } = useImageReservation(id, src, { width, height });
 *
 *   return (
 *     <div style={{ width, height }}>
 *       {isLoading && <Skeleton />}
 *       <img
 *         src={src}
 *         width={width}
 *         height={height}
 *         style={{ opacity: isLoading ? 0 : 1 }}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function useImageReservation(
  id: string,
  src: string,
  dimensions?: Dimensions
): {
  isLoading: boolean;
  reservation: LayoutReservation | null;
  intrinsicDimensions: Dimensions | null;
} {
  const [isLoading, setIsLoading] = useState(true);
  const [reservation, setReservation] = useState<LayoutReservation | null>(null);
  const [intrinsicDimensions, setIntrinsicDimensions] = useState<Dimensions | null>(null);

  const { reserve, release } = useCLSGuard();

  useEffect(() => {
    // Use requestAnimationFrame to defer state update
    const frameId = requestAnimationFrame(() => {
      setIsLoading(true);
    });

    // If dimensions are provided, create reservation immediately
    if (dimensions != null) {
      const res = reserve(id, dimensions);
      requestAnimationFrame(() => {
        setReservation(res);
      });
    }

    // Return cleanup for the frame
    const cleanupFrame = (): void => {
      cancelAnimationFrame(frameId);
    };

    // Load image to get intrinsic dimensions
    const img = new Image();

    img.onload = () => {
      const intrinsic = { width: img.naturalWidth, height: img.naturalHeight };
      setIntrinsicDimensions(intrinsic);

      // Update reservation if we didn't have dimensions
      if (dimensions == null) {
        const res = reserve(id, intrinsic);
        setReservation(res);
      }

      setIsLoading(false);
    };

    img.onerror = () => {
      setIsLoading(false);
    };

    img.src = src;

    return () => {
      cleanupFrame();
      release(id);
    };
  }, [id, src, dimensions, reserve, release]);

  return {
    isLoading,
    reservation,
    intrinsicDimensions,
  };
}

/**
 * Hook for monitoring CLS and triggering optimization actions.
 *
 * @param threshold - CLS threshold to monitor
 * @param onExceeded - Callback when threshold is exceeded
 *
 * @example
 * ```tsx
 * function PerformanceMonitor() {
 *   useCLSMonitor(0.1, () => {
 *     // Disable animations to prevent further shifts
 *     document.body.classList.add('reduce-motion');
 *   });
 *
 *   return null;
 * }
 * ```
 */
export function useCLSMonitor(threshold: number, onExceeded: (score: number) => void): void {
  const { clsScore, thresholdExceeded } = useCLSGuard({
    config: { maxCLS: threshold },
  });

  const hasNotifiedRef = useRef(false);

  useEffect(() => {
    if (thresholdExceeded && !hasNotifiedRef.current) {
      hasNotifiedRef.current = true;
      onExceeded(clsScore);
    }
  }, [thresholdExceeded, clsScore, onExceeded]);
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { UseCLSGuardReturn };
