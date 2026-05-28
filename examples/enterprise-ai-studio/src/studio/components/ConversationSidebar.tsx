import { auth } from '@missionfabric-js/enzyme';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import type { Conversation } from '../types';
import {
  conversationsKey,
  useConversations,
  useDeleteConversation,
  useUpdateConversation,
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
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { toast } from '../ui/toast';

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const hours = diff / (60 * 60 * 1000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Buckets a conversation by `updatedAt` relative to "now". Drives the
 * sidebar's date grouping (feature #17).
 */
type DateBucket = 'today' | 'yesterday' | 'thisWeek' | 'earlier';

const BUCKET_TITLES: Record<DateBucket, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  thisWeek: 'Earlier this week',
  earlier: 'Older',
};
const BUCKET_ORDER: DateBucket[] = ['today', 'yesterday', 'thisWeek', 'earlier'];

function bucketFor(iso: string, now = new Date()): DateBucket {
  const date = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  if (date >= startOfToday) return 'today';
  if (date >= startOfYesterday) return 'yesterday';
  if (date >= startOfWeek) return 'thisWeek';
  return 'earlier';
}

interface GroupedConversations {
  pinned: Conversation[];
  buckets: Record<DateBucket, Conversation[]>;
}

function groupConversations(items: Conversation[]): GroupedConversations {
  const sortedByRecency = [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const pinned: Conversation[] = [];
  const buckets: GroupedConversations['buckets'] = {
    today: [],
    yesterday: [],
    thisWeek: [],
    earlier: [],
  };
  for (const c of sortedByRecency) {
    if (c.pinned === true) {
      pinned.push(c);
    } else {
      buckets[bucketFor(c.updatedAt)].push(c);
    }
  }
  return { pinned, buckets };
}

/** Left rail — conversation list with search, date grouping, and pinning. */
export function ConversationSidebar(): React.ReactElement {
  const { user, hasPermission } = auth.useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useConversations();
  const activeConversationId = useStudioStore((s) => s.activeConversationId);
  const setActiveConversation = useStudioStore((s) => s.setActiveConversation);
  const { start: startNew, isPending: isCreating } = useStartNewConversation();
  const remove = useDeleteConversation();
  const update = useUpdateConversation();

  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);
  const [query, setQuery] = useState('');
  const undoTimers = useRef<Map<string, number>>(new Map());

  const canChat = hasPermission(STUDIO_PERMISSIONS.CHAT);

  // Feature #16: client-side fuzzy search against title.
  const conversations = data ?? [];
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === '') return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, query]);

  const mine = visible.filter((c) => user != null && c.ownerId === user.id);
  const shared = visible.filter(
    (c) => c.shared === true && (user == null || c.ownerId !== user.id)
  );

  function togglePinned(conv: Conversation): void {
    const willPin = conv.pinned !== true;
    update.mutate(
      {
        pathParams: { id: conv.id },
        body: { id: conv.id, pinned: willPin },
      },
      {
        onSuccess: () => toast.success(willPin ? 'Pinned to top' : 'Unpinned'),
        onError: (err) => toast.error(`Couldn't update pin: ${err.message}`),
      }
    );
  }

  function confirmDelete(conv: Conversation): void {
    setPendingDelete(conv);
  }

  function executeDelete(): void {
    const target = pendingDelete;
    if (target == null) return;
    setPendingDelete(null);

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
            if (snapshot != null) {
              queryClient.setQueryData<Conversation[]>(conversationsKey(), snapshot);
            }
            toast.error(`Couldn't delete conversation: ${err.message}`);
          },
        }
      );
    }, 5000);
    undoTimers.current.set(target.id, timerId);

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
      <div className="space-y-2 border-b border-slate-200 p-3">
        <button
          type="button"
          onClick={() => void startNew()}
          disabled={!canChat || isCreating}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isCreating ? 'Creating…' : '+ New conversation'}
        </button>

        {/* Feature #16: sidebar search */}
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations…"
            aria-label="Search conversations"
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          {query !== '' && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-1 top-1.5 rounded p-1 text-slate-400 hover:bg-slate-100"
            >
              ×
            </button>
          )}
        </div>

        {!canChat && user != null && (
          <p className="text-[11px] text-slate-500">
            🔒 Your role can browse shared conversations but not start new ones.
          </p>
        )}
      </div>

      {/* Feature #19: skeleton loader. */}
      {isLoading && (
        <div className="space-y-2 p-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-2 p-1">
              <Skeleton className="h-6 w-6" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <p className="p-4 text-sm text-rose-500">Couldn&apos;t load conversations.</p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {!isLoading && conversations.length === 0 && (
          // Feature #20: empty-state CTA when the workspace has no conversations.
          <EmptyState
            icon="💬"
            title="No conversations yet"
            description="Start a thread with any model — every provider is wired in."
            action={
              <button
                type="button"
                onClick={() => void startNew()}
                disabled={!canChat || isCreating}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Start your first chat
              </button>
            }
          />
        )}
        {!isLoading && conversations.length > 0 && visible.length === 0 && (
          <EmptyState
            icon="🔎"
            title="No matches"
            description={`Nothing in your conversations contains "${query}".`}
          />
        )}
        {mine.length > 0 && (
          <ConversationGroupedSection
            title="Your conversations"
            items={mine}
            activeId={activeConversationId}
            onSelect={(c) => setActiveConversation(c.id)}
            onDelete={confirmDelete}
            onTogglePin={togglePinned}
          />
        )}
        {shared.length > 0 && (
          <ConversationGroupedSection
            title="Workspace · shared"
            items={shared}
            activeId={activeConversationId}
            onSelect={(c) => setActiveConversation(c.id)}
            onTogglePin={canChat ? togglePinned : undefined}
          />
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

interface ConversationGroupedSectionProps {
  title: string;
  items: Conversation[];
  activeId: string | null;
  onSelect: (c: Conversation) => void;
  onDelete?: (c: Conversation) => void;
  onTogglePin?: (c: Conversation) => void;
}

/**
 * Renders a section header followed by a pinned subgroup (when applicable)
 * and date-bucket subgroups (Today / Yesterday / Earlier this week / Older).
 * Date grouping is implemented entirely client-side from `updatedAt`.
 */
function ConversationGroupedSection({
  title,
  items,
  activeId,
  onSelect,
  onDelete,
  onTogglePin,
}: ConversationGroupedSectionProps): React.ReactElement {
  const grouped = useMemo(() => groupConversations(items), [items]);
  return (
    <div className="mb-3">
      <h3 className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h3>
      {grouped.pinned.length > 0 && (
        <Subgroup
          title="📌 Pinned"
          items={grouped.pinned}
          activeId={activeId}
          onSelect={onSelect}
          onDelete={onDelete}
          onTogglePin={onTogglePin}
        />
      )}
      {BUCKET_ORDER.map((bucket) =>
        grouped.buckets[bucket].length === 0 ? null : (
          <Subgroup
            key={bucket}
            title={BUCKET_TITLES[bucket]}
            items={grouped.buckets[bucket]}
            activeId={activeId}
            onSelect={onSelect}
            onDelete={onDelete}
            onTogglePin={onTogglePin}
          />
        )
      )}
    </div>
  );
}

interface SubgroupProps {
  title: string;
  items: Conversation[];
  activeId: string | null;
  onSelect: (c: Conversation) => void;
  onDelete?: (c: Conversation) => void;
  onTogglePin?: (c: Conversation) => void;
}

function Subgroup({
  title,
  items,
  activeId,
  onSelect,
  onDelete,
  onTogglePin,
}: SubgroupProps): React.ReactElement {
  return (
    <div className="mb-2">
      <p className="px-2 pb-0.5 pt-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
        {title}
      </p>
      <div className="space-y-1">
        {items.map((c) => (
          <ConversationRow
            key={c.id}
            conversation={c}
            isActive={c.id === activeId}
            onSelect={() => onSelect(c)}
            onDelete={onDelete != null ? () => onDelete(c) : undefined}
            onTogglePin={onTogglePin != null ? () => onTogglePin(c) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

interface ConversationRowProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  onTogglePin?: () => void;
}

function ConversationRow({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onTogglePin,
}: ConversationRowProps): React.ReactElement {
  const provider = providerOf(conversation.modelId);
  const classes = ACCENT_CLASSES[provider.accent] ?? ACCENT_CLASSES.indigo;
  const isPinned = conversation.pinned === true;

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
          <div className="min-w-0 flex-1 pr-14">
            <p className="truncate text-sm font-medium text-slate-900">{conversation.title}</p>
            <p className="text-[11px] text-slate-500">
              {formatRelative(conversation.updatedAt)} · ${conversation.totals.costUsd.toFixed(4)}
            </p>
          </div>
        </div>
      </button>
      <div className="absolute right-1 top-1.5 flex items-center gap-0.5">
        {onTogglePin != null && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            aria-label={isPinned ? 'Unpin conversation' : 'Pin conversation'}
            title={isPinned ? 'Unpin' : 'Pin to top'}
            className={`rounded p-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
              isPinned
                ? 'text-amber-600 opacity-100'
                : 'text-slate-400 opacity-0 hover:bg-slate-100 group-hover:opacity-100'
            }`}
          >
            <span aria-hidden>📌</span>
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label={`Delete conversation "${conversation.title}"`}
            className="rounded p-1 text-rose-500 opacity-0 transition hover:bg-rose-50 focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-rose-400 group-hover:opacity-100"
          >
            <span aria-hidden>🗑</span>
          </button>
        )}
      </div>
    </div>
  );
}
