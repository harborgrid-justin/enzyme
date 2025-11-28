# Queries Module

> React Query utilities and query key factories.

## Overview

The queries module provides React Query integration utilities, query key factories, and common query patterns for data fetching.

## Quick Start

```tsx
import {
  createQueryKeyFactory,
  useQueryWithRetry,
  commonQueryOptions
} from '@/lib/queries';

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
    queryFn: () => fetchUser(id),
    ...commonQueryOptions.standard,
  });
}
```

## Exports

| Export | Type | Description |
|--------|------|-------------|
| `createQueryKeyFactory` | Function | Type-safe query key factory |
| `commonQueryOptions` | Object | Preset query configurations |
| `useQueryWithRetry` | Hook | Query with retry configuration |
| `useInvalidateQueries` | Hook | Query invalidation helper |

## Query Key Patterns

```typescript
// Hierarchical keys for cache invalidation
const keys = createQueryKeyFactory('posts', {
  all: () => ['posts'],
  lists: () => ['posts', 'list'],
  list: (filters) => ['posts', 'list', filters],
  details: () => ['posts', 'detail'],
  detail: (id) => ['posts', 'detail', id],
});

// Invalidate all posts
queryClient.invalidateQueries({ queryKey: keys.all() });

// Invalidate only lists
queryClient.invalidateQueries({ queryKey: keys.lists() });
```

## See Also

- [API Module](../api/README.md)
- [State Management](../state/README.md)
