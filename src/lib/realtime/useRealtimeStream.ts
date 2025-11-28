/**
 * @file Use Realtime Stream Hook
 * @description Hook to subscribe to real-time updates for a specific channel.
 *
 * This hook provides WebSocket/SSE real-time communication, distinct from
 * the streaming/ module hooks which handle React 18 SSR HTML streaming.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useRealtimeContext } from './RealtimeProvider';

/**
 * Realtime stream subscription options
 */
export interface UseRealtimeStreamOptions<T> {
  enabled?: boolean;
  onMessage?: (data: T) => void;
  onError?: (error: Error) => void;
  transform?: (data: unknown) => T;
}

/**
 * Realtime stream subscription result
 */
export interface UseRealtimeStreamResult<T> {
  isConnected: boolean;
  lastMessage: T | null;
  messages: T[];
  send: (data: unknown) => void;
  clear: () => void;
}

/**
 * Hook to subscribe to a realtime stream channel
 *
 * @example
 * ```tsx
 * function ChatComponent() {
 *   const { messages, send, isConnected } = useRealtimeStream<ChatMessage>('chat');
 *
 *   return (
 *     <div>
 *       {messages.map(msg => <div key={msg.id}>{msg.text}</div>)}
 *       <button onClick={() => send({ text: 'Hello!' })}>Send</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useRealtimeStream<T = unknown>(
  channel: string,
  options: UseRealtimeStreamOptions<T> = {}
): UseRealtimeStreamResult<T> {
  const {
    enabled = true,
    onMessage,
    onError,
    transform,
  } = options;

  const { isConnected, subscribe, send: contextSend } = useRealtimeContext();
  const [lastMessage, setLastMessage] = useState<T | null>(null);
  const [messages, setMessages] = useState<T[]>([]);

  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const transformRef = useRef(transform);

  // Keep refs updated
  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
    transformRef.current = transform;
  }, [onMessage, onError, transform]);

  // Subscribe to channel
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = subscribe(channel, (data: unknown) => {
      try {
        const transformed = transformRef.current
          ? transformRef.current(data)
          : (data as T);

        setLastMessage(transformed);
        setMessages((prev) => [...prev, transformed]);
        onMessageRef.current?.(transformed);
      } catch (error) {
        console.error(`[useRealtimeStream] Error processing message on ${channel}:`, error);
        onErrorRef.current?.(error as Error);
      }
    });

    return unsubscribe;
  }, [channel, enabled, subscribe]);

  /**
   * Send data to the channel
   */
  const send = useCallback(
    (data: unknown) => {
      contextSend(channel, data);
    },
    [channel, contextSend]
  );

  /**
   * Clear message history
   */
  const clear = useCallback(() => {
    setLastMessage(null);
    setMessages([]);
  }, []);

  return {
    isConnected,
    lastMessage,
    messages,
    send,
    clear,
  };
}

/**
 * Hook to subscribe to multiple channels
 *
 * NOTE: This is a simplified version. For production use, consider
 * using a single subscription with channel filtering instead.
 *
 * @param channels - Array of channel names to subscribe to
 * @param options - Subscription options
 * @returns Channel count and options (placeholder for multi-channel support)
 *
 * @example
 * ```tsx
 * // Use with caution - prefer single subscription with filtering
 * const result = useMultiRealtimeStream(['chat', 'notifications']);
 * ```
 */
export function useMultiRealtimeStream<T = unknown>(
  channels: string[],
  options: UseRealtimeStreamOptions<T> = {}
): { channelCount: number; options: UseRealtimeStreamOptions<T> } {
  // This pattern avoids the React hooks rules violation
  // In practice, use a single subscription with channel filtering
  return { channelCount: channels.length, options };
}

/**
 * Hook to get realtime connection state
 */
export function useRealtimeConnection(): {
  connectionState: string;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
} {
  const { connectionState, isConnected, connect, disconnect } = useRealtimeContext();

  return {
    connectionState,
    isConnected,
    connect,
    disconnect,
  };
}

/**
 * Hook for buffered realtime stream updates (debounced)
 */
export function useBufferedRealtimeStream<T = unknown>(
  channel: string,
  bufferMs: number = 100,
  options: UseRealtimeStreamOptions<T> = {}
): UseRealtimeStreamResult<T> {
  const [bufferedMessages, setBufferedMessages] = useState<T[]>([]);
  const [lastMessage, setLastMessage] = useState<T | null>(null);
  const bufferRef = useRef<T[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flushBuffer = useCallback(() => {
    if (bufferRef.current.length > 0) {
      setBufferedMessages((prev) => [...prev, ...bufferRef.current]);
      const lastMsg = bufferRef.current[bufferRef.current.length - 1];
      if (lastMsg !== undefined) {
        setLastMessage(lastMsg);
      }
      bufferRef.current = [];
    }
  }, []);

  const streamResult = useRealtimeStream<T>(channel, {
    ...options,
    onMessage: (data) => {
      bufferRef.current.push(data);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(flushBuffer, bufferMs);
      options.onMessage?.(data);
    },
  });

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...streamResult,
    lastMessage,
    messages: bufferedMessages,
    clear: useCallback(() => {
      bufferRef.current = [];
      setBufferedMessages([]);
      setLastMessage(null);
    }, []),
  };
}

/**
 * Hook to track realtime stream presence (who's online)
 *
 * @param channel - The channel to track presence for
 * @returns Object containing list of users and count
 *
 * @example
 * ```tsx
 * function OnlineUsers() {
 *   const { users, count } = useRealtimePresence('chat-room');
 *   return <div>{count} users online</div>;
 * }
 * ```
 */
export function useRealtimePresence(channel: string): {
  users: string[];
  count: number;
} {
  const [users, setUsers] = useState<string[]>([]);

  useRealtimeStream<{ type: string; userId: string; users?: string[] }>(
    `presence:${channel}`,
    {
      onMessage: (data) => {
        switch (data.type) {
          case 'join':
            setUsers((prev) => [...prev, data.userId]);
            break;
          case 'leave':
            setUsers((prev) => prev.filter((id) => id !== data.userId));
            break;
          case 'sync':
            if (data.users) {
              setUsers(data.users);
            }
            break;
        }
      },
    }
  );

  return { users, count: users.length };
}
