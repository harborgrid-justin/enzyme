import { useEffect, useMemo, useRef } from 'react';
import { useMessages, useDeleteMessage, usePinMessage } from '../api/messages';
import { SafeMessage } from './SafeMessage';

/** Renders a channel's messages from the React Query cache (history + live). */
export function MessageList({ channelId }: { channelId: string }): React.ReactElement {
  const { data, isLoading, isError, error } = useMessages(channelId);
  const deleteMessage = useDeleteMessage(channelId);
  const pinMessage = usePinMessage(channelId);
  const endRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(
    () => [...(data ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [data]
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

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

  return (
    <div className="flex-1 space-y-2 overflow-y-auto p-4">
      {messages.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No messages yet — say hello 👋</p>
      ) : (
        messages.map((message) => (
          <SafeMessage
            key={message.id}
            message={message}
            onDelete={(id) => deleteMessage.mutate({ pathParams: { id } })}
            onPin={pinMessage}
          />
        ))
      )}
      <div ref={endRef} />
    </div>
  );
}
