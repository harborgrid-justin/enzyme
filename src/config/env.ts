/**
 * @file Type-Safe Environment Variables
 * @description Runtime-validated, type-safe environment configuration
 *
 * Features:
 * - Compile-time type checking
 * - Runtime validation with meaningful errors
 * - Development-only warnings for missing optional values
 * - Frozen configuration to prevent mutation
 * - Full IntelliSense support
 */

/// <reference types="vite/client" />

// ============================================================================
// Type Definitions
// ============================================================================

type Environment = 'development' | 'staging' | 'production' | 'test';
type FeatureFlagSource = 'local' | 'remote' | 'launchdarkly';
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

interface EnvConfig {
  // API Configuration
  readonly apiBaseUrl: string;
  readonly apiTimeout: number;
  readonly apiRetryCount: number;
  readonly apiRetryDelay: number;

  // WebSocket/SSE Endpoints
  readonly wsUrl: string;
  readonly sseUrl: string;
  readonly wsReconnectInterval: number;
  readonly wsMaxReconnectAttempts: number;

  // Feature Flags
  readonly featureFlagsEnabled: boolean;
  readonly featureFlagsSource: FeatureFlagSource;
  readonly featureFlagsRefreshInterval: number;

  // Auth Configuration
  readonly authTokenKey: string;
  readonly authRefreshInterval: number;
  readonly authTokenRefreshThreshold: number;

  // Monitoring & Logging
  readonly sentryDsn: string;
  readonly sentryEnvironment: string;
  readonly sentryRelease: string;
  readonly enableErrorReporting: boolean;
  readonly logLevel: LogLevel;
  readonly enablePerformanceMonitoring: boolean;

  // Analytics
  readonly analyticsEnabled: boolean;
  readonly analyticsKey: string;

  // Environment
  readonly appEnv: Environment;
  readonly appVersion: string;
  readonly appName: string;
  readonly buildTime: string;

  // Computed flags
  readonly isDev: boolean;
  readonly isProd: boolean;
  readonly isTest: boolean;
  readonly isStaging: boolean;
}

// ============================================================================
// Environment Variable Parsers
// ============================================================================

class EnvParser {
  private readonly prefix = 'VITE_';
  private readonly errors: string[] = [];
  private readonly warnings: string[] = [];

  getString(key: string, defaultValue?: string): string {
    const fullKey = `${this.prefix}${key}`;
    const value = (import.meta.env[fullKey] as string | undefined) ?? defaultValue;

    if (value === undefined) {
      this.errors.push(`Missing required environment variable: ${fullKey}`);
      return '';
    }

    return value;
  }

  getOptionalString(key: string, defaultValue: string): string {
    const fullKey = `${this.prefix}${key}`;
    const value = import.meta.env[fullKey] as string | undefined;

    if (value === undefined) {
      if (import.meta.env['DEV']) {
        this.warnings.push(`Using default value for ${fullKey}: "${defaultValue}"`);
      }
      return defaultValue;
    }

    return value;
  }

  getBoolean(key: string, defaultValue: boolean): boolean {
    const fullKey = `${this.prefix}${key}`;
    const value = import.meta.env[fullKey] as string | undefined;

    if (value === undefined) {
      return defaultValue;
    }

    return value === 'true' || value === '1';
  }

  getNumber(key: string, defaultValue: number): number {
    const fullKey = `${this.prefix}${key}`;
    const value = import.meta.env[fullKey] as string | undefined;

    if (value === undefined) {
      return defaultValue;
    }

    const parsed = parseInt(value, 10);

    if (isNaN(parsed)) {
      this.warnings.push(
        `Invalid number for ${fullKey}: "${value}", using default: ${String(defaultValue)}`,
      );
      return defaultValue;
    }

    return parsed;
  }

  getEnum<T extends string>(
    key: string,
    validValues: readonly T[],
    defaultValue: T,
  ): T {
    const fullKey = `${this.prefix}${key}`;
    const value = import.meta.env[fullKey] as T | undefined;

    if (value === undefined) {
      return defaultValue;
    }

    if (!validValues.includes(value)) {
      this.warnings.push(
        `Invalid value for ${fullKey}: "${value}". Valid values: ${validValues.join(', ')}. Using default: ${defaultValue}`,
      );
      return defaultValue;
    }

    return value;
  }

  validate(): void {
    // Log warnings in development
    if (import.meta.env['DEV'] && this.warnings.length > 0) {
      console.group('[Env Config] Warnings');
      this.warnings.forEach((w) => {
        console.warn(w);
      });
      console.groupEnd();
    }

    // Throw if there are errors
    if (this.errors.length > 0) {
      const errorMessage = [
        'Environment configuration errors:',
        ...this.errors.map((e) => `  - ${e}`),
        '',
        'Please check your .env file and ensure all required variables are set.',
      ].join('\n');

      throw new Error(errorMessage);
    }
  }
}

// ============================================================================
// Environment Configuration Builder
// ============================================================================

function buildEnvConfig(): EnvConfig {
  const parser = new EnvParser();

  const appEnv = parser.getEnum(
    'APP_ENV',
    ['development', 'staging', 'production', 'test'] as const,
    'development',
  );

  const config: EnvConfig = {
    // API Configuration
    apiBaseUrl: parser.getOptionalString('API_BASE_URL', 'http://localhost:3001/api'),
    apiTimeout: parser.getNumber('API_TIMEOUT', 30000),
    apiRetryCount: parser.getNumber('API_RETRY_COUNT', 3),
    apiRetryDelay: parser.getNumber('API_RETRY_DELAY', 1000),

    // WebSocket/SSE Endpoints
    wsUrl: parser.getOptionalString('WS_URL', 'ws://localhost:3001/ws'),
    sseUrl: parser.getOptionalString('SSE_URL', 'http://localhost:3001/sse'),
    wsReconnectInterval: parser.getNumber('WS_RECONNECT_INTERVAL', 3000),
    wsMaxReconnectAttempts: parser.getNumber('WS_MAX_RECONNECT_ATTEMPTS', 10),

    // Feature Flags
    featureFlagsEnabled: parser.getBoolean('FEATURE_FLAGS_ENABLED', true),
    featureFlagsSource: parser.getEnum(
      'FEATURE_FLAGS_SOURCE',
      ['local', 'remote', 'launchdarkly'] as const,
      'local',
    ),
    featureFlagsRefreshInterval: parser.getNumber('FEATURE_FLAGS_REFRESH_INTERVAL', 60000),

    // Auth Configuration
    authTokenKey: parser.getOptionalString('AUTH_TOKEN_KEY', 'auth_token'),
    authRefreshInterval: parser.getNumber('AUTH_REFRESH_INTERVAL', 300000),
    authTokenRefreshThreshold: parser.getNumber('AUTH_TOKEN_REFRESH_THRESHOLD', 60000),

    // Monitoring & Logging
    sentryDsn: parser.getOptionalString('SENTRY_DSN', ''),
    sentryEnvironment: parser.getOptionalString('SENTRY_ENVIRONMENT', appEnv),
    sentryRelease: parser.getOptionalString('SENTRY_RELEASE', ''),
    enableErrorReporting: parser.getBoolean('ENABLE_ERROR_REPORTING', appEnv === 'production'),
    logLevel: parser.getEnum(
      'LOG_LEVEL',
      ['debug', 'info', 'warn', 'error', 'silent'] as const,
      appEnv === 'production' ? 'warn' : 'debug',
    ),
    enablePerformanceMonitoring: parser.getBoolean(
      'ENABLE_PERFORMANCE_MONITORING',
      appEnv === 'production',
    ),

    // Analytics
    analyticsEnabled: parser.getBoolean('ANALYTICS_ENABLED', appEnv === 'production'),
    analyticsKey: parser.getOptionalString('ANALYTICS_KEY', ''),

    // Environment
    appEnv,
    appVersion: parser.getOptionalString('APP_VERSION', '0.0.0-dev'),
    appName: parser.getOptionalString('APP_NAME', 'Harbor React'),
    buildTime: parser.getOptionalString('BUILD_TIME', new Date().toISOString()),

    // Computed flags
    isDev: import.meta.env['DEV'] === true,
    isProd: import.meta.env['PROD'] === true,
    isTest: appEnv === 'test',
    isStaging: appEnv === 'staging',
  };

  // Validate configuration
  parser.validate();

  return Object.freeze(config);
}

// ============================================================================
// Exports
// ============================================================================

export const env = buildEnvConfig();

/**
 * Get environment configuration (alias for backwards compatibility)
 */
export function getEnvConfig(): EnvConfig {
  return env;
}

/**
 * Check if current environment matches
 */
export function isEnv(environment: Environment): boolean {
  return env.appEnv === environment;
}

/**
 * Run callback only in specified environment
 */
export function inEnv<T>(environment: Environment, callback: () => T): T | undefined {
  if (env.appEnv === environment) {
    return callback();
  }
  return undefined;
}

/**
 * Run callback only in development
 */
export function inDev<T>(callback: () => T): T | undefined {
  return inEnv('development', callback);
}

/**
 * Run callback only in production
 */
export function inProd<T>(callback: () => T): T | undefined {
  return inEnv('production', callback);
}

// Export type for external usage
export type { EnvConfig, Environment, FeatureFlagSource, LogLevel };
