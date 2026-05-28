/**
 * MSW request handlers — the in-browser "backend" for the AI studio.
 *
 * MSW intercepts at the Service Worker layer (below the bound `fetch` reference
 * the enzyme `apiClient` singleton captures at construction), so it transparently
 * mocks BOTH the auth flow (`authService` → singleton) and the studio's REST
 * endpoints. The completions endpoint streams tokens back as Server-Sent Events
 * — exactly how the real OpenAI / Anthropic / Google APIs deliver tokens —
 * which lets the client-side stream parser exercise the real codepath.
 */
import { http, HttpResponse } from 'msw';
import type { auth } from '@missionfabric-js/enzyme';
import { findIdentityByEmail } from '../users';
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
let currentEmail: string | null = null;

function makeTokens(): auth.AuthTokens {
  return {
    accessToken: `demo-access-${Date.now().toString(36)}`,
    refreshToken: `demo-refresh-${Date.now().toString(36)}`,
    expiresAt: Date.now() + 60 * 60 * 1000,
  };
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

  // --- Conversations --------------------------------------------------------
  http.get(/\/conversations$/, () => {
    const sorted = [...conversations].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
    return HttpResponse.json(sorted);
  }),

  http.post(/\/conversations$/, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      modelId?: string;
      ownerId?: string;
      systemPrompt?: string;
      shared?: boolean;
    };
    const modelId = body.modelId ?? 'claude-opus-4-7';
    if (!findModel(modelId)) {
      return HttpResponse.json(
        { error: 'UNKNOWN_MODEL', message: `Unknown model: ${modelId}` },
        { status: 400 }
      );
    }
    const conversation: Conversation = {
      id: `c-${crypto.randomUUID()}`,
      title: body.title?.trim() || 'New conversation',
      modelId,
      ownerId: body.ownerId ?? 'u-unknown',
      shared: body.shared ?? false,
      updatedAt: new Date().toISOString(),
      systemPrompt: body.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
      totals: newConversationTotals(modelId),
    };
    conversations = [conversation, ...conversations];
    return HttpResponse.json(conversation, { status: 201 });
  }),

  http.patch(/\/conversations\/[^/]+$/, async ({ request }) => {
    const id = segmentAfter(new URL(request.url).pathname, 'conversations');
    const body = (await request.json().catch(() => ({}))) as Partial<Conversation>;
    let updated: Conversation | undefined;
    conversations = conversations.map((c) => {
      if (c.id !== id) return c;
      updated = {
        ...c,
        ...body,
        id: c.id,
        ownerId: c.ownerId,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    });
    if (!updated) {
      return HttpResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return HttpResponse.json(updated);
  }),

  http.delete(/\/conversations\/[^/]+$/, ({ request }) => {
    const id = segmentAfter(new URL(request.url).pathname, 'conversations');
    conversations = conversations.filter((c) => c.id !== id);
    messages = messages.filter((m) => m.conversationId !== id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(/\/conversations\/[^/]+\/messages$/, ({ request }) => {
    const id = segmentAfter(new URL(request.url).pathname, 'conversations');
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
    const req = (await request.json()) as CompletionRequest;
    const model = findModel(req.modelId);
    if (!model) {
      return HttpResponse.json(
        { error: 'UNKNOWN_MODEL', message: `Unknown model: ${req.modelId}` },
        { status: 400 }
      );
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
