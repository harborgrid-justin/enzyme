/**
 * @file Store Hooks
 * @description Optimized hooks for store access with shallow equality and memoization
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore, type StoreSelector } from '../store';

// ============================================================================
// Core Hooks
// ============================================================================

/**
 * Select state with custom equality function
 *
 * @example
 * ```typescript
 * const count = useStoreState((state) => state.count);
 * ```
 */
export function useStoreState<T>(
  selector: StoreSelector<T>
): T {
  return useStore(selector);
}

/**
 * Select state with shallow equality (recommended for objects/arrays)
 *
 * Use this when selecting objects or arrays to prevent unnecessary re-renders.
 *
 * @example
 * ```typescript
 * const settings = useShallowState((state) => ({
 *   locale: state.locale,
 *   timezone: state.timezone,
 * }));
 * ```
 */
export function useShallowState<T extends object>(
  selector: StoreSelector<T>
): T {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
  return useStore(selector as any);
}

/**
 * Select an action (stable reference, never causes rerender)
 *
 * @example
 * ```typescript
 * const toggleSidebar = useStoreAction((state) => state.toggleSidebar);
 * ```
 */
export function useStoreAction<T extends (...args: never[]) => unknown>(
  selector: StoreSelector<T>
): T {
  return useStore(selector);
}

// ============================================================================
// Slice Hooks
// ============================================================================

/**
 * Use UI state (shallow comparison)
 */
export function useUIState(): {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  activeModal: string | null;
  modalData: Record<string, unknown> | null;
  globalLoading: boolean;
  loadingMessage: string | null;
} {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
  return useStore(
    (state) => ({
      sidebarOpen: state.sidebarOpen,
      sidebarCollapsed: state.sidebarCollapsed,
      activeModal: state.activeModal,
      modalData: state.modalData,
      globalLoading: state.globalLoading,
      loadingMessage: state.loadingMessage,
    })
  ) as any;
}

/**
 * Use UI actions (stable references)
 */
export function useUIActions(): {
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openModal: (id: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  setGlobalLoading: (loading: boolean, message?: string) => void;
} {
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);
  const setSidebarCollapsed = useStore((s) => s.setSidebarCollapsed);
  const openModal = useStore((s) => s.openModal);
  const closeModal = useStore((s) => s.closeModal);
  const setGlobalLoading = useStore((s) => s.setGlobalLoading);

  return {
    toggleSidebar,
    setSidebarOpen,
    setSidebarCollapsed,
    openModal,
    closeModal,
    setGlobalLoading,
  };
}

/**
 * Use session state (shallow comparison)
 */
export function useSessionState(): {
  sessionId: string | null;
  isSessionActive: boolean;
  lastActivity: number | null;
  navigationHistory: string[];
} {
  return useStore(
    (state) => ({
      sessionId: state.sessionId,
      isSessionActive: state.isSessionActive,
      lastActivity: state.lastActivity,
      navigationHistory: state.navigationHistory,
    })
  ) as any;
}

/**
 * Use session actions (stable references)
 */
export function useSessionActions(): {
  initSession: (sessionId: string, options?: { expiresInMs?: number; deviceId?: string }) => void;
  updateActivity: () => void;
  endSession: () => void;
  addToHistory: (path: string) => void;
  clearHistory: () => void;
} {
  const initSession = useStore((s) => s.initSession);
  const updateActivity = useStore((s) => s.updateActivity);
  const endSession = useStore((s) => s.endSession);
  const addToHistory = useStore((s) => s.addToHistory);
  const clearHistory = useStore((s) => s.clearHistory);

  return {
    initSession,
    updateActivity,
    endSession,
    addToHistory,
    clearHistory,
  };
}

/**
 * Use settings state (shallow comparison)
 */
export function useSettingsState(): {
  locale: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: string;
} {
  return useStore(
    (state) => ({
      locale: state.locale,
      timezone: state.timezone,
      dateFormat: state.dateFormat,
      timeFormat: state.timeFormat,
      numberFormat: state.numberFormat,
      notificationsEnabled: state.notificationsEnabled,
      soundEnabled: state.soundEnabled,
      desktopNotifications: state.desktopNotifications,
      reducedMotion: state.reducedMotion,
      highContrast: state.highContrast,
      fontSize: state.fontSize,
    })
  ) as any;
}

/**
 * Use settings actions (stable references)
 */
export function useSettingsActions(): {
  setLocale: (locale: string) => void;
  setTimezone: (timezone: string) => void;
  setDateFormat: (format: string) => void;
  setTimeFormat: (format: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setDesktopNotifications: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setFontSize: (size: string) => void;
  resetSettings: () => void;
} {
  const setLocale = useStore((s) => s.setLocale);
  const setTimezone = useStore((s) => s.setTimezone);
  const setDateFormat = useStore((s) => s.setDateFormat);
  const setTimeFormat = useStore((s) => s.setTimeFormat);
  const setNotificationsEnabled = useStore((s) => s.setNotificationsEnabled);
  const setSoundEnabled = useStore((s) => s.setSoundEnabled);
  const setDesktopNotifications = useStore((s) => s.setDesktopNotifications);
  const setReducedMotion = useStore((s) => s.setReducedMotion);
  const setHighContrast = useStore((s) => s.setHighContrast);
  const setFontSize = useStore((s) => s.setFontSize);
  const resetSettings = useStore((s) => s.resetSettings);

  return {
    setLocale,
    setTimezone,
    setDateFormat,
    setTimeFormat: setTimeFormat as (format: string) => void,
    setNotificationsEnabled,
    setSoundEnabled,
    setDesktopNotifications,
    setReducedMotion,
    setHighContrast,
    setFontSize: setFontSize as (size: string) => void,
    resetSettings,
  };
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Use sidebar state and actions
 * Combined into single subscription with shallow equality for performance
 */
export function useSidebar(): {
  isOpen: boolean;
  isCollapsed: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  setCollapsed: (collapsed: boolean) => void;
} {
  return useStore(
    (state) => ({
      isOpen: state.sidebarOpen,
      isCollapsed: state.sidebarCollapsed,
      toggle: state.toggleSidebar,
      setOpen: state.setSidebarOpen,
      setCollapsed: state.setSidebarCollapsed,
    })
  );
}

/**
 * Use modal state and actions
 * Combined into single subscription with shallow equality for performance
 */
export function useModal<T extends Record<string, unknown> = Record<string, unknown>>(): {
  activeModal: string | null;
  data: T | null;
  isOpen: boolean;
  open: (id: string, data?: Record<string, unknown>) => void;
  close: () => void;
} {
  const { activeModal, modalData, open, close } = useStore(
    (state) => ({
      activeModal: state.activeModal,
      modalData: state.modalData,
      open: state.openModal,
      close: state.closeModal,
    })
  ) as any;

  return {
    activeModal,
    data: modalData as T | null,
    isOpen: activeModal !== null,
    open,
    close,
  };
}

/**
 * Check if a specific modal is open
 */
export function useIsModalOpen(modalId: string): boolean {
  return useStore((state) => state.activeModal === modalId);
}

/**
 * Use loading state and actions
 * Combined into single subscription with shallow equality for performance
 */
export function useLoading(): {
  isLoading: boolean;
  message: string | null;
  start: (loadingMessage?: string) => void;
  stop: () => void;
} {
  const { isLoading, message, setGlobalLoading } = useStore(
    (state) => ({
      isLoading: state.globalLoading,
      message: state.loadingMessage,
      setGlobalLoading: state.setGlobalLoading,
    })
  ) as any;

  const start = useCallback(
    (loadingMessage?: string) => setGlobalLoading(true, loadingMessage),
    [setGlobalLoading]
  );

  const stop = useCallback(
    () => setGlobalLoading(false),
    [setGlobalLoading]
  );

  return {
    isLoading,
    message,
    start,
    stop,
  };
}

/**
 * Use display settings (memoized)
 */
export function useDisplaySettings(): {
  locale: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
} {
  return useStore(
    (state) => ({
      locale: state.locale,
      timezone: state.timezone,
      dateFormat: state.dateFormat,
      timeFormat: state.timeFormat,
      numberFormat: state.numberFormat,
    })
  ) as any;
}

/**
 * Use accessibility settings (memoized)
 */
export function useAccessibilitySettings(): {
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: string;
} {
  return useStore(
    (state) => ({
      reducedMotion: state.reducedMotion,
      highContrast: state.highContrast,
      fontSize: state.fontSize,
    })
  ) as any;
}

/**
 * Use notification settings (memoized)
 */
export function useNotificationSettings(): {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
} {
  return useStore(
    (state) => ({
      notificationsEnabled: state.notificationsEnabled,
      soundEnabled: state.soundEnabled,
      desktopNotifications: state.desktopNotifications,
    })
  ) as any;
}

// ============================================================================
// Advanced Hooks
// ============================================================================

/**
 * Subscribe to store changes with callback (for side effects)
 *
 * @example
 * ```typescript
 * useStoreSubscription(
 *   (state) => state.locale,
 *   (newLocale, oldLocale) => {
 *     console.log(`Locale changed from ${oldLocale} to ${newLocale}`);
 *   }
 * );
 * ```
 */
export function useStoreSubscription<T>(
  selector: StoreSelector<T>,
  callback: (value: T, prevValue: T) => void,
  options?: { fireImmediately?: boolean }
): void {
  const callbackRef = useRef(callback);
  const selectorRef = useRef(selector);

  // Update refs in useEffect to avoid accessing during render
  useEffect(() => {
    callbackRef.current = callback;
    selectorRef.current = selector;
  });

  useEffect(() => {
    let prevValue = selectorRef.current(useStore.getState());

    if (options?.fireImmediately === true) {
      callbackRef.current(prevValue, prevValue);
    }

    const unsubscribe = useStore.subscribe((state) => {
      const newValue = selectorRef.current(state);
      if (!Object.is(newValue, prevValue)) {
        callbackRef.current(newValue, prevValue);
        prevValue = newValue;
      }
    });

    return unsubscribe;
  }, [options?.fireImmediately]);
}

/**
 * Debounced state selector
 *
 * @example
 * ```typescript
 * const debouncedSearch = useDebouncedState(
 *   (state) => state.searchQuery,
 *   300
 * );
 * ```
 */
export function useDebouncedState<T>(
  selector: StoreSelector<T>,
  delay: number = 300
): T {
  const value = useStore(selector);
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Get previous value of a selector
 *
 * @example
 * ```typescript
 * const currentCount = useStore((s) => s.count);
 * const previousCount = usePreviousState((s) => s.count);
 * ```
 */
export function usePreviousState<T>(selector: StoreSelector<T>): T | undefined {
  const value = useStore(selector);
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Track if value has changed since component mounted
 *
 * @example
 * ```typescript
 * const { value, hasChanged, changeCount } = useStateChange((s) => s.count);
 * ```
 */
export function useStateChange<T>(selector: StoreSelector<T>): {
  value: T;
  initialValue: T;
  hasChanged: boolean;
  changeCount: number;
} {
  const value = useStore(selector);
  const initialRef = useRef(value);
  const countRef = useRef(0);
  const prevRef = useRef(value);

  if (!Object.is(value, prevRef.current)) {
    countRef.current += 1;
    prevRef.current = value;
  }

  return {
    value,
    initialValue: initialRef.current,
    hasChanged: !Object.is(value, initialRef.current),
    changeCount: countRef.current,
  };
}

// ============================================================================
// Hydration Hook
// ============================================================================

/**
 * Wait for store hydration before rendering
 *
 * @example
 * ```typescript
 * function App() {
 *   const { hasHydrated, isHydrating } = useHydration();
 *
 *   if (isHydrating) {
 *     return <LoadingScreen />;
 *   }
 *
 *   return <MainApp />;
 * }
 * ```
 */
export function useHydration(): {
  hasHydrated: boolean;
  isHydrating: boolean;
} {
  const [hasHydrated, setHasHydrated] = useState(() => {
    // Check if already hydrated (for SSR)
    const state = useStore.getState();
    return (state as { _hasHydrated?: boolean })._hasHydrated ?? true;
  });

  useEffect(() => {
    const state = useStore.getState();
    if ((state as { _hasHydrated?: boolean })._hasHydrated) {
      setHasHydrated(true);
      return;
    }

    const unsubscribe = useStore.subscribe((state) => {
      if ((state as { _hasHydrated?: boolean })._hasHydrated) {
        setHasHydrated(true);
      }
    });

    return unsubscribe;
  }, []);

  return {
    hasHydrated,
    isHydrating: !hasHydrated,
  };
}
