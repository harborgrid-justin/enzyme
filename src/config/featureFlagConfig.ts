import { flagKeys, flagCategories, type FlagCategory } from '@/lib/flags/flagKeys';

/**
 * Global default values & source keys for feature flags.
 *
 * @see /src/lib/flags/flagKeys.ts for flag key definitions
 * @see /src/lib/docs/FEATURE-FLAGS.md for usage documentation
 */

export interface FeatureFlagDefinition {
  /** The flag key string (e.g., 'dark-mode') */
  key: string;
  /** Default value when flag is not set */
  defaultValue: boolean;
  /** Human-readable description of what this flag controls */
  description: string;
  /** Category for organizational grouping */
  category: FlagCategory;
  /** If true, this flag is still in development */
  experimental?: boolean;
  /** Minimum user role required to see this feature even when enabled */
  minRole?: string;
  /** Dependencies on other flags (all must be enabled) */
  dependencies?: string[];
}

/**
 * Central feature flag configuration.
 * This is the source of truth for all feature flags in the application.
 *
 * ## Categories
 * - **UI**: Visual features (dark-mode, new-dashboard)
 * - **AUTH**: Authentication features (mfa, email verification, social login)
 * - **DATA**: Data features (real-time, analytics)
 * - **REPORTS**: Report features (export, reports enabled)
 * - **SEARCH**: Search features (advanced filters, advanced search)
 * - **ADMIN**: Admin features (debug mode, maintenance mode)
 * - **UX**: User experience (announcements, onboarding, shortcuts)
 * - **BETA**: Experimental features
 */
export const featureFlagConfig: Record<keyof typeof flagKeys, FeatureFlagDefinition> = {
  // ============================================
  // UI Category
  // ============================================
  DARK_MODE: {
    key: flagKeys.DARK_MODE,
    defaultValue: true,
    description: 'Enable dark mode toggle in theme settings',
    category: 'UI',
  },
  NEW_DASHBOARD: {
    key: flagKeys.NEW_DASHBOARD,
    defaultValue: false,
    description: 'Enable the redesigned dashboard experience',
    category: 'UI',
    experimental: true,
  },

  // ============================================
  // AUTH Category
  // ============================================
  MFA_ENABLED: {
    key: flagKeys.MFA_ENABLED,
    defaultValue: false,
    description: 'Enable multi-factor authentication (TOTP, SMS, etc.)',
    category: 'AUTH',
  },
  EMAIL_VERIFICATION: {
    key: flagKeys.EMAIL_VERIFICATION,
    defaultValue: true,
    description: 'Enable email verification flow for new accounts',
    category: 'AUTH',
  },
  SOCIAL_LOGIN: {
    key: flagKeys.SOCIAL_LOGIN,
    defaultValue: false,
    description: 'Enable social login providers (Google, GitHub, etc.)',
    category: 'AUTH',
  },
  USER_PROFILE_EDITING: {
    key: flagKeys.USER_PROFILE_EDITING,
    defaultValue: true,
    description: 'Enable user profile editing capabilities',
    category: 'AUTH',
  },
  ADMIN_PANEL: {
    key: flagKeys.ADMIN_PANEL,
    defaultValue: true,
    description: 'Enable admin panel access for authorized users',
    category: 'AUTH',
    minRole: 'admin',
  },

  // ============================================
  // DATA Category
  // ============================================
  REAL_TIME_UPDATES: {
    key: flagKeys.REAL_TIME_UPDATES,
    defaultValue: true,
    description: 'Enable real-time data updates via WebSocket/SSE',
    category: 'DATA',
  },
  ANALYTICS_V2: {
    key: flagKeys.ANALYTICS_V2,
    defaultValue: false,
    description: 'Enable v2 analytics tracking with enhanced metrics',
    category: 'DATA',
    experimental: true,
  },
  API_RATE_LIMIT_DISPLAY: {
    key: flagKeys.API_RATE_LIMIT_DISPLAY,
    defaultValue: false,
    description: 'Display API rate limit information in the UI',
    category: 'DATA',
  },

  // ============================================
  // REPORTS Category
  // ============================================
  EXPORT_REPORTS: {
    key: flagKeys.EXPORT_REPORTS,
    defaultValue: true,
    description: 'Enable report export functionality (PDF, CSV, Excel)',
    category: 'REPORTS',
  },
  REPORTS_ENABLED: {
    key: flagKeys.REPORTS_ENABLED,
    defaultValue: true,
    description: 'Enable the reports feature overall',
    category: 'REPORTS',
  },

  // ============================================
  // SEARCH Category
  // ============================================
  ADVANCED_FILTERS: {
    key: flagKeys.ADVANCED_FILTERS,
    defaultValue: false,
    description: 'Enable advanced filtering options in lists',
    category: 'SEARCH',
    experimental: true,
  },
  ADVANCED_SEARCH: {
    key: flagKeys.ADVANCED_SEARCH,
    defaultValue: false,
    description: 'Enable advanced search with boolean operators and filters',
    category: 'SEARCH',
    experimental: true,
  },

  // ============================================
  // ADMIN Category
  // ============================================
  DEBUG_MODE: {
    key: flagKeys.DEBUG_MODE,
    defaultValue: false,
    description: 'Enable debug mode toggle for developers',
    category: 'ADMIN',
    minRole: 'admin',
  },
  MAINTENANCE_MODE: {
    key: flagKeys.MAINTENANCE_MODE,
    defaultValue: false,
    description: 'Display maintenance mode banner to users',
    category: 'ADMIN',
  },

  // ============================================
  // UX Category
  // ============================================
  FEATURE_ANNOUNCEMENTS: {
    key: flagKeys.FEATURE_ANNOUNCEMENTS,
    defaultValue: true,
    description: 'Display feature announcement banners for new features',
    category: 'UX',
  },
  ONBOARDING_TOUR: {
    key: flagKeys.ONBOARDING_TOUR,
    defaultValue: true,
    description: 'Enable onboarding tour for new users',
    category: 'UX',
  },
  KEYBOARD_SHORTCUTS: {
    key: flagKeys.KEYBOARD_SHORTCUTS,
    defaultValue: true,
    description: 'Enable keyboard shortcuts throughout the application',
    category: 'UX',
  },

  // ============================================
  // BETA Category
  // ============================================
  BETA_FEATURES: {
    key: flagKeys.BETA_FEATURES,
    defaultValue: false,
    description: 'Enable access to beta/preview features',
    category: 'BETA',
    minRole: 'admin',
  },
};

/**
 * Get the default value for a feature flag
 */
export function getDefaultFlagValue(flagKey: string): boolean {
  const flag = Object.values(featureFlagConfig).find((f) => f.key === flagKey);
  return flag?.defaultValue ?? false;
}

/**
 * Get all feature flags as a map of key -> default value
 */
export function getDefaultFlags(): Record<string, boolean> {
  return Object.values(featureFlagConfig).reduce(
    (acc, flag) => {
      acc[flag.key] = flag.defaultValue;
      return acc;
    },
    {} as Record<string, boolean>
  );
}

/**
 * Get feature flags by category
 */
export function getFlagsByCategory(category: FlagCategory): FeatureFlagDefinition[] {
  return Object.values(featureFlagConfig).filter((flag) => flag.category === category);
}

/**
 * Get experimental feature flags
 */
export function getExperimentalFlags(): FeatureFlagDefinition[] {
  return Object.values(featureFlagConfig).filter((flag) => flag.experimental === true);
}

/**
 * Get flags that require a specific role
 */
export function getFlagsRequiringRole(role: string): FeatureFlagDefinition[] {
  return Object.values(featureFlagConfig).filter((flag) => flag.minRole === role);
}

/**
 * Get all flag definitions as an array
 */
export function getAllFlagDefinitions(): FeatureFlagDefinition[] {
  return Object.values(featureFlagConfig);
}

/**
 * Check if a flag exists in the configuration
 */
export function isFlagDefined(flagKey: string): boolean {
  return Object.values(featureFlagConfig).some((flag) => flag.key === flagKey);
}

/**
 * Get flag definition by key
 */
export function getFlagDefinition(flagKey: string): FeatureFlagDefinition | undefined {
  return Object.values(featureFlagConfig).find((flag) => flag.key === flagKey);
}
