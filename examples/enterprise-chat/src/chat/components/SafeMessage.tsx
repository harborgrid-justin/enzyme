import { auth, security } from '@missionfabric-js/enzyme';
import type { ChatMessage } from '../types';
import { CHAT_PERMISSIONS } from '../users';

interface SafeMessageProps {
  message: ChatMessage;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
}

const KIND_STYLES: Record<ChatMessage['kind'], string> = {
  user: 'bg-white border-slate-200',
  bot: 'bg-sky-50 border-sky-200',
  system: 'bg-amber-50 border-amber-200',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** A single message. Body text is sanitized with enzyme's `useSafeText`. */
export function SafeMessage({ message, onDelete, onPin }: SafeMessageProps): React.ReactElement {
  const { hasPermission } = auth.useAuth();
  // Never render user-authored text raw — strip any HTML/script first.
  const safeText = security.useSafeText(message.text);

  const canDelete = hasPermission(CHAT_PERMISSIONS.DELETE);
  const canPin = hasPermission(CHAT_PERMISSIONS.PIN);
  const isPending = message.pending === true;

  return (
    <div
      className={`group flex gap-3 rounded-lg border p-3 ${KIND_STYLES[message.kind]} ${
        isPending ? 'opacity-60' : ''
      }`}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
        {message.authorInitials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">{message.authorName}</span>
          <span className="text-[11px] text-slate-400">{formatTime(message.createdAt)}</span>
          {message.pinned === true && (
            <span className="rounded bg-yellow-100 px-1.5 text-[10px] font-medium text-yellow-700">
              📌 pinned
            </span>
          )}
          {isPending && <span className="text-[11px] text-slate-400">sending…</span>}
        </div>
        <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{safeText}</p>
      </div>

      {(canPin || canDelete) && !isPending && (
        <div className="flex shrink-0 items-start gap-1 opacity-0 transition group-hover:opacity-100">
          {canPin && (
            <button
              type="button"
              onClick={() => onPin(message.id)}
              className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
              title="Pin message"
            >
              📌
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(message.id)}
              className="rounded px-1.5 py-0.5 text-xs text-rose-500 hover:bg-rose-50"
              title="Delete message"
            >
              🗑
            </button>
          )}
        </div>
      )}
    </div>
  );
}
