/**
 * @file State Bridge
 * @description WebSocket bridge for connecting to running Enzyme apps
 */

// ============================================================================
// Types
// ============================================================================

export enum MessageType {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  HEARTBEAT = 'heartbeat',

  // State
  STATE_SNAPSHOT = 'state:snapshot',
  STATE_UPDATE = 'state:update',
  STATE_SUBSCRIBE = 'state:subscribe',
  STATE_UNSUBSCRIBE = 'state:unsubscribe',

  // Actions
  ACTION_DISPATCH = 'action:dispatch',
  ACTION_RECORDED = 'action:recorded',

  // Debug
  DEBUG_PAUSE = 'debug:pause',
  DEBUG_RESUME = 'debug:resume',
  DEBUG_STEP = 'debug:step',

  // Error
  ERROR = 'error',
}

export interface BridgeMessage<T = unknown> {
  type: MessageType;
  id?: string;
  sessionId: string;
  payload: T;
  timestamp: number;
}

export interface ConnectionConfig {
  /** WebSocket URL */
  url: string;
  /** Reconnect attempts */
  reconnectAttempts?: number;
  /** Reconnect delay (ms) */
  reconnectDelay?: number;
  /** Heartbeat interval (ms) */
  heartbeatInterval?: number;
  /** Connection timeout (ms) */
  connectionTimeout?: number;
}

export interface BridgeSession {
  id: string;
  appName: string;
  appVersion: string;
  connectedAt: number;
  stores: string[];
  metadata?: Record<string, unknown>;
}

export type MessageHandler<T = unknown> = (message: BridgeMessage<T>) => void | Promise<void>;

// ============================================================================
// State Bridge
// ============================================================================

export class StateBridge {
  private ws: WebSocket | null = null;
  private config: Required<ConnectionConfig>;
  private sessionId: string | null = null;
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectAttempt = 0;
  private messageHandlers = new Map<MessageType, Set<MessageHandler>>();
  private pendingMessages: BridgeMessage[] = [];
  private sessions = new Map<string, BridgeSession>();

  constructor(config: ConnectionConfig) {
    this.config = {
      url: config.url,
      reconnectAttempts: config.reconnectAttempts ?? 5,
      reconnectDelay: config.reconnectDelay ?? 2000,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      connectionTimeout: config.connectionTimeout ?? 10000,
    };
  }

  /**
   * Connect to the dev server
   */
  async connect(): Promise<void> {
    if (this.isConnected || this.ws !== null) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
        this.disconnect();
      }, this.config.connectionTimeout);

      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.reconnectAttempt = 0;
          this.startHeartbeat();
          this.flushPendingMessages();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          this.handleError(error);
          reject(error);
        };

        this.ws.onclose = () => {
          clearTimeout(timeout);
          this.handleDisconnect();
        };
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the dev server
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.stopReconnect();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.sessionId = null;
  }

  /**
   * Send a message to the dev server
   */
  send<T>(type: MessageType, payload: T, id?: string): void {
    if (!this.sessionId) {
      throw new Error('No active session');
    }

    const message: BridgeMessage<T> = {
      type,
      id,
      sessionId: this.sessionId,
      payload,
      timestamp: Date.now(),
    };

    if (!this.isConnected || !this.ws) {
      this.pendingMessages.push(message);
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send message:', error);
      this.pendingMessages.push(message);
    }
  }

  /**
   * Subscribe to state updates
   */
  subscribeToState(storeName?: string): void {
    this.send(MessageType.STATE_SUBSCRIBE, { storeName });
  }

  /**
   * Unsubscribe from state updates
   */
  unsubscribeFromState(storeName?: string): void {
    this.send(MessageType.STATE_UNSUBSCRIBE, { storeName });
  }

  /**
   * Request state snapshot
   */
  requestStateSnapshot(storeName?: string): void {
    this.send(MessageType.STATE_SNAPSHOT, { storeName });
  }

  /**
   * Dispatch action to the app
   */
  dispatchAction(storeName: string, actionType: string, payload?: unknown): void {
    this.send(MessageType.ACTION_DISPATCH, {
      storeName,
      actionType,
      payload,
    });
  }

  /**
   * Register message handler
   */
  on<T = unknown>(type: MessageType, handler: MessageHandler<T>): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    const handlers = this.messageHandlers.get(type)!;
    handlers.add(handler as MessageHandler);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler as MessageHandler);
    };
  }

  /**
   * Remove message handler
   */
  off<T = unknown>(type: MessageType, handler: MessageHandler<T>): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.delete(handler as MessageHandler);
    }
  }

  /**
   * Get connection status
   */
  getStatus(): {
    connected: boolean;
    sessionId: string | null;
    reconnectAttempt: number;
    pendingMessages: number;
  } {
    return {
      connected: this.isConnected,
      sessionId: this.sessionId,
      reconnectAttempt: this.reconnectAttempt,
      pendingMessages: this.pendingMessages.length,
    };
  }

  /**
   * Get active session
   */
  getSession(sessionId?: string): BridgeSession | undefined {
    const id = sessionId ?? this.sessionId;
    return id ? this.sessions.get(id) : undefined;
  }

  /**
   * Get all sessions
   */
  getSessions(): BridgeSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as BridgeMessage;

      // Handle connect message
      if (message.type === MessageType.CONNECT) {
        this.sessionId = message.sessionId;
        if (message.payload) {
          this.sessions.set(message.sessionId, message.payload as BridgeSession);
        }
      }

      // Notify handlers
      const handlers = this.messageHandlers.get(message.type);
      if (handlers) {
        for (const handler of handlers) {
          handler(message).catch((error) => {
            console.error('Message handler error:', error);
          });
        }
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(error: Event): void {
    console.error('WebSocket error:', error);
    this.emit(MessageType.ERROR, { error: String(error) });
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(): void {
    this.isConnected = false;
    this.stopHeartbeat();

    // Attempt reconnect
    if (this.reconnectAttempt < this.config.reconnectAttempts) {
      this.reconnectAttempt++;
      this.reconnectTimer = setTimeout(() => {
        this.connect().catch((error) => {
          console.error('Reconnect failed:', error);
        });
      }, this.config.reconnectDelay * this.reconnectAttempt);
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.sessionId) {
        this.send(MessageType.HEARTBEAT, {});
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Stop reconnect attempts
   */
  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempt = 0;
  }

  /**
   * Flush pending messages
   */
  private flushPendingMessages(): void {
    if (!this.isConnected || !this.ws) {
      return;
    }

    const messages = [...this.pendingMessages];
    this.pendingMessages = [];

    for (const message of messages) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send pending message:', error);
      }
    }
  }

  /**
   * Emit message to handlers
   */
  private emit<T>(type: MessageType, payload: T): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const message: BridgeMessage<T> = {
        type,
        sessionId: this.sessionId ?? '',
        payload,
        timestamp: Date.now(),
      };

      for (const handler of handlers) {
        handler(message).catch((error) => {
          console.error('Message handler error:', error);
        });
      }
    }
  }
}

// ============================================================================
// Global Bridge Instance
// ============================================================================

let globalBridge: StateBridge | null = null;

/**
 * Get or create global bridge instance
 */
export function getGlobalBridge(config?: ConnectionConfig): StateBridge {
  if (!globalBridge && config) {
    globalBridge = new StateBridge(config);
  }
  if (!globalBridge) {
    throw new Error('Bridge not initialized. Provide config on first call.');
  }
  return globalBridge;
}

/**
 * Reset global bridge
 */
export function resetGlobalBridge(): void {
  if (globalBridge) {
    globalBridge.disconnect();
  }
  globalBridge = null;
}
