/**
 * Domain types for the enterprise AI studio.
 *
 * Mirrors the shape of mainstream AI provider APIs (OpenAI / Anthropic / Google)
 * collapsed down to one neutral envelope. The mock backend translates the
 * provider-specific protocol on the wire side; everything above the API layer
 * only sees these types.
 */

export type ProviderId = 'anthropic' | 'openai' | 'google' | 'mistral' | 'meta';

export interface ModelDescriptor {
  /** Stable id used in API calls (e.g. "claude-opus-4-7"). */
  id: string;
  provider: ProviderId;
  /** Display label (e.g. "Claude Opus 4.7"). */
  label: string;
  /** Short capability blurb shown in the picker. */
  tagline: string;
  /** Approximate context window in tokens (display only). */
  contextWindow: number;
  /** Per-million-token costs (USD) for display. */
  pricing: { inputPer1M: number; outputPer1M: number };
  /** Hint shown when a model is gated by a feature flag. */
  beta?: boolean;
}

export interface ProviderDescriptor {
  id: ProviderId;
  label: string;
  /** 1-2 char glyph shown in the picker / avatar. */
  glyph: string;
  /** Color used for accent UI (provider chip, message ring). */
  accent: string;
  blurb: string;
}

export type MessageRole = 'system' | 'user' | 'assistant';

export interface StudioMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  /** ISO timestamp. */
  createdAt: string;
  /** Provider + model that produced an assistant turn (omitted on user/system). */
  model?: { provider: ProviderId; id: string; label: string };
  /** Token accounting reported by the provider for assistant turns. */
  usage?: { inputTokens: number; outputTokens: number };
  /** True while a stream is in flight (assistant message is being typed). */
  streaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  /** Default model new turns use; can be changed mid-conversation. */
  modelId: string;
  /** Owner of the conversation (for sidebar grouping + RBAC). */
  ownerId: string;
  /** ISO timestamp of the last activity — used for sidebar sort order. */
  updatedAt: string;
  /** Persisted system prompt (sent as the first message to the provider). */
  systemPrompt: string;
  /** Cumulative usage across the whole conversation, for the meter. */
  totals: { inputTokens: number; outputTokens: number; costUsd: number };
  /** Marks workspace-shared conversations (visible to all signed-in members). */
  shared?: boolean;
}

/** Request body posted to /api/completions when the user submits a turn. */
export interface CompletionRequest {
  conversationId: string;
  modelId: string;
  systemPrompt: string;
  messages: Array<{ role: MessageRole; content: string }>;
  /** 0..2 — matches OpenAI / Anthropic convention. */
  temperature: number;
  /** Cap on response tokens (display only in the mock). */
  maxTokens: number;
}

/** One frame in the streaming response (Server-Sent Events style). */
export type CompletionFrame =
  | { type: 'token'; text: string }
  | {
      type: 'done';
      usage: { inputTokens: number; outputTokens: number };
      messageId: string;
    }
  | { type: 'error'; message: string };
