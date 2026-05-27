import { useState } from 'react';
import { auth, monitoring } from '@missionfabric-js/enzyme';
import { useSendMessage } from '../api/messages';
import { CHAT_PERMISSIONS, initials } from '../users';
import type { ChatMessage } from '../types';

interface MessageComposerProps {
  channelId: string;
  /** Relay the sent message to other tabs over the realtime socket. */
  onBroadcast: (message: ChatMessage) => void;
}

export function MessageComposer({ channelId, onBroadcast }: MessageComposerProps): React.ReactElement {
  const { user, isAuthenticated, hasPermission } = auth.useAuth();
  const [text, setText] = useState('');

  const canSend = hasPermission(CHAT_PERMISSIONS.SEND);
  const send = useSendMessage(channelId, {
    onSent: (message) => {
      onBroadcast(message);
      monitoring.addBreadcrumb('chat', 'message sent', { channelId, id: message.id });
    },
  });

  function submit(): void {
    const trimmed = text.trim();
    if (user == null || !canSend || trimmed === '') return;
    send.mutate({
      body: {
        text: trimmed,
        authorId: user.id,
        authorName: user.displayName,
        authorInitials: initials(user.displayName),
      },
    });
    setText('');
  }

  if (!isAuthenticated) {
    return (
      <div className="border-t border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
        Sign in (top right) to join the conversation.
      </div>
    );
  }

  if (!canSend) {
    return (
      <div className="border-t border-slate-200 bg-amber-50 p-4 text-center text-sm text-amber-700">
        🔒 Your role is read-only — you don&apos;t have the <code>message:send</code> permission.
      </div>
    );
  }

  return (
    <div className="border-t border-slate-200 bg-white p-3">
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          placeholder={`Message #${channelId}`}
          className="flex-1 resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <button
          type="button"
          onClick={submit}
          disabled={text.trim() === '' || send.isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {send.isPending ? 'Sending…' : 'Send'}
        </button>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">
        Enter to send · Shift+Enter for a new line · try typing{' '}
        <code>&lt;script&gt;alert(1)&lt;/script&gt;</code> to see sanitization
      </p>
    </div>
  );
}
