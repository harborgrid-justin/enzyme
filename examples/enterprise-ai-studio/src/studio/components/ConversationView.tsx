import { auth, monitoring } from '@missionfabric-js/enzyme';
import { useState } from 'react';
import type { Conversation } from '../types';
import { providerOf } from '../providers/catalog';
import { useUpdateConversation } from '../api/conversations';
import { useStudioStore } from '../store/studioStore';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { ConversationActions } from './ConversationActions';
import { ProviderBadge } from './ModelPicker';
import { STUDIO_PERMISSIONS } from '../users';
import {
  Dialog,
  DialogPrimaryButton,
  DialogSecondaryButton,
} from '../ui/Dialog';
import { toast } from '../ui/toast';

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
  const setModelOverride = useStudioStore((s) => s.setModelOverride);
  const costBudgetUsd = useStudioStore((s) => s.costBudgetUsd);
  // Feature #1: rename uses an accessible Radix Dialog instead of window.prompt.
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState(conversation.title);

  const canShare = hasPermission(STUDIO_PERMISSIONS.SHARE);
  const canChat = hasPermission(STUDIO_PERMISSIONS.CHAT);
  const provider = providerOf(modelOverrideId ?? conversation.modelId);

  function toggleShared(): void {
    const willShare = conversation.shared !== true;
    update.mutate(
      {
        pathParams: { id: conversation.id },
        body: { id: conversation.id, shared: willShare },
      },
      {
        // Feature #5: toast on share toggle so the action is acknowledged.
        onSuccess: () => {
          toast.success(
            willShare ? 'Conversation shared with workspace' : 'Conversation made private'
          );
        },
        onError: (err) => toast.error(`Couldn't update sharing: ${err.message}`),
      }
    );
  }

  function openRename(): void {
    setRenameDraft(conversation.title);
    setRenameOpen(true);
  }

  // Feature #81: promote the current per-turn override to the conversation default.
  function promoteOverrideToDefault(): void {
    if (modelOverrideId == null) return;
    const newModelId = modelOverrideId;
    update.mutate(
      {
        pathParams: { id: conversation.id },
        body: { id: conversation.id, modelId: newModelId },
      },
      {
        onSuccess: () => {
          toast.success('Default model updated for this conversation');
          setModelOverride(null);
        },
        onError: (err) => toast.error(`Couldn't update default: ${err.message}`),
      }
    );
  }

  // Feature #77: warn when the conversation's spend exceeds the budget.
  const overBudget = costBudgetUsd > 0 && conversation.totals.costUsd > costBudgetUsd;

  // Feature #73: tag management.
  const [addingTag, setAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState('');
  function addTag(): void {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 24);
    if (tag === '') return;
    const tags = Array.from(new Set([...(conversation.tags ?? []), tag]));
    update.mutate(
      { pathParams: { id: conversation.id }, body: { id: conversation.id, tags } },
      {
        onSuccess: () => {
          setTagInput('');
          setAddingTag(false);
        },
        onError: (err) => toast.error(`Couldn't add tag: ${err.message}`),
      }
    );
  }
  function removeTag(tag: string): void {
    const tags = (conversation.tags ?? []).filter((t) => t !== tag);
    update.mutate({ pathParams: { id: conversation.id }, body: { id: conversation.id, tags } });
  }

  function submitRename(): void {
    const next = renameDraft.trim();
    if (next === '' || next === conversation.title) {
      setRenameOpen(false);
      return;
    }
    update.mutate(
      {
        pathParams: { id: conversation.id },
        body: { id: conversation.id, title: next },
      },
      {
        onSuccess: () => {
          toast.success('Conversation renamed');
          setRenameOpen(false);
        },
        onError: (err) => toast.error(`Rename failed: ${err.message}`),
      }
    );
  }

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="cursor-text truncate text-left text-base font-semibold text-slate-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
              onClick={openRename}
              title="Click to rename"
            >
              {conversation.title}
            </button>
            {conversation.shared === true && (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                shared
              </span>
            )}
            {conversation.archived === true && (
              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                archived
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
          {/* Feature #73: tag bar. */}
          {canChat && (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {(conversation.tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    ×
                  </button>
                </span>
              ))}
              {addingTag ? (
                <input
                  autoFocus
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onBlur={() => (tagInput.trim() === '' ? setAddingTag(false) : addTag())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                    if (e.key === 'Escape') {
                      setTagInput('');
                      setAddingTag(false);
                    }
                  }}
                  placeholder="tag…"
                  className="w-20 rounded-full border border-slate-300 px-2 py-0.5 text-[10px] focus:border-indigo-400 focus:outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingTag(true)}
                  className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[10px] font-medium text-slate-400 hover:border-indigo-300 hover:text-indigo-600"
                >
                  + tag
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ProviderBadge modelId={modelOverrideId ?? conversation.modelId} />
          {/* Feature #81: lock the per-turn override in as the new default. */}
          {canChat && modelOverrideId != null && modelOverrideId !== conversation.modelId && (
            <button
              type="button"
              onClick={promoteOverrideToDefault}
              disabled={update.isPending}
              className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
              title="Make the overridden model this conversation's default"
            >
              Set as default
            </button>
          )}
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
          {/* Feature #44: overflow menu — duplicate / export / archive / pin. */}
          <ConversationActions conversation={conversation} canManage={canChat} />
        </div>
      </header>

      {/* Feature #77: cost budget warning. */}
      {overBudget && (
        <div className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-xs text-amber-800">
          ⚠ This conversation has cost ${conversation.totals.costUsd.toFixed(4)}, over your $
          {costBudgetUsd.toFixed(2)} budget.
        </div>
      )}

      <monitoring.ErrorBoundary fallback={boundaryFallback}>
        <MessageList conversationId={conversation.id} />
      </monitoring.ErrorBoundary>

      <Composer conversation={conversation} />

      <Dialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="Rename conversation"
        description="Choose a short, descriptive title — visible in the sidebar and the share link."
        footer={
          <>
            <DialogSecondaryButton onClick={() => setRenameOpen(false)}>
              Cancel
            </DialogSecondaryButton>
            <DialogPrimaryButton
              onClick={submitRename}
              disabled={
                update.isPending ||
                renameDraft.trim() === '' ||
                renameDraft.trim() === conversation.title
              }
            >
              {update.isPending ? 'Saving…' : 'Save'}
            </DialogPrimaryButton>
          </>
        }
      >
        <label
          htmlFor="rename-conversation-input"
          className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400"
        >
          Title
        </label>
        <input
          id="rename-conversation-input"
          autoFocus
          value={renameDraft}
          onChange={(e) => setRenameDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submitRename();
            }
          }}
          maxLength={200}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <p className="mt-1 text-[11px] text-slate-400">
          {renameDraft.length}/200
        </p>
      </Dialog>
    </main>
  );
}
