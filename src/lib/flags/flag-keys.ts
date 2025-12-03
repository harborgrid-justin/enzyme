/**
 * Central registry of all feature flag names.
 *
 * ## Categories
 * - **UI**: Visual features and theme settings
 * - **Auth**: Authentication and security features
 * - **Data**: Data management and real-time features
 * - **Reports**: Report generation and export features
 * - **Admin**: Administrative and debugging features
 * - **UX**: User experience enhancements
 * - **Beta**: Experimental and preview features
 */
export const flagKeys = {
  // ============================================
  // UI Category - Visual and theme features
  // ============================================
  /** Enable dark mode toggle in theme settings */
  DARK_MODE: 'dark-mode',
  /** Enable the redesigned dashboard experience */
  NEW_DASHBOARD: 'new-dashboard',

  // ============================================
  // Auth Category - Authentication features
  // ============================================
  /** Enable multi-factor authentication */
  MFA_ENABLED: 'mfa-enabled',
  /** Enable email verification flow */
  EMAIL_VERIFICATION: 'email-verification',
  /** Enable social login providers (Google, GitHub, etc.) */
  SOCIAL_LOGIN: 'social-login',
  /** Enable user profile editing */
  USER_PROFILE_EDITING: 'user-profile-editing',
  /** Enable admin panel access */
  ADMIN_PANEL: 'admin-panel',

  // ============================================
  // Data Category - Data and real-time features
  // ============================================
  /** Enable real-time data updates via WebSocket/SSE */
  REAL_TIME_UPDATES: 'real-time-updates',
  /** Enable v2 analytics tracking */
  ANALYTICS_V2: 'analytics-v2',
  /** Enable API rate limiting display */
  API_RATE_LIMIT_DISPLAY: 'api-rate-limit-display',

  // ============================================
  // Reports Category - Report features
  // ============================================
  /** Enable report export functionality */
  EXPORT_REPORTS: 'export-reports',
  /** Enable reports feature overall */
  REPORTS_ENABLED: 'reports-enabled',

  // ============================================
  // Search Category - Search and filter features
  // ============================================
  /** Enable advanced filtering options */
  ADVANCED_FILTERS: 'advanced-filters',
  /** Enable advanced search functionality */
  ADVANCED_SEARCH: 'advanced-search',

  // ============================================
  // Admin Category - Admin and debug features
  // ============================================
  /** Enable debug mode toggle for developers */
  DEBUG_MODE: 'debug-mode',
  /** Enable maintenance mode banner */
  MAINTENANCE_MODE: 'maintenance-mode',

  // ============================================
  // UX Category - User experience features
  // ============================================
  /** Enable feature announcements banner */
  FEATURE_ANNOUNCEMENTS: 'feature-announcements',
  /** Enable onboarding tour for new users */
  ONBOARDING_TOUR: 'onboarding-tour',
  /** Enable keyboard shortcuts */
  KEYBOARD_SHORTCUTS: 'keyboard-shortcuts',

  // ============================================
  // Beta Category - Experimental features
  // ============================================
  /** Enable access to beta features */
  BETA_FEATURES: 'beta-features',
} as const;

export type FlagKey = (typeof flagKeys)[keyof typeof flagKeys];

/**
 * Flag categories for organizational purposes
 */
export const flagCategories = {
  UI: ['dark-mode', 'new-dashboard'] as const,
  AUTH: [
    'mfa-enabled',
    'email-verification',
    'social-login',
    'user-profile-editing',
    'admin-panel',
  ] as const,
  DATA: ['real-time-updates', 'analytics-v2', 'api-rate-limit-display'] as const,
  REPORTS: ['export-reports', 'reports-enabled'] as const,
  SEARCH: ['advanced-filters', 'advanced-search'] as const,
  ADMIN: ['debug-mode', 'maintenance-mode'] as const,
  UX: ['feature-announcements', 'onboarding-tour', 'keyboard-shortcuts'] as const,
  BETA: ['beta-features'] as const,
} as const;

export type FlagCategory = keyof typeof flagCategories;
