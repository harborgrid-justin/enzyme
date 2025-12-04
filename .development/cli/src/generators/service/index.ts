/**
 * @file Service Generator
 * @description Generates API services with React Query integration
 */

import * as path from 'path';
import { BaseGenerator, type GeneratorOptions, type GeneratedFile } from '../base';
import type { ServiceOptions } from '../types';
import {
  resolveServicePath,
  toPascalCase,
  toCamelCase,
  toKebabCase,
  validateIdentifier,
} from '../utils';

// ============================================================================
// Service Generator
// ============================================================================

export interface ServiceGeneratorOptions extends GeneratorOptions, ServiceOptions {}

export class ServiceGenerator extends BaseGenerator<ServiceGeneratorOptions> {
  protected getName(): string {
    return 'Service';
  }

  protected validate(): void {
    validateIdentifier(this.options.name, 'Service name');
  }

  protected async generate(): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    const serviceName = toCamelCase(this.options.name) + 'Service';
    const servicePath = resolveServicePath(this.options.name);

    // Generate service file
    const serviceContent = this.generateServiceFile();
    files.push({
      path: path.join(servicePath, `${serviceName}.ts`),
      content: serviceContent,
    });

    // Generate hooks file
    const hooksContent = this.generateHooksFile();
    files.push({
      path: path.join(servicePath, 'hooks.ts'),
      content: hooksContent,
    });

    // Generate types file
    const typesContent = this.generateTypesFile();
    files.push({
      path: path.join(servicePath, 'types.ts'),
      content: typesContent,
    });

    // Generate index file
    const indexContent = this.generateIndexFile();
    files.push({
      path: path.join(servicePath, 'index.ts'),
      content: indexContent,
    });

    return files;
  }

  // ==========================================================================
  // File Generation Methods
  // ==========================================================================

  private generateServiceFile(): string {
    const typeName = toPascalCase(this.options.name);
    const serviceName = toCamelCase(this.options.name) + 'Service';
    const kebabName = toKebabCase(this.options.name);
    const withCrud = this.options.withCrud ?? false;
    const baseUrl = this.options.baseUrl || `/api/${kebabName}`;

    let template = `/**
 * @file ${typeName} Service
 * @description API service for ${typeName} operations
 */

import type {
  ${typeName},
  ${typeName}CreateInput,
  ${typeName}UpdateInput,`;

    if (!withCrud) {
      template += `
  ${typeName}QueryParams,`;
    }

    template += `
} from './types';

// ============================================================================
// API Client
// ============================================================================

const BASE_URL = '${baseUrl}';

/**
 * ${typeName} API service
 */
export const ${serviceName} = {`;

    if (withCrud) {
      template += `
  /**
   * Get all ${typeName} items
   */
  async getAll(): Promise<${typeName}[]> {
    const response = await fetch(BASE_URL);
    if (!response.ok) {
      throw new Error(\`Failed to fetch ${kebabName}: \${response.statusText}\`);
    }
    return response.json();
  },

  /**
   * Get ${typeName} by ID
   */
  async getById(id: string): Promise<${typeName}> {
    const response = await fetch(\`\${BASE_URL}/\${id}\`);
    if (!response.ok) {
      throw new Error(\`Failed to fetch ${kebabName} \${id}: \${response.statusText}\`);
    }
    return response.json();
  },

  /**
   * Create new ${typeName}
   */
  async create(data: ${typeName}CreateInput): Promise<${typeName}> {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(\`Failed to create ${kebabName}: \${response.statusText}\`);
    }
    return response.json();
  },

  /**
   * Update ${typeName}
   */
  async update(id: string, data: ${typeName}UpdateInput): Promise<${typeName}> {
    const response = await fetch(\`\${BASE_URL}/\${id}\`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(\`Failed to update ${kebabName} \${id}: \${response.statusText}\`);
    }
    return response.json();
  },

  /**
   * Delete ${typeName}
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(\`\${BASE_URL}/\${id}\`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(\`Failed to delete ${kebabName} \${id}: \${response.statusText}\`);
    }
  },`;
    } else {
      template += `
  /**
   * Fetch ${typeName} data
   */
  async fetch(params?: ${typeName}QueryParams): Promise<${typeName}> {
    const url = new URL(BASE_URL);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(\`Failed to fetch ${kebabName}: \${response.statusText}\`);
    }
    return response.json();
  },

  /**
   * Submit ${typeName} data
   */
  async submit(data: ${typeName}CreateInput): Promise<${typeName}> {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(\`Failed to submit ${kebabName}: \${response.statusText}\`);
    }
    return response.json();
  },`;
    }

    template += `
};
`;

    return template;
  }

  private generateHooksFile(): string {
    const typeName = toPascalCase(this.options.name);
    const serviceName = toCamelCase(this.options.name) + 'Service';
    const camelName = toCamelCase(this.options.name);
    const withCrud = this.options.withCrud ?? false;
    const withCache = this.options.withCache ?? true;
    const withOptimistic = this.options.withOptimistic ?? false;

    let template = `/**
 * @file ${typeName} Service Hooks
 * @description React Query hooks for ${typeName} API operations
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { ${serviceName} } from './${serviceName}';
import type {
  ${typeName},
  ${typeName}CreateInput,
  ${typeName}UpdateInput,
} from './types';

// ============================================================================
// Query Keys
// ============================================================================

/**
 * Query key factory for ${typeName}
 */
export const ${camelName}Keys = {
  all: ['${camelName}'] as const,`;

    if (withCrud) {
      template += `
  lists: () => [...${camelName}Keys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...${camelName}Keys.lists(), filters] as const,
  details: () => [...${camelName}Keys.all, 'detail'] as const,
  detail: (id: string) => [...${camelName}Keys.details(), id] as const,`;
    } else {
      template += `
  data: (params?: Record<string, unknown>) => [...${camelName}Keys.all, 'data', params] as const,`;
    }

    template += `
};

// ============================================================================
// Query Hooks
// ============================================================================

`;

    if (withCrud) {
      template += `/**
 * Hook to fetch all ${typeName} items
 */
export function use${typeName}ListQuery(): UseQueryResult<${typeName}[], Error> {
  return useQuery({
    queryKey: ${camelName}Keys.lists(),
    queryFn: () => ${serviceName}.getAll(),`;

      if (withCache) {
        template += `
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)`;
      }

      template += `
  });
}

/**
 * Hook to fetch ${typeName} by ID
 */
export function use${typeName}Query(id: string): UseQueryResult<${typeName}, Error> {
  return useQuery({
    queryKey: ${camelName}Keys.detail(id),
    queryFn: () => ${serviceName}.getById(id),
    enabled: !!id,`;

      if (withCache) {
        template += `
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,`;
      }

      template += `
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook to create ${typeName}
 */
export function useCreate${typeName}Mutation(): UseMutationResult<
  ${typeName},
  Error,
  ${typeName}CreateInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => ${serviceName}.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ${camelName}Keys.lists() });
    },`;

      if (withOptimistic) {
        template += `
    onMutate: async (newItem) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ${camelName}Keys.lists() });

      // Snapshot previous value
      const previousItems = queryClient.getQueryData<${typeName}[]>(${camelName}Keys.lists());

      // Optimistically update
      queryClient.setQueryData<${typeName}[]>(${camelName}Keys.lists(), (old) => [
        ...(old ?? []),
        { ...newItem, id: 'temp-' + Date.now(), createdAt: new Date().toISOString() } as ${typeName},
      ]);

      return { previousItems };
    },
    onError: (err, newItem, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(${camelName}Keys.lists(), context.previousItems);
      }
    },`;
      }

      template += `
  });
}

/**
 * Hook to update ${typeName}
 */
export function useUpdate${typeName}Mutation(): UseMutationResult<
  ${typeName},
  Error,
  { id: string; data: ${typeName}UpdateInput }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => ${serviceName}.update(id, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ${camelName}Keys.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: ${camelName}Keys.lists() });
    },`;

      if (withOptimistic) {
        template += `
    onMutate: async ({ id, data }) => {
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: ${camelName}Keys.detail(id) });

      // Snapshot
      const previous = queryClient.getQueryData<${typeName}>(${camelName}Keys.detail(id));

      // Optimistic update
      queryClient.setQueryData<${typeName}>(${camelName}Keys.detail(id), (old) =>
        old ? { ...old, ...data } : old
      );

      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(${camelName}Keys.detail(variables.id), context.previous);
      }
    },`;
      }

      template += `
  });
}

/**
 * Hook to delete ${typeName}
 */
export function useDelete${typeName}Mutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => ${serviceName}.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ${camelName}Keys.lists() });
    },
  });
}`;
    } else {
      template += `/**
 * Hook to fetch ${typeName} data
 */
export function use${typeName}Query(): UseQueryResult<${typeName}, Error> {
  return useQuery({
    queryKey: ${camelName}Keys.data(),
    queryFn: () => ${serviceName}.fetch(),`;

      if (withCache) {
        template += `
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,`;
      }

      template += `
  });
}

/**
 * Hook to submit ${typeName} data
 */
export function use${typeName}Mutation(): UseMutationResult<
  ${typeName},
  Error,
  ${typeName}CreateInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => ${serviceName}.submit(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ${camelName}Keys.all });
    },
  });
}`;
    }

    template += `\n`;

    return template;
  }

  private generateTypesFile(): string {
    const typeName = toPascalCase(this.options.name);
    const withCrud = this.options.withCrud ?? false;

    let template = `/**
 * @file ${typeName} Service Types
 * @description TypeScript types for ${typeName} API
 */

`;

    if (withCrud) {
      template += `/**
 * ${typeName} entity
 */
export interface ${typeName} {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * ${typeName} create input
 */
export type ${typeName}CreateInput = Omit<${typeName}, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * ${typeName} update input
 */
export type ${typeName}UpdateInput = Partial<${typeName}CreateInput>;

/**
 * ${typeName} list response
 */
export interface ${typeName}ListResponse {
  items: ${typeName}[];
  total: number;
  page: number;
  pageSize: number;
}`;
    } else {
      template += `/**
 * ${typeName} data type
 */
export interface ${typeName} {
  // Define your data structure here
  id: string;
  name: string;
}

/**
 * ${typeName} create input
 */
export type ${typeName}CreateInput = Omit<${typeName}, 'id'>;

/**
 * ${typeName} update input
 */
export type ${typeName}UpdateInput = Partial<${typeName}>;

/**
 * ${typeName} query parameters
 */
export interface ${typeName}QueryParams {
  search?: string;
  limit?: number;
  offset?: number;
}`;
    }

    template += `\n`;

    return template;
  }

  private generateIndexFile(): string {
    const typeName = toPascalCase(this.options.name);
    const serviceName = toCamelCase(this.options.name) + 'Service';

    return `/**
 * ${typeName} service exports
 */

export { ${serviceName} } from './${serviceName}';
export * from './hooks';
export * from './types';
`;
  }

  protected async afterGenerate(result: import('../base').GeneratorResult): Promise<void> {
    await super.afterGenerate(result);

    const serviceName = toCamelCase(this.options.name) + 'Service';
    this.log(`\n✓ Generated ${serviceName} successfully!`, 'success');
    this.log(`\nFiles created:`, 'info');
    result.files.forEach(file => {
      this.log(`  ${this.formatPath(file)}`);
    });

    this.log(`\nFeatures:`, 'info');
    if (this.options.withCrud) {
      this.log(`  ✓ Full CRUD operations (Create, Read, Update, Delete)`);
    }
    if (this.options.withCache) {
      this.log(`  ✓ Query caching with React Query`);
    }
    if (this.options.withOptimistic) {
      this.log(`  ✓ Optimistic updates`);
    }

    this.log(`\nNext steps:`, 'info');
    this.log(`  1. Customize the API endpoints in ${serviceName}.ts`);
    this.log(`  2. Update types in types.ts to match your API`);
    this.log(`  3. Use the hooks in your components:`);
    this.log(`     import { use${toPascalCase(this.options.name)}Query } from './services/${serviceName}';`);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create and run service generator
 */
export async function generateService(options: ServiceGeneratorOptions): Promise<void> {
  const generator = new ServiceGenerator(options);
  await generator.run();
}
