/**
 * @fileoverview Configurable features system for dynamic feature management.
 *
 * This module provides a comprehensive feature registry that allows any feature
 * in the application to be made toggleable via feature flags. It supports
 * feature discovery, metadata, and runtime configuration.
 *
 * @module flags/integration/configurable-features
 *
 * @example
 * ```typescript
 * import {
 *   FeatureRegistry,
 *   defineFeature,
 *   useConfigurableFeature,
 * } from '@/lib/flags/integration/configurable-features';
 *
 * // Define a feature
 * const darkModeFeature = defineFeature({
 *   id: 'dark-mode',
 *   name: 'Dark Mode',
 *   description: 'Enable dark mode theme',
 *   category: 'ui',
 *   flagKey: 'dark-mode',
 *   defaultEnabled: false,
 * });
 *
 * // Use in component
 * function ThemeToggle() {
 *   const { isEnabled, toggle } = useConfigurableFeature('dark-mode');
 *   return <button onClick={toggle}>{isEnabled ? 'Light' : 'Dark'}</button>;
 * }
 * ```
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * Feature category for organization
 */
export type FeatureCategory =
  | 'api'
  | 'routing'
  | 'ui'
  | 'performance'
  | 'auth'
  | 'monitoring'
  | 'state'
  | 'realtime'
  | 'experimental'
  | 'beta'
  | 'deprecated'
  | string;

/**
 * Feature lifecycle stage
 */
export type FeatureStage =
  | 'development'
  | 'testing'
  | 'beta'
  | 'stable'
  | 'deprecated'
  | 'sunset';

/**
 * Feature visibility level
 */
export type FeatureVisibility =
  | 'public'
  | 'internal'
  | 'admin'
  | 'superadmin';

/**
 * Feature rollout configuration
 */
export interface FeatureRollout {
  /** Rollout percentage (0-100) */
  readonly percentage?: number;
  /** Specific user IDs to include */
  readonly includedUsers?: readonly string[];
  /** Specific user IDs to exclude */
  readonly excludedUsers?: readonly string[];
  /** Regions to target */
  readonly regions?: readonly string[];
  /** User segments to target */
  readonly segments?: readonly string[];
  /** Start date for the rollout */
  readonly startDate?: Date;
  /** End date for the rollout */
  readonly endDate?: Date;
}

/**
 * Feature dependency definition
 */
export interface FeatureDependency {
  /** Dependent feature ID */
  readonly featureId: string;
  /** Dependency type */
  readonly type: 'requires' | 'conflicts' | 'enhances';
  /** Optional condition */
  readonly condition?: (isEnabled: boolean) => boolean;
}

/**
 * Feature configuration override
 */
export interface FeatureOverride {
  /** Override ID */
  readonly id: string;
  /** Target feature ID */
  readonly featureId: string;
  /** Override enabled state */
  readonly enabled: boolean;
  /** Override priority (higher wins) */
  readonly priority: number;
  /** Override reason */
  readonly reason?: string;
  /** Override expiration */
  readonly expiresAt?: Date;
}

/**
 * Feature definition
 */
export interface FeatureDefinition {
  /** Unique feature identifier */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Feature description */
  readonly description: string;
  /** Feature category */
  readonly category: FeatureCategory;
  /** Associated flag key */
  readonly flagKey: string;
  /** Default enabled state */
  readonly defaultEnabled: boolean;
  /** Feature lifecycle stage */
  readonly stage?: FeatureStage;
  /** Visibility level */
  readonly visibility?: FeatureVisibility;
  /** Feature tags for filtering */
  readonly tags?: readonly string[];
  /** Feature dependencies */
  readonly dependencies?: readonly FeatureDependency[];
  /** Rollout configuration */
  readonly rollout?: FeatureRollout;
  /** Documentation URL */
  readonly docsUrl?: string;
  /** Owner team/person */
  readonly owner?: string;
  /** Created date */
  readonly createdAt?: Date;
  /** Last modified date */
  readonly modifiedAt?: Date;
  /** Metadata for custom data */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Feature state at runtime
 */
export interface FeatureState {
  /** Whether the feature is enabled */
  readonly isEnabled: boolean;
  /** Source of the enabled state */
  readonly source: 'flag' | 'override' | 'default' | 'dependency';
  /** Applied override if any */
  readonly override?: FeatureOverride;
  /** Unmet dependencies */
  readonly unmetDependencies?: readonly string[];
  /** Last evaluated timestamp */
  readonly evaluatedAt: number;
}

/**
 * Feature with runtime state
 */
export interface ConfigurableFeature extends FeatureDefinition {
  /** Current runtime state */
  readonly state: FeatureState;
}

/**
 * Feature registry interface
 */
export interface FeatureRegistryInterface {
  /** Register a feature definition */
  register(feature: FeatureDefinition): void;
  /** Unregister a feature */
  unregister(featureId: string): void;
  /** Get a feature by ID */
  get(featureId: string): ConfigurableFeature | undefined;
  /** Get all features */
  getAll(): ConfigurableFeature[];
  /** Get features by category */
  getByCategory(category: FeatureCategory): ConfigurableFeature[];
  /** Get features by tag */
  getByTag(tag: string): ConfigurableFeature[];
  /** Get features by stage */
  getByStage(stage: FeatureStage): ConfigurableFeature[];
  /** Check if feature is enabled */
  isEnabled(featureId: string): boolean;
  /** Add an override */
  addOverride(override: FeatureOverride): void;
  /** Remove an override */
  removeOverride(overrideId: string): void;
  /** Get all overrides */
  getOverrides(): FeatureOverride[];
  /** Update flags */
  updateFlags(flags: Record<string, boolean>): void;
  /** Subscribe to changes */
  subscribe(callback: (features: ConfigurableFeature[]) => void): () => void;
  /** Export feature configuration */
  export(): FeatureExport;
  /** Import feature configuration */
  import(data: FeatureExport): void;
  /** Clear registry */
  clear(): void;
}

/**
 * Feature export format
 */
export interface FeatureExport {
  readonly version: string;
  readonly exportedAt: string;
  readonly features: readonly FeatureDefinition[];
  readonly overrides: readonly FeatureOverride[];
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Feature registry implementation
 */
class FeatureRegistryImpl implements FeatureRegistryInterface {
  private features = new Map<string, FeatureDefinition>();
  private overrides = new Map<string, FeatureOverride>();
  private flags: Record<string, boolean> = {};
  private subscribers = new Set<(features: ConfigurableFeature[]) => void>();

  private evaluateFeature(feature: FeatureDefinition): FeatureState {
    // Check for active override
    const activeOverrides = Array.from(this.overrides.values())
      .filter((o) => o.featureId === feature.id)
      .filter((o) => !o.expiresAt || o.expiresAt > new Date())
      .sort((a, b) => b.priority - a.priority);

    if (activeOverrides.length > 0 && activeOverrides[0]) {
      return {
        isEnabled: activeOverrides[0].enabled,
        source: 'override',
        override: activeOverrides[0],
        evaluatedAt: Date.now(),
      };
    }

    // Check dependencies
    if (feature.dependencies) {
      const unmetDependencies: string[] = [];

      for (const dep of feature.dependencies) {
        const depFeature = this.features.get(dep.featureId);
        const depEnabled = depFeature ? this.isEnabled(dep.featureId) : false;

        if (dep.type === 'requires' && !depEnabled) {
          unmetDependencies.push(dep.featureId);
        }

        if (dep.type === 'conflicts' && depEnabled) {
          return {
            isEnabled: false,
            source: 'dependency',
            unmetDependencies: [dep.featureId],
            evaluatedAt: Date.now(),
          };
        }
      }

      if (unmetDependencies.length > 0) {
        return {
          isEnabled: false,
          source: 'dependency',
          unmetDependencies,
          evaluatedAt: Date.now(),
        };
      }
    }

    // Check flag
    const flagValue = this.flags[feature.flagKey];
    if (flagValue !== undefined) {
      return {
        isEnabled: flagValue,
        source: 'flag',
        evaluatedAt: Date.now(),
      };
    }

    // Default value
    return {
      isEnabled: feature.defaultEnabled,
      source: 'default',
      evaluatedAt: Date.now(),
    };
  }

  private toConfigurableFeature(feature: FeatureDefinition): ConfigurableFeature {
    return {
      ...feature,
      state: this.evaluateFeature(feature),
    };
  }

  private notifySubscribers(): void {
    const allFeatures = this.getAll();
    for (const callback of this.subscribers) {
      try {
        callback(allFeatures);
      } catch (error) {
        console.error('[FeatureRegistry] Subscriber error:', error);
      }
    }
  }

  register(feature: FeatureDefinition): void {
    this.features.set(feature.id, feature);
    this.notifySubscribers();
  }

  unregister(featureId: string): void {
    this.features.delete(featureId);
    this.notifySubscribers();
  }

  get(featureId: string): ConfigurableFeature | undefined {
    const feature = this.features.get(featureId);
    return feature ? this.toConfigurableFeature(feature) : undefined;
  }

  getAll(): ConfigurableFeature[] {
    return Array.from(this.features.values()).map((f) => this.toConfigurableFeature(f));
  }

  getByCategory(category: FeatureCategory): ConfigurableFeature[] {
    return this.getAll().filter((f) => f.category === category);
  }

  getByTag(tag: string): ConfigurableFeature[] {
    return this.getAll().filter((f) => f.tags?.includes(tag));
  }

  getByStage(stage: FeatureStage): ConfigurableFeature[] {
    return this.getAll().filter((f) => f.stage === stage);
  }

  isEnabled(featureId: string): boolean {
    const feature = this.get(featureId);
    return feature?.state.isEnabled ?? false;
  }

  addOverride(override: FeatureOverride): void {
    this.overrides.set(override.id, override);
    this.notifySubscribers();
  }

  removeOverride(overrideId: string): void {
    this.overrides.delete(overrideId);
    this.notifySubscribers();
  }

  getOverrides(): FeatureOverride[] {
    return Array.from(this.overrides.values());
  }

  updateFlags(flags: Record<string, boolean>): void {
    this.flags = { ...flags };
    this.notifySubscribers();
  }

  subscribe(callback: (features: ConfigurableFeature[]) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  export(): FeatureExport {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      features: Array.from(this.features.values()),
      overrides: Array.from(this.overrides.values()),
    };
  }

  import(data: FeatureExport): void {
    for (const feature of data.features) {
      this.features.set(feature.id, feature);
    }
    for (const override of data.overrides) {
      this.overrides.set(override.id, override);
    }
    this.notifySubscribers();
  }

  clear(): void {
    this.features.clear();
    this.overrides.clear();
    this.flags = {};
    this.notifySubscribers();
  }
}

/**
 * Global feature registry singleton
 */
export const featureRegistry = new FeatureRegistryImpl();

/**
 * Get the global feature registry
 */
export function getFeatureRegistry(): FeatureRegistryInterface {
  return featureRegistry;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Define a new feature
 */
export function defineFeature(
  config: Omit<FeatureDefinition, 'createdAt' | 'modifiedAt'> & {
    createdAt?: Date;
    modifiedAt?: Date;
  }
): FeatureDefinition {
  return {
    ...config,
    createdAt: config.createdAt ?? new Date(),
    modifiedAt: config.modifiedAt ?? new Date(),
  };
}

/**
 * Define and register a feature
 */
export function registerFeature(
  config: Omit<FeatureDefinition, 'createdAt' | 'modifiedAt'>
): FeatureDefinition {
  const feature = defineFeature(config);
  featureRegistry.register(feature);
  return feature;
}

/**
 * Batch register features
 */
export function registerFeatures(
  features: Omit<FeatureDefinition, 'createdAt' | 'modifiedAt'>[]
): FeatureDefinition[] {
  return features.map((f) => registerFeature(f));
}

/**
 * Create a feature override
 */
export function createOverride(
  config: Omit<FeatureOverride, 'id'> & { id?: string }
): FeatureOverride {
  return {
    id: config.id ?? `override-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    featureId: config.featureId,
    enabled: config.enabled,
    priority: config.priority,
    reason: config.reason,
    expiresAt: config.expiresAt,
  };
}

// =============================================================================
// React Integration
// =============================================================================

/**
 * Configurable features context value
 */
export interface ConfigurableFeaturesContextValue {
  /** Get all features */
  readonly features: ConfigurableFeature[];
  /** Check if feature is enabled */
  isEnabled(featureId: string): boolean;
  /** Get feature by ID */
  getFeature(featureId: string): ConfigurableFeature | undefined;
  /** Get features by category */
  getByCategory(category: FeatureCategory): ConfigurableFeature[];
  /** Toggle a feature (adds override) */
  toggle(featureId: string): void;
  /** Set feature enabled state (adds override) */
  setEnabled(featureId: string, enabled: boolean): void;
  /** Clear feature override */
  clearOverride(featureId: string): void;
  /** Refresh features */
  refresh(): void;
}

/**
 * Context for configurable features
 */
const ConfigurableFeaturesContext = createContext<ConfigurableFeaturesContextValue | null>(null);

/**
 * Props for ConfigurableFeaturesProvider
 */
export interface ConfigurableFeaturesProviderProps {
  readonly children: ReactNode;
  /** Initial features to register */
  readonly initialFeatures?: readonly FeatureDefinition[];
  /** Flag getter function */
  readonly getFlag?: (flagKey: string) => boolean;
  /** Current flags */
  readonly flags?: Record<string, boolean>;
}

/**
 * Provider component for configurable features
 */
export function ConfigurableFeaturesProvider({
  children,
  initialFeatures = [],
  getFlag,
  flags = {},
}: ConfigurableFeaturesProviderProps): JSX.Element {
  const [features, setFeatures] = useState<ConfigurableFeature[]>([]);

  // Register initial features
  useEffect(() => {
    for (const feature of initialFeatures) {
      featureRegistry.register(feature);
    }

    return () => {
      for (const feature of initialFeatures) {
        featureRegistry.unregister(feature.id);
      }
    };
  }, [initialFeatures]);

  // Update flags
  useEffect(() => {
    const allFlags = { ...flags };

    if (getFlag) {
      for (const feature of featureRegistry.getAll()) {
        allFlags[feature.flagKey] = getFlag(feature.flagKey);
      }
    }

    featureRegistry.updateFlags(allFlags);
  }, [flags, getFlag]);

  // Subscribe to changes
  useEffect(() => {
    const updateFeatures = (newFeatures: ConfigurableFeature[]) => {
      setFeatures(newFeatures);
    };

    // Initial load
    setFeatures(featureRegistry.getAll());

    // Subscribe
    return featureRegistry.subscribe(updateFeatures);
  }, []);

  const isEnabled = useCallback((featureId: string): boolean => {
    return featureRegistry.isEnabled(featureId);
  }, []);

  const getFeature = useCallback((featureId: string): ConfigurableFeature | undefined => {
    return featureRegistry.get(featureId);
  }, []);

  const getByCategory = useCallback((category: FeatureCategory): ConfigurableFeature[] => {
    return featureRegistry.getByCategory(category);
  }, []);

  const toggle = useCallback((featureId: string): void => {
    const current = featureRegistry.isEnabled(featureId);
    featureRegistry.addOverride(
      createOverride({
        featureId,
        enabled: !current,
        priority: 100,
        reason: 'User toggle',
      })
    );
  }, []);

  const setEnabled = useCallback((featureId: string, enabled: boolean): void => {
    featureRegistry.addOverride(
      createOverride({
        featureId,
        enabled,
        priority: 100,
        reason: 'User override',
      })
    );
  }, []);

  const clearOverride = useCallback((featureId: string): void => {
    const overrides = featureRegistry.getOverrides();
    for (const override of overrides) {
      if (override.featureId === featureId) {
        featureRegistry.removeOverride(override.id);
      }
    }
  }, []);

  const refresh = useCallback((): void => {
    setFeatures(featureRegistry.getAll());
  }, []);

  const contextValue = useMemo<ConfigurableFeaturesContextValue>(
    () => ({
      features,
      isEnabled,
      getFeature,
      getByCategory,
      toggle,
      setEnabled,
      clearOverride,
      refresh,
    }),
    [features, isEnabled, getFeature, getByCategory, toggle, setEnabled, clearOverride, refresh]
  );

  return (
    <ConfigurableFeaturesContext.Provider value={contextValue}>
      {children}
    </ConfigurableFeaturesContext.Provider>
  );
}

/**
 * Hook to access configurable features context
 */
export function useConfigurableFeatures(): ConfigurableFeaturesContextValue {
  const context = useContext(ConfigurableFeaturesContext);
  if (!context) {
    throw new Error(
      'useConfigurableFeatures must be used within a ConfigurableFeaturesProvider'
    );
  }
  return context;
}

/**
 * Hook to use a single configurable feature
 */
export function useConfigurableFeature(featureId: string): {
  feature: ConfigurableFeature | undefined;
  isEnabled: boolean;
  toggle: () => void;
  setEnabled: (enabled: boolean) => void;
  clearOverride: () => void;
} {
  const context = useConfigurableFeatures();

  const feature = useMemo(
    () => context.features.find((f) => f.id === featureId),
    [context.features, featureId]
  );

  return {
    feature,
    isEnabled: feature?.state.isEnabled ?? false,
    toggle: () => context.toggle(featureId),
    setEnabled: (enabled: boolean) => context.setEnabled(featureId, enabled),
    clearOverride: () => context.clearOverride(featureId),
  };
}

/**
 * Hook to get features by category
 */
export function useFeaturesByCategory(category: FeatureCategory): ConfigurableFeature[] {
  const { features } = useConfigurableFeatures();
  return useMemo(() => features.filter((f) => f.category === category), [features, category]);
}

/**
 * Hook to get feature counts by stage
 */
export function useFeatureStats(): {
  total: number;
  enabled: number;
  disabled: number;
  byStage: Record<FeatureStage, number>;
  byCategory: Record<string, number>;
} {
  const { features } = useConfigurableFeatures();

  return useMemo(() => {
    const enabled = features.filter((f) => f.state.isEnabled).length;
    const byStage: Record<FeatureStage, number> = {
      development: 0,
      testing: 0,
      beta: 0,
      stable: 0,
      deprecated: 0,
      sunset: 0,
    };
    const byCategory: Record<string, number> = {};

    for (const feature of features) {
      if (feature.stage) {
        byStage[feature.stage]++;
      }
      byCategory[feature.category] = (byCategory[feature.category] ?? 0) + 1;
    }

    return {
      total: features.length,
      enabled,
      disabled: features.length - enabled,
      byStage,
      byCategory,
    };
  }, [features]);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create feature definitions from flag keys
 */
export function featuresFromFlagKeys(
  flagKeys: Record<string, string>,
  options: Partial<Omit<FeatureDefinition, 'id' | 'flagKey'>> = {}
): FeatureDefinition[] {
  return Object.entries(flagKeys).map(([key, flagKey]) => ({
    id: key.toLowerCase().replace(/_/g, '-'),
    name: key
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' '),
    description: `Feature controlled by ${flagKey}`,
    category: options.category ?? 'experimental',
    flagKey,
    defaultEnabled: options.defaultEnabled ?? false,
    stage: options.stage ?? 'stable',
    ...options,
  }));
}

/**
 * Validate feature definitions
 */
export function validateFeatures(features: FeatureDefinition[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const ids = new Set<string>();
  const flagKeys = new Set<string>();

  for (const feature of features) {
    if (!feature.id) {
      errors.push(`Feature missing ID`);
    } else if (ids.has(feature.id)) {
      errors.push(`Duplicate feature ID: ${feature.id}`);
    } else {
      ids.add(feature.id);
    }

    if (!feature.flagKey) {
      errors.push(`Feature ${feature.id} missing flagKey`);
    } else if (flagKeys.has(feature.flagKey)) {
      errors.push(`Duplicate flag key: ${feature.flagKey}`);
    } else {
      flagKeys.add(feature.flagKey);
    }

    if (feature.dependencies) {
      for (const dep of feature.dependencies) {
        if (!features.some((f) => f.id === dep.featureId)) {
          errors.push(`Feature ${feature.id} depends on unknown feature: ${dep.featureId}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
