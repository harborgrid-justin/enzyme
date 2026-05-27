/**
 * Bridges enzyme's realtime stream into the React Query message cache.
 *
 * Uses the real `realtime.useRealtimeStream` (backed by the framework's
 * WebSocketClient) against an in-browser mock socket. Incoming messages are
 * merged into the same cache the API hooks use, deduped by id — which also
 * absorbs the provider's double-delivery of channel messages.
 */
import { useQueryClient } from '@tanstack/react-query';
import { realtime } from '@missionfabric-js/enzyme';
import type { ChatMessage } from '../types';
import { messagesQueryKey } from '../api/messages';

export interface ChatStream {
  isConnected: boolean;
  /** Relay a message to other tabs/subscribers over the socket. */
  broadcast: (message: ChatMessage) => void;
}

export function useChatStream(channelId: string): ChatStream {
  const queryClient = useQueryClient();

  const stream = realtime.useRealtimeStream<ChatMessage>(`messages:${channelId}`, {
    transform: (data) => data as ChatMessage,
    onMessage: (message) => {
      queryClient.setQueryData<ChatMessage[]>(messagesQueryKey(channelId), (old) => {
        const list = old ?? [];
        if (list.some((m) => m.id === message.id)) return list;
        return [...list, message];
      });
    },
  });

  return {
    isConnected: stream.isConnected,
    broadcast: (message) => {
      stream.send(message);
    },
  };
}
