/**
 * @file State Hooks Exports
 * @description Export all store hooks
 */

export {
  // Core hooks
  useStoreState,
  useShallowState,
  useStoreAction,
  // Slice hooks
  useUIState,
  useUIActions,
  useSessionState,
  useSessionActions,
  useSettingsState,
  useSettingsActions,
  // Convenience hooks
  useSidebar,
  useModal,
  useIsModalOpen,
  useLoading,
  useDisplaySettings,
  useAccessibilitySettings,
  useNotificationSettings,
  // Advanced hooks
  useStoreSubscription,
  useDebouncedState,
  usePreviousState,
  useStateChange,
  // Hydration
  useHydration,
} from './useStore';
