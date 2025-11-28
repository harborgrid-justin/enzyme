/**
 * @fileoverview useLayoutMode Hook
 *
 * Hook for managing layout mode state with locking capabilities.
 * Allows manual override of automatic layout mode selection.
 *
 * @module layouts/adaptive/hooks/useLayoutMode
 * @version 1.0.0
 */

import { useCallback, useRef, useState } from 'react';
import type { LayoutMode, UseLayoutModeReturn } from '../types.ts';

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Options for useLayoutMode hook.
 */
export interface UseLayoutModeOptions {
  /** Initial layout mode */
  initialMode?: LayoutMode;
  /** Callback when mode changes */
  onChange?: (mode: LayoutMode, previousMode: LayoutMode | null) => void;
  /** Whether to start in locked mode */
  initiallyLocked?: boolean;
}

/**
 * Hook for managing layout mode with locking capabilities.
 *
 * @param options - Hook configuration options
 * @returns Layout mode state and controls
 *
 * @example
 * ```tsx
 * function LayoutControls() {
 *   const {
 *     mode,
 *     previousMode,
 *     setMode,
 *     isLocked,
 *     lockMode,
 *     unlockMode
 *   } = useLayoutMode({
 *     initialMode: 'grid',
 *     onChange: (mode) => console.log('Mode changed to:', mode)
 *   });
 *
 *   return (
 *     <div>
 *       <select value={mode} onChange={(e) => setMode(e.target.value as LayoutMode)}>
 *         <option value="grid">Grid</option>
 *         <option value="list">List</option>
 *         <option value="compact">Compact</option>
 *       </select>
 *       <button onClick={isLocked ? unlockMode : lockMode}>
 *         {isLocked ? 'Unlock' : 'Lock'} Mode
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useLayoutMode(options: UseLayoutModeOptions = {}): UseLayoutModeReturn {
  const {
    initialMode = 'grid',
    onChange,
    initiallyLocked = false,
  } = options;

  // State
  const [mode, setModeState] = useState<LayoutMode>(initialMode);
  const [isLocked, setIsLocked] = useState(initiallyLocked);
  const [previousMode, setPreviousMode] = useState<LayoutMode | null>(null);

  // Refs
  const previousModeRef = useRef<LayoutMode | null>(null);

  // Set mode
  const setMode = useCallback((newMode: LayoutMode) => {
    const prevMode = mode;

    if (newMode !== prevMode) {
      previousModeRef.current = prevMode;
      setPreviousMode(prevMode);
      setModeState(newMode);
      onChange?.(newMode, prevMode);
    }
  }, [mode, onChange]);

  // Lock mode
  const lockMode = useCallback(() => {
    setIsLocked(true);
  }, []);

  // Unlock mode
  const unlockMode = useCallback(() => {
    setIsLocked(false);
  }, []);

  return {
    mode,
    previousMode,
    setMode,
    isLocked,
    lockMode,
    unlockMode,
  };
}

// =============================================================================
// HELPER HOOKS
// =============================================================================

/**
 * Hook that returns true when layout mode matches the specified mode.
 *
 * @param targetMode - The mode to check against
 * @param currentMode - The current layout mode
 * @returns Whether the current mode matches the target
 *
 * @example
 * ```tsx
 * function GridOnlyContent({ currentMode }: { currentMode: LayoutMode }) {
 *   const isGrid = useIsLayoutMode('grid', currentMode);
 *
 *   if (!isGrid) return null;
 *
 *   return <GridSpecificContent />;
 * }
 * ```
 */
export function useIsLayoutMode(targetMode: LayoutMode, currentMode: LayoutMode): boolean {
  return currentMode === targetMode;
}

/**
 * Hook that returns the appropriate value based on current layout mode.
 *
 * @param modeValues - Object mapping layout modes to values
 * @param currentMode - The current layout mode
 * @param defaultValue - Default value if mode not found
 * @returns The value for the current mode
 *
 * @example
 * ```tsx
 * function AdaptiveComponent({ currentMode }: { currentMode: LayoutMode }) {
 *   const columns = useLayoutModeValue(
 *     {
 *       grid: 4,
 *       list: 1,
 *       compact: 6,
 *       expanded: 2,
 *       dense: 8,
 *       sparse: 1,
 *     },
 *     currentMode,
 *     3
 *   );
 *
 *   return <Grid columns={columns}>{children}</Grid>;
 * }
 * ```
 */
export function useLayoutModeValue<T>(
  modeValues: Partial<Record<LayoutMode, T>>,
  currentMode: LayoutMode,
  defaultValue: T
): T {
  return modeValues[currentMode] ?? defaultValue;
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { UseLayoutModeReturn };
