/**
 * MSW request handlers — the in-browser "backend".
 *
 * MSW intercepts at the Service Worker layer (below the bound `fetch` reference
 * the enzyme `apiClient` singleton captures at construction), so it transparently
 * mocks BOTH the auth flow (`authService` → singleton) and the item hooks
 * (`useApiRequest`/`useApiMutation`). Routes use RegExp so they match regardless
 * of the client's configured base URL.
 */
import { http, HttpResponse } from 'msw';
import type { auth } from '@missionfabric-js/enzyme';
import { findIdentityByEmail } from '../users';
import { createSeedItems } from './seed';
import { deriveStockStatus } from '../types';
import type {
  InventoryItem,
  UpdateDetailsBody,
  UpdateStatusBody,
  UpdateStockBody,
} from '../types';

// Per-tab, in-memory state. The Service Worker routes each tab's requests back
// to that tab's handlers, so this store is naturally scoped per browser tab.
let items: InventoryItem[] = createSeedItems();
let currentEmail: string | null = null;

function makeTokens(): auth.AuthTokens {
  return {
    accessToken: `demo-access-${Date.now().toString(36)}`,
    refreshToken: `demo-refresh-${Date.now().toString(36)}`,
    expiresAt: Date.now() + 60 * 60 * 1000,
  };
}

function idFromPath(pathname: string, marker: string): string | undefined {
  const parts = pathname.split('/').filter(Boolean);
  const idx = parts.indexOf(marker);
  if (idx === -1 || idx + 1 >= parts.length) return undefined;
  return decodeURIComponent(parts[idx + 1] ?? '');
}

export const handlers = [
  // --- Auth -----------------------------------------------------------------
  http.post(/\/auth\/login$/, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };
    const identity = body.email != null ? findIdentityByEmail(body.email) : undefined;
    if (!identity || body.password !== identity.password) {
      return HttpResponse.json(
        { error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        { status: 401 }
      );
    }
    currentEmail = identity.user.email;
    return HttpResponse.json({ user: identity.user, tokens: makeTokens() });
  }),

  http.post(/\/auth\/logout$/, () => {
    currentEmail = null;
    return HttpResponse.json({ success: true });
  }),

  http.post(/\/auth\/refresh$/, () => HttpResponse.json(makeTokens())),

  http.get(/\/auth\/me$/, () => {
    const identity = currentEmail != null ? findIdentityByEmail(currentEmail) : undefined;
    if (!identity) {
      return HttpResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    return HttpResponse.json(identity.user);
  }),

  // --- Items ----------------------------------------------------------------
  http.get(/\/inventory\/items$/, () => {
    const sorted = [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return HttpResponse.json(sorted);
  }),

  http.get(/\/inventory\/items\/[^/]+$/, ({ request }) => {
    const id = idFromPath(new URL(request.url).pathname, 'items');
    const item = items.find((e) => e.id === id);
    if (!item) {
      return HttpResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return HttpResponse.json(item);
  }),

  http.patch(/\/inventory\/items\/[^/]+\/status$/, async ({ request }) => {
    const id = idFromPath(new URL(request.url).pathname, 'items');
    const body = (await request.json()) as UpdateStatusBody;
    let updated: InventoryItem | undefined;
    items = items.map((item) => {
      if (item.id !== id) return item;
      updated = {
        ...item,
        status: body.status,
        expectedRestockAt: body.expectedRestockAt,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    });
    if (!updated) {
      return HttpResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return HttpResponse.json(updated);
  }),

  http.patch(/\/inventory\/items\/[^/]+\/stock$/, async ({ request }) => {
    const id = idFromPath(new URL(request.url).pathname, 'items');
    const body = (await request.json()) as UpdateStockBody;
    let updated: InventoryItem | undefined;
    items = items.map((item) => {
      if (item.id !== id) return item;
      const nextQuantity = Math.max(0, item.quantity + body.delta);
      const nextStatus = deriveStockStatus(nextQuantity, item.reorderLevel, item.status);
      const lastRestockedAt =
        body.delta > 0 ? new Date().toISOString() : item.lastRestockedAt;
      updated = {
        ...item,
        quantity: nextQuantity,
        status: nextStatus,
        lastRestockedAt,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    });
    if (!updated) {
      return HttpResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return HttpResponse.json(updated);
  }),

  http.patch(/\/inventory\/items\/[^/]+\/details$/, async ({ request }) => {
    const id = idFromPath(new URL(request.url).pathname, 'items');
    const body = (await request.json()) as UpdateDetailsBody;
    let updated: InventoryItem | undefined;
    items = items.map((item) => {
      if (item.id !== id) return item;
      // Recompute status against the new reorder threshold.
      const nextStatus = deriveStockStatus(item.quantity, body.reorderLevel, item.status);
      updated = {
        ...item,
        description: body.description,
        reorderLevel: body.reorderLevel,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    });
    if (!updated) {
      return HttpResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return HttpResponse.json(updated);
  }),
];
