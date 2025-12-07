/**
 * @file Toasts Component
 * @description Toast manager hooked into global state / error reporting
 * Uses theme tokens for consistent styling and z-index management
 * @refresh reset
 */

import React, {
  useContext,
  useCallback,
  useState,
  useEffect,
  memo,
  useMemo,
  type ReactNode,
  type CSSProperties,
} from 'react';
import {
  ToastContext,
  type Toast,
  type ToastContextValue,
  type ToastVariant,
} from '../../contexts/ToastContext';
import { tokens, colorTokens } from '../../theme/tokens';

/**
 * Toast types - alias from context
 */
export type ToastType = ToastVariant;

/**
 * Toast position
 */
export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/**
 * Generate unique toast ID
 */
function generateId(): string {
  return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Toast provider props
 */
export interface ToastProviderProps {
  children: ReactNode;
  position?: ToastPosition;
  maxToasts?: number;
  defaultDuration?: number;
}

/**
 * Toast provider component
 */
export function ToastProvider({
  children,
  position = 'top-right',
  maxToasts = 5,
  defaultDuration = 5000,
}: ToastProviderProps): React.ReactElement {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string | ReactNode, variant: ToastVariant) => {
      const id = generateId();
      const newToast: Toast = {
        id,
        message,
        variant,
        duration: defaultDuration,
        dismissible: true,
      };

      setToasts((prev) => {
        const updated = [newToast, ...prev];
        // Limit max toasts
        return updated.slice(0, maxToasts);
      });

      return id;
    },
    [defaultDuration, maxToasts]
  );

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (message: string | ReactNode, variant: ToastVariant = 'info') => {
      return addToast(message, variant);
    },
    [addToast]
  );

  const value: ToastContextValue = {
    toasts,
    showToast,
    dismissToast: removeToast,
    dismissAll: clearAll,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} position={position} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

ToastProvider.displayName = 'ToastProvider';

/**
 * Hook to use toast context
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

/**
 * Props for ToastContainer component
 */
interface ToastContainerProps {
  toasts: Toast[];
  position: ToastPosition;
  onRemove: (id: string) => void;
}

/**
 * Get animation direction based on position
 */
function getAnimationName(position: ToastPosition): string {
  if (position.includes('left')) return 'slideInFromLeft';
  if (position.includes('center')) return 'slideInFromTop';
  return 'slideInFromRight';
}

/**
 * Toast container component - memoized for performance
 */
const ToastContainer = memo(
  ({ toasts, position, onRemove }: ToastContainerProps): React.ReactElement | null => {
    // Position styles - uses theme token for z-index
    const positionStyles: React.CSSProperties = {
      position: 'fixed',
      zIndex: parseInt(tokens.zIndex.toast),
      display: 'flex',
      flexDirection: 'column',
      gap: tokens.spacing.sm,
      padding: tokens.spacing.md,
      maxWidth: '24rem',
      width: '100%',
    };

    if (position.includes('top')) {
      positionStyles.top = 0;
    } else {
      positionStyles.bottom = 0;
      positionStyles.flexDirection = 'column-reverse';
    }

    if (position.includes('left')) {
      positionStyles.left = 0;
    } else if (position.includes('right')) {
      positionStyles.right = 0;
    } else {
      positionStyles.left = '50%';
      positionStyles.transform = 'translateX(-50%)';
    }

    if (toasts.length === 0) return null;

    return (
      <div style={positionStyles} aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} position={position} onRemove={onRemove} />
        ))}
      </div>
    );
  }
);

ToastContainer.displayName = 'ToastContainer';

/**
 * Props for ToastItem component
 */
interface ToastItemProps {
  toast: Toast;
  position: ToastPosition;
  onRemove: (id: string) => void;
}

// Toast item static styles - using theme tokens
const toastItemBaseStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: tokens.spacing.md,
  padding: tokens.spacing.md,
  borderRadius: tokens.radius.lg,
  boxShadow: tokens.shadow.md,
};

const iconContainerStyle: CSSProperties = {
  flexShrink: 0,
};

const contentContainerStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const messageStyle: CSSProperties = {
  fontSize: tokens.fontSize.sm,
  color: colorTokens.text.secondary,
};

const dismissButtonStyle: CSSProperties = {
  padding: tokens.spacing.xs,
  backgroundColor: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: colorTokens.neutral[400],
  borderRadius: tokens.radius.sm,
};

// Type colors constant - using theme color tokens
const typeColors: Record<ToastVariant, { bg: string; border: string; icon: string }> = {
  success: {
    bg: colorTokens.success.lighter,
    border: colorTokens.success.light,
    icon: colorTokens.success.default,
  },
  error: {
    bg: colorTokens.error.lighter,
    border: colorTokens.error.light,
    icon: colorTokens.error.default,
  },
  warning: {
    bg: colorTokens.warning.lighter,
    border: colorTokens.warning.light,
    icon: colorTokens.warning.default,
  },
  info: {
    bg: colorTokens.info.lighter,
    border: colorTokens.info.light,
    icon: colorTokens.info.default,
  },
};

// ============================================================================
// ANIMATION STYLES - Injected once at module load to prevent memory leak
// Direction-aware animations based on toast position
// ============================================================================

const TOAST_ANIMATION_STYLES = `
@keyframes slideInFromRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideInFromLeft {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideInFromTop {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  [role="alert"] {
    animation: none !important;
    opacity: 1;
    transform: none;
  }
}
`;

// Inject animation styles once at module load (SSR-safe)
if (typeof document !== 'undefined') {
  const styleId = 'toast-animation-styles';
  if (!document.getElementById(styleId)) {
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = TOAST_ANIMATION_STYLES;
    document.head.appendChild(styleElement);
  }
}

/**
 * Individual toast item - memoized for performance
 */
const ToastItem = memo(({ toast, position, onRemove }: ToastItemProps): React.ReactElement => {
  // Auto-dismiss
  useEffect(() => {
    if (toast.duration !== undefined && toast.duration !== null && toast.duration > 0) {
      const timer = setTimeout(() => {
        onRemove(toast.id);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [toast.id, toast.duration, onRemove]);

  // Stable dismiss callback
  const handleDismiss = useCallback(() => {
    onRemove(toast.id);
  }, [onRemove, toast.id]);

  const colors = typeColors[toast.variant];
  const animationName = getAnimationName(position);

  // Memoize container style with variant-specific colors and position-aware animation
  const containerStyle = useMemo<CSSProperties>(
    () => ({
      ...toastItemBaseStyle,
      backgroundColor: colors.bg,
      border: `1px solid ${colors.border}`,
      animation: `${animationName} 0.3s ease-out`,
    }),
    [colors.bg, colors.border, animationName]
  );

  // Memoize icon style with color
  const iconStyle = useMemo<CSSProperties>(
    () => ({
      ...iconContainerStyle,
      color: colors.icon,
    }),
    [colors.icon]
  );

  return (
    <div role="alert" style={containerStyle}>
      {/* Icon - decorative, hidden from screen readers */}
      <span style={iconStyle} aria-hidden="true">
        {toast.variant === 'success' && (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {toast.variant === 'error' && (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {toast.variant === 'warning' && (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {toast.variant === 'info' && (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </span>

      {/* Screen reader announcement of toast type */}
      <span className="sr-only">
        {toast.variant === 'success' && 'Success: '}
        {toast.variant === 'error' && 'Error: '}
        {toast.variant === 'warning' && 'Warning: '}
        {toast.variant === 'info' && 'Info: '}
      </span>

      {/* Content */}
      <div style={contentContainerStyle}>
        <div style={messageStyle}>{toast.message}</div>
      </div>

      {/* Dismiss button */}
      {toast.dismissible === true && (
        <button onClick={handleDismiss} style={dismissButtonStyle} aria-label="Dismiss">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
      {/* Animation styles injected at module level - see TOAST_ANIMATION_STYLES */}
    </div>
  );
});

ToastItem.displayName = 'ToastItem';
