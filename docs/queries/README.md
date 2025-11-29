# React Query Integration

> Comprehensive React Query utilities and query key factories for efficient data fetching and caching.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Query Key Factories](#query-key-factories)
- [Common Query Options](#common-query-options)
- [Custom Hooks](#custom-hooks)
- [Integration with API Module](#integration-with-api-module)
- [Cache Management](#cache-management)
- [Best Practices](#best-practices)
- [Examples](#examples)
- [API Reference](#api-reference)

## Overview

The Queries module provides React Query integration utilities, query key factories, and common query patterns for data fetching. It builds on [@tanstack/react-query](https://tanstack.com/query) to offer type-safe, efficient data fetching with automatic caching, background updates, and request deduplication.

### Key Features

- **Type-Safe Query Keys**: Factory pattern for consistent, type-safe query keys
- **Common Query Options**: Pre-configured query options for common use cases
- **Retry Configuration**: Built-in retry logic with exponential backoff
- **Query Invalidation**: Helpers for cache invalidation and refetching
- **Integration**: Seamless integration with the API module
- **DevTools**: React Query DevTools integration for debugging
- **Optimistic Updates**: Patterns for optimistic UI updates
- **Infinite Queries**: Support for pagination and infinite scrolling

## Quick Start

### Basic Query

```tsx
import { useQuery } from '@tanstack/react-query';
import { createQueryKeyFactory } from '@missionfabric-js/enzyme/queries';
import { apiClient } from '@missionfabric-js/enzyme/api';

// Create type-safe query keys
const userKeys = createQueryKeyFactory('users', {
  all: () => ['users'],
  detail: (id: string) => ['users', id],
  list: (filters: UserFilters) => ['users', 'list', filters],
});

// Use in queries
function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => apiClient.get<User>(`/users/${id}`),
  });
}

// Use in component
function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = useUser(userId);

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return <div>{data.name}</div>;
}
```

### Using Common Query Options

```tsx
import { commonQueryOptions } from '@missionfabric-js/enzyme/queries';

function useUsers() {
  return useQuery({
    queryKey: userKeys.all(),
    queryFn: () => apiClient.get<User[]>('/users'),
    ...commonQueryOptions.standard, // 5-minute stale time, retry logic
  });
}

// Or use specific presets
function useRealtimeData() {
  return useQuery({
    queryKey: ['realtime', 'stats'],
    queryFn: () => apiClient.get('/stats'),
    ...commonQueryOptions.realtime, // 5-second stale time, fast refetch
  });
}
```

## Core Concepts

### Query Keys

Query keys are the foundation of React Query's caching system. They uniquely identify queries and determine when data should be refetched.

```typescript
// Hierarchical key structure
const userKeys = createQueryKeyFactory('users', {
  all: () => ['users'] as const,
  lists: () => ['users', 'list'] as const,
  list: (filters: UserFilters) => ['users', 'list', filters] as const,
  details: () => ['users', 'detail'] as const,
  detail: (id: string) => ['users', 'detail', id] as const,
  posts: (userId: string) => ['users', userId, 'posts'] as const,
});

// Usage
const allUsersKey = userKeys.all();           // ['users']
const userListKey = userKeys.list({ active: true }); // ['users', 'list', { active: true }]
const userDetailKey = userKeys.detail('123'); // ['users', 'detail', '123']
```

**Benefits:**
- Type-safe key generation
- Consistent naming patterns
- Easy cache invalidation
- Hierarchical structure for selective invalidation

### Query Options

Common configurations for different data fetching patterns:

```typescript
interface CommonQueryOptions {
  // Standard queries - 5 minute stale time
  standard: {
    staleTime: 300000;
    cacheTime: 600000;
    retry: 3;
    refetchOnWindowFocus: true;
  };

  // Realtime queries - 5 second stale time
  realtime: {
    staleTime: 5000;
    cacheTime: 10000;
    retry: 1;
    refetchInterval: 5000;
  };

  // Static data - 1 hour stale time
  static: {
    staleTime: 3600000;
    cacheTime: 7200000;
    retry: 2;
    refetchOnWindowFocus: false;
  };

  // No cache - always fetch fresh
  noCache: {
    staleTime: 0;
    cacheTime: 0;
    retry: 0;
  };
}
```

## Query Key Factories

### Creating a Factory

```typescript
import { createQueryKeyFactory } from '@missionfabric-js/enzyme/queries';

interface PostFilters {
  category?: string;
  author?: string;
  status?: 'draft' | 'published';
}

const postKeys = createQueryKeyFactory('posts', {
  all: () => ['posts'] as const,
  lists: () => ['posts', 'list'] as const,
  list: (filters: PostFilters) => ['posts', 'list', filters] as const,
  details: () => ['posts', 'detail'] as const,
  detail: (id: string) => ['posts', 'detail', id] as const,
  comments: (postId: string) => ['posts', postId, 'comments'] as const,
});
```

### Invalidation Patterns

```typescript
import { useQueryClient } from '@tanstack/react-query';

function usePostMutations() {
  const queryClient = useQueryClient();

  const createPost = useMutation({
    mutationFn: (data: CreatePostDto) => apiClient.post('/posts', data),
    onSuccess: () => {
      // Invalidate all post lists
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });

  const updatePost = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePostDto }) =>
      apiClient.patch(`/posts/${id}`, data),
    onSuccess: (_, { id }) => {
      // Invalidate specific post
      queryClient.invalidateQueries({ queryKey: postKeys.detail(id) });
      // Also invalidate lists
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });

  const deletePost = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/posts/${id}`),
    onSuccess: () => {
      // Invalidate all posts
      queryClient.invalidateQueries({ queryKey: postKeys.all() });
    },
  });

  return { createPost, updatePost, deletePost };
}
```

## Common Query Options

Pre-configured options for different data patterns:

### Standard Queries

```typescript
import { commonQueryOptions } from '@missionfabric-js/enzyme/queries';

// For typical CRUD operations
function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => apiClient.get('/products'),
    ...commonQueryOptions.standard,
    // staleTime: 5 minutes
    // cacheTime: 10 minutes
    // retry: 3 attempts
  });
}
```

### Realtime Queries

```typescript
// For frequently changing data
function useLiveMetrics() {
  return useQuery({
    queryKey: ['metrics', 'live'],
    queryFn: () => apiClient.get('/metrics'),
    ...commonQueryOptions.realtime,
    // staleTime: 5 seconds
    // refetchInterval: 5 seconds
    // retry: 1 attempt
  });
}
```

### Static Queries

```typescript
// For rarely changing data (config, metadata)
function useAppConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: () => apiClient.get('/config'),
    ...commonQueryOptions.static,
    // staleTime: 1 hour
    // refetchOnWindowFocus: false
  });
}
```

## Custom Hooks

### useQueryWithRetry

Enhanced query hook with custom retry logic:

```typescript
import { useQueryWithRetry } from '@missionfabric-js/enzyme/queries';

function useUserWithRetry(id: string) {
  return useQueryWithRetry({
    queryKey: userKeys.detail(id),
    queryFn: () => apiClient.get(`/users/${id}`),
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
```

### useInvalidateQueries

Helper for query invalidation:

```typescript
import { useInvalidateQueries } from '@missionfabric-js/enzyme/queries';

function UserActions() {
  const invalidate = useInvalidateQueries();

  const handleRefresh = () => {
    invalidate({ queryKey: userKeys.all() });
  };

  const handleRefreshUser = (userId: string) => {
    invalidate({ queryKey: userKeys.detail(userId) });
  };

  return (
    <div>
      <button onClick={handleRefresh}>Refresh All Users</button>
    </div>
  );
}
```

## Integration with API Module

The Queries module works seamlessly with the API module:

```typescript
import { useApiRequest, useApiMutation } from '@missionfabric-js/enzyme/api';
import { createQueryKeyFactory } from '@missionfabric-js/enzyme/queries';

const taskKeys = createQueryKeyFactory('tasks', {
  all: () => ['tasks'],
  detail: (id: string) => ['tasks', id],
  list: (filters: TaskFilters) => ['tasks', 'list', filters],
});

// Using API hooks with query keys
function TaskList() {
  const { data, isLoading } = useApiRequest<Task[]>({
    url: '/tasks',
    queryKey: taskKeys.all(),
  });

  const createTask = useApiMutation<Task>({
    method: 'POST',
    url: '/tasks',
    invalidateQueries: [taskKeys.all()],
  });

  return (
    <div>
      {data?.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
      <button onClick={() => createTask.mutate({ title: 'New Task' })}>
        Add Task
      </button>
    </div>
  );
}
```

See [API Module Documentation](../api/README.md) for complete API integration patterns.

## Cache Management

### Manual Cache Updates

```typescript
import { useQueryClient } from '@tanstack/react-query';

function useOptimisticUpdate() {
  const queryClient = useQueryClient();

  const updateUser = useMutation({
    mutationFn: (data: UpdateUserDto) => apiClient.patch('/users/me', data),

    // Optimistic update
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userKeys.detail('me') });

      // Snapshot previous value
      const previous = queryClient.getQueryData(userKeys.detail('me'));

      // Optimistically update
      queryClient.setQueryData(userKeys.detail('me'), (old: User) => ({
        ...old,
        ...newData,
      }));

      return { previous };
    },

    // Rollback on error
    onError: (err, newData, context) => {
      queryClient.setQueryData(userKeys.detail('me'), context.previous);
    },

    // Refetch after success or error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail('me') });
    },
  });

  return updateUser;
}
```

### Cache Prefetching

```typescript
import { useQueryClient } from '@tanstack/react-query';

function UserList() {
  const queryClient = useQueryClient();

  const prefetchUser = (userId: string) => {
    queryClient.prefetchQuery({
      queryKey: userKeys.detail(userId),
      queryFn: () => apiClient.get(`/users/${userId}`),
      staleTime: 60000, // Cache for 1 minute
    });
  };

  return (
    <div>
      {users.map(user => (
        <div
          key={user.id}
          onMouseEnter={() => prefetchUser(user.id)}
        >
          {user.name}
        </div>
      ))}
    </div>
  );
}
```

### Cache Persistence

```typescript
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
});
```

## Best Practices

### 1. Consistent Key Structure

```typescript
// ✅ Good - Hierarchical and predictable
const keys = createQueryKeyFactory('users', {
  all: () => ['users'],
  lists: () => ['users', 'list'],
  list: (filters) => ['users', 'list', filters],
  details: () => ['users', 'detail'],
  detail: (id) => ['users', 'detail', id],
});

// ❌ Bad - Inconsistent structure
const badKeys = {
  users: ['users'],
  userById: (id: string) => ['user', id], // Should be ['users', 'detail', id]
  userList: (page: number) => [page, 'users'], // Parameters should be last
};
```

### 2. Selective Invalidation

```typescript
// ✅ Good - Invalidate only what changed
queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) });
queryClient.invalidateQueries({ queryKey: postKeys.lists() });

// ❌ Bad - Invalidates everything
queryClient.invalidateQueries({ queryKey: postKeys.all() });
```

### 3. Use Query Options Presets

```typescript
// ✅ Good - Use presets for consistency
const { data } = useQuery({
  queryKey: ['config'],
  queryFn: fetchConfig,
  ...commonQueryOptions.static,
});

// ❌ Bad - Manual configuration everywhere
const { data } = useQuery({
  queryKey: ['config'],
  queryFn: fetchConfig,
  staleTime: 3600000,
  cacheTime: 7200000,
  retry: 2,
});
```

### 4. Type Your Query Functions

```typescript
// ✅ Good - Explicit types
const useUser = (id: string) => {
  return useQuery<User, Error>({
    queryKey: userKeys.detail(id),
    queryFn: () => apiClient.get<User>(`/users/${id}`),
  });
};

// ❌ Bad - No types
const useUser = (id) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => fetch(`/users/${id}`).then(r => r.json()),
  });
};
```

## Examples

### Complete CRUD with Query Keys

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeyFactory } from '@missionfabric-js/enzyme/queries';
import { apiClient } from '@missionfabric-js/enzyme/api';

// Define types
interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

interface TodoFilters {
  completed?: boolean;
  search?: string;
}

// Create query keys
const todoKeys = createQueryKeyFactory('todos', {
  all: () => ['todos'] as const,
  lists: () => ['todos', 'list'] as const,
  list: (filters: TodoFilters) => ['todos', 'list', filters] as const,
  details: () => ['todos', 'detail'] as const,
  detail: (id: string) => ['todos', 'detail', id] as const,
});

// Custom hooks
export function useTodos(filters: TodoFilters = {}) {
  return useQuery({
    queryKey: todoKeys.list(filters),
    queryFn: () => apiClient.get<Todo[]>('/todos', { params: filters }),
  });
}

export function useTodo(id: string) {
  return useQuery({
    queryKey: todoKeys.detail(id),
    queryFn: () => apiClient.get<Todo>(`/todos/${id}`),
    enabled: !!id,
  });
}

export function useTodoMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (data: Omit<Todo, 'id'>) =>
      apiClient.post<Todo>('/todos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }: Partial<Todo> & { id: string }) =>
      apiClient.patch<Todo>(`/todos/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: todoKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/todos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.all() });
    },
  });

  const toggle = useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<Todo>(`/todos/${id}/toggle`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.detail(id) });

      const previous = queryClient.getQueryData<Todo>(todoKeys.detail(id));

      if (previous) {
        queryClient.setQueryData<Todo>(todoKeys.detail(id), {
          ...previous,
          completed: !previous.completed,
        });
      }

      return { previous };
    },
    onError: (err, id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(todoKeys.detail(id), context.previous);
      }
    },
    onSettled: (_, __, id) => {
      queryClient.invalidateQueries({ queryKey: todoKeys.detail(id) });
    },
  });

  return { create, update, remove, toggle };
}

// Component usage
function TodoApp() {
  const [filters, setFilters] = useState<TodoFilters>({});
  const { data: todos, isLoading } = useTodos(filters);
  const { create, update, remove, toggle } = useTodoMutations();

  if (isLoading) return <Spinner />;

  return (
    <div>
      <button onClick={() => create.mutate({ title: 'New Todo', completed: false })}>
        Add Todo
      </button>
      {todos?.map(todo => (
        <div key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => toggle.mutate(todo.id)}
          />
          <span>{todo.title}</span>
          <button onClick={() => remove.mutate(todo.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

### Infinite Scroll

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

function useInfinitePosts() {
  return useInfiniteQuery({
    queryKey: ['posts', 'infinite'],
    queryFn: ({ pageParam = 0 }) =>
      apiClient.get<PaginatedResponse<Post>>('/posts', {
        params: { cursor: pageParam },
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
  });
}

function InfinitePostList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfinitePosts();

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.items.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ))}
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

## API Reference

### createQueryKeyFactory

```typescript
function createQueryKeyFactory<T extends string>(
  namespace: T,
  keys: Record<string, (...args: any[]) => readonly unknown[]>
): Record<keyof typeof keys, (...args: any[]) => readonly unknown[]>;
```

Creates a factory for generating consistent query keys.

**Parameters:**
- `namespace` - Unique namespace for the keys (e.g., 'users', 'posts')
- `keys` - Object mapping key names to functions that return key arrays

**Returns:** Object with the same keys, each returning a readonly array

### commonQueryOptions

```typescript
const commonQueryOptions: {
  standard: QueryOptions;
  realtime: QueryOptions;
  static: QueryOptions;
  noCache: QueryOptions;
};
```

Pre-configured query options for common use cases.

### useQueryWithRetry

```typescript
function useQueryWithRetry<TData, TError>(
  options: UseQueryOptions<TData, TError> & {
    retry?: number;
    retryDelay?: (attemptIndex: number) => number;
  }
): UseQueryResult<TData, TError>;
```

Enhanced query hook with custom retry logic.

### useInvalidateQueries

```typescript
function useInvalidateQueries(): (
  filters?: InvalidateQueryFilters
) => Promise<void>;
```

Returns a function to invalidate queries.

## See Also

- **[API Module](../api/README.md)** - HTTP client and API utilities
- **[State Management](../state/README.md)** - Global state with Zustand
- **[Realtime](../realtime/README.md)** - WebSocket and SSE integration
- **[Performance](../performance/README.md)** - Performance optimization

## External Resources

- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)
- [Query Keys Best Practices](https://tkdodo.eu/blog/effective-react-query-keys)
