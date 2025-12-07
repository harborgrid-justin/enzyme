/**
 * @file Toast Context
 * @description Context for toast notifications (Fast Refresh compliant).
 */

import { createContext, type ReactNode } from 'react';

/**
 * Toast variant
 */
export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

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
 * Toast item
 */
export interface Toast {
  id: string;
  message: string | ReactNode;
  variant: ToastVariant;
  duration?: number;
  dismissible?: boolean;
  onDismiss?: () => void;
}

/**
 * Toast context value
 */
export interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string | ReactNode, variant?: ToastVariant, duration?: number) => string;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
}

/**
 * Toast context - extracted for Fast Refresh compliance
 */
export const ToastContext = createContext<ToastContextValue | null>(null);

ToastContext.displayName = 'ToastContext';
