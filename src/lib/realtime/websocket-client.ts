/**
 * @file WebSocket Client
 * @description Low-level WebSocket connection manager with retries
 */

import { env } from '../../config/env';

/**
 * WebSocket connection state
 */
export type WebSocketState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

/**
 * WebSocket message handler
 */
export type MessageHandler = (data: unknown) => void;

/**
 * WebSocket error handler
 */
export type ErrorHandler = (error: Event) => void;

/**
 * WebSocket state change handler
 */
export type StateChangeHandler = (state: WebSocketState) => void;

/**
 * WebSocket client configuration
 */
export interface WebSocketClientConfig {
  url: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  protocols?: string[];
}

/**
 * Default configuration
 */
const defaultConfig: Partial<WebSocketClientConfig> = {
  reconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
};

/**
 * WebSocket client class
 */
export class WebSocketClient {
  private socket: WebSocket | null = null;
  private config: WebSocketClientConfig;
  private state: WebSocketState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  private messageHandlers: Set<MessageHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private stateChangeHandlers: Set<StateChangeHandler> = new Set();
  private channelHandlers: Map<string, Set<MessageHandler>> = new Map();

  constructor(config: WebSocketClientConfig) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Get current connection state
   */
  getState(): WebSocketState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected' && this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    this.setState('connecting');

    try {
      this.socket = new WebSocket(this.config.url, this.config.protocols);
      this.setupEventListeners();
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.handleDisconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.clearHeartbeat();
    this.clearReconnectTimeout();

    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }

    this.setState('disconnected');
    this.reconnectAttempts = 0;
  }

  /**
   * Send message to server
   */
  send(data: unknown): void {
    if (!this.isConnected()) {
      console.warn('[WebSocket] Cannot send message: not connected');
      return;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      if (this.socket !== null) {
        this.socket.send(message);
      }
    } catch (error) {
      console.error('[WebSocket] Send error:', error);
    }
  }

  /**
   * Send message to specific channel
   */
  sendToChannel(channel: string, data: unknown): void {
    this.send({ channel, data });
  }

  /**
   * Subscribe to all messages
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Subscribe to specific channel
   */
  subscribe(channel: string, handler: MessageHandler): () => void {
    if (!this.channelHandlers.has(channel)) {
      this.channelHandlers.set(channel, new Set());
      // Notify server of subscription
      this.send({ type: 'subscribe', channel });
    }

    const handlers = this.channelHandlers.get(channel);
    if (handlers !== undefined) {
      handlers.add(handler);
    }

    return () => {
      const handlers = this.channelHandlers.get(channel);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.channelHandlers.delete(channel);
          // Notify server of unsubscription
          this.send({ type: 'unsubscribe', channel });
        }
      }
    };
  }

  /**
   * Subscribe to errors
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(handler: StateChangeHandler): () => void {
    this.stateChangeHandlers.add(handler);
    return () => this.stateChangeHandlers.delete(handler);
  }

  /**
   * Setup WebSocket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      this.setState('connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();

      // Resubscribe to channels
      this.channelHandlers.forEach((_, channel) => {
        this.send({ type: 'subscribe', channel });
      });
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as {
          type?: string;
          channel?: string;
          data?: unknown;
        };

        // Handle heartbeat response
        if (data.type === 'pong') {
          return;
        }

        // Route to channel handlers
        if (data.channel !== undefined && this.channelHandlers.has(data.channel)) {
          const handlers = this.channelHandlers.get(data.channel);
          handlers?.forEach((handler) => {
            handler(data.data);
          });
        }

        // Notify all message handlers
        this.messageHandlers.forEach((handler) => handler(data));
      } catch {
        // Handle non-JSON messages
        this.messageHandlers.forEach((handler) => handler(event.data));
      }
    };

    this.socket.onerror = (event) => {
      console.error('[WebSocket] Error:', event);
      this.errorHandlers.forEach((handler) => handler(event));
    };

    this.socket.onclose = (event) => {
      console.info('[WebSocket] Closed:', event.code, event.reason);
      this.handleDisconnect();
    };
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(): void {
    this.clearHeartbeat();
    this.socket = null;

    if (
      this.config.reconnect === true &&
      this.reconnectAttempts < (this.config.maxReconnectAttempts ?? 10)
    ) {
      this.setState('reconnecting');
      this.scheduleReconnect();
    } else {
      this.setState('disconnected');
    }
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    this.clearReconnectTimeout();

    const delay = this.calculateBackoff();
    this.reconnectAttempts++;

    console.info(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(): number {
    const base = this.config.reconnectInterval ?? 3000;
    const delay = base * Math.pow(1.5, this.reconnectAttempts);
    const jitter = Math.random() * 1000;
    return Math.min(delay + jitter, 30000); // Max 30 seconds
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat(): void {
    this.clearHeartbeat();

    if (this.config.heartbeatInterval != null && this.config.heartbeatInterval > 0) {
      this.heartbeatInterval = setInterval(() => {
        if (this.isConnected()) {
          this.send({ type: 'ping' });
        }
      }, this.config.heartbeatInterval);
    }
  }

  /**
   * Clear heartbeat interval
   */
  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Clear reconnect timeout
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Update and broadcast state
   */
  private setState(state: WebSocketState): void {
    this.state = state;
    this.stateChangeHandlers.forEach((handler) => handler(state));
  }
}

/**
 * Create WebSocket client with default configuration
 */
export function createWebSocketClient(
  path: string = '/ws',
  config?: Partial<WebSocketClientConfig>
): WebSocketClient {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = env.wsUrl || `${protocol}//${window.location.host}`;
  const url = `${host}${path}`;

  return new WebSocketClient({ url, ...config });
}
