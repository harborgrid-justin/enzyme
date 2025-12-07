import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { BaseCommand } from '../base-command';
import type { CommandContext, CommandMetadata } from '../base-command';

/**
 * API options interface
 */
interface APIOptions {
  resourceName: string;
  endpoints: Array<'list' | 'get' | 'create' | 'update' | 'delete'>;
  withTypes: boolean;
  withMocks: boolean;
  baseUrl?: string;
}

/**
 * Generate API Command
 * Creates API integration with React Query hooks
 * Keybinding: Ctrl+Shift+G A
 */
export class GenerateAPICommand extends BaseCommand {
  /**
   * Get command metadata for registration
   * @returns Command metadata object
   */
  getMetadata(): CommandMetadata {
    return {
      id: 'enzyme.generate.api',
      title: 'Enzyme: Generate API Integration',
      category: 'Enzyme Generate',
      icon: '$(cloud)',
      keybinding: {
        key: 'ctrl+shift+g a',
        mac: 'cmd+shift+g a',
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

    // Gather API options
    const options = await this.gatherAPIOptions();
    if (!options) {
      return; // User cancelled
    }

    // Generate the API
    await this.withProgress(
      `Generating API for ${options.resourceName}...`,
      async (progress, token) => {
        progress.report({ message: 'Creating API files...' });

        const apiPath = await this.generateAPI(
          workspaceFolder,
          options,
          token
        );

        progress.report({ message: 'Opening files...', increment: 80 });

        // Open the generated API file
        const apiFile = vscode.Uri.file(apiPath);
        await this.openFile(apiFile);

        progress.report({ message: 'Done!', increment: 100 });
      }
    );

    await this.showInfo(
      `API integration for "${options.resourceName}" created successfully!`
    );
  }

  /**
   *
   */
  /**
   * Gather API generation options from user
   * @returns Promise resolving to API options or undefined if cancelled
   */
  private async gatherAPIOptions(): Promise<APIOptions | undefined> {
    // Get resource name
    const resourceName = await this.showInputBox({
      prompt: 'Enter resource name (singular, kebab-case)',
      placeHolder: 'user',
      validateInput: (value) => {
        if (!value) {
          return 'Resource name is required';
        }
        if (!/^[a-z][\da-z-]*$/.test(value)) {
          return 'Resource name must be in kebab-case (e.g., user-profile)';
        }
        return undefined;
      },
    });

    if (!resourceName) {
      return undefined;
    }

    // Select endpoints
    const endpointOptions = [
      { label: 'GET /resource - List all', value: 'list' as const, picked: true },
      { label: 'GET /resource/:id - Get by ID', value: 'get' as const, picked: true },
      { label: 'POST /resource - Create', value: 'create' as const, picked: true },
      { label: 'PUT /resource/:id - Update', value: 'update' as const, picked: true },
      { label: 'DELETE /resource/:id - Delete', value: 'delete' as const, picked: true },
    ];

    const selectedEndpoints = await vscode.window.showQuickPick(
      endpointOptions,
      {
        canPickMany: true,
        title: 'Select API Endpoints',
        placeHolder: 'Choose which endpoints to generate',
      }
    );

    if (!selectedEndpoints || selectedEndpoints.length === 0) {
      return undefined;
    }

    const endpoints = selectedEndpoints.map((e) => e.value);

    // Additional options
    const optionItems = [
      { label: 'Generate TypeScript Types', value: 'types', picked: true },
      { label: 'Generate Mock Data', value: 'mocks', picked: false },
    ];

    const selectedOptions = await vscode.window.showQuickPick(optionItems, {
      canPickMany: true,
      title: 'Additional Options',
      placeHolder: 'Select additional options',
    });

    const withTypes = selectedOptions?.some((o) => o.value === 'types') ?? true;
    const withMocks = selectedOptions?.some((o) => o.value === 'mocks') ?? false;

    // Get base URL
    const baseUrl = await this.showInputBox({
      prompt: 'Enter API base URL (optional)',
      placeHolder: '/api',
      value: '/api',
    });

    return {
      resourceName,
      endpoints,
      withTypes,
      withMocks,
      baseUrl: baseUrl || '/api',
    };
  }

  /**
   *
   * @param workspaceFolder
   * @param options
   * @param token
   */
  private async generateAPI(
    workspaceFolder: vscode.WorkspaceFolder,
    options: APIOptions,
    token: vscode.CancellationToken
  ): Promise<string> {
    const sourcePath = path.join(workspaceFolder.uri.fsPath, 'src');
    const apiPath = path.join(sourcePath, 'api', options.resourceName);

    // Create directory
    await fs.mkdir(apiPath, { recursive: true });

    if (token.isCancellationRequested) {
      throw new Error('Operation cancelled');
    }

    // Generate types file if requested
    if (options.withTypes) {
      const typesPath = path.join(apiPath, 'types.ts');
      const typesContent = this.generateTypesContent(options);
      await fs.writeFile(typesPath, typesContent);
    }

    // Generate API client file
    const clientPath = path.join(apiPath, 'client.ts');
    const clientContent = this.generateClientContent(options);
    await fs.writeFile(clientPath, clientContent);

    // Generate React Query hooks file
    const hooksPath = path.join(apiPath, 'hooks.ts');
    const hooksContent = this.generateHooksContent(options);
    await fs.writeFile(hooksPath, hooksContent);

    // Generate mocks if requested
    if (options.withMocks) {
      const mocksPath = path.join(apiPath, 'mocks.ts');
      const mocksContent = this.generateMocksContent(options);
      await fs.writeFile(mocksPath, mocksContent);
    }

    // Generate index file
    const indexPath = path.join(apiPath, 'index.ts');
    const indexContent = this.generateIndexContent(options);
    await fs.writeFile(indexPath, indexContent);

    return hooksPath;
  }

  /**
   *
   * @param options
   */
  private generateTypesContent(options: APIOptions): string {
    const pascalName = this.toPascalCase(options.resourceName);

    return `/**
 * ${pascalName} API Types
 */

export interface ${pascalName} {
  id: string;
  createdAt: string;
  updatedAt: string;
  // Add your resource properties here
}

export interface ${pascalName}CreateInput {
  // Add create input properties here
}

export interface ${pascalName}UpdateInput {
  // Add update input properties here
}

export interface ${pascalName}ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ${pascalName}ListResponse {
  data: ${pascalName}[];
  total: number;
  page: number;
  pageSize: number;
}
`;
  }

  /**
   *
   * @param options
   */
  private generateClientContent(options: APIOptions): string {
    const { resourceName, endpoints, baseUrl, withTypes } = options;
    const pascalName = this.toPascalCase(resourceName);

    const typeImports = withTypes
      ? `import {
  ${pascalName},
  ${endpoints.includes('create') ? `${pascalName}CreateInput,` : ''}
  ${endpoints.includes('update') ? `${pascalName}UpdateInput,` : ''}
  ${endpoints.includes('list') ? `${pascalName}ListParams,` : ''}
  ${endpoints.includes('list') ? `${pascalName}ListResponse,` : ''}
} from './types';`
      : '';

    const apiBase = `const API_BASE = '${baseUrl}/${resourceName}';`;

    const functions: string[] = [];

    if (endpoints.includes('list')) {
      functions.push(`
/**
 * Fetch list of ${resourceName}s
 */
export async function fetch${pascalName}List(
  params?: ${withTypes ? `${pascalName}ListParams` : 'Record<string, unknown>'}
): Promise<${withTypes ? `${pascalName}ListResponse` : 'unknown'}> {
  const queryString = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
  const response = await fetch(\`\${API_BASE}\${queryString}\`);
  if (!response.ok) throw new Error('Failed to fetch ${resourceName} list');
  return response.json();
}`);
    }

    if (endpoints.includes('get')) {
      functions.push(`
/**
 * Fetch single ${resourceName} by ID
 */
export async function fetch${pascalName}ById(
  id: string
): Promise<${withTypes ? pascalName : 'unknown'}> {
  const response = await fetch(\`\${API_BASE}/\${id}\`);
  if (!response.ok) throw new Error(\`Failed to fetch ${resourceName} \${id}\`);
  return response.json();
}`);
    }

    if (endpoints.includes('create')) {
      functions.push(`
/**
 * Create new ${resourceName}
 */
export async function create${pascalName}(
  data: ${withTypes ? `${pascalName}CreateInput` : 'unknown'}
): Promise<${withTypes ? pascalName : 'unknown'}> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create ${resourceName}');
  return response.json();
}`);
    }

    if (endpoints.includes('update')) {
      functions.push(`
/**
 * Update existing ${resourceName}
 */
export async function update${pascalName}(
  id: string,
  data: ${withTypes ? `${pascalName}UpdateInput` : 'unknown'}
): Promise<${withTypes ? pascalName : 'unknown'}> {
  const response = await fetch(\`\${API_BASE}/\${id}\`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(\`Failed to update ${resourceName} \${id}\`);
  return response.json();
}`);
    }

    if (endpoints.includes('delete')) {
      functions.push(`
/**
 * Delete ${resourceName}
 */
export async function delete${pascalName}(id: string): Promise<void> {
  const response = await fetch(\`\${API_BASE}/\${id}\`, { method: 'DELETE' });
  if (!response.ok) throw new Error(\`Failed to delete ${resourceName} \${id}\`);
}`);
    }

    return `${typeImports}

${apiBase}

${functions.join('\n')}
`;
  }

  /**
   *
   * @param options
   */
  private generateHooksContent(options: APIOptions): string {
    const { resourceName, endpoints, withTypes } = options;
    const pascalName = this.toPascalCase(resourceName);

    const imports = `import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import * as client from './client';${withTypes ? `\nimport { ${pascalName}ListParams, ${pascalName}CreateInput, ${pascalName}UpdateInput } from './types';` : ''}`;

    const hooks: string[] = [];

    if (endpoints.includes('list')) {
      hooks.push(`
/**
 * Hook to fetch ${resourceName} list
 */
export function use${pascalName}List(
  params?: ${withTypes ? `${pascalName}ListParams` : 'Record<string, unknown>'},
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['${resourceName}', 'list', params],
    queryFn: () => client.fetch${pascalName}List(params),
    ...options,
  });
}`);
    }

    if (endpoints.includes('get')) {
      hooks.push(`
/**
 * Hook to fetch single ${resourceName}
 */
export function use${pascalName}(
  id: string,
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['${resourceName}', id],
    queryFn: () => client.fetch${pascalName}ById(id),
    enabled: !!id,
    ...options,
  });
}`);
    }

    if (endpoints.includes('create')) {
      hooks.push(`
/**
 * Hook to create ${resourceName}
 */
export function useCreate${pascalName}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ${withTypes ? `${pascalName}CreateInput` : 'unknown'}) =>
      client.create${pascalName}(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${resourceName}'] });
    },
  });
}`);
    }

    if (endpoints.includes('update')) {
      hooks.push(`
/**
 * Hook to update ${resourceName}
 */
export function useUpdate${pascalName}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ${withTypes ? `${pascalName}UpdateInput` : 'unknown'} }) =>
      client.update${pascalName}(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['${resourceName}'] });
      queryClient.invalidateQueries({ queryKey: ['${resourceName}', variables.id] });
    },
  });
}`);
    }

    if (endpoints.includes('delete')) {
      hooks.push(`
/**
 * Hook to delete ${resourceName}
 */
export function useDelete${pascalName}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => client.delete${pascalName}(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${resourceName}'] });
    },
  });
}`);
    }

    return `${imports}

${hooks.join('\n')}
`;
  }

  /**
   *
   * @param options
   */
  private generateMocksContent(options: APIOptions): string {
    const { resourceName, withTypes } = options;
    const pascalName = this.toPascalCase(resourceName);

    const typeImport = withTypes ? `import { ${pascalName} } from './types';` : '';

    return `${typeImport}

/**
 * Mock data for ${resourceName}
 */
export const mock${pascalName}Data: ${withTypes ? `${pascalName}[]` : 'unknown[]'} = [
  {
    id: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Add mock properties here
  },
  {
    id: '2',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Add mock properties here
  },
];

/**
 * Mock API handlers for MSW or testing
 */
export const ${resourceName}MockHandlers = {
  // Add MSW handlers here if using MSW
};
`;
  }

  /**
   *
   * @param options
   */
  private generateIndexContent(options: APIOptions): string {
    const { withTypes, withMocks } = options;

    return `/**
 * ${this.toPascalCase(options.resourceName)} API Module
 */

export * from './client';
export * from './hooks';${withTypes ? `\nexport * from './types';` : ''}${withMocks ? `\nexport * from './mocks';` : ''}
`;
  }

  /**
   *
   * @param string_
   */
  private toPascalCase(string_: string): string {
    return string_
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }
}
