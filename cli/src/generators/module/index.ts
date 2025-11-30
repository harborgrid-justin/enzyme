/**
 * @file Module Generator
 * @description Generates complete feature modules with routes, state, API, and components
 */

import * as path from 'path';
import { BaseGenerator, type GeneratorOptions, type GeneratedFile } from '../base';
import type { ModuleOptions } from '../types';
import {
  resolveModulePath,
  toPascalCase,
  toCamelCase,
  toKebabCase,
  validateIdentifier,
} from '../utils';

// ============================================================================
// Module Generator
// ============================================================================

export interface ModuleGeneratorOptions extends GeneratorOptions, ModuleOptions {}

export class ModuleGenerator extends BaseGenerator<ModuleGeneratorOptions> {
  protected getName(): string {
    return 'Module';
  }

  protected validate(): void {
    validateIdentifier(this.options.name, 'Module name');
  }

  protected async generate(): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];
    const moduleName = toKebabCase(this.options.name);
    const modulePath = resolveModulePath(this.options.name);

    // Determine what to include
    const includeRoutes = this.options.withRoutes || this.options.full;
    const includeState = this.options.withState || this.options.full;
    const includeApi = this.options.withApi || this.options.full;
    const includeComponents = this.options.withComponents || this.options.full;
    const includeHooks = this.options.withHooks || this.options.full;

    // Generate module index
    files.push({
      path: path.join(modulePath, 'index.ts'),
      content: this.generateModuleIndex(includeRoutes, includeState, includeApi, includeComponents, includeHooks),
    });

    // Generate README
    files.push({
      path: path.join(modulePath, 'README.md'),
      content: this.generateReadme(),
    });

    // Generate routes
    if (includeRoutes) {
      files.push(...this.generateRoutes());
    }

    // Generate state slice
    if (includeState) {
      files.push(...this.generateState());
    }

    // Generate API service
    if (includeApi) {
      files.push(...this.generateApi());
    }

    // Generate components
    if (includeComponents) {
      files.push(...this.generateComponents());
    }

    // Generate hooks
    if (includeHooks) {
      files.push(...this.generateHooks());
    }

    // Generate types
    files.push({
      path: path.join(modulePath, 'types.ts'),
      content: this.generateTypes(),
    });

    return files;
  }

  // ==========================================================================
  // File Generation Methods
  // ==========================================================================

  private generateModuleIndex(
    withRoutes: boolean,
    withState: boolean,
    withApi: boolean,
    withComponents: boolean,
    withHooks: boolean
  ): string {
    const moduleName = toPascalCase(this.options.name);

    let template = `/**
 * @file ${moduleName} Module
 * @description ${moduleName} feature module with full functionality
 */

`;

    if (withComponents) {
      template += `// Components\nexport * from './components';\n\n`;
    }

    if (withHooks) {
      template += `// Hooks\nexport * from './hooks';\n\n`;
    }

    if (withApi) {
      template += `// API\nexport * from './api';\n\n`;
    }

    if (withState) {
      template += `// State\nexport * from './state';\n\n`;
    }

    if (withRoutes) {
      template += `// Routes\nexport * from './routes';\n\n`;
    }

    template += `// Types\nexport * from './types';\n`;

    return template;
  }

  private generateReadme(): string {
    const moduleName = toPascalCase(this.options.name);

    return `# ${moduleName} Module

This is a feature module for ${moduleName} functionality.

## Structure

\`\`\`
${toKebabCase(this.options.name)}/
├── index.ts           # Module exports
├── types.ts           # TypeScript types
${this.options.withComponents || this.options.full ? '├── components/       # Feature components\n' : ''}${this.options.withHooks || this.options.full ? '├── hooks/            # Custom hooks\n' : ''}${this.options.withApi || this.options.full ? '├── api/              # API service\n' : ''}${this.options.withState || this.options.full ? '├── state/            # State management\n' : ''}${this.options.withRoutes || this.options.full ? '└── routes/           # Route definitions\n' : ''}\`\`\`

## Usage

\`\`\`tsx
import { ${moduleName}Provider } from './${toKebabCase(this.options.name)}';

function App() {
  return (
    <${moduleName}Provider>
      {/* Your app content */}
    </${moduleName}Provider>
  );
}
\`\`\`

## Development

1. Add your feature components in \`components/\`
2. Define custom hooks in \`hooks/\`
3. Implement API calls in \`api/\`
4. Manage state in \`state/\`
5. Define routes in \`routes/\`

## Testing

Run tests for this module:
\`\`\`bash
npm test -- ${toKebabCase(this.options.name)}
\`\`\`
`;
  }

  private generateRoutes(): GeneratedFile[] {
    const moduleName = toPascalCase(this.options.name);
    const modulePath = resolveModulePath(this.options.name);

    return [
      {
        path: path.join(modulePath, 'routes', 'index.tsx'),
        content: `/**
 * @file ${moduleName} Routes
 * @description Route definitions for ${moduleName} module
 */

import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

// Lazy load route components
const ${moduleName}Index = lazy(() => import('./${moduleName}Index'));
const ${moduleName}Detail = lazy(() => import('./${moduleName}Detail'));

/**
 * ${moduleName} routes configuration
 */
export const ${toCamelCase(this.options.name)}Routes: RouteObject[] = [
  {
    path: '/${toKebabCase(this.options.name)}',
    children: [
      {
        index: true,
        element: <${moduleName}Index />,
      },
      {
        path: ':id',
        element: <${moduleName}Detail />,
      },
    ],
  },
];
`,
      },
      {
        path: path.join(modulePath, 'routes', `${moduleName}Index.tsx`),
        content: `/**
 * @file ${moduleName} Index Route
 */

import { memo } from 'react';
import { Page } from '@missionfabric-js/enzyme/ui';

const ${moduleName}Index = memo((): React.ReactElement => {
  return (
    <Page title="${moduleName}">
      <div>
        <h1>${moduleName} Index</h1>
        <p>Welcome to the ${moduleName} module.</p>
      </div>
    </Page>
  );
});

${moduleName}Index.displayName = '${moduleName}Index';

export default ${moduleName}Index;
`,
      },
      {
        path: path.join(modulePath, 'routes', `${moduleName}Detail.tsx`),
        content: `/**
 * @file ${moduleName} Detail Route
 */

import { memo } from 'react';
import { useParams } from 'react-router-dom';
import { Page } from '@missionfabric-js/enzyme/ui';

const ${moduleName}Detail = memo((): React.ReactElement => {
  const { id } = useParams<{ id: string }>();

  return (
    <Page title="${moduleName} Detail">
      <div>
        <h1>${moduleName} Detail</h1>
        <p>Viewing ${moduleName}: {id}</p>
      </div>
    </Page>
  );
});

${moduleName}Detail.displayName = '${moduleName}Detail';

export default ${moduleName}Detail;
`,
      },
    ];
  }

  private generateState(): GeneratedFile[] {
    const moduleName = toPascalCase(this.options.name);
    const camelName = toCamelCase(this.options.name);
    const modulePath = resolveModulePath(this.options.name);

    return [
      {
        path: path.join(modulePath, 'state', 'index.ts'),
        content: `/**
 * @file ${moduleName} State
 * @description State management for ${moduleName} module
 */

export { ${camelName}Slice } from './${camelName}Slice';
export type { ${moduleName}State, ${moduleName}Actions } from './${camelName}Slice';
`,
      },
      {
        path: path.join(modulePath, 'state', `${camelName}Slice.ts`),
        content: `/**
 * @file ${moduleName} Slice
 * @description Zustand slice for ${moduleName} state management
 */

import { createSlice } from '@missionfabric-js/enzyme/state';

// ============================================================================
// Types
// ============================================================================

/**
 * ${moduleName} item
 */
export interface ${moduleName}Item {
  id: string;
  name: string;
  createdAt: string;
}

/**
 * ${moduleName} state interface
 */
export interface ${moduleName}State {
  items: ${moduleName}Item[];
  selectedItem: ${moduleName}Item | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * ${moduleName} actions interface
 */
export interface ${moduleName}Actions {
  setItems: (items: ${moduleName}Item[]) => void;
  addItem: (item: ${moduleName}Item) => void;
  removeItem: (id: string) => void;
  selectItem: (item: ${moduleName}Item | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: ${moduleName}State = {
  items: [],
  selectedItem: null,
  isLoading: false,
  error: null,
};

// ============================================================================
// Slice
// ============================================================================

/**
 * ${moduleName} slice
 */
export const ${camelName}Slice = createSlice<${moduleName}State, ${moduleName}Actions & Record<string, (...args: never[]) => unknown>>({
  name: '${camelName}',
  initialState,
  actions: (set) => ({
    setItems: (items) => {
      set((state) => {
        state.items = items;
      }, 'setItems');
    },

    addItem: (item) => {
      set((state) => {
        state.items.push(item);
      }, 'addItem');
    },

    removeItem: (id) => {
      set((state) => {
        state.items = state.items.filter((item) => item.id !== id);
        if (state.selectedItem?.id === id) {
          state.selectedItem = null;
        }
      }, 'removeItem');
    },

    selectItem: (item) => {
      set((state) => {
        state.selectedItem = item;
      }, 'selectItem');
    },

    setLoading: (loading) => {
      set((state) => {
        state.isLoading = loading;
      }, 'setLoading');
    },

    setError: (error) => {
      set((state) => {
        state.error = error;
      }, 'setError');
    },

    reset: () => {
      set(initialState, 'reset');
    },
  }),
});
`,
      },
    ];
  }

  private generateApi(): GeneratedFile[] {
    const moduleName = toPascalCase(this.options.name);
    const camelName = toCamelCase(this.options.name);
    const kebabName = toKebabCase(this.options.name);
    const modulePath = resolveModulePath(this.options.name);

    return [
      {
        path: path.join(modulePath, 'api', 'index.ts'),
        content: `/**
 * @file ${moduleName} API
 * @description API service for ${moduleName} module
 */

export { ${camelName}Api } from './${camelName}Api';
export { use${moduleName}Query, use${moduleName}Mutation } from './hooks';
`,
      },
      {
        path: path.join(modulePath, 'api', `${camelName}Api.ts`),
        content: `/**
 * @file ${moduleName} API Service
 * @description API client for ${moduleName} operations
 */

import type { ${moduleName}Item } from '../types';

/**
 * ${moduleName} API client
 */
export const ${camelName}Api = {
  /**
   * Get all items
   */
  async getAll(): Promise<${moduleName}Item[]> {
    const response = await fetch('/api/${kebabName}');
    if (!response.ok) {
      throw new Error('Failed to fetch ${kebabName}');
    }
    return response.json();
  },

  /**
   * Get item by ID
   */
  async getById(id: string): Promise<${moduleName}Item> {
    const response = await fetch(\`/api/${kebabName}/\${id}\`);
    if (!response.ok) {
      throw new Error(\`Failed to fetch ${kebabName} \${id}\`);
    }
    return response.json();
  },

  /**
   * Create new item
   */
  async create(data: Omit<${moduleName}Item, 'id' | 'createdAt'>): Promise<${moduleName}Item> {
    const response = await fetch('/api/${kebabName}', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create ${kebabName}');
    }
    return response.json();
  },

  /**
   * Update item
   */
  async update(id: string, data: Partial<${moduleName}Item>): Promise<${moduleName}Item> {
    const response = await fetch(\`/api/${kebabName}/\${id}\`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(\`Failed to update ${kebabName} \${id}\`);
    }
    return response.json();
  },

  /**
   * Delete item
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(\`/api/${kebabName}/\${id}\`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(\`Failed to delete ${kebabName} \${id}\`);
    }
  },
};
`,
      },
      {
        path: path.join(modulePath, 'api', 'hooks.ts'),
        content: `/**
 * @file ${moduleName} API Hooks
 * @description React Query hooks for ${moduleName} API
 */

import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';
import { ${camelName}Api } from './${camelName}Api';
import type { ${moduleName}Item } from '../types';

/**
 * Query key factory
 */
export const ${camelName}Keys = {
  all: ['${camelName}'] as const,
  lists: () => [...${camelName}Keys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...${camelName}Keys.lists(), filters] as const,
  details: () => [...${camelName}Keys.all, 'detail'] as const,
  detail: (id: string) => [...${camelName}Keys.details(), id] as const,
};

/**
 * Hook to fetch all ${moduleName} items
 */
export function use${moduleName}Query(): UseQueryResult<${moduleName}Item[], Error> {
  return useQuery({
    queryKey: ${camelName}Keys.lists(),
    queryFn: () => ${camelName}Api.getAll(),
  });
}

/**
 * Hook to fetch ${moduleName} item by ID
 */
export function use${moduleName}DetailQuery(id: string): UseQueryResult<${moduleName}Item, Error> {
  return useQuery({
    queryKey: ${camelName}Keys.detail(id),
    queryFn: () => ${camelName}Api.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook to create ${moduleName} item
 */
export function use${moduleName}Mutation(): UseMutationResult<
  ${moduleName}Item,
  Error,
  Omit<${moduleName}Item, 'id' | 'createdAt'>
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => ${camelName}Api.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ${camelName}Keys.lists() });
    },
  });
}

/**
 * Hook to update ${moduleName} item
 */
export function use${moduleName}UpdateMutation(): UseMutationResult<
  ${moduleName}Item,
  Error,
  { id: string; data: Partial<${moduleName}Item> }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => ${camelName}Api.update(id, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ${camelName}Keys.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: ${camelName}Keys.lists() });
    },
  });
}

/**
 * Hook to delete ${moduleName} item
 */
export function use${moduleName}DeleteMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => ${camelName}Api.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ${camelName}Keys.lists() });
    },
  });
}
`,
      },
    ];
  }

  private generateComponents(): GeneratedFile[] {
    const moduleName = toPascalCase(this.options.name);
    const modulePath = resolveModulePath(this.options.name);

    return [
      {
        path: path.join(modulePath, 'components', 'index.ts'),
        content: `/**
 * @file ${moduleName} Components
 * @description Components for ${moduleName} module
 */

export { ${moduleName}List } from './${moduleName}List';
export { ${moduleName}Item } from './${moduleName}Item';
`,
      },
      {
        path: path.join(modulePath, 'components', `${moduleName}List.tsx`),
        content: `/**
 * @file ${moduleName}List Component
 */

import { memo } from 'react';

export interface ${moduleName}ListProps {
  items: Array<{ id: string; name: string }>;
  onSelect?: (id: string) => void;
}

export const ${moduleName}List = memo(({ items, onSelect }: ${moduleName}ListProps): React.ReactElement => {
  return (
    <div>
      <h2>${moduleName} List</h2>
      <ul>
        {items.map((item) => (
          <li key={item.id} onClick={() => onSelect?.(item.id)}>
            {item.name}
          </li>
        ))}
      </ul>
    </div>
  );
});

${moduleName}List.displayName = '${moduleName}List';
`,
      },
      {
        path: path.join(modulePath, 'components', `${moduleName}Item.tsx`),
        content: `/**
 * @file ${moduleName}Item Component
 */

import { memo } from 'react';

export interface ${moduleName}ItemProps {
  id: string;
  name: string;
}

export const ${moduleName}Item = memo(({ id, name }: ${moduleName}ItemProps): React.ReactElement => {
  return (
    <div>
      <h3>${moduleName} Item</h3>
      <p>ID: {id}</p>
      <p>Name: {name}</p>
    </div>
  );
});

${moduleName}Item.displayName = '${moduleName}Item';
`,
      },
    ];
  }

  private generateHooks(): GeneratedFile[] {
    const moduleName = toPascalCase(this.options.name);
    const camelName = toCamelCase(this.options.name);
    const modulePath = resolveModulePath(this.options.name);

    return [
      {
        path: path.join(modulePath, 'hooks', 'index.ts'),
        content: `/**
 * @file ${moduleName} Hooks
 * @description Custom hooks for ${moduleName} module
 */

export { use${moduleName} } from './use${moduleName}';
`,
      },
      {
        path: path.join(modulePath, 'hooks', `use${moduleName}.ts`),
        content: `/**
 * @file use${moduleName} Hook
 */

import { useCallback } from 'react';
import { use${moduleName}Query } from '../api/hooks';

export interface Use${moduleName}Return {
  items: Array<{ id: string; name: string }>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function use${moduleName}(): Use${moduleName}Return {
  const { data, isLoading, error, refetch } = use${moduleName}Query();

  const handleRefetch = useCallback(() => {
    void refetch();
  }, [refetch]);

  return {
    items: data || [],
    isLoading,
    error,
    refetch: handleRefetch,
  };
}
`,
      },
    ];
  }

  private generateTypes(): string {
    const moduleName = toPascalCase(this.options.name);

    return `/**
 * @file ${moduleName} Types
 * @description TypeScript types for ${moduleName} module
 */

/**
 * ${moduleName} item
 */
export interface ${moduleName}Item {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * ${moduleName} create input
 */
export type ${moduleName}CreateInput = Omit<${moduleName}Item, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * ${moduleName} update input
 */
export type ${moduleName}UpdateInput = Partial<${moduleName}CreateInput>;

/**
 * ${moduleName} filter options
 */
export interface ${moduleName}FilterOptions {
  search?: string;
  sortBy?: keyof ${moduleName}Item;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}
`;
  }

  protected async afterGenerate(result: { files: string[] }): Promise<void> {
    await super.afterGenerate(result);

    const moduleName = toPascalCase(this.options.name);
    this.log(`\n✓ Generated ${moduleName} module successfully!`, 'success');
    this.log(`\nFiles created:`, 'info');
    result.files.forEach(file => {
      this.log(`  ${this.formatPath(file)}`);
    });

    this.log(`\nModule structure:`, 'info');
    if (this.options.withRoutes || this.options.full) {
      this.log(`  ✓ Routes with lazy loading`);
    }
    if (this.options.withState || this.options.full) {
      this.log(`  ✓ Zustand state management`);
    }
    if (this.options.withApi || this.options.full) {
      this.log(`  ✓ API service with React Query hooks`);
    }
    if (this.options.withComponents || this.options.full) {
      this.log(`  ✓ Feature components`);
    }
    if (this.options.withHooks || this.options.full) {
      this.log(`  ✓ Custom hooks`);
    }

    this.log(`\nNext steps:`, 'info');
    this.log(`  1. Review the generated code in src/lib/${toKebabCase(this.options.name)}/`);
    this.log(`  2. Customize types in types.ts`);
    this.log(`  3. Implement API endpoints`);
    this.log(`  4. Add the module to your app's route configuration`);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create and run module generator
 */
export async function generateModule(options: ModuleGeneratorOptions): Promise<void> {
  const generator = new ModuleGenerator(options);
  await generator.run();
}
