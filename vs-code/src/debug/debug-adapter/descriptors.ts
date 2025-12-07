/**
 * @file Debug Adapter Descriptors
 * @description Factory for creating debug adapter instances
 */

import { EnzymeDebugAdapter } from './enzyme-debug-adapter';
import { EnzymeDebugSession, type SessionOptions } from './enzyme-debug-session';

// ============================================================================
// Types
// ============================================================================

export enum AdapterMode {
  INLINE = 'inline',
  SERVER = 'server',
}

/**
 *
 */
export interface AdapterDescriptor {
  type: string;
  mode: AdapterMode;
  port?: number;
  host?: string;
}

/**
 *
 */
export interface AdapterFactoryOptions {
  mode?: AdapterMode;
  port?: number;
  host?: string;
  sessionOptions?: SessionOptions;
}

// ============================================================================
// Debug Adapter Descriptor Factory
// ============================================================================

/**
 *
 */
export class DebugAdapterDescriptorFactory {
  private readonly adapters = new Map<string, EnzymeDebugAdapter>();
  private readonly sessions = new Map<string, EnzymeDebugSession>();
  private readonly options: Required<AdapterFactoryOptions>;

  /**
   *
   * @param options
   */
  constructor(options: AdapterFactoryOptions = {}) {
    this.options = {
      mode: options.mode ?? AdapterMode.INLINE,
      port: options.port ?? 3000,
      host: options.host ?? 'localhost',
      sessionOptions: options.sessionOptions ?? {},
    };
  }

  /**
   * Create debug adapter descriptor
   * @param _sessionId
   */
  createDescriptor(_sessionId: string): AdapterDescriptor {
    return {
      type: 'enzyme',
      mode: this.options.mode,
      port: this.options.port,
      host: this.options.host,
    };
  }

  /**
   * Create debug adapter
   * @param sessionId
   */
  createAdapter(sessionId: string): EnzymeDebugAdapter {
    let adapter = this.adapters.get(sessionId);

    if (!adapter) {
      adapter = new EnzymeDebugAdapter();
      this.adapters.set(sessionId, adapter);
    }

    return adapter;
  }

  /**
   * Create debug session
   * @param sessionId
   */
  createSession(sessionId: string): EnzymeDebugSession {
    let session = this.sessions.get(sessionId);

    if (!session) {
      session = new EnzymeDebugSession(this.options.sessionOptions);
      this.sessions.set(sessionId, session);
    }

    return session;
  }

  /**
   * Get adapter for session
   * @param sessionId
   */
  getAdapter(sessionId: string): EnzymeDebugAdapter | undefined {
    return this.adapters.get(sessionId);
  }

  /**
   * Get session
   * @param sessionId
   */
  getSession(sessionId: string): EnzymeDebugSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Dispose adapter
   * @param sessionId
   */
  disposeAdapter(sessionId: string): void {
    const adapter = this.adapters.get(sessionId);
    if (adapter) {
      adapter.disconnect();
      this.adapters.delete(sessionId);
    }
  }

  /**
   * Dispose session
   * @param sessionId
   */
  async disposeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      await session.dispose();
      this.sessions.delete(sessionId);
    }

    this.disposeAdapter(sessionId);
  }

  /**
   * Dispose all adapters and sessions
   */
  async disposeAll(): Promise<void> {
    const disposePromises: Array<Promise<void>> = [];

    for (const sessionId of this.sessions.keys()) {
      disposePromises.push(this.disposeSession(sessionId));
    }

    await Promise.all(disposePromises);
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get all session IDs
   */
  getSessionIds(): string[] {
    return [...this.sessions.keys()];
  }
}

// ============================================================================
// Global Factory Instance
// ============================================================================

let globalFactory: DebugAdapterDescriptorFactory | null = null;

/**
 * Get or create global factory instance
 * @param options
 */
export function getGlobalAdapterFactory(
  options?: AdapterFactoryOptions
): DebugAdapterDescriptorFactory {
  if (!globalFactory) {
    globalFactory = new DebugAdapterDescriptorFactory(options);
  }
  return globalFactory;
}

/**
 * Reset global factory
 */
export function resetGlobalAdapterFactory(): void {
  if (globalFactory) {
    globalFactory.disposeAll().catch(console.error);
  }
  globalFactory = null;
}
