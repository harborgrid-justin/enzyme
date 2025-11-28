# API Layer Documentation

> **Scope**: This document covers the React Template's API layer patterns and HTTP client usage.
> For the Harbor React Library's internal API, see [Library API](../src/lib/docs/API.md).

---

> **HTTP client and data fetching patterns** - Type-safe API clients, request handling, caching, and error management.

---

## Table of Contents

1. [Overview](#overview)
2. [HTTP Client](#http-client)
3. [API Client Factory](#api-client-factory)
4. [Request Handling](#request-handling)
5. [Response Handling](#response-handling)
6. [Caching](#caching)
7. [Error Handling](#error-handling)
8. [Advanced Patterns](#advanced-patterns)
9. [Testing APIs](#testing-apis)

---

## Overview

### API Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      API LAYER ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Components                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  useQuery / useMutation hooks                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│  Feature API                 ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  productsService.getProducts() / ordersService.createOrder()     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│  API Client                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  createApiClient<Product>({ basePath: '/api/products' })         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│  HTTP Client                 ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Axios instance with interceptors                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│  Server                      ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  REST API / GraphQL                                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## HTTP Client

### Base HTTP Client

```typescript
// src/lib/services/http.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { env } from '@/config';

export const http: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeout,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Request Interceptors

```typescript
// Add authentication
http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add request ID for tracing
http.interceptors.request.use((config) => {
  config.headers['X-Request-ID'] = generateRequestId();
  return config;
});

// Log requests in development
if (env.isDev) {
  http.interceptors.request.use((config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  });
}
```

### Response Interceptors

```typescript
// Transform response data
http.interceptors.response.use(
  (response) => {
    // Unwrap data envelope if present
    if (response.data?.data) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    // Handle errors globally
    return Promise.reject(error);
  }
);

// Handle authentication errors
http.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        return http.request(error.config);
      }
      redirectToLogin();
    }
    return Promise.reject(error);
  }
);
```

---

## API Client Factory

### Creating Typed API Clients

```typescript
// src/lib/services/apiClients.ts
import { http } from './http';

export interface ListQueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiClientConfig {
  basePath: string;
  cacheTtl?: number;
  enableCache?: boolean;
}

export function createApiClient<T extends { id: string }>(config: ApiClientConfig) {
  const { basePath } = config;

  return {
    // GET all
    async getAll(params?: ListQueryParams): Promise<PaginatedResponse<T>> {
      const response = await http.get(basePath, { params });
      return response.data;
    },

    // GET by ID
    async getById(id: string): Promise<T> {
      const response = await http.get(`${basePath}/${id}`);
      return response.data;
    },

    // POST create
    async create(data: Omit<T, 'id'>): Promise<T> {
      const response = await http.post(basePath, data);
      return response.data;
    },

    // PUT update
    async update(id: string, data: Partial<T>): Promise<T> {
      const response = await http.put(`${basePath}/${id}`, data);
      return response.data;
    },

    // PATCH partial update
    async patch(id: string, data: Partial<T>): Promise<T> {
      const response = await http.patch(`${basePath}/${id}`, data);
      return response.data;
    },

    // DELETE
    async delete(id: string): Promise<void> {
      await http.delete(`${basePath}/${id}`);
    },

    // Custom endpoints
    async customGet<R>(path: string, params?: object): Promise<R> {
      const response = await http.get(`${basePath}${path}`, { params });
      return response.data;
    },

    async customPost<R>(path: string, data?: object): Promise<R> {
      const response = await http.post(`${basePath}${path}`, data);
      return response.data;
    },
  };
}
```

### Using API Clients in Features

```typescript
// src/features/products/wiring/api.ts
import { createApiClient, type ListQueryParams } from '@/lib/services/apiClients';
import type { Product } from '../model';

// Create typed client
const productsApi = createApiClient<Product>({
  basePath: '/api/products',
  cacheTtl: 5 * 60 * 1000,
});

// Extended query params
export interface ProductQueryParams extends ListQueryParams {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

// Feature service
export const productsService = {
  getProducts: (params?: ProductQueryParams) =>
    productsApi.getAll(params),

  getProduct: (id: string) =>
    productsApi.getById(id),

  createProduct: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) =>
    productsApi.create(data),

  updateProduct: (id: string, data: Partial<Product>) =>
    productsApi.update(id, data),

  deleteProduct: (id: string) =>
    productsApi.delete(id),

  // Custom endpoints
  getCategories: () =>
    productsApi.customGet<string[]>('/categories'),

  searchProducts: (query: string) =>
    productsApi.customGet<Product[]>('/search', { q: query }),
};
```

---

## Request Handling

### Query Hooks with TanStack Query

```typescript
// src/features/products/hooks/index.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService, type ProductQueryParams } from '../wiring/api';

// Query key factory
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params?: ProductQueryParams) => [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  categories: () => [...productKeys.all, 'categories'] as const,
};

// List query
export function useProducts(params?: ProductQueryParams) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productsService.getProducts(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Detail query
export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productsService.getProduct(id),
    enabled: !!id,
  });
}

// Create mutation
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productsService.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

// Update mutation
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
      productsService.updateProduct(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

// Delete mutation
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productsService.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}
```

### Parallel Queries

```typescript
import { useQueries } from '@tanstack/react-query';

function Dashboard() {
  const results = useQueries({
    queries: [
      {
        queryKey: productKeys.list(),
        queryFn: () => productsService.getProducts(),
      },
      {
        queryKey: orderKeys.list(),
        queryFn: () => ordersService.getOrders(),
      },
      {
        queryKey: userKeys.list(),
        queryFn: () => usersService.getUsers(),
      },
    ],
  });

  const [products, orders, users] = results;

  const isLoading = results.some((r) => r.isLoading);

  return isLoading ? <Loading /> : <DashboardContent {...{ products, orders, users }} />;
}
```

### Dependent Queries

```typescript
function OrderDetails({ orderId }) {
  // First query
  const { data: order } = useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => ordersService.getOrder(orderId),
  });

  // Dependent query - only runs when order is loaded
  const { data: customer } = useQuery({
    queryKey: customerKeys.detail(order?.customerId),
    queryFn: () => customersService.getCustomer(order!.customerId),
    enabled: !!order?.customerId,
  });

  return <OrderContent order={order} customer={customer} />;
}
```

---

## Response Handling

### Response Types

```typescript
// Standard API response wrapper
interface ApiResponse<T> {
  data: T;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

// Paginated response
interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Error response
interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  timestamp: string;
  requestId: string;
}
```

### Response Transformation

```typescript
// Transform API response to domain model
function transformProduct(apiProduct: ApiProduct): Product {
  return {
    ...apiProduct,
    createdAt: new Date(apiProduct.createdAt),
    updatedAt: new Date(apiProduct.updatedAt),
    price: Number(apiProduct.price),
  };
}

// Use in service
export const productsService = {
  async getProduct(id: string): Promise<Product> {
    const response = await productsApi.getById(id);
    return transformProduct(response);
  },

  async getProducts(params?: ProductQueryParams): Promise<PaginatedResponse<Product>> {
    const response = await productsApi.getAll(params);
    return {
      ...response,
      items: response.items.map(transformProduct),
    };
  },
};
```

---

## Caching

### Query Cache Configuration

```typescript
// src/lib/queries/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000,   // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### Prefetching

```typescript
import { useQueryClient } from '@tanstack/react-query';

function ProductList() {
  const queryClient = useQueryClient();

  // Prefetch on hover
  const handleProductHover = (productId: string) => {
    queryClient.prefetchQuery({
      queryKey: productKeys.detail(productId),
      queryFn: () => productsService.getProduct(productId),
      staleTime: 5 * 60 * 1000,
    });
  };

  return (
    <ul>
      {products.map((product) => (
        <li
          key={product.id}
          onMouseEnter={() => handleProductHover(product.id)}
        >
          <Link to={`/products/${product.id}`}>{product.name}</Link>
        </li>
      ))}
    </ul>
  );
}
```

### Cache Invalidation

```typescript
const queryClient = useQueryClient();

// Invalidate specific query
queryClient.invalidateQueries({ queryKey: productKeys.detail('123') });

// Invalidate all list queries
queryClient.invalidateQueries({ queryKey: productKeys.lists() });

// Invalidate everything for a feature
queryClient.invalidateQueries({ queryKey: productKeys.all });

// Remove from cache
queryClient.removeQueries({ queryKey: productKeys.detail('123') });

// Set data directly
queryClient.setQueryData(productKeys.detail('123'), newProduct);
```

---

## Error Handling

### Error Types

```typescript
// src/lib/services/errors.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message = 'Network error') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### Global Error Handler

```typescript
// Response interceptor for error handling
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // Network error
      throw new NetworkError();
    }

    const { status, data } = error.response;

    switch (status) {
      case 400:
        throw new ValidationError(data.message, data.details);
      case 401:
        // Handled by auth interceptor
        break;
      case 403:
        throw new ApiError('Access denied', 'FORBIDDEN', 403);
      case 404:
        throw new ApiError('Resource not found', 'NOT_FOUND', 404);
      case 422:
        throw new ValidationError(data.message, data.errors);
      case 429:
        throw new ApiError('Too many requests', 'RATE_LIMIT', 429);
      case 500:
        throw new ApiError('Server error', 'SERVER_ERROR', 500);
      default:
        throw new ApiError(data.message || 'Unknown error', 'UNKNOWN', status);
    }

    return Promise.reject(error);
  }
);
```

### Error Handling in Components

```tsx
import { useQuery } from '@tanstack/react-query';

function ProductDetails({ productId }) {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: productKeys.detail(productId),
    queryFn: () => productsService.getProduct(productId),
  });

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    if (error instanceof NetworkError) {
      return (
        <ErrorState
          message="Unable to connect. Check your internet connection."
          retry={refetch}
        />
      );
    }

    if (error instanceof ApiError && error.status === 404) {
      return <NotFound message="Product not found" />;
    }

    return <ErrorState message={error.message} retry={refetch} />;
  }

  return <ProductContent product={data} />;
}
```

---

## Advanced Patterns

### Optimistic Updates

```typescript
function useOptimisticUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => productsService.updateProduct(id, data),

    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: productKeys.detail(id) });

      // Snapshot previous value
      const previousProduct = queryClient.getQueryData(productKeys.detail(id));

      // Optimistically update
      queryClient.setQueryData(productKeys.detail(id), (old) => ({
        ...old,
        ...data,
      }));

      return { previousProduct };
    },

    onError: (err, { id }, context) => {
      // Rollback on error
      if (context?.previousProduct) {
        queryClient.setQueryData(productKeys.detail(id), context.previousProduct);
      }
    },

    onSettled: (_, __, { id }) => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
    },
  });
}
```

### Infinite Queries

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

function useInfiniteProducts(params?: ProductQueryParams) {
  return useInfiniteQuery({
    queryKey: productKeys.list({ ...params, infinite: true }),
    queryFn: ({ pageParam = 1 }) =>
      productsService.getProducts({ ...params, page: pageParam }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    initialPageParam: 1,
  });
}

// Usage
function InfiniteProductList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteProducts();

  const products = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}

      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

### Request Deduplication

```typescript
// TanStack Query automatically deduplicates requests with same queryKey
// These will result in only ONE network request:
function ComponentA() {
  const { data } = useProducts(); // Request 1
  return <div>{data?.items.length}</div>;
}

function ComponentB() {
  const { data } = useProducts(); // Same queryKey, deduplicated
  return <div>{data?.items.length}</div>;
}
```

---

## Testing APIs

### Mocking with MSW

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/products', () => {
    return HttpResponse.json({
      items: [
        { id: '1', name: 'Product 1', price: 99.99 },
        { id: '2', name: 'Product 2', price: 149.99 },
      ],
      pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
    });
  }),

  http.get('/api/products/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: `Product ${params.id}`,
      price: 99.99,
    });
  }),

  http.post('/api/products', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'new-id',
      ...body,
    }, { status: 201 });
  }),
];
```

### Testing Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { useProducts } from './hooks';

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('useProducts', () => {
  it('fetches products', async () => {
    const { result } = renderHook(() => useProducts(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.items).toHaveLength(2);
  });
});
```

---

## See Also

### Core Concepts
- [Architecture Overview](./ARCHITECTURE.md) - System architecture and design patterns
- [State Management](./STATE.md) - Zustand + React Query integration
- [Authentication](../src/lib/docs/AUTHENTICATION.md) - API authentication patterns
- [Routing](../src/lib/docs/ROUTING.md) - Route-based data fetching

### Configuration & Setup
- [Configuration Guide](./CONFIGURATION.md) - API endpoint configuration
- [Environment Setup](./ENVIRONMENT.md) - Environment variables for API
- [Security Guide](./SECURITY.md) - API security best practices

### Development
- [Getting Started](./GETTING_STARTED.md) - Initial setup guide
- [Testing Guide](./TESTING.md) - Testing API calls and mocks
- [Performance Guide](./PERFORMANCE.md) - API caching and optimization

### Reference
- [Hooks Reference](./HOOKS_REFERENCE.md) - Data fetching hooks
- [Documentation Index](./INDEX.md) - Complete documentation map

---

<p align="center">
  <strong>API Layer</strong><br>
  Type-safe data fetching at scale
</p>
