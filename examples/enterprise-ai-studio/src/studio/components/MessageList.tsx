import { auth } from '@missionfabric-js/enzyme';
import { useEffect, useMemo, useRef } from 'react';
import { useConversationMessages } from '../api/conversations';
import { initials } from '../users';
import { MessageRow } from './Message';

interface MessageListProps {
  conversationId: string;
}

/** Renders a conversation's messages from the React Query cache. */
export function MessageList({ conversationId }: MessageListProps): React.ReactElement {
  const { user } = auth.useAuth();
  const { data, isLoading, isError, error } = useConversationMessages(conversationId);
  const endRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(
    () => [...(data ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [data]
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Re-trigger on streaming updates too — the last message's content changes.
  }, [messages.length, messages[messages.length - 1]?.content]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
        Loading history…
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

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-slate-400">
        <div>
          <p className="mb-2 text-base">Empty conversation</p>
          <p>Send a message below — it will be answered by the model in the picker.</p>
        </div>
      </div>
    );
  }

  const userInitials = user != null ? initials(user.displayName) : '?';

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-6">
      {messages.map((message) => (
        <MessageRow key={message.id} message={message} userInitials={userInitials} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
