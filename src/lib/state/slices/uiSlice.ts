/**
 * @file UI Slice
 * @description UI state management with atomic updates and DevTools integration
 *
 * This slice manages all UI-related state including sidebar, modals, loading states,
 * and toasts. Uses Immer for immutable updates and automatic action naming for DevTools.
 */

import { createSlice } from '../core/createSlice';

// ============================================================================
// Types
// ============================================================================

/**
 * Toast notification
 */
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  duration?: number;
  dismissible?: boolean;
}

/**
 * Modal stack entry for nested modals
 */
export interface ModalStackEntry {
  id: string;
  data: Record<string, unknown> | null;
}

/**
 * UI state interface
 */
export interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Modal (with stack support for nested modals)
  activeModal: string | null;
  modalData: Record<string, unknown> | null;
  modalStack: ModalStackEntry[];

  // Loading
  globalLoading: boolean;
  loadingMessage: string | null;
  loadingProgress: number | null;

  // Toasts
  toasts: Toast[];

  // Layout
  layoutDensity: 'compact' | 'comfortable' | 'spacious';
  animationsEnabled: boolean;

  // Command Palette
  commandPaletteOpen: boolean;
}

/**
 * UI actions interface
 */
export interface UIActions {
  // Sidebar Actions
  /** Toggle sidebar open/closed state */
  toggleSidebar: () => void;
  /** Set sidebar open state explicitly */
  setSidebarOpen: (open: boolean) => void;
  /** Set sidebar collapsed state (narrow vs full width) */
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Modal Actions (with stack support for nested modals)
  /** Open a modal by ID, optionally passing data. Supports nesting. */
  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  /** Close current modal, returning to previous in stack if nested */
  closeModal: () => void;
  /** Close all modals and clear the modal stack */
  closeAllModals: () => void;
  /** Get data passed to current modal */
  getModalData: <T extends Record<string, unknown>>() => T | null;

  // Loading Actions
  /** Set global loading state with optional message */
  setGlobalLoading: (loading: boolean, message?: string) => void;
  /** Set loading progress (0-100) or null to hide progress */
  setLoadingProgress: (progress: number | null) => void;

  // Toast Actions
  /** Add a toast notification, returns the toast ID */
  addToast: (toast: Omit<Toast, 'id'>) => string;
  /** Remove a specific toast by ID */
  removeToast: (id: string) => void;
  /** Clear all toasts */
  clearToasts: () => void;

  // Layout Actions
  /** Set UI density (compact, comfortable, spacious) */
  setLayoutDensity: (density: UIState['layoutDensity']) => void;
  /** Enable or disable UI animations */
  setAnimationsEnabled: (enabled: boolean) => void;

  // Command Palette Actions
  /** Toggle command palette visibility */
  toggleCommandPalette: () => void;
  /** Set command palette open state explicitly */
  setCommandPaletteOpen: (open: boolean) => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialUIState: UIState = {
  // Sidebar
  sidebarOpen: true,
  sidebarCollapsed: false,

  // Modal
  activeModal: null,
  modalData: null,
  modalStack: [],

  // Loading
  globalLoading: false,
  loadingMessage: null,
  loadingProgress: null,

  // Toasts
  toasts: [],

  // Layout
  layoutDensity: 'comfortable',
  animationsEnabled: true,

  // Command Palette
  commandPaletteOpen: false,
};

// ============================================================================
// Slice Definition
// ============================================================================

/**
 * Generate unique toast ID
 */
function generateToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * UI slice using createSlice factory for automatic DevTools action naming
 *
 * All actions are automatically prefixed with "ui/" in DevTools, e.g.:
 * - ui/toggleSidebar
 * - ui/openModal
 * - ui/addToast
 */
export const uiSlice = createSlice<
  UIState,
  UIActions & Record<string, (...args: never[]) => unknown>
>({
  name: 'ui',
  initialState: initialUIState,
  actions: (set, get) => ({
    // ========================================================================
    // Sidebar Actions
    // ========================================================================

    toggleSidebar: () => {
      set((state) => {
        state.sidebarOpen = !state.sidebarOpen;
      }, 'toggleSidebar');
    },

    setSidebarOpen: (open) => {
      set((state) => {
        state.sidebarOpen = open;
      }, 'setSidebarOpen');
    },

    setSidebarCollapsed: (collapsed) => {
      set((state) => {
        state.sidebarCollapsed = collapsed;
      }, 'setSidebarCollapsed');
    },

    // ========================================================================
    // Modal Actions (with stack for nested modals)
    // ========================================================================

    openModal: (modalId, data) => {
      set((state) => {
        // Push current modal to stack if one is active
        if (state.activeModal !== null) {
          state.modalStack.push({
            id: state.activeModal,
            data: state.modalData,
          });
        }
        state.activeModal = modalId;
        state.modalData = data ?? null;
      }, 'openModal');
    },

    closeModal: () => {
      set((state) => {
        // Pop from stack if available (supports nested modals)
        const previous = state.modalStack.pop();
        if (previous) {
          state.activeModal = previous.id;
          state.modalData = previous.data;
        } else {
          state.activeModal = null;
          state.modalData = null;
        }
      }, 'closeModal');
    },

    closeAllModals: () => {
      set((state) => {
        state.activeModal = null;
        state.modalData = null;
        state.modalStack = [];
      }, 'closeAllModals');
    },

    getModalData: <T extends Record<string, unknown>>() => {
      return get().modalData as T | null;
    },

    // ========================================================================
    // Loading Actions
    // ========================================================================

    setGlobalLoading: (loading, message) => {
      set((state) => {
        state.globalLoading = loading;
        state.loadingMessage = message ?? null;
        // Reset progress when loading ends
        if (!loading) {
          state.loadingProgress = null;
        }
      }, 'setGlobalLoading');
    },

    setLoadingProgress: (progress) => {
      set((state) => {
        state.loadingProgress = progress;
      }, 'setLoadingProgress');
    },

    // ========================================================================
    // Toast Actions
    // ========================================================================

    addToast: (toast) => {
      const id = generateToastId();
      set((state) => {
        state.toasts.push({
          ...toast,
          id,
          dismissible: toast.dismissible ?? true,
        });
      }, 'addToast');
      return id;
    },

    removeToast: (id) => {
      set((state) => {
        const index = state.toasts.findIndex((t) => t.id === id);
        if (index !== -1) {
          state.toasts.splice(index, 1);
        }
      }, 'removeToast');
    },

    clearToasts: () => {
      set((state) => {
        state.toasts = [];
      }, 'clearToasts');
    },

    // ========================================================================
    // Layout Actions
    // ========================================================================

    setLayoutDensity: (density) => {
      set((state) => {
        state.layoutDensity = density;
      }, 'setLayoutDensity');
    },

    setAnimationsEnabled: (enabled) => {
      set((state) => {
        state.animationsEnabled = enabled;
      }, 'setAnimationsEnabled');
    },

    // ========================================================================
    // Command Palette Actions
    // ========================================================================

    toggleCommandPalette: () => {
      set((state) => {
        state.commandPaletteOpen = !state.commandPaletteOpen;
      }, 'toggleCommandPalette');
    },

    setCommandPaletteOpen: (open) => {
      set((state) => {
        state.commandPaletteOpen = open;
      }, 'setCommandPaletteOpen');
    },
  }),
});

// ============================================================================
// Exported Type
// ============================================================================

export type UISlice = UIState & UIActions;
