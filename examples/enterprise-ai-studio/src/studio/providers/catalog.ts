/**
 * Provider + model catalog — five real LLM providers.
 *
 * Sourced from the providers' live docs (May 2026):
 *   - Anthropic:        platform.claude.com / docs.anthropic.com
 *   - OpenAI:           platform.openai.com / developers.openai.com
 *   - Microsoft Foundry: learn.microsoft.com/azure/ai-foundry
 *   - Hugging Face:     huggingface.co/docs/inference-providers
 *   - Google Gemini:    ai.google.dev/gemini-api/docs
 *
 * Each provider has a distinct wire format (see providers/formatters.ts).
 * The studio carries a neutral `CompletionRequest` above the API boundary;
 * formatters translate that into the upstream provider's body shape so the
 * studio can talk to all five without per-call branching in the UI.
 *
 * NOTE: Client-side branching here is for demo/UX only. In production, the
 * provider routing should live behind a server-side gateway — provider API
 * keys must never ship to the browser.
 */
import type { ModelDescriptor, ProviderDescriptor, ProviderId } from '../types';

export const PROVIDERS: Record<ProviderId, ProviderDescriptor> = {
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    glyph: '✳',
    accent: 'amber',
    blurb:
      'Constitutional-AI assistants. Vision, 1M-token contexts, adaptive ' +
      'thinking, computer use. Pinned model IDs guarantee snapshot stability.',
    docsUrl: 'https://docs.anthropic.com',
    requestFormat: 'anthropic',
    apiBaseUrl: 'https://api.anthropic.com/v1',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    glyph: '◎',
    accent: 'emerald',
    blurb:
      'Frontier multimodal models. GPT-5.x family with native computer use, ' +
      '1M-token contexts, and the broadest tool/function-calling ecosystem.',
    docsUrl: 'https://platform.openai.com/docs',
    requestFormat: 'openai',
    apiBaseUrl: 'https://api.openai.com/v1',
  },
  microsoft: {
    id: 'microsoft',
    label: 'Microsoft Foundry',
    glyph: '⬢',
    accent: 'sky',
    blurb:
      'Azure-hosted catalog. Microsoft Phi, plus partner models (Mistral, ' +
      'Meta, Cohere, DeepSeek, Claude) sold under Microsoft enterprise terms.',
    docsUrl: 'https://learn.microsoft.com/en-us/azure/ai-foundry',
    requestFormat: 'azure-openai',
    apiBaseUrl: 'https://{resource}.services.ai.azure.com/openai/v1',
  },
  huggingface: {
    id: 'huggingface',
    label: 'Hugging Face',
    glyph: '🤗',
    accent: 'rose',
    blurb:
      'Routed inference across 20+ partner providers (Together, Fireworks, ' +
      'SambaNova, Groq, Cerebras…). OpenAI-compatible endpoint, one HF token.',
    docsUrl: 'https://huggingface.co/docs/inference-providers',
    requestFormat: 'huggingface',
    apiBaseUrl: 'https://router.huggingface.co/v1',
  },
  google: {
    id: 'google',
    label: 'Google',
    glyph: '◆',
    accent: 'indigo',
    blurb:
      'Gemini 3.x and 2.5 families. Long-context multimodal (text + image + ' +
      'video + audio), built-in code execution, dynamic thinking budgets.',
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    requestFormat: 'gemini',
    apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  },
};

export const MODELS: ModelDescriptor[] = [
  // --- Anthropic ----------------------------------------------------------
  {
    id: 'claude-opus-4-7',
    provider: 'anthropic',
    label: 'Claude Opus 4.7',
    tagline: 'Frontier reasoning · agentic coding · 1M context',
    contextWindow: 1_000_000,
    maxOutputTokens: 128_000,
    pricing: { inputPer1M: 5, outputPer1M: 25 },
    capabilities: ['vision', 'tools', 'adaptive-thinking', 'computer-use'],
    knowledgeCutoff: '2026-01',
  },
  {
    id: 'claude-sonnet-4-6',
    provider: 'anthropic',
    label: 'Claude Sonnet 4.6',
    tagline: 'Balanced speed + intelligence · 1M context',
    contextWindow: 1_000_000,
    maxOutputTokens: 64_000,
    pricing: { inputPer1M: 3, outputPer1M: 15 },
    capabilities: ['vision', 'tools', 'extended-thinking', 'adaptive-thinking'],
    knowledgeCutoff: '2025-08',
  },
  {
    id: 'claude-haiku-4-5',
    provider: 'anthropic',
    label: 'Claude Haiku 4.5',
    tagline: 'Fastest with near-frontier intelligence',
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    pricing: { inputPer1M: 1, outputPer1M: 5 },
    capabilities: ['vision', 'tools', 'extended-thinking'],
    knowledgeCutoff: '2025-02',
  },

  // --- OpenAI -------------------------------------------------------------
  {
    id: 'gpt-5.5',
    provider: 'openai',
    label: 'GPT-5.5',
    tagline: 'Flagship · complex reasoning + coding · 1M+ context',
    contextWindow: 1_050_000,
    maxOutputTokens: 128_000,
    pricing: { inputPer1M: 5, outputPer1M: 30 },
    capabilities: ['vision', 'tools', 'structured-output', 'reasoning'],
  },
  {
    id: 'gpt-5.4',
    provider: 'openai',
    label: 'GPT-5.4',
    tagline: 'Native computer use · 1M context',
    contextWindow: 1_050_000,
    maxOutputTokens: 128_000,
    pricing: { inputPer1M: 2.5, outputPer1M: 15 },
    capabilities: ['vision', 'tools', 'computer-use', 'structured-output'],
  },
  {
    id: 'gpt-5.4-mini',
    provider: 'openai',
    label: 'GPT-5.4 mini',
    tagline: 'High-volume workloads · fast + cheap',
    contextWindow: 400_000,
    maxOutputTokens: 64_000,
    pricing: { inputPer1M: 0.25, outputPer1M: 2 },
    capabilities: ['vision', 'tools', 'structured-output'],
  },
  {
    id: 'gpt-5.4-nano',
    provider: 'openai',
    label: 'GPT-5.4 nano',
    tagline: 'Sub-agents · classification · extraction',
    contextWindow: 128_000,
    maxOutputTokens: 16_000,
    pricing: { inputPer1M: 0.05, outputPer1M: 0.4 },
    capabilities: ['tools', 'structured-output'],
  },

  // --- Microsoft Foundry --------------------------------------------------
  {
    id: 'phi-4',
    provider: 'microsoft',
    label: 'Phi-4',
    tagline: 'Microsoft frontier small model · reasoning-tuned',
    contextWindow: 16_000,
    maxOutputTokens: 16_000,
    pricing: { inputPer1M: 0.07, outputPer1M: 0.28 },
    capabilities: ['reasoning', 'tools'],
    foundryDeploymentName: 'phi-4',
  },
  {
    id: 'mistral-large-2',
    provider: 'microsoft',
    label: 'Mistral Large 2',
    tagline: 'Sold via Foundry · European-hosted',
    contextWindow: 128_000,
    maxOutputTokens: 16_000,
    pricing: { inputPer1M: 2, outputPer1M: 6 },
    capabilities: ['tools', 'multilingual'],
    foundryDeploymentName: 'mistral-large-2',
  },
  {
    id: 'meta-llama-4-scout',
    provider: 'microsoft',
    label: 'Llama 4 Scout (Foundry)',
    tagline: 'Open weights via Foundry · ultra-long context (10M)',
    contextWindow: 10_000_000,
    maxOutputTokens: 32_000,
    pricing: { inputPer1M: 0.4, outputPer1M: 1.6 },
    capabilities: ['tools', 'ultra-long-context'],
    foundryDeploymentName: 'llama-4-scout',
  },
  {
    id: 'deepseek-v4',
    provider: 'microsoft',
    label: 'DeepSeek V4 Pro (Foundry)',
    tagline: '#1 agentic open model · 1M context',
    contextWindow: 1_000_000,
    maxOutputTokens: 32_000,
    pricing: { inputPer1M: 0.55, outputPer1M: 1.95 },
    capabilities: ['reasoning', 'tools', 'agentic'],
    foundryDeploymentName: 'deepseek-v4-pro',
    beta: true,
  },

  // --- Hugging Face -------------------------------------------------------
  {
    id: 'openai/gpt-oss-120b',
    provider: 'huggingface',
    label: 'GPT-OSS 120B',
    tagline: 'Open weights from OpenAI · highlighted on HF',
    contextWindow: 128_000,
    maxOutputTokens: 8_000,
    pricing: { inputPer1M: 0.2, outputPer1M: 0.8 },
    capabilities: ['tools', 'open-weights'],
  },
  {
    id: 'deepseek-ai/DeepSeek-V4-Pro',
    provider: 'huggingface',
    label: 'DeepSeek V4 Pro',
    tagline: '#1 open-weights agentic · 1M context',
    contextWindow: 1_000_000,
    maxOutputTokens: 32_000,
    pricing: { inputPer1M: 0.55, outputPer1M: 1.95 },
    capabilities: ['tools', 'reasoning', 'agentic', 'open-weights'],
  },
  {
    id: 'meta-llama/Llama-4-Scout',
    provider: 'huggingface',
    label: 'Llama 4 Scout',
    tagline: '10M token context — best for long documents',
    contextWindow: 10_000_000,
    maxOutputTokens: 16_000,
    pricing: { inputPer1M: 0.4, outputPer1M: 1.6 },
    capabilities: ['ultra-long-context', 'open-weights'],
  },
  {
    id: 'Qwen/Qwen3-235B-Instruct',
    provider: 'huggingface',
    label: 'Qwen3 235B',
    tagline: 'Apache 2.0 · top open-weights ranking',
    contextWindow: 128_000,
    maxOutputTokens: 16_000,
    pricing: { inputPer1M: 0.5, outputPer1M: 2 },
    capabilities: ['tools', 'multilingual', 'open-weights'],
  },

  // --- Google Gemini ------------------------------------------------------
  {
    id: 'gemini-3.1-pro-preview',
    provider: 'google',
    label: 'Gemini 3.1 Pro',
    tagline: 'Advanced intelligence · agentic · preview',
    contextWindow: 2_000_000,
    maxOutputTokens: 64_000,
    pricing: { inputPer1M: 2, outputPer1M: 12 },
    capabilities: ['vision', 'tools', 'reasoning', 'multimodal'],
    beta: true,
  },
  {
    id: 'gemini-3.5-flash',
    provider: 'google',
    label: 'Gemini 3.5 Flash',
    tagline: 'Frontier flash · sustained agentic + coding',
    contextWindow: 1_000_000,
    maxOutputTokens: 64_000,
    pricing: { inputPer1M: 1.5, outputPer1M: 9 },
    capabilities: ['vision', 'tools', 'multimodal'],
  },
  {
    id: 'gemini-3-flash-preview',
    provider: 'google',
    label: 'Gemini 3 Flash',
    tagline: 'Cost-efficient frontier preview',
    contextWindow: 1_000_000,
    maxOutputTokens: 32_000,
    pricing: { inputPer1M: 0.5, outputPer1M: 3 },
    capabilities: ['vision', 'multimodal'],
  },
  {
    id: 'gemini-2.5-flash-lite',
    provider: 'google',
    label: 'Gemini 2.5 Flash-Lite',
    tagline: 'Budget · high-throughput multimodal',
    contextWindow: 1_000_000,
    maxOutputTokens: 8_000,
    pricing: { inputPer1M: 0.1, outputPer1M: 0.4 },
    capabilities: ['vision', 'multimodal'],
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

export function modelsByProvider(): Record<ProviderId, ModelDescriptor[]> {
  const grouped: Record<ProviderId, ModelDescriptor[]> = {
    anthropic: [],
    openai: [],
    microsoft: [],
    huggingface: [],
    google: [],
  };
  for (const m of MODELS) grouped[m.provider].push(m);
  return grouped;
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
