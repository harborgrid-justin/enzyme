/**
 * EventBus - Typed event emitter for cross-component communication
 */

import * as vscode from 'vscode';

/**
 * Event types for the Enzyme extension
 */
export type ExtensionEvent =
  | { type: 'extension:activated' }
  | { type: 'extension:deactivated' }
  | { type: 'workspace:detected'; payload: { isEnzymeProject: boolean } }
  | { type: 'workspace:changed'; payload: { rootPath: string } }
  | { type: 'config:changed'; payload: { key: string; value: unknown } }
  | { type: 'feature:discovered'; payload: { id: string; name: string } }
  | { type: 'feature:registered'; payload: { id: string } }
  | { type: 'route:discovered'; payload: { path: string } }
  | { type: 'route:conflict'; payload: { path: string; files: string[] } }
  | { type: 'state:changed'; payload: { storeName: string } }
  | { type: 'diagnostics:updated'; payload: { uri: string; count: number } }
  | { type: 'analysis:completed'; payload: { type: string; timestamp: number } }
  | { type: 'indexing:started' }
  | { type: 'indexing:completed'; payload: { duration: number } }
  | { type: 'provider:registered'; payload: { name: string } }
  | { type: 'provider:disabled'; payload: { name: string } }
  | { type: 'error:occurred'; payload: { message: string; error: Error } }
  | { type: 'cli:installed'; payload: any }
  | { type: 'onboarding:stateChanged'; payload: any }
  | { type: 'onboarding:completed' }
  | { type: 'onboarding:milestone'; payload: { milestone: string; timestamp: number } };

/**
 * EventBus - Central event system for the extension
 */
export class EventBus {
  private static instance: EventBus;
  private readonly emitter: vscode.EventEmitter<ExtensionEvent>;
  private eventHistory: Array<{ event: ExtensionEvent; timestamp: number }> = [];
  private readonly maxHistorySize = 100;
  private readonly oneTimeListeners = new Map<string, Array<(event: ExtensionEvent) => void>>();

  /**
   *
   */
  public constructor() {
    this.emitter = new vscode.EventEmitter<ExtensionEvent>();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Emit an event
   * @param event
   */
  public emit(event: ExtensionEvent): void {
    // Add to history
    this.eventHistory.push({ event, timestamp: Date.now() });
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Fire the event
    this.emitter.fire(event);

    // Handle one-time listeners
    const listeners = this.oneTimeListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
      this.oneTimeListeners.delete(event.type);
    }
  }

  /**
   * Subscribe to events
   * @param listener
   */
  public on(listener: (event: ExtensionEvent) => void): vscode.Disposable {
    return this.emitter.event(listener);
  }

  /**
   * Subscribe to a specific event type
   * @param type
   * @param listener
   */
  public onType<T extends ExtensionEvent['type']>(
    type: T,
    listener: (event: Extract<ExtensionEvent, { type: T }>) => void
  ): vscode.Disposable {
    return this.emitter.event((event) => {
      if (event.type === type) {
        listener(event as Extract<ExtensionEvent, { type: T }>);
      }
    });
  }

  /**
   * Subscribe to an event once
   * @param type
   * @param listener
   */
  public once<T extends ExtensionEvent['type']>(
    type: T,
    listener: (event: Extract<ExtensionEvent, { type: T }>) => void
  ): void {
    const listeners = this.oneTimeListeners.get(type) || [];
    listeners.push(listener as (event: ExtensionEvent) => void);
    this.oneTimeListeners.set(type, listeners);
  }

  /**
   * Emit and wait for async handlers
   * @param event
   */
  public async emitAsync(event: ExtensionEvent): Promise<void> {
    this.emit(event);
    // Small delay to allow async handlers to start
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  /**
   * Get event history
   * @param count
   */
  public getHistory(count?: number): Array<{ event: ExtensionEvent; timestamp: number }> {
    if (count) {
      return this.eventHistory.slice(-count);
    }
    return [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  public clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get events of a specific type from history
   * @param type
   */
  public getHistoryByType<T extends ExtensionEvent['type']>(
    type: T
  ): Array<{ event: Extract<ExtensionEvent, { type: T }>; timestamp: number }> {
    return this.eventHistory
      .filter(item => item.event.type === type)
      .map(item => ({
        event: item.event as Extract<ExtensionEvent, { type: T }>,
        timestamp: item.timestamp,
      }));
  }

  /**
   * Wait for a specific event
   * @param type
   * @param timeout
   */
  public async waitFor<T extends ExtensionEvent['type']>(
    type: T,
    timeout?: number
  ): Promise<Extract<ExtensionEvent, { type: T }>> {
    return new Promise((resolve, reject) => {
      let disposable: vscode.Disposable;
      let timeoutId: NodeJS.Timeout | undefined;

      const cleanup = () => {
        if (disposable) {
          disposable.dispose();
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };

      disposable = this.onType(type, (event) => {
        cleanup();
        resolve(event);
      });

      if (timeout) {
        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error(`Timeout waiting for event: ${type}`));
        }, timeout);
      }
    });
  }

  /**
   * Dispose the event bus
   * FIXED: Now properly resets singleton instance to prevent memory leaks
   */
  public dispose(): void {
    this.emitter.dispose();
    this.eventHistory = [];
    this.oneTimeListeners.clear();
    // Reset singleton instance
    if (EventBus.instance === this) {
      EventBus.instance = null as any;
    }
  }
}
