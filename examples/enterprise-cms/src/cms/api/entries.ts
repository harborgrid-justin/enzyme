/**
 * CMS entry data hooks built on enzyme's API layer (`useApiRequest` /
 * `useApiMutation`).
 *
 * The React Query cache is the single source of truth for the entry list.
 * Workflow transitions and body edits are applied optimistically and reconciled
 * with the API ack, so the UI stays responsive even when the editor's network
 * is slow.
 */
import { api } from '@missionfabric-js/enzyme';
import { useQueryClient } from '@tanstack/react-query';
import type { CmsEntry, UpdateBodyBody, UpdateStatusBody } from '../types';

export const entriesQueryKey = ['cms', 'entries'] as const;
export const entryQueryKey = (id: string): readonly unknown[] => ['cms', 'entry', id];

/** Load (and cache) the full entry registry. */
export function useEntries(): api.UseApiRequestResult<CmsEntry[]> {
  return api.useApiRequest<CmsEntry[]>({
    url: '/cms/entries',
    queryKey: entriesQueryKey,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/** Load a single entry; falls back to the cached list entry while fetching. */
export function useEntry(id: string): api.UseApiRequestResult<CmsEntry> {
  const queryClient = useQueryClient();
  return api.useApiRequest<CmsEntry>({
    url: '/cms/entries/:id',
    queryKey: entryQueryKey(id),
    pathParams: { id },
    enabled: id !== '',
    staleTime: 30_000,
    placeholderData: () => {
      const list = queryClient.getQueryData<CmsEntry[]>(entriesQueryKey);
      return list?.find((entry) => entry.id === id);
    },
  });
}

interface StatusContext {
  previousList: CmsEntry[] | undefined;
  previousEntry: CmsEntry | undefined;
}

/**
 * Optimistic workflow transition: the column moves instantly and reconciles
 * with the server. Rolls back on failure.
 */
export function useUpdateEntryStatus(
  id: string
): api.UseApiMutationResult<CmsEntry, UpdateStatusBody> {
  const queryClient = useQueryClient();
  const listKey = entriesQueryKey;
  const detailKey = entryQueryKey(id);

  return api.useApiMutation<CmsEntry, UpdateStatusBody, StatusContext>({
    method: 'PATCH',
    url: '/cms/entries/:id/status',
    onMutate: (variables) => {
      const previousList = queryClient.getQueryData<CmsEntry[]>(listKey);
      const previousEntry = queryClient.getQueryData<CmsEntry>(detailKey);
      const body = variables.body as UpdateStatusBody;

      queryClient.setQueryData<CmsEntry[]>(listKey, (old) =>
        (old ?? []).map((entry) =>
          entry.id === id
            ? { ...entry, status: body.status, publishAt: body.publishAt }
            : entry
        )
      );
      if (previousEntry) {
        queryClient.setQueryData<CmsEntry>(detailKey, {
          ...previousEntry,
          status: body.status,
          publishAt: body.publishAt,
        });
      }
      return { previousList, previousEntry };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousList) queryClient.setQueryData(listKey, context.previousList);
      if (context?.previousEntry) queryClient.setQueryData(detailKey, context.previousEntry);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<CmsEntry>(detailKey, updated);
      queryClient.setQueryData<CmsEntry[]>(listKey, (old) =>
        (old ?? []).map((entry) => (entry.id === id ? updated : entry))
      );
    },
  });
}

interface BodyContext {
  previousEntry: CmsEntry | undefined;
}

/** Optimistic body edit — saves the entry text and updates the cache. */
export function useUpdateEntryBody(
  id: string
): api.UseApiMutationResult<CmsEntry, UpdateBodyBody> {
  const queryClient = useQueryClient();
  const detailKey = entryQueryKey(id);

  return api.useApiMutation<CmsEntry, UpdateBodyBody, BodyContext>({
    method: 'PATCH',
    url: '/cms/entries/:id/body',
    onMutate: (variables) => {
      const previousEntry = queryClient.getQueryData<CmsEntry>(detailKey);
      const body = variables.body as UpdateBodyBody;
      if (previousEntry) {
        queryClient.setQueryData<CmsEntry>(detailKey, { ...previousEntry, body: body.body });
      }
      return { previousEntry };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousEntry) queryClient.setQueryData(detailKey, context.previousEntry);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<CmsEntry>(detailKey, updated);
      queryClient.setQueryData<CmsEntry[]>(entriesQueryKey, (old) =>
        (old ?? []).map((entry) => (entry.id === id ? updated : entry))
      );
    },
  });
}
