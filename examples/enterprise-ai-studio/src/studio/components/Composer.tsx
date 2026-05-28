import { auth, monitoring } from '@missionfabric-js/enzyme';
import { useState } from 'react';
import type { Conversation } from '../types';
import { useChatCompletion } from '../api/completions';
import { useStudioStore } from '../store/studioStore';
import { ModelPicker } from './ModelPicker';
import { STUDIO_PERMISSIONS } from '../users';

interface ComposerProps {
  conversation: Conversation;
}

export function Composer({ conversation }: ComposerProps): React.ReactElement {
  const { user, isAuthenticated, hasPermission } = auth.useAuth();
  const [text, setText] = useState('');
  const { send, abort, isStreaming, error } = useChatCompletion();
  const modelOverrideId = useStudioStore((s) => s.modelOverrideId);
  const temperature = useStudioStore((s) => s.temperature);
  const maxTokens = useStudioStore((s) => s.maxTokens);

  const canChat = hasPermission(STUDIO_PERMISSIONS.CHAT);

  function submit(): void {
    const trimmed = text.trim();
    if (user == null || !canChat || trimmed === '' || isStreaming) return;
    monitoring.addBreadcrumb('studio', 'turn submitted', {
      conversationId: conversation.id,
      modelId: modelOverrideId ?? conversation.modelId,
    });
    void send({
      conversation,
      userText: trimmed,
      modelId: modelOverrideId ?? undefined,
      temperature,
      maxTokens,
      authorId: user.id,
    });
    setText('');
  }

  if (!isAuthenticated) {
    return (
      <div className="border-t border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
        Sign in (top right) to send a message.
      </div>
    );
  }

  if (!canChat) {
    return (
      <div className="border-t border-slate-200 bg-amber-50 p-4 text-center text-sm text-amber-700">
        🔒 Your role is read-only — you don&apos;t have the <code>ai:chat</code> permission.
      </div>
    );
  }

  return (
    <div className="border-t border-slate-200 bg-white">
      <div className="flex items-end gap-3 px-6 py-4">
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={3}
            placeholder={
              isStreaming
                ? 'Streaming response…'
                : `Message ${conversation.title} — Enter to send`
            }
            disabled={isStreaming}
            className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-slate-50"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Shift+Enter for newline. Try <code>&lt;script&gt;alert(1)&lt;/script&gt;</code> —
            it renders as inert text.
          </p>
        </div>
        <div className="flex w-48 shrink-0 flex-col gap-2">
          <ModelPicker conversationModelId={conversation.modelId} compact />
          {isStreaming ? (
            <button
              type="button"
              onClick={abort}
              className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              ⏹ Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={text.trim() === ''}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Send ↵
            </button>
          )}
        </div>
      </div>
      {error && (
        <div className="border-t border-rose-100 bg-rose-50 px-6 py-2 text-xs text-rose-700">
          ⚠ {error.message}
        </div>
      )}
    </div>
  );
}
