/**
 * @file Stream Provider Component
 * @description React context provider for the Dynamic HTML Streaming Engine.
 *
 * The StreamProvider establishes the streaming context for the component tree,
 * managing the streaming engine lifecycle, providing stream coordination,
 * and exposing streaming controls to child components.
 *
 * @module streaming/StreamProvider
 * @version 1.0.0
 * @author Harbor Framework Team
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <StreamProvider
 *       config={{ maxConcurrentStreams: 4, debug: true }}
 *       onError={(error) => console.error('Stream error:', error)}
 *       onMetricsUpdate={(metrics) => analytics.track('stream_metrics', metrics)}
 *     >
 *       <AppContent />
 *     </StreamProvider>
 *   );
 * }
 * ```
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useState,
  type ReactNode,
  type ReactElement,
  type DependencyList,
  type ComponentType,
  type FC,
  Component,
  type ErrorInfo,
} from 'react';

import {
  StreamingEngine,
  createStreamingEngine,
} from './streaming-engine';

import {
  type StreamConfig,
  type EngineConfig,
  type StreamError,
  type StreamMetrics,
  type StreamContextValue,
  type StreamProviderProps,
  type StreamEventHandler,
  type StreamState,
  DEFAULT_ENGINE_CONFIG,
  DEFAULT_METRICS,
  StreamEventType,
  StreamErrorCode,
  createStreamError,
} from './types';

// ============================================================================
// Context Definition
// ============================================================================

/**
 * React context for streaming functionality.
 * @internal
 */
const StreamContext = createContext<StreamContextValue | null>(null);

/**
 * Display name for React DevTools.
 */
StreamContext.displayName = 'StreamContext';

// ============================================================================
// Error Boundary for Stream Errors
// ============================================================================

interface StreamErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: StreamError, reset: () => void) => ReactNode);
  onError?: (error: StreamError) => void;
}

interface StreamErrorBoundaryState {
  hasError: boolean;
  error: StreamError | null;
}

/**
 * Error boundary specifically for stream-related errors.
 *
 * @description
 * Catches errors that occur during streaming and provides
 * graceful fallback rendering with recovery options.
 */
class StreamErrorBoundary extends Component<
  StreamErrorBoundaryProps,
  StreamErrorBoundaryState
> {
  constructor(props: StreamErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): StreamErrorBoundaryState {
    const streamError = createStreamError(
      StreamErrorCode.UnknownError,
      error.message,
      { cause: error, stack: error.stack }
    );

    return { hasError: true, error: streamError };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const streamError = createStreamError(
      StreamErrorCode.UnknownError,
      error.message,
      { cause: error, stack: errorInfo.componentStack ?? error.stack }
    );

    this.props.onError?.(streamError);

    // Log in development
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.error('[StreamErrorBoundary] Caught error:', error);
      console.error('[StreamErrorBoundary] Component stack:', errorInfo.componentStack);
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;

      if (typeof fallback === 'function') {
        return fallback(this.state.error, this.handleReset);
      }

      if (fallback !== undefined && fallback !== null) {
        return fallback;
      }

      // Default fallback UI
      return (
        <div
          role="alert"
          className="stream-error-boundary"
          style={{
            padding: '1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.375rem',
          }}
        >
          <h3 style={{ color: '#dc2626', marginBottom: '0.5rem' }}>
            Streaming Error
          </h3>
          <p style={{ color: '#7f1d1d', marginBottom: '0.5rem' }}>
            {this.state.error.message}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '0.25rem 0.75rem',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
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
// Environment Detection
// ============================================================================

/**
 * Detects if code is running in a server-side environment.
 */
function isServerEnvironment(): boolean {
  return (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    // Check for SSR frameworks
    (typeof navigator !== 'undefined' && navigator.product === 'ReactNative')
  );
}

/**
 * Checks if the current environment supports streaming APIs.
 */
function isStreamingSupported(): boolean {
  if (isServerEnvironment()) {
    // Server always supports streaming
    return true;
  }

  return StreamingEngine.isStreamingSupported();
}

// ============================================================================
// Stream Provider Implementation
// ============================================================================

/**
 * Provider component for the Dynamic HTML Streaming Engine.
 *
 * @description
 * StreamProvider initializes and manages the streaming engine,
 * providing context to child components for stream registration,
 * control, and monitoring.
 *
 * Features:
 * - Automatic engine lifecycle management
 * - Global error handling with error boundaries
 * - Metrics collection and reporting
 * - SSR-aware initialization
 * - Graceful degradation for unsupported environments
 *
 * @example
 * ```tsx
 * // Basic usage
 * <StreamProvider>
 *   <App />
 * </StreamProvider>
 *
 * // With configuration
 * <StreamProvider
 *   config={{
 *     maxConcurrentStreams: 6,
 *     backpressureStrategy: BackpressureStrategy.Pause,
 *     debug: process.env.NODE_ENV === 'development',
 *   }}
 *   enableMetrics
 *   onError={(error) => errorReporter.capture(error)}
 *   onMetricsUpdate={(metrics) => performanceMonitor.record(metrics)}
 * >
 *   <App />
 * </StreamProvider>
 * ```
 */
export function StreamProvider({
  children,
  config: configOverrides,
  debug = false,
  enableMetrics = true,
  onError,
  onMetricsUpdate,
}: StreamProviderProps): ReactElement {
  // Merge configuration with defaults
  const config = useMemo<EngineConfig>(
    () => ({
      ...DEFAULT_ENGINE_CONFIG,
      ...configOverrides,
      debug,
      enableMetrics,
    }),
    [configOverrides, debug, enableMetrics]
  );

  // Environment detection
  const isSSR = useMemo(() => isServerEnvironment(), []);
  const supportsStreaming = useMemo(() => isStreamingSupported(), []);

  // Engine reference (stable across renders)
  const engineRef = useRef<StreamingEngine | null>(null);

  // Metrics state for reactive updates
  const [metrics, setMetrics] = useState<StreamMetrics>(DEFAULT_METRICS);

  // Initialize engine
  useEffect(() => {
    if (!supportsStreaming && !isSSR) {
      console.warn(
        '[StreamProvider] Streaming APIs not supported in this environment. ' +
        'Falling back to non-streaming mode.'
      );
      return undefined;
    }

    // Create engine if not already created
    if (!engineRef.current) {
      engineRef.current = createStreamingEngine(config);

      // Subscribe to events for metrics and error handling
      const unsubscribe = engineRef.current.subscribe((event) => {
        // Update metrics
        if (enableMetrics) {
          const currentMetrics = engineRef.current?.getMetrics();
          if (currentMetrics) {
            setMetrics(currentMetrics);
            onMetricsUpdate?.(currentMetrics);
          }
        }

        // Handle errors
        if (event.type === StreamEventType.Error && onError) {
          onError(event.payload as StreamError);
        }
      });

      // Cleanup on unmount
      return () => {
        unsubscribe();
        engineRef.current?.dispose();
        engineRef.current = null;
      };
    }
    return undefined;
  }, [config, enableMetrics, isSSR, onError, onMetricsUpdate, supportsStreaming]);

  // ==========================================================================
  // Context Value Methods
  // ==========================================================================

  const registerBoundary = useCallback((id: string, boundaryConfig: StreamConfig) => {
    if (!engineRef.current) {
      if (debug) {
        console.warn(`[StreamProvider] Cannot register boundary "${id}" - engine not initialized`);
      }
      return;
    }

    try {
      engineRef.current.registerBoundary(id, boundaryConfig);
    } catch (error) {
      if (debug) {
        console.error(`[StreamProvider] Failed to register boundary "${id}":`, error);
      }
      throw error;
    }
  }, [debug]);

  const unregisterBoundary = useCallback((id: string) => {
    if (!engineRef.current) return;
    engineRef.current.unregisterBoundary(id);
  }, []);

  const getBoundaryState = useCallback((id: string): StreamState | null => {
    if (!engineRef.current) return null;
    return engineRef.current.getState(id);
  }, []);

  const startStream = useCallback((id: string) => {
    if (!engineRef.current) {
      if (debug) {
        console.warn(`[StreamProvider] Cannot start stream "${id}" - engine not initialized`);
      }
      return;
    }

    try {
      engineRef.current.start(id);
    } catch (error) {
      if (debug) {
        console.error(`[StreamProvider] Failed to start stream "${id}":`, error);
      }
    }
  }, [debug]);

  const pauseStream = useCallback((id: string) => {
    if (!engineRef.current) return;
    try {
      engineRef.current.pause(id);
    } catch (error) {
      if (debug) {
        console.error(`[StreamProvider] Failed to pause stream "${id}":`, error);
      }
    }
  }, [debug]);

  const resumeStream = useCallback((id: string) => {
    if (!engineRef.current) return;
    try {
      engineRef.current.resume(id);
    } catch (error) {
      if (debug) {
        console.error(`[StreamProvider] Failed to resume stream "${id}":`, error);
      }
    }
  }, [debug]);

  const abortStream = useCallback((id: string, reason?: string) => {
    if (!engineRef.current) return;
    engineRef.current.abort(id, reason);
  }, []);

  const getMetrics = useCallback((): StreamMetrics => {
    return engineRef.current?.getMetrics() ?? metrics;
  }, [metrics]);

  const subscribe = useCallback((handler: StreamEventHandler): (() => void) => {
    if (!engineRef.current) {
      return () => {};
    }
    return engineRef.current.subscribe(handler);
  }, []);

  // ==========================================================================
  // Context Value
  // ==========================================================================

  const contextValue = useMemo<StreamContextValue>(
    () => ({
      registerBoundary,
      unregisterBoundary,
      getBoundaryState,
      startStream,
      pauseStream,
      resumeStream,
      abortStream,
      getMetrics,
      subscribe,
      config,
      isStreamingSupported: supportsStreaming,
      isSSR,
    }),
    [
      registerBoundary,
      unregisterBoundary,
      getBoundaryState,
      startStream,
      pauseStream,
      resumeStream,
      abortStream,
      getMetrics,
      subscribe,
      config,
      supportsStreaming,
      isSSR,
    ]
  );

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <StreamContext.Provider value={contextValue}>
      <StreamErrorBoundary onError={onError}>
        {children}
      </StreamErrorBoundary>
    </StreamContext.Provider>
  );
}

// ============================================================================
// Context Hook
// ============================================================================

/**
 * Hook to access the streaming context.
 *
 * @description
 * Provides access to all streaming functionality including
 * boundary registration, stream control, and metrics.
 *
 * @throws {Error} If used outside of a StreamProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const stream = useStreamContext();
 *
 *   useEffect(() => {
 *     stream.registerBoundary('my-content', {
 *       priority: StreamPriority.High,
 *     });
 *
 *     stream.startStream('my-content');
 *
 *     return () => stream.unregisterBoundary('my-content');
 *   }, [stream]);
 *
 *   return <div>My streaming content</div>;
 * }
 * ```
 */
export function useStreamContext(): StreamContextValue {
  const context = useContext(StreamContext);

  if (!context) {
    throw new Error(
      'useStreamContext must be used within a StreamProvider. ' +
      'Wrap your component tree with <StreamProvider> to use streaming features.'
    );
  }

  return context;
}

/**
 * Hook to optionally access streaming context.
 *
 * @description
 * Similar to useStreamContext but returns null instead of
 * throwing if used outside a StreamProvider. Useful for
 * components that can work with or without streaming.
 *
 * @example
 * ```tsx
 * function OptionalStreamingComponent() {
 *   const stream = useOptionalStreamContext();
 *
 *   if (!stream) {
 *     return <div>Non-streaming fallback</div>;
 *   }
 *
 *   return <div>Streaming enabled!</div>;
 * }
 * ```
 */
export function useOptionalStreamContext(): StreamContextValue | null {
  return useContext(StreamContext);
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to check if streaming is available.
 *
 * @description
 * Returns a boolean indicating whether streaming features
 * are available in the current environment.
 *
 * @example
 * ```tsx
 * function StreamingFeature() {
 *   const isAvailable = useStreamingAvailable();
 *
 *   if (!isAvailable) {
 *     return <StaticFallback />;
 *   }
 *
 *   return <StreamingContent />;
 * }
 * ```
 */
export function useStreamingAvailable(): boolean {
  const context = useOptionalStreamContext();
  return context?.isStreamingSupported ?? false;
}

/**
 * Hook to check if currently in SSR context.
 *
 * @description
 * Returns a boolean indicating whether the component
 * is currently rendering on the server.
 *
 * @example
 * ```tsx
 * function ServerAwareComponent() {
 *   const isSSR = useIsSSR();
 *
 *   if (isSSR) {
 *     return <ServerPlaceholder />;
 *   }
 *
 *   return <ClientContent />;
 * }
 * ```
 */
export function useIsSSR(): boolean {
  const context = useOptionalStreamContext();
  return context?.isSSR ?? isServerEnvironment();
}

/**
 * Hook to access current stream metrics.
 *
 * @description
 * Returns the current streaming metrics. The metrics are
 * updated reactively as streams progress.
 *
 * @example
 * ```tsx
 * function MetricsDashboard() {
 *   const metrics = useStreamMetrics();
 *
 *   return (
 *     <div>
 *       <p>Active streams: {metrics.activeStreams}</p>
 *       <p>Total bytes: {metrics.totalBytesTransferred}</p>
 *       <p>Buffer usage: {(metrics.bufferUtilization * 100).toFixed(1)}%</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useStreamMetrics(): StreamMetrics {
  const context = useStreamContext();
  const [metrics, setMetrics] = useState<StreamMetrics>(context.getMetrics);

  useEffect(() => {
    const unsubscribe = context.subscribe(() => {
      setMetrics(context.getMetrics());
    });

    return unsubscribe;
  }, [context]);

  return metrics;
}

/**
 * Hook to subscribe to stream events.
 *
 * @description
 * Subscribes to stream events and calls the handler
 * when events occur. Automatically unsubscribes on unmount.
 *
 * @param handler - Event handler function
 * @param deps - Dependencies array for the handler
 *
 * @example
 * ```tsx
 * function EventLogger() {
 *   useStreamEvents((event) => {
 *     console.log(`Stream event: ${event.type} for ${event.boundaryId}`);
 *   }, []);
 *
 *   return null;
 * }
 * ```
 */
export function useStreamEvents(
  handler: StreamEventHandler,
  deps: DependencyList = []
): void {
  const context = useStreamContext();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableHandler = useCallback(handler, deps);

  useEffect(() => {
    return context.subscribe(stableHandler);
  }, [context, stableHandler]);
}

// ============================================================================
// HOC for Non-Hook Usage
// ============================================================================

/**
 * Props injected by withStream HOC.
 */
export interface WithStreamProps {
  stream: StreamContextValue;
}

/**
 * Higher-order component for class components that need streaming access.
 *
 * @description
 * Wraps a class component and injects the stream context as a prop.
 * Prefer hooks for functional components.
 *
 * @example
 * ```tsx
 * interface MyComponentProps extends WithStreamProps {
 *   title: string;
 * }
 *
 * class MyComponent extends Component<MyComponentProps> {
 *   componentDidMount() {
 *     this.props.stream.registerBoundary('my-boundary', {
 *       priority: StreamPriority.Normal,
 *     });
 *   }
 *
 *   render() {
 *     return <div>{this.props.title}</div>;
 *   }
 * }
 *
 * export default withStream(MyComponent);
 * ```
 */
export function withStream<P extends WithStreamProps>(
  WrappedComponent: ComponentType<P>
): FC<Omit<P, keyof WithStreamProps>> {
  const displayName = (WrappedComponent.displayName != null && WrappedComponent.displayName !== '') ? WrappedComponent.displayName : (WrappedComponent.name ?? 'Component');

  const ComponentWithStream: FC<Omit<P, keyof WithStreamProps>> = (props) => {
    const stream = useStreamContext();
    return <WrappedComponent {...(props as P)} stream={stream} />;
  };

  ComponentWithStream.displayName = `withStream(${displayName})`;

  return ComponentWithStream;
}

// ============================================================================
// Exports
// ============================================================================

export {
  StreamContext,
  StreamErrorBoundary,
  isServerEnvironment,
  isStreamingSupported,
};
