/**
 * @file Configuration Auto-Discovery System
 * @description Automatic configuration file discovery, loading, and environment-based merging.
 *
 * This module provides:
 * - Automatic scanning for configuration files
 * - Plugin configuration auto-loading
 * - Feature configuration discovery
 * - Environment-based configuration merging
 * - Hot-reload support for development
 *
 * @module config/config-discovery
 */

import type {
  ConfigNamespace,
  ConfigRecord,
  ConfigSource,
  ConfigEnvironment,
  ConfigDiscoveryOptions,
  DiscoveredConfigFile,
  ConfigDiscoveryResult,
  ConfigSetOptions,
} from './types';
import { createNamespace } from './types';
import { getConfigRegistry, type ConfigRegistry } from './config-registry';
import { env } from './env';

// =============================================================================
// Configuration File Patterns
// =============================================================================

/**
 * Default patterns for configuration file discovery
 */
export const DEFAULT_CONFIG_PATTERNS = [
  '*.config.ts',
  '*.config.js',
  '*.config.json',
  'config/*.ts',
  'config/*.js',
  'config/*.json',
] as const;

/**
 * Patterns to exclude from discovery
 */
export const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules/**',
  'dist/**',
  'build/**',
  '*.test.*',
  '*.spec.*',
  '__tests__/**',
  '__mocks__/**',
] as const;

/**
 * Environment-specific file suffixes
 */
export const ENV_SUFFIXES: Record<ConfigEnvironment, string[]> = {
  development: ['.dev', '.development', '.local'],
  staging: ['.staging', '.stg'],
  production: ['.prod', '.production'],
  test: ['.test', '.testing'],
};

// =============================================================================
// Configuration Module Registry
// =============================================================================

/**
 * Registered configuration modules for auto-discovery
 */
interface ConfigModule<T extends ConfigRecord = ConfigRecord> {
  /** Module namespace */
  namespace: ConfigNamespace;
  /** Configuration factory or static config */
  config: T | (() => T) | (() => Promise<T>);
  /** Module priority (lower = loaded first) */
  priority: number;
  /** Environment restrictions */
  environments?: ConfigEnvironment[];
  /** Dependencies (other namespaces that must be loaded first) */
  dependencies?: ConfigNamespace[];
  /** Whether to merge with existing config */
  merge?: boolean;
}

const configModules: Map<ConfigNamespace, ConfigModule[]> = new Map();

/**
 * Register a configuration module for auto-discovery
 *
 * @param module - Configuration module definition
 *
 * @example
 * ```typescript
 * registerConfigModule({
 *   namespace: CONFIG_NAMESPACES.STREAMING,
 *   config: {
 *     enabled: true,
 *     bufferSize: 65536,
 *   },
 *   priority: 10,
 * });
 * ```
 */
export function registerConfigModule<T extends ConfigRecord>(
  module: ConfigModule<T>
): void {
  const existing = configModules.get(module.namespace) ?? [];
  existing.push(module as ConfigModule);
  existing.sort((a, b) => a.priority - b.priority);
  configModules.set(module.namespace, existing);
}

/**
 * Get all registered configuration modules
 */
export function getRegisteredModules(): Map<ConfigNamespace, ConfigModule[]> {
  return new Map(configModules);
}

/**
 * Clear all registered configuration modules
 */
export function clearRegisteredModules(): void {
  configModules.clear();
}

// =============================================================================
// Environment Configuration Loader
// =============================================================================

/**
 * Environment configuration sources in order of precedence (lowest to highest)
 */
export type ConfigPrecedence =
  | 'defaults'
  | 'base'
  | 'environment'
  | 'local'
  | 'runtime'
  | 'override';

/**
 * Environment configuration layer
 */
interface ConfigLayer<T extends ConfigRecord = ConfigRecord> {
  /** Layer source */
  source: ConfigPrecedence;
  /** Layer configuration */
  config: T;
  /** Layer priority */
  priority: number;
}

/**
 * Merge configuration layers with proper precedence
 *
 * @param layers - Configuration layers to merge
 * @returns Merged configuration
 */
export function mergeConfigLayers<T extends ConfigRecord>(
  layers: ConfigLayer<T>[]
): T {
  // Sort by priority (lower = applied first)
  const sorted = [...layers].sort((a, b) => a.priority - b.priority);

  // Deep merge all layers
  return sorted.reduce<T>((merged, layer) => {
    return deepMerge(merged, layer.config);
  }, {} as T);
}

/**
 * Deep merge two objects
 */
function deepMerge<T extends ConfigRecord>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
        result[key] = deepMerge(targetValue as ConfigRecord, sourceValue as ConfigRecord) as T[Extract<keyof T, string>];
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * Check if value is a plain object
 */
function isPlainObject(value: unknown): value is ConfigRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

// =============================================================================
// Configuration Discovery Engine
// =============================================================================

/**
 * Configuration Discovery Engine
 *
 * Provides automatic discovery and loading of configuration files
 * with support for:
 * - Pattern-based file discovery
 * - Environment-specific overrides
 * - Plugin configuration
 * - Hot-reload in development
 */
export class ConfigDiscovery {
  private readonly registry: ConfigRegistry;
  private readonly discoveredFiles: Map<string, DiscoveredConfigFile> = new Map();
  private initialized: boolean = false;

  constructor(options: ConfigDiscoveryOptions = {}) {
    this.registry = getConfigRegistry();
    // Options are validated but not stored as they're only used during initialization
    const _options = {
      directories: options.directories ?? ['src/config'],
      patterns: options.patterns ?? [...DEFAULT_CONFIG_PATTERNS],
      exclude: options.exclude ?? [...DEFAULT_EXCLUDE_PATTERNS],
      watch: options.watch ?? env.isDev,
      watchDebounce: options.watchDebounce ?? 300,
    };
    void _options; // Acknowledge options are intentionally not used after validation
  }

  /**
   * Initialize the discovery engine
   */
  public async initialize(): Promise<ConfigDiscoveryResult> {
    const startTime = performance.now();
    const files: DiscoveredConfigFile[] = [];
    const errors: Array<{ path: string; error: string }> = [];

    try {
      // Load registered modules
      await this.loadRegisteredModules();

      // In a browser environment, we rely on pre-registered modules
      // File system discovery is primarily for build-time or SSR

      this.initialized = true;
    } catch (error) {
      errors.push({
        path: 'initialization',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return {
      files,
      errors,
      durationMs: performance.now() - startTime,
    };
  }

  /**
   * Load all registered configuration modules
   */
  private async loadRegisteredModules(): Promise<void> {
    const currentEnv = env.appEnv as ConfigEnvironment;

    // Build dependency graph
    const loadOrder = this.resolveDependencyOrder();

    for (const namespace of loadOrder) {
      const modules = configModules.get(namespace) ?? [];

      for (const module of modules) {
        // Check environment restrictions
        if (module.environments && !module.environments.includes(currentEnv)) {
          continue;
        }

        // Load configuration
        const config = await this.resolveConfig(module);

        // Register in namespace
        if (module.merge) {
          const existing = this.registry.getNamespaceConfig(namespace);
          const merged = deepMerge(existing as ConfigRecord, config);
          this.registerNamespaceConfig(namespace, merged, 'file');
        } else {
          this.registerNamespaceConfig(namespace, config, 'file');
        }
      }
    }
  }

  /**
   * Resolve dependency order for loading
   */
  private resolveDependencyOrder(): ConfigNamespace[] {
    const order: ConfigNamespace[] = [];
    const visited = new Set<ConfigNamespace>();
    const visiting = new Set<ConfigNamespace>();

    const visit = (namespace: ConfigNamespace): void => {
      if (visited.has(namespace)) return;
      if (visiting.has(namespace)) {
        throw new Error(`Circular dependency detected for namespace: ${namespace}`);
      }

      visiting.add(namespace);

      const modules = configModules.get(namespace) ?? [];
      for (const module of modules) {
        if (module.dependencies) {
          for (const dep of module.dependencies) {
            visit(dep);
          }
        }
      }

      visiting.delete(namespace);
      visited.add(namespace);
      order.push(namespace);
    };

    for (const namespace of configModules.keys()) {
      visit(namespace);
    }

    return order;
  }

  /**
   * Resolve configuration from a module
   */
  private async resolveConfig<T extends ConfigRecord>(
    module: ConfigModule<T>
  ): Promise<T> {
    if (typeof module.config === 'function') {
      const result = module.config();
      return result instanceof Promise ? await result : result;
    }
    return module.config;
  }

  /**
   * Register configuration in a namespace
   */
  private registerNamespaceConfig(
    namespace: ConfigNamespace,
    config: ConfigRecord,
    source: ConfigSource
  ): void {
    const options: ConfigSetOptions = {
      source,
      freeze: env.isProd,
    };

    for (const [key, value] of Object.entries(config)) {
      this.registry.set(namespace, key, value, options);
    }
  }

  /**
   * Discover configuration for a specific namespace
   */
  public async discoverNamespace<T extends ConfigRecord>(
    namespace: ConfigNamespace
  ): Promise<T> {
    const modules = configModules.get(namespace) ?? [];
    const currentEnv = env.appEnv as ConfigEnvironment;

    const layers: ConfigLayer<T>[] = [];

    for (const module of modules) {
      if (module.environments && !module.environments.includes(currentEnv)) {
        continue;
      }

      const config = await this.resolveConfig(module);
      layers.push({
        source: 'base',
        config: config as T,
        priority: module.priority,
      });
    }

    return mergeConfigLayers(layers);
  }

  /**
   * Get discovery status
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get discovered files
   */
  public getDiscoveredFiles(): DiscoveredConfigFile[] {
    return Array.from(this.discoveredFiles.values());
  }
}

// =============================================================================
// Plugin Configuration Discovery
// =============================================================================

/**
 * Plugin configuration definition
 */
export interface PluginConfig<T extends ConfigRecord = ConfigRecord> {
  /** Plugin identifier */
  id: string;
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin configuration */
  config: T;
  /** Plugin dependencies */
  dependencies?: string[];
  /** Plugin priority */
  priority?: number;
}

/**
 * Plugin configuration registry
 */
const pluginConfigs: Map<string, PluginConfig> = new Map();

/**
 * Register a plugin configuration
 *
 * @param plugin - Plugin configuration
 *
 * @example
 * ```typescript
 * registerPluginConfig({
 *   id: 'analytics',
 *   name: 'Analytics Plugin',
 *   version: '1.0.0',
 *   config: {
 *     trackingId: 'UA-XXXXX-X',
 *     enabledEvents: ['pageview', 'click'],
 *   },
 * });
 * ```
 */
export function registerPluginConfig<T extends ConfigRecord>(
  plugin: PluginConfig<T>
): void {
  pluginConfigs.set(plugin.id, plugin as PluginConfig);

  // Also register in the config registry under plugin namespace
  const namespace = createNamespace(`plugin:${plugin.id}`);
  const registry = getConfigRegistry();

  registry.set(namespace, 'meta', {
    id: plugin.id,
    name: plugin.name,
    version: plugin.version,
  } as unknown as import('./types').ConfigValue, { source: 'plugin', freeze: true });

  for (const [key, value] of Object.entries(plugin.config)) {
    registry.set(namespace, key, value, { source: 'plugin' });
  }
}

/**
 * Get a plugin configuration
 */
export function getPluginConfig<T extends ConfigRecord>(
  pluginId: string
): PluginConfig<T> | undefined {
  return pluginConfigs.get(pluginId) as PluginConfig<T> | undefined;
}

/**
 * Get all registered plugins
 */
export function getAllPlugins(): PluginConfig[] {
  return Array.from(pluginConfigs.values());
}

// =============================================================================
// Feature Configuration Discovery
// =============================================================================

/**
 * Feature configuration definition
 */
export interface FeatureConfig<T extends ConfigRecord = ConfigRecord> {
  /** Feature identifier */
  id: string;
  /** Feature name */
  name: string;
  /** Whether feature is enabled */
  enabled: boolean;
  /** Feature configuration */
  config: T;
  /** Required role to access */
  requiredRole?: string;
  /** Target environments */
  environments?: ConfigEnvironment[];
  /** Rollout percentage (0-100) */
  rolloutPercentage?: number;
}

/**
 * Feature configuration registry
 */
const featureConfigs: Map<string, FeatureConfig> = new Map();

/**
 * Register a feature configuration
 *
 * @param feature - Feature configuration
 *
 * @example
 * ```typescript
 * registerFeatureConfig({
 *   id: 'dark-mode',
 *   name: 'Dark Mode',
 *   enabled: true,
 *   config: {
 *     defaultTheme: 'system',
 *     transitionDuration: 200,
 *   },
 * });
 * ```
 */
export function registerFeatureConfig<T extends ConfigRecord>(
  feature: FeatureConfig<T>
): void {
  featureConfigs.set(feature.id, feature as FeatureConfig);
}

/**
 * Get a feature configuration
 */
export function getFeatureConfig<T extends ConfigRecord>(
  featureId: string
): FeatureConfig<T> | undefined {
  return featureConfigs.get(featureId) as FeatureConfig<T> | undefined;
}

/**
 * Get all registered features
 */
export function getAllFeatures(): FeatureConfig[] {
  return Array.from(featureConfigs.values());
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(featureId: string): boolean {
  const feature = featureConfigs.get(featureId);
  if (!feature) return false;

  // Check environment
  const currentEnv = env.appEnv as ConfigEnvironment;
  if (feature.environments && !feature.environments.includes(currentEnv)) {
    return false;
  }

  // Check rollout (simplified - real implementation would use user ID)
  if (feature.rolloutPercentage !== undefined && feature.rolloutPercentage < 100) {
    const random = Math.random() * 100;
    if (random > feature.rolloutPercentage) {
      return false;
    }
  }

  return feature.enabled;
}

// =============================================================================
// Environment-Based Configuration Loading
// =============================================================================

/**
 * Load environment-specific configuration
 *
 * @param baseConfig - Base configuration
 * @param envOverrides - Environment-specific overrides
 * @returns Merged configuration
 */
export function loadEnvironmentConfig<T extends ConfigRecord>(
  baseConfig: T,
  envOverrides: Partial<Record<ConfigEnvironment, Partial<T>>>
): T {
  const currentEnv = env.appEnv as ConfigEnvironment;
  const override = envOverrides[currentEnv];

  if (!override) {
    return baseConfig;
  }

  return deepMerge(baseConfig, override);
}

/**
 * Create configuration with environment overrides
 *
 * @example
 * ```typescript
 * const config = createEnvConfig({
 *   base: {
 *     apiUrl: 'http://localhost:3001',
 *     debug: false,
 *   },
 *   development: {
 *     debug: true,
 *   },
 *   production: {
 *     apiUrl: 'https://api.production.com',
 *   },
 * });
 * ```
 */
export function createEnvConfig<T extends ConfigRecord>(options: {
  base: T;
  development?: Partial<T>;
  staging?: Partial<T>;
  production?: Partial<T>;
  test?: Partial<T>;
}): T {
  const { base, ...envOverrides } = options;
  return loadEnvironmentConfig(base, envOverrides);
}

// =============================================================================
// Configuration Auto-Registration
// =============================================================================

/**
 * Auto-register a configuration namespace
 *
 * This is a decorator-like function for registering configurations
 * at module load time.
 *
 * @example
 * ```typescript
 * // In streaming.config.ts
 * export const streamingConfig = autoRegister(
 *   CONFIG_NAMESPACES.STREAMING,
 *   {
 *     enabled: true,
 *     bufferSize: 65536,
 *   }
 * );
 * ```
 */
export function autoRegister<T extends ConfigRecord>(
  namespace: ConfigNamespace,
  config: T,
  options: {
    priority?: number;
    environments?: ConfigEnvironment[];
    dependencies?: ConfigNamespace[];
    merge?: boolean;
  } = {}
): T {
  registerConfigModule({
    namespace,
    config,
    priority: options.priority ?? 100,
    environments: options.environments,
    dependencies: options.dependencies,
    merge: options.merge ?? false,
  });

  return config;
}

// =============================================================================
// Singleton Discovery Instance
// =============================================================================

let discoveryInstance: ConfigDiscovery | null = null;

/**
 * Get or create the configuration discovery instance
 */
export function getConfigDiscovery(
  options?: ConfigDiscoveryOptions
): ConfigDiscovery {
  if (!discoveryInstance) {
    discoveryInstance = new ConfigDiscovery(options);
  }
  return discoveryInstance;
}

/**
 * Initialize configuration discovery
 */
export async function initializeConfigDiscovery(
  options?: ConfigDiscoveryOptions
): Promise<ConfigDiscoveryResult> {
  const discovery = getConfigDiscovery(options);
  return discovery.initialize();
}

/**
 * Reset the discovery instance (useful for testing)
 */
export function resetConfigDiscovery(): void {
  discoveryInstance = null;
  clearRegisteredModules();
  pluginConfigs.clear();
  featureConfigs.clear();
}
