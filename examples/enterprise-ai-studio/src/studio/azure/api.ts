/**
 * React Query hooks for the Azure bridge.
 *
 * All reads go through React Query so the UI gets caching, dedupe, and
 * background refetch for free. Writes (deploy + chat) use streaming
 * EventSource-style fetches so the caller can render progress live.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  AzureStatus,
  AzureSubscription,
  ResourceGroup,
  AzureLocation,
  CognitiveAccount,
  CognitiveDeployment,
  DeployableModel,
  DeployRequest,
  BudgetSummary,
  FoundryHub,
} from './types';
import { utils } from '@missionfabric-js/enzyme';
import { consumeSseStream } from '../api/sse';

// -----------------------------------------------------------------------------
// Reads
// -----------------------------------------------------------------------------

async function bridgeFetch<T>(path: string): Promise<T> {
  // Wrap reads in enzyme's `withRetry` so a transient blip on the local bridge
  // (network error, or a 5xx while `az` warms up) is retried with backoff.
  // Deterministic client errors (4xx) are not retried — retrying them would
  // only delay the error banner.
  return utils.withRetry(
    async () => {
      const res = await fetch(path, { headers: { accept: 'application/json' } });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err = new Error(body.message ?? `Bridge ${res.status} for ${path}`);
        Object.assign(err, { status: res.status, body });
        throw err;
      }
      return (await res.json()) as T;
    },
    {
      maxAttempts: 3,
      retryOn: (error) => {
        const status = (error as { status?: number }).status;
        return status == null || status >= 500;
      },
    }
  );
}

export function useAzureStatus(): UseQueryResult<AzureStatus> {
  return useQuery({
    queryKey: ['azure', 'status'],
    queryFn: () => bridgeFetch<AzureStatus>('/api/azure/status'),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useSubscriptions(): UseQueryResult<AzureSubscription[]> {
  return useQuery({
    queryKey: ['azure', 'subscriptions'],
    queryFn: () => bridgeFetch<AzureSubscription[]>('/api/azure/subscriptions'),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useResourceGroups(subscriptionId: string | null): UseQueryResult<ResourceGroup[]> {
  return useQuery({
    queryKey: ['azure', 'rgs', subscriptionId ?? '__none'],
    queryFn: () =>
      bridgeFetch<ResourceGroup[]>(
        `/api/azure/resource-groups?subscription=${encodeURIComponent(subscriptionId ?? '')}`
      ),
    enabled: subscriptionId != null,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useLocations(subscriptionId: string | null): UseQueryResult<AzureLocation[]> {
  return useQuery({
    queryKey: ['azure', 'locations', subscriptionId ?? '__none'],
    queryFn: () =>
      bridgeFetch<AzureLocation[]>(
        `/api/azure/locations?subscription=${encodeURIComponent(subscriptionId ?? '')}`
      ),
    enabled: subscriptionId != null,
    staleTime: 24 * 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useCognitiveAccounts(
  subscriptionId: string | null
): UseQueryResult<CognitiveAccount[]> {
  return useQuery({
    queryKey: ['azure', 'cognitive', 'accounts', subscriptionId ?? '__none'],
    queryFn: async () => {
      const list = await bridgeFetch<CognitiveAccount[]>(
        `/api/azure/cognitive/accounts?subscription=${encodeURIComponent(subscriptionId ?? '')}`
      );
      // Compute resourceGroup from the resource id since az's output omits it.
      return list.map((a) => ({
        ...a,
        resourceGroup: rgFromId(a.id) ?? a.resourceGroup ?? '',
      }));
    },
    enabled: subscriptionId != null,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useCognitiveDeployments(
  subscriptionId: string | null,
  resourceGroup: string | null,
  accountName: string | null
): UseQueryResult<CognitiveDeployment[]> {
  return useQuery({
    queryKey: ['azure', 'deployments', subscriptionId, resourceGroup, accountName],
    queryFn: async () => {
      const list = await bridgeFetch<CognitiveDeployment[]>(
        `/api/azure/cognitive/deployments?` +
          `subscription=${encodeURIComponent(subscriptionId ?? '')}` +
          `&resourceGroup=${encodeURIComponent(resourceGroup ?? '')}` +
          `&account=${encodeURIComponent(accountName ?? '')}`
      );
      return list.map((d) => ({
        ...d,
        accountName: accountName ?? d.accountName,
        resourceGroup: resourceGroup ?? d.resourceGroup,
        subscriptionId: subscriptionId ?? d.subscriptionId,
      }));
    },
    enabled: subscriptionId != null && resourceGroup != null && accountName != null,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useDeployableModels(
  subscriptionId: string | null,
  resourceGroup: string | null,
  accountName: string | null
): UseQueryResult<DeployableModel[]> {
  return useQuery({
    queryKey: ['azure', 'deployable-models', subscriptionId, resourceGroup, accountName],
    queryFn: () =>
      bridgeFetch<DeployableModel[]>(
        `/api/azure/cognitive/models?` +
          `subscription=${encodeURIComponent(subscriptionId ?? '')}` +
          `&resourceGroup=${encodeURIComponent(resourceGroup ?? '')}` +
          `&account=${encodeURIComponent(accountName ?? '')}`
      ),
    enabled: subscriptionId != null && resourceGroup != null && accountName != null,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useFoundryHubs(subscriptionId: string | null): UseQueryResult<FoundryHub[] | { error: string; message: string }> {
  return useQuery({
    queryKey: ['azure', 'foundry', 'hubs', subscriptionId ?? '__none'],
    queryFn: () =>
      bridgeFetch<FoundryHub[]>(
        `/api/azure/foundry/hubs?subscription=${encodeURIComponent(subscriptionId ?? '')}`
      ),
    enabled: subscriptionId != null,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useBudget(subscriptionId: string | null): UseQueryResult<BudgetSummary> {
  return useQuery({
    queryKey: ['azure', 'budget', subscriptionId ?? '__none'],
    queryFn: () =>
      bridgeFetch<BudgetSummary>(
        `/api/azure/budget?subscription=${encodeURIComponent(subscriptionId ?? '')}`
      ),
    enabled: subscriptionId != null,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

// -----------------------------------------------------------------------------
// Deployment streaming
// -----------------------------------------------------------------------------

export type DeployLogLine = {
  ts: number;
  stream: 'stdout' | 'stderr' | 'meta';
  line: string;
};

/**
 * Stream a deploy operation. Returns a `start` function the UI calls when
 * the user confirms the wizard; emits log lines via the provided callback.
 *
 * Internally uses `fetch` + ReadableStream rather than EventSource because
 * EventSource is GET-only.
 */
export function useDeployModel(): {
  start: (
    body: DeployRequest,
    handlers: {
      onLog: (line: DeployLogLine) => void;
      onDone: (code: number) => void;
      onError: (message: string) => void;
    }
  ) => Promise<AbortController>;
  isStreaming: boolean;
} & UseMutationResult<void, Error, DeployRequest> {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (_body: DeployRequest) => {
      // The actual work happens in `start` via streaming. We return a
      // resolved promise so React Query's lifecycle still applies.
    },
    onSuccess: () => {
      // Bust the deployments cache so the list refreshes.
      void queryClient.invalidateQueries({ queryKey: ['azure', 'deployments'] });
      void queryClient.invalidateQueries({ queryKey: ['azure', 'budget'] });
    },
  });

  async function start(
    body: DeployRequest,
    handlers: {
      onLog: (line: DeployLogLine) => void;
      onDone: (code: number) => void;
      onError: (message: string) => void;
    }
  ): Promise<AbortController> {
    const controller = new AbortController();
    void streamSse('/api/azure/cognitive/deploy', body, controller.signal, {
      onEvent: (event, data) => {
        if (event === 'log') {
          handlers.onLog({
            ts: Date.now(),
            stream: (data as { stream?: DeployLogLine['stream'] }).stream ?? 'stdout',
            line: (data as { line?: string }).line ?? '',
          });
        } else if (event === 'done') {
          handlers.onDone((data as { code?: number }).code ?? 0);
          mutation.mutate(body);
        } else if (event === 'error') {
          handlers.onError((data as { message?: string }).message ?? 'Unknown bridge error');
        }
      },
      onClose: () => undefined,
    });
    return controller;
  }

  return { ...mutation, start, isStreaming: mutation.isPending };
}

// -----------------------------------------------------------------------------
// Internals
// -----------------------------------------------------------------------------

function rgFromId(id: string | undefined): string | null {
  if (id == null) return null;
  const m = /\/resourceGroups\/([^/]+)\//i.exec(id);
  return m?.[1] ?? null;
}

/**
 * Generic SSE-over-POST consumer. The browser's EventSource API is GET-only
 * and doesn't support custom headers, so we manage the framing ourselves.
 */
export async function streamSse(
  url: string,
  body: unknown,
  signal: AbortSignal,
  handlers: {
    onEvent: (event: string, data: unknown) => void;
    onClose: () => void;
  }
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    handlers.onEvent('error', { message: (err as Error)?.message ?? String(err) });
    handlers.onClose();
    return;
  }
  if (!response.ok || response.body == null) {
    const text = await response.text().catch(() => '');
    handlers.onEvent('error', { message: `Bridge ${response.status}: ${text.slice(0, 300)}` });
    handlers.onClose();
    return;
  }
  try {
    // Shared SSE framing (see ../api/sse). Azure/Foundry emits the OpenAI
    // chat-completion shape: `data: {json}` frames, plus a `data: [DONE]`.
    await consumeSseStream(response.body, ({ event, data }) => {
      if (data === '') {
        handlers.onEvent(event, null);
        return;
      }
      try {
        handlers.onEvent(event, JSON.parse(data));
      } catch {
        handlers.onEvent(event, data);
      }
    });
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      handlers.onEvent('error', { message: (err as Error)?.message ?? String(err) });
    }
  } finally {
    handlers.onClose();
  }
}
