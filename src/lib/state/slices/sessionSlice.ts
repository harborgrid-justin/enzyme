/**
 * @file Session Slice
 * @description Client-side session state management with DevTools integration
 *
 * IMPORTANT: This slice manages client-side session state only.
 * Authentication tokens and sensitive credentials should NEVER be stored here.
 * Use secure HTTP-only cookies or dedicated auth solutions for authentication.
 */

import { createSlice } from '../core/createSlice';

// ============================================================================
// Types
// ============================================================================

/**
 * Session state interface
 */
export interface SessionState {
  // Session identification
  sessionId: string | null;
  sessionStartedAt: number | null;
  sessionExpiresAt: number | null;

  // Activity tracking
  lastActivity: number | null;
  isSessionActive: boolean;
  activityTimeoutMs: number;

  // Navigation history (for back navigation, analytics)
  navigationHistory: string[];
  maxHistoryLength: number;

  // Session metadata
  deviceId: string | null;
  browserTabId: string | null;
}

/**
 * Session actions interface
 */
export interface SessionActions {
  // Session Lifecycle Actions
  /** Initialize a new session with ID and optional configuration */
  initSession: (sessionId: string, options?: { expiresInMs?: number; deviceId?: string }) => void;
  /** Update last activity timestamp (call on user interaction) */
  updateActivity: () => void;
  /** End the current session and clear session data */
  endSession: () => void;
  /** Check if session has expired (returns true if expired) */
  checkSessionExpiry: () => boolean;
  /** Extend session expiry by additional milliseconds */
  extendSession: (additionalMs: number) => void;

  // Navigation History Actions
  /** Add a path to navigation history (deduplicates consecutive entries) */
  addToHistory: (path: string) => void;
  /** Remove last occurrence of a path from history */
  removeFromHistory: (path: string) => void;
  /** Clear all navigation history */
  clearHistory: () => void;
  /** Get the last visited path or null if history is empty */
  getLastVisitedPath: () => string | null;
  /** Go back in history, returns the previous path or null */
  goBack: () => string | null;

  // Configuration Actions
  /** Set activity timeout duration in milliseconds */
  setActivityTimeout: (timeoutMs: number) => void;
  /** Set maximum navigation history length */
  setMaxHistoryLength: (length: number) => void;

  // Browser Tab Management Actions
  /** Set the browser tab identifier for cross-tab awareness */
  setBrowserTabId: (tabId: string) => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialSessionState: SessionState = {
  // Session identification
  sessionId: null,
  sessionStartedAt: null,
  sessionExpiresAt: null,

  // Activity tracking
  lastActivity: null,
  isSessionActive: false,
  activityTimeoutMs: 30 * 60 * 1000, // 30 minutes default

  // Navigation history
  navigationHistory: [],
  maxHistoryLength: 50,

  // Session metadata
  deviceId: null,
  browserTabId: null,
};

// ============================================================================
// Slice Definition
// ============================================================================

/**
 * Session slice using createSlice factory for automatic DevTools action naming
 *
 * All actions are automatically prefixed with "session/" in DevTools, e.g.:
 * - session/initSession
 * - session/updateActivity
 * - session/endSession
 */
export const sessionSlice = createSlice<
  SessionState,
  SessionActions & Record<string, (...args: never[]) => unknown>
>({
  name: 'session',
  initialState: initialSessionState,
  actions: (set, get) => ({
    // ========================================================================
    // Session Lifecycle
    // ========================================================================

    initSession: (sessionId, options = {}) => {
      const now = Date.now();
      const { expiresInMs, deviceId } = options;

      set((state) => {
        state.sessionId = sessionId;
        state.sessionStartedAt = now;
        state.lastActivity = now;
        state.isSessionActive = true;
        state.sessionExpiresAt = expiresInMs !== undefined ? now + expiresInMs : null;
        if (deviceId !== undefined && deviceId !== '') {
          state.deviceId = deviceId;
        }
      }, 'initSession');
    },

    updateActivity: () => {
      set((state) => {
        state.lastActivity = Date.now();
      }, 'updateActivity');
    },

    endSession: () => {
      set((state) => {
        state.sessionId = null;
        state.sessionStartedAt = null;
        state.sessionExpiresAt = null;
        state.lastActivity = null;
        state.isSessionActive = false;
        state.navigationHistory = [];
        // Keep deviceId and browserTabId for continuity
      }, 'endSession');
    },

    checkSessionExpiry: () => {
      const state = get();
      const now = Date.now();

      // Check explicit session expiry
      if (state.sessionExpiresAt !== null && now > state.sessionExpiresAt) {
        return true;
      }

      // Check activity timeout
      return state.lastActivity !== null && now - state.lastActivity > state.activityTimeoutMs;
    },

    extendSession: (additionalMs) => {
      set((state) => {
        if (state.sessionExpiresAt !== null) {
          state.sessionExpiresAt = state.sessionExpiresAt + additionalMs;
        } else {
          state.sessionExpiresAt = Date.now() + additionalMs;
        }
        state.lastActivity = Date.now();
      }, 'extendSession');
    },

    // ========================================================================
    // Navigation History
    // ========================================================================

    addToHistory: (path) => {
      set((state) => {
        // Avoid duplicate consecutive entries
        const lastEntry = state.navigationHistory[state.navigationHistory.length - 1];
        if (lastEntry !== path) {
          state.navigationHistory.push(path);

          // Trim if over max length
          if (state.navigationHistory.length > state.maxHistoryLength) {
            state.navigationHistory = state.navigationHistory.slice(-state.maxHistoryLength);
          }
        }
      }, 'addToHistory');
    },

    removeFromHistory: (path) => {
      set((state) => {
        const index = state.navigationHistory.lastIndexOf(path);
        if (index !== -1) {
          state.navigationHistory.splice(index, 1);
        }
      }, 'removeFromHistory');
    },

    clearHistory: () => {
      set((state) => {
        state.navigationHistory = [];
      }, 'clearHistory');
    },

    getLastVisitedPath: () => {
      const { navigationHistory } = get();
      return navigationHistory[navigationHistory.length - 1] ?? null;
    },

    goBack: () => {
      const { navigationHistory } = get();
      if (navigationHistory.length < 2) {
        return null;
      }

      // Remove current page
      set((state) => {
        state.navigationHistory.pop();
      }, 'goBack');

      // Return previous page
      return navigationHistory[navigationHistory.length - 2] ?? null;
    },

    // ========================================================================
    // Configuration
    // ========================================================================

    setActivityTimeout: (timeoutMs) => {
      set((state) => {
        state.activityTimeoutMs = timeoutMs;
      }, 'setActivityTimeout');
    },

    setMaxHistoryLength: (length) => {
      set((state) => {
        state.maxHistoryLength = length;
        // Trim existing history if needed
        if (state.navigationHistory.length > length) {
          state.navigationHistory = state.navigationHistory.slice(-length);
        }
      }, 'setMaxHistoryLength');
    },

    // ========================================================================
    // Browser Tab Management
    // ========================================================================

    setBrowserTabId: (tabId) => {
      set((state) => {
        state.browserTabId = tabId;
      }, 'setBrowserTabId');
    },
  }),
});

// ============================================================================
// Exported Type
// ============================================================================

export type SessionSlice = SessionState & SessionActions;
