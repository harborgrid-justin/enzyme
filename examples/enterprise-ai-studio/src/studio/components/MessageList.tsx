import { auth } from '@missionfabric-js/enzyme';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useConversationMessages } from '../api/conversations';
import { useChatCompletion } from '../api/completions';
import { useStudioStore } from '../store/studioStore';
import { initials, STUDIO_PERMISSIONS } from '../users';
import type { StudioMessage } from '../types';
import { useConversations } from '../api/conversations';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { emitComposerDraft, emitComposerQuote } from '../ui/composerDraftBus';
import {
  loadBookmarks,
  saveBookmarks,
  loadFeedback,
  saveFeedback,
  type Feedback,
} from '../ui/messageMeta';
import { toast } from '../ui/toast';

interface MessageListProps {
  conversationId: string;
}

const STARTER_CHIPS = [
  { glyph: '🎨', label: 'Design a landing page for a SaaS startup' },
  { glyph: '📊', label: 'Build an analytics dashboard with KPI cards' },
  { glyph: '✨', label: 'Create an SVG logo for "Atlas" — modern, abstract' },
  { glyph: '📄', label: 'Draft a QBR memo for Q3 focused on ARR + retention' },
];

import { MessageRow } from './Message';

/** Renders a conversation's messages from the React Query cache. */
export function MessageList({ conversationId }: MessageListProps): React.ReactElement {
  const { user, hasPermission } = auth.useAuth();
  const { data, isLoading, isError, error } = useConversationMessages(conversationId);
  const { data: conversations } = useConversations();
  const { send } = useChatCompletion();
  const modelOverrideId = useStudioStore((s) => s.modelOverrideId);
  const temperature = useStudioStore((s) => s.temperature);
  const maxTokens = useStudioStore((s) => s.maxTokens);
  const providerOptions = useStudioStore((s) => s.providerOptions);
  const density = useStudioStore((s) => s.density);

  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // Feature #27: scroll-to-bottom FAB — only when scrolled away from the end.
  const [showJumpBottom, setShowJumpBottom] = useState(false);
  // Feature #67/#68: in-thread search + bookmark-only filter.
  const [search, setSearch] = useState('');
  const [bookmarksOnly, setBookmarksOnly] = useState(false);
  const [bookmarks, setBookmarks] = useState<string[]>(() => loadBookmarks(conversationId));
  const [feedback, setFeedbackMap] = useState<Record<string, Feedback>>(() =>
    loadFeedback(conversationId)
  );

  // Reload per-message metadata when switching conversations.
  useEffect(() => {
    setBookmarks(loadBookmarks(conversationId));
    setFeedbackMap(loadFeedback(conversationId));
    setSearch('');
    setBookmarksOnly(false);
  }, [conversationId]);

  const messages = useMemo(
    () => [...(data ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [data]
  );

  // Feature #67/#68: filter the rendered set by search text + bookmark filter.
  const visibleMessages = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((m) => {
      if (bookmarksOnly && !bookmarks.includes(m.id)) return false;
      if (q !== '' && !m.content.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [messages, search, bookmarksOnly, bookmarks]);

  function toggleBookmark(id: string): void {
    setBookmarks((prev) => {
      const next = prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id];
      saveBookmarks(conversationId, next);
      return next;
    });
  }

  function setMessageFeedback(id: string, value: Feedback): void {
    setFeedbackMap((prev) => {
      const next: Record<string, Feedback> = { ...prev };
      if (next[id] === value) delete next[id];
      else next[id] = value;
      saveFeedback(conversationId, next);
      return next;
    });
    toast.success('Thanks for the feedback');
  }

  function replyTo(message: StudioMessage): void {
    const excerpt = message.content.slice(0, 240);
    emitComposerQuote(excerpt);
  }

  function editUserMessage(message: StudioMessage): void {
    // Feature #72: load a previous prompt back into the composer to re-ask.
    emitComposerDraft(message.content);
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Re-trigger on streaming updates too — the last message's content changes.
  }, [messages.length, messages[messages.length - 1]?.content]);

  useEffect(() => {
    const el = containerRef.current;
    if (el == null) return;
    function onScroll(): void {
      const node = containerRef.current;
      if (node == null) return;
      const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
      setShowJumpBottom(distanceFromBottom > 240);
    }
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  function jumpToBottom(): void {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function regenerate(assistant: StudioMessage): void {
    if (user == null || !hasPermission(STUDIO_PERMISSIONS.CHAT)) return;
    // Find the user message that prompted this assistant turn — the closest
    // user message before it in time. Resend that text with the active model.
    const idx = messages.findIndex((m) => m.id === assistant.id);
    let lastUser: StudioMessage | undefined;
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUser = messages[i];
        break;
      }
    }
    if (lastUser == null) return;
    const conversation = (conversations ?? []).find((c) => c.id === conversationId);
    if (conversation == null) return;
    void send({
      conversation,
      userText: lastUser.content,
      modelId: modelOverrideId ?? undefined,
      temperature,
      maxTokens,
      providerOptions,
      authorId: user.id,
    });
  }

  // Feature #24: skeleton loader replaces the spinner so layout doesn't shift
  // when messages arrive.
  if (isLoading) {
    return (
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`flex gap-3 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-14 w-full max-w-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-rose-500">
        Failed to load messages{error?.message != null ? `: ${error.message}` : ''}
      </div>
    );
  }

  // Feature #25: empty conversation surface starter chips that prefill the
  // composer — turns an empty pane into an active suggestion.
  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10">
        <EmptyState
          icon="💭"
          title="No messages yet"
          description="Try one of these to see streaming + artifacts in action."
        />
        <div className="mt-4 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
          {STARTER_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => emitComposerDraft(chip.label)}
              className="group flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left text-sm shadow-sm transition hover:border-indigo-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-slate-700 dark:bg-slate-900"
            >
              <span aria-hidden className="text-xl">
                {chip.glyph}
              </span>
              <span className="text-slate-700 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                {chip.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const userInitials = user != null ? initials(user.displayName) : '?';
  const userDisplayName = user?.displayName ?? 'You';

  // Find the last assistant message — only that one shows the regenerate button.
  let lastAssistantId: string | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      lastAssistantId = messages[i].id;
      break;
    }
  }

  const bookmarkCount = bookmarks.length;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Feature #67/#68: in-thread search + bookmark filter toolbar. */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-2 dark:border-slate-800">
        <div className="relative flex-1">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search in conversation…"
            aria-label="Search messages in this conversation"
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        {search.trim() !== '' && (
          <span className="text-[11px] text-slate-400">
            {visibleMessages.length} match{visibleMessages.length === 1 ? '' : 'es'}
          </span>
        )}
        {bookmarkCount > 0 && (
          <button
            type="button"
            onClick={() => setBookmarksOnly((v) => !v)}
            aria-pressed={bookmarksOnly}
            className={`rounded-md border px-2 py-1 text-[11px] font-medium transition ${
              bookmarksOnly
                ? 'border-amber-300 bg-amber-50 text-amber-700'
                : 'border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
          >
            ★ {bookmarkCount}
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        className={`min-h-0 flex-1 overflow-y-auto px-6 py-6 ${
          density === 'compact' ? 'space-y-2 text-[13px]' : 'space-y-4'
        }`}
      >
        {visibleMessages.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No messages match your filters.</p>
        ) : (
          visibleMessages.map((message) => (
            <MessageRow
              key={message.id}
              message={message}
              userInitials={userInitials}
              userDisplayName={userDisplayName}
              isLastAssistant={message.id === lastAssistantId}
              onRegenerate={() => regenerate(message)}
              isBookmarked={bookmarks.includes(message.id)}
              onToggleBookmark={() => toggleBookmark(message.id)}
              feedback={feedback[message.id]}
              onFeedback={(f) => setMessageFeedback(message.id, f)}
              onReply={() => replyTo(message)}
              onEdit={() => editUserMessage(message)}
            />
          ))
        )}
        <div ref={endRef} />
      </div>

      {showJumpBottom && (
        <button
          type="button"
          onClick={jumpToBottom}
          aria-label="Jump to latest message"
          className="absolute bottom-4 right-6 z-10 rounded-full bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-lg hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          ↓ Jump to latest
        </button>
      )}
    </div>
  );
}
