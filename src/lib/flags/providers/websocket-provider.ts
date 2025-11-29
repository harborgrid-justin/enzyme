/**
 * @fileoverview WebSocket provider for real-time flag updates.
 *
 * Provides real-time flag synchronization with:
 * - Automatic reconnection
 * - Heartbeat/ping-pong
 * - Message queuing during disconnection
 * - Authentication support
 *
 * @module flags/providers/websocket-provider
 *
 * @example
 * ```typescript
 * const provider = new WebSocketProvider({
 *   url: 'wss://api.example.com/flags/ws',
 *   authToken: 'your-token',
 *   reconnect: {
 *     enabled: true,
 *     maxAttempts: 10,
 *   },
 * });
 *
 * await provider.initialize();
 * provider.connect();
 * ```
 */

import type {
  FeatureFlag,
  Segment,
  SegmentId,
} from '../advanced/types';
import type {
  FlagProvider,
  WebSocketProviderConfig,
  FlagChangeListener,
  FlagChangeEvent,
  ProviderStats,
  ReconnectConfig,
} from './types';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PING_INTERVAL = 30000; // 30 seconds
const DEFAULT_RECONNECT_CONFIG: Required<ReconnectConfig> = {
  enabled: true,
  maxAttempts: 10,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

// ============================================================================
// Types
// ============================================================================

/**
 * WebSocket message types.
 */
type WSMessageType =
  | 'flags'
  | 'flag_update'
  | 'flag_delete'
  | 'segments'
  | 'segment_update'
  | 'ping'
  | 'pong'
  | 'subscribe'
  | 'unsubscribe'
  | 'error';

/**
 * WebSocket message structure.
 */
interface WSMessage {
  type: WSMessageType;
  payload?: unknown;
  timestamp?: string;
}

/**
 * Connection state.
 */
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// ============================================================================
// WebSocket Provider
// ============================================================================

/**
 * WebSocket provider for real-time flag updates.
 */
export class WebSocketProvider implements FlagProvider {
  readonly name: string;
  readonly priority: number;

  private socket: WebSocket | null = null;
  private flags = new Map<string, FeatureFlag>();
  private segments = new Map<SegmentId, Segment>();
  private listeners = new Set<FlagChangeListener>();
  private ready = false;
  private config: Required<Omit<WebSocketProviderConfig, 'initialFlags' | 'authToken' | 'channel'>> & {
    initialFlags?: WebSocketProviderConfig['initialFlags'];
    authToken?: WebSocketProviderConfig['authToken'];
    channel?: WebSocketProviderConfig['channel'];
  };
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private messageQueue: WSMessage[] = [];
  private lastMessageTime: Date | null = null;

  constructor(config: WebSocketProviderConfig) {
    this.name = config.name ?? 'websocket';
    this.priority = config.priority ?? 10; // High priority for real-time

    this.config = {
      name: this.name,
      priority: this.priority,
      debug: config.debug ?? false,
      url: config.url,
      initialFlags: config.initialFlags,
      reconnect: { ...DEFAULT_RECONNECT_CONFIG, ...config.reconnect },
      pingInterval: config.pingInterval ?? DEFAULT_PING_INTERVAL,
      authToken: config.authToken,
      channel: config.channel,
    };

    // Load initial flags
    if (config.initialFlags) {
      for (const flag of config.initialFlags) {
        this.flags.set(flag.key, flag);
      }
    }
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize the provider.
   */
  async initialize(): Promise<void> {
    this.log('Initializing WebSocket provider');
    this.ready = true;
    this.log('WebSocket provider initialized');
    return Promise.resolve();
  }

  // ==========================================================================
  // Connection Management
  // ==========================================================================

  /**
   * Connect to the WebSocket server.
   */
  connect(): void {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return;
    }

    this.connectionState = 'connecting';
    this.log('Connecting to WebSocket server');

    try {
      const url = new URL(this.config.url);

      // Add auth token as query param if provided
      if (this.config.authToken !== null && this.config.authToken !== undefined && this.config.authToken !== '') {
        url.searchParams.set('token', this.config.authToken);
      }

      this.socket = new WebSocket(url.toString());
      this.setupSocketHandlers();
    } catch (error) {
      this.log('Failed to create WebSocket:', error);
      this.handleDisconnect();
    }
  }

  /**
   * Disconnect from the WebSocket server.
   */
  disconnect(): void {
    this.stopPing();
    this.stopReconnect();

    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }

    this.connectionState = 'disconnected';
    this.log('Disconnected from WebSocket server');
  }

  private setupSocketHandlers(): void {
    if (!this.socket) {
      return;
    }

    this.socket.onopen = (): void => {
      this.log('WebSocket connected');
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;

      // Start ping
      this.startPing();

      // Subscribe to channel if specified
      if (this.config.channel !== null && this.config.channel !== undefined && this.config.channel !== '') {
        this.send({
          type: 'subscribe',
          payload: { channel: this.config.channel },
        });
      }

      // Request initial flags
      this.send({ type: 'flags' });

      // Flush message queue
      this.flushMessageQueue();
    };

    this.socket.onmessage = (event) => {
      this.handleMessage(event);
    };

    this.socket.onclose = (event) => {
      this.log(`WebSocket closed: ${event.code} ${event.reason}`);
      this.handleDisconnect();
    };

    this.socket.onerror = (error) => {
      this.log('WebSocket error:', error);
    };
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data as string) as WSMessage;
      this.lastMessageTime = new Date();

      this.log('Received message:', message.type);

      switch (message.type) {
        case 'flags':
          this.handleFlagsMessage(message.payload as FeatureFlag[]);
          break;
        case 'flag_update':
          this.handleFlagUpdate(message.payload as FeatureFlag);
          break;
        case 'flag_delete':
          this.handleFlagDelete(message.payload as { key: string });
          break;
        case 'segments':
          this.handleSegmentsMessage(message.payload as Segment[]);
          break;
        case 'segment_update':
          this.handleSegmentUpdate(message.payload as Segment);
          break;
        case 'pong':
          // Heartbeat response received
          break;
        case 'error':
          this.log('Server error:', message.payload);
          break;
      }
    } catch (error) {
      this.log('Failed to parse message:', error);
    }
  }

  private handleFlagsMessage(flags: FeatureFlag[]): void {
    this.flags.clear();
    for (const flag of flags) {
      this.flags.set(flag.key, this.deserializeFlag(flag));
    }

    this.emitChange({
      type: 'refreshed',
      timestamp: new Date(),
      source: this.name,
    });

    this.log(`Received ${flags.length} flags`);
  }

  private handleFlagUpdate(flag: FeatureFlag): void {
    const existing = this.flags.get(flag.key);
    const deserializedFlag = this.deserializeFlag(flag);
    this.flags.set(flag.key, deserializedFlag);

    this.emitChange({
      type: existing ? 'updated' : 'added',
      flagKey: flag.key,
      previousFlag: existing,
      newFlag: deserializedFlag,
      timestamp: new Date(),
      source: this.name,
    });

    this.log(`Flag ${existing ? 'updated' : 'added'}: ${flag.key}`);
  }

  private handleFlagDelete(payload: { key: string }): void {
    const existing = this.flags.get(payload.key);
    if (existing) {
      this.flags.delete(payload.key);

      this.emitChange({
        type: 'deleted',
        flagKey: payload.key,
        previousFlag: existing,
        timestamp: new Date(),
        source: this.name,
      });

      this.log(`Flag deleted: ${payload.key}`);
    }
  }

  private handleSegmentsMessage(segments: Segment[]): void {
    this.segments.clear();
    for (const segment of segments) {
      this.segments.set(segment.id, this.deserializeSegment(segment));
    }
    this.log(`Received ${segments.length} segments`);
  }

  private handleSegmentUpdate(segment: Segment): void {
    this.segments.set(segment.id, this.deserializeSegment(segment));
    this.log(`Segment updated: ${segment.id}`);
  }

  private handleDisconnect(): void {
    this.stopPing();
    this.connectionState = 'disconnected';

    if (this.config.reconnect.enabled === true) {
      this.scheduleReconnect();
    }
  }

  // ==========================================================================
  // Reconnection
  // ==========================================================================

  private scheduleReconnect(): void {
    const maxAttempts = this.config.reconnect?.maxAttempts ?? 5;
    if (this.reconnectAttempts >= maxAttempts) {
      this.log('Max reconnection attempts reached');
      return;
    }

    this.connectionState = 'reconnecting';
    this.reconnectAttempts++;

    const baseDelay = this.config.reconnect?.baseDelay ?? 1000;
    const backoffMultiplier = this.config.reconnect?.backoffMultiplier ?? 2;
    const maxDelay = this.config.reconnect?.maxDelay ?? 30000;
    
    const delay = Math.min(
      baseDelay * Math.pow(backoffMultiplier, this.reconnectAttempts - 1),
      maxDelay
    );

    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  // ==========================================================================
  // Heartbeat
  // ==========================================================================

  private startPing(): void {
    if (this.pingTimer) {
      return;
    }

    this.pingTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, this.config.pingInterval);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  // ==========================================================================
  // Message Sending
  // ==========================================================================

  private send(message: WSMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      // Queue message for later
      this.messageQueue.push(message);
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  // ==========================================================================
  // Flag Operations
  // ==========================================================================

  /**
   * Get all flags.
   */
  async getFlags(): Promise<readonly FeatureFlag[]> {
    return Promise.resolve(Array.from(this.flags.values()));
  }

  /**
   * Get a flag by key.
   */
  async getFlag(key: string): Promise<FeatureFlag | null> {
    return Promise.resolve(this.flags.get(key) ?? null);
  }

  // ==========================================================================
  // Segment Operations
  // ==========================================================================

  /**
   * Get all segments.
   */
  async getSegments(): Promise<readonly Segment[]> {
    return Promise.resolve(Array.from(this.segments.values()));
  }

  /**
   * Get a segment by ID.
   */
  async getSegment(id: SegmentId): Promise<Segment | null> {
    return Promise.resolve(this.segments.get(id) ?? null);
  }

  // ==========================================================================
  // Deserialization
  // ==========================================================================

  private deserializeFlag(flag: FeatureFlag): FeatureFlag {
    return {
      ...flag,
      lifecycle: {
        ...flag.lifecycle,
        createdAt: new Date(flag.lifecycle.createdAt),
        updatedAt: new Date(flag.lifecycle.updatedAt),
        activatedAt: flag.lifecycle.activatedAt
          ? new Date(flag.lifecycle.activatedAt)
          : undefined,
        deprecationDate: flag.lifecycle.deprecationDate
          ? new Date(flag.lifecycle.deprecationDate)
          : undefined,
        removalDate: flag.lifecycle.removalDate
          ? new Date(flag.lifecycle.removalDate)
          : undefined,
        reviewDate: flag.lifecycle.reviewDate
          ? new Date(flag.lifecycle.reviewDate)
          : undefined,
      },
    };
  }

  private deserializeSegment(segment: Segment): Segment {
    return {
      ...segment,
      updatedAt: new Date(segment.updatedAt),
    };
  }

  // ==========================================================================
  // Status and Health
  // ==========================================================================

  /**
   * Check if the provider is ready.
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Check if the provider is healthy.
   */
  async isHealthy(): Promise<boolean> {
    return Promise.resolve(this.connectionState === 'connected');
  }

  /**
   * Get connection state.
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get connection status.
   */
  getConnectionStatus(): {
    state: ConnectionState;
    reconnectAttempts: number;
    lastMessageTime: Date | null;
    queuedMessages: number;
  } {
    return {
      state: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      lastMessageTime: this.lastMessageTime,
      queuedMessages: this.messageQueue.length,
    };
  }

  /**
   * Get provider statistics.
   */
  getStats(): ProviderStats {
    return {
      flagCount: this.flags.size,
      segmentCount: this.segments.size,
      requestCount: 0,
      errorCount: 0,
      lastRefresh: this.lastMessageTime ?? undefined,
    };
  }

  // ==========================================================================
  // Subscription
  // ==========================================================================

  /**
   * Subscribe to flag changes.
   */
  subscribe(listener: FlagChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitChange(event: FlagChangeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        this.log('Error in change listener:', error);
      }
    }
  }

  // ==========================================================================
  // Shutdown
  // ==========================================================================

  /**
   * Shutdown the provider.
   */
  async shutdown(): Promise<void> {
    this.disconnect();
    this.ready = false;
    this.listeners.clear();
    this.log('WebSocket provider shutdown');
    return Promise.resolve();
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log(`[WebSocketProvider] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a WebSocket provider instance.
 */
export function createWebSocketProvider(
  config: WebSocketProviderConfig
): WebSocketProvider {
  return new WebSocketProvider(config);
}
