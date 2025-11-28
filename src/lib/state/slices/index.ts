/**
 * @file State Slices Exports
 * @description Centralized exports for all state slices with full type definitions
 */

// UI Slice - Modal, sidebar, loading, toasts, and layout state
export { uiSlice } from './uiSlice';
export type { UISlice, UIState, UIActions, Toast, ModalStackEntry } from './uiSlice';

// Session Slice - Client-side session tracking and navigation history
export { sessionSlice } from './sessionSlice';
export type { SessionSlice, SessionState, SessionActions } from './sessionSlice';

// Settings Slice - User preferences, locale, accessibility, and feature flags
export { settingsSlice } from './settingsSlice';
export type {
  SettingsSlice,
  SettingsState,
  SettingsActions,
  FontSize,
  TimeFormat,
  Theme,
} from './settingsSlice';
