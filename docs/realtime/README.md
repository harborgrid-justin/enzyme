# Real-time Features

WebSocket and Server-Sent Events (SSE) integration for live data updates and real-time communication.

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Components](#components)
- [WebSocket Handling](#websocket-handling)
- [Live Updates](#live-updates)
- [Subscription Patterns](#subscription-patterns)
- [Examples](#examples)

## Overview

The Real-time module provides a comprehensive solution for adding live data capabilities to your application using WebSocket or Server-Sent Events (SSE).

### Key Features

- **WebSocket Support**: Full-duplex communication
- **SSE Support**: Server-to-client streaming
- **Automatic Reconnection**: Resilient connection handling
- **Channel-based Subscriptions**: Organize data streams
- **Query Cache Integration**: Auto-update React Query cache
- **Feature Flag Integration**: Enable/disable real-time updates
- **Connection Pooling**: Efficient resource usage

## Core Concepts

### Connection Types

#### WebSocket (Recommended)

- **Bidirectional**: Client ↔️ Server communication
- **Low latency**: Persistent connection
- **Use for**: Chat, collaborative editing, live dashboards

#### Server-Sent Events (SSE)

- **Unidirectional**: Server → Client only
- **HTTP-based**: Works with existing infrastructure
- **Use for**: Live feeds, notifications, updates

### Data Flow

```
┌─────────────────────────────────────────────────┐
│             Real-time Architecture               │
└─────────────────────────────────────────────────┘

Server                          Client
──────                          ──────

1. Emit event              →    Receive event
   │                            │
2. Broadcast to channel    →    Channel subscriber
   │                            │
3. Push to stream          →    Update React Query cache
   │                            │
4. Update database         →    Component re-renders
```

## Components

### RealtimeProvider

Root provider for real-time connections.

```tsx
import { RealtimeProvider } from '@missionfabric-js/enzyme/realtime';

function App() {
  return (
    <RealtimeProvider
      config={{
        type: 'websocket',
        url: '/ws',
        autoConnect: true,
        cacheStrategies: [
          {
            entity: 'user',
            updateType: 'merge',
            queryKey: ['users']
          }
        ]
      }}
    >
      <YourApp />
    </RealtimeProvider>
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | `RealtimeProviderConfig` | See below | Connection configuration |
| `children` | `ReactNode` | - | Child components |

#### RealtimeProviderConfig

```typescript
interface RealtimeProviderConfig {
  // Connection type
  type: 'websocket' | 'sse';

  // Connection URL
  url?: string;

  // Auto-connect on mount
  autoConnect?: boolean;

  // Cache update strategies
  cacheStrategies?: CacheUpdateStrategy[];
}

interface CacheUpdateStrategy {
  // Entity type (e.g., 'user', 'post')
  entity: string;

  // How to update cache
  updateType: 'merge' | 'replace' | 'append' | 'remove';

  // React Query key
  queryKey: unknown[];

  // Transform data before updating
  transform?: (data: unknown) => unknown;
}
```

### useRealtimeContext

Hook to access real-time connection.

```tsx
import { useRealtimeContext } from '@missionfabric-js/enzyme/realtime';

function LiveComponent() {
  const {
    isConnected,
    connectionState,
    connect,
    disconnect,
    subscribe,
    send,
    realtimeEnabled
  } = useRealtimeContext();

  useEffect(() => {
    if (!isConnected) {
      connect();
    }
  }, [isConnected, connect]);

  return (
    <div>
      Status: {connectionState}
      {realtimeEnabled ? '✅ Enabled' : '❌ Disabled'}
    </div>
  );
}
```

## WebSocket Handling

### Connection Management

```tsx
import { createWebSocketClient } from '@missionfabric-js/enzyme/realtime';

// Create client
const client = createWebSocketClient('/ws', {
  reconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000
});

// Connect
client.connect();

// Listen for state changes
client.onStateChange((state) => {
  console.log('Connection state:', state);
});

// Handle messages
client.onMessage((data) => {
  console.log('Received:', data);
});

// Handle errors
client.onError((error) => {
  console.error('WebSocket error:', error);
});

// Disconnect
client.disconnect();
```

### Sending Messages

```tsx
import { useRealtimeContext } from '@missionfabric-js/enzyme/realtime';

function ChatInput() {
  const { send, isConnected } = useRealtimeContext();
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isConnected && message.trim()) {
      send('chat', {
        text: message,
        timestamp: Date.now()
      });
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={!isConnected}
      />
      <button type="submit" disabled={!isConnected}>
        Send
      </button>
    </form>
  );
}
```

### Automatic Reconnection

The WebSocket client automatically handles reconnection with exponential backoff:

```typescript
// Reconnection strategy
1st attempt: 3 seconds
2nd attempt: 4.5 seconds
3rd attempt: 6.75 seconds
4th attempt: 10.125 seconds
...
Max delay: 30 seconds
```

## Live Updates

### Channel Subscriptions

```tsx
import { useRealtimeContext } from '@missionfabric-js/enzyme/realtime';

function LiveMetrics() {
  const { subscribe } = useRealtimeContext();
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    // Subscribe to metrics channel
    const unsubscribe = subscribe('metrics', (data) => {
      setMetrics(data);
    });

    // Cleanup on unmount
    return unsubscribe;
  }, [subscribe]);

  return (
    <div>
      <h2>Live Metrics</h2>
      {metrics && (
        <div>
          <p>Users: {metrics.activeUsers}</p>
          <p>Revenue: ${metrics.revenue}</p>
        </div>
      )}
    </div>
  );
}
```

### React Query Integration

Automatically update React Query cache with real-time data:

```tsx
import { RealtimeProvider } from '@missionfabric-js/enzyme/realtime';

function App() {
  return (
    <RealtimeProvider
      config={{
        type: 'websocket',
        url: '/ws',
        cacheStrategies: [
          // Merge user updates
          {
            entity: 'user',
            updateType: 'merge',
            queryKey: ['users'],
            transform: (data) => ({
              ...data,
              updatedAt: Date.now()
            })
          },

          // Append new messages
          {
            entity: 'message',
            updateType: 'append',
            queryKey: ['messages']
          },

          // Remove deleted items
          {
            entity: 'post',
            updateType: 'remove',
            queryKey: ['posts']
          }
        ]
      }}
    >
      <App />
    </RealtimeProvider>
  );
}
```

### Server-Sent Events (SSE)

```tsx
import { createSSEClient } from '@missionfabric-js/enzyme/realtime';

const sseClient = createSSEClient('/events');

// Listen for events
sseClient.on('update', (data) => {
  console.log('Update received:', data);
});

sseClient.on('notification', (data) => {
  showNotification(data);
});

// Cleanup
sseClient.close();
```

## Subscription Patterns

### One-to-One Messaging

```tsx
function DirectMessage({ userId }) {
  const { subscribe, send } = useRealtimeContext();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Subscribe to private channel
    const channel = `user.${userId}.messages`;

    return subscribe(channel, (message) => {
      setMessages(prev => [...prev, message]);
    });
  }, [userId, subscribe]);

  const sendMessage = (text) => {
    send(`user.${userId}.messages`, {
      text,
      from: currentUserId,
      timestamp: Date.now()
    });
  };

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.timestamp}>{msg.text}</div>
      ))}
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
```

### Presence Tracking

```tsx
function OnlineUsers() {
  const { subscribe, send } = useRealtimeContext();
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    // Announce presence
    send('presence', {
      type: 'join',
      userId: currentUserId
    });

    // Listen for presence updates
    const unsubscribe = subscribe('presence', (data) => {
      if (data.type === 'join') {
        setOnlineUsers(prev => [...prev, data.userId]);
      } else if (data.type === 'leave') {
        setOnlineUsers(prev =>
          prev.filter(id => id !== data.userId)
        );
      }
    });

    // Announce leaving on unmount
    return () => {
      send('presence', {
        type: 'leave',
        userId: currentUserId
      });
      unsubscribe();
    };
  }, [subscribe, send]);

  return (
    <div>
      <h3>Online ({onlineUsers.length})</h3>
      <ul>
        {onlineUsers.map(userId => (
          <li key={userId}>{userId}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Live Collaboration

```tsx
function CollaborativeEditor({ documentId }) {
  const { subscribe, send } = useRealtimeContext();
  const [content, setContent] = useState('');
  const [cursors, setCursors] = useState({});

  useEffect(() => {
    const channel = `document.${documentId}`;

    return subscribe(channel, (event) => {
      switch (event.type) {
        case 'content-change':
          setContent(event.content);
          break;

        case 'cursor-move':
          setCursors(prev => ({
            ...prev,
            [event.userId]: event.position
          }));
          break;

        case 'user-leave':
          setCursors(prev => {
            const updated = { ...prev };
            delete updated[event.userId];
            return updated;
          });
          break;
      }
    });
  }, [documentId, subscribe]);

  const handleChange = (newContent) => {
    setContent(newContent);
    send(`document.${documentId}`, {
      type: 'content-change',
      content: newContent,
      userId: currentUserId
    });
  };

  return (
    <div>
      <Editor
        content={content}
        onChange={handleChange}
        cursors={cursors}
      />
    </div>
  );
}
```

## Examples

### Live Dashboard

```tsx
import { RealtimeProvider, useRealtimeContext } from '@missionfabric-js/enzyme/realtime';

function LiveDashboard() {
  return (
    <RealtimeProvider
      config={{
        type: 'websocket',
        url: '/ws/dashboard',
        autoConnect: true
      }}
    >
      <DashboardContent />
    </RealtimeProvider>
  );
}

function DashboardContent() {
  const { subscribe } = useRealtimeContext();
  const [metrics, setMetrics] = useState({
    revenue: 0,
    users: 0,
    orders: 0
  });

  useEffect(() => {
    return subscribe('dashboard.metrics', (data) => {
      setMetrics(prev => ({
        ...prev,
        ...data
      }));
    });
  }, [subscribe]);

  return (
    <div className="dashboard">
      <MetricCard title="Revenue" value={`$${metrics.revenue}`} />
      <MetricCard title="Active Users" value={metrics.users} />
      <MetricCard title="Orders" value={metrics.orders} />
    </div>
  );
}
```

### Live Notifications

```tsx
function NotificationCenter() {
  const { subscribe } = useRealtimeContext();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    return subscribe('notifications', (notification) => {
      setNotifications(prev => [notification, ...prev]);

      // Show toast
      toast.info(notification.message);

      // Play sound
      playNotificationSound();
    });
  }, [subscribe]);

  return (
    <div className="notifications">
      {notifications.map(notif => (
        <Notification key={notif.id} {...notif} />
      ))}
    </div>
  );
}
```

### Live Chat

```tsx
function ChatRoom({ roomId }) {
  const { subscribe, send } = useRealtimeContext();
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState([]);

  useEffect(() => {
    const channel = `chat.${roomId}`;

    const unsubscribe = subscribe(channel, (event) => {
      switch (event.type) {
        case 'message':
          setMessages(prev => [...prev, event.data]);
          break;

        case 'typing':
          setTyping(prev => [...prev, event.userId]);
          setTimeout(() => {
            setTyping(prev => prev.filter(id => id !== event.userId));
          }, 3000);
          break;
      }
    });

    return unsubscribe;
  }, [roomId, subscribe]);

  const sendMessage = (text) => {
    send(`chat.${roomId}`, {
      type: 'message',
      data: {
        text,
        userId: currentUserId,
        timestamp: Date.now()
      }
    });
  };

  const handleTyping = () => {
    send(`chat.${roomId}`, {
      type: 'typing',
      userId: currentUserId
    });
  };

  return (
    <div className="chat">
      <MessageList messages={messages} />
      {typing.length > 0 && (
        <TypingIndicator users={typing} />
      )}
      <MessageInput
        onSend={sendMessage}
        onTyping={handleTyping}
      />
    </div>
  );
}
```

## Best Practices

1. **Use Feature Flags**: Enable/disable real-time updates via configuration
2. **Handle Reconnection**: UI should gracefully handle connection loss
3. **Throttle Updates**: Avoid overwhelming the client with too many updates
4. **Validate Messages**: Always validate incoming data
5. **Secure Channels**: Implement proper authentication and authorization
6. **Monitor Performance**: Track message latency and connection health

## Troubleshooting

### Connection Issues

```tsx
function ConnectionMonitor() {
  const { connectionState, connect } = useRealtimeContext();

  if (connectionState === 'disconnected') {
    return (
      <div className="alert">
        <p>Connection lost. Attempting to reconnect...</p>
        <button onClick={connect}>Retry Now</button>
      </div>
    );
  }

  if (connectionState === 'reconnecting') {
    return <div>Reconnecting...</div>;
  }

  return null;
}
```

### Debug Mode

```tsx
<RealtimeProvider
  config={{
    type: 'websocket',
    url: '/ws',
    debug: true // Enable debug logging
  }}
>
  <App />
</RealtimeProvider>
```

## API Reference

See the [Advanced Features Overview](../advanced/README.md) for complete API documentation.
