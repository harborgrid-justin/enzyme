#!/usr/bin/env npx ts-node
/**
 * @file Feature Scaffolding CLI
 * @description Generate a complete feature module in under 5 minutes
 * @usage npx ts-node scripts/create-feature.ts <feature-name> [options]
 *
 * Examples:
 *   npx ts-node scripts/create-feature.ts inventory
 *   npx ts-node scripts/create-feature.ts inventory --with-tabs --with-crud
 *   npx ts-node scripts/create-feature.ts orders --category=sales --roles=admin,manager
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

interface FeatureOptions {
  name: string;
  displayName: string;
  description: string;
  category: string;
  withTabs: boolean;
  withCrud: boolean;
  withScheduled: boolean;
  roles: string[];
  featureFlag: string;
}

interface TemplateContext {
  featureName: string;           // inventory
  FeatureName: string;           // Inventory
  FEATURE_NAME: string;          // INVENTORY
  featureNamePlural: string;     // inventories
  FeatureNamePlural: string;     // Inventories
  displayName: string;           // Inventory Management
  description: string;
  category: string;
  featureFlag: string;
  roles: string;
  entityName: string;            // InventoryItem
  entityNameLower: string;       // inventoryItem
}

// ============================================================================
// CLI Argument Parser
// ============================================================================

function parseArgs(args: string[]): FeatureOptions {
  const positional = args.filter(a => !a.startsWith('--'));
  const flags = args.filter(a => a.startsWith('--'));

  if (positional.length === 0) {
    console.error('Usage: create-feature <feature-name> [options]');
    console.error('');
    console.error('Options:');
    console.error('  --with-tabs        Add tab navigation');
    console.error('  --with-crud        Add CRUD operations');
    console.error('  --with-scheduled   Add scheduled/recurring support');
    console.error('  --category=<cat>   Feature category (default: general)');
    console.error('  --roles=<roles>    Comma-separated roles (default: admin,user)');
    console.error('');
    console.error('Examples:');
    console.error('  npx ts-node scripts/create-feature.ts inventory');
    console.error('  npx ts-node scripts/create-feature.ts orders --with-tabs --with-crud');
    process.exit(1);
  }

  const name = positional[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const displayName = name.charAt(0).toUpperCase() + name.slice(1);

  return {
    name,
    displayName,
    description: `Manage ${displayName.toLowerCase()} data`,
    category: extractFlag(flags, 'category') || 'general',
    withTabs: flags.includes('--with-tabs'),
    withCrud: flags.includes('--with-crud'),
    withScheduled: flags.includes('--with-scheduled'),
    roles: (extractFlag(flags, 'roles') || 'admin,user').split(','),
    featureFlag: `${name}_enabled`,
  };
}

function extractFlag(flags: string[], key: string): string | undefined {
  const flag = flags.find(f => f.startsWith(`--${key}=`));
  return flag?.split('=')[1];
}

// ============================================================================
// Template Context Builder
// ============================================================================

function buildContext(options: FeatureOptions): TemplateContext {
  const { name } = options;

  // Pluralization (handles most common cases)
  const plural = name.endsWith('y')
    ? name.slice(0, -1) + 'ies'
    : name.endsWith('s') || name.endsWith('x') || name.endsWith('ch') || name.endsWith('sh')
      ? name + 'es'
      : name + 's';

  return {
    featureName: name,
    FeatureName: name.charAt(0).toUpperCase() + name.slice(1),
    FEATURE_NAME: name.toUpperCase(),
    featureNamePlural: plural,
    FeatureNamePlural: plural.charAt(0).toUpperCase() + plural.slice(1),
    displayName: options.displayName,
    description: options.description,
    category: options.category,
    featureFlag: options.featureFlag,
    roles: options.roles.map(r => `'${r}'`).join(', '),
    entityName: name.charAt(0).toUpperCase() + name.slice(1) + 'Item',
    entityNameLower: name + 'Item',
  };
}

// ============================================================================
// Template: config.ts
// ============================================================================

function generateConfig(ctx: TemplateContext, options: FeatureOptions): string {
  const tabs = options.withTabs ? `
/**
 * ${ctx.FeatureName} feature tabs
 */
export const ${ctx.featureName}Tabs: FeatureTab[] = [
  {
    id: 'all',
    label: 'All ${ctx.FeatureNamePlural}',
    path: '/${ctx.featureNamePlural}',
  },
  {
    id: 'active',
    label: 'Active',
    path: '/${ctx.featureNamePlural}/active',
  },
  {
    id: 'archived',
    label: 'Archived',
    path: '/${ctx.featureNamePlural}/archived',
  },
];
` : '';

  return `/**
 * @file ${ctx.FeatureName} Feature Configuration
 * @description Feature configuration for the ${ctx.featureName} module
 * @generated by create-feature CLI
 */

import type { FeatureConfig, FeatureAccess, FeatureTab } from '@/lib/feature/types';
import type { Role } from '@/lib/auth/types';

/**
 * ${ctx.FeatureName} status types
 */
export type ${ctx.FeatureName}Status = 'draft' | 'active' | 'archived' | 'deleted';

/**
 * ${ctx.FeatureName} feature access configuration
 */
export const ${ctx.featureName}Access: FeatureAccess = {
  requiredRoles: [${ctx.roles}] as Role[],
  permissions: ['${ctx.featureNamePlural}:view'],
  featureFlag: '${ctx.featureFlag}',
};
${tabs}
/**
 * ${ctx.FeatureName} feature configuration
 */
export const ${ctx.featureName}Config: FeatureConfig = {
  metadata: {
    id: '${ctx.featureNamePlural}',
    name: '${ctx.displayName}',
    description: '${ctx.description}',
    icon: 'Package',
    category: '${ctx.category}',
    order: 50,
  },
  access: ${ctx.featureName}Access,${options.withTabs ? `
  tabs: ${ctx.featureName}Tabs,
  defaultTab: 'all',` : ''}
  showBreadcrumbs: true,
  showTitle: true,
  pageMetadata: {
    title: '${ctx.displayName} - Enterprise App',
    description: '${ctx.description}',
  },
};

/**
 * Status options for UI
 */
export const ${ctx.featureName}StatusOptions: { value: ${ctx.FeatureName}Status; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

/**
 * Default ${ctx.featureName} settings
 */
export const default${ctx.FeatureName}Settings = {
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc' as const,
};

export default ${ctx.featureName}Config;
`;
}

// ============================================================================
// Template: model.ts
// ============================================================================

function generateModel(ctx: TemplateContext): string {
  return `/**
 * @file ${ctx.FeatureName} Data Model
 * @description Data model and types for ${ctx.featureName} feature
 * @generated by create-feature CLI
 */

import type { ${ctx.FeatureName}Status } from './config';

/**
 * Base ${ctx.featureName} entity
 */
export interface ${ctx.entityName} {
  id: string;
  name: string;
  description?: string;
  status: ${ctx.FeatureName}Status;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  metadata: ${ctx.entityName}Metadata;
}

/**
 * ${ctx.entityName} metadata
 */
export interface ${ctx.entityName}Metadata {
  version: number;
  tags?: string[];
  [key: string]: unknown;
}

/**
 * Create ${ctx.featureName} request
 */
export interface Create${ctx.entityName}Request {
  name: string;
  description?: string;
  metadata?: Partial<${ctx.entityName}Metadata>;
}

/**
 * Update ${ctx.featureName} request
 */
export interface Update${ctx.entityName}Request {
  name?: string;
  description?: string;
  status?: ${ctx.FeatureName}Status;
  metadata?: Partial<${ctx.entityName}Metadata>;
}

/**
 * ${ctx.entityName} list response
 */
export interface ${ctx.entityName}ListResponse {
  items: ${ctx.entityName}[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * ${ctx.entityName} statistics
 */
export interface ${ctx.entityName}Statistics {
  total: number;
  byStatus: Record<${ctx.FeatureName}Status, number>;
}

/**
 * Create empty ${ctx.entityNameLower}
 */
export function createEmpty${ctx.entityName}(): Partial<${ctx.entityName}> {
  return {
    name: '',
    description: '',
    status: 'draft',
    metadata: {
      version: 1,
    },
  };
}

/**
 * Check if ${ctx.entityNameLower} can be edited
 */
export function canEdit${ctx.entityName}(item: ${ctx.entityName}): boolean {
  return item.status === 'draft' || item.status === 'active';
}

/**
 * Check if ${ctx.entityNameLower} can be deleted
 */
export function canDelete${ctx.entityName}(item: ${ctx.entityName}): boolean {
  return item.status !== 'deleted';
}

/**
 * Get status color
 */
export function get${ctx.entityName}StatusColor(status: ${ctx.FeatureName}Status): string {
  const colors: Record<${ctx.FeatureName}Status, string> = {
    draft: '#6b7280',
    active: '#22c55e',
    archived: '#9ca3af',
    deleted: '#ef4444',
  };
  return colors[status];
}
`;
}

// ============================================================================
// Template: wiring/api.ts
// ============================================================================

function generateApi(ctx: TemplateContext): string {
  return `/**
 * @file ${ctx.FeatureName} API Service
 * @description API layer for ${ctx.featureName} feature
 * @generated by create-feature CLI
 */

import { createApiClient, type ListQueryParams } from '@/lib/services/apiClients';
import type {
  ${ctx.entityName},
  Create${ctx.entityName}Request,
  Update${ctx.entityName}Request,
  ${ctx.entityName}ListResponse,
  ${ctx.entityName}Statistics,
} from '../model';
import type { ${ctx.FeatureName}Status } from '../config';

/**
 * ${ctx.FeatureName} API client
 */
export const ${ctx.featureName}Api = createApiClient<${ctx.entityName}>({
  basePath: '/api/${ctx.featureNamePlural}',
  cacheTtl: 5 * 60 * 1000,
  enableCache: true,
});

/**
 * Extended query parameters
 */
export interface ${ctx.entityName}QueryParams extends ListQueryParams {
  status?: ${ctx.FeatureName}Status;
  createdBy?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * ${ctx.FeatureName} service
 */
export const ${ctx.featureName}Service = {
  /**
   * Get all ${ctx.featureNamePlural}
   */
  async getAll(params?: ${ctx.entityName}QueryParams): Promise<${ctx.entityName}ListResponse> {
    const result = await ${ctx.featureName}Api.getAll(params);
    return {
      items: result.items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  },

  /**
   * Get single ${ctx.featureName}
   */
  async getById(id: string): Promise<${ctx.entityName}> {
    return ${ctx.featureName}Api.getById(id);
  },

  /**
   * Create ${ctx.featureName}
   */
  async create(request: Create${ctx.entityName}Request): Promise<${ctx.entityName}> {
    return ${ctx.featureName}Api.create(request as unknown as Omit<${ctx.entityName}, 'id'>);
  },

  /**
   * Update ${ctx.featureName}
   */
  async update(id: string, data: Update${ctx.entityName}Request): Promise<${ctx.entityName}> {
    return ${ctx.featureName}Api.update(id, data as Partial<${ctx.entityName}>);
  },

  /**
   * Delete ${ctx.featureName}
   */
  async delete(id: string): Promise<void> {
    return ${ctx.featureName}Api.delete(id);
  },

  /**
   * Get statistics
   */
  async getStatistics(): Promise<${ctx.entityName}Statistics> {
    return ${ctx.featureName}Api.customGet<${ctx.entityName}Statistics>('/statistics');
  },

  /**
   * Invalidate cache
   */
  invalidateCache(): void {
    ${ctx.featureName}Api.invalidateCache();
  },
};

export default ${ctx.featureName}Service;
`;
}

// ============================================================================
// Template: wiring/viewModel.ts
// ============================================================================

function generateViewModel(ctx: TemplateContext): string {
  return `/**
 * @file ${ctx.FeatureName} View Model
 * @description Presentation logic for ${ctx.featureName} feature
 * @generated by create-feature CLI
 */

import { useMemo, useCallback, useState } from 'react';
import type { ${ctx.entityName}, ${ctx.entityName}Statistics } from '../model';
import {
  canEdit${ctx.entityName},
  canDelete${ctx.entityName},
  get${ctx.entityName}StatusColor,
  createEmpty${ctx.entityName},
} from '../model';
import type { ${ctx.FeatureName}Status } from '../config';
import { ${ctx.featureName}StatusOptions, default${ctx.FeatureName}Settings } from '../config';

/**
 * View model state
 */
export interface ${ctx.FeatureName}ViewState {
  selectedId: string | null;
  filters: {
    status?: ${ctx.FeatureName}Status;
    search?: string;
  };
  sort: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pagination: {
    page: number;
    pageSize: number;
  };
  ui: {
    isCreateModalOpen: boolean;
    isFilterPanelOpen: boolean;
    viewMode: 'list' | 'grid';
  };
}

/**
 * Default view state
 */
export const default${ctx.FeatureName}ViewState: ${ctx.FeatureName}ViewState = {
  selectedId: null,
  filters: {},
  sort: {
    field: default${ctx.FeatureName}Settings.sortBy,
    direction: default${ctx.FeatureName}Settings.sortOrder,
  },
  pagination: {
    page: 1,
    pageSize: default${ctx.FeatureName}Settings.pageSize,
  },
  ui: {
    isCreateModalOpen: false,
    isFilterPanelOpen: false,
    viewMode: 'list',
  },
};

/**
 * ${ctx.FeatureName} view model hook
 */
export function use${ctx.FeatureName}ViewModel(
  items: ${ctx.entityName}[],
  statistics?: ${ctx.entityName}Statistics
) {
  const [state, setState] = useState<${ctx.FeatureName}ViewState>(default${ctx.FeatureName}ViewState);

  // Computed: Filtered and sorted items
  const processedItems = useMemo(() => {
    let result = [...items];

    // Apply filters
    if (state.filters.status) {
      result = result.filter((item) => item.status === state.filters.status);
    }

    if (state.filters.search) {
      const search = state.filters.search.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(search) ||
          item.description?.toLowerCase().includes(search)
      );
    }

    // Apply sort
    result.sort((a, b) => {
      const aValue = a[state.sort.field as keyof ${ctx.entityName}];
      const bValue = b[state.sort.field as keyof ${ctx.entityName}];

      if (aValue === bValue) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : 1;
      return state.sort.direction === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [items, state.filters, state.sort]);

  // Computed: Selected item
  const selectedItem = useMemo(() => {
    if (!state.selectedId) return null;
    return items.find((item) => item.id === state.selectedId) ?? null;
  }, [items, state.selectedId]);

  // Computed: Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
    });
    return counts;
  }, [items]);

  // Actions
  const selectItem = useCallback((id: string | null) => {
    setState((s) => ({ ...s, selectedId: id }));
  }, []);

  const setFilters = useCallback((filters: Partial<${ctx.FeatureName}ViewState['filters']>) => {
    setState((s) => ({
      ...s,
      filters: { ...s.filters, ...filters },
      pagination: { ...s.pagination, page: 1 },
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setState((s) => ({
      ...s,
      filters: {},
      pagination: { ...s.pagination, page: 1 },
    }));
  }, []);

  const setSort = useCallback((field: string, direction?: 'asc' | 'desc') => {
    setState((s) => ({
      ...s,
      sort: {
        field,
        direction: direction ?? (s.sort.field === field && s.sort.direction === 'asc' ? 'desc' : 'asc'),
      },
    }));
  }, []);

  const setPage = useCallback((page: number) => {
    setState((s) => ({ ...s, pagination: { ...s.pagination, page } }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setState((s) => ({ ...s, pagination: { ...s.pagination, pageSize, page: 1 } }));
  }, []);

  const openCreateModal = useCallback(() => {
    setState((s) => ({ ...s, ui: { ...s.ui, isCreateModalOpen: true } }));
  }, []);

  const closeCreateModal = useCallback(() => {
    setState((s) => ({ ...s, ui: { ...s.ui, isCreateModalOpen: false } }));
  }, []);

  const toggleFilterPanel = useCallback(() => {
    setState((s) => ({ ...s, ui: { ...s.ui, isFilterPanelOpen: !s.ui.isFilterPanelOpen } }));
  }, []);

  const setViewMode = useCallback((mode: 'list' | 'grid') => {
    setState((s) => ({ ...s, ui: { ...s.ui, viewMode: mode } }));
  }, []);

  // Helpers
  const getItemActions = useCallback((item: ${ctx.entityName}) => ({
    canEdit: canEdit${ctx.entityName}(item),
    canDelete: canDelete${ctx.entityName}(item),
  }), []);

  const formatItem = useCallback((item: ${ctx.entityName}) => ({
    ...item,
    statusColor: get${ctx.entityName}StatusColor(item.status),
    statusLabel: ${ctx.featureName}StatusOptions.find((o) => o.value === item.status)?.label ?? item.status,
  }), []);

  return {
    // State
    state,

    // Computed
    processedItems,
    selectedItem,
    statusCounts,
    statistics,

    // Actions
    selectItem,
    setFilters,
    clearFilters,
    setSort,
    setPage,
    setPageSize,
    openCreateModal,
    closeCreateModal,
    toggleFilterPanel,
    setViewMode,

    // Helpers
    getItemActions,
    formatItem,
    createEmpty${ctx.entityName},
    ${ctx.featureName}StatusOptions,
  };
}

export type ${ctx.FeatureName}ViewModel = ReturnType<typeof use${ctx.FeatureName}ViewModel>;
`;
}

// ============================================================================
// Template: wiring/index.ts
// ============================================================================

function generateWiringIndex(ctx: TemplateContext): string {
  return `/**
 * @file ${ctx.FeatureName} Wiring Index
 * @description Export wiring layer components
 * @generated by create-feature CLI
 */

export { ${ctx.featureName}Api, ${ctx.featureName}Service, type ${ctx.entityName}QueryParams } from './api';
export {
  use${ctx.FeatureName}ViewModel,
  default${ctx.FeatureName}ViewState,
  type ${ctx.FeatureName}ViewState,
  type ${ctx.FeatureName}ViewModel,
} from './viewModel';
`;
}

// ============================================================================
// Template: hooks/use[Feature]Queries.ts
// ============================================================================

function generateQueries(ctx: TemplateContext): string {
  return `/**
 * @file ${ctx.FeatureName} Query Hooks
 * @description React Query hooks for ${ctx.featureName} feature
 * @generated by create-feature CLI
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { ${ctx.featureName}Service, type ${ctx.entityName}QueryParams } from '../wiring/api';
import type {
  ${ctx.entityName},
  Create${ctx.entityName}Request,
  Update${ctx.entityName}Request,
  ${ctx.entityName}Statistics,
  ${ctx.entityName}ListResponse,
} from '../model';

/**
 * Query keys for ${ctx.featureName}
 */
export const ${ctx.featureName}Keys = {
  all: ['${ctx.featureNamePlural}'] as const,
  lists: () => [...${ctx.featureName}Keys.all, 'list'] as const,
  list: (params?: ${ctx.entityName}QueryParams) => [...${ctx.featureName}Keys.lists(), params] as const,
  details: () => [...${ctx.featureName}Keys.all, 'detail'] as const,
  detail: (id: string) => [...${ctx.featureName}Keys.details(), id] as const,
  statistics: () => [...${ctx.featureName}Keys.all, 'statistics'] as const,
};

/**
 * Hook to fetch ${ctx.featureNamePlural} list
 */
export function use${ctx.FeatureNamePlural}(
  params?: ${ctx.entityName}QueryParams,
  options?: Omit<UseQueryOptions<${ctx.entityName}ListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ${ctx.featureName}Keys.list(params),
    queryFn: () => ${ctx.featureName}Service.getAll(params),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch single ${ctx.featureName}
 */
export function use${ctx.FeatureName}(
  id: string,
  options?: Omit<UseQueryOptions<${ctx.entityName}>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ${ctx.featureName}Keys.detail(id),
    queryFn: () => ${ctx.featureName}Service.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch ${ctx.featureName} statistics
 */
export function use${ctx.FeatureName}Statistics(
  options?: Omit<UseQueryOptions<${ctx.entityName}Statistics>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ${ctx.featureName}Keys.statistics(),
    queryFn: () => ${ctx.featureName}Service.getStatistics(),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to create ${ctx.featureName}
 */
export function useCreate${ctx.FeatureName}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: Create${ctx.entityName}Request) =>
      ${ctx.featureName}Service.create(request),
    onSuccess: (newItem) => {
      queryClient.invalidateQueries({ queryKey: ${ctx.featureName}Keys.lists() });
      queryClient.setQueryData(${ctx.featureName}Keys.detail(newItem.id), newItem);
      queryClient.invalidateQueries({ queryKey: ${ctx.featureName}Keys.statistics() });
    },
  });
}

/**
 * Hook to update ${ctx.featureName}
 */
export function useUpdate${ctx.FeatureName}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Update${ctx.entityName}Request }) =>
      ${ctx.featureName}Service.update(id, data),
    onSuccess: (updatedItem) => {
      queryClient.setQueryData(${ctx.featureName}Keys.detail(updatedItem.id), updatedItem);
      queryClient.invalidateQueries({ queryKey: ${ctx.featureName}Keys.lists() });
    },
  });
}

/**
 * Hook to delete ${ctx.featureName}
 */
export function useDelete${ctx.FeatureName}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ${ctx.featureName}Service.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: ${ctx.featureName}Keys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: ${ctx.featureName}Keys.lists() });
      queryClient.invalidateQueries({ queryKey: ${ctx.featureName}Keys.statistics() });
    },
  });
}

/**
 * Hook to prefetch ${ctx.featureName}
 */
export function usePrefetch${ctx.FeatureName}() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: ${ctx.featureName}Keys.detail(id),
      queryFn: () => ${ctx.featureName}Service.getById(id),
      staleTime: 5 * 60 * 1000,
    });
  };
}
`;
}

// ============================================================================
// Template: hooks/index.ts
// ============================================================================

function generateHooksIndex(ctx: TemplateContext): string {
  return `/**
 * @file ${ctx.FeatureName} Feature Hooks Index
 * @description Export all ${ctx.featureName} hooks
 * @generated by create-feature CLI
 */

export {
  ${ctx.featureName}Keys,
  use${ctx.FeatureNamePlural},
  use${ctx.FeatureName},
  use${ctx.FeatureName}Statistics,
  useCreate${ctx.FeatureName},
  useUpdate${ctx.FeatureName},
  useDelete${ctx.FeatureName},
  usePrefetch${ctx.FeatureName},
} from './use${ctx.FeatureName}Queries';
`;
}

// ============================================================================
// Template: components/[Feature]Page.tsx
// ============================================================================

function generatePage(ctx: TemplateContext): string {
  return `/**
 * @file ${ctx.FeatureName} Page Component
 * @description Main ${ctx.featureName} page
 * @generated by create-feature CLI
 */

import { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { QueryErrorBoundary } from '@/lib/monitoring/QueryErrorBoundary';
import { Spinner } from '@/lib/ui/feedback/Spinner';
import { use${ctx.FeatureNamePlural}, use${ctx.FeatureName}Statistics } from '../hooks';
import { ${ctx.FeatureName}List } from './${ctx.FeatureName}List';
import { use${ctx.FeatureName}ViewModel } from '../wiring/viewModel';

/**
 * Statistics cards
 */
function ${ctx.FeatureName}Stats() {
  const { data: stats, isLoading } = use${ctx.FeatureName}Statistics();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: '80px',
              backgroundColor: 'var(--color-bg-tertiary, #f3f4f6)',
              borderRadius: 'var(--radius-md, 0.5rem)',
            }}
          />
        ))}
      </div>
    );
  }

  const statItems = [
    { label: 'Total', value: stats?.total ?? 0, icon: 'Package' },
    { label: 'Active', value: stats?.byStatus?.active ?? 0, icon: 'CheckCircle' },
    { label: 'Draft', value: stats?.byStatus?.draft ?? 0, icon: 'Edit' },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}
    >
      {statItems.map((item) => (
        <div
          key={item.label}
          style={{
            padding: '1rem',
            backgroundColor: 'var(--color-bg-primary, #fff)',
            borderRadius: 'var(--radius-md, 0.5rem)',
            border: '1px solid var(--color-border-default, #e5e7eb)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-sm, 0.875rem)', color: 'var(--color-text-muted, #6b7280)' }}>
              {item.label}
            </span>
          </div>
          <p style={{ fontSize: 'var(--font-size-2xl, 1.5rem)', fontWeight: '700', color: 'var(--color-text-primary, #111827)', margin: '0.25rem 0 0' }}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * Content component
 */
function ${ctx.FeatureName}Content() {
  const { data, isLoading, error } = use${ctx.FeatureNamePlural}();
  const viewModel = use${ctx.FeatureName}ViewModel(data?.items ?? []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    throw error;
  }

  if (!data?.items?.length) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '3rem',
          backgroundColor: 'var(--color-bg-secondary, #f9fafb)',
          borderRadius: 'var(--radius-lg, 0.75rem)',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>Package</div>
        <h3 style={{ color: 'var(--color-text-primary, #111827)', marginBottom: '0.5rem' }}>
          No items found
        </h3>
        <p style={{ color: 'var(--color-text-muted, #6b7280)', marginBottom: '1.5rem' }}>
          Create your first item to get started
        </p>
        <Link
          to="/${ctx.featureNamePlural}/create"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--color-primary-500, #3b82f6)',
            color: 'white',
            borderRadius: 'var(--radius-md, 0.5rem)',
            textDecoration: 'none',
            fontWeight: '500',
          }}
        >
          Create ${ctx.FeatureName}
        </Link>
      </div>
    );
  }

  return (
    <${ctx.FeatureName}List
      items={data.items}
      viewModel={viewModel}
      onView={(item) => {
        window.location.href = \`/${ctx.featureNamePlural}/\${item.id}\`;
      }}
      onDelete={(item) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
          console.log('Deleting:', item.id);
        }
      }}
    />
  );
}

/**
 * ${ctx.FeatureName} Page
 */
export function ${ctx.FeatureName}Page() {
  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'var(--font-size-2xl, 1.5rem)',
              fontWeight: '700',
              color: 'var(--color-text-primary, #111827)',
              marginBottom: '0.25rem',
            }}
          >
            ${ctx.displayName}
          </h1>
          <p style={{ color: 'var(--color-text-secondary, #6b7280)' }}>
            ${ctx.description}
          </p>
        </div>

        <Link
          to="/${ctx.featureNamePlural}/create"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--color-primary-500, #3b82f6)',
            color: 'white',
            borderRadius: 'var(--radius-md, 0.5rem)',
            textDecoration: 'none',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>+</span>
          <span>New ${ctx.FeatureName}</span>
        </Link>
      </div>

      {/* Statistics */}
      <QueryErrorBoundary>
        <${ctx.FeatureName}Stats />
      </QueryErrorBoundary>

      {/* Content */}
      <QueryErrorBoundary>
        <Suspense fallback={<Spinner size="lg" centered />}>
          <${ctx.FeatureName}Content />
        </Suspense>
      </QueryErrorBoundary>
    </div>
  );
}

export default ${ctx.FeatureName}Page;
`;
}

// ============================================================================
// Template: components/[Feature]List.tsx
// ============================================================================

function generateList(ctx: TemplateContext): string {
  return `/**
 * @file ${ctx.FeatureName} List Component
 * @description Display list of ${ctx.featureNamePlural}
 * @generated by create-feature CLI
 */

import type { ${ctx.entityName} } from '../model';
import type { ${ctx.FeatureName}ViewModel } from '../wiring/viewModel';

/**
 * Props
 */
export interface ${ctx.FeatureName}ListProps {
  items: ${ctx.entityName}[];
  viewModel: ${ctx.FeatureName}ViewModel;
  onView: (item: ${ctx.entityName}) => void;
  onDelete: (item: ${ctx.entityName}) => void;
}

/**
 * ${ctx.FeatureName} List
 */
export function ${ctx.FeatureName}List({
  items,
  viewModel,
  onView,
  onDelete,
}: ${ctx.FeatureName}ListProps) {
  const { state, selectItem, formatItem, getItemActions } = viewModel;

  if (items.length === 0) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>Package</div>
        <h3 style={{ marginBottom: '0.5rem', color: '#374151' }}>No items found</h3>
        <p>Create your first item to get started</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {items.map((item) => {
        const formatted = formatItem(item);
        const actions = getItemActions(item);
        const isSelected = state.selectedId === item.id;

        return (
          <div
            key={item.id}
            onClick={() => selectItem(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '1rem',
              backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
              border: \`1px solid \${isSelected ? '#3b82f6' : '#e5e7eb'}\`,
              borderRadius: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {/* Status indicator */}
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: formatted.statusColor,
                marginRight: '1rem',
              }}
            />

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: '500', color: '#111827' }}>{item.name}</span>
                <span
                  style={{
                    padding: '0.125rem 0.5rem',
                    fontSize: '0.75rem',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '9999px',
                    color: '#6b7280',
                  }}
                >
                  {formatted.statusLabel}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {new Date(item.createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onView(item)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
                title="View"
              >
                View
              </button>

              {actions.canDelete && (
                <button
                  onClick={() => onDelete(item)}
                  style={{
                    padding: '0.5rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    color: '#ef4444',
                  }}
                  title="Delete"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
`;
}

// ============================================================================
// Template: components/index.ts
// ============================================================================

function generateComponentsIndex(ctx: TemplateContext): string {
  return `/**
 * @file ${ctx.FeatureName} Components Index
 * @description Export all ${ctx.featureName} components
 * @generated by create-feature CLI
 */

export { ${ctx.FeatureName}List, type ${ctx.FeatureName}ListProps } from './${ctx.FeatureName}List';
export { ${ctx.FeatureName}Page, default as ${ctx.FeatureName}PageDefault } from './${ctx.FeatureName}Page';
`;
}

// ============================================================================
// Template: feature.ts
// ============================================================================

function generateFeature(ctx: TemplateContext): string {
  return `/**
 * @file ${ctx.FeatureName} Feature Definition
 * @description Complete feature definition for the ${ctx.featureName} module
 * @generated by create-feature CLI
 */

import { lazy } from 'react';
import type { FeatureRegistryEntry } from '@/lib/feature/types';
import { ${ctx.featureName}Config } from './config';

/**
 * ${ctx.FeatureName} feature definition
 */
export const ${ctx.featureName}Feature: FeatureRegistryEntry = {
  config: ${ctx.featureName}Config,
  component: lazy(() => import('./components/${ctx.FeatureName}Page')),
};

export default ${ctx.featureName}Feature;
`;
}

// ============================================================================
// Template: index.ts
// ============================================================================

function generateFeatureIndex(ctx: TemplateContext): string {
  return `/**
 * @file ${ctx.FeatureName} Feature Index
 * @description Main export for ${ctx.featureName} feature
 * @generated by create-feature CLI
 */

// Feature definition
export { ${ctx.featureName}Feature, default as ${ctx.featureName}FeatureDefault } from './feature';

// Configuration
export {
  ${ctx.featureName}Config,
  ${ctx.featureName}Access,
  ${ctx.featureName}StatusOptions,
  default${ctx.FeatureName}Settings,
  type ${ctx.FeatureName}Status,
} from './config';

// Model
export {
  type ${ctx.entityName},
  type ${ctx.entityName}Metadata,
  type Create${ctx.entityName}Request,
  type Update${ctx.entityName}Request,
  type ${ctx.entityName}ListResponse,
  type ${ctx.entityName}Statistics,
  createEmpty${ctx.entityName},
  canEdit${ctx.entityName},
  canDelete${ctx.entityName},
  get${ctx.entityName}StatusColor,
} from './model';

// Wiring
export {
  ${ctx.featureName}Api,
  ${ctx.featureName}Service,
  use${ctx.FeatureName}ViewModel,
  default${ctx.FeatureName}ViewState,
  type ${ctx.entityName}QueryParams,
  type ${ctx.FeatureName}ViewState,
  type ${ctx.FeatureName}ViewModel,
} from './wiring';

// Hooks
export {
  ${ctx.featureName}Keys,
  use${ctx.FeatureNamePlural},
  use${ctx.FeatureName},
  use${ctx.FeatureName}Statistics,
  useCreate${ctx.FeatureName},
  useUpdate${ctx.FeatureName},
  useDelete${ctx.FeatureName},
  usePrefetch${ctx.FeatureName},
} from './hooks';

// Components
export {
  ${ctx.FeatureName}List,
  ${ctx.FeatureName}Page,
  type ${ctx.FeatureName}ListProps,
} from './components';
`;
}

// ============================================================================
// File System Operations
// ============================================================================

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  Created: ${filePath}`);
}

// ============================================================================
// Main Generator
// ============================================================================

function generateFeatureModule(options: FeatureOptions): void {
  const ctx = buildContext(options);
  const baseDir = path.join(process.cwd(), 'src', 'features', ctx.featureNamePlural);

  console.log(`\n========================================`);
  console.log(`  Feature Scaffolding CLI`);
  console.log(`========================================\n`);
  console.log(`Generating feature: ${ctx.FeatureName}`);
  console.log(`Location: ${baseDir}\n`);

  // Create directories
  ensureDir(baseDir);
  ensureDir(path.join(baseDir, 'wiring'));
  ensureDir(path.join(baseDir, 'hooks'));
  ensureDir(path.join(baseDir, 'components'));

  // Generate files
  writeFile(path.join(baseDir, 'config.ts'), generateConfig(ctx, options));
  writeFile(path.join(baseDir, 'model.ts'), generateModel(ctx));
  writeFile(path.join(baseDir, 'feature.ts'), generateFeature(ctx));
  writeFile(path.join(baseDir, 'index.ts'), generateFeatureIndex(ctx));

  // Wiring
  writeFile(path.join(baseDir, 'wiring', 'api.ts'), generateApi(ctx));
  writeFile(path.join(baseDir, 'wiring', 'viewModel.ts'), generateViewModel(ctx));
  writeFile(path.join(baseDir, 'wiring', 'index.ts'), generateWiringIndex(ctx));

  // Hooks
  writeFile(path.join(baseDir, 'hooks', `use${ctx.FeatureName}Queries.ts`), generateQueries(ctx));
  writeFile(path.join(baseDir, 'hooks', 'index.ts'), generateHooksIndex(ctx));

  // Components
  writeFile(path.join(baseDir, 'components', `${ctx.FeatureName}Page.tsx`), generatePage(ctx));
  writeFile(path.join(baseDir, 'components', `${ctx.FeatureName}List.tsx`), generateList(ctx));
  writeFile(path.join(baseDir, 'components', 'index.ts'), generateComponentsIndex(ctx));

  console.log(`\n========================================`);
  console.log(`  Feature "${ctx.FeatureName}" created!`);
  console.log(`========================================\n`);
  console.log(`Next steps:`);
  console.log(`  1. Add to src/features/index.ts:`);
  console.log(`     export * from './${ctx.featureNamePlural}';`);
  console.log(`  2. The feature will auto-register via autoRegistry.ts`);
  console.log(`  3. Add feature flag '${ctx.featureFlag}' to your flags config\n`);
}

// Run CLI
const args = process.argv.slice(2);
const options = parseArgs(args);
generateFeatureModule(options);
