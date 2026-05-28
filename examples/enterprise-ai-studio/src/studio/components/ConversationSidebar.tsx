import { auth } from '@missionfabric-js/enzyme';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { Conversation } from '../types';
import {
  conversationsKey,
  useConversations,
  useDeleteConversation,
} from '../api/conversations';
import { useStartNewConversation } from '../api/useStartNewConversation';
import { useStudioStore } from '../store/studioStore';
import { providerOf, ACCENT_CLASSES } from '../providers/catalog';
import { STUDIO_PERMISSIONS } from '../users';
import {
  Dialog,
  DialogDangerButton,
  DialogSecondaryButton,
} from '../ui/Dialog';
import { toast } from '../ui/toast';

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const hours = diff / (60 * 60 * 1000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Left rail — conversation list grouped by ownership (mine / shared workspace). */
export function ConversationSidebar(): React.ReactElement {
  const { user, hasPermission } = auth.useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useConversations();
  const activeConversationId = useStudioStore((s) => s.activeConversationId);
  const setActiveConversation = useStudioStore((s) => s.setActiveConversation);
  const { start: startNew, isPending: isCreating } = useStartNewConversation();
  const remove = useDeleteConversation();
  // Feature #2: confirmation dialog for destructive delete (no more "click twice").
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);
  // Feature #4 undo support: track deletes that haven't fired their network
  // call yet, so the user has a 5s window to cancel.
  const undoTimers = useRef<Map<string, number>>(new Map());

  const canChat = hasPermission(STUDIO_PERMISSIONS.CHAT);

  const conversations = data ?? [];
  const mine = conversations.filter((c) => user != null && c.ownerId === user.id);
  const shared = conversations.filter(
    (c) => c.shared === true && (user == null || c.ownerId !== user.id)
  );

  function confirmDelete(conv: Conversation): void {
    setPendingDelete(conv);
  }

  function executeDelete(): void {
    const target = pendingDelete;
    if (target == null) return;
    setPendingDelete(null);

    // Optimistically remove the row from the cache, keep the original list
    // so Undo can restore it. The real network call doesn't fire for 5s.
    const snapshot = queryClient.getQueryData<Conversation[]>(conversationsKey());
    queryClient.setQueryData<Conversation[]>(conversationsKey(), (old) =>
      (old ?? []).filter((c) => c.id !== target.id)
    );
    if (activeConversationId === target.id) {
      setActiveConversation(null);
    }

    const timerId = window.setTimeout(() => {
      undoTimers.current.delete(target.id);
      remove.mutate(
        { pathParams: { id: target.id } },
        {
          onError: (err) => {
            // Restore on server-side failure.
            if (snapshot != null) {
              queryClient.setQueryData<Conversation[]>(conversationsKey(), snapshot);
            }
            toast.error(`Couldn't delete conversation: ${err.message}`);
          },
        }
      );
    }, 5000);
    undoTimers.current.set(target.id, timerId);

    // Feature #4: toast with Undo action.
    toast.success(`Deleted "${target.title}"`, {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          const tid = undoTimers.current.get(target.id);
          if (tid != null) {
            window.clearTimeout(tid);
            undoTimers.current.delete(target.id);
          }
          if (snapshot != null) {
            queryClient.setQueryData<Conversation[]>(conversationsKey(), snapshot);
          }
          setActiveConversation(target.id);
          toast.info('Conversation restored');
        },
      },
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 p-3">
        <button
          type="button"
          onClick={() => void startNew()}
          disabled={!canChat || isCreating}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isCreating ? 'Creating…' : '+ New conversation'}
        </button>
        {!canChat && user != null && (
          <p className="mt-2 text-[11px] text-slate-500">
            🔒 Your role can browse shared conversations but not start new ones.
          </p>
        )}
      </div>

      {isLoading && (
        <p className="p-4 text-sm text-slate-400">Loading conversations…</p>
      )}
      {isError && (
        <p className="p-4 text-sm text-rose-500">Couldn&apos;t load conversations.</p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {mine.length > 0 && (
          <ConversationSection title="Your conversations" items={mine}>
            {(c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                isActive={c.id === activeConversationId}
                onSelect={() => setActiveConversation(c.id)}
                onDelete={() => confirmDelete(c)}
              />
            )}
          </ConversationSection>
        )}
        {shared.length > 0 && (
          <ConversationSection title="Workspace · shared" items={shared}>
            {(c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                isActive={c.id === activeConversationId}
                onSelect={() => setActiveConversation(c.id)}
              />
            )}
          </ConversationSection>
        )}
        {!isLoading && conversations.length === 0 && (
          <p className="p-4 text-sm text-slate-400">
            No conversations yet — start one above.
          </p>
        )}
      </div>

      <Dialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this conversation?"
        description={
          pendingDelete != null
            ? `"${pendingDelete.title}" and all of its messages will be removed. You'll have 5 seconds to undo.`
            : undefined
        }
        footer={
          <>
            <DialogSecondaryButton onClick={() => setPendingDelete(null)}>
              Cancel
            </DialogSecondaryButton>
            <DialogDangerButton onClick={executeDelete}>Delete</DialogDangerButton>
          </>
        }
      >
        <p className="text-xs text-slate-500 dark:text-slate-400">
          This action affects only you unless the conversation is shared.
        </p>
      </Dialog>
    </div>
  );
}

interface ConversationSectionProps {
  title: string;
  items: Conversation[];
  children: (c: Conversation) => React.ReactNode;
}

function ConversationSection({
  title,
  items,
  children,
}: ConversationSectionProps): React.ReactElement {
  return (
    <div className="mb-3">
      <h3 className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h3>
      <div className="space-y-1">{items.map(children)}</div>
    </div>
  );
}

interface ConversationRowProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}

function ConversationRow({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: ConversationRowProps): React.ReactElement {
  const provider = providerOf(conversation.modelId);
  const classes = ACCENT_CLASSES[provider.accent] ?? ACCENT_CLASSES.indigo;

  return (
    <div
      className={`group relative block w-full rounded-md transition ${
        isActive ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-slate-100'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="block w-full rounded-md px-2 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <div className="flex items-start gap-2">
          <span
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold ${classes.chip}`}
            aria-label={`${provider.label} model`}
          >
            {provider.glyph}
          </span>
          <div className="min-w-0 flex-1 pr-7">
            <p className="truncate text-sm font-medium text-slate-900">{conversation.title}</p>
            <p className="text-[11px] text-slate-500">
              {formatRelative(conversation.updatedAt)} · ${conversation.totals.costUsd.toFixed(4)}
            </p>
          </div>
        </div>
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label={`Delete conversation "${conversation.title}"`}
          className="absolute right-1.5 top-1.5 rounded p-1 text-rose-500 opacity-0 transition hover:bg-rose-50 focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-rose-400 group-hover:opacity-100"
        >
          <span aria-hidden>🗑</span>
        </button>
      )}
    </div>
  );
}
