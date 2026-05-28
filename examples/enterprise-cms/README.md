# Enterprise CMS — `@missionfabric-js/enzyme` example

A composable publishing workspace that showcases many enzyme modules working
together. It runs **entirely in the browser with no backend**: an MSW service
worker mocks the REST API (auth + CMS entries) so the example boots from a
fresh clone with no publish or external services.

## Run it

```bash
cd examples/enterprise-cms
npm install        # also runs `msw init` to add public/mockServiceWorker.js
npm run dev        # http://localhost:3003
```

The framework is consumed directly from the repo's local `src/` via Vite/TS
aliases (see `vite.config.ts` and `src/enzyme.ts`), so no `npm run build` of the
library is needed.

## What it demonstrates

| Capability                              | enzyme module     | Key API                                          |
| --------------------------------------- | ----------------- | ------------------------------------------------ |
| Identity + "log in as…" demo            | `auth`            | `AuthProvider`, `useAuth().login/logout`         |
| RBAC-gated workflow actions             | `auth`            | `useAuth().hasPermission`, role-aware buttons    |
| Entry list (GET) with cache             | `api`             | `useApiRequest`                                  |
| Optimistic publish / archive (PATCH)    | `api`             | `useApiMutation` with manual cache reconcile     |
| Optimistic body edits                   | `api`             | `useApiMutation` + rollback on error             |
| CMS UI state + multi-tab sync           | `state`           | `useBroadcastSync` (status filter, audit feed)   |
| Scheduled-publishing / live-preview gate| `flags`           | `useFeatureFlag`, `useFeatureFlagContext().setFlag` |
| Light/dark theming                      | `theme`           | `ThemeProvider`, `useThemeContext().toggleTheme` |
| Error isolation + recovery              | `monitoring`      | `GlobalErrorBoundary`, `ErrorBoundary`           |
| Live Web Vitals (LCP / FCP / CLS / INP) | `performance`     | `PerformanceProvider`, `usePerformanceMonitor`   |
| XSS-safe body preview                   | `security`        | `useSafeText`                                    |

## Things to try

- **Switch identity** on the login screen. Each canned user maps to different
  permissions:
  - **Ada (Admin)** — create, update, publish, archive, manage settings
  - **Grace (Editor)** — create + update; can send to review but not publish
  - **Katherine (Reviewer)** — read + update (review feedback)
  - **Vera (Viewer)** — read-only; workflow buttons are all disabled
- **Open an entry** and use the workflow buttons in the *Governance* panel.
  Publish/Archive/Schedule are gated on the active identity's permissions.
- **Type in the editor** — the *Live preview* panel re-renders through
  `useSafeText`, so `<script>alert(1)</script>` is shown as inert text.
- **Save the draft** — the change applies optimistically and is reconciled with
  the mock API a few hundred ms later (rollback on simulated failure).
- **Open a second tab** — change the status filter on the Content page, and
  watch it update live in the other tab (`state.useBroadcastSync`).
- **Toggle flags** on the Settings page (admin only):
  - `cms:scheduled-publishing` — hides the schedule button on entries.
  - `cms:live-preview` — hides the live preview panel.
  - `cms:ai-assist` — shows a (mocked) AI suggestion list on entries.
  - `dark-mode` — disabling it also disables the theme toggle.
- **Trigger a render error** on the Settings page to see
  `monitoring.ErrorBoundary` catch + recover.
- Watch **Web Vitals** stream in the *Performance* panel on Settings.

## How the no-backend wiring works

**MSW** (`src/cms/mocks/`) intercepts at the Service Worker layer — below the
`fetch` reference the enzyme `apiClient` singleton captures at construction — so
it transparently mocks both the auth flow (`/auth/login`, `/auth/me`,
`/auth/refresh`, `/auth/logout`) and the CMS endpoints (`/cms/entries`,
`/cms/entries/:id`, `/cms/entries/:id/status`, `/cms/entries/:id/body`). Routes
use `RegExp` so they match regardless of the client's configured base URL.

## Layout

```
src/
├── App.tsx                       # provider stack (auth, flags, theme, perf, monitoring)
├── main.tsx                      # MSW bootstrap + React mount
├── enzyme.ts                     # curated re-export of enzyme modules
├── index.css                     # design tokens + components
└── cms/
    ├── types.ts                  # CmsEntry, WorkflowStatus, CMS_PERMISSIONS
    ├── users.ts                  # canned demo identities
    ├── flags.ts                  # CMS-specific flag keys + initial state
    ├── api/entries.ts            # useApiRequest / useApiMutation hooks
    ├── store/cmsStore.ts         # Zustand UI state (broadcast-synced)
    ├── mocks/{browser,handlers,seed}.ts  # MSW handlers + seed data
    └── components/               # CmsShell, Dashboard, ContentIndex/Detail, etc.
```

> Client-side RBAC here is UX only — a real deployment must enforce permissions
> on the server.
