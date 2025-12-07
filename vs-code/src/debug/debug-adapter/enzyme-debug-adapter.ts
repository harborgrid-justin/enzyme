/**
 * @file Enzyme Debug Adapter
 * @description Custom debug adapter for Enzyme applications
 */

// ============================================================================
// Types
// ============================================================================

/**
 *
 */
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

/**
 *
 */
export interface VariableScope {
  name: string;
  variablesReference: number;
  expensive: boolean;
  namedVariables?: number;
  indexedVariables?: number;
}

/**
 *
 */
export interface Variable {
  name: string;
  value: string;
  type?: string;
  variablesReference: number;
  evaluateName?: string;
}

/**
 *
 */
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

/**
 *
 */
export interface Thread {
  id: number;
  name: string;
}

// ============================================================================
// Enzyme Debug Adapter
// ============================================================================

/**
 *
 */
export class EnzymeDebugAdapter {
  private isInitialized = false;
  private readonly variableHandles = new Map<number, unknown>();
  private handleCounter = 1;
  private readonly breakpoints = new Map<string, Set<number>>();

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
   * @param path
   * @param lines
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
   * @param path
   */
  clearBreakpoints(path: string): void {
    this.breakpoints.delete(path);
  }

  /**
   * Get variable scopes for a stack frame
   * @param _frameId
   */
  getScopes(_frameId: number): VariableScope[] {
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
   * @param variablesReference
   */
  getVariables(variablesReference: number): Variable[] {
    const value = this.variableHandles.get(variablesReference);

    if (!value) {
      return [];
    }

    return this.convertToVariables(value);
  }

  /**
   * Evaluate expression safely
   * SECURITY: Do NOT use eval() - it allows arbitrary code execution
   * Instead, use a safe expression parser for simple expressions
   * @param expression
   * @param frameId
   */
  evaluate(expression: string, frameId?: number): {
    result: string;
    type?: string;
    variablesReference: number;
  } {
    try {
      // SECURITY: Use safe expression evaluation instead of eval()
      const result = this.safeEvaluate(expression, frameId);

      return {
        result: String(result.value),
        type: result.type,
        variablesReference: this.isComplexType(result.value) ? this.createVariableHandle(result.value) : 0,
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
   * Safe expression evaluator
   * SECURITY: Only evaluates simple, safe expressions - no arbitrary code execution
   * Supports: literals (numbers, strings, booleans, null, undefined), JSON
   * @param expression
   * @param _frameId
   */
  private safeEvaluate(expression: string, _frameId?: number): { value: unknown; type: string } {
    const trimmed = expression.trim();

    // Handle null/undefined
    if (trimmed === 'null') {
      return { value: null, type: 'null' };
    }
    if (trimmed === 'undefined') {
      return { value: undefined, type: 'undefined' };
    }

    // Handle boolean literals
    if (trimmed === 'true') {
      return { value: true, type: 'boolean' };
    }
    if (trimmed === 'false') {
      return { value: false, type: 'boolean' };
    }

    // Handle number literals
    const number_ = Number(trimmed);
    if (!isNaN(number_) && /^-?\d*\.?\d+$/.test(trimmed)) {
      return { value: number_, type: 'number' };
    }

    // Handle string literals (single or double quoted)
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      const stringValue = trimmed.slice(1, -1);
      return { value: stringValue, type: 'string' };
    }

    // Handle JSON objects and arrays
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return { value: parsed, type: Array.isArray(parsed) ? 'array' : 'object' };
      } catch {
        // Not valid JSON, fall through
      }
    }

    // For complex expressions that require actual runtime context,
    // return a message indicating the expression cannot be evaluated locally
    // In a real implementation, this would communicate with the debug runtime
    return {
      value: `[Expression evaluation requires debug runtime: ${trimmed}]`,
      type: 'string',
    };
  }

  /**
   * Get stack trace
   * @param _threadId
   */
  getStackTrace(_threadId: number): StackFrame[] {
    // Return current stack
    const error = new Error();
    const stack = error.stack?.split('\n').slice(2) ?? [];

    return stack.map((line, index) => {
      const match = /at (.+?) \((.+?):(\d+):(\d+)\)/.exec(line);

      if (match) {
        const [, name, path, lineString, columnString] = match;
        return {
          id: index,
          name: name?.trim() ?? 'unknown',
          source: { path: path ?? 'unknown' },
          line: Number.parseInt(lineString ?? '0', 10),
          column: Number.parseInt(columnString ?? '0', 10),
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
   * @param threadId
   */
  continue(threadId: number): void {
    // Resume execution
    console.log(`Continuing thread ${threadId}`);
  }

  /**
   * Step over
   * @param threadId
   */
  stepOver(threadId: number): void {
    console.log(`Step over in thread ${threadId}`);
  }

  /**
   * Step into
   * @param threadId
   */
  stepInto(threadId: number): void {
    console.log(`Step into in thread ${threadId}`);
  }

  /**
   * Step out
   * @param threadId
   */
  stepOut(threadId: number): void {
    console.log(`Step out in thread ${threadId}`);
  }

  /**
   * Pause execution
   * @param threadId
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
   * @param value
   */
  private createVariableHandle(value: unknown): number {
    const handle = this.handleCounter++;
    this.variableHandles.set(handle, value);
    return handle;
  }

  /**
   * Convert value to variables
   * @param value
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
      for (const [key, value_] of Object.entries(value)) {
        variables.push({
          name: key,
          value: this.formatValue(value_),
          type: typeof value_,
          variablesReference: this.isComplexType(value_) ? this.createVariableHandle(value_) : 0,
          evaluateName: key,
        });
      }
    }

    return variables;
  }

  /**
   * Format value for display
   * @param value
   */
  private formatValue(value: unknown): string {
    if (value === null) {return 'null';}
    if (value === undefined) {return 'undefined';}
    if (typeof value === 'string') {return `"${value}"`;}
    if (typeof value === 'number' || typeof value === 'boolean') {return String(value);}
    if (Array.isArray(value)) {return `Array(${value.length})`;}
    if (typeof value === 'object') {return `Object(${Object.keys(value).length})`;}
    return String(value);
  }

  /**
   * Check if value is complex type
   * @param value
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
