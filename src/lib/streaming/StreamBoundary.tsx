/* @refresh reset */
/**
 * @file Stream Boundary Component
 * @description React component that defines streaming boundaries for progressive HTML delivery.
 *
 * StreamBoundary is the primary building block for streaming architecture,
 * marking regions of the component tree for independent streaming with
 * configurable priority, placeholders, and lifecycle callbacks.
 *
 * @module streaming/StreamBoundary
 * @version 1.0.0
 * @author Harbor Framework Team
 *
 * @example
 * ```tsx
 * // Critical above-the-fold content
 * <StreamBoundary
 *   id="hero"
 *   priority="critical"
 *   placeholder={<HeroSkeleton />}
 * >
 *   <HeroSection />
 * </StreamBoundary>
 *
 * // Deferred below-the-fold content
 * <StreamBoundary
 *   id="comments"
 *   priority="low"
 *   deferMs={100}
 *   placeholder={<CommentsSkeleton />}
 * >
 *   <CommentsSection />
 * </StreamBoundary>
 * ```
 */

import type React from 'react';
import type { ReactNode } from 'react';
import {
  Suspense,
  useEffect,
  useId,
  useRef,
  useState,
  useCallback,
  useMemo,
  memo,
} from 'react';

import {
  useStreamContext,
  useOptionalStreamContext,
} from './StreamProvider';

import {
  type StreamBoundaryProps,
  type StreamConfig,
  type StreamError,
  StreamState,
  StreamPriority,
  StreamEventType,
} from './types';

// ============================================================================
// Placeholder Components
// ============================================================================

/**
 * Default placeholder component for streaming boundaries.
 *
 * @description
 * A minimal placeholder with CSS animation that matches
 * the skeleton pattern used throughout the application.
 */
function DefaultPlaceholder(): React.ReactElement {
  return (
    <div
      className="stream-boundary-placeholder"
      role="status"
      aria-label="Loading content"
      style={{
        minHeight: '100px',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'stream-placeholder-shimmer 1.5s ease-in-out infinite',
        borderRadius: '4px',
      }}
    >
      <style>
        {`
          @keyframes stream-placeholder-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}
      </style>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Fallback component for non-streaming environments.
 *
 * @description
 * Renders when streaming is not supported, providing
 * a graceful degradation path.
 */
interface NonStreamingFallbackProps {
  children: ReactNode;
  fallback?: ReactNode;
}

function NonStreamingFallback({
  children,
  fallback,
}: NonStreamingFallbackProps): React.ReactElement {
  if (fallback != null) {
    return <>{fallback}</>;
  }

  return (
    <Suspense fallback={<DefaultPlaceholder />}>
      {children}
    </Suspense>
  );
}

// ============================================================================
// Stream Boundary Wrapper
// ============================================================================

/**
 * Internal wrapper that handles the actual streaming logic.
 */
interface StreamBoundaryWrapperProps extends StreamBoundaryProps {
  generatedId: string;
}

function StreamBoundaryWrapper({
  generatedId,
  id,
  children,
  priority = StreamPriority.Normal,
  deferMs,
  timeoutMs,
  placeholder,
  fallback,
  ssr = true,
  onStreamStart,
  onStreamComplete,
  onStreamError,
  className,
  testId,
}: StreamBoundaryWrapperProps): React.ReactElement {
  const boundaryId = id ?? generatedId;
  const stream = useStreamContext();
  const [state, setState] = useState<StreamState>(StreamState.Idle);
  const [error, setError] = useState<StreamError | null>(null);
  const isRegistered = useRef(false);
  const mountedRef = useRef(true);

  // Create stream configuration
  const config = useMemo<StreamConfig>(
    () => ({
      priority: priority as StreamPriority,
      deferMs,
      timeoutMs,
      placeholder,
      fallback,
      ssr,
      onStreamStart: () => {
        if (mountedRef.current) {
          setState(StreamState.Streaming);
          onStreamStart?.();
        }
      },
      onStreamComplete: () => {
        if (mountedRef.current) {
          setState(StreamState.Completed);
          onStreamComplete?.();
        }
      },
      onStreamError: (err: StreamError) => {
        if (mountedRef.current) {
          setState(StreamState.Error);
          setError(err);
          onStreamError?.(err);
        }
      },
      onStreamAbort: () => {
        if (mountedRef.current) {
          setState(StreamState.Aborted);
        }
      },
    }),
    [
      priority,
      deferMs,
      timeoutMs,
      placeholder,
      fallback,
      ssr,
      onStreamStart,
      onStreamComplete,
      onStreamError,
    ]
  );

  // Register boundary on mount
  useEffect(() => {
    mountedRef.current = true;

    if (!isRegistered.current) {
      try {
        stream.registerBoundary(boundaryId, config);
        isRegistered.current = true;

        // Auto-start if not SSR
        if (!stream.isSSR) {
          stream.startStream(boundaryId);
        }
      } catch (err) {
        console.error(`[StreamBoundary] Failed to register boundary "${boundaryId}":`, err);
      }
    }

    // Subscribe to state changes
    const unsubscribe = stream.subscribe((event) => {
      if (event.boundaryId !== boundaryId || !mountedRef.current) return;

      if (event.type === StreamEventType.StateChange) {
        const payload = event.payload as { from: StreamState; to: StreamState };
        setState(payload.to);
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
      stream.unregisterBoundary(boundaryId);
      isRegistered.current = false;
    };
  }, [boundaryId, config, stream]);

  // Handle retry after error
  const handleRetry = useCallback(() => {
    setError(null);
    setState(StreamState.Idle);
    stream.startStream(boundaryId);
  }, [boundaryId, stream]);

  // ==========================================================================
  // Render Logic
  // ==========================================================================

  // Error state
  if (state === StreamState.Error && error) {
    return (
      <div
        className={`stream-boundary stream-boundary--error ${className ?? ''}`}
        data-testid={testId}
        data-stream-id={boundaryId}
        data-stream-state="error"
        role="alert"
      >
        {fallback ?? (
          <div className="stream-boundary-error">
            <p>Failed to load content: {error.message}</p>
            {error.retryable && (
              <button onClick={handleRetry}>Retry</button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Streaming or pending - show placeholder
  if (
    state === StreamState.Idle ||
    state === StreamState.Pending ||
    state === StreamState.Streaming ||
    state === StreamState.Paused
  ) {
    return (
      <div
        className={`stream-boundary stream-boundary--${state} ${className ?? ''}`}
        data-testid={testId}
        data-stream-id={boundaryId}
        data-stream-state={state}
        data-stream-priority={priority}
      >
        <Suspense fallback={placeholder ?? <DefaultPlaceholder />}>
          {children}
        </Suspense>
      </div>
    );
  }

  // Completed - render content
  return (
    <div
      className={`stream-boundary stream-boundary--completed ${className ?? ''}`}
      data-testid={testId}
      data-stream-id={boundaryId}
      data-stream-state="completed"
      data-stream-priority={priority}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Main Stream Boundary Component
// ============================================================================

/**
 * StreamBoundary Component
 *
 * @description
 * Defines a streaming boundary within the React component tree.
 * Content within a StreamBoundary can be streamed independently
 * from the rest of the page, enabling progressive HTML delivery.
 *
 * Key features:
 * - Priority-based streaming (critical, high, normal, low)
 * - Configurable defer timing for non-critical content
 * - Placeholder rendering during stream
 * - Fallback for non-streaming environments
 * - Integration with React Suspense
 * - Automatic cleanup on unmount
 *
 * Performance considerations:
 * - Use `priority="critical"` for above-the-fold content
 * - Use `deferMs` to stagger non-critical content
 * - Provide appropriately-sized placeholders to prevent CLS
 * - Keep streaming boundaries reasonably sized
 *
 * @example
 * ```tsx
 * // Navigation - stream immediately
 * <StreamBoundary id="nav" priority="critical">
 *   <Navigation />
 * </StreamBoundary>
 *
 * // Hero section - high priority
 * <StreamBoundary
 *   id="hero"
 *   priority="high"
 *   placeholder={<HeroSkeleton />}
 *   onStreamComplete={() => analytics.track('hero_loaded')}
 * >
 *   <HeroSection />
 * </StreamBoundary>
 *
 * // Sidebar - normal priority, slightly deferred
 * <StreamBoundary
 *   id="sidebar"
 *   priority="normal"
 *   deferMs={50}
 *   placeholder={<SidebarSkeleton />}
 * >
 *   <Sidebar />
 * </StreamBoundary>
 *
 * // Footer - low priority, significantly deferred
 * <StreamBoundary
 *   id="footer"
 *   priority="low"
 *   deferMs={200}
 *   placeholder={<FooterSkeleton />}
 * >
 *   <Footer />
 * </StreamBoundary>
 * ```
 */
function StreamBoundaryComponent({
  id,
  children,
  priority = StreamPriority.Normal,
  deferMs,
  timeoutMs,
  placeholder,
  fallback,
  ssr = true,
  onStreamStart,
  onStreamComplete,
  onStreamError,
  className,
  testId,
}: StreamBoundaryProps): React.ReactElement {
  // Generate a stable ID if not provided
  const generatedId = useId();
  const boundaryId = id ?? `stream-${generatedId}`;

  // Check for streaming context
  const streamContext = useOptionalStreamContext();

  // If no streaming context or not supported, use fallback mode
  if (streamContext?.isStreamingSupported !== true) {
    return (
      <div
        className={`stream-boundary stream-boundary--no-streaming ${className ?? ''}`}
        data-testid={testId}
        data-stream-id={boundaryId}
        data-stream-state="no-streaming"
      >
        <NonStreamingFallback fallback={fallback}>
          {children}
        </NonStreamingFallback>
      </div>
    );
  }

  return (
    <StreamBoundaryWrapper
      generatedId={generatedId}
      id={id}
      children={children}
      priority={priority}
      deferMs={deferMs}
      timeoutMs={timeoutMs}
      placeholder={placeholder}
      fallback={fallback}
      ssr={ssr}
      onStreamStart={onStreamStart}
      onStreamComplete={onStreamComplete}
      onStreamError={onStreamError}
      className={className}
      testId={testId}
    />
  );
}

/**
 * Memoized StreamBoundary to prevent unnecessary re-renders.
 *
 * @description
 * The component is memoized with a custom comparison function
 * that checks for meaningful prop changes.
 */
export const StreamBoundary = memo(StreamBoundaryComponent, (prevProps, nextProps) => {
  // Always re-render if children change
  if (prevProps.children !== nextProps.children) return false;

  // Check other significant props
  return (
    prevProps.id === nextProps.id &&
    prevProps.priority === nextProps.priority &&
    prevProps.deferMs === nextProps.deferMs &&
    prevProps.timeoutMs === nextProps.timeoutMs &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.fallback === nextProps.fallback &&
    prevProps.ssr === nextProps.ssr &&
    prevProps.className === nextProps.className
  );
});

StreamBoundary.displayName = 'StreamBoundary';

// ============================================================================
// Specialized Stream Boundaries
// ============================================================================

/**
 * CriticalStreamBoundary - Pre-configured for critical content.
 *
 * @description
 * A specialized StreamBoundary with critical priority,
 * no defer, and SSR enabled by default.
 *
 * @example
 * ```tsx
 * <CriticalStreamBoundary id="nav">
 *   <Navigation />
 * </CriticalStreamBoundary>
 * ```
 */
export function CriticalStreamBoundary({
  priority = StreamPriority.Critical,
  deferMs = 0,
  ssr = true,
  ...props
}: StreamBoundaryProps): React.ReactElement {
  return (
    <StreamBoundary
      {...props}
      priority={priority}
      deferMs={deferMs}
      ssr={ssr}
    />
  );
}

CriticalStreamBoundary.displayName = 'CriticalStreamBoundary';

/**
 * DeferredStreamBoundary - Pre-configured for deferred content.
 *
 * @description
 * A specialized StreamBoundary with low priority and
 * automatic deferral, ideal for below-the-fold content.
 *
 * @example
 * ```tsx
 * <DeferredStreamBoundary id="footer" deferMs={500}>
 *   <Footer />
 * </DeferredStreamBoundary>
 * ```
 */
export function DeferredStreamBoundary({
  priority = StreamPriority.Low,
  deferMs = 100,
  ...props
}: StreamBoundaryProps): React.ReactElement {
  return (
    <StreamBoundary
      {...props}
      priority={priority}
      deferMs={deferMs}
    />
  );
}

DeferredStreamBoundary.displayName = 'DeferredStreamBoundary';

/**
 * ConditionalStreamBoundary - Only streams when condition is met.
 *
 * @description
 * Renders children without streaming when condition is false,
 * enables streaming when condition becomes true.
 *
 * @example
 * ```tsx
 * <ConditionalStreamBoundary
 *   id="premium-content"
 *   condition={user.isPremium}
 *   fallback={<UpgradePrompt />}
 * >
 *   <PremiumContent />
 * </ConditionalStreamBoundary>
 * ```
 */
export interface ConditionalStreamBoundaryProps extends StreamBoundaryProps {
  /** Condition that must be true to enable streaming */
  condition: boolean;
}

export function ConditionalStreamBoundary({
  condition,
  children,
  fallback,
  ...props
}: ConditionalStreamBoundaryProps): React.ReactElement {
  if (!condition) {
    return <>{fallback ?? children}</>;
  }

  return (
    <StreamBoundary {...props} fallback={fallback}>
      {children}
    </StreamBoundary>
  );
}

ConditionalStreamBoundary.displayName = 'ConditionalStreamBoundary';

// ============================================================================
// Server-Side Helpers
// ============================================================================

/**
 * Creates script content for client-side boundary activation.
 *
 * @description
 * Generates inline JavaScript that will be executed on the client
 * to activate streaming for a boundary after SSR.
 *
 * @param boundaryId - The boundary ID to activate
 * @param nonce - Optional CSP nonce
 * @returns Script element content
 *
 * @example
 * ```tsx
 * // In SSR context
 * const activationScript = createBoundaryActivationScript('hero', nonce);
 * // Inject into HTML
 * ```
 */
export function createBoundaryActivationScript(
  boundaryId: string,
  nonce?: string
): string {
  const script = `
    (function() {
      if (window.__STREAM_BOUNDARIES__) {
        window.__STREAM_BOUNDARIES__.activate('${boundaryId}');
      }
    })();
  `.trim();

  return (nonce != null && nonce !== '')
    ? `<script nonce="${nonce}">${script}</script>`
    : `<script>${script}</script>`;
}

/**
 * Creates HTML comment marker for stream boundary.
 *
 * @description
 * Used during SSR to mark stream boundary locations in HTML.
 * The client-side hydration process uses these markers to
 * identify and activate boundaries.
 *
 * @param boundaryId - The boundary ID
 * @param type - Marker type ('start' or 'end')
 * @returns HTML comment string
 */
export function createBoundaryMarker(
  boundaryId: string,
  type: 'start' | 'end'
): string {
  return `<!--stream:${type}:${boundaryId}-->`;
}

// ============================================================================
// Exports
// ============================================================================

export {
  DefaultPlaceholder,
  NonStreamingFallback,
};
