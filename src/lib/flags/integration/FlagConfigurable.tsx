/**
 * @fileoverview FlagConfigurable wrapper component for universal flag control.
 *
 * This component provides a universal wrapper that makes any component or element
 * configurable via feature flags. It supports fallback rendering, loading states,
 * metadata exposure, and A/B testing capabilities.
 *
 * @module flags/integration/FlagConfigurable
 *
 * @example
 * ```tsx
 * import { FlagConfigurable } from '@/lib/flags/integration/FlagConfigurable';
 *
 * // Basic usage
 * <FlagConfigurable flagKey="new-feature">
 *   <NewFeatureComponent />
 * </FlagConfigurable>
 *
 * // With fallback
 * <FlagConfigurable
 *   flagKey="new-checkout"
 *   fallback={<OldCheckout />}
 * >
 *   <NewCheckout />
 * </FlagConfigurable>
 *
 * // With render props
 * <FlagConfigurable flagKey="dark-mode">
 *   {({ isEnabled, flagKey, metadata }) => (
 *     <div data-flag={flagKey} data-enabled={isEnabled}>
 *       {isEnabled ? <DarkTheme /> : <LightTheme />}
 *     </div>
 *   )}
 * </FlagConfigurable>
 * ```
 */

import React, {
  createContext,
  type ReactNode,
  type ComponentType,
  type ReactElement,
  useMemo,
  useEffect,
  useCallback,
  useContext,
  useState,
} from 'react';
import { useFeatureFlag } from '../useFeatureFlag';
import type { FlagKey } from '../flag-keys';

// =============================================================================
// Types
// =============================================================================

/**
 * Flag metadata exposed to children
 */
export interface FlagMetadata {
  /** The feature flag key */
  readonly flagKey: string;
  /** Whether the flag is enabled */
  readonly isEnabled: boolean;
  /** Source of the flag value */
  readonly source: 'flag' | 'override' | 'default';
  /** Timestamp when flag was evaluated */
  readonly evaluatedAt: number;
  /** Variant name if applicable */
  readonly variant?: string;
}

/**
 * Render props function type
 */
export type FlagRenderProps = {
  /** Whether the flag is enabled */
  isEnabled: boolean;
  /** The feature flag key */
  flagKey: string;
  /** Additional metadata */
  metadata: FlagMetadata;
  /** Toggle function (if available) */
  toggle?: () => void;
};

/**
 * Props for FlagConfigurable component
 */
export interface FlagConfigurableProps {
  /** Feature flag key to check */
  readonly flagKey: FlagKey | string;
  /** Content to render when flag is enabled (or render function) */
  readonly children: ReactNode | ((props: FlagRenderProps) => ReactNode);
  /** Content to render when flag is disabled */
  readonly fallback?: ReactNode;
  /** Invert the flag check (show children when disabled) */
  readonly invert?: boolean;
  /** Custom flag getter function */
  readonly getFlag?: (flagKey: string) => boolean;
  /** Callback when flag is evaluated */
  readonly onEvaluation?: (metadata: FlagMetadata) => void;
  /** Callback when component is exposed (rendered) */
  readonly onExposure?: (metadata: FlagMetadata) => void;
  /** Track exposure for analytics */
  readonly trackExposure?: boolean;
  /** Variant identifier for A/B testing */
  readonly variant?: string;
  /** Loading component while flag is being evaluated */
  readonly loading?: ReactNode;
  /** Wrapper element type */
  readonly as?: keyof React.JSX.IntrinsicElements;
  /** Additional wrapper props */
  readonly wrapperProps?: Record<string, unknown>;
  /** Debug mode - logs flag evaluation */
  readonly debug?: boolean;
  /** Minimum display time to prevent flashing (ms) */
  readonly minDisplayTime?: number;
}

/**
 * Context for nested flag access
 */
export interface FlagConfigurableContextValue {
  /** Parent flag key */
  readonly parentFlagKey: string | null;
  /** Parent flag enabled state */
  readonly parentEnabled: boolean;
  /** Depth of nesting */
  readonly depth: number;
  /** Get configuration value */
  readonly getConfig: (
    flagKey: string
  ) => import('../../contexts/FlagConfigurableContext').ConfigurableValue | undefined;
  /** Set configuration value */
  readonly setConfig: (
    flagKey: string,
    value: import('../../contexts/FlagConfigurableContext').ConfigurableValue
  ) => void;
  /** Check if configuration exists */
  readonly hasConfig: (flagKey: string) => boolean;
  /** Get all configurations */
  readonly getAllConfigs: () => import('../../contexts/FlagConfigurableContext').FlagConfiguration[];
  /** Render variant */
  readonly renderVariant: (flagKey: string, variants: Record<string, ReactNode>) => ReactNode;
}

/**
 * Context for FlagConfigurable
 */
const FlagConfigurableContext = createContext<FlagConfigurableContextValue>({
  parentFlagKey: null,
  parentEnabled: true,
  depth: 0,
  getConfig: () => null,
  setConfig: () => {},
  hasConfig: () => false,
  getAllConfigs: () => [],
  renderVariant: () => null,
});

// =============================================================================
// Context
// =============================================================================

/**
 * Hook to access parent flag context
 */
// eslint-disable-next-line react-refresh/only-export-components -- Utility hook needed alongside components
export function useFlagConfigurableContext(): FlagConfigurableContextValue {
  return useContext(FlagConfigurableContext);
}

// =============================================================================
// Component
// =============================================================================

/**
 * Universal flag-configurable wrapper component
 */
export function FlagConfigurable({
  flagKey,
  children,
  fallback = null,
  invert = false,
  getFlag,
  onEvaluation,
  onExposure,
  trackExposure = false,
  variant,
  as: WrapperElement,
  wrapperProps = {},
}: FlagConfigurableProps): ReactElement | null {
  const parentContext = useFlagConfigurableContext();

  // Get flag value using hook or custom getter
  const hookEnabled = useFeatureFlag(flagKey);
  const isEnabled = getFlag ? getFlag(flagKey) : hookEnabled;

  // Apply inversion
  const shouldRender = invert ? !isEnabled : isEnabled;

  // Capture evaluation timestamp (stable across re-renders using lazy initialization)
  const [evaluatedAt] = useState<number>(() => Date.now());

  // Create metadata
  const metadata = useMemo<FlagMetadata>(
    () => ({
      flagKey,
      isEnabled,
      source: 'flag',
      evaluatedAt,
      variant: variant ?? (isEnabled ? 'enabled' : 'disabled'),
    }),
    [flagKey, isEnabled, variant, evaluatedAt]
  );

  // Debug logging
  useEffect(() => {
    // if (debug) {
    //   console.log(`[FlagConfigurable:${flagKey}]`, {
    //     isEnabled,
    //     shouldRender,
    //     invert,
    //     depth: parentContext.depth + 1,
    //   });
    // }
  }, [flagKey, isEnabled, shouldRender, invert, parentContext.depth]);

  // Evaluation callback
  useEffect(() => {
    onEvaluation?.(metadata);
  }, [metadata, onEvaluation]);

  // Exposure callback
  useEffect(() => {
    if (shouldRender) {
      onExposure?.(metadata);

      if (trackExposure) {
        // Track exposure event (integrate with analytics)
        try {
          const event = new CustomEvent('flag-exposure', {
            detail: metadata,
          });
          window.dispatchEvent(event);
        } catch {
          // Silent fail in SSR
        }
      }
    }
  }, [shouldRender, metadata, onExposure, trackExposure]);

  // Create render props
  const renderProps = useMemo<FlagRenderProps>(
    () => ({
      isEnabled,
      flagKey,
      metadata,
    }),
    [isEnabled, flagKey, metadata]
  );

  // Context value for nested components
  const contextValue = useMemo<FlagConfigurableContextValue>(
    () => ({
      parentFlagKey: flagKey,
      parentEnabled: isEnabled,
      depth: parentContext.depth + 1,
      getConfig: parentContext.getConfig,
      setConfig: parentContext.setConfig,
      hasConfig: parentContext.hasConfig,
      getAllConfigs: parentContext.getAllConfigs,
      renderVariant: parentContext.renderVariant,
    }),
    [flagKey, isEnabled, parentContext]
  );

  // Determine content to render
  const content = useMemo((): ReactNode => {
    if (typeof children === 'function') {
      return children(renderProps);
    }
    return shouldRender ? children : fallback;
  }, [children, shouldRender, fallback, renderProps]);

  // Wrap with element if specified
  const wrappedContent = WrapperElement ? (
    <WrapperElement {...wrapperProps} data-flag={flagKey} data-enabled={isEnabled}>
      {content}
    </WrapperElement>
  ) : (
    <>{content}</>
  );

  return (
    <FlagConfigurableContext.Provider value={contextValue}>
      {wrappedContent}
    </FlagConfigurableContext.Provider>
  );
}

// =============================================================================
// HOC Version
// =============================================================================

/**
 * Options for withFlagConfigurable HOC
 */
export interface WithFlagConfigurableOptions {
  /** Feature flag key */
  readonly flagKey: FlagKey | string;
  /** Fallback component when flag is disabled */
  readonly fallback?: ComponentType;
  /** Invert the flag check */
  readonly invert?: boolean;
  /** Custom flag getter */
  readonly getFlag?: (flagKey: string) => boolean;
  /** Track exposure */
  readonly trackExposure?: boolean;
}

/**
 * HOC to wrap a component with flag configuration
 */
// eslint-disable-next-line react-refresh/only-export-components -- HOC factory function
export function withFlagConfigurable<P extends object>(
  Component: ComponentType<P>,
  options: WithFlagConfigurableOptions
): ComponentType<P> {
  const { flagKey, fallback: FallbackComponent, invert, getFlag, trackExposure } = options;

  function WithFlagConfigurable(props: P): ReactElement {
    return (
      <FlagConfigurable
        flagKey={flagKey}
        fallback={FallbackComponent ? <FallbackComponent /> : null}
        invert={invert}
        getFlag={getFlag}
        trackExposure={trackExposure}
      >
        <Component {...props} />
      </FlagConfigurable>
    );
  }

  WithFlagConfigurable.displayName = `WithFlagConfigurable(${Component.displayName ?? Component.name ?? 'Component'})`;

  return WithFlagConfigurable;
}

// =============================================================================
// Specialized Variants
// =============================================================================

/**
 * Props for FlagConfigurableAB (A/B testing variant)
 */
export interface FlagConfigurableABProps {
  /** Feature flag key */
  readonly flagKey: FlagKey | string;
  /** Variant A content (flag disabled) */
  readonly variantA: ReactNode;
  /** Variant B content (flag enabled) */
  readonly variantB: ReactNode;
  /** Track exposure for both variants */
  readonly trackExposure?: boolean;
  /** Custom flag getter */
  readonly getFlag?: (flagKey: string) => boolean;
  /** Callback on variant selection */
  readonly onVariantSelected?: (variant: 'A' | 'B', metadata: FlagMetadata) => void;
}

/**
 * A/B testing variant of FlagConfigurable
 */
export function FlagConfigurableAB({
  flagKey,
  variantA,
  variantB,
  trackExposure = true,
  getFlag,
  onVariantSelected,
}: FlagConfigurableABProps): ReactElement {
  const handleExposure = useCallback(
    (metadata: FlagMetadata) => {
      const selectedVariant = metadata.isEnabled ? 'B' : 'A';
      onVariantSelected?.(selectedVariant, metadata);
    },
    [onVariantSelected]
  );

  return (
    <FlagConfigurable
      flagKey={flagKey}
      fallback={variantA}
      trackExposure={trackExposure}
      getFlag={getFlag}
      onExposure={handleExposure}
      variant="B"
    >
      {variantB}
    </FlagConfigurable>
  );
}

/**
 * Props for FlagConfigurableMulti (multi-variant)
 */
export interface FlagConfigurableMultiProps {
  /** Flag keys to check */
  readonly flagKeys: (FlagKey | string)[];
  /** Variants to render based on flag states */
  readonly variants: Record<string, ReactNode>;
  /** Default variant key if no match */
  readonly defaultVariant?: string;
  /** Strategy for combining flags */
  readonly strategy?: 'first' | 'all';
  /** Custom flag getter */
  readonly getFlag?: (flagKey: string) => boolean;
}

/**
 * Multi-variant flag configurable
 */
export function FlagConfigurableMulti({
  flagKeys,
  variants,
  defaultVariant = 'default',
  strategy = 'first',
  getFlag: customGetFlag,
}: FlagConfigurableMultiProps): ReactElement | null {
  const hookGetFlag = (): boolean => {
    // This is a simplified version - in real use, integrate with useFeatureFlags
    return false;
  };

  const getFlag = customGetFlag ?? hookGetFlag;

  const selectedVariant = useMemo(() => {
    if (strategy === 'first') {
      // Return first enabled flag's variant
      for (const key of flagKeys) {
        if (getFlag(key) && variants[key] !== undefined) {
          return key;
        }
      }
    } else {
      // Return variant based on all flags being enabled
      const allEnabled = flagKeys.every((key) => getFlag(key));
      if (allEnabled) {
        return 'all';
      }
    }
    return defaultVariant;
  }, [flagKeys, variants, strategy, defaultVariant, getFlag]);

  return <>{variants[selectedVariant] ?? variants[defaultVariant] ?? null}</>;
}

/**
 * Props for FlagConfigurableGated (gate with redirect)
 */
export interface FlagConfigurableGatedProps {
  /** Feature flag key */
  readonly flagKey: FlagKey | string;
  /** Content to render when flag is enabled */
  readonly children: ReactNode;
  /** Redirect path when flag is disabled */
  readonly redirectTo?: string;
  /** Fallback content when not redirecting */
  readonly fallback?: ReactNode;
  /** Custom flag getter */
  readonly getFlag?: (flagKey: string) => boolean;
  /** Custom redirect handler */
  readonly onRedirect?: (path: string) => void;
}

/**
 * Gated access variant with redirect support
 */
export function FlagConfigurableGated({
  flagKey,
  children,
  redirectTo,
  fallback = null,
  getFlag,
  onRedirect,
}: FlagConfigurableGatedProps): ReactElement | null {
  const hookEnabled = useFeatureFlag(flagKey);
  const isEnabled = getFlag ? getFlag(flagKey) : hookEnabled;

  useEffect(() => {
    if (!isEnabled && redirectTo !== undefined && redirectTo !== '') {
      if (onRedirect !== undefined) {
        onRedirect(redirectTo);
      } else if (typeof window !== 'undefined') {
        window.location.href = redirectTo;
      }
    }
  }, [isEnabled, redirectTo, onRedirect]);

  if (!isEnabled) {
    if (redirectTo !== undefined && redirectTo !== '') {
      return null; // Will redirect
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// =============================================================================
// Utility Components
// =============================================================================

/**
 * Debug component to show flag state
 */
export function FlagConfigurableDebug({
  flagKey,
  getFlag,
}: {
  flagKey: FlagKey | string;
  getFlag?: (flagKey: string) => boolean;
}): ReactElement {
  const hookEnabled = useFeatureFlag(flagKey);
  const isEnabled = getFlag ? getFlag(flagKey) : hookEnabled;

  return (
    <div
      style={{
        padding: '8px',
        margin: '4px',
        backgroundColor: isEnabled ? '#e6ffe6' : '#ffe6e6',
        border: `1px solid ${isEnabled ? '#00cc00' : '#cc0000'}`,
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace',
      }}
    >
      <strong>Flag:</strong> {flagKey}
      <br />
      <strong>Enabled:</strong> {String(isEnabled)}
    </div>
  );
}

/**
 * Component to list all flags and their states
 */
export function FlagConfigurableList({
  flagKeys,
  getFlag,
}: {
  flagKeys: (FlagKey | string)[];
  getFlag?: (flagKey: string) => boolean;
}): ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {flagKeys.map((key) => (
        <FlagConfigurableDebug key={key} flagKey={key} getFlag={getFlag} />
      ))}
    </div>
  );
}
