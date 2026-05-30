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
import { consumeSseStream } from './sse';
import { costFor, modelOrDefault } from '../providers/catalog';
import { parseArtifacts } from '../artifacts/parser';
import { useArtifactStore } from '../artifacts/store';
import { useAzureStore, parseLiveModelId } from '../azure/store';
import { streamSse } from '../azure/api';

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

      // Helper that the inner streaming loops call on each new chunk so all
      // three code paths (mock, Azure live, future ones) share artifact
      // parsing + cache updates without copy-paste drift.
      let aggregated = '';
      function applyChunk(text: string): void {
        aggregated = text;
        const parsed = parseArtifacts(aggregated);
        for (const event of parsed.events) {
          useArtifactStore.getState().recordArtifactEvent(
            conversation.id,
            event,
            { provider: model.provider, id: model.id, label: model.label }
          );
        }
        const displayContent = parsed.events.length > 0 ? parsed.visibleText : aggregated;
        queryClient.setQueryData<StudioMessage[]>(key, (old) =>
          (old ?? []).map((m) =>
            m.id === assistantId ? { ...m, content: displayContent } : m
          )
        );
      }

      try {
        // Branch: live Azure deployment (the bridge proxies to the user's
        // own Foundry endpoint, key resolved server-side) vs the mock backend.
        const liveRef = parseLiveModelId(effectiveModelId);
        const liveDeployment = useAzureStore.getState().liveDeployment;

        let finalUsage: { inputTokens: number; outputTokens: number } | null = null;
        let serverMessageId: string | null = null;

        if (liveRef != null && liveDeployment != null) {
          finalUsage = await streamLiveAzureChat({
            controller,
            request: requestBody,
            deployment: liveDeployment,
            onText: applyChunk,
          });
        } else {
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

        // Shared SSE framing (see ./sse); each frame's `data` is the JSON
        // CompletionFrame the mock backend emits.
        await consumeSseStream(stream, (raw) => {
          if (raw.data === '') return;
          let frame: CompletionFrame;
          try {
            frame = JSON.parse(raw.data) as CompletionFrame;
          } catch {
            return; // Ignore malformed frames — a real client might log here.
          }
          if (frame.type === 'token') {
            applyChunk(aggregated + frame.text);
          } else if (frame.type === 'done') {
            finalUsage = frame.usage;
            serverMessageId = frame.messageId;
          } else if (frame.type === 'error') {
            throw new Error(frame.message);
          }
        });
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

/**
 * Stream a chat completion through the Azure bridge → user's Foundry deployment.
 *
 * The bridge resolves the deployment key server-side (so it never reaches the
 * browser) and proxies the request to Azure with `stream: true`. Azure
 * OpenAI's SSE shape is the standard OpenAI shape — `data: {...}` frames where
 * each `choices[0].delta.content` is a token. We aggregate and forward to
 * `onText` so the caller's chunk handler stays format-agnostic.
 */
async function streamLiveAzureChat({
  controller,
  request,
  deployment,
  onText,
}: {
  controller: AbortController;
  request: CompletionRequest;
  deployment: ReturnType<typeof useAzureStore.getState>['liveDeployment'];
  onText: (aggregatedText: string) => void;
}): Promise<{ inputTokens: number; outputTokens: number }> {
  if (deployment == null) throw new Error('No active live deployment.');

  let aggregated = '';
  let inputTokens = 0;
  let outputTokens = 0;

  // The bridge wants the OpenAI-shaped message list (system as a role)
  // since Azure OpenAI deployments expect that shape.
  const messages = [
    { role: 'system', content: request.systemPrompt },
    ...request.messages,
  ];

  return await new Promise((resolve, reject) => {
    void streamSse(
      '/api/azure/openai/chat',
      {
        subscriptionId: deployment.subscriptionId,
        resourceGroup: deployment.resourceGroup,
        accountName: deployment.accountName,
        deploymentName: deployment.deploymentName,
        apiVersion: deployment.apiVersion ?? '2024-10-21',
        messages,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
      },
      controller.signal,
      {
        onEvent: (event, data) => {
          if (event === 'error') {
            reject(
              new Error(
                (data as { message?: string } | null)?.message ?? 'Azure bridge error'
              )
            );
            return;
          }
          // Azure OpenAI/Foundry emits the OpenAI chat-completion SSE shape:
          //   data: {"choices":[{"delta":{"content":"…"}}], "usage": null}
          //   data: [DONE]
          if (event !== 'message' && event !== 'data' && event !== '') return;
          if (data === '[DONE]' || data === null) return;
          const payload = data as {
            choices?: Array<{ delta?: { content?: string }; finish_reason?: string }>;
            usage?: { prompt_tokens?: number; completion_tokens?: number };
          };
          const delta = payload.choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta.length > 0) {
            aggregated += delta;
            onText(aggregated);
          }
          if (payload.usage != null) {
            inputTokens = payload.usage.prompt_tokens ?? inputTokens;
            outputTokens = payload.usage.completion_tokens ?? outputTokens;
          }
        },
        onClose: () => {
          // If the server didn't include usage (some Foundry deployments don't
          // report tokens on stream), estimate from the aggregated text using
          // the same ~4-chars-per-token rule the mock uses.
          if (outputTokens === 0) outputTokens = Math.max(1, Math.ceil(aggregated.length / 4));
          if (inputTokens === 0) {
            inputTokens = Math.max(
              1,
              Math.ceil(
                (request.systemPrompt.length +
                  request.messages.reduce((acc, m) => acc + m.content.length, 0)) / 4
              )
            );
          }
          resolve({ inputTokens, outputTokens });
        },
      }
    );
  });
}
