/**
 * @file Application Configuration
 * @description Core application metadata and feature flags.
 *
 * NOTE: This file contains ONLY app-level configuration that doesn't fit
 * elsewhere. For specific config domains, use:
 *
 * - Routes: import { ROUTES } from '@/config' (from routes.registry.ts)
 * - Storage Keys: import { STORAGE_KEYS } from '@/config' (from storage.config.ts)
 * - Query Keys: import { QUERY_KEYS } from '@/config' (from api.config.ts)
 * - Timing: import { TIMING } from '@/config' (from timing.constants.ts)
 * - Design Tokens: import { COLORS, SPACING } from '@/config' (from design-tokens.ts)
 *
 * IMPORTANT: Always import from '@/config', not directly from individual files.
 */

import { ROUTES } from './routes.registry';
import {
  TIMING,
  QUERY_STALE_TIMES,
  QUERY_GC_TIMES,
  RETRY_CONFIG,
  UI_TIMING,
} from './timing.constants';

// =============================================================================
// App Metadata
// =============================================================================

/**
 * Core application configuration
 *
 * Contains app-level settings that don't belong to specific domains.
 * References centralized TIMING constants for consistency.
 */
export const APP_CONFIG = {
  /** Application name */
  NAME: 'SaaS Platform',

  /** Application version (should match package.json) */
  VERSION: '1.0.0',

  /** Application description */
  DESCRIPTION: 'Enterprise-grade SaaS platform built with React and Vite',

  /** Copyright holder */
  COPYRIGHT: 'White Cross Healthcare',

  /** Support email */
  SUPPORT_EMAIL: 'support@whitecross.com',

  // ---------------------------------------------------------------------------
  // Pagination Configuration
  // ---------------------------------------------------------------------------
  PAGINATION: {
    /** Default number of items per page */
    DEFAULT_PAGE_SIZE: 20,
    /** Available page size options */
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100] as const,
    /** Maximum allowed page size */
    MAX_PAGE_SIZE: 100,
  },

  // ---------------------------------------------------------------------------
  // File Upload Configuration
  // ---------------------------------------------------------------------------
  FILE_UPLOAD: {
    /** Maximum file size in bytes (10MB) */
    MAX_SIZE: 10 * 1024 * 1024,
    /** Maximum total upload size per request (50MB) */
    MAX_TOTAL_SIZE: 50 * 1024 * 1024,
    /** Maximum number of files per upload */
    MAX_FILES: 10,
    /** Allowed MIME types */
    ALLOWED_TYPES: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ] as const,
    /** Allowed image types for avatars */
    AVATAR_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
    /** Maximum avatar size (2MB) */
    AVATAR_MAX_SIZE: 2 * 1024 * 1024,
  },

  // ---------------------------------------------------------------------------
  // Toast Configuration (uses TIMING constants)
  // ---------------------------------------------------------------------------
  TOAST: {
    /** Default toast duration */
    DURATION: UI_TIMING.TOAST.STANDARD,
    /** Toast position */
    POSITION: 'top-right' as const,
    /** Maximum visible toasts */
    MAX_VISIBLE: 5,
  },

  // ---------------------------------------------------------------------------
  // React Query Configuration (uses TIMING constants)
  // ---------------------------------------------------------------------------
  QUERY_CLIENT: {
    /** Default stale time for queries */
    STALE_TIME: QUERY_STALE_TIMES.MEDIUM,
    /** Default garbage collection time */
    GC_TIME: QUERY_GC_TIMES.MEDIUM,
    /** Default retry attempts */
    RETRY_ATTEMPTS: RETRY_CONFIG.DEFAULT_ATTEMPTS,
    /** Refetch on window focus */
    REFETCH_ON_WINDOW_FOCUS: true,
    /** Refetch on reconnect */
    REFETCH_ON_RECONNECT: true,
  },

  // ---------------------------------------------------------------------------
  // Search Configuration
  // ---------------------------------------------------------------------------
  SEARCH: {
    /** Minimum characters before search triggers */
    MIN_CHARS: 2,
    /** Maximum search results to show */
    MAX_RESULTS: 50,
    /** Debounce delay for search input */
    DEBOUNCE_MS: TIMING.UI.DEBOUNCE.INPUT,
  },

  // ---------------------------------------------------------------------------
  // Session Configuration
  // ---------------------------------------------------------------------------
  SESSION: {
    /** Warn user before session expires (5 minutes before) */
    WARNING_BEFORE_EXPIRY: 5 * 60 * 1000,
    /** Extend session on activity */
    EXTEND_ON_ACTIVITY: true,
  },
} as const;

// =============================================================================
// Feature Flags
// =============================================================================

/**
 * Static feature flags
 *
 * These are compile-time feature flags. For runtime feature flags that can
 * be remotely controlled, see featureFlagConfig.ts.
 *
 * NOTE: For production apps, consider moving these to featureFlagConfig.ts
 * to enable remote control via LaunchDarkly or similar services.
 */
export const FEATURES = {
  /** Enable multi-factor authentication */
  MFA_ENABLED: true,

  /** Require email verification before access */
  EMAIL_VERIFICATION_REQUIRED: true,

  /** Enable social login (Google, GitHub, etc.) */
  SOCIAL_LOGIN: false,

  /** Enable analytics tracking (production only) */
  ANALYTICS: import.meta.env.PROD,

  /** Enable debug mode (development only) */
  DEBUG_MODE: import.meta.env.DEV,

  /** Show React Query devtools (development only) */
  SHOW_DEV_TOOLS: import.meta.env.DEV,

  /** Enable dark mode toggle */
  DARK_MODE: true,

  /** Enable real-time notifications */
  REALTIME_NOTIFICATIONS: true,

  /** Enable export functionality */
  EXPORT_ENABLED: true,

  /** Enable bulk actions */
  BULK_ACTIONS: true,

  /** Enable keyboard shortcuts */
  KEYBOARD_SHORTCUTS: true,
} as const;

// =============================================================================
// Navigation Configuration
// =============================================================================

/**
 * Navigation item type definition
 */
export interface NavItem {
  /** Display label */
  label: string;
  /** Route path */
  href: string;
  /** Icon name (from your icon library) */
  icon: string;
  /** Required permission to view */
  permission?: string;
  /** Whether to show badge */
  badge?: string | number;
  /** Sub-navigation items */
  children?: NavItem[];
}

/**
 * Main navigation items for sidebar/header
 *
 * These are the primary navigation links shown in the app shell.
 * For route metadata (auth requirements, etc.), see routes.registry.ts.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: ROUTES.DASHBOARD,
    icon: 'LayoutDashboard',
  },
  {
    label: 'Reports',
    href: ROUTES.REPORTS,
    icon: 'FileText',
    permission: 'view:reports',
    children: [
      { label: 'All Reports', href: ROUTES.REPORTS_LIST, icon: 'List' },
      {
        label: 'Create Report',
        href: ROUTES.REPORT_CREATE,
        icon: 'Plus',
        permission: 'create:reports',
      },
    ],
  },
  {
    label: 'Users',
    href: ROUTES.USERS,
    icon: 'Users',
    permission: 'view:users',
    children: [
      { label: 'All Users', href: ROUTES.USERS_LIST, icon: 'List' },
      { label: 'My Profile', href: ROUTES.USER_PROFILE, icon: 'User' },
    ],
  },
  {
    label: 'Settings',
    href: ROUTES.SETTINGS,
    icon: 'Settings',
    children: [
      { label: 'General', href: ROUTES.SETTINGS_GENERAL, icon: 'Sliders' },
      { label: 'Notifications', href: ROUTES.SETTINGS_NOTIFICATIONS, icon: 'Bell' },
      { label: 'Security', href: ROUTES.SETTINGS_SECURITY, icon: 'Shield' },
    ],
  },
];

/**
 * Admin navigation items (shown only to admin users)
 */
export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    label: 'Admin',
    href: ROUTES.ADMIN,
    icon: 'Shield',
    permission: 'admin:access',
    children: [
      { label: 'User Management', href: ROUTES.ADMIN_USERS, icon: 'Users' },
      { label: 'Roles & Permissions', href: ROUTES.ADMIN_ROLES, icon: 'Key' },
      { label: 'System Logs', href: ROUTES.ADMIN_LOGS, icon: 'FileText' },
    ],
  },
];

// =============================================================================
// Type Exports
// =============================================================================

/**
 * Feature flag keys type
 */
export type FeatureKey = keyof typeof FEATURES;

/**
 * App configuration type
 */
export type AppConfigType = typeof APP_CONFIG;
