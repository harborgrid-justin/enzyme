/**
 * @fileoverview Adaptive Layout Hooks
 *
 * This module exports all hooks for the adaptive layout system.
 *
 * @module layouts/adaptive/hooks
 * @version 1.0.0
 */

// =============================================================================
// HOOK EXPORTS
// =============================================================================

export {
  useAdaptiveLayout,
  type UseAdaptiveLayoutOptions,
} from './useAdaptiveLayout';

export {
  useLayoutMode,
  useIsLayoutMode,
  useLayoutModeValue,
  type UseLayoutModeOptions,
} from './useLayoutMode';

export {
  useLayoutMorph,
  useMorphElement,
  type UseLayoutMorphOptions,
} from './useLayoutMorph';

export {
  useContentDensity,
  useDensityThreshold,
  type UseContentDensityOptions,
} from './useContentDensity';

export {
  useCLSGuard,
  useImageReservation,
  useCLSMonitor,
  type UseCLSGuardOptions,
} from './useCLSGuard';

// =============================================================================
// TYPE RE-EXPORTS
// =============================================================================

export type {
  UseAdaptiveLayoutReturn,
  UseLayoutModeReturn,
  UseLayoutMorphReturn,
  UseContentDensityReturn,
  UseCLSGuardReturn,
} from '../types';
