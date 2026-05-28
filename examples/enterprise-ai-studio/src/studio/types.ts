/**
 * Domain types for the enterprise AI studio.
 *
 * Mirrors the shape of mainstream AI provider APIs (OpenAI / Anthropic / Google)
 * collapsed down to one neutral envelope. The mock backend translates the
 * provider-specific protocol on the wire side; everything above the API layer
 * only sees these types.
 */

export type ProviderId =
  | 'anthropic'
  | 'openai'
  | 'microsoft'
  | 'huggingface'
  | 'google';

/**
 * Wire format the provider expects. Each value maps to a formatter that
 * translates the studio's neutral CompletionRequest into the provider's
 * upstream body shape (system prompt placement, parameter names, role names).
 * See providers/formatters.ts.
 */
export type ProviderRequestFormat =
  | 'anthropic'
  | 'openai'
  | 'azure-openai'
  | 'huggingface'
  | 'gemini';

/** Capability tags surfaced in the picker + settings. Free-form so providers can extend. */
export type ModelCapability =
  | 'vision'
  | 'tools'
  | 'structured-output'
  | 'reasoning'
  | 'extended-thinking'
  | 'adaptive-thinking'
  | 'computer-use'
  | 'multimodal'
  | 'multilingual'
  | 'ultra-long-context'
  | 'open-weights'
  | 'agentic';

export interface ModelDescriptor {
  /** Stable id used in API calls (e.g. "claude-opus-4-7", "meta-llama/Llama-4-Scout"). */
  id: string;
  provider: ProviderId;
  /** Display label (e.g. "Claude Opus 4.7"). */
  label: string;
  /** Short capability blurb shown in the picker. */
  tagline: string;
  /** Approximate context window in tokens (display only). */
  contextWindow: number;
  /** Cap on response tokens advertised by the provider. */
  maxOutputTokens?: number;
  /** Per-million-token costs (USD) for display. */
  pricing: { inputPer1M: number; outputPer1M: number };
  /** Capabilities surfaced in the model picker. */
  capabilities?: ModelCapability[];
  /** Knowledge cutoff (display only — informational). */
  knowledgeCutoff?: string;
  /** For Microsoft Foundry models: the deployment name in an Azure resource. */
  foundryDeploymentName?: string;
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
  /** Link to the provider's official docs. */
  docsUrl: string;
  /** Wire format used to talk to this provider. */
  requestFormat: ProviderRequestFormat;
  /** Example base URL — Azure uses {resource} as a placeholder. */
  apiBaseUrl: string;
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

/**
 * Provider-specific options surfaced in the Settings panel. The studio carries
 * the union for any model and the formatter for the selected provider picks
 * out the ones it cares about — see providers/formatters.ts.
 */
export interface ProviderOptions {
  /** Anthropic: enable extended-thinking blocks (off | low | medium | high). */
  anthropic_thinking?: 'off' | 'low' | 'medium' | 'high';
  /** OpenAI: service tier (auto, default, flex, priority). */
  openai_service_tier?: 'auto' | 'default' | 'flex' | 'priority';
  /** OpenAI o-series / reasoning: effort hint. */
  openai_reasoning_effort?: 'minimal' | 'low' | 'medium' | 'high';
  /** Azure Foundry: API version to pin against the resource. */
  foundry_api_version?: string;
  /** Azure Foundry: explicit deployment name override. */
  foundry_deployment?: string;
  /** Hugging Face: provider routing policy (fastest / cheapest / preferred / specific provider id). */
  huggingface_provider?: 'auto' | 'fastest' | 'cheapest' | 'preferred' | string;
  /** Google: thinking budget in tokens — 0 disables, -1 = dynamic. */
  gemini_thinking_budget?: number;
  /** Google: enable built-in code execution tool. */
  gemini_code_execution?: boolean;
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
  /** Provider-specific knobs — the formatter applies them upstream. */
  providerOptions?: ProviderOptions;
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
