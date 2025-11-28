/**
 * @file Hooks Module Index
 * @description Central export for all custom hooks
 */

// ============================================================================
// Shared Utilities
// ============================================================================

export {
  // Mounted state tracking
  useIsMounted,
  useMountedState,
  // Latest value refs
  useLatestRef,
  useLatestCallback,
  useLatestRefs,
  // Network utilities
  getNetworkInfo,
  meetsMinimumQuality,
  shouldAllowPrefetch,
  monitorNetworkQuality,
  isSlowConnection,
  getConnectionQualityLabel,
  // Buffering utilities
  useBuffer,
  useTimeWindowBuffer,
  useBatchBuffer,
  // Types
  type ConnectionType,
  type NetworkInformation,
  type BufferOptions,
  type UseBufferResult,
} from './shared';

// ============================================================================
// Feature Hooks
// ============================================================================

// Theme hooks
export { useTheme, useSystemThemePreference, type UseThemeReturn } from './useTheme';

// Route prefetch hooks
export {
  usePrefetchRoute,
  usePrefetchOnHover,
  type PrefetchOptions,
  type RouteDataLoader,
  type RoutePrefetchConfig,
} from './usePrefetchRoute';

// Global store hooks
export {
  useGlobalStore,
  useGlobalStoreMultiple,
  useGlobalStoreComputed,
  useGlobalStoreActions,
  useStoreHydrated,
  createSliceHook,
  createActionHook,
  useGlobalStoreSubscription,
  globalSelectors,
  useIsSidebarOpen,
  useCurrentUser,
  useIsAuthenticated,
  useUnreadNotificationCount,
  type Selector,
} from './useGlobalStore';

// Debounce hooks
export {
  useDebouncedValue,
  useDebouncedCallback,
  useThrottledValue,
  type DebounceOptions,
} from './useDebouncedValue';

// Resource cleanup hooks
export {
  useDisposable,
  useAbortController,
  useTimeout,
  useInterval,
  useEventListener,
  useSubscription,
  useUnmountEffect,
  useMounted,
  useSafeState,
  useRefCleanup,
  useWebSocketCleanup,
  useAsync,
} from './useResourceCleanup';

// Network status hooks
export {
  useOnlineStatus,
  useNetworkStatus,
  useNetworkQuality,
  useNetworkSuggestions,
  useSlowConnection,
  useOfflineFallback,
  useOnReconnect,
  useWaitForOnline,
  useNetworkAwareFetch,
  useOfflineIndicator,
  useConnectionTracker,
  type UseOfflineFallbackOptions,
  type UseNetworkAwareFetchOptions,
  type UseNetworkAwareFetchResult,
} from './useNetworkStatus';

// Analytics hooks
export {
  usePageView,
  useTrackEvent,
  useTrackFeature,
  useTrackRenderPerformance,
  useTrackInteractionTiming,
  useTrackForm,
  useTrackClick,
  useAnalyticsConsent,
  useAnalyticsIdentify,
  useAnalyticsReset,
  useTrackSearch,
  useTrackScrollDepth,
  useTrackTimeOnPage,
  useTrackedSection,
} from './useAnalytics';

// Smart prefetching hooks
export {
  SmartPrefetchManager,
  createPrefetchConfig,
  type PrefetchTarget,
  type SmartPrefetchOptions,
} from './useSmartPrefetch';

// Error recovery hooks
export {
  // Async operations with recovery
  useAsyncWithRecovery,
  // Network-aware operations
  useNetworkAwareOperation,
  // Optimistic updates
  useOptimisticUpdate,
  // Safe callbacks
  useSafeCallback,
  // Error toasts
  useErrorToast,
  // Recovery state management
  useRecoveryState,
  // Error context
  useErrorContext,
  // Types
  type AsyncState,
  type RecoveryOptions,
  type AsyncWithRecovery,
  type NetworkAwareOperationResult,
  type OptimisticUpdateResult,
  type SafeCallbackResult,
  type ToastEntry,
  type ErrorToastResult,
  type RecoveryState,
  type ErrorContext as RecoveryErrorContext,
} from './useErrorRecovery';

// ============================================================================
// Accessibility Hooks
// ============================================================================

// Screen reader announcements
export {
  useScreenReaderAnnounce,
  announceToScreenReader,
  ScreenReaderAnnouncementRegion,
  type AnnouncementPriority,
  type AnnounceOptions,
} from './useScreenReaderAnnounce';

// Keyboard shortcuts with documentation
export {
  useKeyboardShortcuts,
  formatKeyCombo,
  KeyboardShortcutsHelp,
  type KeyboardShortcut,
  type UseKeyboardShortcutsOptions,
  type KeyboardShortcutsHelpProps,
} from './useKeyboardShortcuts';
