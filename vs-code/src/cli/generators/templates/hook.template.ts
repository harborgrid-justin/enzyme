import { GeneratorOptions, GeneratorTemplate } from '../index';

export function hookTemplate(options: GeneratorOptions): GeneratorTemplate {
  const { name, path: basePath = 'src/hooks', skipTests } = options;

  // Ensure hook name starts with 'use'
  const hookName = name.startsWith('use') ? name : `use${name}`;
  const hookPath = `${basePath}/${hookName}.ts`;

  const files = [];

  // Main hook file
  files.push({
    path: hookPath,
    content: generateHook(hookName),
  });

  // Types file
  files.push({
    path: `${basePath}/${hookName}.types.ts`,
    content: generateTypes(hookName),
  });

  // Test file
  if (!skipTests) {
    files.push({
      path: `${basePath}/${hookName}.test.ts`,
      content: generateTest(hookName),
    });
  }

  return {
    type: 'hook',
    files,
  };
}

function generateHook(name: string): string {
  const stateName = name.replace(/^use/, '').toLowerCase();

  return `import { useState, useEffect, useCallback } from 'react';
import { ${name}Options, ${name}Result } from './${name}.types';

export function ${name}(options?: ${name}Options): ${name}Result {
  const [${stateName}, set${capitalize(stateName)}] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Add your hook logic here
      const result = await doSomething(options);
      set${capitalize(stateName)}(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  useEffect(() => {
    if (options?.autoExecute) {
      execute();
    }
  }, [execute, options?.autoExecute]);

  return {
    ${stateName},
    isLoading,
    error,
    execute,
  };
}

// Helper function - replace with your actual logic
async function doSomething(options?: ${name}Options): Promise<any> {
  // Implement your logic here
  return null;
}
`;
}

function generateTypes(name: string): string {
  const stateName = name.replace(/^use/, '').toLowerCase();

  return `export interface ${name}Options {
  autoExecute?: boolean;
  // Add your options here
}

export interface ${name}Result {
  ${stateName}: any;
  isLoading: boolean;
  error: Error | null;
  execute: () => Promise<void>;
}
`;
}

function generateTest(name: string): string {
  return `import { renderHook, waitFor } from '@testing-library/react';
import { ${name} } from './${name}';

describe('${name}', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => ${name}());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should execute successfully', async () => {
    const { result } = renderHook(() => ${name}());

    await result.current.execute();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should auto-execute when option is set', async () => {
    const { result } = renderHook(() => ${name}({ autoExecute: true }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});
`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
