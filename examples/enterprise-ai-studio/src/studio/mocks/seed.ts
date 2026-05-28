/**
 * Seed conversations + canned assistant personas keyed by provider.
 *
 * The mock backend uses these personas to make swapping providers feel real:
 * Anthropic answers in a careful, citation-flavored voice, OpenAI in a brisk
 * problem-solving voice, Gemini in an analytical voice, etc.
 */
import type { Conversation, ProviderId, StudioMessage } from '../types';
import { costFor, DEFAULT_MODEL_ID } from '../providers/catalog';
import { applyVariation, pickTemplate, type ArtifactTemplate } from '../artifacts/library';

const HOUR = 60 * 60 * 1000;

export const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful enterprise assistant. Be concise, cite assumptions, and ' +
  'flag any high-risk actions before suggesting them.';

export function createSeedConversations(): Conversation[] {
  const now = Date.now();
  return [
    {
      id: 'c-quarterly-review',
      title: 'Quarterly business review draft',
      modelId: 'claude-opus-4-7',
      ownerId: 'u-admin',
      shared: true,
      updatedAt: new Date(now - 1 * HOUR).toISOString(),
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      totals: { inputTokens: 1240, outputTokens: 3180, costUsd: 0.257 },
    },
    {
      id: 'c-onboarding',
      title: 'New-hire onboarding playbook',
      modelId: 'gpt-5',
      ownerId: 'u-engineer',
      shared: true,
      updatedAt: new Date(now - 6 * HOUR).toISOString(),
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      totals: { inputTokens: 820, outputTokens: 2110, costUsd: 0.071 },
    },
    {
      id: 'c-perf-investigation',
      title: 'Latency regression on /search',
      modelId: 'gemini-2-5-pro',
      ownerId: 'u-engineer',
      updatedAt: new Date(now - 24 * HOUR).toISOString(),
      systemPrompt:
        'You are an SRE pair-programming partner. Prefer hypotheses backed by ' +
        'data; ask clarifying questions before recommending mitigations.',
      totals: { inputTokens: 540, outputTokens: 1340, costUsd: 0.029 },
    },
  ];
}

export function createSeedMessages(): StudioMessage[] {
  return [
    msg('c-quarterly-review', 'user', 'Draft an executive summary for Q3.', -65, 'u-admin'),
    msg(
      'c-quarterly-review',
      'assistant',
      'Here is a draft, structured as: headline KPIs → 3 wins → 2 risks → asks. ' +
        'Confirm whether you want a comparison vs. plan or vs. prior year.',
      -64,
      'u-admin',
      { provider: 'anthropic', id: 'claude-opus-4-7', label: 'Claude Opus 4.7' },
      { inputTokens: 320, outputTokens: 580 }
    ),
    msg('c-onboarding', 'user', 'Create a week-1 plan for a senior frontend hire.', -360, 'u-engineer'),
    msg(
      'c-onboarding',
      'assistant',
      'Day 1: laptop + access; Day 2-3: codebase tour + first PR; Day 4: shadow ' +
        'oncall; Day 5: retro. Want me to expand each day with explicit owners?',
      -359,
      'u-engineer',
      { provider: 'openai', id: 'gpt-5', label: 'GPT-5' },
      { inputTokens: 220, outputTokens: 410 }
    ),
  ];
}

function msg(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  minutesAgo: number,
  _ownerId: string,
  model?: { provider: ProviderId; id: string; label: string },
  usage?: { inputTokens: number; outputTokens: number }
): StudioMessage {
  return {
    id: `m-${conversationId}-${role}-${Math.abs(minutesAgo)}`,
    conversationId,
    role,
    content,
    createdAt: new Date(Date.now() + minutesAgo * 60_000).toISOString(),
    model,
    usage,
  };
}

/** Persona snippets the mock cycles through when generating an assistant turn. */
export const PROVIDER_PERSONAS: Record<ProviderId, string[]> = {
  anthropic: [
    "Here's a careful take — flagging the assumption you're optimizing for **clarity** over brevity. ",
    'Let me think this through step by step. First, the core constraint is ',
    'A few options, ordered by reversibility. The safest first move is to ',
  ],
  openai: [
    'Got it — quick plan: 1) scope, 2) draft, 3) review. ',
    "Here's a concrete take. The fastest path is ",
    'Three things to try, then I can dig deeper on any of them: ',
  ],
  google: [
    "From an analytical lens, the strongest signal here is ",
    'Looking at this holistically across the trade-offs: ',
    'I would frame this as a multi-objective problem — the axes are ',
  ],
  mistral: [
    'Quick answer: ',
    'Direct take — the pragmatic move is ',
    'Compact rundown: ',
  ],
  meta: [
    "Let's break it down. The model behind this works best when ",
    'A useful mental model: ',
    "Here's how I'd structure an experiment to validate this: ",
  ],
};

/**
 * Per-conversation "last artifact" memory the mock uses to support iteration:
 * when a follow-up prompt comes in ("make it darker"), we mutate the prior
 * artifact body instead of picking a fresh template.
 */
interface ArtifactMemory {
  templateId: string;
  body: string;
  title: string;
  kind: ArtifactTemplate['kind'];
  language?: string;
}

const lastArtifactByConversation = new Map<string, ArtifactMemory>();

const ITERATION_HINTS =
  /(make it|change it|update|revise|tweak|darker|lighter|brighter|recolor|brand|add a|with a|condense|tighten|shorter|different|redesign)/i;

/**
 * Decide whether to generate an artifact for this turn, and what to do with it.
 *
 *   - `iterate`: the user wants to modify the last artifact in this conversation
 *   - `fresh`: the user asked for something new (build / design / draft …)
 *   - `none`: regular chat turn, no artifact
 */
function routeArtifact(
  conversationId: string,
  prompt: string
): { mode: 'iterate' | 'fresh'; template: ArtifactTemplate; variationLabel?: string } | null {
  const prior = lastArtifactByConversation.get(conversationId);
  const isIteration = prior != null && ITERATION_HINTS.test(prompt);

  if (isIteration) {
    const variation = applyVariation(prior.body, prior.kind, prompt);
    if (variation != null) {
      // Patch memory with the new body so subsequent iterations stack.
      lastArtifactByConversation.set(conversationId, { ...prior, body: variation.body });
      return {
        mode: 'iterate',
        template: {
          id: prior.templateId,
          title: prior.title,
          kind: prior.kind,
          language: prior.language,
          triggers: [],
          body: variation.body,
        },
        variationLabel: variation.label,
      };
    }
  }

  const template = pickTemplate(prompt);
  if (template == null) return null;
  lastArtifactByConversation.set(conversationId, {
    templateId: template.id,
    body: template.body,
    title: template.title,
    kind: template.kind,
    language: template.language,
  });
  return { mode: 'fresh', template };
}

/** Generate a deterministic-ish assistant reply body for the mock stream. */
export function synthesizeReply(
  provider: ProviderId,
  userPrompt: string,
  modelLabel: string,
  conversationId: string
): string {
  const personas = PROVIDER_PERSONAS[provider];
  const opener = personas[Math.floor(Math.random() * personas.length)];
  const routed = routeArtifact(conversationId, userPrompt);

  if (routed != null) {
    const { template, mode, variationLabel } = routed;
    const intro =
      mode === 'iterate'
        ? `${opener}On it — applied your iteration on top of the previous draft.`
        : `${opener}Here's a first pass at **${template.title.toLowerCase()}**. Live preview is on the right →`;
    const followUp =
      mode === 'iterate'
        ? `\n\nLet me know what to refine next — try "make it darker", "add a CTA", or "use a different palette".`
        : `\n\nWant to iterate? Ask me to "make it darker", "add a CTA", "use a different palette", or "tighten the layout".`;

    const labelAttr =
      mode === 'iterate' && variationLabel != null ? ` label="${variationLabel}"` : '';
    const languageAttr = template.language != null ? ` language="${template.language}"` : '';

    return (
      `${intro}\n\n` +
      `<artifact id="${template.id}" type="${template.kind}" title="${template.title}"${languageAttr}${labelAttr}>\n` +
      `${template.body}\n` +
      `</artifact>` +
      `${followUp}\n\n` +
      `_Reply generated by ${modelLabel} (mock)._`
    );
  }

  const subject = userPrompt.slice(0, 140).replace(/\s+/g, ' ').trim() || 'your question';
  return (
    `${opener}"${subject}" — let me unpack that.\n\n` +
    `1. **What I notice**: the request hinges on at least two trade-offs (time-to-value vs. correctness).\n` +
    `2. **What I'd do next**: prototype the smallest end-to-end slice, then layer in guardrails.\n` +
    `3. **Open questions**: who owns the rollback path, and what's your latency budget?\n\n` +
    `Tip: ask me to "build a landing page", "design a dashboard", or "draft a quarterly review" to see live artifacts.\n\n` +
    `_Reply generated by ${modelLabel} (mock)._`
  );
}

/** Estimate tokens for the mock usage meter (~4 chars per token, like real tokenizers). */
export function approxTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

/** Re-export for the conversation create endpoint. */
export function newConversationTotals(modelId: string): Conversation['totals'] {
  const seedUsage = { inputTokens: 0, outputTokens: 0 };
  return { ...seedUsage, costUsd: costFor(modelId, seedUsage) };
}

export { DEFAULT_MODEL_ID };
