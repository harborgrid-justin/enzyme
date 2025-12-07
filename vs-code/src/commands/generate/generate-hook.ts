import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { BaseCommand } from '../base-command';
import type { CommandContext, CommandMetadata } from '../base-command';

/**
 * Hook options interface
 */
interface HookOptions {
  name: string;
  category: 'state' | 'effect' | 'data' | 'ui' | 'utility';
  dependencies: string[];
  returnType: string;
  withTests: boolean;
}

/**
 * Generate Hook Command
 * Creates a new custom React hook with tests
 * Keybinding: Ctrl+Shift+G H
 */
export class GenerateHookCommand extends BaseCommand {
  /**
   * Get command metadata for registration
   * @returns Command metadata object
   */
  getMetadata(): CommandMetadata {
    return {
      id: 'enzyme.generate.hook',
      title: 'Enzyme: Generate Hook',
      category: 'Enzyme Generate',
      icon: '$(symbol-method)',
      keybinding: {
        key: 'ctrl+shift+g h',
        mac: 'cmd+shift+g h',
        when: 'editorTextFocus',
      },
    };
  }

  /**
   * Execute the command
   * @param _context - Command execution context
   * @returns Promise that resolves when command completes
   */
  protected async executeCommand(_context: CommandContext): Promise<void> {
    const workspaceFolder = await this.ensureWorkspaceFolder();

    // Gather hook options
    const options = await this.gatherHookOptions();
    if (!options) {
      return; // User cancelled
    }

    // Generate the hook
    await this.withProgress(
      `Generating ${options.name} hook...`,
      async (progress, token) => {
        progress.report({ message: 'Creating hook files...' });

        const hookPath = await this.generateHook(
          workspaceFolder,
          options,
          token
        );

        progress.report({ message: 'Opening files...', increment: 80 });

        // Open the generated hook file
        const hookFile = vscode.Uri.file(hookPath);
        await this.openFile(hookFile);

        progress.report({ message: 'Done!', increment: 100 });
      }
    );

    await this.showInfo(`Hook "${options.name}" created successfully!`);
  }

  /**
   *
   */
  /**
   * Gather hook generation options from user
   * @returns Promise resolving to hook options or undefined if cancelled
   */
  private async gatherHookOptions(): Promise<HookOptions | undefined> {
    // Get hook name (auto-prefix with 'use')
    const rawName = await this.showInputBox({
      prompt: 'Enter hook name (will be prefixed with "use" if not present)',
      placeHolder: 'Counter',
      validateInput: (value) => {
        if (!value) {
          return 'Hook name is required';
        }
        const hookName = value.startsWith('use') ? value : `use${value}`;
        if (!/^use[A-Z][\dA-Za-z]*$/.test(hookName)) {
          return 'Hook name must follow the pattern use + PascalCase (e.g., useCounter)';
        }
        return undefined;
      },
    });

    if (!rawName) {
      return undefined;
    }

    const name = rawName.startsWith('use') ? rawName : `use${rawName}`;

    // Select category
    const categoryOptions = [
      {
        label: '$(database) State Management',
        description: 'Hook for managing component state',
        value: 'state' as const,
      },
      {
        label: '$(zap) Side Effects',
        description: 'Hook for side effects and lifecycle',
        value: 'effect' as const,
      },
      {
        label: '$(cloud-download) Data Fetching',
        description: 'Hook for fetching and caching data',
        value: 'data' as const,
      },
      {
        label: '$(paintcan) UI/UX',
        description: 'Hook for UI interactions and behavior',
        value: 'ui' as const,
      },
      {
        label: '$(tools) Utility',
        description: 'General utility hook',
        value: 'utility' as const,
      },
    ];

    const categorySelection = await this.showQuickPick(categoryOptions, {
      title: 'Select Hook Category',
      placeHolder: 'Choose the category for this hook',
    });

    if (!categorySelection) {
      return undefined;
    }

    // Select dependencies
    const dependencyOptions = [
      { label: 'useState', value: 'useState' },
      { label: 'useEffect', value: 'useEffect' },
      { label: 'useCallback', value: 'useCallback' },
      { label: 'useMemo', value: 'useMemo' },
      { label: 'useRef', value: 'useRef' },
      { label: 'useContext', value: 'useContext' },
      { label: 'useReducer', value: 'useReducer' },
    ];

    const selectedDeps = await vscode.window.showQuickPick(dependencyOptions, {
      canPickMany: true,
      title: 'Select React Dependencies',
      placeHolder: 'Choose React hooks to use (optional)',
    });

    const dependencies = selectedDeps?.map((d) => d.value) ?? [];

    // Get return type
    const returnType = await this.showInputBox({
      prompt: 'Enter return type (TypeScript)',
      placeHolder: 'void | T | [T, (value: T) => void]',
      value: 'void',
    });

    if (returnType === undefined) {
      return undefined;
    }

    // Options
    const withTests = (await this.showQuickPick(
      [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
      {
        title: 'Include Tests?',
        placeHolder: 'Generate test file for this hook?',
      }
    ))?.value ?? true;

    return {
      name,
      category: categorySelection.value,
      dependencies,
      returnType: returnType || 'void',
      withTests,
    };
  }

  /**
   *
   * @param workspaceFolder
   * @param options
   * @param token
   */
  private async generateHook(
    workspaceFolder: vscode.WorkspaceFolder,
    options: HookOptions,
    token: vscode.CancellationToken
  ): Promise<string> {
    const sourcePath = path.join(workspaceFolder.uri.fsPath, 'src');
    const hooksPath = path.join(sourcePath, 'hooks', options.category);

    // Create directory
    await fs.mkdir(hooksPath, { recursive: true });

    if (token.isCancellationRequested) {
      throw new Error('Operation cancelled');
    }

    // Generate hook file
    const hookPath = path.join(hooksPath, `${options.name}.ts`);
    const hookContent = this.generateHookContent(options);
    await fs.writeFile(hookPath, hookContent);

    // Generate test file if requested
    if (options.withTests) {
      const testPath = path.join(hooksPath, `${options.name}.test.ts`);
      const testContent = this.generateTestContent(options);
      await fs.writeFile(testPath, testContent);
    }

    // Update index file
    await this.updateIndexFile(hooksPath, options.name);

    return hookPath;
  }

  /**
   *
   * @param options
   */
  private generateHookContent(options: HookOptions): string {
    const { name, dependencies, returnType, category } = options;

    const imports =
      dependencies.length > 0
        ? `import { ${dependencies.join(', ')} } from 'react';`
        : "import { useEffect } from 'react';";

    let hookImplementation = '';

    switch (category) {
      case 'state':
        hookImplementation = `
export function ${name}(initialValue?: unknown): ${returnType} {
  const [state, setState] = useState(initialValue);

  const updateState = useCallback((value: unknown) => {
    setState(value);
  }, []);

  return [state, updateState] as ${returnType};
}
`;
        break;

      case 'effect':
        hookImplementation = `
export function ${name}(): ${returnType} {
  useEffect(() => {
    // Add your effect logic here

    return () => {
      // Cleanup logic
    };
  }, []);
}
`;
        break;

      case 'data':
        hookImplementation = `
export function ${name}<T = unknown>(key: string): ${returnType} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Add your data fetching logic here
        const response = await fetch(\`/api/\${key}\`);
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [key]);

  return { data, loading, error } as ${returnType};
}
`;
        break;

      case 'ui':
        hookImplementation = `
export function ${name}(): ${returnType} {
  const [isVisible, setIsVisible] = useState(false);

  const show = useCallback(() => setIsVisible(true), []);
  const hide = useCallback(() => setIsVisible(false), []);
  const toggle = useCallback(() => setIsVisible(prev => !prev), []);

  return { isVisible, show, hide, toggle } as ${returnType};
}
`;
        break;

      case 'utility':
      default:
        hookImplementation = `
export function ${name}(): ${returnType} {
  // Add your hook logic here
}
`;
        break;
    }

    return `${imports}\n${hookImplementation}`;
  }

  /**
   *
   * @param options
   */
  private generateTestContent(options: HookOptions): string {
    const { name } = options;

    return `import { renderHook, act } from '@testing-library/react';
import { ${name} } from './${name}';

describe('${name}', () => {
  it('should initialize correctly', () => {
    const { result } = renderHook(() => ${name}());
    expect(result.current).toBeDefined();
  });

  it('should handle updates correctly', () => {
    const { result } = renderHook(() => ${name}());

    act(() => {
      // Add your test logic here
    });

    // Add assertions
  });
});
`;
  }

  /**
   *
   * @param hooksPath
   * @param hookName
   */
  private async updateIndexFile(
    hooksPath: string,
    hookName: string
  ): Promise<void> {
    const indexPath = path.join(hooksPath, 'index.ts');
    let indexContent = '';

    try {
      indexContent = await fs.readFile(indexPath, 'utf-8');
    } catch {
      // File doesn't exist, create it
      indexContent = '// Auto-generated hooks index\n';
    }

    // Add export if not already present
    const exportStatement = `export { ${hookName} } from './${hookName}';\n`;
    if (!indexContent.includes(exportStatement)) {
      indexContent += exportStatement;
      await fs.writeFile(indexPath, indexContent);
    }
  }
}
