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

export interface AdapterDescriptor {
  type: string;
  mode: AdapterMode;
  port?: number;
  host?: string;
}

export interface AdapterFactoryOptions {
  mode?: AdapterMode;
  port?: number;
  host?: string;
  sessionOptions?: SessionOptions;
}

// ============================================================================
// Debug Adapter Descriptor Factory
// ============================================================================

export class DebugAdapterDescriptorFactory {
  private adapters = new Map<string, EnzymeDebugAdapter>();
  private sessions = new Map<string, EnzymeDebugSession>();
  private options: Required<AdapterFactoryOptions>;

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
   */
  createDescriptor(sessionId: string): AdapterDescriptor {
    return {
      type: 'enzyme',
      mode: this.options.mode,
      port: this.options.port,
      host: this.options.host,
    };
  }

  /**
   * Create debug adapter
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
   */
  getAdapter(sessionId: string): EnzymeDebugAdapter | undefined {
    return this.adapters.get(sessionId);
  }

  /**
   * Get session
   */
  getSession(sessionId: string): EnzymeDebugSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Dispose adapter
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
    const disposePromises: Promise<void>[] = [];

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
    return Array.from(this.sessions.keys());
  }
}

// ============================================================================
// Global Factory Instance
// ============================================================================

let globalFactory: DebugAdapterDescriptorFactory | null = null;

/**
 * Get or create global factory instance
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
