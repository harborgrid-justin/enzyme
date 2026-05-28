import { auth, monitoring } from '@missionfabric-js/enzyme';
import type { Conversation } from '../types';
import { providerOf } from '../providers/catalog';
import { useUpdateConversation } from '../api/conversations';
import { useStudioStore } from '../store/studioStore';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { ProviderBadge } from './ModelPicker';
import { STUDIO_PERMISSIONS } from '../users';

interface ConversationViewProps {
  conversation: Conversation;
}

function boundaryFallback(error: { message: string }, reset: () => void): React.ReactElement {
  return (
    <div className="m-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      <p className="mb-2 font-semibold">Something broke: {error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-700"
      >
        Recover
      </button>
    </div>
  );
}

export function ConversationView({ conversation }: ConversationViewProps): React.ReactElement {
  const { hasPermission } = auth.useAuth();
  const update = useUpdateConversation();
  const modelOverrideId = useStudioStore((s) => s.modelOverrideId);

  const canShare = hasPermission(STUDIO_PERMISSIONS.SHARE);
  const provider = providerOf(modelOverrideId ?? conversation.modelId);

  function toggleShared(): void {
    update.mutate({
      pathParams: { id: conversation.id },
      body: { id: conversation.id, shared: conversation.shared !== true },
    });
  }

  function rename(): void {
    const next = window.prompt('Rename conversation', conversation.title);
    if (next != null && next.trim() !== '' && next !== conversation.title) {
      update.mutate({
        pathParams: { id: conversation.id },
        body: { id: conversation.id, title: next.trim() },
      });
    }
  }

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2
              className="cursor-text truncate text-base font-semibold text-slate-900 hover:underline"
              onClick={rename}
              title="Click to rename"
            >
              {conversation.title}
            </h2>
            {conversation.shared === true && (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                shared
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            Powered by <span className="font-semibold">{provider.label}</span>
            {modelOverrideId != null && (
              <span className="ml-1 italic">(overridden for this turn)</span>
            )}
            {' · '}
            {conversation.totals.inputTokens + conversation.totals.outputTokens} tokens · $
            {conversation.totals.costUsd.toFixed(4)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ProviderBadge modelId={modelOverrideId ?? conversation.modelId} />
          {canShare && (
            <button
              type="button"
              onClick={toggleShared}
              disabled={update.isPending}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              {conversation.shared === true ? 'Make private' : 'Share with workspace'}
            </button>
          )}
        </div>
      </header>

      <monitoring.ErrorBoundary fallback={boundaryFallback}>
        <MessageList conversationId={conversation.id} />
      </monitoring.ErrorBoundary>

      <Composer conversation={conversation} />
    </main>
  );
}
