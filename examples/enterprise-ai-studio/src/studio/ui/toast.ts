/**
 * Tiny re-export wrapper for Sonner so component files don't depend on the
 * library name directly. Centralizes default options (position, duration) and
 * lets us swap the underlying lib without rewriting call sites.
 */
import { toast as sonnerToast } from 'sonner';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  description?: string;
  action?: ToastAction;
  duration?: number;
}

function withDefaults(options: ToastOptions = {}): ToastOptions {
  return { duration: 4000, ...options };
}

export const toast = {
  success(message: string, options?: ToastOptions): void {
    sonnerToast.success(message, withDefaults(options));
  },
  error(message: string, options?: ToastOptions): void {
    sonnerToast.error(message, withDefaults({ duration: 6000, ...options }));
  },
  info(message: string, options?: ToastOptions): void {
    sonnerToast(message, withDefaults(options));
  },
  warning(message: string, options?: ToastOptions): void {
    sonnerToast.warning(message, withDefaults(options));
  },
  /** Promise toast: shows loading → success/error transitions. */
  promise<T>(
    p: Promise<T>,
    messages: { loading: string; success: string | ((value: T) => string); error: string }
  ): void {
    sonnerToast.promise(p, messages);
  },
  dismiss(): void {
    sonnerToast.dismiss();
  },
};
