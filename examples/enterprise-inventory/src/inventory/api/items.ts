/**
 * Inventory item data hooks built on enzyme's API layer (`useApiRequest` /
 * `useApiMutation`).
 *
 * The React Query cache is the single source of truth for the item list.
 * Stock adjustments, status transitions, and detail edits are applied
 * optimistically and reconciled with the API ack, so the floor UI stays
 * responsive even when the warehouse network is flaky.
 */
import { api } from '@missionfabric-js/enzyme';
import { useQueryClient } from '@tanstack/react-query';
import type {
  InventoryItem,
  UpdateDetailsBody,
  UpdateStatusBody,
  UpdateStockBody,
} from '../types';
import { deriveStockStatus } from '../types';

export const itemsQueryKey = ['inventory', 'items'] as const;
export const itemQueryKey = (id: string): readonly unknown[] => ['inventory', 'item', id];

/** Load (and cache) the full item registry. */
export function useItems(): api.UseApiRequestResult<InventoryItem[]> {
  return api.useApiRequest<InventoryItem[]>({
    url: '/inventory/items',
    queryKey: itemsQueryKey,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/** Load a single item; falls back to the cached list entry while fetching. */
export function useItem(id: string): api.UseApiRequestResult<InventoryItem> {
  const queryClient = useQueryClient();
  return api.useApiRequest<InventoryItem>({
    url: '/inventory/items/:id',
    queryKey: itemQueryKey(id),
    pathParams: { id },
    enabled: id !== '',
    staleTime: 30_000,
    placeholderData: () => {
      const list = queryClient.getQueryData<InventoryItem[]>(itemsQueryKey);
      return list?.find((item) => item.id === id);
    },
  });
}

interface StatusContext {
  previousList: InventoryItem[] | undefined;
  previousItem: InventoryItem | undefined;
}

/**
 * Optimistic status transition (e.g. place an on-order request, discontinue).
 * Rolls back on failure.
 */
export function useUpdateItemStatus(
  id: string
): api.UseApiMutationResult<InventoryItem, UpdateStatusBody> {
  const queryClient = useQueryClient();
  const listKey = itemsQueryKey;
  const detailKey = itemQueryKey(id);

  return api.useApiMutation<InventoryItem, UpdateStatusBody, StatusContext>({
    method: 'PATCH',
    url: '/inventory/items/:id/status',
    onMutate: (variables) => {
      const previousList = queryClient.getQueryData<InventoryItem[]>(listKey);
      const previousItem = queryClient.getQueryData<InventoryItem>(detailKey);
      const body = variables.body as UpdateStatusBody;

      queryClient.setQueryData<InventoryItem[]>(listKey, (old) =>
        (old ?? []).map((item) =>
          item.id === id
            ? { ...item, status: body.status, expectedRestockAt: body.expectedRestockAt }
            : item
        )
      );
      if (previousItem) {
        queryClient.setQueryData<InventoryItem>(detailKey, {
          ...previousItem,
          status: body.status,
          expectedRestockAt: body.expectedRestockAt,
        });
      }
      return { previousList, previousItem };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousList) queryClient.setQueryData(listKey, context.previousList);
      if (context?.previousItem) queryClient.setQueryData(detailKey, context.previousItem);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<InventoryItem>(detailKey, updated);
      queryClient.setQueryData<InventoryItem[]>(listKey, (old) =>
        (old ?? []).map((item) => (item.id === id ? updated : item))
      );
    },
  });
}

interface StockContext {
  previousList: InventoryItem[] | undefined;
  previousItem: InventoryItem | undefined;
}

/**
 * Optimistic stock adjustment — picks (negative delta), receives (positive
 * delta), and cycle-count corrections all flow through this mutation. The
 * derived status is recomputed locally so the badge updates instantly.
 */
export function useAdjustItemStock(
  id: string
): api.UseApiMutationResult<InventoryItem, UpdateStockBody> {
  const queryClient = useQueryClient();
  const listKey = itemsQueryKey;
  const detailKey = itemQueryKey(id);

  return api.useApiMutation<InventoryItem, UpdateStockBody, StockContext>({
    method: 'PATCH',
    url: '/inventory/items/:id/stock',
    onMutate: (variables) => {
      const previousList = queryClient.getQueryData<InventoryItem[]>(listKey);
      const previousItem = queryClient.getQueryData<InventoryItem>(detailKey);
      const body = variables.body as UpdateStockBody;

      const applyDelta = (item: InventoryItem): InventoryItem => {
        const nextQuantity = Math.max(0, item.quantity + body.delta);
        const nextStatus = deriveStockStatus(nextQuantity, item.reorderLevel, item.status);
        return { ...item, quantity: nextQuantity, status: nextStatus };
      };

      queryClient.setQueryData<InventoryItem[]>(listKey, (old) =>
        (old ?? []).map((item) => (item.id === id ? applyDelta(item) : item))
      );
      if (previousItem) {
        queryClient.setQueryData<InventoryItem>(detailKey, applyDelta(previousItem));
      }
      return { previousList, previousItem };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousList) queryClient.setQueryData(listKey, context.previousList);
      if (context?.previousItem) queryClient.setQueryData(detailKey, context.previousItem);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<InventoryItem>(detailKey, updated);
      queryClient.setQueryData<InventoryItem[]>(listKey, (old) =>
        (old ?? []).map((item) => (item.id === id ? updated : item))
      );
    },
  });
}

interface DetailsContext {
  previousItem: InventoryItem | undefined;
}

/** Optimistic item detail edit (description + reorder threshold). */
export function useUpdateItemDetails(
  id: string
): api.UseApiMutationResult<InventoryItem, UpdateDetailsBody> {
  const queryClient = useQueryClient();
  const detailKey = itemQueryKey(id);

  return api.useApiMutation<InventoryItem, UpdateDetailsBody, DetailsContext>({
    method: 'PATCH',
    url: '/inventory/items/:id/details',
    onMutate: (variables) => {
      const previousItem = queryClient.getQueryData<InventoryItem>(detailKey);
      const body = variables.body as UpdateDetailsBody;
      if (previousItem) {
        queryClient.setQueryData<InventoryItem>(detailKey, {
          ...previousItem,
          description: body.description,
          reorderLevel: body.reorderLevel,
        });
      }
      return { previousItem };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousItem) queryClient.setQueryData(detailKey, context.previousItem);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<InventoryItem>(detailKey, updated);
      queryClient.setQueryData<InventoryItem[]>(itemsQueryKey, (old) =>
        (old ?? []).map((item) => (item.id === id ? updated : item))
      );
    },
  });
}
