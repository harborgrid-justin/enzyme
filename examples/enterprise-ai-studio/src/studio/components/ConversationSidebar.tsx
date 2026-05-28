import { auth } from '@missionfabric-js/enzyme';
import { useState } from 'react';
import type { Conversation } from '../types';
import {
  useConversations,
  useCreateConversation,
  useDeleteConversation,
} from '../api/conversations';
import { useStudioStore } from '../store/studioStore';
import { providerOf, ACCENT_CLASSES, DEFAULT_MODEL_ID } from '../providers/catalog';
import { DEFAULT_SYSTEM_PROMPT } from '../mocks/seed';
import { STUDIO_PERMISSIONS } from '../users';

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
  const { data, isLoading, isError } = useConversations();
  const activeConversationId = useStudioStore((s) => s.activeConversationId);
  const setActiveConversation = useStudioStore((s) => s.setActiveConversation);
  const create = useCreateConversation();
  const remove = useDeleteConversation();

  const canChat = hasPermission(STUDIO_PERMISSIONS.CHAT);

  const conversations = data ?? [];
  const mine = conversations.filter((c) => user != null && c.ownerId === user.id);
  const shared = conversations.filter(
    (c) => c.shared === true && (user == null || c.ownerId !== user.id)
  );

  async function startNew(): Promise<void> {
    if (user == null) return;
    const created = await create.mutateAsync({
      body: {
        title: 'New conversation',
        modelId: DEFAULT_MODEL_ID,
        ownerId: user.id,
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        shared: false,
      },
    });
    setActiveConversation(created.id);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 p-3">
        <button
          type="button"
          onClick={() => void startNew()}
          disabled={!canChat || create.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {create.isPending ? 'Creating…' : '+ New conversation'}
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
                onDelete={() => void remove.mutate({ pathParams: { id: c.id } })}
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
  const [confirming, setConfirming] = useState(false);
  const provider = providerOf(conversation.modelId);
  const classes = ACCENT_CLASSES[provider.accent] ?? ACCENT_CLASSES.indigo;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group block w-full rounded-md px-2 py-2 text-left transition ${
        isActive
          ? 'bg-indigo-50 ring-1 ring-indigo-200'
          : 'hover:bg-slate-100'
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold ${classes.chip}`}
          title={provider.label}
        >
          {provider.glyph}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{conversation.title}</p>
          <p className="text-[11px] text-slate-500">
            {formatRelative(conversation.updatedAt)} · ${conversation.totals.costUsd.toFixed(4)}
          </p>
        </div>
        {onDelete && (
          <span
            className="shrink-0 self-start opacity-0 transition group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              if (confirming) {
                onDelete();
              } else {
                setConfirming(true);
                setTimeout(() => setConfirming(false), 2500);
              }
            }}
          >
            <span className="rounded px-1.5 py-0.5 text-[11px] text-rose-500 hover:bg-rose-50">
              {confirming ? 'Confirm?' : '🗑'}
            </span>
          </span>
        )}
      </div>
    </button>
  );
}
