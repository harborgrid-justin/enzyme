# Realtime Module

> WebSocket and SSE real-time data synchronization.

## Overview

The realtime module provides WebSocket connections, Server-Sent Events (SSE), and real-time data synchronization with
automatic reconnection.

## Quick Start

```tsx
import { RealtimeProvider, useRealtime, useSubscription } from '@/lib/realtime';

function App() {
  return (
    <RealtimeProvider url="wss://api.example.com/ws">
      <LiveDashboard />
    </RealtimeProvider>
  );
}

function LiveDashboard() {
  const { isConnected, send } = useRealtime();

  useSubscription('dashboard:updates', (data) => {
    console.log('Received update:', data);
  });

  return (
    <div>
      <Status connected={isConnected} />
      <button onClick={() => send('ping')}>Ping</button>
    </div>
  );
}
```

## Exports

| Export             | Type      | Description                   |
|--------------------|-----------|-------------------------------|
| `RealtimeProvider` | Component | WebSocket/SSE provider        |
| `useRealtime`      | Hook      | Connection state and controls |
| `useSubscription`  | Hook      | Subscribe to channels         |
| `usePresence`      | Hook      | User presence tracking        |

## See Also

- [Architecture](../docs/ARCHITECTURE.md)
- [API Reference](../docs/API.md)
