import { useFeatureFlagContext } from './FeatureFlagProvider';
import type { FlagKey } from './flagKeys';

/**
 * Hook: useFeatureFlag("new-dashboard").
 * Returns boolean indicating if the flag is enabled.
 */
export function useFeatureFlag(flagKey: FlagKey | string): boolean {
  const { isEnabled } = useFeatureFlagContext();
  return isEnabled(flagKey);
}

/**
 * Hook: useFeatureFlags().
 * Returns all flags and utilities.
 */
export function useFeatureFlags(): {
  flags: Record<string, boolean>;
  isLoading: boolean;
  isEnabled: (flagKey: FlagKey | string) => boolean;
  setFlag: (flagKey: string, value: boolean) => void;
  refreshFlags: () => Promise<void>;
} {
  const { flags, isLoading, isEnabled, setFlag, refreshFlags } = useFeatureFlagContext();
  return {
    flags,
    isLoading,
    isEnabled,
    setFlag,
    refreshFlags,
  };
}

/**
 * Hook to check multiple flags at once.
 */
export function useFeatureFlagsStatus(flagKeys: (FlagKey | string)[]): Record<string, boolean> {
  const { isEnabled } = useFeatureFlagContext();
  
  return flagKeys.reduce(
    (acc, key) => {
      acc[key] = isEnabled(key);
      return acc;
    },
    {} as Record<string, boolean>
  );
}
