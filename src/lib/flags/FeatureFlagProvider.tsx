import {
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode
} from 'react';
import { FeatureFlagContext } from '../contexts/FeatureFlagContext';
import { env } from '@/config/env';
import { getDefaultFlags } from '@/config/featureFlagConfig';
import type { FlagKey } from './flagKeys';
import { _setFlagProviderInitialized, _updateRuntimeFlags, _resetFlagProvider } from './debugMode';

interface FeatureFlagContextValue {
  flags: Record<string, boolean>;
  isLoading: boolean;
  isEnabled: (flagKey: FlagKey | string) => boolean;
  setFlag: (flagKey: string, value: boolean) => void;
  refreshFlags: () => Promise<void>;
}

interface FeatureFlagProviderProps {
  children: ReactNode;
  /** Override default flags for testing */
  initialFlags?: Record<string, boolean>;
}

/**
 * Loads + exposes feature flag states (local or remote).
 */
export function FeatureFlagProvider({
  children,
  initialFlags
}: FeatureFlagProviderProps) {
  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    const initial = {
      ...getDefaultFlags(),
      ...initialFlags,
    };
    // Initialize runtime flags for non-React usage
    _setFlagProviderInitialized(initial);
    return initial;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Sync runtime flags when flags state changes
  useEffect(() => {
    _updateRuntimeFlags(flags);
  }, [flags]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      _resetFlagProvider();
    };
  }, []);

  // Define refreshFlags BEFORE the useEffect that uses it
  const refreshFlags = useCallback(async () => {
    if (env.featureFlagsSource !== 'remote') return;

    setIsLoading(true);
    try {
      // Fetch from remote feature flag service
      const response = await fetch(`${env.apiBaseUrl}/feature-flags`);
      if (response.ok) {
        const remoteFlags = await response.json();
        setFlags((current) => ({
          ...current,
          ...remoteFlags,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch feature flags:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load flags based on configuration
  useEffect(() => {
    if (!env.featureFlagsEnabled) return;

    const loadFlags = async () => {
      if (env.featureFlagsSource === 'remote') {
        await refreshFlags();
      }
    };

    loadFlags();
  }, [refreshFlags]);

  const isEnabled = useCallback(
    (flagKey: FlagKey | string): boolean => {
      return flags[flagKey] ?? false;
    },
    [flags]
  );

  const setFlag = useCallback((flagKey: string, value: boolean) => {
    setFlags((current) => ({
      ...current,
      [flagKey]: value,
    }));
  }, []);

  // PERFORMANCE: Memoize context value to prevent unnecessary re-renders
  const value: FeatureFlagContextValue = useMemo(() => ({
    flags,
    isLoading,
    isEnabled,
    setFlag,
    refreshFlags,
  }), [flags, isLoading, isEnabled, setFlag, refreshFlags]);

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

/**
 * Hook to access the feature flag context.
 */
export function useFeatureFlagContext() {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlagContext must be used within a FeatureFlagProvider');
  }
  return context;
}
