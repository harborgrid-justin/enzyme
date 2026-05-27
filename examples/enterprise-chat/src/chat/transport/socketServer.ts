/**
 * In-browser mock WebSocket server (no backend required).
 *
 * Stands up a `mock-socket` server at the exact URL enzyme's WebSocketClient
 * computes (env.wsUrl default `ws://localhost:3001/ws` + empty path), and routes
 * ONLY that URL through mock-socket so Vite's own HMR WebSocket keeps working.
 * It echoes chat sends to other tabs and emits periodic "bot" traffic + presence.
 */
import { Server, WebSocket as MockWebSocket } from 'mock-socket';
import { CHANNELS, BOT_LINES } from '../mocks/seed';
import type { ChatMessage, PresenceFrame } from '../types';

// Mirror the default in src/config/env.ts so the server URL matches the client.
const WS_HOST: string = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001/ws';
const CHAT_WS_URL = WS_HOST;

const ONLINE_USERS = ['Ada Admin', 'Max Manager', 'Mia Member', 'Enzyme Bot'];
const BOT_INTERVAL_MS = 9000;

interface MockClient {
  send: (data: string) => void;
  on: (event: string, cb: (data: string) => void) => void;
}

interface IncomingFrame {
  type?: string;
  channel?: string;
  data?: unknown;
}

let started = false;

function botMessage(channelId: string, text: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    channelId,
    authorId: 'bot',
    authorName: 'Enzyme Bot',
    authorInitials: 'EB',
    text,
    createdAt: new Date().toISOString(),
    kind: 'bot',
  };
}

export function startChatSocketServer(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  // Route only the chat URL through mock-socket; native WebSocket handles the rest.
  const NativeWebSocket = window.WebSocket;
  const RoutingWebSocket = function (
    _this: unknown,
    url: string,
    protocols?: string | string[]
  ): WebSocket {
    if (url === CHAT_WS_URL) {
      return new MockWebSocket(url, protocols) as unknown as WebSocket;
    }
    return new NativeWebSocket(url, protocols);
  } as unknown as typeof WebSocket;
  Object.assign(RoutingWebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
  window.WebSocket = RoutingWebSocket;

  const server = new Server(CHAT_WS_URL);
  const clients = new Set<MockClient>();

  server.on('connection', (rawSocket: unknown) => {
    const socket = rawSocket as MockClient;
    clients.add(socket);

    socket.on('message', (raw: string) => {
      let frame: IncomingFrame;
      try {
        frame = JSON.parse(raw) as IncomingFrame;
      } catch {
        return;
      }

      if (frame.type === 'ping') {
        socket.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      // Respond to presence subscriptions with the current roster.
      if (frame.type === 'subscribe' && frame.channel?.startsWith('presence:') === true) {
        const presence: PresenceFrame = { type: 'sync', userId: 'server', users: ONLINE_USERS };
        socket.send(JSON.stringify({ channel: frame.channel, data: presence }));
        return;
      }

      if (frame.type === 'subscribe' || frame.type === 'unsubscribe') {
        return;
      }

      // Chat send → relay to OTHER tabs (sender already rendered it optimistically).
      if (frame.channel != null) {
        const payload = JSON.stringify({ channel: frame.channel, data: frame.data });
        clients.forEach((client) => {
          if (client !== socket) client.send(payload);
        });
      }
    });

    socket.on('close', () => {
      clients.delete(socket);
    });
  });

  // Simulated bot traffic so the realtime stream is visibly live.
  let tick = 0;
  setInterval(() => {
    if (clients.size === 0) return;
    const channel = CHANNELS[tick % CHANNELS.length];
    const line = BOT_LINES[tick % BOT_LINES.length];
    tick += 1;
    if (channel === undefined || line === undefined) return;
    const payload = JSON.stringify({
      channel: `messages:${channel.id}`,
      data: botMessage(channel.id, line),
    });
    clients.forEach((client) => client.send(payload));
  }, BOT_INTERVAL_MS);
}
