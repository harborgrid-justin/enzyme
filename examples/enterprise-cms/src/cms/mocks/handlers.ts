/**
 * MSW request handlers — the in-browser "backend".
 *
 * MSW intercepts at the Service Worker layer (below the bound `fetch` reference
 * the enzyme `apiClient` singleton captures at construction), so it transparently
 * mocks BOTH the auth flow (`authService` → singleton) and the entry hooks
 * (`useApiRequest`/`useApiMutation`). Routes use RegExp so they match regardless
 * of the client's configured base URL.
 */
import { http, HttpResponse } from 'msw';
import type { auth } from '@missionfabric-js/enzyme';
import { findIdentityByEmail } from '../users';
import { createSeedEntries } from './seed';
import type { CmsEntry, UpdateBodyBody, UpdateStatusBody } from '../types';

// Per-tab, in-memory state. The Service Worker routes each tab's requests back
// to that tab's handlers, so this store is naturally scoped per browser tab.
let entries: CmsEntry[] = createSeedEntries();
let currentEmail: string | null = null;

function makeTokens(): auth.AuthTokens {
  return {
    accessToken: `demo-access-${Date.now().toString(36)}`,
    refreshToken: `demo-refresh-${Date.now().toString(36)}`,
    expiresAt: Date.now() + 60 * 60 * 1000,
  };
}

/** Returns the path segment immediately following `marker`. */
function segmentAfter(pathname: string, marker: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  const idx = parts.indexOf(marker);
  if (idx === -1 || idx + 1 >= parts.length) return null;
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

  // --- Entries --------------------------------------------------------------
  http.get(/\/cms\/entries$/, () => {
    const sorted = [...entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return HttpResponse.json(sorted);
  }),

  http.get(/\/cms\/entries\/[^/]+$/, ({ request }) => {
    const id = segmentAfter(new URL(request.url).pathname, 'entries');
    const entry = entries.find((e) => e.id === id);
    if (!entry) {
      return HttpResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return HttpResponse.json(entry);
  }),

  http.patch(/\/cms\/entries\/[^/]+\/status$/, async ({ request }) => {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const id = parts[parts.indexOf('entries') + 1];
    const body = (await request.json()) as UpdateStatusBody;
    let updated: CmsEntry | undefined;
    entries = entries.map((entry) => {
      if (entry.id !== id) return entry;
      updated = {
        ...entry,
        status: body.status,
        publishAt: body.publishAt,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    });
    if (!updated) {
      return HttpResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return HttpResponse.json(updated);
  }),

  http.patch(/\/cms\/entries\/[^/]+\/body$/, async ({ request }) => {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const id = parts[parts.indexOf('entries') + 1];
    const body = (await request.json()) as UpdateBodyBody;
    let updated: CmsEntry | undefined;
    entries = entries.map((entry) => {
      if (entry.id !== id) return entry;
      updated = { ...entry, body: body.body, updatedAt: new Date().toISOString() };
      return updated;
    });
    if (!updated) {
      return HttpResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return HttpResponse.json(updated);
  }),
];
