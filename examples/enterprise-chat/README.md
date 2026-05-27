# Enterprise Chat — `@missionfabric-js/enzyme` example

A Slack-style team chat that showcases many enzyme modules working together. It
runs **entirely in the browser with no backend**: an MSW service worker mocks the
REST API (auth + messages) and a `mock-socket` server backs the realtime stream.

## Run it

```bash
cd examples/enterprise-chat
npm install        # also runs `msw init` to add public/mockServiceWorker.js
npm run dev        # http://localhost:3002
```

The framework is consumed directly from the repo's local `src/` via Vite/TS
aliases, so no publish or `npm run build` of the library is needed.

## What it demonstrates

| Capability | enzyme module | Key API |
| --- | --- | --- |
| Identity + "log in as…" | `auth` | `AuthProvider`, `useAuth().login/logout` |
| RBAC moderation (send/delete/pin gating) | `auth` | `useAuth().hasPermission`, role checks |
| Message history (GET) | `api` | `useApiRequest` |
| Optimistic send (POST) | `api` | `useApiMutation` + manual cache reconcile |
| Live messages + presence | `realtime` | `useRealtimeStream`, `useRealtimePresence`, `useRealtimeConnection` |
| Chat UI state + multi-tab sync | `state` | `createSimpleStore`, `useBroadcastSync` |
| Feature-flagged beta surface | `flags` | `FlagGate`, `useFeatureFlagContext().setFlag` |
| Light/dark theming | `theme` | `ThemeProvider`, `useThemeContext` |
| Error isolation + recovery | `monitoring` | `GlobalErrorBoundary`, `ErrorBoundary`, `addBreadcrumb` |
| Live Web Vitals | `performance` | `PerformanceProvider`, `usePerformanceMonitor` |
| XSS-safe rendering | `security` | `useSafeText` |

## Things to try

- **Switch identity** (top right): Guest is read-only; Member can send; Manager/Admin
  see delete + pin controls. Channel `# leadership` is hidden unless you're a manager/admin.
- **Send a message** — it appears instantly (optimistic) then is acked by the mock API.
- **Open a second tab** — bot/peer messages and the selected channel sync live.
- **Type `<script>alert(1)</script>`** — it renders as inert text (`useSafeText`).
- **Toggle the Beta flag** in the right rail to show/hide the gated panel.
- **Toggle the theme**, watch the **performance** panel, and hit **"Trigger a render
  error"** to see an `ErrorBoundary` catch and recover.

## How the no-backend wiring works

- **MSW** (`src/chat/mocks/`) intercepts at the Service Worker layer — below the
  `fetch` reference enzyme's `apiClient` singleton binds at construction — so it
  transparently mocks both the auth flow and the message endpoints.
- **mock-socket** (`src/chat/transport/socketServer.ts`) stands up a WebSocket
  server at the URL enzyme's `WebSocketClient` computes, routing only that URL
  through the mock so Vite's HMR socket is untouched.

> Client-side RBAC here is UX only — a real deployment must enforce permissions on
> the server.
