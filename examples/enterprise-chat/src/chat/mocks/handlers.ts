/**
 * MSW request handlers — the in-browser "backend".
 *
 * MSW intercepts at the Service Worker layer (below the bound `fetch` reference
 * the enzyme `apiClient` singleton captures at construction), so it transparently
 * mocks BOTH the auth flow (`authService` → singleton) and the message hooks
 * (`useApiRequest`/`useApiMutation`). Routes use RegExp so they match regardless
 * of the client's configured base URL.
 */
import { http, HttpResponse } from 'msw';
import type { auth } from '@missionfabric-js/enzyme';
import { findIdentityByEmail } from '../users';
import { createSeedMessages } from './seed';
import type { ChatMessage, CreateMessageBody } from '../types';

// Per-tab, in-memory state. The Service Worker routes each tab's requests back
// to that tab's handlers, so this store is naturally scoped per browser tab.
let messages: ChatMessage[] = createSeedMessages();
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
    const identity =
      body.email != null ? findIdentityByEmail(body.email) : undefined;
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

  // --- Messages -------------------------------------------------------------
  http.get(/\/channels\/[^/]+\/messages$/, ({ request }) => {
    const channelId = segmentAfter(new URL(request.url).pathname, 'channels');
    const items = messages
      .filter((m) => m.channelId === channelId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return HttpResponse.json(items);
  }),

  http.post(/\/channels\/[^/]+\/messages$/, async ({ request }) => {
    const channelId = segmentAfter(new URL(request.url).pathname, 'channels') ?? 'general';
    const body = (await request.json()) as CreateMessageBody;
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      channelId,
      authorId: body.authorId,
      authorName: body.authorName,
      authorInitials: body.authorInitials,
      text: body.text,
      createdAt: new Date().toISOString(),
      kind: 'user',
    };
    messages.push(message);
    return HttpResponse.json(message, { status: 201 });
  }),

  http.delete(/\/channels\/[^/]+\/messages\/[^/]+$/, ({ request }) => {
    const pathname = new URL(request.url).pathname;
    const id = pathname.split('/').filter(Boolean).pop() ?? '';
    messages = messages.filter((m) => m.id !== id);
    return new HttpResponse(null, { status: 204 });
  }),
];
