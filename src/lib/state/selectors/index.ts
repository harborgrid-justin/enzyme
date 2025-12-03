/**
 * @file Memoized Selectors
 * @description Type-safe selectors with automatic memoization for optimal performance
 *
 * SELECTOR STRATEGY:
 * - Primitive selectors (strings, numbers, booleans): No memoization needed
 * - Object selectors: Use createObjectSelector for stable references
 * - Array selectors: Use createArraySelector for stable references
 * - Computed selectors: Use createSelector for dependency-based memoization
 *
 * USAGE:
 * - Use primitive selectors for simple values: useStore(selectLocale)
 * - Use memoized selectors for objects: useStore(selectDisplaySettings)
 * - Use action selectors with shallow: useStore(selectUIActions, shallow)
 */

import { useStore, type StoreState, type StoreSelector } from '../store';
import {
  createSelector,
  createObjectSelector,
  createParameterizedSelector,
} from '../core/createSelectors';

// ============================================================================
// Primitive Selectors (No memoization needed - identity equality)
// ============================================================================

// UI State
export const selectSidebarOpen = (state: StoreState): boolean => state.sidebarOpen;
export const selectSidebarCollapsed = (state: StoreState): boolean => state.sidebarCollapsed;
export const selectActiveModal = (state: StoreState): string | null => state.activeModal;
export const selectModalData = (state: StoreState): Record<string, unknown> | null =>
  state.modalData;
export const selectModalStack = (state: StoreState): StoreState['modalStack'] => state.modalStack;
export const selectGlobalLoading = (state: StoreState): boolean => state.globalLoading;
export const selectLoadingMessage = (state: StoreState): string | null => state.loadingMessage;
export const selectLoadingProgress = (state: StoreState): number | null => state.loadingProgress;
export const selectToasts = (state: StoreState): StoreState['toasts'] => state.toasts;
export const selectLayoutDensity = (state: StoreState): StoreState['layoutDensity'] =>
  state.layoutDensity;
export const selectAnimationsEnabled = (state: StoreState): boolean => state.animationsEnabled;
export const selectCommandPaletteOpen = (state: StoreState): boolean => state.commandPaletteOpen;

// Session State
export const selectSessionId = (state: StoreState): string | null => state.sessionId;
export const selectIsSessionActive = (state: StoreState): boolean => state.isSessionActive;
export const selectLastActivity = (state: StoreState): number | null => state.lastActivity;
export const selectSessionStartedAt = (state: StoreState): number | null => state.sessionStartedAt;
export const selectSessionExpiresAt = (state: StoreState): number | null => state.sessionExpiresAt;
export const selectActivityTimeoutMs = (state: StoreState): number => state.activityTimeoutMs;
export const selectNavigationHistory = (state: StoreState): string[] => state.navigationHistory;
export const selectMaxHistoryLength = (state: StoreState): number => state.maxHistoryLength;
export const selectDeviceId = (state: StoreState): string | null => state.deviceId;
export const selectBrowserTabId = (state: StoreState): string | null => state.browserTabId;

// Settings State
export const selectLocale = (state: StoreState): string => state.locale;
export const selectTimezone = (state: StoreState): string => state.timezone;
export const selectDateFormat = (state: StoreState): string => state.dateFormat;
export const selectTimeFormat = (state: StoreState): StoreState['timeFormat'] => state.timeFormat;
export const selectNumberFormat = (state: StoreState): string => state.numberFormat;
export const selectTheme = (state: StoreState): StoreState['theme'] => state.theme;
export const selectNotificationsEnabled = (state: StoreState): boolean =>
  state.notificationsEnabled;
export const selectSoundEnabled = (state: StoreState): boolean => state.soundEnabled;
export const selectDesktopNotifications = (state: StoreState): boolean =>
  state.desktopNotifications;
export const selectEmailNotifications = (state: StoreState): boolean => state.emailNotifications;
export const selectReducedMotion = (state: StoreState): boolean => state.reducedMotion;
export const selectHighContrast = (state: StoreState): boolean => state.highContrast;
export const selectFontSize = (state: StoreState): StoreState['fontSize'] => state.fontSize;
export const selectKeyboardShortcutsEnabled = (state: StoreState): boolean =>
  state.keyboardShortcutsEnabled;
export const selectFeatures = (state: StoreState): Record<string, boolean> => state.features;
export const selectAnalyticsEnabled = (state: StoreState): boolean => state.analyticsEnabled;
export const selectCrashReportingEnabled = (state: StoreState): boolean =>
  state.crashReportingEnabled;

// Hydration State
export const selectHasHydrated = (state: StoreState): boolean => state._hasHydrated;

// ============================================================================
// Computed Selectors (Memoized)
// ============================================================================

/**
 * Is any modal currently open
 */
export const selectIsModalOpen = createSelector<StoreState, [string | null], boolean>(
  [selectActiveModal],
  (activeModal): boolean => activeModal !== null
);

/**
 * Has modal stack (for showing back button in nested modals)
 */
export const selectHasModalStack = createSelector<StoreState, [StoreState['modalStack']], boolean>(
  [selectModalStack],
  (stack): boolean => stack.length > 0
);

/**
 * Modal stack depth
 */
export const selectModalStackDepth = createSelector<StoreState, [StoreState['modalStack']], number>(
  [selectModalStack],
  (stack): number => stack.length
);

/**
 * Has any toasts
 */
export const selectHasToasts = createSelector<StoreState, [StoreState['toasts']], boolean>(
  [selectToasts],
  (toasts): boolean => toasts.length > 0
);

/**
 * Toast count
 */
export const selectToastCount = createSelector<StoreState, [StoreState['toasts']], number>(
  [selectToasts],
  (toasts): number => toasts.length
);

/**
 * Navigation history length
 */
export const selectNavigationHistoryLength = createSelector<StoreState, [string[]], number>(
  [selectNavigationHistory],
  (history): number => history.length
);

/**
 * Last visited path
 */
export const selectLastVisitedPath = createSelector<StoreState, [string[]], string | null>(
  [selectNavigationHistory],
  (history): string | null => history[history.length - 1] ?? null
);

/**
 * Session duration in milliseconds (null if no session)
 *
 * @deprecated This selector uses Date.now() which breaks memoization - the combiner
 * returns a new value on every call, defeating the purpose of createSelector.
 * Use the `useSessionDuration` hook instead for proper time-based calculations.
 *
 * @see useSessionDuration in state/hooks/useSessionTime.ts
 */
export const selectSessionDuration = createSelector<StoreState, [number | null], number | null>(
  [selectSessionStartedAt],
  (startedAt): number | null => (startedAt !== null ? Date.now() - startedAt : null)
);

/**
 * Time until session expires (null if no expiry set)
 *
 * @deprecated This selector uses Date.now() which breaks memoization - the combiner
 * returns a new value on every call, defeating the purpose of createSelector.
 * Use the `useTimeUntilExpiry` hook instead for proper time-based calculations.
 *
 * @see useTimeUntilExpiry in state/hooks/useSessionTime.ts
 */
export const selectTimeUntilExpiry = createSelector<StoreState, [number | null], number | null>(
  [selectSessionExpiresAt],
  (expiresAt): number | null => (expiresAt !== null ? Math.max(0, expiresAt - Date.now()) : null)
);

/**
 * Is session expired
 *
 * @deprecated This selector uses Date.now() which breaks memoization - the combiner
 * returns a new value on every call, defeating the purpose of createSelector.
 * Use the `useIsSessionExpired` hook instead for proper time-based calculations.
 *
 * @see useIsSessionExpired in state/hooks/useSessionTime.ts
 */
export const selectIsSessionExpired = createSelector<
  StoreState,
  [number | null, number | null, number],
  boolean
>(
  [selectSessionExpiresAt, selectLastActivity, selectActivityTimeoutMs],
  (expiresAt, lastActivity, timeoutMs): boolean => {
    const now = Date.now();
    if (expiresAt !== null && now > expiresAt) return true;
    return lastActivity !== null && now - lastActivity > timeoutMs;
  }
);

// ============================================================================
// Object Selectors (Memoized with shallow equality)
// ============================================================================

/**
 * Display settings bundle
 * Returns stable reference when underlying values haven't changed
 */
export const selectDisplaySettings = createObjectSelector((state: StoreState) => ({
  locale: state.locale,
  timezone: state.timezone,
  dateFormat: state.dateFormat,
  timeFormat: state.timeFormat,
  numberFormat: state.numberFormat,
  theme: state.theme,
}));

/**
 * Accessibility settings bundle
 */
export const selectAccessibilitySettings = createObjectSelector((state: StoreState) => ({
  reducedMotion: state.reducedMotion,
  highContrast: state.highContrast,
  fontSize: state.fontSize,
  keyboardShortcutsEnabled: state.keyboardShortcutsEnabled,
  animationsEnabled: state.animationsEnabled,
}));

/**
 * Notification settings bundle
 */
export const selectNotificationSettings = createObjectSelector((state: StoreState) => ({
  notificationsEnabled: state.notificationsEnabled,
  soundEnabled: state.soundEnabled,
  desktopNotifications: state.desktopNotifications,
  emailNotifications: state.emailNotifications,
}));

/**
 * Privacy settings bundle
 */
export const selectPrivacySettings = createObjectSelector((state: StoreState) => ({
  analyticsEnabled: state.analyticsEnabled,
  crashReportingEnabled: state.crashReportingEnabled,
}));

/**
 * UI preferences bundle
 */
export const selectUIPreferences = createObjectSelector((state: StoreState) => ({
  sidebarOpen: state.sidebarOpen,
  sidebarCollapsed: state.sidebarCollapsed,
  layoutDensity: state.layoutDensity,
  animationsEnabled: state.animationsEnabled,
}));

/**
 * Session info bundle
 */
export const selectSessionInfo = createObjectSelector((state: StoreState) => ({
  sessionId: state.sessionId,
  isActive: state.isSessionActive,
  startedAt: state.sessionStartedAt,
  expiresAt: state.sessionExpiresAt,
  lastActivity: state.lastActivity,
  deviceId: state.deviceId,
  browserTabId: state.browserTabId,
}));

/**
 * Loading state bundle
 */
export const selectLoadingState = createObjectSelector((state: StoreState) => ({
  isLoading: state.globalLoading,
  message: state.loadingMessage,
  progress: state.loadingProgress,
}));

/**
 * Modal state bundle
 */
export const selectModalState = createObjectSelector((state: StoreState) => ({
  activeModal: state.activeModal,
  modalData: state.modalData,
  stackDepth: state.modalStack.length,
  hasStack: state.modalStack.length > 0,
}));

// ============================================================================
// Parameterized Selectors
// ============================================================================

/**
 * Check if a specific feature flag is enabled
 *
 * @example
 * const isNewDashboardEnabled = useStore(selectFeatureFlag('newDashboard'));
 */
export const selectFeatureFlag = createParameterizedSelector(
  (flag: string) => (state: StoreState) => state.features[flag] ?? false
);

/**
 * Check if a specific modal is open
 *
 * @example
 * const isSettingsModalOpen = useStore(selectIsSpecificModalOpen('settings'));
 */
export const selectIsSpecificModalOpen = createParameterizedSelector(
  (modalId: string) => (state: StoreState) => state.activeModal === modalId
);

/**
 * Get toast by ID
 *
 * @example
 * const toast = useStore(selectToastById('toast-123'));
 */
export const selectToastById = createParameterizedSelector(
  (toastId: string) => (state: StoreState) => state.toasts.find((t) => t.id === toastId) ?? null
);

// ============================================================================
// Action Selectors (Stable references - use with shallow)
// ============================================================================

/**
 * UI actions selector
 * Actions are stable references, but return new object each time.
 * Use with shallow equality: useStore(selectUIActions, shallow)
 */
export const selectUIActions = (
  state: StoreState
): Pick<
  StoreState,
  | 'toggleSidebar'
  | 'setSidebarOpen'
  | 'setSidebarCollapsed'
  | 'openModal'
  | 'closeModal'
  | 'closeAllModals'
  | 'setGlobalLoading'
  | 'setLoadingProgress'
  | 'addToast'
  | 'removeToast'
  | 'clearToasts'
  | 'setLayoutDensity'
  | 'setAnimationsEnabled'
  | 'toggleCommandPalette'
  | 'setCommandPaletteOpen'
> => ({
  toggleSidebar: state.toggleSidebar,
  setSidebarOpen: state.setSidebarOpen,
  setSidebarCollapsed: state.setSidebarCollapsed,
  openModal: state.openModal,
  closeModal: state.closeModal,
  closeAllModals: state.closeAllModals,
  setGlobalLoading: state.setGlobalLoading,
  setLoadingProgress: state.setLoadingProgress,
  addToast: state.addToast,
  removeToast: state.removeToast,
  clearToasts: state.clearToasts,
  setLayoutDensity: state.setLayoutDensity,
  setAnimationsEnabled: state.setAnimationsEnabled,
  toggleCommandPalette: state.toggleCommandPalette,
  setCommandPaletteOpen: state.setCommandPaletteOpen,
});

/**
 * Session actions selector
 */
export const selectSessionActions = (
  state: StoreState
): Pick<
  StoreState,
  | 'initSession'
  | 'updateActivity'
  | 'endSession'
  | 'checkSessionExpiry'
  | 'extendSession'
  | 'addToHistory'
  | 'removeFromHistory'
  | 'clearHistory'
  | 'getLastVisitedPath'
  | 'goBack'
  | 'setActivityTimeout'
  | 'setMaxHistoryLength'
  | 'setBrowserTabId'
> => ({
  initSession: state.initSession,
  updateActivity: state.updateActivity,
  endSession: state.endSession,
  checkSessionExpiry: state.checkSessionExpiry,
  extendSession: state.extendSession,
  addToHistory: state.addToHistory,
  removeFromHistory: state.removeFromHistory,
  clearHistory: state.clearHistory,
  getLastVisitedPath: state.getLastVisitedPath,
  goBack: state.goBack,
  setActivityTimeout: state.setActivityTimeout,
  setMaxHistoryLength: state.setMaxHistoryLength,
  setBrowserTabId: state.setBrowserTabId,
});

/**
 * Settings actions selector
 *
 * Note: Fixed bug where setNumberFormat was incorrectly returning state.numberFormat (value)
 * instead of state.setNumberFormat (action function).
 */
export const selectSettingsActions = (
  state: StoreState
): Pick<
  StoreState,
  | 'setLocale'
  | 'setTimezone'
  | 'setDateFormat'
  | 'setTimeFormat'
  | 'setNumberFormat'
  | 'setTheme'
  | 'setNotificationsEnabled'
  | 'setSoundEnabled'
  | 'setDesktopNotifications'
  | 'setEmailNotifications'
  | 'setReducedMotion'
  | 'setHighContrast'
  | 'setFontSize'
  | 'setKeyboardShortcutsEnabled'
  | 'setAnalyticsEnabled'
  | 'setCrashReportingEnabled'
  | 'updateSettings'
  | 'updateDisplaySettings'
  | 'updateAccessibilitySettings'
  | 'updateNotificationSettings'
  | 'updatePrivacySettings'
  | 'setFeatureFlag'
  | 'setFeatureFlags'
  | 'syncFeatureFlags'
  | 'isFeatureEnabled'
  | 'resetSettings'
  | 'resetDisplaySettings'
  | 'resetAccessibilitySettings'
  | 'resetNotificationSettings'
> => ({
  setLocale: state.setLocale,
  setTimezone: state.setTimezone,
  setDateFormat: state.setDateFormat,
  setTimeFormat: state.setTimeFormat,
  setNumberFormat: state.setNumberFormat,
  setTheme: state.setTheme,
  setNotificationsEnabled: state.setNotificationsEnabled,
  setSoundEnabled: state.setSoundEnabled,
  setDesktopNotifications: state.setDesktopNotifications,
  setEmailNotifications: state.setEmailNotifications,
  setReducedMotion: state.setReducedMotion,
  setHighContrast: state.setHighContrast,
  setFontSize: state.setFontSize,
  setKeyboardShortcutsEnabled: state.setKeyboardShortcutsEnabled,
  setAnalyticsEnabled: state.setAnalyticsEnabled,
  setCrashReportingEnabled: state.setCrashReportingEnabled,
  updateSettings: state.updateSettings,
  updateDisplaySettings: state.updateDisplaySettings,
  updateAccessibilitySettings: state.updateAccessibilitySettings,
  updateNotificationSettings: state.updateNotificationSettings,
  updatePrivacySettings: state.updatePrivacySettings,
  setFeatureFlag: state.setFeatureFlag,
  setFeatureFlags: state.setFeatureFlags,
  syncFeatureFlags: state.syncFeatureFlags,
  isFeatureEnabled: state.isFeatureEnabled,
  resetSettings: state.resetSettings,
  resetDisplaySettings: state.resetDisplaySettings,
  resetAccessibilitySettings: state.resetAccessibilitySettings,
  resetNotificationSettings: state.resetNotificationSettings,
});

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Use selector with proper typing
 */
export function useStoreSelector<T>(selector: StoreSelector<T>): T {
  return useStore(selector);
}

/**
 * Use selector with shallow equality (for non-memoized objects/arrays)
 */
export function useShallowSelector<T>(selector: StoreSelector<T>): T {
  return useStore(selector);
}
