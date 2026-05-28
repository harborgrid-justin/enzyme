# Enterprise AI Studio — `@missionfabric-js/enzyme` example

A multi-provider AI chat workspace (think Claude.ai / ChatGPT for the enterprise)
built on enzyme. It supports models from **Anthropic, OpenAI, Google, Mistral,
and Meta**, lets you swap providers mid-conversation, streams tokens like the
real APIs, and exposes per-conversation cost + workspace-wide usage.

The whole thing runs **in the browser with no backend**: MSW intercepts the
REST endpoints and serves a Server-Sent Events stream from the completions
route, so the client-side stream parser exercises the same codepath it would
hit against a real provider.

## Run it

```bash
cd examples/enterprise-ai-studio
npm install        # also runs `msw init` to add public/mockServiceWorker.js
npm run dev        # http://localhost:3004
```

The framework is consumed directly from the repo's local `src/` via Vite/TS
aliases, so no publish or `npm run build` of the library is needed.

## What it demonstrates

| Capability | enzyme module | Key API |
| --- | --- | --- |
| Identity + "sign in as…" | `auth` | `AuthProvider`, `useAuth().login/logout` |
| RBAC (chat / share / manage models) | `auth` | `useAuth().hasPermission` |
| Conversation list + history | `api` | `useApiRequest` |
| Optimistic create / rename / delete | `api` | `useApiMutation` |
| **Streaming completions (SSE)** | `api` | `apiClient.request({ responseType: 'stream' })` |
| UI state + multi-tab sync | `state` | Zustand + `state.useBroadcastSync` |
| Beta-model gating | `flags` | `useFeatureFlag(BETA_FEATURES)` |
| Light/dark theme | `theme` | `ThemeProvider`, `useThemeContext` |
| Error isolation + recovery | `monitoring` | `GlobalErrorBoundary`, `ErrorBoundary`, `addBreadcrumb` |
| Live Web Vitals | `performance` | `PerformanceProvider`, `usePerformanceMonitor` |
| XSS-safe rendering of model output | `security` | `useSafeText` |

## Providers

The studio ships nine canned models grouped by provider:

| Provider  | Models |
| --------- | ------ |
| Anthropic | Claude Opus 4.7, Claude Sonnet 4.6, Claude Haiku 4.5 |
| OpenAI    | GPT-5, GPT-5 Mini |
| Google    | Gemini 2.5 Pro, Gemini 2.5 Flash |
| Mistral   | Mistral Large 3 |
| Meta      | Llama 4 405B *(beta-flag gated)* |

The mock backend swaps voice + token cadence per provider so each one feels
distinct. Token usage + cost are computed from the catalog's per-million-token
pricing so the usage meter is meaningful out of the box.

## Things to try

- **Sign in as Ada (Admin), Eli (Engineer), Ana (Analyst), or Gus (Guest)** to
  see RBAC in action — Gus can browse shared conversations but the composer
  hides; Ana can chat in private threads but can't share to the workspace.
- **Start a new conversation**, then change the model in the composer's picker
  mid-thread — the same conversation cycles through providers, and each turn's
  message body shows which model produced it.
- **Stop a streaming response** mid-flight (the Send button becomes a red Stop
  button) to see the abort path roll the placeholder back.
- **Edit the system prompt** in the right rail — the next turn picks it up.
- **Toggle "Beta models"** in Settings to reveal Llama 4 405B, then watch the
  picker drop it again when you turn the flag off.
- **Toggle the theme** and watch the **Live Web Vitals** in the Usage meter.
- **Open a second tab** — the selected conversation, temperature, and max
  tokens stay in sync via `state.useBroadcastSync`.
- **Type `<script>alert(1)</script>`** — both user and model responses route
  through `security.useSafeText`, so the markup renders as inert text.

## How the no-backend wiring works

- **MSW** (`src/studio/mocks/`) intercepts at the Service Worker layer — below
  the `fetch` reference enzyme's `apiClient` singleton binds at construction —
  so it transparently mocks the auth flow, the REST endpoints, *and* the SSE
  completions stream.
- The **completions handler** returns a `ReadableStream<Uint8Array>` shaped as
  `data: {...}\n\n` frames, exactly like the real OpenAI / Anthropic streaming
  APIs. The client (`src/studio/api/completions.ts`) consumes it via
  `apiClient.request({ responseType: 'stream' })` and parses frames itself,
  writing tokens into the React Query cache as they arrive so the typing
  animation runs against the same data that powers history.

## Wiring a real provider

Drop the mock and point `apiClient` at your gateway:

```ts
// src/main.tsx — replace worker.start() with whatever auth you use,
// then either re-base the singleton or supply per-request URLs.

import { api } from './enzyme';
api.apiClient.setBaseUrl('https://your-llm-gateway.example.com');
api.apiClient.setAuthHeader(`Bearer ${yourGatewayToken}`);
```

The wire shape is provider-neutral (see `src/studio/types.ts`), so you can
either keep `/completions` as your gateway endpoint and translate to the
upstream provider on the server, or fan out from the client by branching on
`modelId.startsWith('claude-' | 'gpt-' | 'gemini-' | ...)`.

> Client-side RBAC here is UX only — a real deployment must enforce permissions
> on the server, and provider API keys must NEVER be shipped to the browser.
