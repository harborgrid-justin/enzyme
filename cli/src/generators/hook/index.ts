/**
 * @file Hook Generator
 * @description Generates custom React hooks following enzyme patterns
 */

import * as path from 'path';
import { BaseGenerator, type GeneratorOptions, type GeneratedFile } from '../base';
import type { HookOptions, HookType } from '../types';
import {
  resolveHookPath,
  toCamelCase,
  createBaseContext,
  validateHookName,
} from '../utils';

// ============================================================================
// Hook Generator
// ============================================================================

export interface HookGeneratorOptions extends GeneratorOptions, HookOptions {}

export class HookGenerator extends BaseGenerator<HookGeneratorOptions> {
  protected getName(): string {
    return 'Hook';
  }

  protected validate(): void {
    validateHookName(this.options.name);

    if (this.options.path) {
      this.validatePath(this.options.path);
    }
  }

  protected async generate(): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    const hookName = toCamelCase(this.options.name);
    const hookPath = resolveHookPath(this.options.name, this.options.path);

    // Ensure hook name starts with 'use'
    const finalHookName = hookName.startsWith('use') ? hookName : `use${hookName.charAt(0).toUpperCase()}${hookName.slice(1)}`;

    // Generate hook file
    const hookContent = this.generateHookFile(finalHookName);
    files.push({
      path: path.join(hookPath, `${finalHookName}.ts`),
      content: hookContent,
    });

    // Generate index file
    const indexContent = this.generateIndexFile(finalHookName);
    files.push({
      path: path.join(hookPath, 'index.ts'),
      content: indexContent,
    });

    // Generate test file if requested
    if (this.options.withTest) {
      const testContent = this.generateTestFile(finalHookName);
      files.push({
        path: path.join(hookPath, `${finalHookName}.test.ts`),
        content: testContent,
      });
    }

    return files;
  }

  // ==========================================================================
  // File Generation Methods
  // ==========================================================================

  private generateHookFile(hookName: string): string {
    const type = this.options.type || 'custom';

    switch (type) {
      case 'query':
        return this.generateQueryHook(hookName);
      case 'mutation':
        return this.generateMutationHook(hookName);
      case 'state':
        return this.generateStateHook(hookName);
      case 'effect':
        return this.generateEffectHook(hookName);
      case 'callback':
        return this.generateCallbackHook(hookName);
      default:
        return this.generateCustomHook(hookName);
    }
  }

  private generateQueryHook(hookName: string): string {
    return `/**
 * @file ${hookName}
 * @description React Query hook for data fetching
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

// ============================================================================
// Types
// ============================================================================

/**
 * ${hookName} options
 */
export interface ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}Options {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  staleTime?: number;
}

/**
 * ${hookName} data type
 */
export interface ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}Data {
  // Define your data structure here
  id: string;
  name: string;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * ${hookName} - React Query hook for fetching data
 *
 * @example
 * \`\`\`tsx
 * function MyComponent() {
 *   const { data, isLoading, error } = ${hookName}();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return <div>{data?.name}</div>;
 * }
 * \`\`\`
 */
export function ${hookName}(
  options: ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}Options = {}
): UseQueryResult<${hookName.charAt(3).toUpperCase() + hookName.slice(4)}Data, Error> {
  return useQuery({
    queryKey: ['${hookName}'],
    queryFn: async () => {
      // TODO: Implement your API call here
      const response = await fetch('/api/data');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      return response.json();
    },
    enabled: options.enabled,
    refetchOnWindowFocus: options.refetchOnWindowFocus,
    staleTime: options.staleTime,
  });
}
`;
  }

  private generateMutationHook(hookName: string): string {
    return `/**
 * @file ${hookName}
 * @description React Query mutation hook
 */

import { useMutation, type UseMutationResult, useQueryClient } from '@tanstack/react-query';

// ============================================================================
// Types
// ============================================================================

/**
 * ${hookName} variables
 */
export interface ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}Variables {
  // Define your mutation variables here
  name: string;
}

/**
 * ${hookName} response
 */
export interface ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}Response {
  // Define your response structure here
  id: string;
  name: string;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * ${hookName} - React Query mutation hook
 *
 * @example
 * \`\`\`tsx
 * function MyComponent() {
 *   const mutation = ${hookName}();
 *
 *   const handleSubmit = () => {
 *     mutation.mutate({ name: 'New Item' });
 *   };
 *
 *   return (
 *     <button onClick={handleSubmit} disabled={mutation.isPending}>
 *       {mutation.isPending ? 'Creating...' : 'Create'}
 *     </button>
 *   );
 * }
 * \`\`\`
 */
export function ${hookName}(): UseMutationResult<
  ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}Response,
  Error,
  ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}Variables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}Variables) => {
      // TODO: Implement your API call here
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(variables),
      });

      if (!response.ok) {
        throw new Error('Mutation failed');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch relevant queries
      void queryClient.invalidateQueries({ queryKey: ['relatedData'] });
    },
  });
}
`;
  }

  private generateStateHook(hookName: string): string {
    return `/**
 * @file ${hookName}
 * @description State management hook
 */

import { useState, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * ${hookName} state type
 */
export interface ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}State {
  // Define your state structure here
  value: string;
  count: number;
}

/**
 * ${hookName} return type
 */
export interface ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}Return {
  state: ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}State;
  setValue: (value: string) => void;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

// ============================================================================
// Hook
// ============================================================================

const initialState: ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}State = {
  value: '',
  count: 0,
};

/**
 * ${hookName} - Custom state management hook
 *
 * @example
 * \`\`\`tsx
 * function MyComponent() {
 *   const { state, setValue, increment, reset } = ${hookName}();
 *
 *   return (
 *     <div>
 *       <input
 *         value={state.value}
 *         onChange={(e) => setValue(e.target.value)}
 *       />
 *       <p>Count: {state.count}</p>
 *       <button onClick={increment}>Increment</button>
 *       <button onClick={reset}>Reset</button>
 *     </div>
 *   );
 * }
 * \`\`\`
 */
export function ${hookName}(): ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}Return {
  const [state, setState] = useState<${hookName.charAt(3).toUpperCase() + hookName.slice(4)}State>(initialState);

  const setValue = useCallback((value: string) => {
    setState((prev) => ({ ...prev, value }));
  }, []);

  const increment = useCallback(() => {
    setState((prev) => ({ ...prev, count: prev.count + 1 }));
  }, []);

  const decrement = useCallback(() => {
    setState((prev) => ({ ...prev, count: prev.count - 1 }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    setValue,
    increment,
    decrement,
    reset,
  };
}
`;
  }

  private generateEffectHook(hookName: string): string {
    return `/**
 * @file ${hookName}
 * @description Effect hook with cleanup
 */

import { useEffect, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * ${hookName} options
 */
export interface ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}Options {
  // Define your options here
  enabled?: boolean;
  interval?: number;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * ${hookName} - Custom effect hook
 *
 * @example
 * \`\`\`tsx
 * function MyComponent() {
 *   ${hookName}({
 *     enabled: true,
 *     interval: 1000,
 *   });
 *
 *   return <div>Component with effect</div>;
 * }
 * \`\`\`
 */
export function ${hookName}(options: ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}Options = {}): void {
  const { enabled = true, interval = 1000 } = options;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Setup effect
    const doEffect = (): void => {
      // TODO: Implement your effect logic here
      console.log('Effect running');
    };

    // Run immediately
    doEffect();

    // Setup interval
    intervalRef.current = setInterval(doEffect, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval]);
}
`;
  }

  private generateCallbackHook(hookName: string): string {
    return `/**
 * @file ${hookName}
 * @description Memoized callback hook
 */

import { useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * ${hookName} options
 */
export interface ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}Options {
  // Define your options here
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * ${hookName} - Memoized callback hook
 *
 * @example
 * \`\`\`tsx
 * function MyComponent() {
 *   const handleAction = ${hookName}({
 *     onSuccess: () => console.log('Success!'),
 *     onError: (error) => console.error(error),
 *   });
 *
 *   return <button onClick={handleAction}>Click me</button>;
 * }
 * \`\`\`
 */
export function ${hookName}(
  options: ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}Options = {}
): () => Promise<void> {
  const { onSuccess, onError } = options;

  return useCallback(async () => {
    try {
      // TODO: Implement your callback logic here
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }, [onSuccess, onError]);
}
`;
  }

  private generateCustomHook(hookName: string): string {
    return `/**
 * @file ${hookName}
 * @description Custom React hook
 */

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * ${hookName} options
 */
export interface ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}Options {
  // Define your options here
  initialValue?: string;
}

/**
 * ${hookName} return type
 */
export interface ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}Return {
  value: string;
  setValue: (value: string) => void;
  isReady: boolean;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * ${hookName} - Custom hook description
 *
 * @param options - Hook options
 * @returns Hook return value
 *
 * @example
 * \`\`\`tsx
 * function MyComponent() {
 *   const { value, setValue, isReady } = ${hookName}({
 *     initialValue: 'default',
 *   });
 *
 *   if (!isReady) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   return (
 *     <input
 *       value={value}
 *       onChange={(e) => setValue(e.target.value)}
 *     />
 *   );
 * }
 * \`\`\`
 */
export function ${hookName}(
  options: ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}Options = {}
): ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}Return {
  const { initialValue = '' } = options;
  const [value, setValue] = useState(initialValue);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialization logic
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const handleSetValue = useCallback((newValue: string) => {
    setValue(newValue);
  }, []);

  return {
    value,
    setValue: handleSetValue,
    isReady,
  };
}
`;
  }

  private generateIndexFile(hookName: string): string {
    return `/**
 * ${hookName} exports
 */

export { ${hookName} } from './${hookName}';
export type * from './${hookName}';
`;
  }

  private generateTestFile(hookName: string): string {
    return `/**
 * @file ${hookName} Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ${hookName} } from './${hookName}';

describe('${hookName}', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => ${hookName}());
    expect(result.current).toBeDefined();
  });

  it('handles updates correctly', async () => {
    const { result } = renderHook(() => ${hookName}());

    // Test hook behavior
    // TODO: Add specific test cases for your hook
  });

  it('cleans up properly', () => {
    const { unmount } = renderHook(() => ${hookName}());

    // Unmount should not throw
    expect(() => unmount()).not.toThrow();
  });
});
`;
  }

  protected async afterGenerate(result: { files: string[] }): Promise<void> {
    await super.afterGenerate(result);

    const hookName = this.options.name.startsWith('use')
      ? toCamelCase(this.options.name)
      : `use${toCamelCase(this.options.name).charAt(0).toUpperCase()}${toCamelCase(this.options.name).slice(1)}`;

    this.log(`\n✓ Generated ${hookName} hook successfully!`, 'success');
    this.log(`\nFiles created:`, 'info');
    result.files.forEach(file => {
      this.log(`  ${this.formatPath(file)}`);
    });

    this.log(`\nNext steps:`, 'info');
    this.log(`  1. Implement the hook logic in ${hookName}.ts`);
    this.log(`  2. Import and use the hook in your components`);
    if (this.options.withTest) {
      this.log(`  3. Add test cases and run: npm test`);
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create and run hook generator
 */
export async function generateHook(options: HookGeneratorOptions): Promise<void> {
  const generator = new HookGenerator(options);
  await generator.run();
}
