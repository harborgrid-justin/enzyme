/**
 * Provider-specific request formatters.
 *
 * Each formatter takes the studio's neutral `CompletionRequest` and produces
 * the JSON body the upstream provider expects. The shapes follow each
 * provider's published wire format, accurate as of May 2026:
 *
 *   - Anthropic         POST {baseUrl}/messages
 *                       (system as top-level string, messages array,
 *                        optional `thinking` block)
 *   - OpenAI            POST {baseUrl}/chat/completions
 *                       (system as a message role, `max_completion_tokens`
 *                        on GPT-5.x, optional `service_tier` + `reasoning`)
 *   - Microsoft Foundry POST {baseUrl}/deployments/{deployment}/chat/completions?api-version=…
 *                       (Azure OpenAI shape; deployment in path; api-version
 *                        as a query param)
 *   - Hugging Face      POST {baseUrl}/chat/completions
 *                       (OpenAI-compatible; model id may carry a `:fastest`
 *                        / `:cheapest` / `:provider` suffix for routing)
 *   - Google Gemini     POST {baseUrl}/models/{model}:streamGenerateContent
 *                       (roles renamed user→user, assistant→model, system
 *                        moves into `systemInstruction`, generationConfig
 *                        holds temperature / maxOutputTokens / thinkingConfig)
 *
 * The studio's mock backend doesn't actually hit these endpoints — it
 * intercepts the studio's own `/completions` and serves a Server-Sent Events
 * stream. But the formatters live here so the **Request preview** panel can
 * show a realistic body for whichever provider the user has selected, and
 * dropping the mock for a real upstream is a one-file change in completions.ts.
 */
import type { CompletionRequest, ProviderRequestFormat } from '../types';
import { providerOf, findModel } from './catalog';

export interface FormattedRequest {
  /** The full upstream URL with path + query string (azure puts api-version here). */
  url: string;
  /** Headers including auth scheme (with `<TOKEN>` placeholder). */
  headers: Record<string, string>;
  /** JSON body as a plain object — caller stringifies. */
  body: unknown;
  /** What the formatter calls this provider on the wire. */
  format: ProviderRequestFormat;
}

export function formatRequest(req: CompletionRequest): FormattedRequest {
  const provider = providerOf(req.modelId);
  switch (provider.requestFormat) {
    case 'anthropic':
      return formatAnthropic(req);
    case 'openai':
      return formatOpenAI(req);
    case 'azure-openai':
      return formatFoundry(req);
    case 'huggingface':
      return formatHuggingFace(req);
    case 'gemini':
      return formatGemini(req);
  }
}

// -----------------------------------------------------------------------------
// Anthropic
// -----------------------------------------------------------------------------

function formatAnthropic(req: CompletionRequest): FormattedRequest {
  const opts = req.providerOptions ?? {};
  const body: Record<string, unknown> = {
    model: req.modelId,
    system: req.systemPrompt,
    messages: req.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    max_tokens: req.maxTokens,
    temperature: req.temperature,
    stream: true,
  };
  if (opts.anthropic_thinking != null && opts.anthropic_thinking !== 'off') {
    const budget = { low: 1024, medium: 4096, high: 16384 }[opts.anthropic_thinking];
    body.thinking = { type: 'enabled', budget_tokens: budget };
  }
  return {
    url: 'https://api.anthropic.com/v1/messages',
    headers: {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': '<ANTHROPIC_API_KEY>',
    },
    body,
    format: 'anthropic',
  };
}

// -----------------------------------------------------------------------------
// OpenAI
// -----------------------------------------------------------------------------

function formatOpenAI(req: CompletionRequest): FormattedRequest {
  const opts = req.providerOptions ?? {};
  const messages = [
    { role: 'system', content: req.systemPrompt },
    ...req.messages.filter((m) => m.role !== 'system'),
  ];
  const body: Record<string, unknown> = {
    model: req.modelId,
    messages,
    // GPT-5.x and o-series use `max_completion_tokens`; the legacy `max_tokens`
    // is rejected for those models since the 2026-Q1 API revision.
    max_completion_tokens: req.maxTokens,
    temperature: req.temperature,
    stream: true,
    stream_options: { include_usage: true },
  };
  if (opts.openai_service_tier != null && opts.openai_service_tier !== 'auto') {
    body.service_tier = opts.openai_service_tier;
  }
  if (opts.openai_reasoning_effort != null) {
    body.reasoning = { effort: opts.openai_reasoning_effort };
  }
  return {
    url: 'https://api.openai.com/v1/chat/completions',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer <OPENAI_API_KEY>',
    },
    body,
    format: 'openai',
  };
}

// -----------------------------------------------------------------------------
// Microsoft Foundry (Azure OpenAI-compatible)
// -----------------------------------------------------------------------------

function formatFoundry(req: CompletionRequest): FormattedRequest {
  const model = findModel(req.modelId);
  const opts = req.providerOptions ?? {};
  const deployment = opts.foundry_deployment ?? model?.foundryDeploymentName ?? req.modelId;
  const apiVersion = opts.foundry_api_version ?? '2024-10-21';
  const body: Record<string, unknown> = {
    messages: [
      { role: 'system', content: req.systemPrompt },
      ...req.messages.filter((m) => m.role !== 'system'),
    ],
    max_tokens: req.maxTokens,
    temperature: req.temperature,
    stream: true,
  };
  return {
    url:
      `https://<resource>.services.ai.azure.com/openai/deployments/` +
      `${deployment}/chat/completions?api-version=${apiVersion}`,
    headers: {
      'content-type': 'application/json',
      'api-key': '<AZURE_FOUNDRY_KEY>',
    },
    body,
    format: 'azure-openai',
  };
}

// -----------------------------------------------------------------------------
// Hugging Face (OpenAI-compatible router across 20+ partners)
// -----------------------------------------------------------------------------

function formatHuggingFace(req: CompletionRequest): FormattedRequest {
  const opts = req.providerOptions ?? {};
  // HF supports policy suffixes (`:fastest`, `:cheapest`, `:preferred`) or an
  // explicit provider id (`:together`, `:groq`, …). Anything other than `auto`
  // is appended verbatim to the model id.
  const policy = opts.huggingface_provider ?? 'auto';
  const suffix = policy === 'auto' ? '' : `:${policy}`;
  const body = {
    model: `${req.modelId}${suffix}`,
    messages: [
      { role: 'system', content: req.systemPrompt },
      ...req.messages.filter((m) => m.role !== 'system'),
    ],
    max_tokens: req.maxTokens,
    temperature: req.temperature,
    stream: true,
  };
  return {
    url: 'https://router.huggingface.co/v1/chat/completions',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer <HF_TOKEN>',
    },
    body,
    format: 'huggingface',
  };
}

// -----------------------------------------------------------------------------
// Google Gemini
// -----------------------------------------------------------------------------

function formatGemini(req: CompletionRequest): FormattedRequest {
  const opts = req.providerOptions ?? {};
  const generationConfig: Record<string, unknown> = {
    temperature: req.temperature,
    maxOutputTokens: req.maxTokens,
  };
  if (opts.gemini_thinking_budget != null) {
    generationConfig.thinkingConfig = { thinkingBudget: opts.gemini_thinking_budget };
  }
  const body: Record<string, unknown> = {
    contents: req.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        // Gemini calls the assistant role "model".
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    systemInstruction: { parts: [{ text: req.systemPrompt }] },
    generationConfig,
  };
  if (opts.gemini_code_execution === true) {
    body.tools = [{ codeExecution: {} }];
  }
  return {
    url:
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${req.modelId}:streamGenerateContent?key=<GEMINI_API_KEY>&alt=sse`,
    headers: {
      'content-type': 'application/json',
    },
    body,
    format: 'gemini',
  };
}
