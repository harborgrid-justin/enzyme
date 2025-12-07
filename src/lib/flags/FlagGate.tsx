import { type ReactNode, useMemo, memo } from 'react';
import { useFeatureFlagContext } from './FeatureFlagProvider';
import type { FlagKey } from './flag-keys';

interface FlagGateProps {
  /** The feature flag to check */
  flag: FlagKey | string;
  /** Content to render when flag is enabled */
  children: ReactNode;
  /** Content to render when flag is disabled */
  fallback?: ReactNode;
  /** Invert the check (show children when flag is disabled) */
  invert?: boolean;
}

/**
 * Conditional renderer: <FlagGate flag="x" fallback="...">children</FlagGate>
 * Memoized for performance optimization.
 */
export const FlagGate = memo(
  ({ flag, children, fallback = null, invert = false }: FlagGateProps) => {
    const { isEnabled } = useFeatureFlagContext();
    const flagEnabled = isEnabled(flag);
    const shouldRender = invert ? !flagEnabled : flagEnabled;

    return <>{shouldRender ? children : fallback}</>;
  }
);

FlagGate.displayName = 'FlagGate';

/**
 * Render children only when ALL specified flags are enabled.
 * Memoized for performance optimization.
 *
 * Note: Uses context-based flag checking to comply with Rules of Hooks.
 * Hooks must not be called inside loops, conditions, or nested functions.
 */
export const FlagGateAll = memo(
  ({
    flags,
    children,
    fallback = null,
  }: {
    flags: (FlagKey | string)[];
    children: ReactNode;
    fallback?: ReactNode;
  }) => {
    const { isEnabled } = useFeatureFlagContext();

    const allEnabled = useMemo(() => flags.every((flag) => isEnabled(flag)), [flags, isEnabled]);

    return <>{allEnabled ? children : fallback}</>;
  }
);

FlagGateAll.displayName = 'FlagGateAll';

/**
 * Render children when ANY of the specified flags are enabled.
 * Memoized for performance optimization.
 *
 * Note: Uses context-based flag checking to comply with Rules of Hooks.
 * Hooks must not be called inside loops, conditions, or nested functions.
 */
export const FlagGateAny = memo(
  ({
    flags,
    children,
    fallback = null,
  }: {
    flags: (FlagKey | string)[];
    children: ReactNode;
    fallback?: ReactNode;
  }) => {
    const { isEnabled } = useFeatureFlagContext();

    const anyEnabled = useMemo(() => flags.some((flag) => isEnabled(flag)), [flags, isEnabled]);

    return <>{anyEnabled ? children : fallback}</>;
  }
);

FlagGateAny.displayName = 'FlagGateAny';
