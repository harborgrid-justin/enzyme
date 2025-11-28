# Feature Architecture Guide

> **Create self-contained, scalable feature modules** - This guide explains how to structure features using vertical slices with isolated state, API, and UI components.

---

## Table of Contents

1. [Overview](#overview)
2. [Feature Structure](#feature-structure)
3. [Creating a New Feature](#creating-a-new-feature)
4. [Feature Registration](#feature-registration)
5. [Best Practices](#best-practices)
6. [Testing Features](#testing-features)
7. [Migration Guide](#migration-guide)
8. [Related Documentation](#related-documentation)

---

## Overview

Harbor React uses a **feature-based architecture** (also known as "vertical slices"), where each feature is a self-contained module with its own:

- **Components** - React UI components
- **Hooks** - Data fetching and state hooks
- **Wiring** - API clients and view models
- **Config** - Feature metadata and access control
- **Model** - TypeScript types and domain logic

## Feature Structure

```
src/features/
└── [feature-name]/
    ├── components/           # UI components
    │   ├── FeaturePage.tsx   # Main page component
    │   ├── FeatureList.tsx   # List view
    │   ├── FeatureForm.tsx   # Create/edit form
    │   └── index.ts          # Component exports
    │
    ├── hooks/                # React hooks
    │   ├── queries.ts        # TanStack Query hooks
    │   ├── mutations.ts      # Mutation hooks
    │   └── index.ts          # Hook exports
    │
    ├── wiring/               # Data layer
    │   ├── api.ts            # API client
    │   ├── viewModel.ts      # View model hook
    │   └── index.ts          # Wiring exports
    │
    ├── config.ts             # Feature configuration
    ├── model.ts              # TypeScript types
    ├── feature.ts            # Feature registration entry
    └── index.ts              # Public API (barrel export)
```

## Creating a New Feature

### Step 1: Define the Model

Start by defining your domain types in `model.ts`:

```typescript
// features/orders/model.ts

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  status: OrderStatus;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

// Helper functions
export function canCancelOrder(order: Order): boolean {
  return ['pending', 'processing'].includes(order.status);
}

export function getOrderStatusColor(status: OrderStatus): string {
  const colors: Record<OrderStatus, string> = {
    pending: 'yellow',
    processing: 'blue',
    shipped: 'purple',
    delivered: 'green',
    cancelled: 'red',
  };
  return colors[status];
}
```

### Step 2: Create the Configuration

Define feature metadata and access control in `config.ts`:

```typescript
// features/orders/config.ts
import type { FeatureConfig } from '@/lib/feature/types';

export const ordersConfig: FeatureConfig = {
  metadata: {
    id: 'orders',
    name: 'Orders',
    description: 'Order management system',
    icon: 'shopping-cart',
    category: 'sales',
    order: 20,
    version: '1.0.0',
  },
  access: {
    requireAuth: true,
    allowedRoles: ['admin', 'sales', 'support'],
    permissions: ['orders:view'],
    featureFlag: 'orders_module',
  },
  tabs: [
    { id: 'list', label: 'All Orders', path: '/orders' },
    { id: 'pending', label: 'Pending', path: '/orders/pending' },
    { id: 'analytics', label: 'Analytics', path: '/orders/analytics', access: { allowedRoles: ['admin'] } },
  ],
  defaultTab: 'list',
  showBreadcrumbs: true,
  showTitle: true,
};

// Export individual config parts for flexibility
export const ordersAccess = ordersConfig.access;
export const ordersTabs = ordersConfig.tabs;
```

### Step 3: Build the API Layer

Create the API client in `wiring/api.ts`:

```typescript
// features/orders/wiring/api.ts
import { createApiClient, type ListQueryParams } from '@/lib/services/apiClients';
import type { Order, OrderStatus } from '../model';

export const ordersApi = createApiClient<Order>({
  basePath: '/api/orders',
  cacheTtl: 5 * 60 * 1000,
  enableCache: true,
});

export interface OrderQueryParams extends ListQueryParams {
  status?: OrderStatus;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const ordersService = {
  async getOrders(params?: OrderQueryParams) {
    return ordersApi.getAll(params);
  },
  
  async getOrder(id: string) {
    return ordersApi.getById(id);
  },
  
  async createOrder(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) {
    return ordersApi.create(data);
  },
  
  async updateOrder(id: string, data: Partial<Order>) {
    return ordersApi.update(id, data);
  },
  
  async cancelOrder(id: string) {
    return ordersApi.customPost<Order>(`/${id}/cancel`);
  },
};
```

### Step 4: Create Query Hooks

Build React Query hooks in `hooks/`:

```typescript
// features/orders/hooks/index.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersService, type OrderQueryParams } from '../wiring/api';

// Query key factory
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params?: OrderQueryParams) => [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};

// Queries
export function useOrders(params?: OrderQueryParams) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => ordersService.getOrders(params),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => ordersService.getOrder(id),
    enabled: !!id,
  });
}

// Mutations
export function useCreateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ordersService.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ordersService.cancelOrder,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}
```

### Step 5: Create View Model

The view model combines data and UI state in `wiring/viewModel.ts`:

```typescript
// features/orders/wiring/viewModel.ts
import { useState, useCallback, useMemo } from 'react';
import { useOrders, useCancelOrder } from '../hooks';
import type { OrderQueryParams } from './api';

export interface OrdersViewState {
  filters: OrderQueryParams;
  selectedOrderId: string | null;
}

export const defaultViewState: OrdersViewState = {
  filters: { page: 1, pageSize: 20 },
  selectedOrderId: null,
};

export function useOrdersViewModel() {
  const [viewState, setViewState] = useState<OrdersViewState>(defaultViewState);
  
  const ordersQuery = useOrders(viewState.filters);
  const cancelMutation = useCancelOrder();
  
  const setFilters = useCallback((filters: Partial<OrderQueryParams>) => {
    setViewState((prev) => ({
      ...prev,
      filters: { ...prev.filters, ...filters },
    }));
  }, []);
  
  const selectOrder = useCallback((id: string | null) => {
    setViewState((prev) => ({ ...prev, selectedOrderId: id }));
  }, []);
  
  const cancelOrder = useCallback(async (id: string) => {
    await cancelMutation.mutateAsync(id);
  }, [cancelMutation]);
  
  return {
    // Data
    orders: ordersQuery.data?.items ?? [],
    total: ordersQuery.data?.total ?? 0,
    isLoading: ordersQuery.isLoading,
    error: ordersQuery.error,
    
    // State
    filters: viewState.filters,
    selectedOrderId: viewState.selectedOrderId,
    
    // Actions
    setFilters,
    selectOrder,
    cancelOrder,
    refresh: ordersQuery.refetch,
  };
}

export type OrdersViewModel = ReturnType<typeof useOrdersViewModel>;
```

### Step 6: Build Components

Create UI components in `components/`:

```typescript
// features/orders/components/OrdersPage.tsx
import { useOrdersViewModel } from '../wiring/viewModel';
import { OrdersList } from './OrdersList';
import { OrderFilters } from './OrderFilters';

export function OrdersPage() {
  const viewModel = useOrdersViewModel();
  
  if (viewModel.error) {
    return <div>Error: {viewModel.error.message}</div>;
  }
  
  return (
    <div className="orders-page">
      <h1>Orders</h1>
      <OrderFilters 
        filters={viewModel.filters} 
        onChange={viewModel.setFilters} 
      />
      <OrdersList 
        orders={viewModel.orders}
        isLoading={viewModel.isLoading}
        onCancel={viewModel.cancelOrder}
      />
    </div>
  );
}

export default OrdersPage;
```

### Step 7: Create Feature Entry

Register the feature in `feature.ts`:

```typescript
// features/orders/feature.ts
import { lazy } from 'react';
import type { FeatureRegistryEntry } from '@/lib/feature/types';
import { ordersConfig } from './config';

export const ordersFeature: FeatureRegistryEntry = {
  config: ordersConfig,
  component: lazy(() => import('./components/OrdersPage')),
};

export default ordersFeature;
```

### Step 8: Export Public API

Create the barrel export in `index.ts`:

```typescript
// features/orders/index.ts

// Feature definition
export { ordersFeature, default as ordersFeatureDefault } from './feature';

// Configuration
export { ordersConfig, ordersAccess, ordersTabs } from './config';

// Model
export type { Order, OrderItem, OrderStatus } from './model';
export { canCancelOrder, getOrderStatusColor } from './model';

// Hooks
export { orderKeys, useOrders, useOrder, useCreateOrder, useCancelOrder } from './hooks';

// View Model
export { useOrdersViewModel, defaultViewState } from './wiring/viewModel';
export type { OrdersViewState, OrdersViewModel } from './wiring/viewModel';

// Components
export { OrdersPage } from './components/OrdersPage';
export { OrdersList } from './components/OrdersList';
```

## Feature Registration

### Automatic Registration

Features are automatically registered when imported:

```typescript
// features/index.ts
export * from './reports';
export * from './orders';  // Add new feature export
```

### Manual Registration

For dynamic loading:

```typescript
import { registerFeature, initializeFeatures } from '@/lib/feature';
import { ordersFeature } from '@/features/orders';

// Single feature
registerFeature(ordersFeature);

// Multiple features
initializeFeatures([ordersFeature, reportsFeature, usersFeature]);
```

### Dynamic Route Generation

```typescript
import { getFeatureRoutes, getFeatureNavItems } from '@/lib/feature';

// Get route objects for react-router
const featureRoutes = getFeatureRoutes();

// Get navigation items for menus
const navItems = getFeatureNavItems();
// [{ id: 'orders', name: 'Orders', path: '/orders', icon: 'shopping-cart', order: 20 }]
```

## Best Practices

### 1. Keep Features Self-Contained

Each feature should be independently deployable. Avoid cross-feature imports except through the public API (`index.ts`).

```typescript
// ❌ Bad: Direct import from another feature's internals
import { OrderFilters } from '../orders/components/OrderFilters';

// ✅ Good: Import from public API
import { OrderFilters } from '@/features/orders';
```

### 2. Use Barrel Exports

Export only what's needed from `index.ts`:

```typescript
// Only export public API
export { ordersFeature } from './feature';
export { useOrders } from './hooks';
export type { Order } from './model';

// Don't export internal utilities
// export { internalHelper } from './utils'; ❌
```

### 3. Separate Concerns

- **Model**: Pure types and business logic
- **Wiring**: API calls and data transformation
- **Hooks**: React-specific data fetching
- **Components**: UI rendering only

### 4. Type Everything

Use TypeScript for all exports:

```typescript
export interface OrdersListProps {
  orders: Order[];
  isLoading: boolean;
  onCancel: (id: string) => Promise<void>;
}

export function OrdersList({ orders, isLoading, onCancel }: OrdersListProps) {
  // ...
}
```

### 5. Document Public APIs

```typescript
/**
 * Hook to fetch and manage orders list
 * @param params - Query parameters for filtering
 * @returns Orders query result with data, loading, and error states
 * @example
 * const { orders, isLoading } = useOrders({ status: 'pending' });
 */
export function useOrders(params?: OrderQueryParams) {
  // ...
}
```

## Testing Features

### Unit Testing Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useOrders } from './hooks';

test('useOrders fetches orders', async () => {
  const { result } = renderHook(() => useOrders(), {
    wrapper: TestProviders,
  });
  
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });
  
  expect(result.current.orders).toHaveLength(10);
});
```

### Testing Components

```typescript
import { render, screen } from '@testing-library/react';
import { OrdersList } from './OrdersList';

test('renders orders list', () => {
  render(
    <OrdersList 
      orders={mockOrders} 
      isLoading={false} 
      onCancel={jest.fn()} 
    />
  );
  
  expect(screen.getByText('Order #123')).toBeInTheDocument();
});
```

## Migration Guide

### Converting Existing Code to Features

1. Identify feature boundaries
2. Create feature directory structure
3. Move related files into feature
4. Update imports to use feature paths
5. Create barrel exports
6. Register feature

For detailed migration instructions from other frameworks, see the [Migration Guide](./MIGRATION.md).

---

## Related Documentation

### Core Concepts
- [Architecture Overview](./ARCHITECTURE.md) - System design and patterns
- [Getting Started](./GETTING_STARTED.md) - Initial setup and development workflow
- [State Management](./STATE.md) - Zustand + TanStack Query patterns

### API & Data
- [API Documentation](./API.md) - Data fetching and service layer
- [Hooks Reference](./HOOKS_REFERENCE.md) - Custom hooks for features

### Testing
- [Testing Guide](./TESTING.md) - Unit, integration, and E2E testing patterns

### Configuration
- [Configuration Guide](./CONFIGURATION.md) - Feature configuration options
- [Config Reference](./CONFIG_REFERENCE.md) - Complete configuration reference

---

<p align="center">
  <strong>Feature Architecture Guide</strong><br>
  Building self-contained, scalable features
</p>
