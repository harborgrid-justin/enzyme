/**
 * @file Button Component
 * @description Versatile button component with multiple variants, sizes, and states
 * Uses theme tokens for consistent styling and accessibility
 */

import React, { memo, useMemo, forwardRef, type CSSProperties, type ButtonHTMLAttributes } from 'react';
import { tokens, colorTokens } from '../../theme/tokens';
import { Spinner } from '../feedback/Spinner';

// ============================================================================
// Types
// ============================================================================

/**
 * Button variant options
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';

/**
 * Button size options
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Button props
 */
export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  /** Button variant */
  variant?: ButtonVariant;

  /** Button size */
  size?: ButtonSize;

  /** Full width button */
  fullWidth?: boolean;

  /** Loading state */
  isLoading?: boolean;

  /** Left icon */
  leftIcon?: React.ReactNode;

  /** Right icon */
  rightIcon?: React.ReactNode;

  /** Custom styles (merged with base styles) */
  style?: CSSProperties;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Size configurations
 */
const sizeConfig: Record<ButtonSize, {
  padding: string;
  fontSize: string;
  minHeight: string;
  iconSize: number;
  gap: string;
}> = {
  sm: {
    padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
    fontSize: tokens.fontSize.sm,
    minHeight: '2rem',
    iconSize: 14,
    gap: tokens.spacing.xs,
  },
  md: {
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    fontSize: tokens.fontSize.sm,
    minHeight: '2.5rem',
    iconSize: 16,
    gap: tokens.spacing.sm,
  },
  lg: {
    padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
    fontSize: tokens.fontSize.base,
    minHeight: '3rem',
    iconSize: 20,
    gap: tokens.spacing.sm,
  },
};

/**
 * Variant styles
 */
const variantStyles: Record<ButtonVariant, {
  background: string;
  color: string;
  border: string;
  hoverBackground: string;
  hoverBorder: string;
  activeBackground: string;
}> = {
  primary: {
    background: colorTokens.primary.default,
    color: colorTokens.neutral.white,
    border: 'transparent',
    hoverBackground: colorTokens.primary.hover,
    hoverBorder: 'transparent',
    activeBackground: colorTokens.primary.active,
  },
  secondary: {
    background: colorTokens.secondary.light,
    color: colorTokens.text.primary,
    border: 'transparent',
    hoverBackground: colorTokens.secondary.default,
    hoverBorder: 'transparent',
    activeBackground: colorTokens.secondary.hover,
  },
  outline: {
    background: 'transparent',
    color: colorTokens.text.primary,
    border: colorTokens.border.emphasis,
    hoverBackground: colorTokens.interactive.hover,
    hoverBorder: colorTokens.border.emphasis,
    activeBackground: colorTokens.interactive.active,
  },
  ghost: {
    background: 'transparent',
    color: colorTokens.text.secondary,
    border: 'transparent',
    hoverBackground: colorTokens.interactive.hover,
    hoverBorder: 'transparent',
    activeBackground: colorTokens.interactive.active,
  },
  destructive: {
    background: colorTokens.error.default,
    color: colorTokens.neutral.white,
    border: 'transparent',
    hoverBackground: colorTokens.error.hover,
    hoverBorder: 'transparent',
    activeBackground: colorTokens.error.hover,
  },
};

// Static base styles
const baseButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: tokens.fontWeight.medium,
  borderRadius: tokens.radius.md,
  borderWidth: '1px',
  borderStyle: 'solid',
  cursor: 'pointer',
  transition: 'all 150ms ease-in-out',
  textDecoration: 'none',
  lineHeight: 1.5,
  whiteSpace: 'nowrap',
  userSelect: 'none',
};

const disabledStyle: CSSProperties = {
  opacity: 0.5,
  cursor: 'not-allowed',
  pointerEvents: 'none',
};

const iconContainerStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const loadingContainerStyle: CSSProperties = {
  position: 'relative',
};

const loadingContentStyle: CSSProperties = {
  visibility: 'hidden',
};

const loadingSpinnerStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
};

// Focus visible styles injected once
const buttonFocusStyles = `
  button:focus {
    outline: none;
  }

  button:focus-visible {
    outline: 2px solid ${colorTokens.border.focus};
    outline-offset: 2px;
  }
`;

// Inject focus styles once at module load (SSR-safe)
if (typeof document !== 'undefined') {
  const styleId = 'button-focus-styles';
  if (!document.getElementById(styleId)) {
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = buttonFocusStyles;
    document.head.appendChild(styleElement);
  }
}

// ============================================================================
// Component
// ============================================================================

/**
 * Button component with forwardRef for ref forwarding
 */
export const Button = memo(forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    isLoading = false,
    leftIcon,
    rightIcon,
    disabled,
    children,
    className,
    style,
    type = 'button',
    'aria-label': ariaLabel,
    ...props
  },
  ref
): React.ReactElement {
  const isDisabled = disabled || isLoading;
  const sizeProps = sizeConfig[size];
  const variantProps = variantStyles[variant];

  // Memoize computed button style
  const buttonStyle = useMemo((): CSSProperties => {
    const computedStyle: CSSProperties = {
      ...baseButtonStyle,
      padding: sizeProps.padding,
      fontSize: sizeProps.fontSize,
      minHeight: sizeProps.minHeight,
      gap: sizeProps.gap,
      backgroundColor: variantProps.background,
      color: variantProps.color,
      borderColor: variantProps.border,
      width: fullWidth ? '100%' : undefined,
      ...(isDisabled ? disabledStyle : {}),
      ...style,
    };

    return computedStyle;
  }, [sizeProps, variantProps, fullWidth, isDisabled, style]);

  // Determine spinner variant based on button variant
  const spinnerVariant = variant === 'primary' || variant === 'destructive' ? 'white' : 'primary';
  const spinnerSize = size === 'lg' ? 'md' : 'sm';

  // Render icon with proper sizing
  const renderIcon = (icon: React.ReactNode, position: 'left' | 'right') => {
    if (!icon) return null;

    return (
      <span
        style={{
          ...iconContainerStyle,
          marginRight: position === 'left' && children ? sizeProps.gap : undefined,
          marginLeft: position === 'right' && children ? sizeProps.gap : undefined,
        }}
        aria-hidden="true"
      >
        {icon}
      </span>
    );
  };

  // Content rendering
  const content = (
    <>
      {leftIcon && renderIcon(leftIcon, 'left')}
      {children}
      {rightIcon && renderIcon(rightIcon, 'right')}
    </>
  );

  return (
    <button
      ref={ref}
      type={type}
      className={className}
      style={buttonStyle}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={isLoading}
      aria-label={ariaLabel || (isLoading ? 'Loading...' : undefined)}
      {...props}
    >
      {isLoading ? (
        <span style={loadingContainerStyle}>
          <span style={loadingContentStyle}>{content}</span>
          <span style={loadingSpinnerStyle}>
            <Spinner size={spinnerSize} variant={spinnerVariant} label="Loading" />
          </span>
        </span>
      ) : (
        content
      )}
    </button>
  );
}));

Button.displayName = 'Button';

// ============================================================================
// Additional Button Variants
// ============================================================================

/**
 * Icon-only button component
 */
export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  /** Icon to display */
  icon: React.ReactNode;

  /** Accessible label (required for icon-only buttons) */
  'aria-label': string;
}

export const IconButton = memo(forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, size = 'md', style, ...props },
  ref
): React.ReactElement {
  // Square padding for icon buttons
  const iconButtonStyle: CSSProperties = {
    ...style,
    padding: size === 'sm' ? tokens.spacing.xs : tokens.spacing.sm,
    aspectRatio: '1',
  };

  return (
    <Button ref={ref} size={size} style={iconButtonStyle} {...props}>
      <span style={iconContainerStyle} aria-hidden="true">
        {icon}
      </span>
    </Button>
  );
}));

IconButton.displayName = 'IconButton';

/**
 * Button group component for grouping related buttons
 */
export interface ButtonGroupProps {
  /** Button group children */
  children: React.ReactNode;

  /** Direction of button group */
  direction?: 'horizontal' | 'vertical';

  /** Gap between buttons */
  gap?: 'sm' | 'md' | 'lg';

  /** Additional class name */
  className?: string;

  /** Custom styles */
  style?: CSSProperties;
}

const gapMap: Record<'sm' | 'md' | 'lg', string> = {
  sm: tokens.spacing.xs,
  md: tokens.spacing.sm,
  lg: tokens.spacing.md,
};

export const ButtonGroup = memo(function ButtonGroup({
  children,
  direction = 'horizontal',
  gap = 'sm',
  className,
  style,
}: ButtonGroupProps): React.ReactElement {
  const groupStyle = useMemo((): CSSProperties => ({
    display: 'flex',
    flexDirection: direction === 'vertical' ? 'column' : 'row',
    gap: gapMap[gap],
    ...style,
  }), [direction, gap, style]);

  return (
    <div className={className} style={groupStyle} role="group">
      {children}
    </div>
  );
});

ButtonGroup.displayName = 'ButtonGroup';
