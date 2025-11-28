import { type ComponentType } from 'react';
import { useFeatureFlag } from './useFeatureFlag';
import type { FlagKey } from './flagKeys';

interface WithFeatureFlagOptions {
  /** The feature flag to check */
  flag: FlagKey | string;
  /** Component to render when flag is disabled */
  fallback?: ComponentType;
}

/**
 * HOC to gate components by feature flag.
 */
export function withFeatureFlag<P extends object>(
  Component: ComponentType<P>,
  options: WithFeatureFlagOptions
) {
  const { flag, fallback: FallbackComponent } = options;

  return function WithFeatureFlag(props: P) {
    const isEnabled = useFeatureFlag(flag);

    if (!isEnabled) {
      return FallbackComponent ? <FallbackComponent /> : null;
    }

    return <Component {...props} />;
  };
}

/**
 * HOC to invert the feature flag check (show when flag is disabled).
 */
export function withoutFeatureFlag<P extends object>(
  Component: ComponentType<P>,
  options: WithFeatureFlagOptions
) {
  const { flag, fallback: FallbackComponent } = options;

  return function WithoutFeatureFlag(props: P) {
    const isEnabled = useFeatureFlag(flag);

    if (isEnabled) {
      return FallbackComponent ? <FallbackComponent /> : null;
    }

    return <Component {...props} />;
  };
}
