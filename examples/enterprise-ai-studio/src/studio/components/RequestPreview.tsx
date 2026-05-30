import { hooks } from '@missionfabric-js/enzyme';
import { useMemo, useState } from 'react';
import { useStudioStore } from '../store/studioStore';
import { providerOf } from '../providers/catalog';
import { formatRequest } from '../providers/formatters';
import type { CompletionRequest, Conversation } from '../types';

interface RequestPreviewProps {
  conversation: Conversation;
  /** Sample prompt to put into the request body for preview purposes. */
  samplePrompt?: string;
}

/**
 * Shows the exact JSON body + URL that would be sent to the upstream provider
 * for the next turn. Helps users see how the same neutral CompletionRequest
 * gets translated into Anthropic / OpenAI / Foundry / HF / Gemini wire formats.
 *
 * The preview reacts live to the Settings panel — toggle extended thinking
 * or change the HF routing policy and the body updates inline.
 */
export function RequestPreview({
  conversation,
  samplePrompt = 'Draft a one-line headline for our Q3 launch.',
}: RequestPreviewProps): React.ReactElement {
  const modelOverrideId = useStudioStore((s) => s.modelOverrideId);
  const temperature = useStudioStore((s) => s.temperature);
  const maxTokens = useStudioStore((s) => s.maxTokens);
  const providerOptions = useStudioStore((s) => s.providerOptions);
  const isOpen = useStudioStore((s) => s.isRequestPreviewOpen);
  const toggle = useStudioStore((s) => s.toggleRequestPreview);
  const [view, setView] = useState<'body' | 'curl'>('body');
  const [, copy] = hooks.useCopyToClipboard();

  const effectiveModelId = modelOverrideId ?? conversation.modelId;
  const provider = providerOf(effectiveModelId);

  const formatted = useMemo(() => {
    const request: CompletionRequest = {
      conversationId: conversation.id,
      modelId: effectiveModelId,
      systemPrompt: conversation.systemPrompt,
      messages: [{ role: 'user', content: samplePrompt }],
      temperature,
      maxTokens,
      providerOptions,
    };
    return formatRequest(request);
  }, [
    conversation.id,
    conversation.systemPrompt,
    effectiveModelId,
    samplePrompt,
    temperature,
    maxTokens,
    providerOptions,
  ]);

  const bodyJson = useMemo(
    () => JSON.stringify(formatted.body, null, 2),
    [formatted.body]
  );

  const curlSnippet = useMemo(() => {
    const headerLines = Object.entries(formatted.headers)
      .map(([k, v]) => `  -H "${k}: ${v}" \\`)
      .join('\n');
    const body = bodyJson.replace(/'/g, "'\\''");
    return `curl ${formatted.url} \\\n${headerLines}\n  -d '${body}'`;
  }, [formatted.url, formatted.headers, bodyJson]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Request preview</h3>
          <p className="text-[11px] text-slate-500">
            {provider.label} ({formatted.format}) → {effectiveModelId}
          </p>
        </div>
        <span className="text-xs text-slate-500">{isOpen ? '▾' : '▸'}</span>
      </button>

      {isOpen && (
        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 flex items-center gap-1">
            <TabButton active={view === 'body'} onClick={() => setView('body')}>
              Body
            </TabButton>
            <TabButton active={view === 'curl'} onClick={() => setView('curl')}>
              cURL
            </TabButton>
            <span className="ml-2 truncate font-mono text-[11px] text-slate-500">
              {trimUrl(formatted.url)}
            </span>
            <button
              type="button"
              onClick={() => void copy(view === 'body' ? bodyJson : curlSnippet)}
              title="Copy"
              className="ml-auto h-6 w-6 rounded text-slate-500 hover:bg-slate-100"
            >
              ⧉
            </button>
          </div>

          <pre className="max-h-72 overflow-auto rounded bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-200">
            <code>{view === 'body' ? bodyJson : curlSnippet}</code>
          </pre>
          <p className="mt-2 text-[11px] text-slate-400">
            This is the actual upstream wire format for {provider.label}. The
            mock backend doesn't hit it — swap{' '}
            <code className="rounded bg-slate-100 px-1">apiClient.request</code>{' '}
            in <code className="rounded bg-slate-100 px-1">api/completions.ts</code> for{' '}
            <code className="rounded bg-slate-100 px-1">fetch(formatted.url, …)</code>{' '}
            to ship.
          </p>
        </div>
      )}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1 text-[11px] font-medium ${
        active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

function trimUrl(url: string): string {
  // Keep the host + path but drop query strings for the header chip.
  const q = url.indexOf('?');
  return q >= 0 ? url.slice(0, q) + '?…' : url;
}
