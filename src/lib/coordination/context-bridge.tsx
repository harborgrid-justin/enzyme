/* @refresh reset */
/**
 * @file Context Bridge
 * @module coordination/context-bridge
 * @description PhD-level React context bridging across provider boundaries.
 *
 * Implements sophisticated context bridging with:
 * - Cross-boundary context value passing
 * - Type-safe context transformation
 * - Batched update propagation
 * - Selective subscription
 * - Context composition utilities
 *
 * @author Agent 5 - PhD TypeScript Architect
 * @version 1.0.0
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type Context,
  type ReactNode,
  type FC,
} from 'react';
import { BridgeManagerContext } from '../contexts/BridgeManagerContext';

import type { ContextBridgeDefinition } from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Context bridge registry entry.
 */
interface BridgeEntry<TSource = unknown, TTarget = unknown> {
  /** Bridge definition */
  definition: ContextBridgeDefinition<TSource, TTarget>;
  /** Current transformed value */
  currentValue: TTarget | null;
  /** Subscribers to value changes */
  subscribers: Set<(value: TTarget) => void>;
  /** Last update timestamp */
  lastUpdate: number;
}

/**
 * Bridge configuration options.
 */
export interface BridgeOptions<TSource, TTarget> {
  /** Transform source to target value */
  transformer: (source: TSource) => TTarget;
  /** Update strategy */
  updateStrategy?: 'immediate' | 'batched' | 'debounced';
  /** Debounce/batch window (ms) */
  updateWindow?: number;
  /** Equality check for optimization */
  equalityFn?: (prev: TTarget, next: TTarget) => boolean;
  /** Debug mode */
  debug?: boolean;
}

/**
 * Composed context value type.
 */
export type ComposedContextValue<T extends Record<string, unknown>> = T;

/**
 * Context selector function.
 */
export type ContextSelector<TContext, TSelected> = (context: TContext) => TSelected;

// ============================================================================
// ContextBridgeImpl Class
// ============================================================================

/**
 * Implementation of the context bridge manager.
 *
 * @example
 * ```tsx
 * const bridge = new ContextBridgeImpl();
 *
 * // Register a bridge from Auth context to User context
 * bridge.registerBridge({
 *   id: 'auth-to-user',
 *   sourceContext: AuthContext,
 *   targetContext: UserContext,
 *   transformer: (auth) => ({
 *     id: auth.user?.id,
 *     name: auth.user?.name,
 *     isAdmin: auth.roles?.includes('admin'),
 *   }),
 *   updateStrategy: 'batched',
 * });
 * ```
 */
export class ContextBridgeImpl {
  /** Registered bridges */
  private readonly bridges: Map<string, BridgeEntry> = new Map();

  /** Pending batched updates */
  private pendingUpdates: Map<string, unknown> = new Map();

  /** Batch timer */
  private batchTimer: ReturnType<typeof setTimeout> | null = null;

  /** Batch window (ms) */
  private readonly batchWindow: number;

  /**
   * Creates a new context bridge manager.
   * @param batchWindow - Default batch window in ms
   */
  constructor(batchWindow = 16) {
    this.batchWindow = batchWindow;
  }

  // ==========================================================================
  // Bridge Registration
  // ==========================================================================

  /**
   * Registers a context bridge.
   * @template TSource - Source context type
   * @template TTarget - Target context type
   * @param definition - Bridge definition
   */
  registerBridge<TSource, TTarget>(
    definition: ContextBridgeDefinition<TSource, TTarget>
  ): void {
    const entry: BridgeEntry<TSource, TTarget> = {
      definition,
      currentValue: null,
      subscribers: new Set(),
      lastUpdate: 0,
    };

    this.bridges.set(definition.id, entry as BridgeEntry);
  }

  /**
   * Unregisters a context bridge.
   * @param id - Bridge ID
   */
  unregisterBridge(id: string): void {
    const entry = this.bridges.get(id);
    if (entry) {
      entry.subscribers.clear();
      this.bridges.delete(id);
    }
  }

  /**
   * Updates a bridge with new source value.
   * @param id - Bridge ID
   * @param sourceValue - New source value
   */
  updateBridge<TSource>(id: string, sourceValue: TSource): void {
    const entry = this.bridges.get(id) as BridgeEntry<TSource, unknown> | undefined;
    if (!entry) return;

    const { definition } = entry;
    const newValue = definition.transformer(sourceValue);

    switch (definition.updateStrategy) {
      case 'batched':
        this.pendingUpdates.set(id, newValue);
        this.scheduleBatch();
        break;

      case 'debounced':
        this.pendingUpdates.set(id, newValue);
        this.scheduleBatch(definition.updateWindow ?? this.batchWindow);
        break;

      case 'immediate':
      default:
        this.notifySubscribers(id, newValue);
    }
  }

  /**
   * Subscribes to bridge value changes.
   * @param id - Bridge ID
   * @param callback - Change callback
   * @returns Unsubscribe function
   */
  subscribe<TTarget>(id: string, callback: (value: TTarget) => void): () => void {
    const entry = this.bridges.get(id);
    if (!entry) return () => {};

    entry.subscribers.add(callback as (value: unknown) => void);

    // Send current value immediately
    if (entry.currentValue !== null) {
      callback(entry.currentValue as TTarget);
    }

    return () => {
      entry.subscribers.delete(callback as (value: unknown) => void);
    };
  }

  /**
   * Gets current bridged value.
   * @param id - Bridge ID
   * @returns Current value or null
   */
  getValue<TTarget>(id: string): TTarget | null {
    const entry = this.bridges.get(id);
    return (entry?.currentValue as TTarget) ?? null;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Schedules batch processing.
   */
  private scheduleBatch(delay = this.batchWindow): void {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      this.processBatch();
    }, delay);
  }

  /**
   * Processes batched updates.
   */
  private processBatch(): void {
    const updates = this.pendingUpdates;
    this.pendingUpdates = new Map();

    for (const [id, value] of updates) {
      this.notifySubscribers(id, value);
    }
  }

  /**
   * Notifies subscribers of a value change.
   */
  private notifySubscribers(id: string, value: unknown): void {
    const entry = this.bridges.get(id);
    if (!entry) return;

    entry.currentValue = value;
    entry.lastUpdate = Date.now();

    for (const subscriber of entry.subscribers) {
      try {
        subscriber(value);
      } catch (error) {
        console.error(`[ContextBridge] Subscriber error for ${id}:`, error);
      }
    }
  }

  /**
   * Disposes the bridge manager.
   */
  dispose(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    for (const entry of this.bridges.values()) {
      entry.subscribers.clear();
    }

    this.bridges.clear();
    this.pendingUpdates.clear();
  }
}

// ============================================================================
// React Components and Hooks
// ============================================================================

/**
 * Props for ContextBridgeProvider.
 */
export interface ContextBridgeProviderProps {
  /** Children to render */
  children: ReactNode;
  /** Optional custom bridge manager */
  manager?: ContextBridgeImpl;
}

/**
 * Provider component for context bridge manager.
 */
export const ContextBridgeProvider: FC<ContextBridgeProviderProps> = ({
  children,
  manager,
}) => {
  const bridgeManager = useMemo(() => manager ?? new ContextBridgeImpl(), [manager]);

  useEffect(() => {
    return () => {
      if (!manager) {
        bridgeManager.dispose();
      }
    };
  }, [bridgeManager, manager]);

  return (
    <BridgeManagerContext.Provider value={bridgeManager}>
      {children}
    </BridgeManagerContext.Provider>
  );
};

ContextBridgeProvider.displayName = 'ContextBridgeProvider';

/**
 * Hook to access the bridge manager.
 */
export function useBridgeManager(): import('../contexts/BridgeManagerContext').ContextBridgeImpl {
  const manager = useContext(BridgeManagerContext);
  if (!manager) {
    throw new Error('useBridgeManager must be used within a ContextBridgeProvider');
  }
  return manager;
}

/**
 * Hook to consume a bridged context value.
 * @template TTarget - Target value type
 * @param bridgeId - Bridge ID
 * @returns Bridged value
 */
export function useBridgedContext<TTarget>(bridgeId: string): TTarget | null {
  const manager = useBridgeManager();
  const [value, setValue] = useState<TTarget | null>(() => manager.getValue<TTarget>(bridgeId));

  useEffect(() => {
    return manager.subscribe<TTarget>(bridgeId, setValue);
  }, [manager, bridgeId]);

  return value;
}

/**
 * Props for BridgeSource component.
 */
export interface BridgeSourceProps<TSource> {
  /** Bridge ID */
  bridgeId: string;
  /** Source context */
  context: Context<TSource | null>;
  /** Children to render */
  children: ReactNode;
}

/**
 * Component that bridges a source context to the bridge manager.
 */
export function BridgeSource<TSource>({
  bridgeId,
  context,
  children,
}: BridgeSourceProps<TSource>): React.JSX.Element {
  const manager = useBridgeManager();
  const sourceValue = useContext(context);

  useEffect(() => {
    if (sourceValue !== null) {
      manager.updateBridge(bridgeId, sourceValue);
    }
  }, [manager, bridgeId, sourceValue]);

  return <>{children}</>;
}

/**
 * Props for BridgeConsumer component.
 */
export interface BridgeConsumerProps<TTarget> {
  /** Bridge ID */
  bridgeId: string;
  /** Render function */
  children: (value: TTarget | null) => ReactNode;
}

/**
 * Component that consumes a bridged context value.
 */
export function BridgeConsumer<TTarget>({
  bridgeId,
  children,
}: BridgeConsumerProps<TTarget>): React.JSX.Element {
  const value = useBridgedContext<TTarget>(bridgeId);
  return <>{children(value)}</>;
}

// ============================================================================
// Context Composition Utilities
// ============================================================================

/**
 * Creates a composed context from multiple source contexts.
 * @template T - Composed context type
 * @param config - Context configuration
 * @returns Composed context and provider
 */
export function createComposedContext<T extends Record<string, unknown>>(config: {
  displayName: string;
  sources: {
    [K in keyof T]: {
      context: Context<T[K] | null>;
      selector?: (value: T[K]) => unknown;
    };
  };
}): {
  Context: Context<T | null>;
  Provider: FC<{ children: ReactNode }>;
  useComposed: () => T;
} {
  const ComposedContext = createContext<T | null>(null);
  ComposedContext.displayName = config.displayName;

  const ComposedProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const sourceValues: Partial<T> = {};

    // Get all source values
    for (const key of Object.keys(config.sources) as Array<keyof T>) {
      const source = config.sources[key];
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const value = useContext(source.context);
      sourceValues[key] = (source.selector != null && value != null ? source.selector(value) : value) as T[keyof T];
    }

    const composedValue = useMemo(() => sourceValues as T, [
      // eslint-disable-next-line react-hooks/exhaustive-deps, @typescript-eslint/no-unsafe-assignment
      ...Object.values(sourceValues),
    ]);

    return (
      <ComposedContext.Provider value={composedValue}>
        {children}
      </ComposedContext.Provider>
    );
  };

  ComposedProvider.displayName = `${config.displayName}Provider`;

  const useComposed = (): T => {
    const value = useContext(ComposedContext);
    if (value === null) {
      throw new Error(`useComposed must be used within a ${config.displayName}Provider`);
    }
    return value;
  };

  return {
    Context: ComposedContext,
    Provider: ComposedProvider,
    useComposed,
  };
}

/**
 * Hook to select from multiple contexts with optimization.
 * @template TResult - Result type
 * @param selector - Selector function receiving context getters
 * @param deps - Dependencies for the selector
 * @returns Selected value
 */
export function useMultiContextSelector<TResult>(
  selector: (getContext: <T>(context: Context<T | null>) => T | null) => TResult,
  deps: Array<Context<unknown>>
): TResult {
  const contextValues = useRef<Map<Context<unknown>, unknown>>(new Map());

  // Get all context values
  for (const ctx of deps) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const value = useContext(ctx);
    contextValues.current.set(ctx, value);
  }

  const getContext = useCallback(<T,>(context: Context<T | null>): T | null => {
    return contextValues.current.get(context as Context<unknown>) as T | null;
  }, []);

  return useMemo(() => selector(getContext), [selector, getContext]);
}

// ============================================================================
// Higher-Order Component
// ============================================================================

/**
 * Props added by withBridgedContext HOC.
 */
export interface WithBridgedContextProps<T> {
  bridgedValue: T | null;
}

/**
 * HOC to inject bridged context value as prop.
 * @template P - Component props
 * @template T - Bridged value type
 * @param bridgeId - Bridge ID
 * @returns HOC function
 */
export function withBridgedContext<P extends WithBridgedContextProps<T>, T>(
  bridgeId: string
): (Component: React.ComponentType<P>) => React.FC<Omit<P, keyof WithBridgedContextProps<T>>> {
  return (Component) => {
    const WrappedComponent: React.FC<Omit<P, keyof WithBridgedContextProps<T>>> = (props) => {
      const bridgedValue = useBridgedContext<T>(bridgeId);
      return <Component {...(props as P)} bridgedValue={bridgedValue} />;
    };

    WrappedComponent.displayName = `withBridgedContext(${Component.displayName ?? Component.name ?? 'Component'})`;

    return WrappedComponent;
  };
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Global context bridge manager.
 */
let globalBridgeManager: ContextBridgeImpl | null = null;

/**
 * Gets the global context bridge manager.
 */
export function getContextBridgeManager(): ContextBridgeImpl {
  globalBridgeManager ??= new ContextBridgeImpl();
  return globalBridgeManager;
}

/**
 * Sets the global context bridge manager.
 */
export function setContextBridgeManager(manager: ContextBridgeImpl): void {
  if (globalBridgeManager) {
    globalBridgeManager.dispose();
  }
  globalBridgeManager = manager;
}

/**
 * Resets the global context bridge manager.
 */
export function resetContextBridgeManager(): void {
  if (globalBridgeManager) {
    globalBridgeManager.dispose();
    globalBridgeManager = null;
  }
}

// ============================================================================
// Export
// ============================================================================

export { BridgeManagerContext };
