/**
 * @file Module Boundary Component
 * @module vdom/ModuleBoundary
 * @description Defines module boundaries in the React tree with sandboxed
 * execution, state isolation, error boundaries, and lifecycle management.
 * Core component for the Virtual Modular DOM system.
 *
 * @author Agent 5 - PhD Virtual DOM Expert
 * @version 1.0.0
 */

/* eslint-disable react-refresh/only-export-components, react-hooks/exhaustive-deps */

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
  type FC,
  type ErrorInfo,
  Component,
} from 'react';
import {
  type ModuleId,
  type ModuleBoundaryConfig,
  type ModuleBoundaryState,
  type ModuleContextValue,
  type ModuleAction,
  type ModuleLifecycleHooks,
  type HydrationConfig,
  type ModuleSecurityConfig,
  type SecurityContext,
  type ModuleSlotDefinition,
  ModuleLifecycleState,
  type ModuleLifecycleEvent,
  HydrationState,
  DEFAULT_HYDRATION_CONFIG,
} from './types';
import type { VirtualModuleManager } from './virtual-module';
import { createVirtualModule, createValidatedModuleId } from './virtual-module';
import { createSecuritySandbox, type SecuritySandbox } from './security-sandbox';
import { useModuleSystem, ModuleHierarchyProvider } from './ModuleProviderExports';

// ============================================================================
// Types
// ============================================================================

/**
 * Module boundary props.
 */
export interface ModuleBoundaryProps {
  /** Unique module identifier */
  id: string;
  /** Human-readable module name */
  name: string;
  /** Module version */
  version?: string;
  /** Child content */
  children: ReactNode;
  /** Slot definitions */
  slots?: ModuleSlotDefinition[];
  /** Lifecycle hooks */
  lifecycle?: ModuleLifecycleHooks;
  /** Hydration configuration */
  hydration?: Partial<HydrationConfig>;
  /** Security configuration */
  security?: Partial<ModuleSecurityConfig>;
  /** Whether module is isolated */
  isolated?: boolean;
  /** Performance budget (ms) */
  performanceBudget?: number;
  /** Enable strict mode */
  strict?: boolean;
  /** Fallback UI for errors */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** Loading UI for hydration */
  loading?: ReactNode;
  /** Callback when module mounts */
  onMount?: () => void;
  /** Callback when module unmounts */
  onUnmount?: () => void;
  /** Callback on error */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Callback on hydration complete */
  onHydrated?: () => void;
}

// ============================================================================
// Context
// ============================================================================

/**
 * Module context for accessing boundary information.
 */
const ModuleContext = createContext<ModuleContextValue | null>(null);

// ============================================================================
// Error Boundary
// ============================================================================

/**
 * Error boundary state.
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary props.
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

/**
 * Module-scoped error boundary component.
 */
class ModuleErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  override render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;

      if (typeof fallback === 'function') {
        return fallback(this.state.error, this.reset);
      }

      if (fallback !== null && fallback !== undefined) {
        return fallback;
      }

      // Default error UI
      return (
        <div
          role="alert"
          style={{
            padding: '16px',
            backgroundColor: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '4px',
          }}
        >
          <h3 style={{ margin: '0 0 8px', color: '#dc2626' }}>Module Error</h3>
          <p style={{ margin: 0, color: '#7f1d1d' }}>{this.state.error.message}</p>
          <button
            onClick={this.reset}
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// ModuleBoundary Component
// ============================================================================

/**
 * Internal module boundary implementation.
 */
const ModuleBoundaryInner: FC<ModuleBoundaryProps & { moduleId: ModuleId }> = ({
  moduleId,
  name,
  version,
  children,
  slots,
  lifecycle,
  hydration,
  security,
  isolated,
  performanceBudget,
  strict,
  fallback,
  loading,
  onMount,
  onUnmount,
  onError,
  onHydrated,
}) => {
  // Get system context
  const system = useModuleSystem();

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<VirtualModuleManager | null>(null);
  const securityRef = useRef<SecuritySandbox | null>(null);
  const mountTimeRef = useRef<number>(0);

  // State
  const [state, setState] = useState<ModuleBoundaryState>(() => ({
    lifecycleState: ModuleLifecycleState.REGISTERED,
    hydrationState: HydrationState.DEHYDRATED,
    isVisible: false,
    isActive: false,
    error: null,
    errorInfo: null,
    slots: new Map(),
    moduleState: new Map(),
    metrics: {
      initTime: 0,
      mountTime: 0,
      hydrationTime: 0,
      renderCount: 0,
      totalRenderTime: 0,
      avgRenderTime: 0,
      peakRenderTime: 0,
      updateCount: 0,
      memoryEstimate: 0,
      vNodeCount: 0,
      domNodeCount: 0,
      lastMeasuredAt: 0,
    },
  }));

  // Initialize manager on first render
  if (!managerRef.current) {
    const config: ModuleBoundaryConfig = {
      id: moduleId,
      name,
      version,
      slots,
      lifecycle,
      hydration: { ...DEFAULT_HYDRATION_CONFIG, ...hydration },
      security,
      isolated,
      performanceBudget,
      strict,
    };

    managerRef.current = createVirtualModule(config);
    securityRef.current = createSecuritySandbox(moduleId, security);

    // Register with registry
    system.registry.register(config);
  }

  // Create config object
  const config = useMemo<ModuleBoundaryConfig>(
    () => ({
      id: moduleId,
      name,
      version,
      slots,
      lifecycle,
      hydration: { ...DEFAULT_HYDRATION_CONFIG, ...hydration },
      security,
      isolated,
      performanceBudget,
      strict,
    }),
    [
      moduleId,
      name,
      version,
      slots,
      lifecycle,
      hydration,
      security,
      isolated,
      performanceBudget,
      strict,
    ]
  );

  // Create security context
  const securityContext = useMemo<SecurityContext>(() => {
    const security = securityRef.current;
    if (!security) {
      throw new Error('Security not initialized');
    }
    return security.createContext();
  }, []);

  // Get parent context
  const parentContext = useContext(ModuleContext);

  // Action dispatcher
  const dispatch = useCallback((action: ModuleAction) => {
    switch (action.type) {
      case 'SET_STATE':
        setState((prev) => {
          const newModuleState = new Map(prev.moduleState);
          newModuleState.set(action.key, action.value);
          return { ...prev, moduleState: newModuleState };
        });
        break;

      case 'MERGE_STATE':
        setState((prev) => {
          const newModuleState = new Map(prev.moduleState);
          for (const [key, value] of Object.entries(action.state)) {
            newModuleState.set(key, value);
          }
          return { ...prev, moduleState: newModuleState };
        });
        break;

      case 'RESET_STATE':
        setState((prev) => ({
          ...prev,
          moduleState: new Map(),
        }));
        break;

      case 'SET_SLOT':
        setState((prev) => {
          const newSlots = new Map(prev.slots);
          newSlots.set(action.name, action.content);
          return { ...prev, slots: newSlots };
        });
        break;

      case 'CLEAR_SLOT':
        setState((prev) => {
          const newSlots = new Map(prev.slots);
          newSlots.delete(action.name);
          return { ...prev, slots: newSlots };
        });
        break;

      case 'SET_VISIBILITY':
        setState((prev) => ({
          ...prev,
          isVisible: action.isVisible,
        }));
        break;

      case 'SET_ERROR':
        setState((prev) => ({
          ...prev,
          error: action.error,
          errorInfo: action.errorInfo ?? null,
          lifecycleState: ModuleLifecycleState.ERROR,
        }));
        break;

      case 'CLEAR_ERROR':
        setState((prev) => ({
          ...prev,
          error: null,
          errorInfo: null,
        }));
        break;

      case 'TRANSITION_STATE':
        setState((prev) => ({
          ...prev,
          lifecycleState: action.to,
        }));
        break;

      case 'TRIGGER_HYDRATION':
        // Handled by hydrate function
        break;
    }
  }, []);

  // Slot management
  const getSlot = useCallback(
    (slotName: string): ReactNode | null => {
      return state.slots.get(slotName) ?? null;
    },
    [state.slots]
  );

  const setSlot = useCallback(
    (slotName: string, content: ReactNode) => {
      dispatch({ type: 'SET_SLOT', name: slotName, content });
    },
    [dispatch]
  );

  // Hydration trigger
  const hydrate = useCallback(async () => {
    if (state.hydrationState !== HydrationState.DEHYDRATED) {
      return;
    }

    const startTime = performance.now();

    setState((prev) => ({
      ...prev,
      hydrationState: HydrationState.HYDRATING,
    }));

    try {
      // Simulate hydration delay for demonstration
      await new Promise((resolve) => setTimeout(resolve, 10));

      const hydrationTime = performance.now() - startTime;

      setState((prev) => ({
        ...prev,
        hydrationState: HydrationState.HYDRATED,
        metrics: {
          ...prev.metrics,
          hydrationTime,
          lastMeasuredAt: Date.now(),
        },
      }));

      onHydrated?.();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        hydrationState: HydrationState.FAILED,
        error: error instanceof Error ? error : new Error(String(error)),
      }));
    }
  }, [state.hydrationState, onHydrated]);

  // Lifecycle event subscription
  const subscribe = useCallback((event: ModuleLifecycleEvent, handler: () => void) => {
    const manager = managerRef.current;
    if (!manager) {
      return () => {};
    }
    return manager.subscribe(event, handler);
  }, []);

  // Create context value
  const contextValue = useMemo<ModuleContextValue>(
    () => ({
      moduleId,
      config,
      state,
      security: securityContext,
      parent: parentContext,
      dispatch,
      getSlot,
      setSlot,
      hydrate,
      subscribe,
    }),
    [
      moduleId,
      config,
      state,
      securityContext,
      parentContext,
      dispatch,
      getSlot,
      setSlot,
      hydrate,
      subscribe,
    ]
  );

  // Initialize and mount
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) {
      return;
    }

    mountTimeRef.current = performance.now();

    const initAndMount = async (): Promise<void> => {
      try {
        await manager.initialize();

        setState((prev) => ({
          ...prev,
          lifecycleState: ModuleLifecycleState.INITIALIZED,
          metrics: {
            ...prev.metrics,
            initTime: performance.now() - mountTimeRef.current,
          },
        }));

        if (containerRef.current) {
          await manager.mount(containerRef.current);

          const mountTime = performance.now() - mountTimeRef.current;

          setState((prev) => ({
            ...prev,
            lifecycleState: ModuleLifecycleState.MOUNTED,
            isActive: true,
            metrics: {
              ...prev.metrics,
              mountTime,
              lastMeasuredAt: Date.now(),
            },
          }));

          onMount?.();

          // Report metrics
          system.reportMetrics(moduleId, {
            ...state.metrics,
            mountTime,
            lastMeasuredAt: Date.now(),
          });

          // Check performance budget
          system.checkBudget(moduleId, {
            ...state.metrics,
            mountTime,
          });
        }

        // Auto-hydrate based on configuration
        const hydrationConfig = config.hydration;
        if (hydrationConfig?.trigger === 'immediate') {
          await hydrate();
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState((prev) => ({
          ...prev,
          lifecycleState: ModuleLifecycleState.ERROR,
          error: err,
        }));
        onError?.(err, { componentStack: '' } as ErrorInfo);
      }
    };

    void initAndMount();

    return (): void => {
      const cleanup = async (): Promise<void> => {
        await manager.unmount();
        await manager.dispose();
      };
      void cleanup();
      onUnmount?.();
      system.registry.unregister(moduleId);
    };
  }, []);

  // Visibility observation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const hydrationConfig = config.hydration;
    if (hydrationConfig?.trigger !== 'visible') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const isVisible = entry.isIntersecting;

          dispatch({ type: 'SET_VISIBILITY', isVisible });

          if (isVisible && state.hydrationState === HydrationState.DEHYDRATED) {
            void hydrate();
          }
        }
      },
      {
        rootMargin: hydrationConfig.rootMargin ?? '100px',
        threshold: hydrationConfig.threshold ?? 0.1,
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [config.hydration, state.hydrationState, hydrate, dispatch]);

  // Render count tracking
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        renderCount: prev.metrics.renderCount + 1,
        lastMeasuredAt: Date.now(),
      },
    }));
  });

  // Handle error state
  const handleError = useCallback(
    (error: Error, errorInfo: ErrorInfo) => {
      dispatch({ type: 'SET_ERROR', error, errorInfo });
      void managerRef.current?.handleError(error, errorInfo);
      onError?.(error, errorInfo);
    },
    [dispatch, onError]
  );

  const handleReset = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
    managerRef.current?.clearError();
  }, [dispatch]);

  // Loading state
  if (
    state.hydrationState === HydrationState.PENDING ||
    state.hydrationState === HydrationState.HYDRATING
  ) {
    if (loading !== null && loading !== undefined) {
      return <>{loading}</>;
    }
  }

  return (
    <ModuleContext.Provider value={contextValue}>
      <ModuleHierarchyProvider moduleId={moduleId}>
        <ModuleErrorBoundary fallback={fallback} onError={handleError} onReset={handleReset}>
          <div
            ref={containerRef}
            data-module-id={moduleId}
            data-module-name={name}
            data-module-state={state.lifecycleState}
            data-hydration-state={state.hydrationState}
            style={isolated === true ? { contain: 'content' } : undefined}
          >
            {children}
          </div>
        </ModuleErrorBoundary>
      </ModuleHierarchyProvider>
    </ModuleContext.Provider>
  );
};

/**
 * Module boundary component.
 * Defines module boundaries with state isolation, error handling, and lifecycle management.
 *
 * @example
 * ```tsx
 * <ModuleBoundary
 *   id="dashboard"
 *   name="Dashboard Module"
 *   version="1.0.0"
 *   hydration={{ trigger: 'visible', priority: 2 }}
 *   fallback={(error, reset) => (
 *     <ErrorDisplay error={error} onRetry={reset} />
 *   )}
 *   onMount={() => analytics.track('module_mounted', { name: 'dashboard' })}
 * >
 *   <DashboardContent />
 * </ModuleBoundary>
 * ```
 */
export const ModuleBoundary: FC<ModuleBoundaryProps> = (props) => {
  // Validate and create module ID
  const moduleId = useMemo(() => createValidatedModuleId(props.id), [props.id]);

  return <ModuleBoundaryInner {...props} moduleId={moduleId} />;
};

ModuleBoundary.displayName = 'ModuleBoundary';

// ============================================================================
// Context Hook
// ============================================================================

/**
 * Hook to access the module boundary context.
 * @throws Error if used outside a ModuleBoundary
 * @returns Module context value
 */
export function useModuleContext(): ModuleContextValue {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error('useModuleContext must be used within a ModuleBoundary');
  }
  return context;
}

/**
 * Hook to optionally access the module context.
 * @returns Module context value or null
 */
export function useOptionalModuleContext(): ModuleContextValue | null {
  return useContext(ModuleContext);
}
