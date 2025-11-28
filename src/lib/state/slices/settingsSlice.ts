/**
 * @file Settings Slice
 * @description User preferences and settings with batch updates and DevTools integration
 *
 * This slice manages all user-configurable settings including locale, display preferences,
 * notifications, accessibility options, and feature flags. Uses Immer for immutable updates.
 */

import { createSlice } from '../core/createSlice';

// ============================================================================
// Types
// ============================================================================

/**
 * Font size options
 */
export type FontSize = 'small' | 'medium' | 'large';

/**
 * Time format options
 */
export type TimeFormat = '12h' | '24h';

/**
 * Theme options
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Settings state interface
 */
export interface SettingsState {
  // Locale & Timezone
  locale: string;
  timezone: string;

  // Display
  dateFormat: string;
  timeFormat: TimeFormat;
  numberFormat: string;
  theme: Theme;

  // Notifications
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
  emailNotifications: boolean;

  // Accessibility
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: FontSize;
  keyboardShortcutsEnabled: boolean;

  // Feature Flags (synced from server or local overrides)
  features: Record<string, boolean>;

  // Privacy
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
}

/**
 * Settings actions interface
 */
export interface SettingsActions {
  // Individual Locale & Display Setters
  /** Set the user's locale (e.g., 'en-US', 'fr-FR') */
  setLocale: (locale: string) => void;
  /** Set the user's timezone (IANA timezone, e.g., 'America/New_York') */
  setTimezone: (timezone: string) => void;
  /** Set date format pattern (e.g., 'MM/DD/YYYY') */
  setDateFormat: (format: string) => void;
  /** Set time format preference (12h or 24h) */
  setTimeFormat: (format: TimeFormat) => void;
  /** Set number format locale (e.g., 'en-US' for 1,234.56) */
  setNumberFormat: (format: string) => void;
  /** Set color theme preference */
  setTheme: (theme: Theme) => void;

  // Individual Notification Setters
  /** Enable or disable all notifications */
  setNotificationsEnabled: (enabled: boolean) => void;
  /** Enable or disable notification sounds */
  setSoundEnabled: (enabled: boolean) => void;
  /** Enable or disable desktop/browser notifications */
  setDesktopNotifications: (enabled: boolean) => void;
  /** Enable or disable email notifications */
  setEmailNotifications: (enabled: boolean) => void;

  // Individual Accessibility Setters
  /** Enable or disable reduced motion for animations */
  setReducedMotion: (enabled: boolean) => void;
  /** Enable or disable high contrast mode */
  setHighContrast: (enabled: boolean) => void;
  /** Set font size preference */
  setFontSize: (size: FontSize) => void;
  /** Enable or disable keyboard shortcuts */
  setKeyboardShortcutsEnabled: (enabled: boolean) => void;

  // Individual Privacy Setters
  /** Enable or disable analytics tracking */
  setAnalyticsEnabled: (enabled: boolean) => void;
  /** Enable or disable crash reporting */
  setCrashReportingEnabled: (enabled: boolean) => void;

  // Batch Update Actions (single DevTools action for multiple changes)
  /** Update multiple settings at once */
  updateSettings: (settings: Partial<SettingsState>) => void;
  /** Update display-related settings as a batch */
  updateDisplaySettings: (settings: Partial<Pick<SettingsState, 'locale' | 'timezone' | 'dateFormat' | 'timeFormat' | 'numberFormat' | 'theme'>>) => void;
  /** Update accessibility settings as a batch */
  updateAccessibilitySettings: (settings: Partial<Pick<SettingsState, 'reducedMotion' | 'highContrast' | 'fontSize' | 'keyboardShortcutsEnabled'>>) => void;
  /** Update notification settings as a batch */
  updateNotificationSettings: (settings: Partial<Pick<SettingsState, 'notificationsEnabled' | 'soundEnabled' | 'desktopNotifications' | 'emailNotifications'>>) => void;
  /** Update privacy settings as a batch */
  updatePrivacySettings: (settings: Partial<Pick<SettingsState, 'analyticsEnabled' | 'crashReportingEnabled'>>) => void;

  // Feature Flag Actions
  /** Set a single feature flag */
  setFeatureFlag: (flag: string, enabled: boolean) => void;
  /** Set multiple feature flags (merges with existing) */
  setFeatureFlags: (flags: Record<string, boolean>) => void;
  /** Replace all feature flags from server sync */
  syncFeatureFlags: (flags: Record<string, boolean>) => void;
  /** Check if a feature flag is enabled */
  isFeatureEnabled: (flag: string) => boolean;

  // Reset Actions
  /** Reset all settings to defaults */
  resetSettings: () => void;
  /** Reset display settings to defaults */
  resetDisplaySettings: () => void;
  /** Reset accessibility settings to defaults */
  resetAccessibilitySettings: () => void;
  /** Reset notification settings to defaults */
  resetNotificationSettings: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

/**
 * Detect user's timezone safely (SSR compatible)
 */
function getDefaultTimezone(): string {
  if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  }
  return 'UTC';
}

/**
 * Detect user's preferred locale
 */
function getDefaultLocale(): string {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en-US';
}

/**
 * Detect user's reduced motion preference
 */
function getDefaultReducedMotion(): boolean {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}

/**
 * Detect user's color scheme preference
 */
function getDefaultTheme(): Theme {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'system';
    }
  }
  return 'system';
}

/**
 * Default settings (used for reset and initial state)
 */
const defaultSettings: SettingsState = {
  // Locale & Timezone
  locale: getDefaultLocale(),
  timezone: getDefaultTimezone(),

  // Display
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  numberFormat: 'en-US',
  theme: getDefaultTheme(),

  // Notifications
  notificationsEnabled: true,
  soundEnabled: true,
  desktopNotifications: false,
  emailNotifications: true,

  // Accessibility
  reducedMotion: getDefaultReducedMotion(),
  highContrast: false,
  fontSize: 'medium',
  keyboardShortcutsEnabled: true,

  // Feature Flags
  features: {},

  // Privacy
  analyticsEnabled: true,
  crashReportingEnabled: true,
};

/**
 * Default display settings subset
 */
const defaultDisplaySettings = {
  locale: defaultSettings.locale,
  timezone: defaultSettings.timezone,
  dateFormat: defaultSettings.dateFormat,
  timeFormat: defaultSettings.timeFormat,
  numberFormat: defaultSettings.numberFormat,
  theme: defaultSettings.theme,
};

/**
 * Default accessibility settings subset
 */
const defaultAccessibilitySettings = {
  reducedMotion: defaultSettings.reducedMotion,
  highContrast: defaultSettings.highContrast,
  fontSize: defaultSettings.fontSize,
  keyboardShortcutsEnabled: defaultSettings.keyboardShortcutsEnabled,
};

/**
 * Default notification settings subset
 */
const defaultNotificationSettings = {
  notificationsEnabled: defaultSettings.notificationsEnabled,
  soundEnabled: defaultSettings.soundEnabled,
  desktopNotifications: defaultSettings.desktopNotifications,
  emailNotifications: defaultSettings.emailNotifications,
};

// ============================================================================
// Slice Definition
// ============================================================================

/**
 * Settings slice using createSlice factory for automatic DevTools action naming
 *
 * All actions are automatically prefixed with "settings/" in DevTools, e.g.:
 * - settings/setLocale
 * - settings/updateDisplaySettings
 * - settings/setFeatureFlag
 */
export const settingsSlice = createSlice<SettingsState, SettingsActions & Record<string, (...args: never[]) => unknown>>({
  name: 'settings',
  initialState: defaultSettings,
  actions: (set, get) => ({
    // ========================================================================
    // Individual Setters
    // ========================================================================

    setLocale: (locale) => {
      set((state) => {
        state.locale = locale;
      }, 'setLocale');
    },

    setTimezone: (timezone) => {
      set((state) => {
        state.timezone = timezone;
      }, 'setTimezone');
    },

    setDateFormat: (format) => {
      set((state) => {
        state.dateFormat = format;
      }, 'setDateFormat');
    },

    setTimeFormat: (format) => {
      set((state) => {
        state.timeFormat = format;
      }, 'setTimeFormat');
    },

    setNumberFormat: (format) => {
      set((state) => {
        state.numberFormat = format;
      }, 'setNumberFormat');
    },

    setTheme: (theme) => {
      set((state) => {
        state.theme = theme;
      }, 'setTheme');
    },

    setNotificationsEnabled: (enabled) => {
      set((state) => {
        state.notificationsEnabled = enabled;
      }, 'setNotificationsEnabled');
    },

    setSoundEnabled: (enabled) => {
      set((state) => {
        state.soundEnabled = enabled;
      }, 'setSoundEnabled');
    },

    setDesktopNotifications: (enabled) => {
      set((state) => {
        state.desktopNotifications = enabled;
      }, 'setDesktopNotifications');
    },

    setEmailNotifications: (enabled) => {
      set((state) => {
        state.emailNotifications = enabled;
      }, 'setEmailNotifications');
    },

    setReducedMotion: (enabled) => {
      set((state) => {
        state.reducedMotion = enabled;
      }, 'setReducedMotion');
    },

    setHighContrast: (enabled) => {
      set((state) => {
        state.highContrast = enabled;
      }, 'setHighContrast');
    },

    setFontSize: (size) => {
      set((state) => {
        state.fontSize = size;
      }, 'setFontSize');
    },

    setKeyboardShortcutsEnabled: (enabled) => {
      set((state) => {
        state.keyboardShortcutsEnabled = enabled;
      }, 'setKeyboardShortcutsEnabled');
    },

    setAnalyticsEnabled: (enabled) => {
      set((state) => {
        state.analyticsEnabled = enabled;
      }, 'setAnalyticsEnabled');
    },

    setCrashReportingEnabled: (enabled) => {
      set((state) => {
        state.crashReportingEnabled = enabled;
      }, 'setCrashReportingEnabled');
    },

    // ========================================================================
    // Batch Updates (Single Action in DevTools)
    // ========================================================================

    updateSettings: (settings) => {
      set((state) => {
        if (settings !== null && settings !== undefined) {
          // Use Immer-compatible property assignment instead of Object.assign
          for (const [key, value] of Object.entries(settings)) {
            (state as Record<string, unknown>)[key] = value;
          }
        }
      }, 'updateSettings');
    },

    updateDisplaySettings: (settings) => {
      set((state) => {
        if (settings !== null && settings !== undefined) {
          // Use Immer-compatible property assignment instead of Object.assign
          for (const [key, value] of Object.entries(settings)) {
            (state as Record<string, unknown>)[key] = value;
          }
        }
      }, 'updateDisplaySettings');
    },

    updateAccessibilitySettings: (settings) => {
      set((state) => {
        if (settings !== null && settings !== undefined) {
          // Use Immer-compatible property assignment instead of Object.assign
          for (const [key, value] of Object.entries(settings)) {
            (state as Record<string, unknown>)[key] = value;
          }
        }
      }, 'updateAccessibilitySettings');
    },

    updateNotificationSettings: (settings) => {
      set((state) => {
        if (settings !== null && settings !== undefined) {
          // Use Immer-compatible property assignment instead of Object.assign
          for (const [key, value] of Object.entries(settings)) {
            (state as Record<string, unknown>)[key] = value;
          }
        }
      }, 'updateNotificationSettings');
    },

    updatePrivacySettings: (settings) => {
      set((state) => {
        if (settings !== null && settings !== undefined) {
          // Use Immer-compatible property assignment instead of Object.assign
          for (const [key, value] of Object.entries(settings)) {
            (state as Record<string, unknown>)[key] = value;
          }
        }
      }, 'updatePrivacySettings');
    },

    // ========================================================================
    // Feature Flags
    // ========================================================================

    setFeatureFlag: (flag, enabled) => {
      set((state) => {
        state.features[flag] = enabled;
      }, 'setFeatureFlag');
    },

    setFeatureFlags: (flags) => {
      set((state) => {
        // Use Immer-compatible property assignment instead of Object.assign
        for (const [key, value] of Object.entries(flags)) {
          state.features[key] = value;
        }
      }, 'setFeatureFlags');
    },

    syncFeatureFlags: (flags) => {
      set((state) => {
        state.features = flags;
      }, 'syncFeatureFlags');
    },

    isFeatureEnabled: (flag) => {
      return get().features[flag] ?? false;
    },

    // ========================================================================
    // Reset Actions
    // ========================================================================

    resetSettings: () => {
      set(() => ({ ...defaultSettings }), 'resetSettings');
    },

    resetDisplaySettings: () => {
      set((state) => {
        // Use Immer-compatible property assignment instead of Object.assign
        for (const [key, value] of Object.entries(defaultDisplaySettings)) {
          (state as Record<string, unknown>)[key] = value;
        }
      }, 'resetDisplaySettings');
    },

    resetAccessibilitySettings: () => {
      set((state) => {
        // Use Immer-compatible property assignment instead of Object.assign
        for (const [key, value] of Object.entries(defaultAccessibilitySettings)) {
          (state as Record<string, unknown>)[key] = value;
        }
      }, 'resetAccessibilitySettings');
    },

    resetNotificationSettings: () => {
      set((state) => {
        // Use Immer-compatible property assignment instead of Object.assign
        for (const [key, value] of Object.entries(defaultNotificationSettings)) {
          (state as Record<string, unknown>)[key] = value;
        }
      }, 'resetNotificationSettings');
    },
  }),
});

// ============================================================================
// Exported Type
// ============================================================================

export type SettingsSlice = SettingsState & SettingsActions;

// ============================================================================
// Default Settings Export (for external use)
// ============================================================================

export { defaultSettings, defaultDisplaySettings, defaultAccessibilitySettings, defaultNotificationSettings };
