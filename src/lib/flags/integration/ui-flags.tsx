/**
 * @fileoverview UI feature flags for controlling component behavior.
 *
 * This module provides feature flag integration for the UI layer, enabling
 * dynamic control over components, themes, accessibility, and visual features.
 *
 * @module flags/integration/ui-flags
 *
 * @example
 * ```typescript
 * import {
 *   uiFlags,
 *   useUiFlagConfig,
 *   FlaggedUIComponent,
 * } from '@/lib/flags/integration/ui-flags';
 *
 * // Check UI feature flags
 * if (uiFlags.isDarkModeEnabled()) {
 *   // Apply dark mode styles
 * }
 *
 * // Use in component
 * function Dashboard() {
 *   const config = useUiFlagConfig();
 *   // config.darkModeEnabled, config.animationsEnabled, etc.
 * }
 * ```
 */

import React, { useMemo, type ComponentType, type ReactNode } from 'react';
import {
  createLibraryIntegration,
  useLibraryFlags,
  integrationRegistry,
  type LibraryIntegration,
} from './library-integration';

// =============================================================================
// Types
// =============================================================================

/**
 * UI flag keys
 */
export const UI_FLAG_KEYS = {
  /** Enable dark mode */
  UI_DARK_MODE_ENABLED: 'ui-dark-mode-enabled',
  /** Enable animations */
  UI_ANIMATIONS_ENABLED: 'ui-animations-enabled',
  /** Enable reduced motion */
  UI_REDUCED_MOTION_ENABLED: 'ui-reduced-motion-enabled',
  /** Enable high contrast mode */
  UI_HIGH_CONTRAST_ENABLED: 'ui-high-contrast-enabled',
  /** Enable compact mode */
  UI_COMPACT_MODE_ENABLED: 'ui-compact-mode-enabled',
  /** Enable skeleton loading */
  UI_SKELETON_LOADING_ENABLED: 'ui-skeleton-loading-enabled',
  /** Enable virtual scrolling */
  UI_VIRTUAL_SCROLL_ENABLED: 'ui-virtual-scroll-enabled',
  /** Enable tooltips */
  UI_TOOLTIPS_ENABLED: 'ui-tooltips-enabled',
  /** Enable notifications */
  UI_NOTIFICATIONS_ENABLED: 'ui-notifications-enabled',
  /** Enable modals */
  UI_MODALS_ENABLED: 'ui-modals-enabled',
  /** Enable sidebars */
  UI_SIDEBARS_ENABLED: 'ui-sidebars-enabled',
  /** Enable new design system */
  UI_DESIGN_SYSTEM_V2: 'ui-design-system-v2',
  /** Enable experimental components */
  UI_EXPERIMENTAL_ENABLED: 'ui-experimental-enabled',
  /** Enable keyboard shortcuts */
  UI_KEYBOARD_SHORTCUTS_ENABLED: 'ui-keyboard-shortcuts-enabled',
  /** Enable drag and drop */
  UI_DND_ENABLED: 'ui-dnd-enabled',
  /** Enable inline editing */
  UI_INLINE_EDIT_ENABLED: 'ui-inline-edit-enabled',
} as const;

export type UiFlagKey = (typeof UI_FLAG_KEYS)[keyof typeof UI_FLAG_KEYS];

/**
 * UI flag configuration
 */
export interface UiFlagConfig {
  /** Enable dark mode */
  readonly darkModeEnabled: boolean;
  /** Enable animations */
  readonly animationsEnabled: boolean;
  /** Enable reduced motion */
  readonly reducedMotionEnabled: boolean;
  /** Enable high contrast */
  readonly highContrastEnabled: boolean;
  /** Enable compact mode */
  readonly compactModeEnabled: boolean;
  /** Enable skeleton loading */
  readonly skeletonLoadingEnabled: boolean;
  /** Enable virtual scrolling */
  readonly virtualScrollEnabled: boolean;
  /** Enable tooltips */
  readonly tooltipsEnabled: boolean;
  /** Enable notifications */
  readonly notificationsEnabled: boolean;
  /** Enable modals */
  readonly modalsEnabled: boolean;
  /** Enable sidebars */
  readonly sidebarsEnabled: boolean;
  /** Use design system v2 */
  readonly designSystemV2: boolean;
  /** Enable experimental */
  readonly experimentalEnabled: boolean;
  /** Enable keyboard shortcuts */
  readonly keyboardShortcutsEnabled: boolean;
  /** Enable drag and drop */
  readonly dndEnabled: boolean;
  /** Enable inline editing */
  readonly inlineEditEnabled: boolean;
  /** Index signature for Record<string, unknown> compatibility */
  [key: string]: unknown;
}

/**
 * Component variant configuration
 */
export interface ComponentVariantConfig<P = unknown> {
  /** Component identifier */
  readonly componentId: string;
  /** Feature flag key */
  readonly flagKey: string;
  /** Variant A (flag disabled) */
  readonly variantA: ComponentType<P>;
  /** Variant B (flag enabled) */
  readonly variantB: ComponentType<P>;
  /** Track variant exposure */
  readonly trackExposure?: boolean;
}

/**
 * Style variant configuration
 */
export interface StyleVariantConfig {
  /** Style identifier */
  readonly styleId: string;
  /** Feature flag key */
  readonly flagKey: string;
  /** Styles when flag is disabled */
  readonly disabledStyles: Record<string, string | number>;
  /** Styles when flag is enabled */
  readonly enabledStyles: Record<string, string | number>;
}

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default UI flag configuration
 */
export const DEFAULT_UI_FLAG_CONFIG: UiFlagConfig = {
  darkModeEnabled: false,
  animationsEnabled: true,
  reducedMotionEnabled: false,
  highContrastEnabled: false,
  compactModeEnabled: false,
  skeletonLoadingEnabled: true,
  virtualScrollEnabled: false,
  tooltipsEnabled: true,
  notificationsEnabled: true,
  modalsEnabled: true,
  sidebarsEnabled: true,
  designSystemV2: false,
  experimentalEnabled: false,
  keyboardShortcutsEnabled: true,
  dndEnabled: false,
  inlineEditEnabled: false,
};

// =============================================================================
// Library Integration
// =============================================================================

/**
 * Create UI flag integration
 */
export function createUiFlagIntegration(): LibraryIntegration<UiFlagConfig> {
  return createLibraryIntegration<UiFlagConfig>({
    libraryId: 'ui',
    defaultConfig: DEFAULT_UI_FLAG_CONFIG,
    flagMappings: {
      [UI_FLAG_KEYS.UI_DARK_MODE_ENABLED]: 'darkModeEnabled',
      [UI_FLAG_KEYS.UI_ANIMATIONS_ENABLED]: 'animationsEnabled',
      [UI_FLAG_KEYS.UI_REDUCED_MOTION_ENABLED]: 'reducedMotionEnabled',
      [UI_FLAG_KEYS.UI_HIGH_CONTRAST_ENABLED]: 'highContrastEnabled',
      [UI_FLAG_KEYS.UI_COMPACT_MODE_ENABLED]: 'compactModeEnabled',
      [UI_FLAG_KEYS.UI_SKELETON_LOADING_ENABLED]: 'skeletonLoadingEnabled',
      [UI_FLAG_KEYS.UI_VIRTUAL_SCROLL_ENABLED]: 'virtualScrollEnabled',
      [UI_FLAG_KEYS.UI_TOOLTIPS_ENABLED]: 'tooltipsEnabled',
      [UI_FLAG_KEYS.UI_NOTIFICATIONS_ENABLED]: 'notificationsEnabled',
      [UI_FLAG_KEYS.UI_MODALS_ENABLED]: 'modalsEnabled',
      [UI_FLAG_KEYS.UI_SIDEBARS_ENABLED]: 'sidebarsEnabled',
      [UI_FLAG_KEYS.UI_DESIGN_SYSTEM_V2]: 'designSystemV2',
      [UI_FLAG_KEYS.UI_EXPERIMENTAL_ENABLED]: 'experimentalEnabled',
      [UI_FLAG_KEYS.UI_KEYBOARD_SHORTCUTS_ENABLED]: 'keyboardShortcutsEnabled',
      [UI_FLAG_KEYS.UI_DND_ENABLED]: 'dndEnabled',
      [UI_FLAG_KEYS.UI_INLINE_EDIT_ENABLED]: 'inlineEditEnabled',
    },
    onConfigChange: (config, changedFlags) => {
      console.debug('[UI Flags] Config changed:', changedFlags, config);

      // Apply dark mode to document
      if (changedFlags.includes(UI_FLAG_KEYS.UI_DARK_MODE_ENABLED)) {
        document.documentElement.classList.toggle('dark', config.darkModeEnabled);
      }

      // Apply reduced motion preference
      if (changedFlags.includes(UI_FLAG_KEYS.UI_REDUCED_MOTION_ENABLED)) {
        document.documentElement.classList.toggle('reduce-motion', config.reducedMotionEnabled);
      }

      // Apply high contrast mode
      if (changedFlags.includes(UI_FLAG_KEYS.UI_HIGH_CONTRAST_ENABLED)) {
        document.documentElement.classList.toggle('high-contrast', config.highContrastEnabled);
      }

      // Apply compact mode
      if (changedFlags.includes(UI_FLAG_KEYS.UI_COMPACT_MODE_ENABLED)) {
        document.documentElement.classList.toggle('compact', config.compactModeEnabled);
      }
    },
  });
}

// Initialize and register the UI integration
const uiIntegration = createUiFlagIntegration();
integrationRegistry.register(uiIntegration);

// =============================================================================
// UI Flag Helpers
// =============================================================================

/**
 * UI flags helper class
 */
class UiFlagsHelper {
  private getFlag: (flagKey: string) => boolean = () => false;

  setFlagGetter(getter: (flagKey: string) => boolean): void {
    this.getFlag = getter;
  }

  isDarkModeEnabled(): boolean {
    return this.getFlag(UI_FLAG_KEYS.UI_DARK_MODE_ENABLED);
  }

  isAnimationsEnabled(): boolean {
    return this.getFlag(UI_FLAG_KEYS.UI_ANIMATIONS_ENABLED);
  }

  isReducedMotionEnabled(): boolean {
    return this.getFlag(UI_FLAG_KEYS.UI_REDUCED_MOTION_ENABLED);
  }

  isHighContrastEnabled(): boolean {
    return this.getFlag(UI_FLAG_KEYS.UI_HIGH_CONTRAST_ENABLED);
  }

  isCompactModeEnabled(): boolean {
    return this.getFlag(UI_FLAG_KEYS.UI_COMPACT_MODE_ENABLED);
  }

  isSkeletonLoadingEnabled(): boolean {
    return this.getFlag(UI_FLAG_KEYS.UI_SKELETON_LOADING_ENABLED);
  }

  isVirtualScrollEnabled(): boolean {
    return this.getFlag(UI_FLAG_KEYS.UI_VIRTUAL_SCROLL_ENABLED);
  }

  isTooltipsEnabled(): boolean {
    return this.getFlag(UI_FLAG_KEYS.UI_TOOLTIPS_ENABLED);
  }

  isNotificationsEnabled(): boolean {
    return this.getFlag(UI_FLAG_KEYS.UI_NOTIFICATIONS_ENABLED);
  }

  isModalsEnabled(): boolean {
    return this.getFlag(UI_FLAG_KEYS.UI_MODALS_ENABLED);
  }

  isSidebarsEnabled(): boolean {
    return this.getFlag(UI_FLAG_KEYS.UI_SIDEBARS_ENABLED);
  }

  isDesignSystemV2Enabled(): boolean {
    return this.getFlag(UI_FLAG_KEYS.UI_DESIGN_SYSTEM_V2);
  }

  isExperimentalEnabled(): boolean {
    return this.getFlag(UI_FLAG_KEYS.UI_EXPERIMENTAL_ENABLED);
  }

  isKeyboardShortcutsEnabled(): boolean {
    return this.getFlag(UI_FLAG_KEYS.UI_KEYBOARD_SHORTCUTS_ENABLED);
  }

  isDndEnabled(): boolean {
    return this.getFlag(UI_FLAG_KEYS.UI_DND_ENABLED);
  }

  isInlineEditEnabled(): boolean {
    return this.getFlag(UI_FLAG_KEYS.UI_INLINE_EDIT_ENABLED);
  }

  getAllFlags(): Record<UiFlagKey, boolean> {
    return {
      [UI_FLAG_KEYS.UI_DARK_MODE_ENABLED]: this.isDarkModeEnabled(),
      [UI_FLAG_KEYS.UI_ANIMATIONS_ENABLED]: this.isAnimationsEnabled(),
      [UI_FLAG_KEYS.UI_REDUCED_MOTION_ENABLED]: this.isReducedMotionEnabled(),
      [UI_FLAG_KEYS.UI_HIGH_CONTRAST_ENABLED]: this.isHighContrastEnabled(),
      [UI_FLAG_KEYS.UI_COMPACT_MODE_ENABLED]: this.isCompactModeEnabled(),
      [UI_FLAG_KEYS.UI_SKELETON_LOADING_ENABLED]: this.isSkeletonLoadingEnabled(),
      [UI_FLAG_KEYS.UI_VIRTUAL_SCROLL_ENABLED]: this.isVirtualScrollEnabled(),
      [UI_FLAG_KEYS.UI_TOOLTIPS_ENABLED]: this.isTooltipsEnabled(),
      [UI_FLAG_KEYS.UI_NOTIFICATIONS_ENABLED]: this.isNotificationsEnabled(),
      [UI_FLAG_KEYS.UI_MODALS_ENABLED]: this.isModalsEnabled(),
      [UI_FLAG_KEYS.UI_SIDEBARS_ENABLED]: this.isSidebarsEnabled(),
      [UI_FLAG_KEYS.UI_DESIGN_SYSTEM_V2]: this.isDesignSystemV2Enabled(),
      [UI_FLAG_KEYS.UI_EXPERIMENTAL_ENABLED]: this.isExperimentalEnabled(),
      [UI_FLAG_KEYS.UI_KEYBOARD_SHORTCUTS_ENABLED]: this.isKeyboardShortcutsEnabled(),
      [UI_FLAG_KEYS.UI_DND_ENABLED]: this.isDndEnabled(),
      [UI_FLAG_KEYS.UI_INLINE_EDIT_ENABLED]: this.isInlineEditEnabled(),
    };
  }
}

/**
 * Global UI flags helper instance
 */
export const uiFlags = new UiFlagsHelper();

// =============================================================================
// React Hooks
// =============================================================================

/**
 * Hook to get UI flag configuration
 */
export function useUiFlagConfig(): UiFlagConfig {
  const config = useLibraryFlags<UiFlagConfig>('ui');
  return config ?? DEFAULT_UI_FLAG_CONFIG;
}

/**
 * Hook to check a specific UI flag
 */
export function useUiFlag(flagKey: UiFlagKey): boolean {
  const config = useUiFlagConfig();

  return useMemo(() => {
    switch (flagKey) {
      case UI_FLAG_KEYS.UI_DARK_MODE_ENABLED:
        return config.darkModeEnabled;
      case UI_FLAG_KEYS.UI_ANIMATIONS_ENABLED:
        return config.animationsEnabled;
      case UI_FLAG_KEYS.UI_REDUCED_MOTION_ENABLED:
        return config.reducedMotionEnabled;
      case UI_FLAG_KEYS.UI_HIGH_CONTRAST_ENABLED:
        return config.highContrastEnabled;
      case UI_FLAG_KEYS.UI_COMPACT_MODE_ENABLED:
        return config.compactModeEnabled;
      case UI_FLAG_KEYS.UI_SKELETON_LOADING_ENABLED:
        return config.skeletonLoadingEnabled;
      case UI_FLAG_KEYS.UI_VIRTUAL_SCROLL_ENABLED:
        return config.virtualScrollEnabled;
      case UI_FLAG_KEYS.UI_TOOLTIPS_ENABLED:
        return config.tooltipsEnabled;
      case UI_FLAG_KEYS.UI_NOTIFICATIONS_ENABLED:
        return config.notificationsEnabled;
      case UI_FLAG_KEYS.UI_MODALS_ENABLED:
        return config.modalsEnabled;
      case UI_FLAG_KEYS.UI_SIDEBARS_ENABLED:
        return config.sidebarsEnabled;
      case UI_FLAG_KEYS.UI_DESIGN_SYSTEM_V2:
        return config.designSystemV2;
      case UI_FLAG_KEYS.UI_EXPERIMENTAL_ENABLED:
        return config.experimentalEnabled;
      case UI_FLAG_KEYS.UI_KEYBOARD_SHORTCUTS_ENABLED:
        return config.keyboardShortcutsEnabled;
      case UI_FLAG_KEYS.UI_DND_ENABLED:
        return config.dndEnabled;
      case UI_FLAG_KEYS.UI_INLINE_EDIT_ENABLED:
        return config.inlineEditEnabled;
      default:
        return false;
    }
  }, [config, flagKey]);
}

/**
 * Hook for animation settings based on flags
 */
export function useAnimationSettings(): {
  enabled: boolean;
  duration: number;
  easing: string;
} {
  const config = useUiFlagConfig();

  return useMemo(() => {
    if (!config.animationsEnabled || config.reducedMotionEnabled) {
      return {
        enabled: false,
        duration: 0,
        easing: 'linear',
      };
    }

    return {
      enabled: true,
      duration: 200,
      easing: 'ease-in-out',
    };
  }, [config.animationsEnabled, config.reducedMotionEnabled]);
}

/**
 * Hook for theme settings based on flags
 */
export function useThemeSettings(): {
  isDark: boolean;
  isHighContrast: boolean;
  isCompact: boolean;
  themeClass: string;
} {
  const config = useUiFlagConfig();

  return useMemo(() => {
    const classes: string[] = [];

    if (config.darkModeEnabled) classes.push('dark');
    if (config.highContrastEnabled) classes.push('high-contrast');
    if (config.compactModeEnabled) classes.push('compact');

    return {
      isDark: config.darkModeEnabled,
      isHighContrast: config.highContrastEnabled,
      isCompact: config.compactModeEnabled,
      themeClass: classes.join(' '),
    };
  }, [config.darkModeEnabled, config.highContrastEnabled, config.compactModeEnabled]);
}

// =============================================================================
// Component Variants
// =============================================================================

const componentVariants = new Map<string, ComponentVariantConfig>();
const styleVariants = new Map<string, StyleVariantConfig>();

/**
 * Register a component variant
 */
export function registerComponentVariant<P>(config: ComponentVariantConfig<P>): void {
  componentVariants.set(config.componentId, config as ComponentVariantConfig);
}

/**
 * Get component variant based on flag state
 */
export function getComponentVariant<P>(
  componentId: string,
  getFlag: (flagKey: string) => boolean
): ComponentType<P> | null {
  const config = componentVariants.get(componentId);
  if (!config) return null;

  const isEnabled = getFlag(config.flagKey);
  return (isEnabled ? config.variantB : config.variantA) as ComponentType<P>;
}

/**
 * Register a style variant
 */
export function registerStyleVariant(config: StyleVariantConfig): void {
  styleVariants.set(config.styleId, config);
}

/**
 * Get style variant based on flag state
 */
export function getStyleVariant(
  styleId: string,
  getFlag: (flagKey: string) => boolean
): Record<string, string | number> {
  const config = styleVariants.get(styleId);
  if (!config) return {};

  const isEnabled = getFlag(config.flagKey);
  return isEnabled ? config.enabledStyles : config.disabledStyles;
}

/**
 * Hook to use component variant
 */
export function useComponentVariant<P>(
  componentId: string,
  getFlag: (flagKey: string) => boolean
): ComponentType<P> | null {
  return useMemo(
    () => getComponentVariant<P>(componentId, getFlag),
    [componentId, getFlag]
  );
}

/**
 * Hook to use style variant
 */
export function useStyleVariant(
  styleId: string,
  getFlag: (flagKey: string) => boolean
): Record<string, string | number> {
  return useMemo(() => getStyleVariant(styleId, getFlag), [styleId, getFlag]);
}

// =============================================================================
// Flagged UI Components
// =============================================================================

/**
 * Props for FlaggedUIComponent
 */
export interface FlaggedUIComponentProps<P = unknown> {
  /** Feature flag key */
  readonly flagKey: UiFlagKey | string;
  /** Component when flag is enabled */
  readonly enabledComponent: ComponentType<P>;
  /** Component when flag is disabled */
  readonly disabledComponent?: ComponentType<P>;
  /** Props to pass to the component */
  readonly componentProps?: P;
  /** Fallback when disabled and no component */
  readonly fallback?: ReactNode;
  /** Flag getter function */
  readonly getFlag?: (flagKey: string) => boolean;
}

/**
 * Render component based on flag state
 */
export function FlaggedUIComponent<P extends React.JSX.IntrinsicAttributes = React.JSX.IntrinsicAttributes>({
  flagKey,
  enabledComponent: EnabledComponent,
  disabledComponent: DisabledComponent,
  componentProps,
  fallback = null,
  getFlag,
}: FlaggedUIComponentProps<P>): React.JSX.Element | null {
  const config = useUiFlagConfig();

  const isEnabled = useMemo(() => {
    if (getFlag) return getFlag(flagKey);

    // Check if it's a known UI flag key
    for (const [, value] of Object.entries(UI_FLAG_KEYS)) {
      if (value === flagKey) {
        const key = flagKey.replace('ui-', '').replace(/-enabled$/, '').replace(/-/g, '');
        // Map to config property
        const configKey = `${key  }Enabled`;
        return (config as Record<string, boolean>)[configKey] ?? false;
      }
    }

    return false;
  }, [flagKey, getFlag, config]);

  if (isEnabled) {
    return <EnabledComponent {...(componentProps as P)} />;
  }

  if (DisabledComponent) {
    return <DisabledComponent {...(componentProps as P)} />;
  }

  return <>{fallback}</>;
}

/**
 * HOC to wrap component with flag check
 */
export function withUiFlag<P extends object>(
  Component: ComponentType<P>,
  flagKey: UiFlagKey | string,
  options: {
    fallback?: ComponentType<P>;
    getFlag?: (flagKey: string) => boolean;
  } = {}
): ComponentType<P> {
  const { fallback: FallbackComponent, getFlag } = options;

  function WithUiFlag(props: P): React.JSX.Element | null {
    return (
      <FlaggedUIComponent<P>
        flagKey={flagKey}
        enabledComponent={Component}
        disabledComponent={FallbackComponent}
        componentProps={props}
        getFlag={getFlag}
      />
    );
  }

  WithUiFlag.displayName = `WithUiFlag(${Component.displayName ?? Component.name ?? 'Component'})`;

  return WithUiFlag;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get CSS classes based on UI flags
 */
export function getUiFlagClasses(
  config: UiFlagConfig
): string {
  const classes: string[] = [];

  if (config.darkModeEnabled) classes.push('dark-mode');
  if (config.reducedMotionEnabled) classes.push('reduce-motion');
  if (config.highContrastEnabled) classes.push('high-contrast');
  if (config.compactModeEnabled) classes.push('compact-mode');
  if (config.designSystemV2) classes.push('design-v2');

  return classes.join(' ');
}

/**
 * Hook to get UI flag CSS classes
 */
export function useUiFlagClasses(): string {
  const config = useUiFlagConfig();
  return useMemo(() => getUiFlagClasses(config), [config]);
}

/**
 * Apply UI flags to document root
 */
export function applyUiFlagsToDocument(config: UiFlagConfig): void {
  const root = document.documentElement;

  root.classList.toggle('dark', config.darkModeEnabled);
  root.classList.toggle('reduce-motion', config.reducedMotionEnabled);
  root.classList.toggle('high-contrast', config.highContrastEnabled);
  root.classList.toggle('compact', config.compactModeEnabled);
  root.classList.toggle('design-v2', config.designSystemV2);
}

// =============================================================================
// Exports
// =============================================================================

export { uiIntegration };


