/**
 * @file Error Boundary Context
 * @description Context for error boundary management (Fast Refresh compliant).
 */

import { createContext, type ReactNode } from 'react';

/**
 * Error info from React
 */
export interface ErrorInfo {
  componentStack: string;
}

/**
 * Error boundary context value
 */
export interface ErrorBoundaryContextValue {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  hasError: boolean;
  resetError: () => void;
  captureError: (error: Error, errorInfo: ErrorInfo) => void;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
}

/**
 * Error boundary context - extracted for Fast Refresh compliance
 */
export const ErrorBoundaryContext = createContext<ErrorBoundaryContextValue | null>(null);

ErrorBoundaryContext.displayName = 'ErrorBoundaryContext';
