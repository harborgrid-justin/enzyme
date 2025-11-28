/**
 * @file Spinner Component
 * @description Standard loading spinner with memoization for performance
 * Performance optimized: static styles extracted, dynamic styles memoized
 * Uses theme tokens for consistent styling and z-index management
 */

import React, { memo, useRef, useEffect, useCallback, useMemo, type CSSProperties } from 'react';
import { tokens, colorTokens } from '../../theme/tokens';

/**
 * Spinner size options
 */
export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Spinner variant options
 */
export type SpinnerVariant = 'default' | 'primary' | 'secondary' | 'white';

/**
 * Spinner props
 */
export interface SpinnerProps {
  /** Spinner size */
  size?: SpinnerSize;

  /** Spinner color variant */
  variant?: SpinnerVariant;

  /** Custom color */
  color?: string;

  /** Accessible label */
  label?: string;

  /** Additional class name */
  className?: string;

  /** Center in container */
  centered?: boolean;
}

// ============================================================================
// STATIC STYLES AND CONFIGURATION
// ============================================================================

/**
 * Size mappings
 */
const sizeMap: Record<SpinnerSize, { size: number; border: number }> = {
  xs: { size: 12, border: 2 },
  sm: { size: 16, border: 2 },
  md: { size: 24, border: 3 },
  lg: { size: 32, border: 4 },
  xl: { size: 48, border: 4 },
};

/**
 * Color mappings - using theme tokens
 */
const colorMap: Record<SpinnerVariant, string> = {
  default: colorTokens.neutral[500],
  primary: colorTokens.primary.default,
  secondary: colorTokens.secondary.default,
  white: colorTokens.neutral.white,
};

const srOnlyStyle: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const centeredContainerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  minHeight: '100px',
};

const spinnerWithTextContainerBaseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
};

const overlayTextStyle: CSSProperties = {
  marginTop: tokens.spacing.md,
  color: colorTokens.text.secondary,
  fontSize: tokens.fontSize.sm,
};

// Keyframe animation styles - only injected once
const keyframeStyles = `
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    [role="status"] {
      animation-duration: 1.5s !important;
      animation-timing-function: steps(8) !important;
    }
  }
`;

// Focus styles for LoadingOverlay - ensures WCAG 2.4.7 compliance
// Note: Using CSS variable fallback for theme token
const loadingOverlayFocusStyles = `
  [role="alertdialog"]:focus {
    outline: 2px solid ${colorTokens.border.focus};
    outline-offset: -2px;
  }

  [role="alertdialog"]:focus:not(:focus-visible) {
    outline: none;
  }

  [role="alertdialog"]:focus-visible {
    outline: 2px solid ${colorTokens.border.focus};
    outline-offset: -2px;
  }
`;

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Spinner component - memoized for performance
 */
export const Spinner = memo(({
  size = 'md',
  variant = 'default',
  color,
  label = 'Loading...',
  className,
  centered = false,
}: SpinnerProps): React.ReactElement => {
  const { size: dimension, border } = sizeMap[size];
  const spinnerColor = color ?? colorMap[variant];

  // Memoize spinner style
  const spinnerStyle = useMemo((): CSSProperties => ({
    width: dimension,
    height: dimension,
    border: `${border}px solid transparent`,
    borderTopColor: spinnerColor,
    borderRadius: '50%',
    animation: 'spin 0.75s linear infinite',
  }), [dimension, border, spinnerColor]);

  const spinner = (
    <div
      role="status"
      aria-label={label}
      className={className}
      style={spinnerStyle}
    >
      <span style={srOnlyStyle}>
        {label}
      </span>

      {/* Keyframe animation with reduced motion support */}
      <style>{keyframeStyles}</style>
    </div>
  );

  if (centered) {
    return (
      <div style={centeredContainerStyle}>
        {spinner}
      </div>
    );
  }

  return spinner;
});

Spinner.displayName = 'Spinner';

/**
 * Inline spinner with text - memoized for performance
 */
export const SpinnerWithText = memo(({
  text = 'Loading...',
  size = 'sm',
  variant = 'default',
  className,
}: {
  text?: string;
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  className?: string;
}): React.ReactElement => {
  // Memoize text style based on size
  const textStyle = useMemo((): CSSProperties => ({
    fontSize: size === 'xs' ? '0.75rem' : '0.875rem',
  }), [size]);

  return (
    <div className={className} style={spinnerWithTextContainerBaseStyle}>
      <Spinner size={size} variant={variant} label={text} />
      <span style={textStyle}>
        {text}
      </span>
    </div>
  );
});

SpinnerWithText.displayName = 'SpinnerWithText';

/**
 * Full page loading overlay - memoized for performance
 * Includes focus trap to prevent interaction with background content
 */
export const LoadingOverlay = memo(({
  visible = true,
  text = 'Loading...',
  blur = true,
}: {
  visible?: boolean;
  text?: string;
  blur?: boolean;
}): React.ReactElement | null => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus trap - move focus to overlay when visible and restore when hidden
  useEffect(() => {
    if (visible) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;
      // Focus the overlay container
      overlayRef.current?.focus();
    } else if (previousActiveElement.current) {
      // Restore focus when overlay is hidden
      previousActiveElement.current.focus();
    }
  }, [visible]);

  // Trap keyboard focus within overlay
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Trap Tab key within the overlay
    if (e.key === 'Tab') {
      e.preventDefault();
      // Keep focus on the overlay itself since there's nothing else to focus
      overlayRef.current?.focus();
    }
  }, []);

  // Memoize overlay style - uses focus-visible for accessibility
  // Note: We keep a visible focus indicator for accessibility compliance (WCAG 2.4.7)
  // Uses theme token for z-index to maintain proper stacking context
  const overlayStyle = useMemo((): CSSProperties => ({
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: blur ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.95)',
    backdropFilter: blur ? 'blur(4px)' : undefined,
    zIndex: parseInt(tokens.zIndex.modal),
    // Focus indicator for keyboard users - inset ring that doesn't affect layout
    // The overlay background provides visual context, but we add a subtle ring for WCAG compliance
  }), [blur]);

  if (!visible) return null;

  return (
    <div
      ref={overlayRef}
      role="alertdialog"
      aria-modal="true"
      aria-label={text || 'Loading'}
      aria-live="assertive"
      aria-busy="true"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      style={overlayStyle}
    >
      {/* Focus styles for accessibility compliance */}
      <style>{loadingOverlayFocusStyles}</style>
      <Spinner size="lg" variant="primary" label={text} />
      {text && (
        <p style={overlayTextStyle}>
          {text}
        </p>
      )}
    </div>
  );
});

LoadingOverlay.displayName = 'LoadingOverlay';
