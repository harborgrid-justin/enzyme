/**
 * @file Stream to Query Cache
 * @description Maps incoming events into React Query cache updates
 */

import { type QueryClient, type QueryKey } from '@tanstack/react-query';

/**
 * Stream event types
 */
export type StreamEventType = 'create' | 'update' | 'delete' | 'invalidate' | 'patch';

/**
 * Stream event payload
 */
export interface StreamEvent<T = unknown> {
  type: StreamEventType;
  entity: string;
  id?: string;
  data?: T;
  timestamp: string;
  queryKeys?: QueryKey[];
}

/**
 * Cache update strategy
 */
export interface CacheUpdateStrategy<T = unknown> {
  entity: string;
  getQueryKey: (id?: string) => QueryKey;
  getListQueryKey: () => QueryKey;
  merge?: (existing: T | undefined, incoming: Partial<T>) => T;
  shouldInvalidate?: (event: StreamEvent) => boolean;
}

/**
 * Cache updater configuration
 */
export interface StreamCacheConfig {
  queryClient: QueryClient;
  strategies: CacheUpdateStrategy[];
  onEvent?: (event: StreamEvent) => void;
  onError?: (error: Error, event: StreamEvent) => void;
}

/**
 * Stream to query cache updater
 */
export class StreamQueryCacheUpdater {
  private queryClient: QueryClient;
  private strategies: Map<string, CacheUpdateStrategy>;
  private onEvent?: (event: StreamEvent) => void;
  private onError?: (error: Error, event: StreamEvent) => void;
  
  constructor(config: StreamCacheConfig) {
    this.queryClient = config.queryClient;
    this.strategies = new Map(
      config.strategies.map((s) => [s.entity, s])
    );
    this.onEvent = config.onEvent;
    this.onError = config.onError;
  }
  
  /**
   * Process incoming stream event
   */
  processEvent(event: StreamEvent): void {
    try {
      this.onEvent?.(event);
      
      const strategy = this.strategies.get(event.entity);
      
      if (!strategy) {
        // No strategy found, invalidate by provided keys
        if (event.queryKeys !== undefined && Array.isArray(event.queryKeys) && event.queryKeys.length > 0) {
          event.queryKeys.forEach((key) => {
            void this.queryClient.invalidateQueries({ queryKey: key });
          });
        }
        return;
      }
      
      switch (event.type) {
        case 'create':
          this.handleCreate(event, strategy);
          break;
        case 'update':
          this.handleUpdate(event, strategy);
          break;
        case 'delete':
          this.handleDelete(event, strategy);
          break;
        case 'patch':
          this.handlePatch(event as StreamEvent<Partial<unknown>>, strategy);
          break;
        case 'invalidate':
          this.handleInvalidate(event, strategy);
          break;
      }
    } catch (error) {
      console.error('[StreamCache] Error processing event:', error);
      this.onError?.(error as Error, event);
    }
  }
  
  /**
   * Handle create event
   */
  private handleCreate<T>(
    event: StreamEvent<T>,
    strategy: CacheUpdateStrategy<T>
  ): void {
    // Invalidate list queries to refetch
    void this.queryClient.invalidateQueries({
      queryKey: strategy.getListQueryKey(),
    });
    
    // Optionally pre-populate detail query
    if (event.id && event.data) {
      this.queryClient.setQueryData(
        strategy.getQueryKey(event.id),
        event.data
      );
    }
  }
  
  /**
   * Handle update event
   */
  private handleUpdate<T>(
    event: StreamEvent<T>,
    strategy: CacheUpdateStrategy<T>
  ): void {
    if (event.id === undefined || event.id === null) return;
    
    // Update detail query with new data
    if (event.data) {
      this.queryClient.setQueryData(
        strategy.getQueryKey(event.id),
        event.data
      );
    }
    
    // Invalidate list queries
    void this.queryClient.invalidateQueries({
      queryKey: strategy.getListQueryKey(),
    });
  }

  /**
   * Handle delete event
   */
  private handleDelete<T>(
    event: StreamEvent<T>,
    strategy: CacheUpdateStrategy<T>
  ): void {
    if (event.id === undefined || event.id === null) return;    // Remove from cache
    void this.queryClient.removeQueries({
      queryKey: strategy.getQueryKey(event.id),
    });

    // Invalidate list queries
    void this.queryClient.invalidateQueries({
      queryKey: strategy.getListQueryKey(),
    });
  }  /**
   * Handle patch event (partial update)
   */
  private handlePatch<T>(
    event: StreamEvent<Partial<T>>,
    strategy: CacheUpdateStrategy<T>
  ): void {
    if (event.id === undefined || event.id === null || event.data === undefined) return;

    const eventData = event.data;
    // Merge with existing data
    this.queryClient.setQueryData<T>(
      strategy.getQueryKey(event.id),
      (old) => {
        if (old === undefined || old === null) return undefined as T;

        if (strategy.merge) {
          return strategy.merge(old, eventData);
        }

        return { ...old, ...eventData } as T;
      }
    );
  }  /**
   * Handle invalidate event
   */
  private handleInvalidate<T>(
    event: StreamEvent<T>,
    strategy: CacheUpdateStrategy<T>
  ): void {
    if (strategy.shouldInvalidate !== undefined && !strategy.shouldInvalidate(event)) {
      return;
    }

    if (event.id !== undefined && event.id !== null) {
      void this.queryClient.invalidateQueries({
        queryKey: strategy.getQueryKey(event.id),
      });
    }

    void this.queryClient.invalidateQueries({
      queryKey: strategy.getListQueryKey(),
    });
  }  /**
   * Add or update a strategy
   */
  addStrategy<T>(strategy: CacheUpdateStrategy<T>): void {
    this.strategies.set(strategy.entity, strategy as CacheUpdateStrategy);
  }
  
  /**
   * Remove a strategy
   */
  removeStrategy(entity: string): void {
    this.strategies.delete(entity);
  }
}

/**
 * Create stream cache updater helper
 */
export function createStreamCacheUpdater(
  queryClient: QueryClient,
  strategies: CacheUpdateStrategy[]
): StreamQueryCacheUpdater {
  return new StreamQueryCacheUpdater({
    queryClient,
    strategies,
  });
}

/**
 * Create a simple cache update strategy
 */
export function createCacheStrategy<T>(
  entity: string,
  options: {
    detailKeyPrefix?: string;
    listKeyPrefix?: string;
  } = {}
): CacheUpdateStrategy<T> {
  const detailPrefix = options.detailKeyPrefix ?? entity;
  const listPrefix = options.listKeyPrefix ?? `${entity}s`;
  
  return {
    entity,
    getQueryKey: (id) => [detailPrefix, id],
    getListQueryKey: () => [listPrefix],
  };
}
