/**
 * @file Provider Orchestrator
 * @module coordination/provider-orchestrator
 * @description PhD-level automated provider composition and nesting.
 *
 * Implements sophisticated provider orchestration with:
 * - Automatic dependency-based ordering
 * - Conditional provider inclusion
 * - Error boundary integration
 * - Loading state management
 * - Provider props injection
 * - Hot-swappable providers
 *
 * @author Agent 5 - PhD TypeScript Architect
 * @version 1.0.0
 */

import {
  createElement,
  Fragment,
  Suspense,
  useMemo,
  useEffect,
  type ReactNode,
  type ComponentType,
  type FC,
} from 'react';

import type {
  ProviderDefinition,
  ProviderOrchestratorConfig,
} from './types';

// Re-export for convenience
export { DefaultLoadingFallback, DefaultErrorFallback } from './default-components';
export type { LoadingFallbackProps, ErrorFallbackProps } from './default-components';

// Import for internal use
import {
  DefaultLoadingFallback,
} from './default-components';

// ============================================================================
// Types
// ============================================================================

/**
 * Provider registry entry with runtime state.
 */
interface ProviderEntry extends ProviderDefinition {
  /** Resolved component */
  resolvedComponent: ComponentType<{ children: ReactNode }>;
  /** Whether provider is enabled */
  isEnabled: boolean;
  /** Resolution order */
  order: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Topological sort for provider dependencies.
 */
function sortProvidersByDependencies(
  providers: ProviderDefinition[]
): ProviderDefinition[] {
  const sorted: ProviderDefinition[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const providerMap = new Map(providers.map((p) => [p.id, p]));

  function visit(id: string): void {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      console.warn(`[ProviderOrchestrator] Circular dependency detected: ${id}`);
      return;
    }

    const provider = providerMap.get(id);
    if (!provider) return;

    visiting.add(id);

    for (const dep of provider.dependencies) {
      visit(dep);
    }

    visiting.delete(id);
    visited.add(id);
    sorted.push(provider);
  }

  for (const provider of providers) {
    visit(provider.id);
  }

  return sorted;
}

/**
 * Creates the nested provider tree component.
 */
function createProviderTree(
  providers: ProviderEntry[],
  errorBoundary?: ComponentType<{ children: ReactNode }>
): ComponentType<{ children: ReactNode }> {
  // Sort by order (outer providers have lower order)
  const sortedProviders = [...providers].sort((a, b) => a.order - b.order);

  // Build tree from inside out
  const ProviderTree: FC<{ children: ReactNode }> = ({ children }) => {
    let tree = children;

    // Wrap from innermost to outermost
    for (let i = sortedProviders.length - 1; i >= 0; i--) {
      const provider = sortedProviders[i];
      if (!provider?.isEnabled) continue;

      const Component = provider.resolvedComponent;
      const props = provider.props ?? {};

      tree = createElement(Component, props as any, tree);
    }

    // Wrap with error boundary if provided
    if (errorBoundary) {
      tree = createElement(errorBoundary, {} as any, tree);
    }

    return createElement(Fragment, {}, tree);
  };

  ProviderTree.displayName = 'OrchestratedProviderTree';

  return ProviderTree;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: ProviderOrchestratorConfig = {
  providers: [],
  strictOrdering: true,
};

// ============================================================================
// ProviderOrchestratorImpl Class
// ============================================================================

/**
 * Implementation of the provider orchestrator.
 *
 * @example
 * ```tsx
 * const orchestrator = new ProviderOrchestratorImpl({
 *   providers: [
 *     {
 *       id: 'theme',
 *       Component: ThemeProvider,
 *       dependencies: [],
 *       props: { defaultTheme: 'light' },
 *     },
 *     {
 *       id: 'auth',
 *       Component: AuthProvider,
 *       dependencies: ['theme'],
 *     },
 *     {
 *       id: 'feature-flags',
 *       Component: FeatureFlagProvider,
 *       dependencies: ['auth'],
 *       condition: () => !isTestEnvironment(),
 *     },
 *   ],
 * });
 *
 * function App() {
 *   const ProviderTree = orchestrator.getProviderTree();
 *   return (
 *     <ProviderTree>
 *       <AppContent />
 *     </ProviderTree>
 *   );
 * }
 * ```
 */
export class ProviderOrchestratorImpl {
  /** Configuration */
  private readonly config: ProviderOrchestratorConfig;

  /** Provider registry */
  private readonly providers: Map<string, ProviderEntry> = new Map();

  /** Cached provider tree */
  private cachedTree: ComponentType<{ children: ReactNode }> | null = null;

  /** Tree invalidation flag */
  private isTreeInvalid = true;

  /**
   * Creates a new provider orchestrator.
   * @param config - Configuration options
   */
  constructor(config: Partial<ProviderOrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Register initial providers
    for (const provider of this.config.providers) {
      this.registerProvider(provider);
    }
  }

  // ==========================================================================
  // Provider Registration
  // ==========================================================================

  /**
   * Registers a provider.
   * @param definition - Provider definition
   */
  registerProvider(definition: ProviderDefinition): void {
    const isEnabled = definition.condition?.() ?? true;

    const entry: ProviderEntry = {
      ...definition,
      resolvedComponent: definition.Component,
      isEnabled,
      order: definition.order ?? this.providers.size,
    };

    this.providers.set(definition.id, entry);
    this.isTreeInvalid = true;
  }

  /**
   * Unregisters a provider.
   * @param id - Provider ID
   */
  unregisterProvider(id: string): void {
    this.providers.delete(id);
    this.isTreeInvalid = true;
  }

  /**
   * Updates a provider's props.
   * @param id - Provider ID
   * @param props - New props
   */
  updateProviderProps(id: string, props: Record<string, unknown>): void {
    const entry = this.providers.get(id);
    if (entry) {
      entry.props = { ...entry.props, ...props };
      this.isTreeInvalid = true;
    }
  }

  /**
   * Enables a provider.
   * @param id - Provider ID
   */
  enableProvider(id: string): void {
    const entry = this.providers.get(id);
    if (entry && !entry.isEnabled) {
      entry.isEnabled = true;
      this.isTreeInvalid = true;
    }
  }

  /**
   * Disables a provider.
   * @param id - Provider ID
   */
  disableProvider(id: string): void {
    const entry = this.providers.get(id);
    if (entry?.isEnabled) {
      entry.isEnabled = false;
      this.isTreeInvalid = true;
    }
  }

  // ==========================================================================
  // Tree Generation
  // ==========================================================================

  /**
   * Gets the composed provider tree component.
   * @returns Provider tree component
   */
  getProviderTree(): ComponentType<{ children: ReactNode }> {
    if (!this.isTreeInvalid && this.cachedTree) {
      return this.cachedTree;
    }

    // Get enabled providers
    const enabledProviders = Array.from(this.providers.values()).filter(
      (p) => p.isEnabled
    );

    // Sort by dependencies
    const sortedDefinitions = sortProvidersByDependencies(enabledProviders);

    // Create entries with proper ordering
    const entries: ProviderEntry[] = sortedDefinitions.map((def, index) => ({
      ...def,
      resolvedComponent: def.Component,
      isEnabled: true,
      order: index,
    }));

    // Create tree
    this.cachedTree = createProviderTree(entries, this.config.errorBoundary);
    this.isTreeInvalid = false;

    return this.cachedTree;
  }

  /**
   * Gets provider order (for debugging).
   * @returns Array of provider IDs in order
   */
  getProviderOrder(): string[] {
    const enabledProviders = Array.from(this.providers.values()).filter(
      (p) => p.isEnabled
    );
    const sorted = sortProvidersByDependencies(enabledProviders);
    return sorted.map((p) => p.id);
  }

  /**
   * Gets registered provider IDs.
   * @returns Array of provider IDs
   */
  getProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Checks if a provider is registered.
   * @param id - Provider ID
   */
  hasProvider(id: string): boolean {
    return this.providers.has(id);
  }

  /**
   * Checks if a provider is enabled.
   * @param id - Provider ID
   */
  isProviderEnabled(id: string): boolean {
    return this.providers.get(id)?.isEnabled ?? false;
  }
}

// ============================================================================
// React Component
// ============================================================================

/**
 * Props for OrchestratedProviders component.
 */
export interface OrchestratedProvidersProps {
  /** Provider definitions */
  providers: ProviderDefinition[];
  /** Error boundary component */
  errorBoundary?: ComponentType<{ children: ReactNode }>;
  /** Loading component */
  loadingComponent?: ComponentType;
  /** Children to render */
  children: ReactNode;
  /** Callback when all providers are ready */
  onReady?: () => void;
}

/**
 * Component that orchestrates multiple providers.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <OrchestratedProviders
 *       providers={[
 *         { id: 'theme', Component: ThemeProvider, dependencies: [] },
 *         { id: 'auth', Component: AuthProvider, dependencies: ['theme'] },
 *         { id: 'data', Component: QueryProvider, dependencies: ['auth'] },
 *       ]}
 *       loadingComponent={AppLoading}
 *       onReady={() => console.log('All providers ready')}
 *     >
 *       <AppRoutes />
 *     </OrchestratedProviders>
 *   );
 * }
 * ```
 */
export const OrchestratedProviders: FC<OrchestratedProvidersProps> = ({
  providers,
  errorBoundary,
  loadingComponent: LoadingComponent = DefaultLoadingFallback,
  children,
  onReady,
}) => {
  // Create orchestrator
  const orchestrator = useMemo(() => {
    return new ProviderOrchestratorImpl({
      providers,
      errorBoundary,
    });
  }, [providers, errorBoundary]);

  // Get provider tree
  const ProviderTree = useMemo(() => {
    return orchestrator.getProviderTree();
  }, [orchestrator]);

  // Notify when ready - use useEffect for side effects, not useMemo
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return (
    <Suspense fallback={<LoadingComponent />}>
      <ProviderTree>{children}</ProviderTree>
    </Suspense>
  );
};

OrchestratedProviders.displayName = 'OrchestratedProviders';

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Global provider orchestrator instance.
 */
let globalOrchestrator: ProviderOrchestratorImpl | null = null;

/**
 * Gets the global provider orchestrator.
 * @param config - Optional configuration
 */
export function getProviderOrchestrator(
  config?: Partial<ProviderOrchestratorConfig>
): ProviderOrchestratorImpl {
  if (!globalOrchestrator) {
    globalOrchestrator = new ProviderOrchestratorImpl(config);
  }
  return globalOrchestrator;
}

/**
 * Sets the global provider orchestrator.
 * @param orchestrator - Orchestrator instance
 */
export function setProviderOrchestrator(
  orchestrator: ProviderOrchestratorImpl
): void {
  globalOrchestrator = orchestrator;
}

/**
 * Resets the global provider orchestrator.
 */
export function resetProviderOrchestrator(): void {
  globalOrchestrator = null;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Registers a provider with the global orchestrator.
 */
export function registerProvider(definition: ProviderDefinition): void {
  getProviderOrchestrator().registerProvider(definition);
}

/**
 * Gets the global provider tree component.
 */
export function getGlobalProviderTree(): ComponentType<{ children: ReactNode }> {
  return getProviderOrchestrator().getProviderTree();
}
