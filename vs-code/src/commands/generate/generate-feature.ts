import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { BaseCommand } from '../base-command';
import type { CommandContext, CommandMetadata } from '../base-command';

/**
 * Feature options interface
 */
interface FeatureOptions {
  name: string;
  description: string;
  withRoutes: boolean;
  withStore: boolean;
  withAPI: boolean;
  routePrefix?: string;
}

/**
 * Generate Feature Command
 * Creates a complete feature module with routes, store, and API integration
 * Keybinding: Ctrl+Shift+G F
 */
export class GenerateFeatureCommand extends BaseCommand {
  /**
   * Get command metadata for registration
   * @returns Command metadata object
   */
  getMetadata(): CommandMetadata {
    return {
      id: 'enzyme.generate.feature',
      title: 'Enzyme: Generate Feature Module',
      category: 'Enzyme Generate',
      icon: '$(package)',
      keybinding: {
        key: 'ctrl+shift+g f',
        mac: 'cmd+shift+g f',
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

    // Gather feature options
    const options = await this.gatherFeatureOptions();
    if (!options) {
      return; // User cancelled
    }

    // Generate the feature
    await this.withProgress(
      `Generating ${options.name} feature module...`,
      async (progress, token) => {
        progress.report({ message: 'Creating feature structure...' });

        const featurePath = await this.generateFeature(
          workspaceFolder,
          options,
          token
        );

        progress.report({ message: 'Done!', increment: 100 });

        // Open the feature index file
        const indexFile = vscode.Uri.file(
          path.join(featurePath, 'index.ts')
        );
        await this.openFile(indexFile);
      }
    );

    await this.showInfo(
      `Feature module "${options.name}" created successfully!`,
      'Open Folder'
    );
  }

  /**
   *
   */
  /**
   * Gather feature generation options from user
   * @returns Promise resolving to feature options or undefined if cancelled
   */
  private async gatherFeatureOptions(): Promise<FeatureOptions | undefined> {
    // Get feature name
    const name = await this.showInputBox({
      prompt: 'Enter feature name (kebab-case)',
      placeHolder: 'user-management',
      validateInput: (value) => {
        if (!value) {
          return 'Feature name is required';
        }
        if (!/^[a-z][\da-z-]*$/.test(value)) {
          return 'Feature name must be in kebab-case (e.g., user-management)';
        }
        return undefined;
      },
    });

    if (!name) {
      return undefined;
    }

    // Get description
    const description = await this.showInputBox({
      prompt: 'Enter feature description (optional)',
      placeHolder: 'Manages user accounts and profiles',
    });

    // Select feature components
    const componentOptions = [
      { label: 'Include Routes', value: 'routes', picked: true },
      { label: 'Include State Store', value: 'store', picked: true },
      { label: 'Include API Integration', value: 'api', picked: true },
    ];

    const selectedComponents = await vscode.window.showQuickPick(
      componentOptions,
      {
        canPickMany: true,
        title: 'Feature Components',
        placeHolder: 'Select components to include in this feature',
      }
    );

    if (!selectedComponents) {
      return undefined;
    }

    const withRoutes = selectedComponents.some((c) => c.value === 'routes');
    const withStore = selectedComponents.some((c) => c.value === 'store');
    const withAPI = selectedComponents.some((c) => c.value === 'api');

    // Get route prefix if routes are included
    let routePrefix: string | undefined;
    if (withRoutes) {
      routePrefix = await this.showInputBox({
        prompt: 'Enter route prefix (e.g., /users)',
        placeHolder: `/${name}`,
        value: `/${name}`,
        validateInput: (value) => {
          if (value && !value.startsWith('/')) {
            return 'Route prefix must start with /';
          }
          return undefined;
        },
      });

      if (routePrefix === undefined) {
        return undefined;
      }
    }

    const options: FeatureOptions = {
      name,
      description: description || `${name} feature module`,
      withRoutes,
      withStore,
      withAPI,
    };

    if (routePrefix !== undefined) {
      options.routePrefix = routePrefix;
    }

    return options;
  }

  /**
   *
   * @param workspaceFolder
   * @param options
   * @param token
   */
  private async generateFeature(
    workspaceFolder: vscode.WorkspaceFolder,
    options: FeatureOptions,
    token: vscode.CancellationToken
  ): Promise<string> {
    const sourcePath = path.join(workspaceFolder.uri.fsPath, 'src');
    const featurePath = path.join(sourcePath, 'features', options.name);

    // Create feature directory structure
    await fs.mkdir(featurePath, { recursive: true });
    await fs.mkdir(path.join(featurePath, 'components'), { recursive: true });
    await fs.mkdir(path.join(featurePath, 'hooks'), { recursive: true });
    await fs.mkdir(path.join(featurePath, 'types'), { recursive: true });
    await fs.mkdir(path.join(featurePath, 'utils'), { recursive: true });

    if (token.isCancellationRequested) {
      throw new Error('Operation cancelled');
    }

    // Generate main index file
    const indexPath = path.join(featurePath, 'index.ts');
    const indexContent = this.generateIndexContent(options);
    await fs.writeFile(indexPath, indexContent);

    // Generate README
    const readmePath = path.join(featurePath, 'README.md');
    const readmeContent = this.generateReadmeContent(options);
    await fs.writeFile(readmePath, readmeContent);

    // Generate types file
    const typesPath = path.join(featurePath, 'types', 'index.ts');
    const typesContent = this.generateTypesContent(options);
    await fs.writeFile(typesPath, typesContent);

    // Generate routes if requested
    if (options.withRoutes) {
      await this.generateRoutes(featurePath, options);
    }

    // Generate store if requested
    if (options.withStore) {
      await this.generateStore(featurePath, options);
    }

    // Generate API if requested
    if (options.withAPI) {
      await this.generateAPI(featurePath, options);
    }

    return featurePath;
  }

  /**
   *
   * @param options
   */
  private generateIndexContent(options: FeatureOptions): string {
    const { name, withRoutes, withStore, withAPI } = options;

    const exports = [
      "// Feature exports",
      withRoutes ? `export * from './routes';` : null,
      withStore ? `export * from './store';` : null,
      withAPI ? `export * from './api';` : null,
      `export * from './types';`,
    ]
      .filter(Boolean)
      .join('\n');

    return `/**
 * ${name} Feature Module
 * ${options.description}
 */

${exports}
`;
  }

  /**
   *
   * @param options
   */
  private generateReadmeContent(options: FeatureOptions): string {
    return `# ${options.name} Feature

${options.description}

## Structure

\`\`\`
${options.name}/
├── components/     # Feature-specific components
├── hooks/         # Feature-specific hooks
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
${options.withRoutes ? '├── routes/        # Route definitions\n' : ''}${options.withStore ? '├── store/         # State management\n' : ''}${options.withAPI ? '├── api/           # API integration\n' : ''}└── index.ts       # Feature exports
\`\`\`

## Usage

\`\`\`typescript
import { /* exports */ } from '@/features/${options.name}';
\`\`\`

## Features

${options.withRoutes ? `- Route configuration with ${  options.routePrefix || `/${  options.name}`  } prefix\n` : ''}${options.withStore ? '- Zustand store for state management\n' : ''}${options.withAPI ? '- API integration with React Query\n' : ''}
`;
  }

  /**
   *
   * @param options
   */
  private generateTypesContent(options: FeatureOptions): string {
    const pascalName = this.toPascalCase(options.name);

    return `/**
 * ${pascalName} Feature Types
 */

export interface ${pascalName}Entity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Add entity properties here
}

export interface ${pascalName}State {
  entities: ${pascalName}Entity[];
  selectedId: string | null;
  loading: boolean;
  error: string | null;
}

export interface ${pascalName}Filters {
  search?: string;
  // Add filter properties here
}
`;
  }

  /**
   *
   * @param featurePath
   * @param options
   */
  private async generateRoutes(
    featurePath: string,
    options: FeatureOptions
  ): Promise<void> {
    const routesPath = path.join(featurePath, 'routes');
    await fs.mkdir(routesPath, { recursive: true });

    const pascalName = this.toPascalCase(options.name);
    const routePrefix = options.routePrefix || `/${options.name}`;

    const routesContent = `import { RouteObject } from 'react-router-dom';
import { ${pascalName}ListPage } from '../pages/${pascalName}ListPage';
import { ${pascalName}DetailPage } from '../pages/${pascalName}DetailPage';

export const ${options.name.replace(/-/g, '')}Routes: RouteObject[] = [
  {
    path: '${routePrefix}',
    children: [
      {
        index: true,
        element: <${pascalName}ListPage />,
      },
      {
        path: ':id',
        element: <${pascalName}DetailPage />,
      },
    ],
  },
];
`;

    await fs.writeFile(path.join(routesPath, 'index.tsx'), routesContent);

    // Create placeholder pages directory
    const pagesPath = path.join(featurePath, 'pages');
    await fs.mkdir(pagesPath, { recursive: true });

    // Generate list page
    const listPageContent = `import React from 'react';

export const ${pascalName}ListPage: React.FC = () => {
  return (
    <div>
      <h1>${pascalName} List</h1>
      {/* Add list content here */}
    </div>
  );
};
`;
    await fs.writeFile(
      path.join(pagesPath, `${pascalName}ListPage.tsx`),
      listPageContent
    );

    // Generate detail page
    const detailPageContent = `import React from 'react';
import { useParams } from 'react-router-dom';

export const ${pascalName}DetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <h1>${pascalName} Detail</h1>
      <p>ID: {id}</p>
      {/* Add detail content here */}
    </div>
  );
};
`;
    await fs.writeFile(
      path.join(pagesPath, `${pascalName}DetailPage.tsx`),
      detailPageContent
    );
  }

  /**
   *
   * @param featurePath
   * @param options
   */
  private async generateStore(
    featurePath: string,
    options: FeatureOptions
  ): Promise<void> {
    const storePath = path.join(featurePath, 'store');
    await fs.mkdir(storePath, { recursive: true });

    const pascalName = this.toPascalCase(options.name);

    const storeContent = `import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ${pascalName}Entity, ${pascalName}State } from '../types';

interface ${pascalName}Store extends ${pascalName}State {
  // Actions
  setEntities: (entities: ${pascalName}Entity[]) => void;
  selectEntity: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: ${pascalName}State = {
  entities: [],
  selectedId: null,
  loading: false,
  error: null,
};

export const use${pascalName}Store = create<${pascalName}Store>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setEntities: (entities) => set({ entities }),
        selectEntity: (selectedId) => set({ selectedId }),
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        reset: () => set(initialState),
      }),
      {
        name: '${options.name}-store',
      }
    ),
    {
      name: '${pascalName} Store',
    }
  )
);
`;

    await fs.writeFile(path.join(storePath, 'index.ts'), storeContent);
  }

  /**
   *
   * @param featurePath
   * @param options
   */
  private async generateAPI(
    featurePath: string,
    options: FeatureOptions
  ): Promise<void> {
    const apiPath = path.join(featurePath, 'api');
    await fs.mkdir(apiPath, { recursive: true });

    const pascalName = this.toPascalCase(options.name);

    const apiContent = `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ${pascalName}Entity } from '../types';

const API_BASE = '/api/${options.name}';

// API Functions
async function fetch${pascalName}List(): Promise<${pascalName}Entity[]> {
  const response = await fetch(API_BASE);
  if (!response.ok) throw new Error('Failed to fetch ${options.name} list');
  return response.json();
}

async function fetch${pascalName}ById(id: string): Promise<${pascalName}Entity> {
  const response = await fetch(\`\${API_BASE}/\${id}\`);
  if (!response.ok) throw new Error(\`Failed to fetch ${options.name} \${id}\`);
  return response.json();
}

async function create${pascalName}(data: Partial<${pascalName}Entity>): Promise<${pascalName}Entity> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create ${options.name}');
  return response.json();
}

async function update${pascalName}(id: string, data: Partial<${pascalName}Entity>): Promise<${pascalName}Entity> {
  const response = await fetch(\`\${API_BASE}/\${id}\`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(\`Failed to update ${options.name} \${id}\`);
  return response.json();
}

async function delete${pascalName}(id: string): Promise<void> {
  const response = await fetch(\`\${API_BASE}/\${id}\`, { method: 'DELETE' });
  if (!response.ok) throw new Error(\`Failed to delete ${options.name} \${id}\`);
}

// React Query Hooks
export function use${pascalName}List() {
  return useQuery({
    queryKey: ['${options.name}', 'list'],
    queryFn: fetch${pascalName}List,
  });
}

export function use${pascalName}(id: string) {
  return useQuery({
    queryKey: ['${options.name}', id],
    queryFn: () => fetch${pascalName}ById(id),
    enabled: !!id,
  });
}

export function useCreate${pascalName}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: create${pascalName},
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${options.name}'] });
    },
  });
}

export function useUpdate${pascalName}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<${pascalName}Entity> }) =>
      update${pascalName}(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${options.name}'] });
    },
  });
}

export function useDelete${pascalName}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: delete${pascalName},
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${options.name}'] });
    },
  });
}
`;

    await fs.writeFile(path.join(apiPath, 'index.ts'), apiContent);
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
