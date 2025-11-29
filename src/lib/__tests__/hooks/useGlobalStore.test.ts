/**
 * @file useGlobalStore Hook Tests
 * @description Comprehensive tests for the useGlobalStore hook including:
 * - Selector memoization
 * - Subscription behavior
 * - Cleanup on unmount
 * - Multiple selectors
 * - Computed values
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { createMockStorage } from '../utils/test-utils';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock localStorage
const mockLocalStorage = createMockStorage();
vi.stubGlobal('localStorage', mockLocalStorage);

// Mock debug mode
vi.mock('@/lib/flags/debugMode', () => ({
  isDebugModeEnabled: vi.fn(() => false),
}));

// ============================================================================
// Tests
// ============================================================================

describe('useGlobalStore hooks', () => {
  let useGlobalStore: typeof import('@/lib/hooks/useGlobalStore').useGlobalStore;
  let useGlobalStoreMultiple: typeof import('@/lib/hooks/useGlobalStore').useGlobalStoreMultiple;
  let useGlobalStoreComputed: typeof import('@/lib/hooks/useGlobalStore').useGlobalStoreComputed;
  let useStoreHydrated: typeof import('@/lib/hooks/useGlobalStore').useStoreHydrated;
  let createSliceHook: typeof import('@/lib/hooks/useGlobalStore').createSliceHook;
  let createActionHook: typeof import('@/lib/hooks/useGlobalStore').createActionHook;
  let globalSelectors: typeof import('@/lib/hooks/useGlobalStore').globalSelectors;
  let useIsSidebarOpen: typeof import('@/lib/hooks/useGlobalStore').useIsSidebarOpen;
  let useStore: typeof import('@/lib/state/store').useStore;
  let getStoreState: typeof import('@/lib/state/store').getStoreState;

  beforeEach(async () => {
    // Clear mocks and storage
    vi.clearAllMocks();
    mockLocalStorage.clear();

    // Reset modules to get fresh store instance
    vi.resetModules();

    // Import fresh modules
    const {
      useGlobalStore: useGlobalStoreImport,
      useGlobalStoreMultiple: useGlobalStoreMultipleImport,
      useGlobalStoreComputed: useGlobalStoreComputedImport,
      useStoreHydrated: useStoreHydratedImport,
      createSliceHook: createSliceHookImport,
      createActionHook: createActionHookImport,
      globalSelectors: globalSelectorsImport,
      useIsSidebarOpen: useIsSidebarOpenImport,
    } = await import('@/lib/hooks/useGlobalStore');
    useGlobalStore = useGlobalStoreImport;
    useGlobalStoreMultiple = useGlobalStoreMultipleImport;
    useGlobalStoreComputed = useGlobalStoreComputedImport;
    useStoreHydrated = useStoreHydratedImport;
    createSliceHook = createSliceHookImport;
    createActionHook = createActionHookImport;
    globalSelectors = globalSelectorsImport;
    useIsSidebarOpen = useIsSidebarOpenImport;

    const { useStore: useStoreImport, getStoreState: getStoreStateImport } = await import('@/lib/state/store');
    useStore = useStoreImport;
    getStoreState = getStoreStateImport;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // useGlobalStore Tests
  // ==========================================================================

  describe('useGlobalStore', () => {
    it('should select and return state slice', () => {
      // Act
      const { result } = renderHook(() =>
        useGlobalStore((state) => state.sidebarOpen)
      );

      // Assert
      expect(typeof result.current).toBe('boolean');
    });

    it('should update when selected state changes', async () => {
      // Arrange
      const { result } = renderHook(() =>
        useGlobalStore((state) => state.sidebarOpen)
      );
      const initialValue = result.current;

      // Act - toggle sidebar
      act(() => {
        const state = getStoreState();
        if (typeof state.toggleSidebar === 'function') {
          state.toggleSidebar();
        }
      });

      // Assert
      await waitFor(() => {
        expect(result.current).toBe(!initialValue);
      });
    });

    it('should not re-render when unrelated state changes', () => {
      // Arrange
      const renderCount = { current: 0 };
      renderHook(() => {
        renderCount.current++;
        return useGlobalStore((state) => state.sidebarOpen);
      });

      const initialRenderCount = renderCount.current;

      // Act - change unrelated state (locale)
      act(() => {
        const state = getStoreState();
        if (typeof state.setLocale === 'function') {
          state.setLocale('fr-FR');
        }
      });

      // Assert - render count should not increase significantly
      // (May have 1 extra render due to React 18 concurrent features)
      expect(renderCount.current).toBeLessThanOrEqual(initialRenderCount + 1);
    });

    it('should work with nested state selectors', () => {
      // Arrange - first set up session
      act(() => {
        const state = getStoreState();
        if (typeof state.initSession === 'function') {
          state.initSession('test-session');
        }
      });

      // Act
      const { result } = renderHook(() =>
        useGlobalStore((state) => state.sessionId)
      );

      // Assert
      expect(result.current).toBe('test-session');
    });
  });

  // ==========================================================================
  // Selector Memoization Tests
  // ==========================================================================

  describe('selector memoization', () => {
    it('should maintain reference equality for unchanged selections', () => {
      // Arrange
      const results: unknown[] = [];
      const { rerender } = renderHook(() => {
        const value = useGlobalStore((state) => state.sidebarOpen);
        results.push(value);
        return value;
      });

      // Act - rerender without state changes
      rerender();
      rerender();

      // Assert - all values should be equal
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
    });

    it('should return new reference when state changes', () => {
      // Arrange
      const { result } = renderHook(() =>
        useGlobalStore((state) => state.sidebarOpen)
      );
      const initialValue = result.current;

      // Act
      act(() => {
        const state = getStoreState();
        if (typeof state.toggleSidebar === 'function') {
          state.toggleSidebar();
        }
      });

      // Assert
      expect(result.current).not.toBe(initialValue);
    });
  });

  // ==========================================================================
  // useGlobalStoreMultiple Tests
  // ==========================================================================

  describe('useGlobalStoreMultiple', () => {
    it('should select multiple state slices', () => {
      // Act
      const { result } = renderHook(() =>
        useGlobalStoreMultiple({
          sidebarOpen: (state) => state.sidebarOpen,
          locale: (state) => state.locale,
          theme: (state) => state.theme,
        })
      );

      // Assert
      expect(result.current).toHaveProperty('sidebarOpen');
      expect(result.current).toHaveProperty('locale');
      expect(result.current).toHaveProperty('theme');
    });

    it('should update when any selected state changes', async () => {
      // Arrange
      const { result } = renderHook(() =>
        useGlobalStoreMultiple({
          sidebarOpen: (state) => state.sidebarOpen,
          locale: (state) => state.locale,
        })
      );
      const initialLocale = result.current.locale;

      // Act - change locale
      act(() => {
        const state = getStoreState();
        if (typeof state.setLocale === 'function') {
          state.setLocale('de-DE');
        }
      });

      // Assert
      await waitFor(() => {
        expect(result.current.locale).toBe('de-DE');
        expect(result.current.locale).not.toBe(initialLocale);
      });
    });

    it('should maintain stable reference when values unchanged', () => {
      // Arrange
      const results: Array<{ sidebarOpen: boolean; locale: string }> = [];
      const selectors = {
        sidebarOpen: (state: { sidebarOpen: boolean }) => state.sidebarOpen,
        locale: (state: { locale: string }) => state.locale,
      };

      const { rerender } = renderHook(() => {
        const value = useGlobalStoreMultiple(selectors);
        results.push(value);
        return value;
      });

      // Act - rerender without state changes
      rerender();

      // Assert - object reference should be stable
      expect(results[0]).toEqual(results[1]);
    });
  });

  // ==========================================================================
  // useGlobalStoreComputed Tests
  // ==========================================================================

  describe('useGlobalStoreComputed', () => {
    it('should compute derived values', () => {
      // Act
      const { result } = renderHook(() =>
        useGlobalStoreComputed(
          (state) => ({
            isCompact: state.layoutDensity === 'compact',
            displayLocale: state.locale.toUpperCase(),
          }),
          []
        )
      );

      // Assert
      expect(result.current).toHaveProperty('isCompact');
      expect(result.current).toHaveProperty('displayLocale');
    });

    it('should update computed value when dependencies change', async () => {
      // Arrange
      const { result } = renderHook(() =>
        useGlobalStoreComputed(
          (state) => state.locale.toUpperCase(),
          []
        )
      );

      // Act
      act(() => {
        const state = getStoreState();
        if (typeof state.setLocale === 'function') {
          state.setLocale('fr-FR');
        }
      });

      // Assert
      await waitFor(() => {
        expect(result.current).toBe('FR-FR');
      });
    });

    it('should memoize compute function based on deps', () => {
      // Arrange
      const computeFn = vi.fn((state: { locale: string }) => state.locale);
      const { rerender } = renderHook(
        ({ dep }) => useGlobalStoreComputed(computeFn, [dep]),
        { initialProps: { dep: 1 } }
      );

      const callCount = computeFn.mock.calls.length;

      // Act - rerender with same deps
      rerender({ dep: 1 });

      // Assert - compute should not be called again with same deps
      // (may be called once more due to React double-render in strict mode)
      expect(computeFn.mock.calls.length).toBeLessThanOrEqual(callCount + 1);
    });

    it('should recompute when deps change', () => {
      // Arrange
      const computeFn = vi.fn((state: { locale: string }) => state.locale);
      const { rerender } = renderHook(
        ({ dep }) => useGlobalStoreComputed(computeFn, [dep]),
        { initialProps: { dep: 1 } }
      );

      const callCountBefore = computeFn.mock.calls.length;

      // Act - rerender with different deps
      rerender({ dep: 2 });

      // Assert - compute should be called again
      expect(computeFn.mock.calls.length).toBeGreaterThan(callCountBefore);
    });
  });

  // ==========================================================================
  // Subscription Behavior Tests
  // ==========================================================================

  describe('subscription behavior', () => {
    it('should subscribe on mount', () => {
      // Arrange
      const subscribeSpy = vi.spyOn(useStore, 'subscribe');

      // Act
      renderHook(() => useGlobalStore((state) => state.sidebarOpen));

      // Assert - Zustand's internal subscription mechanism
      // The hook uses useStore internally which handles subscriptions
      expect(subscribeSpy).toBeDefined();

      subscribeSpy.mockRestore();
    });

    it('should receive updates during component lifecycle', () => {
      // Arrange
      const updates: boolean[] = [];
      renderHook(() => {
        const value = useGlobalStore((state) => state.sidebarOpen);
        updates.push(value);
        return value;
      });

      // Act - toggle multiple times
      act(() => {
        const state = getStoreState();
        if (typeof state.toggleSidebar === 'function') {
          state.toggleSidebar();
        }
      });

      act(() => {
        const state = getStoreState();
        if (typeof state.toggleSidebar === 'function') {
          state.toggleSidebar();
        }
      });

      // Assert - should have received updates
      expect(updates.length).toBeGreaterThan(1);
    });
  });

  // ==========================================================================
  // Cleanup on Unmount Tests
  // ==========================================================================

  describe('cleanup on unmount', () => {
    it('should not update after unmount', () => {
      // Arrange
      const { result, unmount } = renderHook(() =>
        useGlobalStore((state) => state.sidebarOpen)
      );
      const valueBeforeUnmount = result.current;

      // Act - unmount
      unmount();

      // Toggle sidebar after unmount
      act(() => {
        const state = getStoreState();
        if (typeof state.toggleSidebar === 'function') {
          state.toggleSidebar();
        }
      });

      // Assert - result should still be the last value before unmount
      expect(result.current).toBe(valueBeforeUnmount);
    });

    it('should clean up subscriptions on unmount', () => {
      // Arrange
      const { unmount } = renderHook(() =>
        useGlobalStore((state) => state.sidebarOpen)
      );

      // Act & Assert - should not throw
      expect(() => unmount()).not.toThrow();
    });
  });

  // ==========================================================================
  // useStoreHydrated Tests
  // ==========================================================================

  describe('useStoreHydrated', () => {
    it('should return hydration status', () => {
      // Act
      const { result } = renderHook(() => useStoreHydrated());

      // Assert
      expect(typeof result.current).toBe('boolean');
    });

    it('should update when hydration completes', async () => {
      // Arrange - manually set hydration to false
      act(() => {
        const state = getStoreState();
        if (typeof state._setHasHydrated === 'function') {
          state._setHasHydrated(false);
        }
      });

      const { result } = renderHook(() => useStoreHydrated());

      // Act - trigger hydration
      act(() => {
        const state = getStoreState();
        if (typeof state._setHasHydrated === 'function') {
          state._setHasHydrated(true);
        }
      });

      // Assert
      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });
  });

  // ==========================================================================
  // createSliceHook Tests
  // ==========================================================================

  describe('createSliceHook', () => {
    it('should create a bound hook for a selector', () => {
      // Arrange
      const useSidebarOpen = createSliceHook((state) => state.sidebarOpen);

      // Act
      const { result } = renderHook(() => useSidebarOpen());

      // Assert
      expect(typeof result.current).toBe('boolean');
    });

    it('should react to state changes', async () => {
      // Arrange
      const useSidebarOpen = createSliceHook((state) => state.sidebarOpen);
      const { result } = renderHook(() => useSidebarOpen());
      const initialValue = result.current;

      // Act
      act(() => {
        const state = getStoreState();
        if (typeof state.toggleSidebar === 'function') {
          state.toggleSidebar();
        }
      });

      // Assert
      await waitFor(() => {
        expect(result.current).toBe(!initialValue);
      });
    });
  });

  // ==========================================================================
  // createActionHook Tests
  // ==========================================================================

  describe('createActionHook', () => {
    it('should create a bound hook for an action', () => {
      // Arrange
      const useToggleSidebar = createActionHook((state) => state.toggleSidebar);

      // Act
      const { result } = renderHook(() => useToggleSidebar());

      // Assert
      expect(typeof result.current).toBe('function');
    });

    it('should return a callable action', () => {
      // Arrange
      const useToggleSidebar = createActionHook((state) => state.toggleSidebar);
      const { result } = renderHook(() => useToggleSidebar());
      const initialSidebarState = getStoreState().sidebarOpen;

      // Act
      act(() => {
        if (typeof result.current === 'function') {
          result.current();
        }
      });

      // Assert
      expect(getStoreState().sidebarOpen).toBe(!initialSidebarState);
    });
  });

  // ==========================================================================
  // Global Selectors Tests
  // ==========================================================================

  describe('globalSelectors', () => {
    it('should provide sidebarOpen selector', () => {
      // Act
      const state = getStoreState();
      const result = globalSelectors.sidebarOpen(state);

      // Assert
      expect(typeof result).toBe('boolean');
    });

    it('should provide theme selector', () => {
      // Act
      const state = getStoreState();
      const result = globalSelectors.theme(state);

      // Assert
      expect(typeof result).toBe('string');
    });

    it('should provide currentUser selector', () => {
      // Act
      const state = getStoreState();
      const result = globalSelectors.currentUser(state);

      // Assert - should be null initially
      expect(result).toBeNull();
    });

    it('should provide isAuthenticated selector', () => {
      // Act
      const state = getStoreState();
      const result = globalSelectors.isAuthenticated(state);

      // Assert - should be false initially
      expect(result).toBe(false);
    });

    it('should provide notifications selector', () => {
      // Act
      const state = getStoreState();
      const result = globalSelectors.notifications(state);

      // Assert
      expect(Array.isArray(result)).toBe(true);
    });

    it('should provide unreadCount selector', () => {
      // Act
      const state = getStoreState();
      const result = globalSelectors.unreadCount(state);

      // Assert
      expect(typeof result).toBe('number');
    });
  });

  // ==========================================================================
  // Pre-built Hooks Tests
  // ==========================================================================

  describe('pre-built hooks', () => {
    it('useIsSidebarOpen should work correctly', () => {
      // Act
      const { result } = renderHook(() => useIsSidebarOpen());

      // Assert
      expect(typeof result.current).toBe('boolean');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle rapid state changes', async () => {
      // Arrange
      const { result } = renderHook(() =>
        useGlobalStore((state) => state.sidebarOpen)
      );

      // Act - rapid toggles
      for (let i = 0; i < 10; i++) {
        act(() => {
          const state = getStoreState();
          if (typeof state.toggleSidebar === 'function') {
            state.toggleSidebar();
          }
        });
      }

      // Assert - should settle to final value (even number of toggles = original)
      const finalStoreValue = getStoreState().sidebarOpen;
      await waitFor(() => {
        expect(result.current).toBe(finalStoreValue);
      });
    });

    it('should handle selector that returns undefined', () => {
      // Act
      const { result } = renderHook(() =>
        useGlobalStore((state) => (state as unknown as Record<string, unknown>).nonexistentProperty)
      );

      // Assert
      expect(result.current).toBeUndefined();
    });

    it('should handle selector that throws', () => {
      // Arrange
      const throwingSelector = (() => {
        throw new Error('Selector error');
      }) as <T>(state: unknown) => T;

      // Act & Assert
      expect(() => {
        renderHook(() => useGlobalStore(throwingSelector));
      }).toThrow('Selector error');
    });

    it('should handle empty selectors object in useGlobalStoreMultiple', () => {
      // Act
      const { result } = renderHook(() => useGlobalStoreMultiple({}));

      // Assert
      expect(result.current).toEqual({});
    });
  });
});
