/**
 * @file Configuration Schema Definitions
 * @description Zod schemas for validating Enzyme configuration files
 */

import { z } from 'zod';

// =============================================================================
// Base Types
// =============================================================================

/**
 * Common port schema for server configurations
 */
const portSchema = z.number().int().min(1024).max(65535);

/**
 * URL schema with validation
 */
// const urlSchema = z.string().url().or(z.string().regex(/^\/[\w/-]*$/));

/**
 * File path schema
 */
const filePathSchema = z.string().min(1);

/**
 * Environment type
 */
export const environmentSchema = z.enum(['development', 'staging', 'production', 'test']);

/**
 * Log level
 */
export const logLevelSchema = z.enum(['debug', 'info', 'warn', 'error', 'silent']);

// =============================================================================
// Route Configuration Schema
// =============================================================================

/**
 * Route guard schema
 */
export const routeGuardSchema = z.object({
  type: z.enum(['auth', 'role', 'permission', 'custom']),
  config: z.record(z.string(), z.unknown()).optional(),
  redirect: z.string().optional(),
});

/**
 * Route metadata schema
 */
export const routeMetadataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  breadcrumb: z.string().optional(),
  hidden: z.boolean().optional(),
  disabled: z.boolean().optional(),
});

/**
 * Single route configuration
 */
export const routeConfigSchema: any = z.object({
  path: z.string(),
  component: filePathSchema.optional(),
  lazy: z.boolean().optional(),
  guards: z.array(routeGuardSchema).optional(),
  metadata: routeMetadataSchema.optional(),
  children: z.lazy(() => z.array(routeConfigSchema)).optional(),
  redirect: z.string().optional(),
  caseSensitive: z.boolean().optional(),
  index: z.boolean().optional(),
});

/**
 * Route configuration collection
 */
export const routesConfigSchema = z.object({
  basePath: z.string().optional(),
  routes: z.array(routeConfigSchema),
  notFound: filePathSchema.optional(),
  error: filePathSchema.optional(),
});

/**
 *
 */
export type RouteConfig = z.infer<typeof routeConfigSchema>;
/**
 *
 */
export type RoutesConfig = z.infer<typeof routesConfigSchema>;

// =============================================================================
// Auth Configuration Schema
// =============================================================================

/**
 * OAuth provider configuration
 */
export const oauthProviderSchema = z.object({
  clientId: z.string(),
  redirectUri: z.string().url(),
  scopes: z.array(z.string()).optional(),
  authorizeUrl: z.string().url().optional(),
  tokenUrl: z.string().url().optional(),
});

/**
 * Auth configuration
 */
export const authConfigSchema = z.object({
  enabled: z.boolean().default(true),
  provider: z.enum(['jwt', 'oauth', 'custom']).default('jwt'),
  tokenKey: z.string().default('auth_token'),
  refreshKey: z.string().default('refresh_token'),
  tokenExpiry: z.number().int().positive().default(3600),
  refreshInterval: z.number().int().positive().default(300),
  loginPath: z.string().default('/auth/login'),
  logoutPath: z.string().default('/auth/logout'),
  redirectAfterLogin: z.string().default('/'),
  redirectAfterLogout: z.string().default('/auth/login'),
  oauth: z.record(z.string(), oauthProviderSchema).optional(),
  persistSession: z.boolean().default(true),
  secureCookies: z.boolean().default(true),
});

/**
 *
 */
export type AuthConfig = z.infer<typeof authConfigSchema>;

// =============================================================================
// API Configuration Schema
// =============================================================================

/**
 * API endpoint configuration
 */
export const apiEndpointSchema = z.object({
  url: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  timeout: z.number().int().positive().optional(),
  retry: z.number().int().min(0).max(5).optional(),
  cache: z.boolean().optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

/**
 * API configuration
 */
export const apiConfigSchema = z.object({
  baseUrl: z.string().url(),
  timeout: z.number().int().positive().default(30000),
  retryCount: z.number().int().min(0).max(5).default(3),
  retryDelay: z.number().int().positive().default(1000),
  headers: z.record(z.string(), z.string()).optional(),
  endpoints: z.record(z.string(), apiEndpointSchema).optional(),
  mockEnabled: z.boolean().default(false),
  mockDelay: z.number().int().min(0).default(500),
});

/**
 *
 */
export type ApiConfig = z.infer<typeof apiConfigSchema>;

// =============================================================================
// Feature Flags Configuration Schema
// =============================================================================

/**
 * Feature flag definition
 */
export const featureFlagSchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
  description: z.string().optional(),
  rolloutPercentage: z.number().min(0).max(100).optional(),
  variants: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Feature flags configuration
 */
export const featureFlagsConfigSchema = z.object({
  enabled: z.boolean().default(true),
  source: z.enum(['local', 'remote', 'hybrid']).default('local'),
  remoteUrl: z.string().url().optional(),
  pollInterval: z.number().int().positive().default(60000),
  flags: z.array(featureFlagSchema).default([]),
  localOverrides: z.record(z.string(), z.boolean()).optional(),
});

/**
 *
 */
export type FeatureConfig = z.infer<typeof featureFlagSchema>;
/**
 *
 */
export type FeatureFlagsConfig = z.infer<typeof featureFlagsConfigSchema>;

// =============================================================================
// Performance Configuration Schema
// =============================================================================

/**
 * Performance optimization configuration
 */
export const performanceConfigSchema = z.object({
  lazyLoading: z.boolean().default(true),
  codesplitting: z.boolean().default(true),
  prefetch: z.boolean().default(true),
  preload: z.boolean().default(false),
  compression: z.boolean().default(true),
  bundleAnalysis: z.boolean().default(false),
  sourceMaps: z.boolean().default(true),
  minify: z.boolean().default(true),
});

/**
 *
 */
export type PerformanceConfig = z.infer<typeof performanceConfigSchema>;

// =============================================================================
// Development Server Configuration Schema
// =============================================================================

/**
 * Dev server configuration
 */
export const devServerConfigSchema = z.object({
  port: portSchema.default(3000),
  host: z.string().default('localhost'),
  open: z.boolean().default(true),
  https: z.boolean().default(false),
  proxy: z.record(z.string(), z.object({
    target: z.string().url(),
    changeOrigin: z.boolean().optional(),
    rewrite: z.function().optional(),
  })).optional(),
  hmr: z.boolean().default(true),
  cors: z.boolean().default(true),
});

/**
 *
 */
export type DevServerConfig = z.infer<typeof devServerConfigSchema>;

// =============================================================================
// Build Configuration Schema
// =============================================================================

/**
 * Build configuration
 */
export const buildConfigSchema = z.object({
  outDir: filePathSchema.default('dist'),
  assetsDir: filePathSchema.default('assets'),
  sourcemap: z.boolean().or(z.enum(['inline', 'hidden'])).default(true),
  minify: z.boolean().or(z.enum(['terser', 'esbuild'])).default('esbuild'),
  target: z.string().default('es2020'),
  polyfills: z.boolean().default(true),
  cssCodeSplit: z.boolean().default(true),
});

/**
 *
 */
export type BuildConfig = z.infer<typeof buildConfigSchema>;

// =============================================================================
// Monitoring Configuration Schema
// =============================================================================

/**
 * Monitoring configuration
 */
export const monitoringConfigSchema = z.object({
  enabled: z.boolean().default(false),
  sentry: z.object({
    dsn: z.string().optional(),
    environment: environmentSchema.optional(),
    tracesSampleRate: z.number().min(0).max(1).default(0.1),
    replaysSessionSampleRate: z.number().min(0).max(1).default(0.1),
  }).optional(),
  analytics: z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(['google', 'mixpanel', 'custom']).optional(),
    trackingId: z.string().optional(),
  }).optional(),
  performanceMonitoring: z.boolean().default(true),
  errorReporting: z.boolean().default(true),
});

/**
 *
 */
export type MonitoringConfig = z.infer<typeof monitoringConfigSchema>;

// =============================================================================
// Main Enzyme Configuration Schema
// =============================================================================

/**
 * Complete Enzyme configuration schema
 */
export const enzymeConfigSchema = z.object({
  // App metadata
  name: z.string().default('Enzyme App'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).default('1.0.0'),
  description: z.string().optional(),

  // Environment
  environment: environmentSchema.default('development'),

  // Core configurations
  routes: routesConfigSchema.optional(),
  auth: authConfigSchema.optional(),
  api: apiConfigSchema.optional(),
  features: featureFlagsConfigSchema.optional(),

  // Development
  devServer: devServerConfigSchema.optional(),

  // Build
  build: buildConfigSchema.optional(),

  // Performance
  performance: performanceConfigSchema.optional(),

  // Monitoring
  monitoring: monitoringConfigSchema.optional(),

  // Custom configurations
  plugins: z.array(z.object({
    name: z.string(),
    options: z.record(z.string(), z.unknown()).optional(),
  })).optional(),

  // Advanced
  experimental: z.record(z.string(), z.boolean()).optional(),

  // Logging
  logging: z.object({
    level: logLevelSchema.default('info'),
    format: z.enum(['json', 'pretty']).default('pretty'),
    outputs: z.array(z.enum(['console', 'file', 'remote'])).default(['console']),
  }).optional(),
});

/**
 *
 */
export type EnzymeConfigSchema = z.infer<typeof enzymeConfigSchema>;

// =============================================================================
// Schema Utilities
// =============================================================================

/**
 * Validate configuration against schema
 * @param config
 */
export function validateEnzymeConfig(config: unknown) {
  return enzymeConfigSchema.safeParse(config);
}

/**
 * Parse and validate configuration with defaults
 * @param config
 */
export function parseEnzymeConfig(config: unknown): EnzymeConfigSchema {
  return enzymeConfigSchema.parse(config);
}

/**
 * Get default configuration
 */
export function getDefaultEnzymeConfig(): EnzymeConfigSchema {
  return enzymeConfigSchema.parse({});
}

/**
 * Validate partial configuration
 * @param config
 */
export function validatePartialConfig(config: unknown) {
  return enzymeConfigSchema.partial().safeParse(config);
}

/**
 * Schema registry for dynamic validation
 */
export const schemaRegistry = {
  enzyme: enzymeConfigSchema,
  routes: routesConfigSchema,
  auth: authConfigSchema,
  api: apiConfigSchema,
  features: featureFlagsConfigSchema,
  performance: performanceConfigSchema,
  devServer: devServerConfigSchema,
  build: buildConfigSchema,
  monitoring: monitoringConfigSchema,
} as const;

/**
 *
 */
export type SchemaKey = keyof typeof schemaRegistry;

/**
 * Get schema by key
 * @param key
 */
export function getSchema(key: SchemaKey) {
  return schemaRegistry[key];
}

/**
 * Validate against specific schema
 * @param key
 * @param config
 */
export function validateWithSchema<K extends SchemaKey>(
  key: K,
  config: unknown
) {
  const schema = getSchema(key);
  return schema.safeParse(config);
}
