# Realtime + Queries + Services Integration Guide

> **Harbor React Framework** - Comprehensive integration patterns for real-time data, query caching, and service layer.

## Table of Contents
- [Provider Composition](#provider-composition)
- [WebSocket + Query Cache](#websocket--query-cache)
- [SSE + TanStack Query](#sse--tanstack-query)
- [Optimistic Mutations](#optimistic-mutations)
- [Offline Support](#offline-support)
- [Live Collaboration](#live-collaboration)
- [Cache Consistency](#cache-consistency)
- [Common Patterns](#common-patterns)

---

## Provider Composition

### Recommended Stack

```
┌────────────────────────────────────────────────────────────┐
│  QueryClientProvider (TanStack Query)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  RealtimeProvider (WebSocket + SSE management)       │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  ServiceLayerProvider (API clients)            │  │  │
│  │  │  ┌──────────────────────────────────────────┐  │  │  │
│  │  │  │  App Components                          │  │  │  │
│  │  │  └──────────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

#### Example 1: Complete Provider Setup

```tsx
// app/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RealtimeProvider } from '@/lib/realtime';
import { ServiceLayerProvider } from '@/lib/services';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
      retry: 3,
      refetchOnWindowFocus: false
    }
  }
});

export function DataProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider
        websocketUrl={import.meta.env.VITE_WS_URL}
        sseUrl={import.meta.env.VITE_SSE_URL}
        reconnectAttempts={5}
        onConnect={() => console.log('Realtime connected')}
        onDisconnect={() => console.log('Realtime disconnected')}
      >
        <ServiceLayerProvider
          baseUrl={import.meta.env.VITE_API_URL}
          queryClient={queryClient}
        >
          {children}
        </ServiceLayerProvider>
      </RealtimeProvider>
    </QueryClientProvider>
  );
}
```

---

## WebSocket + Query Cache

### Example 2: WebSocket Events Invalidating Cache

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeStream } from '@/lib/realtime';
import { createQueryKeyFactory } from '@/lib/queries';
import { useEffect } from 'react';

const projectKeys = createQueryKeyFactory('projects');

export function useProjectRealtimeSync(projectId: string) {
  const queryClient = useQueryClient();

  useRealtimeStream({
    channel: `project:${projectId}`,
    events: {
      // Invalidate when project is updated
      'project:updated': (data) => {
        queryClient.invalidateQueries({
          queryKey: projectKeys.detail(projectId)
        });
      },

      // Update cache directly for task changes
      'task:created': (task) => {
        queryClient.setQueryData(
          projectKeys.detail(projectId),
          (old: Project | undefined) => {
            if (!old) return old;
            return {
              ...old,
              tasks: [...old.tasks, task]
            };
          }
        );
      },

      // Remove from cache
      'task:deleted': ({ taskId }) => {
        queryClient.setQueryData(
          projectKeys.detail(projectId),
          (old: Project | undefined) => {
            if (!old) return old;
            return {
              ...old,
              tasks: old.tasks.filter((t) => t.id !== taskId)
            };
          }
        );
      }
    }
  });
}
```

### Example 3: Batched WebSocket Updates

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeStream } from '@/lib/realtime';
import { useRef, useEffect } from 'react';

export function useBatchedRealtimeUpdates() {
  const queryClient = useQueryClient();
  const pendingUpdates = useRef<Map<string, unknown[]>>(new Map());
  const flushTimeout = useRef<NodeJS.Timeout>();

  // Batch updates to reduce re-renders
  const queueUpdate = (queryKey: string, update: unknown) => {
    const existing = pendingUpdates.current.get(queryKey) ?? [];
    pendingUpdates.current.set(queryKey, [...existing, update]);

    // Flush after 100ms of no updates
    clearTimeout(flushTimeout.current);
    flushTimeout.current = setTimeout(flushUpdates, 100);
  };

  const flushUpdates = () => {
    pendingUpdates.current.forEach((updates, key) => {
      queryClient.setQueryData(JSON.parse(key), (old: unknown[] | undefined) => {
        if (!old) return updates;
        return [...old, ...updates];
      });
    });
    pendingUpdates.current.clear();
  };

  useRealtimeStream({
    channel: 'notifications',
    events: {
      'notification:new': (notification) => {
        queueUpdate(JSON.stringify(['notifications']), notification);
      }
    }
  });

  // Cleanup
  useEffect(() => {
    return () => clearTimeout(flushTimeout.current);
  }, []);
}
```

### Example 4: WebSocket with Query Subscription

```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRealtimeStream } from '@/lib/realtime';
import { createResourceClient } from '@/lib/services';

const messagesClient = createResourceClient<Message>({ resource: 'messages' });

export function useRealtimeMessages(channelId: string) {
  const queryClient = useQueryClient();

  // Initial data fetch
  const query = useQuery({
    queryKey: ['messages', channelId],
    queryFn: () => messagesClient.list({ channelId }),
    staleTime: Infinity // Don't refetch, we'll update via WebSocket
  });

  // Real-time updates
  useRealtimeStream({
    channel: `channel:${channelId}:messages`,
    enabled: query.isSuccess, // Only connect after initial load
    events: {
      'message:new': (message: Message) => {
        queryClient.setQueryData(
          ['messages', channelId],
          (old: Message[] | undefined) => old ? [...old, message] : [message]
        );
      },
      'message:edited': (message: Message) => {
        queryClient.setQueryData(
          ['messages', channelId],
          (old: Message[] | undefined) =>
            old?.map((m) => (m.id === message.id ? message : m))
        );
      },
      'message:deleted': ({ id }: { id: string }) => {
        queryClient.setQueryData(
          ['messages', channelId],
          (old: Message[] | undefined) => old?.filter((m) => m.id !== id)
        );
      }
    }
  });

  return query;
}
```

---

## SSE + TanStack Query

### Example 5: SSE Stream to Query Cache

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeStream, streamToQueryCache } from '@/lib/realtime';

export function useSSEActivityFeed() {
  const queryClient = useQueryClient();

  // Automatically populate query cache from SSE
  useRealtimeStream({
    type: 'sse',
    endpoint: '/api/activity/stream',
    transform: (event) => ({
      type: event.event,
      data: JSON.parse(event.data)
    }),
    events: {
      activity: (data) => {
        // Use helper to update cache
        streamToQueryCache(queryClient, {
          queryKey: ['activity'],
          data,
          mode: 'prepend',
          maxItems: 100
        });
      }
    }
  });

  return useQuery({
    queryKey: ['activity'],
    queryFn: () => fetch('/api/activity').then((r) => r.json()),
    staleTime: Infinity
  });
}
```

### Example 6: SSE with Reconnection and Cache Sync

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeStream } from '@/lib/realtime';
import { useState, useCallback } from 'react';

export function useResilientSSE(endpoint: string, queryKey: unknown[]) {
  const queryClient = useQueryClient();
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  const handleReconnect = useCallback(async () => {
    // Fetch missed events since last known event
    if (lastEventId) {
      const missedEvents = await fetch(
        `${endpoint}/missed?since=${lastEventId}`
      ).then((r) => r.json());

      // Apply missed events to cache
      missedEvents.forEach((event: CacheEvent) => {
        queryClient.setQueryData(queryKey, (old: unknown) => {
          return applyEvent(old, event);
        });
      });
    } else {
      // Full refetch if no last event ID
      queryClient.invalidateQueries({ queryKey });
    }
  }, [lastEventId, endpoint, queryKey, queryClient]);

  useRealtimeStream({
    type: 'sse',
    endpoint,
    onConnect: () => setConnectionState('connected'),
    onDisconnect: () => setConnectionState('disconnected'),
    onReconnecting: () => setConnectionState('reconnecting'),
    onReconnected: handleReconnect,
    events: {
      update: (data, event) => {
        setLastEventId(event.lastEventId);
        queryClient.setQueryData(queryKey, (old: unknown) => {
          return applyEvent(old, data);
        });
      }
    }
  });

  return { connectionState };
}
```

### Example 7: SSE for Real-Time Metrics

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeStream } from '@/lib/realtime';

export function useRealtimeMetrics(dashboardId: string) {
  const queryClient = useQueryClient();

  useRealtimeStream({
    type: 'sse',
    endpoint: `/api/dashboards/${dashboardId}/metrics/stream`,
    events: {
      // Update individual metric widgets
      'metric:update': ({ metricId, value, timestamp }) => {
        queryClient.setQueryData(
          ['metrics', dashboardId, metricId],
          (old: MetricData | undefined) => ({
            ...old,
            currentValue: value,
            lastUpdated: timestamp,
            history: [...(old?.history ?? []).slice(-99), { value, timestamp }]
          })
        );
      },

      // Batch updates for charts
      'metrics:batch': (metrics: MetricUpdate[]) => {
        metrics.forEach(({ id, value, timestamp }) => {
          queryClient.setQueryData(
            ['metrics', dashboardId, id],
            (old: MetricData | undefined) => ({
              ...old,
              currentValue: value,
              lastUpdated: timestamp
            })
          );
        });
      },

      // Alert when threshold exceeded
      'metric:alert': (alert) => {
        queryClient.setQueryData(['alerts', dashboardId], (old: Alert[] = []) => [
          alert,
          ...old.slice(0, 49)
        ]);
      }
    }
  });
}
```

---

## Optimistic Mutations

### Example 8: Optimistic Update with Realtime Confirmation

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRealtimeStream } from '@/lib/realtime';
import { createResourceClient } from '@/lib/services';
import { useState, useRef } from 'react';

const tasksClient = createResourceClient<Task>({ resource: 'tasks' });

export function useOptimisticTaskUpdate(projectId: string) {
  const queryClient = useQueryClient();
  const pendingUpdates = useRef<Map<string, Task>>(new Map());

  // Listen for server confirmations
  useRealtimeStream({
    channel: `project:${projectId}:tasks`,
    events: {
      'task:updated': (serverTask: Task) => {
        const pending = pendingUpdates.current.get(serverTask.id);

        if (pending) {
          // Compare optimistic with server response
          if (JSON.stringify(pending) !== JSON.stringify(serverTask)) {
            // Server had different result, update cache
            queryClient.setQueryData(
              ['tasks', projectId],
              (old: Task[] | undefined) =>
                old?.map((t) => (t.id === serverTask.id ? serverTask : t))
            );
          }
          pendingUpdates.current.delete(serverTask.id);
        }
      }
    }
  });

  return useMutation({
    mutationFn: (update: TaskUpdate) => tasksClient.update(update.id, update),

    onMutate: async (update) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId] });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', projectId]);

      // Optimistically update
      const optimisticTask = { ...previousTasks?.find((t) => t.id === update.id), ...update } as Task;
      pendingUpdates.current.set(update.id, optimisticTask);

      queryClient.setQueryData(['tasks', projectId], (old: Task[] | undefined) =>
        old?.map((t) => (t.id === update.id ? optimisticTask : t))
      );

      return { previousTasks };
    },

    onError: (_, update, context) => {
      // Rollback on error
      pendingUpdates.current.delete(update.id);
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', projectId], context.previousTasks);
      }
    }
  });
}
```

### Example 9: Optimistic Create with Temporary ID

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createResourceClient } from '@/lib/services';
import { v4 as uuid } from 'uuid';

const commentsClient = createResourceClient<Comment>({ resource: 'comments' });

export function useOptimisticComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => commentsClient.create({ postId, content }),

    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: ['comments', postId] });

      const previous = queryClient.getQueryData<Comment[]>(['comments', postId]);

      // Create optimistic comment with temp ID
      const tempId = `temp-${uuid()}`;
      const optimisticComment: Comment = {
        id: tempId,
        postId,
        content,
        author: getCurrentUser(),
        createdAt: new Date().toISOString(),
        _optimistic: true
      };

      queryClient.setQueryData(['comments', postId], (old: Comment[] = []) => [
        ...old,
        optimisticComment
      ]);

      return { previous, tempId };
    },

    onSuccess: (newComment, _, context) => {
      // Replace temp comment with real one
      queryClient.setQueryData(['comments', postId], (old: Comment[] | undefined) =>
        old?.map((c) => (c.id === context?.tempId ? newComment : c))
      );
    },

    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['comments', postId], context.previous);
      }
    }
  });
}
```

### Example 10: Optimistic Delete with Undo

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createResourceClient } from '@/lib/services';
import { useStore } from '@/lib/state';

const itemsClient = createResourceClient<Item>({ resource: 'items' });

export function useOptimisticDelete(listId: string) {
  const queryClient = useQueryClient();
  const addNotification = useStore((s) => s.addNotification);

  return useMutation({
    mutationFn: async ({ id, delay = 5000 }: { id: string; delay?: number }) => {
      // Delay actual deletion for undo window
      await new Promise((resolve) => setTimeout(resolve, delay));
      return itemsClient.delete(id);
    },

    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['items', listId] });

      const previous = queryClient.getQueryData<Item[]>(['items', listId]);
      const deletedItem = previous?.find((i) => i.id === id);

      // Optimistically remove
      queryClient.setQueryData(['items', listId], (old: Item[] | undefined) =>
        old?.filter((i) => i.id !== id)
      );

      // Show undo notification
      const undoId = addNotification({
        type: 'info',
        message: 'Item deleted',
        action: {
          label: 'Undo',
          onClick: () => {
            // Restore item
            queryClient.setQueryData(['items', listId], previous);
            // Cancel the mutation (implementation needed)
          }
        },
        duration: 5000
      });

      return { previous, deletedItem, undoId };
    },

    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['items', listId], context.previous);
      }
    }
  });
}
```

---

## Offline Support

### Example 11: Request Queue with Sync

```tsx
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { RequestQueue, useOnlineStatus } from '@/lib/services';
import { useStore } from '@/lib/state';

export function useOfflineCapableMutation<T>(
  mutationKey: string[],
  mutationFn: (data: T) => Promise<unknown>
) {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const addToQueue = useStore((s) => s.addToSyncQueue);
  const removeFromQueue = useStore((s) => s.removeFromSyncQueue);

  return useMutation({
    mutationKey,
    mutationFn: async (data: T) => {
      if (!isOnline) {
        // Queue for later
        const queueId = addToQueue({
          key: mutationKey,
          data,
          timestamp: Date.now()
        });
        return { queued: true, queueId };
      }
      return mutationFn(data);
    },

    onMutate: async (data) => {
      // Always apply optimistically
      // Implementation depends on mutation type
    }
  });
}

// Sync queue processor
export function useSyncQueue() {
  const isOnline = useOnlineStatus();
  const queue = useStore((s) => s.syncQueue);
  const removeFromQueue = useStore((s) => s.removeFromSyncQueue);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOnline || queue.length === 0) return;

    const processQueue = async () => {
      for (const item of queue) {
        try {
          await queryClient.executeMutation({
            mutationKey: item.key,
            variables: item.data
          });
          removeFromQueue(item.id);
        } catch (error) {
          // Keep in queue for retry
          console.error('Sync failed:', error);
        }
      }
    };

    processQueue();
  }, [isOnline, queue]);
}
```

### Example 12: Offline-First Data Fetching

```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOnlineStatus } from '@/lib/services';
import { useEffect } from 'react';

export function useOfflineFirstQuery<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  options?: { staleTime?: number }
) {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  const query = useQuery({
    queryKey,
    queryFn,
    // Don't refetch if offline
    enabled: isOnline,
    // Keep cached data longer when offline
    staleTime: isOnline ? options?.staleTime : Infinity,
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    // Use stale data when offline
    placeholderData: (previousData) => previousData
  });

  // Persist to IndexedDB for offline access
  useEffect(() => {
    if (query.data) {
      persistToIndexedDB(queryKey, query.data);
    }
  }, [query.data]);

  // Load from IndexedDB on mount if offline
  useEffect(() => {
    if (!isOnline && !query.data) {
      loadFromIndexedDB<T>(queryKey).then((cached) => {
        if (cached) {
          queryClient.setQueryData(queryKey, cached);
        }
      });
    }
  }, [isOnline]);

  return {
    ...query,
    isOffline: !isOnline,
    isStale: !isOnline && query.dataUpdatedAt < Date.now() - (options?.staleTime ?? 0)
  };
}
```

---

## Live Collaboration

### Example 13: Presence with Query State

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeStream } from '@/lib/realtime';
import { useAuth } from '@/lib/auth';

interface Presence {
  oderId: string;
  cursor?: { x: number; y: number };
  selection?: { start: number; end: number };
  lastActive: number;
}

export function useCollaborativePresence(documentId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { send } = useRealtimeStream({
    channel: `document:${documentId}:presence`,
    events: {
      'presence:update': (presence: Presence) => {
        queryClient.setQueryData(
          ['presence', documentId],
          (old: Record<string, Presence> = {}) => ({
            ...old,
            [presence.userId]: presence
          })
        );
      },
      'presence:leave': ({ oderId }: { oderId: string }) => {
        queryClient.setQueryData(
          ['presence', documentId],
          (old: Record<string, Presence> = {}) => {
            const { [userId]: _, ...rest } = old;
            return rest;
          }
        );
      }
    }
  });

  // Broadcast own presence
  const updatePresence = useCallback(
    (update: Partial<Presence>) => {
      send('presence:update', {
        oderId: user!.id,
        ...update,
        lastActive: Date.now()
      });
    },
    [send, user]
  );

  // Send heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      updatePresence({});
    }, 30000);
    return () => clearInterval(interval);
  }, [updatePresence]);

  return {
    presence: useQuery({
      queryKey: ['presence', documentId],
      queryFn: () => ({}) as Record<string, Presence>,
      staleTime: Infinity
    }).data,
    updatePresence
  };
}
```

### Example 14: Collaborative Editing with Conflict Resolution

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRealtimeStream } from '@/lib/realtime';
import { createResourceClient } from '@/lib/services';

const docsClient = createResourceClient<Document>({ resource: 'documents' });

export function useCollaborativeDocument(documentId: string) {
  const queryClient = useQueryClient();

  // Track document version for conflict detection
  const versionRef = useRef<number>(0);

  useRealtimeStream({
    channel: `document:${documentId}`,
    events: {
      'document:update': ({ content, version, author }) => {
        // Only apply if newer than our version
        if (version > versionRef.current) {
          versionRef.current = version;
          queryClient.setQueryData(['document', documentId], (old: Document) => ({
            ...old,
            content,
            version,
            lastEditedBy: author
          }));
        }
      }
    }
  });

  const updateDocument = useMutation({
    mutationFn: async (content: string) => {
      const response = await docsClient.update(documentId, {
        content,
        baseVersion: versionRef.current
      });
      return response;
    },

    onSuccess: (result) => {
      versionRef.current = result.version;
      queryClient.setQueryData(['document', documentId], result);
    },

    onError: (error: any) => {
      if (error.code === 'VERSION_CONFLICT') {
        // Handle conflict - show diff or auto-merge
        queryClient.invalidateQueries({ queryKey: ['document', documentId] });
      }
    }
  });

  return { updateDocument };
}
```

---

## Cache Consistency

### Example 15: Normalized Cache Updates

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeStream } from '@/lib/realtime';

// Normalize entities across queries
export function useNormalizedCacheUpdates() {
  const queryClient = useQueryClient();

  useRealtimeStream({
    channel: 'global:entities',
    events: {
      'user:updated': (user: User) => {
        // Update user in all queries that contain it
        queryClient.setQueriesData(
          { predicate: (query) => query.queryKey.includes('users') || containsUser(query, user.id) },
          (old: unknown) => updateUserInData(old, user)
        );
      },

      'project:updated': (project: Project) => {
        // Update project detail
        queryClient.setQueryData(['project', project.id], project);

        // Update in project lists
        queryClient.setQueriesData(
          { queryKey: ['projects'] },
          (old: Project[] | undefined) =>
            old?.map((p) => (p.id === project.id ? project : p))
        );
      }
    }
  });
}

function containsUser(query: Query, userId: string): boolean {
  const data = query.state.data;
  return JSON.stringify(data).includes(userId);
}

function updateUserInData(data: unknown, user: User): unknown {
  if (Array.isArray(data)) {
    return data.map((item) => updateUserInData(item, user));
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (obj.userId === user.id) {
      return { ...obj, user };
    }
    if (obj.author?.id === user.id) {
      return { ...obj, author: user };
    }
    // Recursively update nested objects
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, updateUserInData(v, user)])
    );
  }
  return data;
}
```

### Example 16: Query Invalidation Patterns

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeStream } from '@/lib/realtime';
import { createQueryKeyFactory } from '@/lib/queries';

const projectKeys = createQueryKeyFactory('projects');
const taskKeys = createQueryKeyFactory('tasks');

export function useSmartInvalidation() {
  const queryClient = useQueryClient();

  useRealtimeStream({
    channel: 'cache:invalidate',
    events: {
      // Invalidate specific query
      'invalidate:exact': ({ queryKey }) => {
        queryClient.invalidateQueries({ queryKey, exact: true });
      },

      // Invalidate query tree
      'invalidate:prefix': ({ prefix }) => {
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) && query.queryKey[0] === prefix
        });
      },

      // Smart invalidation based on entity relationships
      'entity:changed': ({ type, id, related }) => {
        switch (type) {
          case 'project':
            queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
            // Also invalidate related tasks
            queryClient.invalidateQueries({
              queryKey: taskKeys.list({ projectId: id })
            });
            break;

          case 'user':
            // Invalidate all queries that might contain this user
            queryClient.invalidateQueries({
              predicate: (query) => {
                const key = query.queryKey;
                return (
                  key.includes('users') ||
                  key.includes('team') ||
                  key.includes('members')
                );
              }
            });
            break;
        }
      }
    }
  });
}
```

---

## Common Patterns

### Example 17: Infinite Scroll with Realtime

```tsx
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useRealtimeStream } from '@/lib/realtime';
import { createResourceClient } from '@/lib/services';

const postsClient = createResourceClient<Post>({ resource: 'posts' });

export function useInfiniteRealtimePosts(feedId: string) {
  const queryClient = useQueryClient();

  // Infinite query for pagination
  const query = useInfiniteQuery({
    queryKey: ['posts', feedId],
    queryFn: ({ pageParam = 0 }) =>
      postsClient.list({ feedId, offset: pageParam, limit: 20 }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === 20 ? pages.length * 20 : undefined,
    initialPageParam: 0
  });

  // Prepend new posts from realtime
  useRealtimeStream({
    channel: `feed:${feedId}`,
    events: {
      'post:new': (post: Post) => {
        queryClient.setQueryData(
          ['posts', feedId],
          (old: InfiniteData<Post[]> | undefined) => {
            if (!old) return old;
            return {
              ...old,
              pages: [[post, ...old.pages[0]], ...old.pages.slice(1)]
            };
          }
        );
      }
    }
  });

  return query;
}
```

### Example 18: Service Layer with Query Integration

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ServiceLayerFacade } from '@/lib/services';
import { useRealtimeStream } from '@/lib/realtime';

// Unified service that combines API, cache, and realtime
export function useProjectService(projectId: string) {
  const queryClient = useQueryClient();
  const service = ServiceLayerFacade.projects;

  // Query with automatic caching
  const project = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => service.get(projectId)
  });

  // Mutations with optimistic updates
  const updateProject = useMutation({
    mutationFn: (data: Partial<Project>) => service.update(projectId, data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['project', projectId] });
      const previous = queryClient.getQueryData(['project', projectId]);
      queryClient.setQueryData(['project', projectId], (old: Project) => ({
        ...old,
        ...data
      }));
      return { previous };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['project', projectId], context?.previous);
    }
  });

  // Realtime sync
  useRealtimeStream({
    channel: `project:${projectId}`,
    events: {
      'project:updated': (data) => {
        queryClient.setQueryData(['project', projectId], data);
      }
    }
  });

  return {
    project: project.data,
    isLoading: project.isLoading,
    updateProject: updateProject.mutate,
    isUpdating: updateProject.isPending
  };
}
```

### Example 19: Subscription Lifecycle Management

```tsx
import { useRealtimeStream } from '@/lib/realtime';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

export function useSmartSubscription<T>(
  channel: string,
  queryKey: unknown[],
  queryFn: () => Promise<T>
) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<{ unsubscribe: () => void }>();

  // Track if component is visible
  const isVisible = usePageVisibility();

  // Query for initial data
  const query = useQuery({
    queryKey,
    queryFn,
    // Refetch on reconnect
    refetchOnReconnect: true
  });

  // Manage subscription based on visibility
  useEffect(() => {
    if (isVisible && query.isSuccess) {
      // Subscribe when visible and data is loaded
      const { unsubscribe } = useRealtimeStream({
        channel,
        events: {
          update: (data: T) => {
            queryClient.setQueryData(queryKey, data);
          }
        }
      });
      subscriptionRef.current = { unsubscribe };
    } else {
      // Unsubscribe when hidden
      subscriptionRef.current?.unsubscribe();
    }

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [isVisible, query.isSuccess, channel]);

  return query;
}
```

### Example 20: Error Handling Across Layers

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRealtimeStream } from '@/lib/realtime';
import { useStore } from '@/lib/state';

export function useResilientDataLayer<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  channel: string
) {
  const queryClient = useQueryClient();
  const addNotification = useStore((s) => s.addNotification);

  // Query with error handling
  const query = useQuery({
    queryKey,
    queryFn,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Realtime with reconnection
  const { connectionState, error: realtimeError } = useRealtimeStream({
    channel,
    onError: (error) => {
      addNotification({
        type: 'warning',
        message: 'Real-time updates temporarily unavailable'
      });
    },
    onReconnected: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey });
      addNotification({
        type: 'success',
        message: 'Real-time updates restored'
      });
    },
    events: {
      update: (data: T) => {
        queryClient.setQueryData(queryKey, data);
      }
    }
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    connectionState,
    realtimeError,
    refetch: query.refetch
  };
}
```

---

## Sequence Diagram: Optimistic Mutation Flow

```
User Action     Client Cache     API Server     WebSocket
    │               │                │              │
    │──── Click ───►│                │              │
    │               │                │              │
    │               │── Optimistic ──│              │
    │               │   Update       │              │
    │               │                │              │
    │◄── Instant ───│                │              │
    │   UI Update   │                │              │
    │               │                │              │
    │               │──── POST ─────►│              │
    │               │                │              │
    │               │                │── Broadcast ─►
    │               │                │              │
    │               │◄─── 200 OK ────│              │
    │               │                │              │
    │               │◄────────── Event ────────────│
    │               │                              │
    │               │── Reconcile ──               │
    │               │   (if needed)                │
    │               │                              │
    │◄── Final ─────│                              │
    │   UI State    │                              │
```

---

## Quick Reference

| Pattern | Queries | Realtime | Services | Use Case |
|---------|---------|----------|----------|----------|
| Live Updates | setQueryData | WebSocket | - | Real-time sync |
| Optimistic | onMutate | confirmation | mutationFn | Instant feedback |
| Offline | gcTime | queue | RequestQueue | Offline support |
| Presence | cache | channel | - | Collaboration |
| Invalidation | invalidateQueries | events | - | Cache consistency |

---

*Last updated: 2024 | Harbor React Framework v2.0*
