/**
 * @file Enzyme Debug Adapter
 * @description Custom debug adapter for Enzyme applications
 */

// ============================================================================
// Types
// ============================================================================

export interface DebugConfiguration {
  type: string;
  request: 'launch' | 'attach';
  name: string;
  program?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  port?: number;
  address?: string;
  trace?: boolean;
}

export interface VariableScope {
  name: string;
  variablesReference: number;
  expensive: boolean;
  namedVariables?: number;
  indexedVariables?: number;
}

export interface Variable {
  name: string;
  value: string;
  type?: string;
  variablesReference: number;
  evaluateName?: string;
}

export interface StackFrame {
  id: number;
  name: string;
  source?: {
    path: string;
    sourceReference?: number;
  };
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

export interface Thread {
  id: number;
  name: string;
}

// ============================================================================
// Enzyme Debug Adapter
// ============================================================================

export class EnzymeDebugAdapter {
  private isInitialized = false;
  private variableHandles = new Map<number, unknown>();
  private handleCounter = 1;
  private breakpoints = new Map<string, Set<number>>();

  /**
   * Initialize debug adapter
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;
  }

  /**
   * Set breakpoints for a file
   */
  setBreakpoints(path: string, lines: number[]): Array<{ verified: boolean; line: number }> {
    const breakpoints = new Set(lines);
    this.breakpoints.set(path, breakpoints);

    return lines.map((line) => ({
      verified: true,
      line,
    }));
  }

  /**
   * Clear breakpoints for a file
   */
  clearBreakpoints(path: string): void {
    this.breakpoints.delete(path);
  }

  /**
   * Get variable scopes for a stack frame
   */
  getScopes(frameId: number): VariableScope[] {
    // Return default scopes
    return [
      {
        name: 'Local',
        variablesReference: this.createVariableHandle({}),
        expensive: false,
      },
      {
        name: 'State',
        variablesReference: this.createVariableHandle({}),
        expensive: false,
      },
      {
        name: 'Global',
        variablesReference: this.createVariableHandle({}),
        expensive: false,
      },
    ];
  }

  /**
   * Get variables for a scope
   */
  getVariables(variablesReference: number): Variable[] {
    const value = this.variableHandles.get(variablesReference);

    if (!value) {
      return [];
    }

    return this.convertToVariables(value);
  }

  /**
   * Evaluate expression
   */
  evaluate(expression: string, frameId?: number): {
    result: string;
    type?: string;
    variablesReference: number;
  } {
    try {
      // Simple expression evaluation
      // In production, this would evaluate in the context of the current frame
      const result = eval(expression);

      return {
        result: String(result),
        type: typeof result,
        variablesReference: this.isComplexType(result) ? this.createVariableHandle(result) : 0,
      };
    } catch (error) {
      return {
        result: `Error: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error',
        variablesReference: 0,
      };
    }
  }

  /**
   * Get stack trace
   */
  getStackTrace(threadId: number): StackFrame[] {
    // Return current stack
    const error = new Error();
    const stack = error.stack?.split('\n').slice(2) ?? [];

    return stack.map((line, index) => {
      const match = line.match(/at (.+?) \((.+?):(\d+):(\d+)\)/);

      if (match) {
        const [, name, path, lineStr, columnStr] = match;
        return {
          id: index,
          name: name.trim(),
          source: { path },
          line: parseInt(lineStr, 10),
          column: parseInt(columnStr, 10),
        };
      }

      return {
        id: index,
        name: line.trim(),
        source: { path: 'unknown' },
        line: 0,
        column: 0,
      };
    });
  }

  /**
   * Get threads
   */
  getThreads(): Thread[] {
    return [
      {
        id: 1,
        name: 'Main Thread',
      },
    ];
  }

  /**
   * Continue execution
   */
  continue(threadId: number): void {
    // Resume execution
    console.log(`Continuing thread ${threadId}`);
  }

  /**
   * Step over
   */
  stepOver(threadId: number): void {
    console.log(`Step over in thread ${threadId}`);
  }

  /**
   * Step into
   */
  stepInto(threadId: number): void {
    console.log(`Step into in thread ${threadId}`);
  }

  /**
   * Step out
   */
  stepOut(threadId: number): void {
    console.log(`Step out in thread ${threadId}`);
  }

  /**
   * Pause execution
   */
  pause(threadId: number): void {
    console.log(`Pausing thread ${threadId}`);
  }

  /**
   * Disconnect from debuggee
   */
  disconnect(): void {
    this.variableHandles.clear();
    this.breakpoints.clear();
    this.isInitialized = false;
  }

  /**
   * Create variable handle
   */
  private createVariableHandle(value: unknown): number {
    const handle = this.handleCounter++;
    this.variableHandles.set(handle, value);
    return handle;
  }

  /**
   * Convert value to variables
   */
  private convertToVariables(value: unknown): Variable[] {
    if (value === null || value === undefined) {
      return [];
    }

    const variables: Variable[] = [];

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        variables.push({
          name: `[${i}]`,
          value: this.formatValue(item),
          type: typeof item,
          variablesReference: this.isComplexType(item) ? this.createVariableHandle(item) : 0,
        });
      }
    } else if (typeof value === 'object') {
      for (const [key, val] of Object.entries(value)) {
        variables.push({
          name: key,
          value: this.formatValue(val),
          type: typeof val,
          variablesReference: this.isComplexType(val) ? this.createVariableHandle(val) : 0,
          evaluateName: key,
        });
      }
    }

    return variables;
  }

  /**
   * Format value for display
   */
  private formatValue(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (typeof value === 'object') return `Object(${Object.keys(value).length})`;
    return String(value);
  }

  /**
   * Check if value is complex type
   */
  private isComplexType(value: unknown): boolean {
    return (
      value !== null &&
      value !== undefined &&
      (typeof value === 'object' || typeof value === 'function')
    );
  }
}

// ============================================================================
// Global Adapter Instance
// ============================================================================

let globalAdapter: EnzymeDebugAdapter | null = null;

/**
 * Get or create global adapter instance
 */
export function getGlobalDebugAdapter(): EnzymeDebugAdapter {
  if (!globalAdapter) {
    globalAdapter = new EnzymeDebugAdapter();
  }
  return globalAdapter;
}

/**
 * Reset global adapter
 */
export function resetGlobalDebugAdapter(): void {
  if (globalAdapter) {
    globalAdapter.disconnect();
  }
  globalAdapter = null;
}
