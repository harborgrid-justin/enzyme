/**
 * @file SSE Client
 * @description Low-level Server-Sent Events client
 */

import { env } from '../../config/env';

/**
 * SSE connection state
 */
export type SSEState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

/**
 * SSE message handler
 */
export type SSEMessageHandler = (data: unknown, event?: string) => void;

/**
 * SSE error handler
 */
export type SSEErrorHandler = (error: Event) => void;

/**
 * SSE state change handler
 */
export type SSEStateChangeHandler = (state: SSEState) => void;

/**
 * SSE client configuration
 */
export interface SSEClientConfig {
  url: string;
  withCredentials?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  eventTypes?: string[];
}

/**
 * Default configuration
 */
const defaultConfig: Partial<SSEClientConfig> = {
  withCredentials: true,
  reconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  eventTypes: ['message'],
};

/**
 * SSE client class
 */
export class SSEClient {
  private eventSource: EventSource | null = null;
  private config: SSEClientConfig;
  private state: SSEState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  private messageHandlers: Map<string, Set<SSEMessageHandler>> = new Map();
  private errorHandlers: Set<SSEErrorHandler> = new Set();
  private stateChangeHandlers: Set<SSEStateChangeHandler> = new Set();

  /**
   * Store bound event handler references for proper cleanup
   * This fixes a memory leak where createEventHandler() created new functions
   * that couldn't be properly removed with removeEventListener
   */
  private boundEventHandlers: Map<string, (event: MessageEvent) => void> = new Map();
  
  constructor(config: SSEClientConfig) {
    this.config = { ...defaultConfig, ...config };
  }
  
  /**
   * Get current connection state
   */
  getState(): SSEState {
    return this.state;
  }
  
  /**
   * Check if connected
   */
  isConnected(): boolean {
    return (
      this.state === 'connected' &&
      this.eventSource?.readyState === EventSource.OPEN
    );
  }
  
  /**
   * Connect to SSE endpoint
   */
  connect(): void {
    if (this.eventSource?.readyState === EventSource.OPEN) {
      return;
    }
    
    this.setState('connecting');
    
    try {
      this.eventSource = new EventSource(this.config.url, {
        withCredentials: this.config.withCredentials ?? false,
      });
      this.setupEventListeners();
    } catch (error) {
      console.error('[SSE] Connection error:', error);
      this.handleDisconnect();
    }
  }
  
  /**
   * Disconnect from SSE endpoint
   */
  disconnect(): void {
    this.clearReconnectTimeout();
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.setState('disconnected');
    this.reconnectAttempts = 0;
  }
  
  /**
   * Subscribe to messages of a specific event type
   *
   * Note: Uses stored bound handler references for proper cleanup.
   * This prevents memory leaks from orphaned event listeners.
   */
  on(eventType: string, handler: SSEMessageHandler): () => void {
    if (!this.messageHandlers.has(eventType)) {
      this.messageHandlers.set(eventType, new Set());

      // Add event listener if connected
      if (this.eventSource) {
        this.addEventTypeListener(eventType);
      }
    }

    const handlers = this.messageHandlers.get(eventType);
    if (handlers) {
      handlers.add(handler);
    }

    return () => {
      const handlers = this.messageHandlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(eventType);
          // Use stored bound handler reference for proper cleanup
          const boundHandler = this.boundEventHandlers.get(eventType);
          if (boundHandler) {
            this.eventSource?.removeEventListener(eventType, boundHandler as EventListener);
            this.boundEventHandlers.delete(eventType);
          }
        }
      }
    };
  }
  
  /**
   * Subscribe to all 'message' events (default)
   */
  onMessage(handler: SSEMessageHandler): () => void {
    return this.on('message', handler);
  }
  
  /**
   * Subscribe to errors
   */
  onError(handler: SSEErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }
  
  /**
   * Subscribe to state changes
   */
  onStateChange(handler: SSEStateChangeHandler): () => void {
    this.stateChangeHandlers.add(handler);
    return () => this.stateChangeHandlers.delete(handler);
  }
  
  /**
   * Setup EventSource event listeners
   */
  private setupEventListeners(): void {
    if (!this.eventSource) return;
    
    this.eventSource.onopen = () => {
      this.setState('connected');
      this.reconnectAttempts = 0;
    };
    
    this.eventSource.onerror = (event) => {
      console.error('[SSE] Error:', event);
      this.errorHandlers.forEach((handler) => handler(event));
      
      if (this.eventSource?.readyState === EventSource.CLOSED) {
        this.handleDisconnect();
      }
    };
    
    // Setup listeners for configured event types
    const eventTypes = [
      ...new Set([
        ...(this.config.eventTypes || ['message']),
        ...this.messageHandlers.keys(),
      ]),
    ];
    
    eventTypes.forEach((eventType) => {
      this.addEventTypeListener(eventType);
    });
  }
  
  /**
   * Add listener for specific event type
   *
   * Note: Stores bound handler reference for proper cleanup later.
   */
  private addEventTypeListener(eventType: string): void {
    if (!this.eventSource) return;

    // Check if we already have a bound handler for this event type
    if (!this.boundEventHandlers.has(eventType)) {
      const handler = this.createEventHandler(eventType);
      this.boundEventHandlers.set(eventType, handler);
    }

    const boundHandler = this.boundEventHandlers.get(eventType);
    if (boundHandler) {
      this.eventSource.addEventListener(eventType, boundHandler as EventListener);
    }
  }
  
  /**
   * Create event handler for event type
   */
  private createEventHandler(eventType: string): (event: MessageEvent) => void {
    return (event: MessageEvent) => {
      let data: unknown = event.data;
      
      // Try to parse JSON
      try {
        data = JSON.parse(event.data as string);
      } catch {
        // Keep as string if not valid JSON
      }
      
      // Notify handlers for this event type
      const handlers = this.messageHandlers.get(eventType);
      handlers?.forEach((handler) => handler(data, eventType));
    };
  }
  
  /**
   * Handle disconnection
   */
  private handleDisconnect(): void {
    this.eventSource = null;
    
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
      
      // eslint-disable-next-line no-console
      console.info(`[SSE] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);    this.reconnectTimeout = setTimeout(() => {
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
   * Clear reconnect timeout
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
  
  /**
   * Update and broadcast state
   */
  private setState(state: SSEState): void {
    this.state = state;
    this.stateChangeHandlers.forEach((handler) => handler(state));
  }
}

/**
 * Create SSE client with default configuration
 */
export function createSSEClient(
  path: string = '/events',
  config?: Partial<SSEClientConfig>
): SSEClient {
  const baseUrl = env.apiBaseUrl ?? '';
  const url = `${baseUrl}${path}`;
  
  return new SSEClient({ url, ...config });
}
