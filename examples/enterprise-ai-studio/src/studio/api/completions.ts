/**
 * Streaming completions hook.
 *
 * The completion endpoint returns Server-Sent Events — the same wire format as
 * the real OpenAI / Anthropic / Google streaming APIs. We use enzyme's
 * `apiClient.request` with `responseType: 'stream'` to get the underlying
 * `ReadableStream<Uint8Array>` and parse SSE frames ourselves, writing each
 * incoming token into the React Query message cache so the typing animation
 * runs against the same cache that holds history.
 *
 * After the stream completes, the final assistant turn is POSTed back to
 * `/conversations/:id/turns` so reloading the conversation shows the message.
 */
import { useCallback, useRef, useState } from 'react';
import { api } from '@missionfabric-js/enzyme';
import { useQueryClient } from '@tanstack/react-query';
import type {
  CompletionFrame,
  CompletionRequest,
  Conversation,
  ProviderOptions,
  StudioMessage,
} from '../types';
import { conversationsKey, messagesKey } from './conversations';
import { costFor, modelOrDefault } from '../providers/catalog';
import { parseArtifacts } from '../artifacts/parser';
import { useArtifactStore } from '../artifacts/store';

export interface SendTurnArgs {
  conversation: Conversation;
  /** The user-authored prompt being submitted. */
  userText: string;
  /** Allows overriding the conversation's default model for this single turn. */
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  /** Provider-specific knobs from the Settings panel. */
  providerOptions?: ProviderOptions;
  authorId: string;
}

export interface UseChatCompletionResult {
  send: (args: SendTurnArgs) => Promise<void>;
  abort: () => void;
  isStreaming: boolean;
  error: Error | null;
}

const SSE_FRAME_DELIMITER = /\n\n/;
const SSE_DATA_PREFIX = 'data:';

/**
 * Parse a chunk of SSE text into discrete frames. We carry a buffer across
 * chunks because TCP doesn't promise frame-aligned reads.
 */
function* parseSseChunk(buffer: string): Generator<CompletionFrame, string> {
  const parts = buffer.split(SSE_FRAME_DELIMITER);
  // Everything except the last segment is a complete frame; the tail may be partial.
  const complete = parts.slice(0, -1);
  for (const block of complete) {
    const line = block.split('\n').find((l) => l.startsWith(SSE_DATA_PREFIX));
    if (!line) continue;
    const payload = line.slice(SSE_DATA_PREFIX.length).trim();
    if (payload === '') continue;
    try {
      yield JSON.parse(payload) as CompletionFrame;
    } catch {
      // Ignore malformed frames — a real client might log/break here.
    }
  }
  return parts[parts.length - 1] ?? '';
}

export function useChatCompletion(): UseChatCompletionResult {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const send = useCallback(
    async ({
      conversation,
      userText,
      modelId,
      temperature = 0.7,
      maxTokens = 512,
      providerOptions,
    }: SendTurnArgs) => {
      const effectiveModelId = modelId ?? conversation.modelId;
      const model = modelOrDefault(effectiveModelId);
      const key = messagesKey(conversation.id);

      // 1) Optimistically append the user message + a placeholder assistant message.
      const userMessage: StudioMessage = {
        id: `pending-user-${crypto.randomUUID()}`,
        conversationId: conversation.id,
        role: 'user',
        content: userText,
        createdAt: new Date().toISOString(),
      };
      const assistantId = `streaming-${crypto.randomUUID()}`;
      const assistantPlaceholder: StudioMessage = {
        id: assistantId,
        conversationId: conversation.id,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        model: { provider: model.provider, id: model.id, label: model.label },
        streaming: true,
      };
      queryClient.setQueryData<StudioMessage[]>(key, (old) => [
        ...(old ?? []),
        userMessage,
        assistantPlaceholder,
      ]);

      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);
      setError(null);
      // Reset the artifact store's "currently-streaming" set so the next
      // artifact event we see creates a NEW version (this iteration) rather
      // than patching the prior conversation's final version.
      useArtifactStore.getState().startTurn();

      const priorMessages =
        (queryClient.getQueryData<StudioMessage[]>(key) ?? [])
          .filter((m) => m.id !== userMessage.id && m.id !== assistantId)
          .map((m) => ({ role: m.role, content: m.content }));

      const requestBody: CompletionRequest = {
        conversationId: conversation.id,
        modelId: effectiveModelId,
        systemPrompt: conversation.systemPrompt,
        messages: [...priorMessages, { role: 'user', content: userText }],
        temperature,
        maxTokens,
        providerOptions,
      };

      try {
        const response = await api.apiClient.request<ReadableStream<Uint8Array>>({
          method: 'POST',
          url: '/completions',
          body: requestBody,
          responseType: 'stream',
          signal: controller.signal,
        });

        const stream = response.data;
        if (!stream) {
          throw new Error('Provider returned an empty stream.');
        }

        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let aggregated = '';
        let finalUsage: { inputTokens: number; outputTokens: number } | null = null;
        let serverMessageId: string | null = null;

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Drain whole frames out of the buffer; the generator returns the tail.
          const iter = parseSseChunk(buffer);
          let next = iter.next();
          while (!next.done) {
            const frame = next.value;
            if (frame.type === 'token') {
              aggregated += frame.text;
              // Parse the accumulated text for artifact blocks. The parser is
              // idempotent + chunk-boundary-resilient — calling it on every
              // tick lets the artifact preview render incrementally.
              const parsed = parseArtifacts(aggregated);
              for (const event of parsed.events) {
                useArtifactStore.getState().recordArtifactEvent(
                  conversation.id,
                  event,
                  { provider: model.provider, id: model.id, label: model.label }
                );
              }
              const displayContent =
                parsed.events.length > 0 ? parsed.visibleText : aggregated;
              queryClient.setQueryData<StudioMessage[]>(key, (old) =>
                (old ?? []).map((m) =>
                  m.id === assistantId ? { ...m, content: displayContent } : m
                )
              );
            } else if (frame.type === 'done') {
              finalUsage = frame.usage;
              serverMessageId = frame.messageId;
            } else if (frame.type === 'error') {
              throw new Error(frame.message);
            }
            next = iter.next();
          }
          buffer = next.value;
        }

        // Final parse so partial-tail artifacts get fully realized.
        const finalParsed = parseArtifacts(aggregated);
        for (const event of finalParsed.events) {
          useArtifactStore.getState().recordArtifactEvent(
            conversation.id,
            event,
            { provider: model.provider, id: model.id, label: model.label }
          );
        }
        const persistedContent =
          finalParsed.events.length > 0 ? finalParsed.visibleText : aggregated;

        // 2) Mark the assistant message as no-longer-streaming and persist it.
        const usage = finalUsage ?? { inputTokens: 0, outputTokens: 0 };
        queryClient.setQueryData<StudioMessage[]>(key, (old) =>
          (old ?? []).map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  id: serverMessageId ?? m.id,
                  content: persistedContent,
                  streaming: false,
                  usage,
                }
              : m
          )
        );
        useArtifactStore.getState().endTurn();

        // 3) Persist the final assistant turn on the server side so reloads work.
        await api.apiClient.post(`/conversations/${conversation.id}/turns`, {
          content: persistedContent,
          modelId: effectiveModelId,
          usage,
        });

        // 4) Roll the sidebar's conversation totals in the cache so the meter updates live.
        const turnCost = costFor(effectiveModelId, usage);
        queryClient.setQueryData<Conversation[]>(conversationsKey(), (old) =>
          (old ?? []).map((c) =>
            c.id === conversation.id
              ? {
                  ...c,
                  updatedAt: new Date().toISOString(),
                  totals: {
                    inputTokens: c.totals.inputTokens + usage.inputTokens,
                    outputTokens: c.totals.outputTokens + usage.outputTokens,
                    costUsd: c.totals.costUsd + turnCost,
                  },
                }
              : c
          )
        );
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        // Distinguish a user-initiated abort from a real failure.
        if (e.name === 'AbortError') {
          queryClient.setQueryData<StudioMessage[]>(key, (old) =>
            (old ?? [])
              .filter((m) => m.id !== assistantId)
              .map((m) => (m.id === userMessage.id ? m : m))
          );
        } else {
          setError(e);
          queryClient.setQueryData<StudioMessage[]>(key, (old) =>
            (old ?? []).map((m) =>
              m.id === assistantId
                ? { ...m, streaming: false, content: `⚠ ${e.message}` }
                : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        useArtifactStore.getState().endTurn();
      }
    },
    [queryClient]
  );

  return { send, abort, isStreaming, error };
}
