/**
 * @file Feature Bridge
 * @module coordination/feature-bridge
 * @description PhD-level module interconnection layer for cross-feature communication.
 *
 * Implements sophisticated feature bridging with:
 * - Type-safe cross-feature method invocation
 * - Feature capability discovery
 * - Version-aware API contracts
 * - Fallback handling for missing features
 * - Lazy feature loading integration
 * - Feature dependency resolution
 *
 * @author Agent 5 - PhD TypeScript Architect
 * @version 1.0.0
 */

import {
  type LibraryId,
} from './types';
// import { getCoordinationEventBus, publishEvent, subscribeToEvent } from './event-bus';

// ============================================================================
// Types
// ============================================================================

/**
 * Feature identifier.
 */
export type FeatureId = string & { readonly __brand: 'FeatureId' };

/**
 * Creates a FeatureId.
 */
export function createFeatureId(id: string): FeatureId {
  return id as FeatureId;
}

/**
 * Feature capability definition.
 */
export interface FeatureCapability<T = unknown> {
  /** Capability name */
  name: string;
  /** Capability version */
  version: string;
  /** Capability handler */
  handler: T;
  /** Required dependencies */
  dependencies?: FeatureId[];
  /** Description */
  description?: string;
}

/**
 * Feature registration.
 */
export interface FeatureRegistration {
  /** Feature identifier */
  id: FeatureId;
  /** Feature name */
  name: string;
  /** Feature version */
  version: string;
  /** Owning library */
  library: LibraryId;
  /** Capabilities provided by this feature */
  capabilities: Map<string, FeatureCapability>;
  /** Dependencies on other features */
  dependencies: FeatureId[];
  /** Whether feature is loaded/active */
  isActive: boolean;
  /** Lazy loader for the feature */
  loader?: () => Promise<void>;
}

/**
 * Bridge invocation options.
 */
export interface InvocationOptions {
  /** Timeout for the invocation (ms) */
  timeout?: number;
  /** Fallback value if capability not available */
  fallback?: unknown;
  /** Whether to throw on missing capability */
  throwOnMissing?: boolean;
  /** Required minimum version */
  minVersion?: string;
}

/**
 * Bridge invocation result.
 */
export interface InvocationResult<T> {
  /** Whether invocation succeeded */
  success: boolean;
  /** Result value */
  value?: T;
  /** Error if failed */
  error?: Error;
  /** Feature that handled the invocation */
  handledBy?: FeatureId;
  /** Time taken (ms) */
  duration: number;
}

/**
 * Feature bridge configuration.
 */
export interface FeatureBridgeConfig {
  /** Default invocation timeout (ms) */
  defaultTimeout: number;
  /** Enable lazy loading */
  enableLazyLoading: boolean;
  /** Enable invocation logging */
  debug: boolean;
  /** Fallback behavior */
  defaultFallbackBehavior: 'throw' | 'return-undefined' | 'use-fallback';
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Compares semantic versions.
 * @returns -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  const len = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < len; i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }

  return 0;
}

/**
 * Default configuration.
 */
const DEFAULT_CONFIG: FeatureBridgeConfig = {
  defaultTimeout: 5000,
  enableLazyLoading: true,
  debug: false,
  defaultFallbackBehavior: 'throw',
};

// ============================================================================
// FeatureBridgeImpl Class
// ============================================================================

/**
 * Implementation of the feature bridge.
 *
 * @example
 * ```typescript
 * const bridge = new FeatureBridgeImpl();
 *
 * // Register a feature with capabilities
 * bridge.registerFeature({
 *   id: createFeatureId('user-management'),
 *   name: 'User Management',
 *   version: '1.0.0',
 *   library: createLibraryId('auth'),
 *   capabilities: new Map([
 *     ['getUserById', {
 *       name: 'getUserById',
 *       version: '1.0.0',
 *       handler: async (id: string) => userService.getById(id),
 *     }],
 *   ]),
 *   dependencies: [],
 *   isActive: true,
 * });
 *
 * // Invoke a capability
 * const result = await bridge.invoke<User>(
 *   'user-management',
 *   'getUserById',
 *   ['user-123']
 * );
 * ```
 */
export class FeatureBridgeImpl {
  /** Configuration */
  private readonly config: FeatureBridgeConfig;

  /** Registered features */
  private readonly features: Map<FeatureId, FeatureRegistration> = new Map();

  /** Capability index for fast lookup */
  private readonly capabilityIndex: Map<string, Set<FeatureId>> = new Map();

  /** Loading promises for lazy features */
  private readonly loadingPromises: Map<FeatureId, Promise<void>> = new Map();

  /**
   * Creates a new feature bridge.
   * @param config - Configuration options
   */
  constructor(config: Partial<FeatureBridgeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // Feature Registration
  // ==========================================================================

  /**
   * Registers a feature.
   * @param registration - Feature registration
   */
  registerFeature(registration: FeatureRegistration): void {
    // Store registration
    this.features.set(registration.id, registration);

    // Index capabilities
    for (const [capName] of registration.capabilities) {
      let featureSet = this.capabilityIndex.get(capName);
      if (!featureSet) {
        featureSet = new Set();
        this.capabilityIndex.set(capName, featureSet);
      }
      featureSet.add(registration.id);
    }

    if (this.config.debug) {
      console.info(`[FeatureBridge] Registered feature: ${registration.name}`, {
        id: registration.id,
        capabilities: Array.from(registration.capabilities.keys()),
      });
    }
  }

  /**
   * Unregisters a feature.
   * @param id - Feature ID
   */
  unregisterFeature(id: FeatureId): void {
    const registration = this.features.get(id);
    if (!registration) return;

    // Remove from capability index
    for (const [capName] of registration.capabilities) {
      const featureSet = this.capabilityIndex.get(capName);
      if (featureSet) {
        featureSet.delete(id);
        if (featureSet.size === 0) {
          this.capabilityIndex.delete(capName);
        }
      }
    }

    this.features.delete(id);
  }

  /**
   * Adds a capability to a feature.
   * @param featureId - Feature ID
   * @param capability - Capability to add
   */
  addCapability<T>(featureId: FeatureId, capability: FeatureCapability<T>): void {
    const registration = this.features.get(featureId);
    if (!registration) {
      throw new Error(`Feature not found: ${featureId}`);
    }

    registration.capabilities.set(capability.name, capability as FeatureCapability);

    // Update index
    let featureSet = this.capabilityIndex.get(capability.name);
    if (!featureSet) {
      featureSet = new Set();
      this.capabilityIndex.set(capability.name, featureSet);
    }
    featureSet.add(featureId);
  }

  /**
   * Removes a capability from a feature.
   * @param featureId - Feature ID
   * @param capabilityName - Capability name
   */
  removeCapability(featureId: FeatureId, capabilityName: string): void {
    const registration = this.features.get(featureId);
    if (!registration) return;

    registration.capabilities.delete(capabilityName);

    // Update index
    const featureSet = this.capabilityIndex.get(capabilityName);
    if (featureSet) {
      featureSet.delete(featureId);
      if (featureSet.size === 0) {
        this.capabilityIndex.delete(capabilityName);
      }
    }
  }

  // ==========================================================================
  // Capability Invocation
  // ==========================================================================

  /**
   * Invokes a capability on a specific feature.
   * @template T - Return type
   * @param featureId - Feature ID
   * @param capability - Capability name
   * @param args - Arguments to pass
   * @param options - Invocation options
   * @returns Invocation result
   */
  async invoke<T>(
    featureId: FeatureId | string,
    capability: string,
    args: unknown[] = [],
    options: InvocationOptions = {}
  ): Promise<InvocationResult<T>> {
    const startTime = performance.now();
    const id = featureId as FeatureId;

    try {
      // Find feature
      const registration = this.features.get(id);
      if (!registration) {
        return this.handleMissing<T>(
          `Feature not found: ${featureId}`,
          options,
          startTime
        );
      }

      // Load lazy feature if needed
      if (!registration.isActive && registration.loader) {
        await this.loadFeature(id);
      }

      // Find capability
      const cap = registration.capabilities.get(capability);
      if (!cap) {
        return this.handleMissing<T>(
          `Capability not found: ${capability} in ${featureId}`,
          options,
          startTime
        );
      }

      // Check version
      if (options.minVersion != null && compareVersions(cap.version, options.minVersion) < 0) {
        return this.handleMissing<T>(
          `Capability version ${cap.version} is below required ${options.minVersion}`,
          options,
          startTime
        );
      }

      // Invoke handler
      const handler = cap.handler as (...a: unknown[]) => T | Promise<T>;
      const timeout = options.timeout ?? this.config.defaultTimeout;

      const result = await this.invokeWithTimeout(handler, args, timeout);

      return {
        success: true,
        value: result,
        handledBy: id,
        duration: performance.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Invokes a capability on any feature that provides it.
   * @template T - Return type
   * @param capability - Capability name
   * @param args - Arguments to pass
   * @param options - Invocation options
   * @returns Invocation result
   */
  async invokeAny<T>(
    capability: string,
    args: unknown[] = [],
    options: InvocationOptions = {}
  ): Promise<InvocationResult<T>> {
    const featureIds = this.capabilityIndex.get(capability);
    if (!featureIds || featureIds.size === 0) {
      return this.handleMissing<T>(
        `No feature provides capability: ${capability}`,
        options,
        performance.now()
      );
    }

    // Try first active feature
    for (const id of featureIds) {
      const registration = this.features.get(id);
      if (registration?.isActive === true) {
        return this.invoke<T>(id, capability, args, options);
      }
    }

    // Try first loadable feature
    if (this.config.enableLazyLoading) {
      for (const id of featureIds) {
        const registration = this.features.get(id);
        if (registration?.loader) {
          return this.invoke<T>(id, capability, args, options);
        }
      }
    }

    return this.handleMissing<T>(
      `No active feature provides capability: ${capability}`,
      options,
      performance.now()
    );
  }

  // ==========================================================================
  // Feature Discovery
  // ==========================================================================

  /**
   * Checks if a feature is registered.
   * @param id - Feature ID
   */
  hasFeature(id: FeatureId | string): boolean {
    return this.features.has(id as FeatureId);
  }

  /**
   * Checks if a capability is available.
   * @param capability - Capability name
   */
  hasCapability(capability: string): boolean {
    const features = this.capabilityIndex.get(capability);
    return features !== undefined && features.size > 0;
  }

  /**
   * Gets features that provide a capability.
   * @param capability - Capability name
   * @returns Array of feature IDs
   */
  getFeaturesWithCapability(capability: string): FeatureId[] {
    const features = this.capabilityIndex.get(capability);
    return features ? Array.from(features) : [];
  }

  /**
   * Gets all capabilities of a feature.
   * @param id - Feature ID
   * @returns Array of capability names
   */
  getFeatureCapabilities(id: FeatureId | string): string[] {
    const registration = this.features.get(id as FeatureId);
    return registration ? Array.from(registration.capabilities.keys()) : [];
  }

  /**
   * Gets all registered features.
   * @returns Array of feature registrations
   */
  getAllFeatures(): FeatureRegistration[] {
    return Array.from(this.features.values());
  }

  /**
   * Gets feature by ID.
   * @param id - Feature ID
   */
  getFeature(id: FeatureId | string): FeatureRegistration | undefined {
    return this.features.get(id as FeatureId);
  }

  // ==========================================================================
  // Feature Loading
  // ==========================================================================

  /**
   * Loads a lazy feature.
   * @param id - Feature ID
   */
  async loadFeature(id: FeatureId): Promise<void> {
    const registration = this.features.get(id);
    if (!registration) {
      throw new Error(`Feature not found: ${id}`);
    }

    if (registration.isActive) {
      return; // Already loaded
    }

    if (!registration.loader) {
      throw new Error(`Feature ${id} has no loader`);
    }

    // Deduplicate concurrent loads
    let loadPromise = this.loadingPromises.get(id);
    if (loadPromise) {
      return loadPromise;
    }

    loadPromise = (async () => {
      try {
        // Load dependencies first
        for (const depId of registration.dependencies) {
          await this.loadFeature(depId);
        }

        // Load the feature
        if (registration.loader != null) {
          await registration.loader();
        }
        registration.isActive = true;

        if (this.config.debug) {
          console.info(`[FeatureBridge] Loaded feature: ${registration.name}`);
        }
      } finally {
        this.loadingPromises.delete(id);
      }
    })();

    this.loadingPromises.set(id, loadPromise);
    return loadPromise;
  }

  /**
   * Activates a feature (marks as active without loading).
   * @param id - Feature ID
   */
  activateFeature(id: FeatureId): void {
    const registration = this.features.get(id);
    if (registration) {
      registration.isActive = true;
    }
  }

  /**
   * Deactivates a feature.
   * @param id - Feature ID
   */
  deactivateFeature(id: FeatureId): void {
    const registration = this.features.get(id);
    if (registration) {
      registration.isActive = false;
    }
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Disposes the bridge.
   */
  dispose(): void {
    this.features.clear();
    this.capabilityIndex.clear();
    this.loadingPromises.clear();
  }

  /**
   * Handles missing capability/feature.
   */
  private handleMissing<T>(
    message: string,
    options: InvocationOptions,
    startTime: number
  ): InvocationResult<T> {
    let behavior: 'throw' | 'use-fallback' | 'return-undefined';
    if (options.throwOnMissing === true) {
      behavior = 'throw';
    } else if (options.fallback !== undefined) {
      behavior = 'use-fallback';
    } else {
      behavior = this.config.defaultFallbackBehavior;
    }

    switch (behavior) {
      case 'throw':
        return {
          success: false,
          error: new Error(message),
          duration: performance.now() - startTime,
        };

      case 'use-fallback':
        return {
          success: true,
          value: options.fallback as T,
          duration: performance.now() - startTime,
        };

      case 'return-undefined':
      default:
        return {
          success: true,
          value: undefined,
          duration: performance.now() - startTime,
        };
    }
  }

  /**
   * Invokes a handler with timeout.
   */
  private async invokeWithTimeout<T>(
    handler: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    timeout: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Invocation timed out after ${timeout}ms`));
      }, timeout);

      try {
        const result = handler(...args);

        if (result instanceof Promise) {
          result
            .then((value) => {
              clearTimeout(timeoutId);
              resolve(value);
            })
            .catch((error: unknown) => {
              clearTimeout(timeoutId);
              reject(error instanceof Error ? error : new Error(String(error)));
            });
        } else {
          clearTimeout(timeoutId);
          resolve(result);
        }
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Global feature bridge instance.
 */
let globalBridge: FeatureBridgeImpl | null = null;

/**
 * Gets the global feature bridge.
 * @param config - Optional configuration
 */
export function getFeatureBridge(
  config?: Partial<FeatureBridgeConfig>
): FeatureBridgeImpl {
  globalBridge ??= new FeatureBridgeImpl(config);
  return globalBridge;
}

/**
 * Sets the global feature bridge.
 * @param bridge - Feature bridge instance
 */
export function setFeatureBridge(bridge: FeatureBridgeImpl): void {
  if (globalBridge) {
    globalBridge.dispose();
  }
  globalBridge = bridge;
}

/**
 * Resets the global feature bridge.
 */
export function resetFeatureBridge(): void {
  if (globalBridge) {
    globalBridge.dispose();
    globalBridge = null;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Registers a feature with the global bridge.
 */
export function registerFeature(registration: FeatureRegistration): void {
  getFeatureBridge().registerFeature(registration);
}

/**
 * Invokes a capability on the global bridge.
 */
export async function invokeCapability<T>(
  featureId: FeatureId | string,
  capability: string,
  args?: unknown[],
  options?: InvocationOptions
): Promise<InvocationResult<T>> {
  return getFeatureBridge().invoke<T>(
    featureId as FeatureId,
    capability,
    args,
    options
  );
}

/**
 * Invokes a capability on any providing feature.
 */
export async function invokeAnyCapability<T>(
  capability: string,
  args?: unknown[],
  options?: InvocationOptions
): Promise<InvocationResult<T>> {
  return getFeatureBridge().invokeAny<T>(capability, args, options);
}
