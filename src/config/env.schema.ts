/**
 * @file Environment Configuration Schema
 * @description Type-safe environment validation using Zod.
 *
 * This is the SINGLE source of truth for all environment variables.
 * All env vars are validated at application startup.
 *
 * USAGE:
 * ```typescript
 * import { envSchema, parseEnvOrThrow } from '@/config/env.schema';
 *
 * // Validate at app startup
 * const config = parseEnvOrThrow(import.meta.env);
 * ```
 */

import { z } from 'zod';

// =============================================================================
// Environment Type Definitions
// =============================================================================

/**
 * Application environments
 */
const AppEnvironment = z.enum(['development', 'staging', 'production']);
type AppEnvironment = z.infer<typeof AppEnvironment>;

/**
 * Feature flag source types
 */
const FeatureFlagSource = z.enum(['local', 'remote', 'launchdarkly']);
type FeatureFlagSource = z.infer<typeof FeatureFlagSource>;

// =============================================================================
// Environment Schema Definition
// =============================================================================

/**
 * Complete environment configuration schema.
 *
 * CRITICAL: This schema must match ImportMetaEnv in global.d.ts
 */
export const envSchema = z.object({
  // -------------------------------------------------------------------------
  // Core Application
  // -------------------------------------------------------------------------

  /** Application environment */
  VITE_APP_ENV: AppEnvironment.default('development'),

  /** Application version (follows semver) */
  VITE_APP_VERSION: z
    .string()
    .regex(/^\d+\.\d+\.\d+(-[\w.]+)?$/, 'Must be a valid semver version')
    .default('1.0.0'),

  /** Application name for display */
  VITE_APP_NAME: z.string().min(1).default('Enterprise App'),

  // -------------------------------------------------------------------------
  // API Configuration
  // -------------------------------------------------------------------------

  /** Base URL for API requests */
  VITE_API_BASE_URL: z.string().url().default('http://localhost:3001/api'),

  /** API request timeout in milliseconds */
  VITE_API_TIMEOUT: z.coerce.number().int().positive().default(30000),

  /** Maximum retry attempts for failed requests */
  VITE_API_RETRY_ATTEMPTS: z.coerce.number().int().min(0).max(10).default(3),

  // -------------------------------------------------------------------------
  // Real-time Communication
  // -------------------------------------------------------------------------

  /** WebSocket endpoint URL */
  VITE_WS_URL: z.string().url().default('ws://localhost:3001/ws'),

  /** Server-Sent Events endpoint URL */
  VITE_SSE_URL: z.string().url().default('http://localhost:3001/sse'),

  // -------------------------------------------------------------------------
  // Authentication
  // -------------------------------------------------------------------------

  /** Storage key prefix for auth tokens */
  VITE_AUTH_TOKEN_KEY: z.string().min(1).default('auth_token'),

  /** Token refresh interval in milliseconds */
  VITE_AUTH_REFRESH_INTERVAL: z.coerce.number().int().positive().default(300000),

  /** Session timeout in milliseconds (inactivity) */
  VITE_SESSION_TIMEOUT: z.coerce.number().int().positive().default(1800000),

  // -------------------------------------------------------------------------
  // Feature Flags
  // -------------------------------------------------------------------------

  /** Enable feature flag system */
  VITE_FEATURE_FLAGS_ENABLED: z
    .union([z.boolean(), z.string().transform((val) => val === 'true' || val === '1')])
    .default(true),

  /** Feature flag source */
  VITE_FEATURE_FLAGS_SOURCE: FeatureFlagSource.default('local'),

  /** Remote feature flags URL (if source is 'remote') */
  VITE_FEATURE_FLAGS_URL: z.string().url().optional(),

  // -------------------------------------------------------------------------
  // Monitoring & Analytics
  // -------------------------------------------------------------------------

  /** Sentry DSN for error reporting */
  VITE_SENTRY_DSN: z.string().optional(),

  /** Enable error reporting to Sentry */
  VITE_ENABLE_ERROR_REPORTING: z
    .union([z.boolean(), z.string().transform((val) => val === 'true' || val === '1')])
    .default(false),

  /** Enable analytics tracking */
  VITE_ENABLE_ANALYTICS: z
    .union([z.boolean(), z.string().transform((val) => val === 'true' || val === '1')])
    .default(false),

  // -------------------------------------------------------------------------
  // Development
  // -------------------------------------------------------------------------

  /** Enable debug mode (extra logging, dev tools) */
  VITE_DEBUG_MODE: z
    .union([z.boolean(), z.string().transform((val) => val === 'true' || val === '1')])
    .optional(),
});

// =============================================================================
// Type Exports
// =============================================================================

/**
 * Raw environment variables type (from import.meta.env)
 */
export type RawEnvVars = z.input<typeof envSchema>;

/**
 * Validated and transformed environment configuration
 */
export type ValidatedEnvConfig = z.output<typeof envSchema>;

// =============================================================================
// Validation & Parsing
// =============================================================================

/**
 * Validation result type
 */
export type EnvValidationResult =
  | { success: true; data: ValidatedEnvConfig }
  | { success: false; errors: z.ZodError<RawEnvVars> };

/**
 * Parse and validate environment variables
 *
 * @param rawEnv - Raw environment object (typically import.meta.env)
 * @returns Validation result with typed data or errors
 *
 * @example
 * ```typescript
 * const result = parseEnv(import.meta.env);
 * if (result.success) {
 *   console.log(result.data.VITE_API_BASE_URL);
 * } else {
 *   console.error(result.errors);
 * }
 * ```
 */
export function parseEnv(rawEnv: Record<string, unknown>): EnvValidationResult {
  const result = envSchema.safeParse(rawEnv);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}

/**
 * Parse environment and throw on validation failure
 *
 * @param rawEnv - Raw environment object
 * @throws Error with detailed validation messages
 *
 * @example
 * ```typescript
 * // Use at app startup
 * const config = parseEnvOrThrow(import.meta.env);
 * ```
 */
export function parseEnvOrThrow(rawEnv: Record<string, unknown>): ValidatedEnvConfig {
  const result = parseEnv(rawEnv);

  if (!result.success) {
    const errorMessages = result.errors.issues
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');

    throw new Error(
      `Environment validation failed:\n${errorMessages}\n\n` +
        'Check your .env file and ensure all required variables are set.'
    );
  }

  return result.data;
}

/**
 * Format environment validation errors for display
 */
export function formatEnvErrors(errors: z.ZodError<RawEnvVars>): string[] {
  return errors.issues.map((err) => {
    const path = err.path.join('.');
    return `${path}: ${err.message}`;
  });
}

// =============================================================================
// Environment Variable Documentation Generator
// =============================================================================

/**
 * Generate documentation for all environment variables
 * Useful for .env.example generation
 *
 * @returns Formatted environment template string
 */
export function generateEnvDocs(): string {
  const lines: string[] = [
    '# Environment Configuration',
    '# Generated from env.schema.ts',
    '',
    '# =============================================================================',
    '# Core Application',
    '# =============================================================================',
    'VITE_APP_ENV=development          # development | staging | production',
    'VITE_APP_VERSION=1.0.0            # Semantic version',
    'VITE_APP_NAME="Enterprise App"    # Application display name',
    '',
    '# =============================================================================',
    '# API Configuration',
    '# =============================================================================',
    'VITE_API_BASE_URL=http://localhost:3001/api',
    'VITE_API_TIMEOUT=30000            # Request timeout in ms',
    'VITE_API_RETRY_ATTEMPTS=3         # Max retry attempts',
    '',
    '# =============================================================================',
    '# Real-time Communication',
    '# =============================================================================',
    'VITE_WS_URL=ws://localhost:3001/ws',
    'VITE_SSE_URL=http://localhost:3001/sse',
    '',
    '# =============================================================================',
    '# Authentication',
    '# =============================================================================',
    'VITE_AUTH_TOKEN_KEY=auth_token    # LocalStorage key prefix',
    'VITE_AUTH_REFRESH_INTERVAL=300000 # Token refresh interval (5 min)',
    'VITE_SESSION_TIMEOUT=1800000      # Session timeout (30 min)',
    '',
    '# =============================================================================',
    '# Feature Flags',
    '# =============================================================================',
    'VITE_FEATURE_FLAGS_ENABLED=true',
    'VITE_FEATURE_FLAGS_SOURCE=local   # local | remote | launchdarkly',
    '# VITE_FEATURE_FLAGS_URL=         # Required if source is remote',
    '',
    '# =============================================================================',
    '# Monitoring & Analytics',
    '# =============================================================================',
    '# VITE_SENTRY_DSN=                 # Sentry DSN (optional)',
    'VITE_ENABLE_ERROR_REPORTING=false',
    'VITE_ENABLE_ANALYTICS=false',
    '',
    '# =============================================================================',
    '# Development',
    '# =============================================================================',
    '# VITE_DEBUG_MODE=true             # Enable debug features',
  ];

  return lines.join('\n');
}

// =============================================================================
// Environment Variable Access Helpers
// =============================================================================

/**
 * Check if running in development mode
 */
export function isDevelopment(config: ValidatedEnvConfig): boolean {
  return config.VITE_APP_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(config: ValidatedEnvConfig): boolean {
  return config.VITE_APP_ENV === 'production';
}

/**
 * Check if running in staging mode
 */
export function isStaging(config: ValidatedEnvConfig): boolean {
  return config.VITE_APP_ENV === 'staging';
}

/**
 * Check if debug mode is enabled
 */
export function isDebugMode(config: ValidatedEnvConfig): boolean {
  return config.VITE_DEBUG_MODE === true || isDevelopment(config);
}
