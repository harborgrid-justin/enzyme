/**
 * @file Dynamic Configuration System
 * @description Runtime configuration updates, feature flag integration, and A/B testing.
 *
 * This module provides:
 * - Runtime configuration updates
 * - Feature flag evaluation
 * - A/B testing configuration
 * - Configuration hot-reload
 * - Remote configuration sync
 *
 * @module config/dynamic-config
 */

import type {
  ConfigNamespace,
  ConfigRecord,
  ConfigValue,
  ConfigChangeListener,
  ConfigUnsubscribe,
  DynamicConfigOptions,
  DynamicConfigState,
  ConfigSyncError,
  FeatureFlagConfig,
  FeatureFlagContext,
  FeatureFlagResult,
  FeatureFlagReason as _FeatureFlagReason,
  ABTestConfig,
  ABTestVariant,
  ConfigEnvironment,
} from './types';
import { CONFIG_NAMESPACES } from './types';
import { getConfigRegistry, type ConfigRegistry } from './config-registry';
import { env } from './env';

// =============================================================================
// Dynamic Configuration State
// =============================================================================

/**
 * Internal state for dynamic configuration
 */
interface DynamicConfigInternalState {
  initialized: boolean;
  syncing: boolean;
  lastSyncedAt?: Date;
  lastError?: ConfigSyncError;
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
  pollingInterval?: ReturnType<typeof setInterval>;
  webSocket?: WebSocket;
  retryCount: number;
}

// =============================================================================
// Dynamic Configuration Manager
// =============================================================================

/**
 * Dynamic Configuration Manager
 *
 * Manages runtime configuration updates including:
 * - Remote configuration synchronization
 * - Feature flag evaluation
 * - A/B test assignment
 * - Configuration hot-reload
 *
 * @example
 * ```typescript
 * const dynamicConfig = new DynamicConfigManager({
 *   pollingInterval: 60000,
 *   enableWebSocket: true,
 * });
 *
 * await dynamicConfig.initialize();
 *
 * // Evaluate feature flag
 * const result = dynamicConfig.evaluateFlag('new-dashboard', {
 *   userId: 'user-123',
 *   environment: 'production',
 * });
 * ```
 */
export class DynamicConfigManager {
  private readonly registry: ConfigRegistry;
  private readonly options: Required<DynamicConfigOptions>;
  private readonly state: DynamicConfigInternalState;
  private readonly flags: Map<string, FeatureFlagConfig> = new Map();
  private readonly abTests: Map<string, ABTestConfig> = new Map();
  private readonly userAssignments: Map<string, string> = new Map();
  private readonly listeners: Set<(state: DynamicConfigState) => void> = new Set();

  constructor(options: DynamicConfigOptions = {}) {
    this.registry = getConfigRegistry();
    this.options = {
      pollingInterval: options.pollingInterval ?? 60000,
      enableWebSocket: options.enableWebSocket ?? false,
      cacheDuration: options.cacheDuration ?? 300000,
      retry: options.retry ?? {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 30000,
      },
      fallback: options.fallback ?? 'cache',
    };
    this.state = {
      initialized: false,
      syncing: false,
      connectionStatus: 'disconnected',
      retryCount: 0,
    };
  }

  /**
   * Initialize the dynamic configuration manager
   */
  public async initialize(): Promise<void> {
    if (this.state.initialized) {
      return;
    }

    try {
      this.updateState({ syncing: true, connectionStatus: 'connecting' });

      // Load cached configuration first
      await this.loadFromCache();

      // Sync with remote (if available)
      if (env.featureFlagsSource !== 'local') {
        await this.syncWithRemote();
      }

      // Set up polling if enabled
      if (this.options.pollingInterval > 0) {
        this.startPolling();
      }

      // Set up WebSocket if enabled
      if (this.options.enableWebSocket) {
        this.connectWebSocket();
      }

      this.updateState({
        initialized: true,
        syncing: false,
        connectionStatus: 'connected',
        lastSyncedAt: new Date(),
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Shut down the dynamic configuration manager
   */
  public shutdown(): void {
    if (this.state.pollingInterval) {
      clearInterval(this.state.pollingInterval);
    }

    if (this.state.webSocket) {
      this.state.webSocket.close();
    }

    this.updateState({
      initialized: false,
      connectionStatus: 'disconnected',
    });
  }

  // ---------------------------------------------------------------------------
  // State Management
  // ---------------------------------------------------------------------------

  /**
   * Get current state
   */
  public getState(): DynamicConfigState {
    return {
      initialized: this.state.initialized,
      syncing: this.state.syncing,
      lastSyncedAt: this.state.lastSyncedAt?.toISOString(),
      lastError: this.state.lastError,
      connectionStatus: this.state.connectionStatus,
    };
  }

  /**
   * Subscribe to state changes
   */
  public subscribeToState(
    listener: (state: DynamicConfigState) => void
  ): ConfigUnsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Update internal state and notify listeners
   */
  private updateState(partial: Partial<DynamicConfigInternalState>): void {
    Object.assign(this.state, partial);
    const publicState = this.getState();
    this.listeners.forEach((listener) => listener(publicState));
  }

  // ---------------------------------------------------------------------------
  // Remote Synchronization
  // ---------------------------------------------------------------------------

  /**
   * Sync configuration with remote source
   */
  public async syncWithRemote(): Promise<void> {
    if (this.state.syncing) {
      return;
    }

    this.updateState({ syncing: true });

    try {
      // Fetch remote configuration based on source
      const remoteConfig = await this.fetchRemoteConfig();

      // Apply remote configuration
      await this.applyRemoteConfig(remoteConfig);

      // Update cache
      await this.saveToCache(remoteConfig);

      this.updateState({
        syncing: false,
        lastSyncedAt: new Date(),
        lastError: undefined,
      });
      this.state.retryCount = 0;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Fetch configuration from remote source
   */
  private async fetchRemoteConfig(): Promise<RemoteConfigResponse> {
    const source = env.featureFlagsSource;

    switch (source) {
      case 'remote':
        return this.fetchFromRemoteAPI();
      case 'launchdarkly':
        return this.fetchFromLaunchDarkly();
      default:
        return { flags: {}, tests: {}, config: {} };
    }
  }

  /**
   * Fetch from remote API
   */
  private async fetchFromRemoteAPI(): Promise<RemoteConfigResponse> {
    // This would be replaced with actual API call
    // For now, return empty config
    return { flags: {}, tests: {}, config: {} };
  }

  /**
   * Fetch from LaunchDarkly
   */
  private async fetchFromLaunchDarkly(): Promise<RemoteConfigResponse> {
    // This would integrate with LaunchDarkly SDK
    // For now, return empty config
    return { flags: {}, tests: {}, config: {} };
  }

  /**
   * Apply remote configuration to registry
   */
  private async applyRemoteConfig(config: RemoteConfigResponse): Promise<void> {
    // Apply feature flags
    if (config.flags) {
      Object.entries(config.flags).forEach(([key, value]) => {
        this.flags.set(key, value as FeatureFlagConfig);
      });
    }

    // Apply A/B tests
    if (config.tests) {
      Object.entries(config.tests).forEach(([key, value]) => {
        this.abTests.set(key, value as ABTestConfig);
      });
    }

    // Apply general config
    if (config.config) {
      Object.entries(config.config).forEach(([namespace, values]) => {
        Object.entries(values as ConfigRecord).forEach(([key, value]) => {
          this.registry.set(
            CONFIG_NAMESPACES.FEATURES,
            `${namespace}.${key}`,
            value as ConfigValue,
            { source: 'remote' }
          );
        });
      });
    }
  }

  /**
   * Handle sync errors with retry logic
   */
  private handleError(error: unknown): void {
    const syncError: ConfigSyncError = {
      message: error instanceof Error ? error.message : String(error),
      code: 'SYNC_FAILED',
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount,
    };

    this.updateState({
      syncing: false,
      lastError: syncError,
      connectionStatus: 'error',
    });

    // Retry with exponential backoff
    if (this.state.retryCount < this.options.retry.maxAttempts) {
      const delay = Math.min(
        this.options.retry.baseDelay * Math.pow(2, this.state.retryCount),
        this.options.retry.maxDelay
      );

      this.state.retryCount++;
      setTimeout(() => this.syncWithRemote(), delay);
    }
  }

  // ---------------------------------------------------------------------------
  // Caching
  // ---------------------------------------------------------------------------

  /**
   * Load configuration from cache
   */
  private async loadFromCache(): Promise<void> {
    try {
      const cached = localStorage.getItem('dynamic_config_cache');
      if (cached) {
        const { flags, tests, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        if (age < this.options.cacheDuration) {
          Object.entries(flags || {}).forEach(([key, value]) => {
            this.flags.set(key, value as FeatureFlagConfig);
          });
          Object.entries(tests || {}).forEach(([key, value]) => {
            this.abTests.set(key, value as ABTestConfig);
          });
        }
      }
    } catch (error) {
      console.warn('[DynamicConfig] Failed to load from cache:', error);
    }
  }

  /**
   * Save configuration to cache
   */
  private async saveToCache(_config: RemoteConfigResponse): Promise<void> {
    try {
      const cacheData = {
        flags: Object.fromEntries(this.flags),
        tests: Object.fromEntries(this.abTests),
        timestamp: Date.now(),
      };
      localStorage.setItem('dynamic_config_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('[DynamicConfig] Failed to save to cache:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // Polling
  // ---------------------------------------------------------------------------

  /**
   * Start polling for configuration updates
   */
  private startPolling(): void {
    if (this.state.pollingInterval) {
      return;
    }

    this.state.pollingInterval = setInterval(() => {
      this.syncWithRemote();
    }, this.options.pollingInterval);
  }

  /**
   * Stop polling
   */
  public stopPolling(): void {
    if (this.state.pollingInterval) {
      clearInterval(this.state.pollingInterval);
      this.state.pollingInterval = undefined;
    }
  }

  // ---------------------------------------------------------------------------
  // WebSocket Connection
  // ---------------------------------------------------------------------------

  /**
   * Connect to WebSocket for real-time updates
   */
  private connectWebSocket(): void {
    if (this.state.webSocket) {
      return;
    }

    try {
      const wsUrl = env.wsUrl;
      this.state.webSocket = new WebSocket(`${wsUrl}/config`);

      this.state.webSocket.onopen = () => {
        this.updateState({ connectionStatus: 'connected' });
      };

      this.state.webSocket.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data) as ConfigUpdate;
          this.handleConfigUpdate(update);
        } catch (error) {
          console.error('[DynamicConfig] Failed to parse WebSocket message:', error);
        }
      };

      this.state.webSocket.onclose = () => {
        this.updateState({ connectionStatus: 'disconnected' });
        // Reconnect after delay
        setTimeout(() => this.connectWebSocket(), 5000);
      };

      this.state.webSocket.onerror = () => {
        this.updateState({ connectionStatus: 'error' });
      };
    } catch (error) {
      console.error('[DynamicConfig] Failed to connect WebSocket:', error);
    }
  }

  /**
   * Handle real-time configuration update
   */
  private handleConfigUpdate(update: ConfigUpdate): void {
    switch (update.type) {
      case 'flag':
        this.flags.set(update.key, update.value as FeatureFlagConfig);
        break;
      case 'test':
        this.abTests.set(update.key, update.value as ABTestConfig);
        break;
      case 'config':
        this.registry.set(
          CONFIG_NAMESPACES.FEATURES,
          update.key,
          update.value as ConfigValue,
          { source: 'remote' }
        );
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Feature Flags
  // ---------------------------------------------------------------------------

  /**
   * Register a feature flag
   */
  public registerFlag(flag: FeatureFlagConfig): void {
    this.flags.set(flag.key, flag);
  }

  /**
   * Get a feature flag definition
   */
  public getFlag(key: string): FeatureFlagConfig | undefined {
    return this.flags.get(key);
  }

  /**
   * Get all feature flags
   */
  public getAllFlags(): FeatureFlagConfig[] {
    return Array.from(this.flags.values());
  }

  /**
   * Evaluate a feature flag
   *
   * @param key - Flag key
   * @param context - Evaluation context
   * @returns Evaluation result
   */
  public evaluateFlag(
    key: string,
    context: FeatureFlagContext
  ): FeatureFlagResult {
    const flag = this.flags.get(key);

    if (!flag) {
      return {
        key,
        value: false,
        reason: 'DEFAULT',
      };
    }

    // Check if flag is expired
    if (flag.expiresAt && new Date(flag.expiresAt) < new Date()) {
      return {
        key,
        value: false,
        reason: 'EXPIRED',
      };
    }

    // Check environment
    if (flag.environments && !flag.environments.includes(context.environment)) {
      return {
        key,
        value: false,
        reason: 'DEFAULT',
      };
    }

    // Check role
    if (flag.minRole && context.userRole) {
      if (!this.hasMinimumRole(context.userRole, flag.minRole)) {
        return {
          key,
          value: false,
          reason: 'DEFAULT',
        };
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      const bucket = this.getUserBucket(context.userId || context.sessionId || '', key);
      if (bucket > flag.rolloutPercentage) {
        return {
          key,
          value: false,
          reason: 'ROLLOUT',
        };
      }
    }

    // Check for override
    const override = this.getOverride(key);
    if (override !== undefined) {
      return {
        key,
        value: override,
        reason: 'OVERRIDE',
      };
    }

    return {
      key,
      value: flag.defaultValue,
      reason: flag.rolloutPercentage !== undefined ? 'ROLLOUT' : 'DEFAULT',
      variant: flag.variant,
    };
  }

  /**
   * Check if flag is enabled (simple boolean check)
   */
  public isFlagEnabled(key: string, context?: Partial<FeatureFlagContext>): boolean {
    const fullContext: FeatureFlagContext = {
      environment: (env.appEnv as ConfigEnvironment) || 'development',
      ...context,
    };
    return this.evaluateFlag(key, fullContext).value;
  }

  /**
   * Calculate user bucket for rollout
   */
  private getUserBucket(userId: string, flagKey: string): number {
    const hash = this.hashString(`${userId}:${flagKey}`);
    return hash % 100;
  }

  /**
   * Simple string hashing
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Check minimum role requirement
   */
  private hasMinimumRole(userRole: string, requiredRole: string): boolean {
    const roleHierarchy = ['user', 'moderator', 'admin', 'superadmin'];
    const userIndex = roleHierarchy.indexOf(userRole);
    const requiredIndex = roleHierarchy.indexOf(requiredRole);
    return userIndex >= requiredIndex;
  }

  // ---------------------------------------------------------------------------
  // Flag Overrides
  // ---------------------------------------------------------------------------

  /**
   * Set a flag override (for development/testing)
   */
  public setOverride(key: string, value: boolean): void {
    const overrides = this.getOverrides();
    overrides[key] = value;
    localStorage.setItem('feature_flag_overrides', JSON.stringify(overrides));
  }

  /**
   * Remove a flag override
   */
  public removeOverride(key: string): void {
    const overrides = this.getOverrides();
    delete overrides[key];
    localStorage.setItem('feature_flag_overrides', JSON.stringify(overrides));
  }

  /**
   * Get a specific override
   */
  public getOverride(key: string): boolean | undefined {
    const overrides = this.getOverrides();
    return overrides[key];
  }

  /**
   * Get all overrides
   */
  public getOverrides(): Record<string, boolean> {
    try {
      const stored = localStorage.getItem('feature_flag_overrides');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  /**
   * Clear all overrides
   */
  public clearOverrides(): void {
    localStorage.removeItem('feature_flag_overrides');
  }

  // ---------------------------------------------------------------------------
  // A/B Testing
  // ---------------------------------------------------------------------------

  /**
   * Register an A/B test
   */
  public registerTest(test: ABTestConfig): void {
    this.abTests.set(test.id, test);
  }

  /**
   * Get an A/B test definition
   */
  public getTest(testId: string): ABTestConfig | undefined {
    return this.abTests.get(testId);
  }

  /**
   * Get all A/B tests
   */
  public getAllTests(): ABTestConfig[] {
    return Array.from(this.abTests.values());
  }

  /**
   * Get user's assigned variant for a test
   */
  public getVariant(
    testId: string,
    userId?: string
  ): ABTestVariant | undefined {
    const test = this.abTests.get(testId);
    if (!test || test.status !== 'running') {
      return undefined;
    }

    // Check cached assignment
    const cacheKey = `${testId}:${userId || 'anonymous'}`;
    const cachedVariant = this.userAssignments.get(cacheKey);
    if (cachedVariant) {
      return test.variants.find((v) => v.id === cachedVariant);
    }

    // Assign variant based on user bucket
    const bucket = this.getUserBucket(userId || '', testId);
    let cumulativeAllocation = 0;

    for (const variant of test.variants) {
      cumulativeAllocation += test.allocation[variant.id] || 0;
      if (bucket < cumulativeAllocation) {
        this.userAssignments.set(cacheKey, variant.id);
        return variant;
      }
    }

    // Fallback to control
    const control = test.variants.find((v) => v.isControl);
    if (control) {
      this.userAssignments.set(cacheKey, control.id);
    }
    return control;
  }

  /**
   * Get configuration for user's variant
   */
  public getVariantConfig<T extends ConfigRecord>(
    testId: string,
    userId?: string
  ): T | undefined {
    const variant = this.getVariant(testId, userId);
    return variant?.config as T | undefined;
  }

  // ---------------------------------------------------------------------------
  // Configuration Hot-Reload
  // ---------------------------------------------------------------------------

  /**
   * Force reload configuration from remote
   */
  public async forceRefresh(): Promise<void> {
    this.state.retryCount = 0;
    await this.syncWithRemote();
  }

  /**
   * Set a runtime configuration value
   */
  public setRuntimeConfig<T extends ConfigValue>(
    namespace: ConfigNamespace,
    key: string,
    value: T
  ): void {
    this.registry.set(namespace, key, value, { source: 'runtime' });
  }

  /**
   * Get a runtime configuration value
   */
  public getRuntimeConfig<T extends ConfigValue>(
    namespace: ConfigNamespace,
    key: string
  ): T | undefined {
    return this.registry.get<T>(namespace, key);
  }

  /**
   * Subscribe to configuration changes
   */
  public subscribeToConfig(
    namespace: ConfigNamespace,
    key: string,
    listener: ConfigChangeListener
  ): ConfigUnsubscribe {
    return this.registry.subscribe(namespace, key, listener);
  }
}

// =============================================================================
// Types
// =============================================================================

interface RemoteConfigResponse {
  flags?: Record<string, FeatureFlagConfig>;
  tests?: Record<string, ABTestConfig>;
  config?: Record<string, ConfigRecord>;
}

interface ConfigUpdate {
  type: 'flag' | 'test' | 'config';
  key: string;
  value: unknown;
}

// =============================================================================
// Singleton Instance
// =============================================================================

let dynamicConfigInstance: DynamicConfigManager | null = null;

/**
 * Get or create the dynamic configuration manager
 */
export function getDynamicConfig(
  options?: DynamicConfigOptions
): DynamicConfigManager {
  if (!dynamicConfigInstance) {
    dynamicConfigInstance = new DynamicConfigManager(options);
  }
  return dynamicConfigInstance;
}

/**
 * Initialize dynamic configuration
 */
export async function initializeDynamicConfig(
  options?: DynamicConfigOptions
): Promise<void> {
  const manager = getDynamicConfig(options);
  await manager.initialize();
}

/**
 * Evaluate a feature flag (convenience function)
 */
export function evaluateFeatureFlag(
  key: string,
  context?: Partial<FeatureFlagContext>
): boolean {
  return getDynamicConfig().isFlagEnabled(key, context);
}

/**
 * Get A/B test variant (convenience function)
 */
export function getABTestVariant(
  testId: string,
  userId?: string
): ABTestVariant | undefined {
  return getDynamicConfig().getVariant(testId, userId);
}

/**
 * Reset dynamic configuration (for testing)
 */
export function resetDynamicConfig(): void {
  if (dynamicConfigInstance) {
    dynamicConfigInstance.shutdown();
  }
  dynamicConfigInstance = null;
}
