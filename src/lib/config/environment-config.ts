/**
 * @fileoverview Environment-specific configuration management.
 *
 * Provides utilities for:
 * - Environment detection
 * - Environment-specific overrides
 * - Environment variable parsing
 * - Safe defaults per environment
 *
 * @module config/environment-config
 *
 * @example
 * ```typescript
 * const envConfig = new EnvironmentConfig();
 * const config = envConfig.resolve(baseConfig, {
 *   development: { api: { timeout: 30000 } },
 *   production: { api: { timeout: 10000 } },
 * });
 * ```
 */

import type {
  ConfigRecord,
  Environment,
  EnvironmentConfig as EnvironmentConfigType,
} from './types';
import { ConfigMerger } from './config-merger';

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Detect the current environment.
 */
export function detectEnvironment(): Environment {
  // Check import.meta.env (Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env?.MODE) {
    return normalizeEnvironment(import.meta.env.MODE);
  }

  // Check process.env (Node.js, CRA)
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return normalizeEnvironment(process.env.NODE_ENV);
  }

  // Check window.__ENV__ (runtime injection)
  const windowEnv = typeof window !== 'undefined' ? (window as { __ENV__?: string }).__ENV__ : undefined;
  if (windowEnv != null && windowEnv !== '') {
    return normalizeEnvironment(windowEnv);
  }

  // Default to development
  return 'development';
}

/**
 * Normalize environment string to standard values.
 */
function normalizeEnvironment(env: string): Environment {
  const normalized = env.toLowerCase().trim();

  switch (normalized) {
    case 'prod':
    case 'production':
      return 'production';
    case 'stage':
    case 'staging':
      return 'staging';
    case 'test':
    case 'testing':
      return 'test';
    case 'dev':
    case 'development':
    default:
      return 'development';
  }
}

// ============================================================================
// Environment Checks
// ============================================================================

/**
 * Check if running in development.
 */
export function isDevelopment(): boolean {
  return detectEnvironment() === 'development';
}

/**
 * Check if running in production.
 */
export function isProduction(): boolean {
  return detectEnvironment() === 'production';
}

/**
 * Check if running in staging.
 */
export function isStaging(): boolean {
  return detectEnvironment() === 'staging';
}

/**
 * Check if running in test.
 */
export function isTest(): boolean {
  return detectEnvironment() === 'test';
}

/**
 * Check if running in browser.
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if running on server.
 */
export function isServer(): boolean {
  return typeof window === 'undefined';
}

// ============================================================================
// Environment Config Manager
// ============================================================================

/**
 * Manager for environment-specific configuration.
 */
export class EnvironmentConfigManager<T extends ConfigRecord = ConfigRecord> {
  private environment: Environment;
  private merger: ConfigMerger;

  constructor(environment?: Environment) {
    this.environment = environment ?? detectEnvironment();
    this.merger = new ConfigMerger({ strategy: 'deep' });
  }

  /**
   * Get the current environment.
   */
  getEnvironment(): Environment {
    return this.environment;
  }

  /**
   * Set the environment (for testing).
   */
  setEnvironment(env: Environment): void {
    this.environment = env;
  }

  /**
   * Resolve configuration with environment overrides.
   */
  resolve(
    baseConfig: T,
    envOverrides: EnvironmentConfigType<T>
  ): T {
    const overrides = envOverrides[this.environment] as T | undefined;

    if (!overrides) {
      return baseConfig;
    }

    return this.merger.mergeTwo(baseConfig, overrides as unknown as ConfigRecord) as T;
  }

  /**
   * Get environment-specific value.
   */
  select<V>(options: { [K in Environment]?: V } & { default: V }): V {
    return options[this.environment] ?? options.default;
  }

  /**
   * Create environment-aware configuration factory.
   */
  createFactory<C extends ConfigRecord>(
    factory: (env: Environment) => C
  ): () => C {
    return () => factory(this.environment);
  }
}

// ============================================================================
// Environment-Specific Defaults
// ============================================================================

/**
 * Common configuration defaults per environment.
 */
export const environmentDefaults: Record<Environment, Partial<ConfigRecord>> = {
  development: {
    debug: true,
    logLevel: 'debug',
    apiTimeout: 30000,
    cacheEnabled: false,
    analyticsEnabled: false,
    errorReportingEnabled: false,
    performanceMonitoring: false,
  },
  staging: {
    debug: true,
    logLevel: 'info',
    apiTimeout: 15000,
    cacheEnabled: true,
    analyticsEnabled: true,
    errorReportingEnabled: true,
    performanceMonitoring: true,
  },
  production: {
    debug: false,
    logLevel: 'error',
    apiTimeout: 10000,
    cacheEnabled: true,
    analyticsEnabled: true,
    errorReportingEnabled: true,
    performanceMonitoring: true,
  },
  test: {
    debug: false,
    logLevel: 'error',
    apiTimeout: 5000,
    cacheEnabled: false,
    analyticsEnabled: false,
    errorReportingEnabled: false,
    performanceMonitoring: false,
  },
};

/**
 * Get environment defaults.
 */
export function getEnvironmentDefaults(
  env?: Environment
): Partial<ConfigRecord> {
  return environmentDefaults[env ?? detectEnvironment()];
}

// ============================================================================
// Environment Variable Helpers
// ============================================================================

/**
 * Get an environment variable with type coercion.
 */
export function getEnvVar(
  name: string,
  defaultValue?: string
): string | undefined {
  // Try import.meta.env (Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const value = import.meta.env[name];
    if (value !== undefined) {
      return value;
    }
  }

  // Try process.env (Node.js)
  if (typeof process !== 'undefined' && process.env) {
    const value = process.env[name];
    if (value !== undefined) {
      return value;
    }
  }

  return defaultValue;
}

/**
 * Get a required environment variable.
 */
export function requireEnvVar(name: string): string {
  const value = getEnvVar(name);
  if (value === undefined) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

/**
 * Get an environment variable as a number.
 */
export function getEnvVarAsNumber(
  name: string,
  defaultValue: number
): number {
  const value = getEnvVar(name);
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get an environment variable as a boolean.
 */
export function getEnvVarAsBoolean(
  name: string,
  defaultValue: boolean
): boolean {
  const value = getEnvVar(name);
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get an environment variable as JSON.
 */
export function getEnvVarAsJson<T>(
  name: string,
  defaultValue: T
): T {
  const value = getEnvVar(name);
  if (value === undefined) {
    return defaultValue;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Get an environment variable as an array.
 */
export function getEnvVarAsArray(
  name: string,
  defaultValue: string[] = [],
  separator = ','
): string[] {
  const value = getEnvVar(name);
  if (value === undefined) {
    return defaultValue;
  }
  return value.split(separator).map((s) => s.trim()).filter(Boolean);
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: EnvironmentConfigManager | null = null;

/**
 * Get the singleton environment config manager.
 */
export function getEnvironmentConfig(): EnvironmentConfigManager {
  if (!instance) {
    instance = new EnvironmentConfigManager();
  }
  return instance;
}

/**
 * Reset the singleton instance.
 */
export function resetEnvironmentConfig(): void {
  instance = null;
}
