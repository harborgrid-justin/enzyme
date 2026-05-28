/**
 * MSW request handlers — the in-browser "backend" for the AI studio.
 *
 * MSW intercepts at the Service Worker layer (below the bound `fetch` reference
 * the enzyme `apiClient` singleton captures at construction), so it transparently
 * mocks BOTH the auth flow (`authService` → singleton) and the studio's REST
 * endpoints. The completions endpoint streams tokens back as Server-Sent Events
 * — exactly how the real OpenAI / Anthropic / Google APIs deliver tokens —
 * which lets the client-side stream parser exercise the real codepath.
 *
 * RBAC posture
 * ------------
 * Every mutating endpoint enforces authentication + permissions server-side
 * against the bearer token, NOT just the UI. This mirrors how a production
 * deployment must be hardened — the client-side gating in `users.ts` is for
 * UX (don't show buttons the caller can't use); the actual security boundary
 * lives here. See `requirePermission` / `requireConversationAccess` below.
 *
 * Tenancy: in this demo there's a single workspace, so we filter conversation
 * visibility purely by owner + `shared`. A real deployment would additionally
 * scope by `x-tenant-id` (see audit item #13).
 */
import { http, HttpResponse, type DefaultBodyType } from 'msw';
import type { auth } from '@missionfabric-js/enzyme';
import { DEMO_IDENTITIES, findIdentityByEmail, STUDIO_PERMISSIONS } from '../users';
import { findModel, modelOrDefault, providerOf, costFor } from '../providers/catalog';
import {
  approxTokens,
  createSeedConversations,
  createSeedMessages,
  DEFAULT_SYSTEM_PROMPT,
  newConversationTotals,
  synthesizeReply,
} from './seed';
import type {
  CompletionFrame,
  CompletionRequest,
  Conversation,
  StudioMessage,
} from '../types';

// Per-tab, in-memory state. The Service Worker routes each tab's requests back
// to that tab's handlers, so this store is naturally scoped per browser tab.
let conversations: Conversation[] = createSeedConversations();
let messages: StudioMessage[] = createSeedMessages();

/**
 * Active sessions: bearer access-token → owning email. Populated on login,
 * rotated on refresh, cleared on logout. Used by `getCallerIdentity` so every
 * RBAC decision is bound to the token presented on the request, not a
 * module-level "current user" that two tabs could race on.
 */
const tokenSessions = new Map<string, string>();

function mintTokens(email: string): auth.AuthTokens {
  const accessToken = `demo-access-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const refreshToken = `demo-refresh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  tokenSessions.set(accessToken, email);
  tokenSessions.set(refreshToken, email);
  return { accessToken, refreshToken, expiresAt: Date.now() + 60 * 60 * 1000 };
}

function getCallerIdentity(request: Request): auth.User | null {
  const header = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (header == null) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (match == null) return null;
  const email = tokenSessions.get(match[1]);
  if (email == null) return null;
  return findIdentityByEmail(email)?.user ?? null;
}

/** Standardized error envelope so client error handling stays uniform. */
function errorResponse(
  status: number,
  code: string,
  message: string
): HttpResponse<DefaultBodyType> {
  return HttpResponse.json(
    {
      error: code,
      message,
      timestamp: new Date().toISOString(),
      traceId: crypto.randomUUID(),
    },
    { status }
  );
}

/**
 * Returns the caller if authenticated AND holding `permission`; otherwise
 * returns the HttpResponse the handler should short-circuit with. Handlers
 * use `if (result instanceof HttpResponse) return result;` then access
 * `result.user` on the success path.
 */
type AuthorizedCaller = { user: auth.User };

function requirePermission(
  request: Request,
  permission: string
): AuthorizedCaller | HttpResponse<DefaultBodyType> {
  const user = getCallerIdentity(request);
  if (user == null) {
    return errorResponse(401, 'UNAUTHENTICATED', 'Missing or invalid bearer token');
  }
  if (!user.permissions.includes(permission)) {
    return errorResponse(
      403,
      'FORBIDDEN',
      `Caller lacks required permission: ${permission}`
    );
  }
  return { user };
}

function requireAuthenticated(request: Request): AuthorizedCaller | HttpResponse<DefaultBodyType> {
  const user = getCallerIdentity(request);
  if (user == null) {
    return errorResponse(401, 'UNAUTHENTICATED', 'Missing or invalid bearer token');
  }
  return { user };
}

function isAdmin(user: auth.User): boolean {
  return user.roles.some((r) => r === 'admin');
}

/**
 * Returns the conversation if the caller is allowed to read it (owner, admin,
 * or the conversation is shared), otherwise the response to short-circuit.
 */
function requireConversationRead(
  request: Request,
  conversationId: string
): { user: auth.User; conversation: Conversation } | HttpResponse<DefaultBodyType> {
  const authz = requireAuthenticated(request);
  if (authz instanceof HttpResponse) return authz;
  const conversation = conversations.find((c) => c.id === conversationId);
  if (conversation == null) {
    return errorResponse(404, 'NOT_FOUND', `Conversation ${conversationId} not found`);
  }
  if (
    conversation.ownerId === authz.user.id ||
    conversation.shared === true ||
    isAdmin(authz.user)
  ) {
    return { user: authz.user, conversation };
  }
  return errorResponse(403, 'FORBIDDEN', 'Caller is not a member of this conversation');
}

/**
 * Stricter check for mutations: only the owner or an admin may modify.
 */
function requireConversationWrite(
  request: Request,
  conversationId: string
): { user: auth.User; conversation: Conversation } | HttpResponse<DefaultBodyType> {
  const read = requireConversationRead(request, conversationId);
  if (read instanceof HttpResponse) return read;
  if (read.conversation.ownerId !== read.user.id && !isAdmin(read.user)) {
    return errorResponse(
      403,
      'FORBIDDEN',
      'Only the conversation owner (or an admin) may modify it'
    );
  }
  return read;
}

function segmentAfter(pathname: string, marker: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  const idx = parts.indexOf(marker);
  if (idx === -1 || idx + 1 >= parts.length) return null;
  return decodeURIComponent(parts[idx + 1] ?? '');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Cap the synthesized reply at maxTokens for the "Max tokens" setting demo. */
function clampToTokens(text: string, maxTokens: number): string {
  const budget = Math.max(8, maxTokens) * 4;
  if (text.length <= budget) return text;
  return text.slice(0, budget) + '…';
}

/**
 * Chunk an outgoing reply into roughly token-sized pieces. Short replies are
 * chunked by word so the typing animation feels natural; long replies (the
 * 3KB+ artifact bodies) are chunked by ~24-char blocks so they stream in a
 * few seconds instead of dozens.
 */
function chunkReply(reply: string): string[] {
  if (reply.length < 800) {
    return reply.match(/\S+\s*|\s+/g) ?? [reply];
  }
  const chunks: string[] = [];
  const size = 32;
  for (let i = 0; i < reply.length; i += size) {
    chunks.push(reply.slice(i, i + size));
  }
  return chunks;
}

/**
 * Build a Server-Sent Events stream that drips characters out to the client,
 * pacing the cadence per-provider so each one feels distinct.
 */
function buildCompletionStream(req: CompletionRequest): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const model = modelOrDefault(req.modelId);
  const provider = providerOf(req.modelId);
  const lastUserTurn = [...req.messages].reverse().find((m) => m.role === 'user');
  const reply = clampToTokens(
    synthesizeReply(provider.id, lastUserTurn?.content ?? '', model.label, req.conversationId),
    req.maxTokens
  );

  // Token granularity + cadence vary per provider so the UX feels different.
  // For artifact-heavy responses we chunk by larger blocks (~24 chars) so a
  // 3KB landing page streams in 4-5s rather than 15s of word-by-word.
  const wordChunks = chunkReply(reply);
  // Provider personalities — Foundry-hosted small models stream fastest,
  // Gemini frontier is paced, HF routing has slight extra hops.
  const baseDelay =
    provider.id === 'microsoft'
      ? 8
      : provider.id === 'huggingface'
        ? 20
        : provider.id === 'google'
          ? 18
          : provider.id === 'openai'
            ? 12
            : 14;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(frame: CompletionFrame): void {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(frame)}\n\n`));
      }

      // Simulate a small "thinking" pause so the typing indicator is visible.
      await delay(180);

      for (const chunk of wordChunks) {
        send({ type: 'token', text: chunk });
        // Slight jitter so it doesn't look mechanical.
        await delay(baseDelay + Math.random() * 12);
      }

      const inputTokens =
        approxTokens(req.systemPrompt) +
        req.messages.reduce((acc, m) => acc + approxTokens(m.content), 0);
      send({
        type: 'done',
        usage: { inputTokens, outputTokens: approxTokens(reply) },
        messageId: crypto.randomUUID(),
      });
      controller.close();
    },
  });
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
      return errorResponse(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    return HttpResponse.json({
      user: identity.user,
      tokens: mintTokens(identity.user.email),
    });
  }),

  http.post(/\/auth\/logout$/, ({ request }) => {
    const header = request.headers.get('authorization') ?? request.headers.get('Authorization');
    const match = header != null ? /^Bearer\s+(.+)$/i.exec(header) : null;
    if (match != null) {
      const email = tokenSessions.get(match[1]);
      if (email != null) {
        // Revoke every token bound to this email (access + refresh, all tabs).
        for (const [token, owner] of tokenSessions) {
          if (owner === email) tokenSessions.delete(token);
        }
      }
    }
    return HttpResponse.json({ success: true });
  }),

  http.post(/\/auth\/refresh$/, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { refreshToken?: string };
    const email = body.refreshToken != null ? tokenSessions.get(body.refreshToken) : undefined;
    if (email == null) {
      return errorResponse(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired');
    }
    // Rotate: invalidate the old refresh, mint a fresh pair.
    tokenSessions.delete(body.refreshToken!);
    return HttpResponse.json(mintTokens(email));
  }),

  http.get(/\/auth\/me$/, ({ request }) => {
    const user = getCallerIdentity(request);
    if (user == null) {
      return errorResponse(401, 'UNAUTHENTICATED', 'Missing or invalid bearer token');
    }
    return HttpResponse.json(user);
  }),

  // --- Conversations --------------------------------------------------------
  http.get(/\/conversations$/, ({ request }) => {
    const authz = requireAuthenticated(request);
    if (authz instanceof HttpResponse) return authz;
    const visible = conversations.filter(
      (c) =>
        c.ownerId === authz.user.id ||
        c.shared === true ||
        isAdmin(authz.user)
    );
    const sorted = visible.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return HttpResponse.json(sorted);
  }),

  http.post(/\/conversations$/, async ({ request }) => {
    const authz = requirePermission(request, STUDIO_PERMISSIONS.CHAT);
    if (authz instanceof HttpResponse) return authz;

    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      modelId?: string;
      ownerId?: string;
      systemPrompt?: string;
      shared?: boolean;
    };
    const modelId = body.modelId ?? 'claude-opus-4-7';
    if (!findModel(modelId)) {
      return errorResponse(400, 'UNKNOWN_MODEL', `Unknown model: ${modelId}`);
    }
    // Creating a SHARED conversation also requires the share permission;
    // otherwise the caller could escalate by skipping the toggle and flipping
    // on the create call.
    if (body.shared === true && !authz.user.permissions.includes(STUDIO_PERMISSIONS.SHARE)) {
      return errorResponse(
        403,
        'FORBIDDEN',
        `Caller lacks required permission: ${STUDIO_PERMISSIONS.SHARE}`
      );
    }
    const conversation: Conversation = {
      id: `c-${crypto.randomUUID()}`,
      title: (body.title?.trim() ?? '').slice(0, 200) || 'New conversation',
      modelId,
      // Server-assigned ownership — the client cannot impersonate.
      ownerId: authz.user.id,
      shared: body.shared ?? false,
      updatedAt: new Date().toISOString(),
      systemPrompt: (body.systemPrompt ?? DEFAULT_SYSTEM_PROMPT).slice(0, 8000),
      totals: newConversationTotals(modelId),
    };
    conversations = [conversation, ...conversations];
    return HttpResponse.json(conversation, { status: 201 });
  }),

  http.patch(/\/conversations\/[^/]+$/, async ({ request }) => {
    const id = segmentAfter(new URL(request.url).pathname, 'conversations') ?? '';
    const authz = requireConversationWrite(request, id);
    if (authz instanceof HttpResponse) return authz;

    const body = (await request.json().catch(() => ({}))) as Partial<Conversation>;

    // Flipping `shared` requires the SHARE permission on top of write access.
    if (
      body.shared !== undefined &&
      body.shared !== authz.conversation.shared &&
      !authz.user.permissions.includes(STUDIO_PERMISSIONS.SHARE)
    ) {
      return errorResponse(
        403,
        'FORBIDDEN',
        `Caller lacks required permission: ${STUDIO_PERMISSIONS.SHARE}`
      );
    }

    let updated: Conversation | undefined;
    conversations = conversations.map((c) => {
      if (c.id !== id) return c;
      updated = {
        ...c,
        ...body,
        title: body.title != null ? body.title.slice(0, 200) : c.title,
        systemPrompt:
          body.systemPrompt != null ? body.systemPrompt.slice(0, 8000) : c.systemPrompt,
        id: c.id,
        // Ownership cannot be reassigned via PATCH — would break RBAC.
        ownerId: c.ownerId,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    });
    if (!updated) {
      return errorResponse(404, 'NOT_FOUND', `Conversation ${id} not found`);
    }
    return HttpResponse.json(updated);
  }),

  http.delete(/\/conversations\/[^/]+$/, ({ request }) => {
    const id = segmentAfter(new URL(request.url).pathname, 'conversations') ?? '';
    const authz = requireConversationWrite(request, id);
    if (authz instanceof HttpResponse) return authz;
    conversations = conversations.filter((c) => c.id !== id);
    messages = messages.filter((m) => m.conversationId !== id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(/\/conversations\/[^/]+\/messages$/, ({ request }) => {
    const id = segmentAfter(new URL(request.url).pathname, 'conversations') ?? '';
    const authz = requireConversationRead(request, id);
    if (authz instanceof HttpResponse) return authz;
    const items = messages
      .filter((m) => m.conversationId === id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return HttpResponse.json(items);
  }),

  // --- Completions ----------------------------------------------------------
  // POST returns a Server-Sent Events stream of token frames. The client uses
  // a fetch + ReadableStream reader (NOT the api hook layer) because we need to
  // surface each frame to the UI as it arrives.
  http.post(/\/completions$/, async ({ request }) => {
    const chat = requirePermission(request, STUDIO_PERMISSIONS.CHAT);
    if (chat instanceof HttpResponse) return chat;

    const req = (await request.json()) as CompletionRequest;
    const access = requireConversationWrite(request, req.conversationId);
    if (access instanceof HttpResponse) return access;

    const model = findModel(req.modelId);
    if (!model) {
      return errorResponse(400, 'UNKNOWN_MODEL', `Unknown model: ${req.modelId}`);
    }

    // Persist the user turn before we start streaming.
    const lastUserTurn = [...req.messages].reverse().find((m) => m.role === 'user');
    if (lastUserTurn) {
      messages.push({
        id: crypto.randomUUID(),
        conversationId: req.conversationId,
        role: 'user',
        content: lastUserTurn.content,
        createdAt: new Date().toISOString(),
      });
    }

    const stream = buildCompletionStream(req);
    return new HttpResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }),

  // After the stream completes, the client posts the final assistant turn back
  // so it's part of history when the conversation reloads.
  http.post(/\/conversations\/[^/]+\/turns$/, async ({ request }) => {
    const id = segmentAfter(new URL(request.url).pathname, 'conversations') ?? '';
    const chat = requirePermission(request, STUDIO_PERMISSIONS.CHAT);
    if (chat instanceof HttpResponse) return chat;
    const access = requireConversationWrite(request, id);
    if (access instanceof HttpResponse) return access;

    const body = (await request.json()) as {
      content: string;
      modelId: string;
      usage: { inputTokens: number; outputTokens: number };
    };
    const model = modelOrDefault(body.modelId);
    const message: StudioMessage = {
      id: crypto.randomUUID(),
      conversationId: id,
      role: 'assistant',
      content: body.content,
      createdAt: new Date().toISOString(),
      model: { provider: model.provider, id: model.id, label: model.label },
      usage: body.usage,
    };
    messages.push(message);
    // Roll the conversation totals + bump updatedAt.
    conversations = conversations.map((c) => {
      if (c.id !== id) return c;
      const totals = {
        inputTokens: c.totals.inputTokens + body.usage.inputTokens,
        outputTokens: c.totals.outputTokens + body.usage.outputTokens,
        costUsd: c.totals.costUsd + costFor(body.modelId, body.usage),
      };
      return { ...c, totals, updatedAt: message.createdAt };
    });
    return HttpResponse.json(message, { status: 201 });
  }),
];

// Touch the demo identities import so the file's intent is self-documenting:
// "the RBAC matrix below is derived from `users.ts`."
void DEMO_IDENTITIES;
