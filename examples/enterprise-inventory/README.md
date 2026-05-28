# Enterprise Inventory — `@missionfabric-js/enzyme` example

A composable warehouse-operations workspace that showcases many enzyme modules
working together. It runs **entirely in the browser with no backend**: an MSW
service worker mocks the REST API (auth + inventory items) so the example boots
from a fresh clone with no publish or external services.

## Run it

```bash
cd examples/enterprise-inventory
npm install        # also runs `msw init` to add public/mockServiceWorker.js
npm run dev        # http://localhost:3004
```

The framework is consumed directly from the repo's local `src/` via Vite/TS
aliases (see `vite.config.ts` and `src/enzyme.ts`), so no `npm run build` of the
library is needed.

## What it demonstrates

| Capability                                | enzyme module | Key API                                          |
| ----------------------------------------- | ------------- | ------------------------------------------------ |
| Identity + "log in as…" demo              | `auth`        | `AuthProvider`, `useAuth().login/logout`         |
| RBAC-gated stock + procurement actions    | `auth`        | `useAuth().hasPermission`, role-aware buttons    |
| Item list (GET) with cache                | `api`         | `useApiRequest`                                  |
| Optimistic stock adjust (PATCH)           | `api`         | `useApiMutation` with derived status + rollback  |
| Optimistic status transition (PATCH)      | `api`         | `useApiMutation` with manual cache reconcile     |
| Optimistic detail edits                   | `api`         | `useApiMutation` + rollback on error             |
| UI state + multi-tab sync                 | `state`       | `useBroadcastSync` (status + warehouse filters, audit feed) |
| Auto-reorder / multi-warehouse gates      | `flags`       | `useFeatureFlag`, `useFeatureFlagContext().setFlag` |
| Light/dark theming                        | `theme`       | `ThemeProvider`, `useThemeContext().toggleTheme` |
| Error isolation + recovery                | `monitoring`  | `GlobalErrorBoundary`, `ErrorBoundary`           |
| Live Web Vitals (LCP / FCP / CLS / INP)   | `performance` | `PerformanceProvider`, `usePerformanceMonitor`   |
| XSS-safe SKU label preview                | `security`    | `useSafeText`                                    |

## Things to try

- **Switch identity** on the login screen. Each canned user maps to different
  permissions:
  - **Mira (Manager)** — full access: create, update, place restock orders,
    discontinue SKUs, manage settings.
  - **Bao (Buyer)** — procurement: update items, place restock orders, adjust
    stock.
  - **Priya (Floor Picker)** — floor ops: adjust stock counts; no procurement.
  - **Arlo (Auditor)** — read-only; all action buttons are disabled.
- **Open an item** and use the *Stock adjustment* card to pick / receive units.
  The status badge flips instantly when the on-hand quantity crosses the reorder
  threshold (e.g. drop the *Thermal inspection camera* to 0 to see it go to
  *out-of-stock*).
- **Edit the description** — `<script>alert(1)</script>` will round-trip as
  inert text in the *Safe label preview* (rendered through
  `security.useSafeText`).
- **Place a restock order** on a *Low stock* or *Out of stock* item — the
  status flips to *on order* with a 5-day ETA, and the operations board updates
  in real time.
- **Open a second tab** — change the status filter or warehouse filter on the
  Items page, and watch it update live in the other tab
  (`state.useBroadcastSync`).
- **Toggle flags** on the Settings page (manager only):
  - `inventory:auto-reorder` — controls the restock-order helper copy.
  - `inventory:barcode-scan` — hides the barcode helper card on item detail.
  - `inventory:multi-warehouse` — hides the warehouse filter toolbar on the
    Items page.
  - `inventory:ai-forecasting` — reveals a (mocked) demand-forecasting panel.
  - `dark-mode` — disabling it also disables the theme toggle.
- **Trigger a render error** on the Settings page to see
  `monitoring.ErrorBoundary` catch + recover.
- Watch **Web Vitals** stream in the *Performance* panel on Settings.

## How the no-backend wiring works

**MSW** (`src/inventory/mocks/`) intercepts at the Service Worker layer — below
the `fetch` reference the enzyme `apiClient` singleton captures at construction
— so it transparently mocks both the auth flow (`/auth/login`, `/auth/me`,
`/auth/refresh`, `/auth/logout`) and the inventory endpoints
(`/inventory/items`, `/inventory/items/:id`, `/inventory/items/:id/status`,
`/inventory/items/:id/stock`, `/inventory/items/:id/details`). Routes use
`RegExp` so they match regardless of the client's configured base URL.

## Layout

```
src/
├── App.tsx                            # provider stack (auth, flags, theme, perf, monitoring)
├── main.tsx                           # MSW bootstrap + React mount
├── enzyme.ts                          # curated re-export of enzyme modules
├── index.css                          # design tokens + components
└── inventory/
    ├── types.ts                       # InventoryItem, StockStatus, INVENTORY_PERMISSIONS
    ├── users.ts                       # canned demo identities
    ├── flags.ts                       # inventory-specific flag keys + initial state
    ├── api/items.ts                   # useApiRequest / useApiMutation hooks
    ├── store/inventoryStore.ts        # Zustand UI state (broadcast-synced)
    ├── mocks/{browser,handlers,seed}.ts # MSW handlers + seed data
    └── components/                    # InventoryShell, Dashboard, ItemIndex/Detail, etc.
```

> Client-side RBAC here is UX only — a real deployment must enforce permissions
> on the server.
