# Real-Time Examples

> 20+ practical real-time communication examples using WebSockets and Server-Sent Events.

## Table of Contents

- [WebSocket Basics](#websocket-basics)
- [Server-Sent Events](#server-sent-events)
- [Message Handling](#message-handling)
- [Connection Management](#connection-management)
- [Optimistic Updates](#optimistic-updates)
- [Best Practices](#best-practices)

---

## WebSocket Basics

### Example 1: Basic WebSocket Connection
**Difficulty:** ⭐ Basic

```tsx
function useWebSocket(url: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = (error) => console.error('WebSocket error:', error);

    setSocket(ws);

    return () => ws.close();
  }, [url]);

  return { socket, isConnected };
}
```

### Example 2: Send and Receive Messages
**Difficulty:** ⭐ Basic

```tsx
function Chat() {
  const { socket, isConnected } = useWebSocket('ws://localhost:3000');
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!socket) return;

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages((prev) => [...prev, message]);
    };
  }, [socket]);

  const sendMessage = (text: string) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({ type: 'message', text }));
    }
  };

  return <ChatUI messages={messages} onSend={sendMessage} />;
}
```

### Example 3: Typed WebSocket Messages
**Difficulty:** ⭐⭐ Intermediate

```tsx
type WSMessage =
  | { type: 'chat'; text: string; userId: string }
  | { type: 'typing'; userId: string }
  | { type: 'presence'; users: string[] };

function useTypedWebSocket() {
  const { socket } = useWebSocket('ws://localhost:3000');

  const send = <T extends WSMessage>(message: T) => {
    socket?.send(JSON.stringify(message));
  };

  const subscribe = (handler: (message: WSMessage) => void) => {
    if (!socket) return;

    const listener = (event: MessageEvent) => {
      handler(JSON.parse(event.data));
    };

    socket.addEventListener('message', listener);
    return () => socket.removeEventListener('message', listener);
  };

  return { send, subscribe };
}
```

### Example 4: WebSocket with React Query
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
function useRealtimeQuery<T>(queryKey: string[], wsUrl: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Update React Query cache
      queryClient.setQueryData(queryKey, (old: T[] = []) => {
        if (data.type === 'create') return [...old, data.payload];
        if (data.type === 'update') {
          return old.map(item => 
            item.id === data.payload.id ? data.payload : item
          );
        }
        if (data.type === 'delete') {
          return old.filter(item => item.id !== data.payload.id);
        }
        return old;
      });
    };

    return () => ws.close();
  }, [wsUrl, queryKey]);
}
```

### Example 5: Reconnection Logic
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
function useWebSocketWithReconnect(url: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number>();

  const connect = useCallback(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('Connected');
      reconnectTimeoutRef.current = undefined;
    };

    ws.onclose = () => {
      console.log('Disconnected, reconnecting...');
      
      // Exponential backoff
      const delay = reconnectTimeoutRef.current 
        ? Math.min(reconnectTimeoutRef.current * 2, 30000)
        : 1000;

      reconnectTimeoutRef.current = delay;
      setTimeout(connect, delay);
    };

    setSocket(ws);
  }, [url]);

  useEffect(() => {
    connect();
    return () => socket?.close();
  }, [connect]);

  return socket;
}
```

## Server-Sent Events

### Example 6: Basic SSE Connection
**Difficulty:** ⭐ Basic

```tsx
function useServerSentEvents(url: string) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      const newData = JSON.parse(event.data);
      setData((prev) => [...prev, newData]);
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, [url]);

  return data;
}
```

### Example 7: Custom SSE Events
**Difficulty:** ⭐⭐ Intermediate

```tsx
function useSSEWithEvents(url: string) {
  const [updates, setUpdates] = useState<Update[]>([]);

  useEffect(() => {
    const eventSource = new EventSource(url);

    eventSource.addEventListener('update', (event) => {
      setUpdates((prev) => [...prev, JSON.parse(event.data)]);
    });

    eventSource.addEventListener('delete', (event) => {
      const id = JSON.parse(event.data).id;
      setUpdates((prev) => prev.filter(u => u.id !== id));
    });

    return () => eventSource.close();
  }, [url]);

  return updates;
}
```

## Message Handling

### Example 8: Message Queue
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
function useMessageQueue() {
  const queueRef = useRef<WSMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processQueue = async () => {
    if (isProcessing || queueRef.current.length === 0) return;

    setIsProcessing(true);

    while (queueRef.current.length > 0) {
      const message = queueRef.current.shift()!;
      await handleMessage(message);
    }

    setIsProcessing(false);
  };

  const enqueue = (message: WSMessage) => {
    queueRef.current.push(message);
    processQueue();
  };

  return { enqueue };
}
```

### Example 9: Message Deduplication
**Difficulty:** ⭐⭐ Intermediate

```tsx
function useDeduplicatedMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const seenIdsRef = useRef(new Set<string>());

  const addMessage = (message: Message) => {
    if (seenIdsRef.current.has(message.id)) return;

    seenIdsRef.current.add(message.id);
    setMessages((prev) => [...prev, message]);

    // Clean up old IDs after 1 minute
    setTimeout(() => {
      seenIdsRef.current.delete(message.id);
    }, 60000);
  };

  return { messages, addMessage };
}
```

### Example 10: Presence System
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
function usePresence(roomId: string) {
  const [users, setUsers] = useState<User[]>([]);
  const { socket } = useWebSocket(`ws://localhost:3000/presence/${roomId}`);

  useEffect(() => {
    if (!socket) return;

    // Join room
    socket.send(JSON.stringify({ type: 'join', roomId }));

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'presence') {
        setUsers(data.users);
      }
    };

    // Heartbeat to maintain presence
    const interval = setInterval(() => {
      socket.send(JSON.stringify({ type: 'heartbeat' }));
    }, 30000);

    return () => {
      clearInterval(interval);
      socket.send(JSON.stringify({ type: 'leave', roomId }));
    };
  }, [socket, roomId]);

  return users;
}
```

## Connection Management

### Example 11: Connection Status Indicator
**Difficulty:** ⭐ Basic

```tsx
function ConnectionStatus() {
  const { isConnected } = useWebSocket('ws://localhost:3000');

  return (
    <div className="connection-status">
      <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
      <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
    </div>
  );
}
```

### Example 12: Auto-Reconnect with Backoff
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
function useSmartReconnect(url: string) {
  const [attempt, setAttempt] = useState(0);
  const maxAttempts = 5;

  const connect = useCallback(() => {
    if (attempt >= maxAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const ws = new WebSocket(url);

    ws.onclose = () => {
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      setTimeout(() => {
        setAttempt((a) => a + 1);
        connect();
      }, delay);
    };

    ws.onopen = () => {
      setAttempt(0);
    };
  }, [url, attempt]);

  useEffect(() => {
    connect();
  }, [connect]);
}
```

### Example 13: Heartbeat/Ping-Pong
**Difficulty:** ⭐⭐ Intermediate

```tsx
function useWebSocketWithHeartbeat(url: string) {
  const socketRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<number>();

  useEffect(() => {
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      // Send ping every 30 seconds
      pingIntervalRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'pong') {
        console.log('Pong received');
      }
    };

    return () => {
      clearInterval(pingIntervalRef.current);
      ws.close();
    };
  }, [url]);

  return socketRef.current;
}
```

## Optimistic Updates

### Example 14: Optimistic Chat Messages
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
function useOptimisticChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const { socket } = useWebSocket('ws://localhost:3000/chat');

  const sendMessage = (text: string) => {
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      text,
      userId: currentUser.id,
      pending: true,
      timestamp: new Date(),
    };

    // Add optimistically
    setMessages((prev) => [...prev, optimisticMessage]);

    // Send to server
    socket?.send(JSON.stringify({ type: 'message', text }));
  };

  useEffect(() => {
    if (!socket) return;

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      setMessages((prev) => {
        // Replace temp message with real one
        return prev.map(m =>
          m.pending && m.text === message.text
            ? { ...message, pending: false }
            : m
        );
      });
    };
  }, [socket]);

  return { messages, sendMessage };
}
```

### Example 15: Rollback on Error
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
function useOptimisticUpdate() {
  const [data, setData] = useState<Item[]>([]);
  const { socket } = useWebSocket('ws://localhost:3000');

  const updateItem = (id: string, updates: Partial<Item>) => {
    // Save current state
    const previousData = data;

    // Optimistic update
    setData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );

    // Send to server
    socket?.send(JSON.stringify({ type: 'update', id, updates }));

    // Listen for error
    const errorListener = (event: MessageEvent) => {
      const message = JSON.parse(event.data);
      if (message.type === 'error' && message.id === id) {
        // Rollback
        setData(previousData);
        toast.error('Update failed');
      }
    };

    socket?.addEventListener('message', errorListener);
    setTimeout(() => {
      socket?.removeEventListener('message', errorListener);
    }, 5000);
  };

  return { data, updateItem };
}
```

### Example 16: Collaborative Editing
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
function useCollaborativeEditor(documentId: string) {
  const [content, setContent] = useState('');
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});
  const { socket } = useWebSocket(`ws://localhost:3000/doc/${documentId}`);

  const handleChange = (newContent: string, cursorPos: number) => {
    setContent(newContent);

    socket?.send(JSON.stringify({
      type: 'edit',
      content: newContent,
      cursor: cursorPos,
      userId: currentUser.id,
    }));
  };

  useEffect(() => {
    if (!socket) return;

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'edit' && data.userId !== currentUser.id) {
        setContent(data.content);
      }

      if (data.type === 'cursor') {
        setCursors((prev) => ({
          ...prev,
          [data.userId]: data.cursor,
        }));
      }
    };
  }, [socket]);

  return { content, cursors, handleChange };
}
```

### Example 17: Live Notifications
**Difficulty:** ⭐⭐ Intermediate

```tsx
function useLiveNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const eventSource = new EventSource('/api/notifications/stream');

  useEffect(() => {
    eventSource.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      
      setNotifications((prev) => [notification, ...prev]);
      
      toast.info(notification.message, {
        action: {
          label: 'View',
          onClick: () => navigate(notification.url),
        },
      });
    };

    return () => eventSource.close();
  }, []);

  return notifications;
}
```

### Example 18: Real-Time Analytics
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
function useRealtimeAnalytics(dashboardId: string) {
  const [metrics, setMetrics] = useState<Metrics>({});

  useEffect(() => {
    const eventSource = new EventSource(`/api/analytics/${dashboardId}/stream`);

    eventSource.addEventListener('metric-update', (event) => {
      const update = JSON.parse(event.data);
      
      setMetrics((prev) => ({
        ...prev,
        [update.metric]: update.value,
      }));
    });

    return () => eventSource.close();
  }, [dashboardId]);

  return metrics;
}
```

### Example 19: Multiplayer Cursor Tracking
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
function useMultiplayerCursors(roomId: string) {
  const [cursors, setCursors] = useState<Map<string, Cursor>>(new Map());
  const { socket } = useWebSocket(`ws://localhost:3000/room/${roomId}`);

  const updateCursor = throttle((x: number, y: number) => {
    socket?.send(JSON.stringify({
      type: 'cursor',
      x,
      y,
      userId: currentUser.id,
    }));
  }, 50);

  useEffect(() => {
    if (!socket) return;

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'cursor') {
        setCursors((prev) => new Map(prev).set(data.userId, {
          x: data.x,
          y: data.y,
          color: getUserColor(data.userId),
        }));
      }
    };
  }, [socket]);

  return { cursors, updateCursor };
}
```

### Example 20: Live Poll Results
**Difficulty:** ⭐⭐ Intermediate

```tsx
function useLivePoll(pollId: string) {
  const [results, setResults] = useState<PollResults>({});

  useEffect(() => {
    const eventSource = new EventSource(`/api/polls/${pollId}/live`);

    eventSource.onmessage = (event) => {
      setResults(JSON.parse(event.data));
    };

    return () => eventSource.close();
  }, [pollId]);

  return results;
}

function LivePollResults({ pollId }: { pollId: string }) {
  const results = useLivePoll(pollId);

  return (
    <div>
      {Object.entries(results).map(([option, votes]) => (
        <div key={option}>
          <span>{option}</span>
          <Progress value={(votes / total) * 100} />
          <span>{votes} votes</span>
        </div>
      ))}
    </div>
  );
}
```

## Best Practices

### Connection Management
- ✅ **DO** implement reconnection logic
- ✅ **DO** use heartbeats to detect dead connections
- ✅ **DO** handle connection state in UI
- ❌ **DON'T** create multiple connections unnecessarily
- ❌ **DON'T** forget to close connections on unmount

### Message Handling
- ✅ **DO** validate incoming messages
- ✅ **DO** handle message ordering
- ✅ **DO** implement deduplication
- ❌ **DON'T** trust client-side data
- ❌ **DON'T** process every message synchronously

### Performance
- ✅ **DO** throttle frequent updates
- ✅ **DO** batch multiple updates
- ✅ **DO** use optimistic updates
- ❌ **DON'T** send large payloads
- ❌ **DON'T** update state on every message

## See Also

- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Documentation Index](../INDEX.md)
