/**
 * @file Feature Flag Context
 * @description Context for feature flag management (Fast Refresh compliant).
 */

import { createContext } from 'react';

/**
 * Feature flag context value
 */
export interface FeatureFlagContextValue {
  flags: Record<string, boolean>;
  isLoading: boolean;
  isEnabled: (flagKey: string) => boolean;
  setFlag: (flagKey: string, value: boolean) => void;
  refreshFlags: () => Promise<void>;
}

/**
 * Feature flag context - extracted for Fast Refresh compliance
 */
export const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

FeatureFlagContext.displayName = 'FeatureFlagContext';
