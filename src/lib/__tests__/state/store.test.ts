/**
 * @file Store Tests
 * @description Comprehensive tests for the Zustand store including:
 * - Hydration flow
 * - Feature store registration
 * - Reset functionality
 * - Subscription cleanup
 * - State persistence
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { flushPromises, createMockStorage } from '../utils/test-utils';

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

describe('Store', () => {
  let useStore: typeof import('@/lib/state/store').useStore;
  let getStoreState: typeof import('@/lib/state/store').getStoreState;
  let subscribeToStore: typeof import('@/lib/state/store').subscribeToStore;
  let hasStoreHydrated: typeof import('@/lib/state/store').hasStoreHydrated;
  let waitForHydration: typeof import('@/lib/state/store').waitForHydration;
  let resetStore: typeof import('@/lib/state/store').resetStore;
  let clearPersistedStore: typeof import('@/lib/state/store').clearPersistedStore;
  let registerFeatureStore: typeof import('@/lib/state/store').registerFeatureStore;
  let unregisterFeatureStore: typeof import('@/lib/state/store').unregisterFeatureStore;
  let getFeatureStore: typeof import('@/lib/state/store').getFeatureStore;
  let getFeatureStoreNames: typeof import('@/lib/state/store').getFeatureStoreNames;
  let resetAllFeatureStores: typeof import('@/lib/state/store').resetAllFeatureStores;

  beforeEach(async () => {
    // Clear mocks and storage
    vi.clearAllMocks();
    mockLocalStorage.clear();

    // Reset modules to get fresh store instance
    vi.resetModules();

    // Import fresh store module
    const storeModule = await import('@/lib/state/store');
    useStore = storeModule.useStore;
    getStoreState = storeModule.getStoreState;
    subscribeToStore = storeModule.subscribeToStore;
    hasStoreHydrated = storeModule.hasStoreHydrated;
    waitForHydration = storeModule.waitForHydration;
    resetStore = storeModule.resetStore;
    clearPersistedStore = storeModule.clearPersistedStore;
    registerFeatureStore = storeModule.registerFeatureStore;
    unregisterFeatureStore = storeModule.unregisterFeatureStore;
    getFeatureStore = storeModule.getFeatureStore;
    getFeatureStoreNames = storeModule.getFeatureStoreNames;
    resetAllFeatureStores = storeModule.resetAllFeatureStores;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Basic Store Tests
  // ==========================================================================

  describe('basic store operations', () => {
    it('should have initial state defined', () => {
      // Act
      const state = getStoreState();

      // Assert - check some expected initial values
      expect(state).toBeDefined();
      expect(typeof state.sidebarOpen).toBe('boolean');
    });

    it('should allow reading state with useStore', () => {
      // Act
      const state = useStore.getState();

      // Assert
      expect(state).toBeDefined();
    });

    it('should allow selecting specific state slices', () => {
      // Act
      const {sidebarOpen} = useStore.getState();

      // Assert
      expect(typeof sidebarOpen).toBe('boolean');
    });
  });

  // ==========================================================================
  // Hydration Flow Tests
  // ==========================================================================

  describe('hydration flow', () => {
    it('should track hydration state', async () => {
      // Act - wait a tick for persistence to potentially run
      await flushPromises();

      // Assert - hydration should eventually complete
      const state = getStoreState();
      expect(typeof state._hasHydrated).toBe('boolean');
    });

    it('should provide hasStoreHydrated utility', () => {
      // Act
      const result = hasStoreHydrated();

      // Assert
      expect(typeof result).toBe('boolean');
    });

    it('should resolve waitForHydration when hydrated', async () => {
      // Arrange
      const state = getStoreState();

      // If already hydrated, should resolve immediately
      if (state._hasHydrated) {
        // Act & Assert
        await expect(waitForHydration()).resolves.toBeUndefined();
      } else {
        // Manually trigger hydration
        act(() => {
          state._setHasHydrated(true);
        });

        // Should now resolve
        await expect(waitForHydration()).resolves.toBeUndefined();
      }
    });

    it('should set _hasHydrated via _setHasHydrated', () => {
      // Arrange
      const state = getStoreState();

      // Act
      act(() => {
        state._setHasHydrated(true);
      });

      // Assert
      expect(getStoreState()._hasHydrated).toBe(true);
    });

    it('should wait for hydration before accessing persisted state', async () => {
      // Arrange - set up persisted data
      const persistedData = {
        state: {
          sidebarOpen: false,
          locale: 'fr-FR',
        },
        version: 4,
      };
      mockLocalStorage._store.set('app-store', JSON.stringify(persistedData));

      // Reset modules to pick up persisted data
      vi.resetModules();
      const freshModule = await import('@/lib/state/store');

      // Act
      await freshModule.waitForHydration();

      // Assert - should complete without error
      expect(freshModule.hasStoreHydrated()).toBe(true);
    });
  });

  // ==========================================================================
  // Feature Store Registration Tests
  // ==========================================================================

  describe('feature store registration', () => {
    it('should register a feature store', () => {
      // Arrange
      const mockStore = { getState: vi.fn() };

      // Act
      registerFeatureStore('testFeature', mockStore as any);

      // Assert
      expect(getFeatureStore('testFeature')).toBe(mockStore);
    });

    it('should unregister a feature store', () => {
      // Arrange
      const mockStore = { getState: vi.fn() };
      registerFeatureStore('testFeature', mockStore as any);

      // Act
      unregisterFeatureStore('testFeature');

      // Assert
      expect(getFeatureStore('testFeature')).toBeUndefined();
    });

    it('should return all registered feature store names', () => {
      // Arrange
      const mockStore1 = { getState: vi.fn() };
      const mockStore2 = { getState: vi.fn() };
      registerFeatureStore('feature1', mockStore1 as any);
      registerFeatureStore('feature2', mockStore2 as any);

      // Act
      const names = getFeatureStoreNames();

      // Assert
      expect(names).toContain('feature1');
      expect(names).toContain('feature2');
    });

    it('should warn when registering duplicate store name', () => {
      // Arrange
      const mockStore1 = { getState: vi.fn() };
      const mockStore2 = { getState: vi.fn() };
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      registerFeatureStore('duplicate', mockStore1 as any);

      // Act
      registerFeatureStore('duplicate', mockStore2 as any);

      // Assert
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('"duplicate" already registered')
      );

      warnSpy.mockRestore();
    });

    it('should return undefined for unregistered feature store', () => {
      // Act
      const result = getFeatureStore('nonexistent');

      // Assert
      expect(result).toBeUndefined();
    });
  });

  // ==========================================================================
  // Reset Functionality Tests
  // ==========================================================================

  describe('reset functionality', () => {
    it('should reset store state via resetStore', () => {
      // Arrange - modify some state
      const state = getStoreState();
      act(() => {
        if (typeof state.setGlobalLoading === 'function') {
          state.setGlobalLoading(true);
        }
      });

      // Act
      act(() => {
        resetStore();
      });

      // Assert - state should be reset
      const newState = getStoreState();
      expect(newState.globalLoading).toBe(false);
    });

    it('should reset all feature stores', () => {
      // Arrange
      const resetFn = vi.fn();
      const mockStore = {
        getState: () => ({ reset: resetFn }),
      };
      registerFeatureStore('resettable', mockStore as any);

      // Act
      resetAllFeatureStores();

      // Assert
      expect(resetFn).toHaveBeenCalled();
    });

    it('should reset all feature stores with _reset method', () => {
      // Arrange
      const resetFn = vi.fn();
      const mockStore = {
        getState: () => ({ _reset: resetFn }),
      };
      registerFeatureStore('resettableAlt', mockStore as any);

      // Act
      resetAllFeatureStores();

      // Assert
      expect(resetFn).toHaveBeenCalled();
    });

    it('should clear feature store registry when clearRegistry is true', () => {
      // Arrange
      const mockStore = { getState: () => ({}) };
      registerFeatureStore('toClear', mockStore as any);

      // Act
      resetAllFeatureStores(true);

      // Assert
      expect(getFeatureStoreNames()).not.toContain('toClear');
    });

    it('should keep registry when clearRegistry is false', () => {
      // Arrange
      const mockStore = { getState: () => ({}) };
      registerFeatureStore('toKeep', mockStore as any);

      // Act
      resetAllFeatureStores(false);

      // Assert
      expect(getFeatureStoreNames()).toContain('toKeep');
    });
  });

  // ==========================================================================
  // Subscription Cleanup Tests
  // ==========================================================================

  describe('subscription cleanup', () => {
    it('should subscribe to store changes', () => {
      // Arrange
      const callback = vi.fn();

      // Act
      const unsubscribe = subscribeToStore(
        (state) => state.sidebarOpen,
        callback
      );

      // Toggle sidebar to trigger subscription
      const state = getStoreState();
      act(() => {
        if (typeof state.toggleSidebar === 'function') {
          state.toggleSidebar();
        }
      });

      // Assert
      expect(callback).toHaveBeenCalled();

      // Cleanup
      unsubscribe();
    });

    it('should stop receiving updates after unsubscribe', () => {
      // Arrange
      const callback = vi.fn();
      const unsubscribe = subscribeToStore(
        (state) => state.sidebarOpen,
        callback
      );

      // Unsubscribe
      unsubscribe();
      callback.mockClear();

      // Toggle sidebar
      const state = getStoreState();
      act(() => {
        if (typeof state.toggleSidebar === 'function') {
          state.toggleSidebar();
        }
      });

      // Assert - callback should not be called after unsubscribe
      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple concurrent subscriptions', () => {
      // Arrange
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsubscribe1 = subscribeToStore(
        (state) => state.sidebarOpen,
        callback1
      );
      const unsubscribe2 = subscribeToStore(
        (state) => state.sidebarOpen,
        callback2
      );

      // Act - toggle sidebar
      const state = getStoreState();
      act(() => {
        if (typeof state.toggleSidebar === 'function') {
          state.toggleSidebar();
        }
      });

      // Assert - both callbacks should be called
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();

      // Cleanup
      unsubscribe1();
      unsubscribe2();
    });

    it('should provide previous and current value to subscription callback', () => {
      // Arrange
      const callback = vi.fn();
      const unsubscribe = subscribeToStore(
        (state) => state.sidebarOpen,
        callback
      );

      // Get initial value
      const initialValue = getStoreState().sidebarOpen;

      // Act - toggle sidebar
      const state = getStoreState();
      act(() => {
        if (typeof state.toggleSidebar === 'function') {
          state.toggleSidebar();
        }
      });

      // Assert - callback receives new value and previous value
      expect(callback).toHaveBeenCalledWith(
        !initialValue, // new value
        initialValue   // previous value
      );

      // Cleanup
      unsubscribe();
    });
  });

  // ==========================================================================
  // Persistence Tests
  // ==========================================================================

  describe('persistence', () => {
    it('should clear persisted store from localStorage', () => {
      // Arrange
      mockLocalStorage._store.set('app-store', '{"test": true}');

      // Act
      clearPersistedStore();

      // Assert
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('app-store');
    });

    it('should handle clearPersistedStore when localStorage is undefined', () => {
      // Arrange - temporarily remove localStorage
      const originalLocalStorage = globalThis.localStorage;
      Object.defineProperty(globalThis, 'localStorage', {
        value: undefined,
        writable: true,
      });

      // Act & Assert - should not throw
      expect(() => clearPersistedStore()).not.toThrow();

      // Restore
      Object.defineProperty(globalThis, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });
  });

  // ==========================================================================
  // State Slice Tests
  // ==========================================================================

  describe('UI slice', () => {
    it('should toggle sidebar', () => {
      // Arrange
      const initialValue = getStoreState().sidebarOpen;

      // Act
      act(() => {
        const state = getStoreState();
        if (typeof state.toggleSidebar === 'function') {
          state.toggleSidebar();
        }
      });

      // Assert
      expect(getStoreState().sidebarOpen).toBe(!initialValue);
    });

    it('should set global loading state', () => {
      // Arrange
      expect(getStoreState().globalLoading).toBe(false);

      // Act
      act(() => {
        const state = getStoreState();
        if (typeof state.setGlobalLoading === 'function') {
          state.setGlobalLoading(true);
        }
      });

      // Assert
      expect(getStoreState().globalLoading).toBe(true);
    });

    it('should manage modals', () => {
      // Act - open modal
      act(() => {
        const state = getStoreState();
        if (typeof state.openModal === 'function') {
          state.openModal('testModal');
        }
      });

      // Assert
      expect(getStoreState().activeModal).toBe('testModal');

      // Act - close modal
      act(() => {
        const state = getStoreState();
        if (typeof state.closeModal === 'function') {
          state.closeModal();
        }
      });

      // Assert
      expect(getStoreState().activeModal).toBeNull();
    });
  });

  describe('Settings slice', () => {
    it('should set locale', () => {
      // Act
      act(() => {
        const state = getStoreState();
        if (typeof state.setLocale === 'function') {
          state.setLocale('fr-FR');
        }
      });

      // Assert
      expect(getStoreState().locale).toBe('fr-FR');
    });

    it('should set theme', () => {
      // Act
      act(() => {
        const state = getStoreState();
        if (typeof state.setTheme === 'function') {
          state.setTheme('dark');
        }
      });

      // Assert
      expect(getStoreState().theme).toBe('dark');
    });

    it('should reset settings to defaults', () => {
      // Arrange - change some settings
      act(() => {
        const state = getStoreState();
        if (typeof state.setLocale === 'function') {
          state.setLocale('de-DE');
        }
        if (typeof state.setTheme === 'function') {
          state.setTheme('dark');
        }
      });

      // Act
      act(() => {
        const state = getStoreState();
        if (typeof state.resetSettings === 'function') {
          state.resetSettings();
        }
      });

      // Assert - should be back to defaults
      const newState = getStoreState();
      expect(newState.locale).toBe('en-US');
      expect(newState.theme).toBe('system');
    });
  });

  describe('Session slice', () => {
    it('should start session', () => {
      // Act
      act(() => {
        const state = getStoreState();
        if (typeof state.initSession === 'function') {
          state.initSession('test-session-123');
        }
      });

      // Assert
      const newState = getStoreState();
      expect(newState.sessionId).toEqual('test-session-123');
      expect(newState.sessionStartedAt).toBeDefined();
    });

    it('should end session', () => {
      // Arrange - start a session first

      act(() => {
        const state = getStoreState();
        if (typeof state.initSession === 'function') {
          state.initSession('test-session-123');
        }
      });

      // Act
      act(() => {
        const state = getStoreState();
        if (typeof state.endSession === 'function') {
          state.endSession();
        }
      });

      // Assert
      const newState = getStoreState();
      expect(newState.sessionId).toBeNull();
      expect(newState.sessionStartedAt).toBeNull();
    });

    it('should update last activity', () => {
      // Act
      const before = Date.now();
      act(() => {
        const state = getStoreState();
        if (typeof state.updateActivity === 'function') {
          state.updateActivity();
        }
      });
      const after = Date.now();

      // Assert
      const {lastActivity} = getStoreState();
      expect(lastActivity).toBeGreaterThanOrEqual(before);
      expect(lastActivity).toBeLessThanOrEqual(after);
    });
  });

  // ==========================================================================
  // DevTools Integration Tests
  // ==========================================================================

  describe('DevTools integration', () => {
    it('should not expose store to window in non-debug mode', () => {
      // Assert - window.__STORE__ should not be defined
      expect((window as any).__STORE__).toBeUndefined();
    });
  });
});
