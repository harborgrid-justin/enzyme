/**
 * React Hook Code Generator
 *
 * Generates custom React hooks with TypeScript support, including
 * state management hooks, effect hooks, and custom logic hooks.
 *
 * @example
 * ```typescript
 * const generator = new HookGenerator();
 * const code = generator.generateHook({
 *   name: 'useCounter',
 *   parameters: [{ name: 'initialValue', type: 'number', defaultValue: '0' }],
 *   returnType: '[number, () => void, () => void]'
 * });
 * ```
 *
 * @module generators/hook
 */

/**
 * Hook parameter definition
 */
export interface HookParameter {
  /**
   * Parameter name
   */
  name: string;

  /**
   * TypeScript type
   */
  type: string;

  /**
   * Is optional
   */
  optional?: boolean;

  /**
   * Default value
   */
  defaultValue?: string;

  /**
   * JSDoc description
   */
  description?: string;
}

/**
 * Hook return value definition
 */
export interface HookReturn {
  /**
   * Return type
   */
  type: string;

  /**
   * Return value description
   */
  description?: string;
}

/**
 * Hook state variable definition
 */
export interface HookState {
  /**
   * State variable name
   */
  name: string;

  /**
   * TypeScript type
   */
  type: string;

  /**
   * Initial value expression
   */
  initialValue: string;
}

/**
 * Hook dependency
 */
export interface HookDependency {
  /**
   * React hook to import (e.g., 'useState', 'useEffect')
   */
  hook: string;

  /**
   * Custom hook to import
   */
  custom?: {
    name: string;
    from: string;
  };
}

/**
 * Hook generation options
 */
export interface HookOptions {
  /**
   * Hook name (must start with 'use')
   */
  name: string;

  /**
   * Hook parameters
   */
  parameters?: HookParameter[];

  /**
   * Return type
   */
  returnType: string;

  /**
   * Hook description for JSDoc
   */
  description?: string;

  /**
   * State variables used in hook
   */
  state?: HookState[];

  /**
   * Effect dependencies
   */
  effects?: Array<{
    dependencies: string[];
    body: string;
    cleanup?: string;
  }>;

  /**
   * Memoized values
   */
  memos?: Array<{
    name: string;
    type?: string;
    expression: string;
    dependencies: string[];
  }>;

  /**
   * Callbacks
   */
  callbacks?: Array<{
    name: string;
    parameters?: string[];
    body: string;
    dependencies: string[];
  }>;

  /**
   * Additional hooks used
   */
  dependencies?: HookDependency[];

  /**
   * Hook body (custom implementation)
   */
  body?: string;

  /**
   * Return statement
   */
  returnStatement?: string;

  /**
   * Export type
   */
  exportType?: 'named' | 'default' | 'none';

  /**
   * Include usage example
   */
  includeExample?: boolean;
}

/**
 * React hook code generator
 *
 * @example
 * ```typescript
 * const generator = new HookGenerator();
 *
 * // Generate state hook
 * const stateHook = generator.generateHook({
 *   name: 'useCounter',
 *   parameters: [
 *     { name: 'initialValue', type: 'number', defaultValue: '0' }
 *   ],
 *   returnType: '[number, () => void, () => void]',
 *   state: [
 *     { name: 'count', type: 'number', initialValue: 'initialValue' }
 *   ],
 *   callbacks: [
 *     {
 *       name: 'increment',
 *       body: 'setCount(c => c + 1);',
 *       dependencies: []
 *     },
 *     {
 *       name: 'decrement',
 *       body: 'setCount(c => c - 1);',
 *       dependencies: []
 *     }
 *   ],
 *   returnStatement: '[count, increment, decrement]'
 * });
 *
 * // Generate effect hook
 * const effectHook = generator.generateHook({
 *   name: 'useDocumentTitle',
 *   parameters: [{ name: 'title', type: 'string' }],
 *   returnType: 'void',
 *   effects: [{
 *     dependencies: ['title'],
 *     body: 'document.title = title;',
 *     cleanup: 'document.title = "";'
 *   }]
 * });
 * ```
 */
export class HookGenerator {
  /**
   * Generate a custom React hook
   *
   * @param options - Hook options
   * @returns Generated hook code
   *
   * @example
   * ```typescript
   * const code = generator.generateHook({
   *   name: 'useFetch',
   *   parameters: [
   *     { name: 'url', type: 'string' }
   *   ],
   *   returnType: '{ data: any; loading: boolean; error: Error | null }',
   *   state: [
   *     { name: 'data', type: 'any', initialValue: 'null' },
   *     { name: 'loading', type: 'boolean', initialValue: 'true' },
   *     { name: 'error', type: 'Error | null', initialValue: 'null' }
   *   ],
   *   effects: [{
   *     dependencies: ['url'],
   *     body: 'fetch(url).then(res => res.json()).then(setData).catch(setError).finally(() => setLoading(false));'
   *   }],
   *   returnStatement: '{ data, loading, error }'
   * });
   * ```
   */
  generateHook(options: HookOptions): string {
    const {
      name,
      parameters = [],
      returnType,
      description,
      state = [],
      effects = [],
      memos = [],
      callbacks = [],
      dependencies = [],
      body,
      returnStatement,
      exportType = 'named',
      includeExample = false,
    } = options;

    // Validate hook name
    if (!name.startsWith('use')) {
      throw new Error('Hook name must start with "use"');
    }

    // Build imports
    const reactHooks = new Set<string>();
    if (state.length > 0) reactHooks.add('useState');
    if (effects.length > 0) reactHooks.add('useEffect');
    if (memos.length > 0) reactHooks.add('useMemo');
    if (callbacks.length > 0) reactHooks.add('useCallback');

    // Add custom dependencies
    dependencies.forEach(dep => {
      if (dep.hook) reactHooks.add(dep.hook);
    });

    const importStatements: string[] = [];
    if (reactHooks.size > 0) {
      importStatements.push(`import { ${Array.from(reactHooks).join(', ')} } from 'react';`);
    }

    // Add custom hook imports
    dependencies.forEach(dep => {
      if (dep.custom) {
        importStatements.push(`import { ${dep.custom.name} } from '${dep.custom.from}';`);
      }
    });

    // Build JSDoc
    const jsdoc = this.buildJSDoc({
      description,
      parameters,
      returnType,
      includeExample,
      exampleUsage: includeExample ? this.generateExample(options) : undefined,
    });

    // Build function signature
    const params = parameters.map(p => {
      const optional = p.optional || p.defaultValue ? '?' : '';
      const defaultVal = p.defaultValue ? ` = ${p.defaultValue}` : '';
      return `${p.name}${optional}: ${p.type}${defaultVal}`;
    }).join(', ');

    // Build state declarations
    const stateDeclarations = state.map(s => {
      const setterName = `set${s.name.charAt(0).toUpperCase()}${s.name.slice(1)}`;
      return `  const [${s.name}, ${setterName}] = useState<${s.type}>(${s.initialValue});`;
    }).join('\n');

    // Build effects
    const effectsCode = effects.map(e => {
      const deps = `[${e.dependencies.join(', ')}]`;
      const cleanup = e.cleanup ? `\n    return () => {\n      ${e.cleanup}\n    };` : '';
      return `  useEffect(() => {\n    ${e.body}${cleanup}\n  }, ${deps});`;
    }).join('\n\n');

    // Build memos
    const memosCode = memos.map(m => {
      const type = m.type ? `: ${m.type}` : '';
      const deps = `[${m.dependencies.join(', ')}]`;
      return `  const ${m.name}${type} = useMemo(() => ${m.expression}, ${deps});`;
    }).join('\n');

    // Build callbacks
    const callbacksCode = callbacks.map(c => {
      const params = c.parameters ? c.parameters.join(', ') : '';
      const deps = `[${c.dependencies.join(', ')}]`;
      return `  const ${c.name} = useCallback((${params}) => {\n    ${c.body}\n  }, ${deps});`;
    }).join('\n\n');

    // Build hook body
    const hookBody = body || [
      stateDeclarations,
      effectsCode,
      memosCode,
      callbacksCode,
    ].filter(Boolean).join('\n\n');

    // Build return statement
    const returnStmt = returnStatement || this.inferReturnStatement(options);

    // Build function
    const functionDecl = `${jsdoc}function ${name}(${params}): ${returnType} {
${hookBody}

  return ${returnStmt};
}`;

    // Build export
    let exportStatement = '';
    if (exportType === 'named') {
      exportStatement = `\nexport { ${name} };`;
    } else if (exportType === 'default') {
      exportStatement = `\nexport default ${name};`;
    }

    return `${importStatements.join('\n')}\n\n${functionDecl}${exportStatement}`;
  }

  /**
   * Build JSDoc comment
   */
  private buildJSDoc(options: {
    description?: string;
    parameters?: HookParameter[];
    returnType: string;
    includeExample?: boolean;
    exampleUsage?: string;
  }): string {
    const { description, parameters = [], returnType, includeExample, exampleUsage } = options;

    const lines: string[] = ['/**'];

    if (description) {
      lines.push(` * ${description}`);
      lines.push(' *');
    }

    if (parameters.length > 0) {
      parameters.forEach(param => {
        const desc = param.description || '';
        lines.push(` * @param ${param.name} - ${desc}`);
      });
      lines.push(' *');
    }

    lines.push(` * @returns ${returnType}`);

    if (includeExample && exampleUsage) {
      lines.push(' *');
      lines.push(' * @example');
      lines.push(' * ```typescript');
      exampleUsage.split('\n').forEach(line => {
        lines.push(` * ${line}`);
      });
      lines.push(' * ```');
    }

    lines.push(' */');

    return lines.join('\n');
  }

  /**
   * Generate usage example
   */
  private generateExample(options: HookOptions): string {
    const { name, parameters = [], returnType } = options;

    const args = parameters.map(p => {
      if (p.type === 'string') return `'example'`;
      if (p.type === 'number') return '0';
      if (p.type === 'boolean') return 'false';
      return 'null';
    }).join(', ');

    // Infer return destructuring
    const returnMatch = returnType.match(/^\[([^\]]+)\]$/);
    if (returnMatch) {
      const vars = returnMatch[1].split(',').map((v, i) => `var${i + 1}`);
      return `const [${vars.join(', ')}] = ${name}(${args});`;
    }

    const objectMatch = returnType.match(/\{([^}]+)\}/);
    if (objectMatch) {
      const props = objectMatch[1].split(/[,;]/).map(p => p.split(':')[0].trim());
      return `const { ${props.join(', ')} } = ${name}(${args});`;
    }

    return `const result = ${name}(${args});`;
  }

  /**
   * Infer return statement from options
   */
  private inferReturnStatement(options: HookOptions): string {
    const { state = [], callbacks = [], memos = [] } = options;

    // If returning array of state and callbacks
    if (state.length > 0 && callbacks.length > 0) {
      const stateVars = state.map(s => s.name);
      const callbackVars = callbacks.map(c => c.name);
      return `[${[...stateVars, ...callbackVars].join(', ')}]`;
    }

    // If returning object
    if (state.length > 0 || callbacks.length > 0 || memos.length > 0) {
      const vars = [
        ...state.map(s => s.name),
        ...callbacks.map(c => c.name),
        ...memos.map(m => m.name),
      ];
      return `{ ${vars.join(', ')} }`;
    }

    return 'undefined';
  }

  /**
   * Generate a state hook (like useState wrapper)
   *
   * @param options - State hook options
   * @returns Generated hook code
   */
  generateStateHook(options: {
    name: string;
    type: string;
    initialValue: string;
    description?: string;
  }): string {
    const { name, type, initialValue, description } = options;

    return this.generateHook({
      name,
      parameters: [
        { name: 'initial', type, defaultValue: initialValue, optional: true },
      ],
      returnType: `[${type}, (value: ${type}) => void]`,
      description,
      state: [
        { name: 'value', type, initialValue: 'initial' },
      ],
      returnStatement: '[value, setValue]',
    });
  }

  /**
   * Generate an effect hook (like useEffect wrapper)
   *
   * @param options - Effect hook options
   * @returns Generated hook code
   */
  generateEffectHook(options: {
    name: string;
    parameters: HookParameter[];
    effect: {
      body: string;
      cleanup?: string;
    };
    description?: string;
  }): string {
    const { name, parameters, effect, description } = options;

    return this.generateHook({
      name,
      parameters,
      returnType: 'void',
      description,
      effects: [
        {
          dependencies: parameters.map(p => p.name),
          body: effect.body,
          cleanup: effect.cleanup,
        },
      ],
      returnStatement: 'undefined',
    });
  }
}

/**
 * Generate a simple custom hook quickly
 *
 * @param name - Hook name
 * @param returnType - Return type
 * @param body - Hook body
 * @returns Generated hook code
 *
 * @example
 * ```typescript
 * const code = generateHook('useWindowSize', '{ width: number; height: number }', `
 *   const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
 *
 *   useEffect(() => {
 *     const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
 *     window.addEventListener('resize', handleResize);
 *     return () => window.removeEventListener('resize', handleResize);
 *   }, []);
 *
 *   return size;
 * `);
 * ```
 */
export function generateHook(
  name: string,
  returnType: string,
  body: string
): string {
  const generator = new HookGenerator();
  return generator.generateHook({
    name,
    returnType,
    body: body.trim(),
    returnStatement: 'result',
  });
}

/**
 * Common hook templates
 */
export const hookTemplates = {
  /**
   * useLocalStorage hook
   */
  localStorage: (): string => {
    const generator = new HookGenerator();
    return generator.generateHook({
      name: 'useLocalStorage',
      parameters: [
        { name: 'key', type: 'string' },
        { name: 'initialValue', type: 'T' },
      ],
      returnType: '[T, (value: T) => void]',
      description: 'Store and retrieve values from localStorage with React state',
      state: [
        {
          name: 'storedValue',
          type: 'T',
          initialValue: `(() => {
      try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
      } catch (error) {
        return initialValue;
      }
    })()`,
        },
      ],
      callbacks: [
        {
          name: 'setValue',
          parameters: ['value: T'],
          body: `setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));`,
          dependencies: ['key'],
        },
      ],
      returnStatement: '[storedValue, setValue]',
    });
  },

  /**
   * useDebounce hook
   */
  debounce: (): string => {
    const generator = new HookGenerator();
    return generator.generateHook({
      name: 'useDebounce',
      parameters: [
        { name: 'value', type: 'T' },
        { name: 'delay', type: 'number', defaultValue: '500' },
      ],
      returnType: 'T',
      description: 'Debounce a value',
      state: [
        { name: 'debouncedValue', type: 'T', initialValue: 'value' },
      ],
      effects: [
        {
          dependencies: ['value', 'delay'],
          body: `const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);`,
          cleanup: 'clearTimeout(handler);',
        },
      ],
      returnStatement: 'debouncedValue',
    });
  },

  /**
   * usePrevious hook
   */
  previous: (): string => {
    const generator = new HookGenerator();
    return generator.generateHook({
      name: 'usePrevious',
      parameters: [{ name: 'value', type: 'T' }],
      returnType: 'T | undefined',
      description: 'Get the previous value of a variable',
      dependencies: [{ hook: 'useRef' }],
      body: `  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);`,
      returnStatement: 'ref.current',
    });
  },

  /**
   * useToggle hook
   */
  toggle: (): string => {
    const generator = new HookGenerator();
    return generator.generateHook({
      name: 'useToggle',
      parameters: [
        { name: 'initialValue', type: 'boolean', defaultValue: 'false' },
      ],
      returnType: '[boolean, () => void]',
      description: 'Toggle a boolean value',
      state: [
        { name: 'value', type: 'boolean', initialValue: 'initialValue' },
      ],
      callbacks: [
        {
          name: 'toggle',
          body: 'setValue(v => !v);',
          dependencies: [],
        },
      ],
      returnStatement: '[value, toggle]',
    });
  },

  /**
   * useAsync hook
   */
  async: (): string => {
    const generator = new HookGenerator();
    return generator.generateHook({
      name: 'useAsync',
      parameters: [
        { name: 'asyncFunction', type: '() => Promise<T>' },
        { name: 'immediate', type: 'boolean', defaultValue: 'true' },
      ],
      returnType: '{ execute: () => Promise<void>; data: T | null; loading: boolean; error: Error | null }',
      description: 'Handle async operations with loading and error states',
      state: [
        { name: 'data', type: 'T | null', initialValue: 'null' },
        { name: 'loading', type: 'boolean', initialValue: 'false' },
        { name: 'error', type: 'Error | null', initialValue: 'null' },
      ],
      callbacks: [
        {
          name: 'execute',
          body: `setLoading(true);
      try {
        const response = await asyncFunction();
        setData(response);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }`,
          dependencies: ['asyncFunction'],
        },
      ],
      effects: [
        {
          dependencies: ['immediate'],
          body: 'if (immediate) { execute(); }',
        },
      ],
      returnStatement: '{ execute, data, loading, error }',
    });
  },
};
