/**
 * @file Loading Context
 * @description Context for loading state management (Fast Refresh compliant).
 */

import { createContext } from 'react';

/**
 * Loading state
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error' | 'timeout';

/**
 * Loading phase for progressive display
 */
export type LoadingPhase = 'initial' | 'spinner' | 'skeleton' | 'message' | 'timeout';

/**
 * Loading context value
 */
export interface LoadingContextValue {
  state: LoadingState;
  phase: LoadingPhase;
  message: string | null;
  progress: number | null;
  error: Error | null;
  startLoading: (message?: string) => void;
  stopLoading: () => void;
  setProgress: (progress: number) => void;
  setError: (error: Error) => void;
  reset: () => void;
}

/**
 * Loading context - extracted for Fast Refresh compliance
 */
export const LoadingContext = createContext<LoadingContextValue | null>(null);
