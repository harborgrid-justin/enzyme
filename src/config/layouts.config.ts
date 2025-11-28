/**
 * @file Layouts Configuration
 * @description Configuration for Adaptive & Morphing Layouts and Context-Aware Layouts.
 *
 * This module configures layout behavior including:
 * - Adaptive layout engine
 * - Morphing transitions
 * - CLS prevention
 * - DOM context awareness
 *
 * @module config/layouts.config
 *
 * @see {@link ../lib/layouts} for layout implementation
 */

import type { LayoutsConfig, LayoutMode } from './config-validation';
import { layoutsConfigSchema, LAYOUTS_CONFIG_SCHEMA } from './config-validation';
import type { morphTransitionSchema } from './config-validation';
import { CONFIG_NAMESPACES } from './types';
import { autoRegister, createEnvConfig } from './config-discovery';
import { getConfigRegistry, createTypedNamespace } from './config-registry';
import { type z } from 'zod';

// =============================================================================
// Layout Configuration
// =============================================================================

/**
 * Default layouts configuration
 */
const defaultLayoutsConfig: LayoutsConfig = layoutsConfigSchema.parse({});

/**
 * Environment-specific layouts configuration
 */
export const layoutsConfig = createEnvConfig<LayoutsConfig>({
  base: defaultLayoutsConfig,

  development: {
    adaptive: {
      enabled: true,
      useResizeObserver: true,
      resizeDebounce: 150,
      breakpoints: { xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 },
    },
    morphing: {
      enabled: true,
      animate: true,
      useFLIP: true,
      transition: {
        duration: 400,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        useGPU: true,
        respectReducedMotion: true,
      },
    },
    clsGuard: {
      enabled: true,
      reserveSpace: true,
      defaultAspectRatio: 1.5,
      useSkeleton: true,
    },
    context: {
      enabled: true,
      trackAncestry: true,
      bridgePortals: true,
      maxDepth: 15,
    },
  },

  production: {
    adaptive: {
      enabled: true,
      useResizeObserver: true,
      resizeDebounce: 100,
      breakpoints: { xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 },
    },
    morphing: {
      enabled: true,
      animate: true,
      transition: {
        duration: 300,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        useGPU: true,
        respectReducedMotion: true,
      },
      useFLIP: true,
    },
    clsGuard: {
      enabled: true,
      reserveSpace: true,
      defaultAspectRatio: 1.5,
      useSkeleton: true,
    },
    context: {
      enabled: true,
      trackAncestry: true,
      bridgePortals: true,
      maxDepth: 10,
    },
  },
});

// =============================================================================
// Auto-Registration
// =============================================================================

/**
 * Register layouts configuration for auto-discovery
 */
autoRegister(CONFIG_NAMESPACES.LAYOUTS, layoutsConfig, {
  priority: 20,
});

// =============================================================================
// Type-Safe Accessor
// =============================================================================

/**
 * Type-safe accessor for layouts configuration
 */
export const layouts = createTypedNamespace<LayoutsConfig>(CONFIG_NAMESPACES.LAYOUTS);

// =============================================================================
// Breakpoint Configuration
// =============================================================================

/**
 * Default breakpoints (matches Tailwind CSS defaults)
 */
export const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Get current breakpoint based on window width
 */
export function getCurrentBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'md';

  const width = window.innerWidth;
  const breakpoints = layouts.get('adaptive')?.breakpoints ?? BREAKPOINTS;

  if (width >= breakpoints['2xl']) return '2xl';
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  if (width >= breakpoints.sm) return 'sm';
  return 'xs';
}

/**
 * Check if current viewport matches breakpoint
 */
export function matchesBreakpoint(breakpoint: Breakpoint, mode: 'min' | 'max' = 'min'): boolean {
  if (typeof window === 'undefined') return breakpoint === 'md';

  const width = window.innerWidth;
  const breakpoints = layouts.get('adaptive')?.breakpoints ?? BREAKPOINTS;
  const breakpointWidth = breakpoints[breakpoint];

  return mode === 'min' ? width >= breakpointWidth : width < breakpointWidth;
}

// =============================================================================
// Morph Transition Presets
// =============================================================================

/**
 * Morph transition presets for common scenarios
 */
export const MORPH_PRESETS = {
  /** Quick micro-interaction */
  FAST: {
    duration: 150,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    useGPU: true,
    respectReducedMotion: true,
  },

  /** Standard transition */
  NORMAL: {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    useGPU: true,
    respectReducedMotion: true,
  },

  /** Slow, emphasized transition */
  SLOW: {
    duration: 500,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    useGPU: true,
    respectReducedMotion: true,
  },

  /** Bouncy spring-like transition */
  SPRING: {
    duration: 400,
    easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    useGPU: true,
    respectReducedMotion: true,
  },

  /** Sharp, snappy transition */
  SHARP: {
    duration: 200,
    easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
    useGPU: true,
    respectReducedMotion: true,
  },

  /** Smooth enter transition */
  ENTER: {
    duration: 300,
    easing: 'cubic-bezier(0, 0, 0.2, 1)',
    useGPU: true,
    respectReducedMotion: true,
  },

  /** Smooth exit transition */
  EXIT: {
    duration: 200,
    easing: 'cubic-bezier(0.4, 0, 1, 1)',
    useGPU: true,
    respectReducedMotion: true,
  },
} as const;

export type MorphPreset = keyof typeof MORPH_PRESETS;

type MorphTransition = z.infer<typeof morphTransitionSchema>;

/**
 * Get morph transition configuration by preset
 */
export function getMorphPreset(preset: MorphPreset): MorphTransition {
  return MORPH_PRESETS[preset];
}

// =============================================================================
// Layout Mode Utilities
// =============================================================================

/**
 * Layout mode configurations
 */
export const LAYOUT_MODES: Record<LayoutMode, { description: string; className: string }> = {
  grid: { description: 'CSS Grid layout', className: 'layout-grid' },
  flex: { description: 'CSS Flexbox layout', className: 'layout-flex' },
  block: { description: 'Block layout', className: 'layout-block' },
  inline: { description: 'Inline layout', className: 'layout-inline' },
  masonry: { description: 'Masonry grid layout', className: 'layout-masonry' },
  auto: { description: 'Auto-detect layout', className: 'layout-auto' },
};

// =============================================================================
// Configuration Utilities
// =============================================================================

/**
 * Check if adaptive layouts are enabled
 */
export function isAdaptiveEnabled(): boolean {
  return layouts.get('adaptive')?.enabled ?? true;
}

/**
 * Check if morphing is enabled
 */
export function isMorphingEnabled(): boolean {
  return layouts.get('morphing')?.enabled ?? true;
}

/**
 * Check if CLS guard is enabled
 */
export function isCLSGuardEnabled(): boolean {
  return layouts.get('clsGuard')?.enabled ?? true;
}

/**
 * Check if context awareness is enabled
 */
export function isContextEnabled(): boolean {
  return layouts.get('context')?.enabled ?? true;
}

/**
 * Get the resize debounce time
 */
export function getResizeDebounce(): number {
  return layouts.get('adaptive')?.resizeDebounce ?? 100;
}

/**
 * Get the default aspect ratio for CLS prevention
 */
export function getDefaultAspectRatio(): number {
  return layouts.get('clsGuard')?.defaultAspectRatio ?? 1.5;
}

/**
 * Get morph transition configuration
 */
export function getMorphTransition(): MorphTransition {
  return layouts.get('morphing')?.transition ?? layoutsConfig.morphing.transition;
}

/**
 * Check if reduced motion should be respected
 */
export function shouldRespectReducedMotion(): boolean {
  const config = layouts.get('morphing')?.transition;
  return config?.respectReducedMotion ?? true;
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get effective animation duration considering reduced motion preference
 */
export function getEffectiveAnimationDuration(duration?: number): number {
  const baseDuration = duration ?? getMorphTransition().duration;

  if (shouldRespectReducedMotion() && prefersReducedMotion()) {
    return 0;
  }

  return baseDuration;
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize layouts configuration in the registry
 */
export function initializeLayoutsConfig(): void {
  const registry = getConfigRegistry();

  // Register all layouts config values
  Object.entries(layoutsConfig).forEach(([key, value]) => {
    registry.set(CONFIG_NAMESPACES.LAYOUTS, key, value as import('./types').ConfigValue, {
      source: 'default',
      schema: LAYOUTS_CONFIG_SCHEMA,
    });
  });
}

// =============================================================================
// Exports
// =============================================================================

export { layoutsConfigSchema, LAYOUTS_CONFIG_SCHEMA };
export type { LayoutsConfig, LayoutMode };
