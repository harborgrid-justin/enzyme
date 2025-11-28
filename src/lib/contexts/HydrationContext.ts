/**
 * @file Hydration Context
 * @description Context for hydration management (Fast Refresh compliant).
 */

import { createContext } from 'react';

/**
 * Hydration status
 */
export type HydrationStatus = 'pending' | 'hydrating' | 'hydrated' | 'error';

/**
 * Hydration priority
 */
export type HydrationPriority = 'immediate' | 'high' | 'normal' | 'low' | 'idle';

/**
 * Hydration boundary ID
 */
export type HydrationBoundaryId = string;

/**
 * Hydration context value
 */
export interface HydrationContextValue {
  isHydrated: boolean;
  isHydrating: boolean;
  registerBoundary: (id: HydrationBoundaryId, priority: HydrationPriority) => void;
  unregisterBoundary: (id: HydrationBoundaryId) => void;
  getBoundaryStatus: (id: HydrationBoundaryId) => HydrationStatus | undefined;
  requestHydration: (id: HydrationBoundaryId) => void;
  pauseHydration: () => void;
  resumeHydration: () => void;
}

/**
 * Hydration context - extracted for Fast Refresh compliance
 */
export const HydrationContext = createContext<HydrationContextValue | null>(null);

HydrationContext.displayName = 'HydrationContext';
