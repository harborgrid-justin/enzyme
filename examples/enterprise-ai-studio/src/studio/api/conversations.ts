/**
 * Conversation + message data hooks built on enzyme's API layer.
 *
 * The React Query cache is the source of truth for both the sidebar list
 * (`useConversations`) and a conversation's message history
 * (`useConversationMessages`). The streaming completion endpoint is consumed
 * separately (see api/completions.ts) and writes assistant turns directly into
 * the message cache as they arrive — so the typing animation runs against the
 * same cache that powers history.
 */
import { api } from '@missionfabric-js/enzyme';
import { useQueryClient } from '@tanstack/react-query';
import type { Conversation, StudioMessage } from '../types';

export const conversationsKey = (): readonly unknown[] => ['conversations'];
export const messagesKey = (conversationId: string): readonly unknown[] => [
  'conversations',
  conversationId,
  'messages',
];

/** Sidebar list of conversations the user can see. */
export function useConversations(): api.UseApiRequestResult<Conversation[]> {
  return api.useApiRequest<Conversation[]>({
    url: '/conversations',
    queryKey: conversationsKey(),
    refetchOnWindowFocus: false,
  });
}

/** Message history for the active conversation. */
export function useConversationMessages(
  conversationId: string | null
): api.UseApiRequestResult<StudioMessage[]> {
  return api.useApiRequest<StudioMessage[]>({
    url: conversationId != null ? `/conversations/${conversationId}/messages` : '/conversations/__noop',
    queryKey: messagesKey(conversationId ?? '__none'),
    enabled: conversationId != null,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export interface CreateConversationBody {
  title: string;
  modelId: string;
  ownerId: string;
  systemPrompt: string;
  shared?: boolean;
}

export function useCreateConversation(): api.UseApiMutationResult<
  Conversation,
  CreateConversationBody
> {
  const queryClient = useQueryClient();
  return api.useApiMutation<Conversation, CreateConversationBody>({
    method: 'POST',
    url: '/conversations',
    onSuccess: (created) => {
      queryClient.setQueryData<Conversation[]>(conversationsKey(), (old) => [
        created,
        ...(old ?? []),
      ]);
    },
  });
}

export function useUpdateConversation(): api.UseApiMutationResult<
  Conversation,
  Partial<Conversation> & { id: string }
> {
  const queryClient = useQueryClient();
  return api.useApiMutation<Conversation, Partial<Conversation> & { id: string }>({
    method: 'PATCH',
    url: '/conversations/:id',
    onSuccess: (updated) => {
      queryClient.setQueryData<Conversation[]>(conversationsKey(), (old) =>
        (old ?? []).map((c) => (c.id === updated.id ? updated : c))
      );
    },
  });
}

export function useDeleteConversation(): api.UseApiMutationResult<void, never> {
  const queryClient = useQueryClient();
  return api.useApiMutation<void, never, { previous: Conversation[] | undefined }>({
    method: 'DELETE',
    url: '/conversations/:id',
    onMutate: (variables) => {
      const previous = queryClient.getQueryData<Conversation[]>(conversationsKey());
      const id = variables.pathParams?.id;
      queryClient.setQueryData<Conversation[]>(conversationsKey(), (old) =>
        (old ?? []).filter((c) => c.id !== id)
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(conversationsKey(), context.previous);
      }
    },
  });
}
