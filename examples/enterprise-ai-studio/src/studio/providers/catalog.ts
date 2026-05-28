/**
 * Static catalog of providers + models shown in the studio.
 *
 * Each model is treated as interchangeable above the API boundary: the mock
 * backend simulates the right vendor flavor (stream framing, latency profile,
 * persona) so the UI can demonstrate "swap providers mid-conversation" without
 * a real API key.
 */
import type { ModelDescriptor, ProviderDescriptor, ProviderId } from '../types';

export const PROVIDERS: Record<ProviderId, ProviderDescriptor> = {
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    glyph: '✳',
    accent: 'amber',
    blurb: 'Constitutional AI assistants tuned for nuanced reasoning.',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    glyph: '◎',
    accent: 'emerald',
    blurb: 'General-purpose multimodal models with broad tool support.',
  },
  google: {
    id: 'google',
    label: 'Google',
    glyph: '◆',
    accent: 'sky',
    blurb: 'Gemini family — long-context multimodal models.',
  },
  mistral: {
    id: 'mistral',
    label: 'Mistral',
    glyph: '▲',
    accent: 'rose',
    blurb: 'Open-weights MoE models with low latency.',
  },
  meta: {
    id: 'meta',
    label: 'Meta',
    glyph: '∞',
    accent: 'indigo',
    blurb: 'Llama family — self-hostable open-weights models.',
  },
};

export const MODELS: ModelDescriptor[] = [
  {
    id: 'claude-opus-4-7',
    provider: 'anthropic',
    label: 'Claude Opus 4.7',
    tagline: 'Frontier reasoning · agentic workflows',
    contextWindow: 1_000_000,
    pricing: { inputPer1M: 15, outputPer1M: 75 },
  },
  {
    id: 'claude-sonnet-4-6',
    provider: 'anthropic',
    label: 'Claude Sonnet 4.6',
    tagline: 'Balanced speed and quality',
    contextWindow: 200_000,
    pricing: { inputPer1M: 3, outputPer1M: 15 },
  },
  {
    id: 'claude-haiku-4-5',
    provider: 'anthropic',
    label: 'Claude Haiku 4.5',
    tagline: 'Fast, cheap, great for routing',
    contextWindow: 200_000,
    pricing: { inputPer1M: 0.8, outputPer1M: 4 },
  },
  {
    id: 'gpt-5',
    provider: 'openai',
    label: 'GPT-5',
    tagline: 'Flagship multimodal · long context',
    contextWindow: 400_000,
    pricing: { inputPer1M: 10, outputPer1M: 30 },
  },
  {
    id: 'gpt-5-mini',
    provider: 'openai',
    label: 'GPT-5 Mini',
    tagline: 'Lightweight + low latency',
    contextWindow: 128_000,
    pricing: { inputPer1M: 0.5, outputPer1M: 1.5 },
  },
  {
    id: 'gemini-2-5-pro',
    provider: 'google',
    label: 'Gemini 2.5 Pro',
    tagline: 'Massive context · multimodal',
    contextWindow: 2_000_000,
    pricing: { inputPer1M: 5, outputPer1M: 20 },
  },
  {
    id: 'gemini-2-5-flash',
    provider: 'google',
    label: 'Gemini 2.5 Flash',
    tagline: 'High-throughput inference',
    contextWindow: 1_000_000,
    pricing: { inputPer1M: 0.3, outputPer1M: 1.2 },
  },
  {
    id: 'mistral-large-3',
    provider: 'mistral',
    label: 'Mistral Large 3',
    tagline: 'European-hosted general assistant',
    contextWindow: 128_000,
    pricing: { inputPer1M: 4, outputPer1M: 12 },
  },
  {
    id: 'llama-4-405b',
    provider: 'meta',
    label: 'Llama 4 405B',
    tagline: 'Open-weights · self-host friendly',
    contextWindow: 256_000,
    pricing: { inputPer1M: 2, outputPer1M: 6 },
    beta: true,
  },
];

export const DEFAULT_MODEL_ID = 'claude-opus-4-7';

export function findModel(id: string): ModelDescriptor | undefined {
  return MODELS.find((m) => m.id === id);
}

export function modelOrDefault(id: string): ModelDescriptor {
  return findModel(id) ?? (findModel(DEFAULT_MODEL_ID) as ModelDescriptor);
}

export function providerOf(modelId: string): ProviderDescriptor {
  const model = modelOrDefault(modelId);
  return PROVIDERS[model.provider];
}

/** Compute the USD cost of a turn for the usage meter. */
export function costFor(
  modelId: string,
  usage: { inputTokens: number; outputTokens: number }
): number {
  const m = modelOrDefault(modelId);
  return (
    (usage.inputTokens / 1_000_000) * m.pricing.inputPer1M +
    (usage.outputTokens / 1_000_000) * m.pricing.outputPer1M
  );
}

/** Tailwind class fragments keyed by provider accent — Tailwind's JIT needs static strings. */
export const ACCENT_CLASSES: Record<
  string,
  { bg: string; ring: string; text: string; chip: string }
> = {
  amber: {
    bg: 'bg-amber-50',
    ring: 'ring-amber-300',
    text: 'text-amber-700',
    chip: 'bg-amber-100 text-amber-800',
  },
  emerald: {
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-300',
    text: 'text-emerald-700',
    chip: 'bg-emerald-100 text-emerald-800',
  },
  sky: {
    bg: 'bg-sky-50',
    ring: 'ring-sky-300',
    text: 'text-sky-700',
    chip: 'bg-sky-100 text-sky-800',
  },
  rose: {
    bg: 'bg-rose-50',
    ring: 'ring-rose-300',
    text: 'text-rose-700',
    chip: 'bg-rose-100 text-rose-800',
  },
  indigo: {
    bg: 'bg-indigo-50',
    ring: 'ring-indigo-300',
    text: 'text-indigo-700',
    chip: 'bg-indigo-100 text-indigo-800',
  },
};
