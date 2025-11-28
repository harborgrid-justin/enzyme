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
} from './useAdaptiveLayout.ts';

export {
  useLayoutMode,
  useIsLayoutMode,
  useLayoutModeValue,
  type UseLayoutModeOptions,
} from './useLayoutMode.ts';

export {
  useLayoutMorph,
  useMorphElement,
  type UseLayoutMorphOptions,
} from './useLayoutMorph.ts';

export {
  useContentDensity,
  useDensityThreshold,
  type UseContentDensityOptions,
} from './useContentDensity.ts';

export {
  useCLSGuard,
  useImageReservation,
  useCLSMonitor,
  type UseCLSGuardOptions,
} from './useCLSGuard.ts';

// =============================================================================
// TYPE RE-EXPORTS
// =============================================================================

export type {
  UseAdaptiveLayoutReturn,
  UseLayoutModeReturn,
  UseLayoutMorphReturn,
  UseContentDensityReturn,
  UseCLSGuardReturn,
} from '../types.ts';
