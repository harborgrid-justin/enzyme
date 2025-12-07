/**
 * @file Enzyme Debug Session
 * @description Debug session management for Enzyme applications
 */

import { EnzymeDebugAdapter } from './enzyme-debug-adapter';
import type { DebugConfiguration } from './enzyme-debug-adapter';

// ============================================================================
// Types
// ============================================================================

export enum SessionState {
  NOT_STARTED = 'not_started',
  INITIALIZING = 'initializing',
  RUNNING = 'running',
  PAUSED = 'paused',
  STOPPED = 'stopped',
}

/**
 *
 */
export interface SessionOptions {
  /** Enable state inspection */
  enableStateInspection?: boolean;
  /** Enable action recording */
  enableActionRecording?: boolean;
  /** Enable performance profiling */
  enableProfiling?: boolean;
  /** WebSocket port for debug bridge */
  bridgePort?: number;
}

// ============================================================================
// Enzyme Debug Session
// ============================================================================

/**
 *
 */
export class EnzymeDebugSession {
  private readonly adapter: EnzymeDebugAdapter;
  private state: SessionState = SessionState.NOT_STARTED;
  private configuration: DebugConfiguration | null = null;

  /**
   *
   * @param _options
   */
  constructor(_options: SessionOptions = {}) {
    this.adapter = new EnzymeDebugAdapter();
    // Options are initialized but not currently used in the session
    // They are available for future use if needed
  }

  /**
   * Initialize debug session
   * @param configuration
   */
  async initialize(configuration: DebugConfiguration): Promise<void> {
    if (this.state !== SessionState.NOT_STARTED) {
      throw new Error(`Cannot initialize session in state: ${this.state}`);
    }

    this.state = SessionState.INITIALIZING;
    this.configuration = configuration;

    try {
      await this.adapter.initialize();
      this.state = SessionState.RUNNING;
    } catch (error) {
      this.state = SessionState.NOT_STARTED;
      throw error;
    }
  }

  /**
   * Launch debug session
   * @param configuration
   */
  async launch(configuration: DebugConfiguration): Promise<void> {
    await this.initialize(configuration);
    console.log('Debug session launched:', configuration.name);
  }

  /**
   * Attach to running process
   * @param configuration
   */
  async attach(configuration: DebugConfiguration): Promise<void> {
    await this.initialize(configuration);
    console.log('Debug session attached:', configuration.name);
  }

  /**
   * Set breakpoint
   * @param file
   * @param line
   */
  setBreakpoint(file: string, line: number): { verified: boolean; line: number } {
    const breakpoints = this.adapter.setBreakpoints(file, [line]);
    return breakpoints[0] ?? { verified: false, line };
  }

  /**
   * Clear breakpoints
   * @param file
   */
  clearBreakpoints(file: string): void {
    this.adapter.clearBreakpoints(file);
  }

  /**
   * Continue execution
   */
  continue(): void {
    if (this.state === SessionState.PAUSED) {
      this.adapter.continue(1);
      this.state = SessionState.RUNNING;
    }
  }

  /**
   * Step over
   */
  stepOver(): void {
    if (this.state === SessionState.PAUSED) {
      this.adapter.stepOver(1);
    }
  }

  /**
   * Step into
   */
  stepInto(): void {
    if (this.state === SessionState.PAUSED) {
      this.adapter.stepInto(1);
    }
  }

  /**
   * Step out
   */
  stepOut(): void {
    if (this.state === SessionState.PAUSED) {
      this.adapter.stepOut(1);
    }
  }

  /**
   * Pause execution
   */
  pause(): void {
    if (this.state === SessionState.RUNNING) {
      this.adapter.pause(1);
      this.state = SessionState.PAUSED;
    }
  }

  /**
   * Evaluate expression
   * @param expression
   */
  evaluate(expression: string): { result: string; type?: string } {
    return this.adapter.evaluate(expression);
  }

  /**
   * Get stack trace
   */
  getStackTrace() {
    return this.adapter.getStackTrace(1);
  }

  /**
   * Get variable scopes
   * @param frameId
   */
  getScopes(frameId: number) {
    return this.adapter.getScopes(frameId);
  }

  /**
   * Get variables
   * @param variablesReference
   */
  getVariables(variablesReference: number) {
    return this.adapter.getVariables(variablesReference);
  }

  /**
   * Get session state
   */
  getState(): SessionState {
    return this.state;
  }

  /**
   * Get configuration
   */
  getConfiguration(): DebugConfiguration | null {
    return this.configuration;
  }

  /**
   * Stop debug session
   */
  async stop(): Promise<void> {
    if (this.state === SessionState.STOPPED) {
      return;
    }

    this.adapter.disconnect();
    this.state = SessionState.STOPPED;
    console.log('Debug session stopped');
  }

  /**
   * Dispose session
   */
  async dispose(): Promise<void> {
    await this.stop();
    this.configuration = null;
  }
}

// ============================================================================
// Global Session Instance
// ============================================================================

let globalSession: EnzymeDebugSession | null = null;

/**
 * Get or create global session instance
 * @param options
 */
export function getGlobalDebugSession(options?: SessionOptions): EnzymeDebugSession {
  if (!globalSession) {
    globalSession = new EnzymeDebugSession(options);
  }
  return globalSession;
}

/**
 * Reset global session
 */
export function resetGlobalDebugSession(): void {
  if (globalSession) {
    globalSession.dispose().catch(console.error);
  }
  globalSession = null;
}
