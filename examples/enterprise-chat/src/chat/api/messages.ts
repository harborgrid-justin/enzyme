/**
 * Message data hooks built on enzyme's API layer (`useApiRequest` / `useApiMutation`).
 *
 * The React Query cache is the single source of truth for a channel's messages:
 * seeded by the initial GET, extended by optimistic sends, and merged with live
 * realtime messages (see transport/useChatStream). We never invalidate/refetch,
 * so realtime + bot messages aren't wiped — the cache simply accumulates.
 */
import { api } from '@missionfabric-js/enzyme';
import { useQueryClient } from '@tanstack/react-query';
import type { ChatMessage, CreateMessageBody } from '../types';

export const messagesQueryKey = (channelId: string): readonly unknown[] => [
  'channels',
  channelId,
  'messages',
];

const messagesUrl = (channelId: string): string => `/channels/${channelId}/messages`;

/** Load (and cache) the message history for a channel. */
export function useMessages(channelId: string): api.UseApiRequestResult<ChatMessage[]> {
  return api.useApiRequest<ChatMessage[]>({
    url: messagesUrl(channelId),
    queryKey: messagesQueryKey(channelId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

interface SendContext {
  tempId: string;
  previous: ChatMessage[] | undefined;
}

/** Optimistic send: shows the message instantly, reconciles with the API ack. */
export function useSendMessage(
  channelId: string,
  handlers: { onSent?: (message: ChatMessage) => void } = {}
): api.UseApiMutationResult<ChatMessage, CreateMessageBody> {
  const queryClient = useQueryClient();
  const key = messagesQueryKey(channelId);

  return api.useApiMutation<ChatMessage, CreateMessageBody, SendContext>({
    method: 'POST',
    url: messagesUrl(channelId),
    onMutate: (variables) => {
      const tempId = `temp-${crypto.randomUUID()}`;
      const previous = queryClient.getQueryData<ChatMessage[]>(key);
      const body = variables.body as CreateMessageBody;
      const optimistic: ChatMessage = {
        id: tempId,
        channelId,
        authorId: body.authorId,
        authorName: body.authorName,
        authorInitials: body.authorInitials,
        text: body.text,
        createdAt: new Date().toISOString(),
        kind: 'user',
        pending: true,
      };
      queryClient.setQueryData<ChatMessage[]>(key, [...(previous ?? []), optimistic]);
      return { tempId, previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSuccess: (serverMessage, _variables, context) => {
      queryClient.setQueryData<ChatMessage[]>(key, (old) => {
        const withoutTemp = (old ?? []).filter((m) => m.id !== context?.tempId);
        if (withoutTemp.some((m) => m.id === serverMessage.id)) return withoutTemp;
        return [...withoutTemp, serverMessage];
      });
      handlers.onSent?.(serverMessage);
    },
  });
}

/** Optimistic delete (moderation action, gated by `message:delete`). */
export function useDeleteMessage(
  channelId: string
): api.UseApiMutationResult<void, never> {
  const queryClient = useQueryClient();
  const key = messagesQueryKey(channelId);

  return api.useApiMutation<void, never, { previous: ChatMessage[] | undefined }>({
    method: 'DELETE',
    url: `/channels/${channelId}/messages/:id`,
    onMutate: (variables) => {
      const previous = queryClient.getQueryData<ChatMessage[]>(key);
      const id = variables.pathParams?.id;
      queryClient.setQueryData<ChatMessage[]>(key, (old) =>
        (old ?? []).filter((m) => String(m.id) !== String(id))
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
  });
}

/** Local-only pin toggle (gated by `message:pin`) — updates the cache directly. */
export function usePinMessage(channelId: string): (messageId: string) => void {
  const queryClient = useQueryClient();
  const key = messagesQueryKey(channelId);
  return (messageId: string) => {
    queryClient.setQueryData<ChatMessage[]>(key, (old) =>
      (old ?? []).map((m) => (m.id === messageId ? { ...m, pinned: m.pinned !== true } : m))
    );
  };
}
