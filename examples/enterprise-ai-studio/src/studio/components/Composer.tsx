import { auth, monitoring } from '@missionfabric-js/enzyme';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Conversation } from '../types';
import { useChatCompletion } from '../api/completions';
import { useUpdateConversation } from '../api/conversations';
import { useStudioStore } from '../store/studioStore';
import { ModelPicker } from './ModelPicker';
import { STUDIO_PERMISSIONS } from '../users';
import { useHotkey, modKeyLabel } from '../ui/useHotkey';
import { COMPOSER_INPUT_ID } from '../ui/composerInputId';
import { toast } from '../ui/toast';
import { onComposerDraft } from '../ui/composerDraftBus';
import { SlashMenu, filterSlashCommands, type SlashCommand } from './SlashMenu';

interface ComposerProps {
  conversation: Conversation;
}

/**
 * Soft character cap on a single message. We don't reject longer input — the
 * counter just turns amber/red so the user knows they're heading toward the
 * provider's context window. Real provider limits are in the model catalog.
 */
const SOFT_CHAR_LIMIT = 8000;

export function Composer({ conversation }: ComposerProps): React.ReactElement {
  const { user, isAuthenticated, hasPermission } = auth.useAuth();
  const [text, setText] = useState('');
  const { send, abort, isStreaming, error } = useChatCompletion();
  const modelOverrideId = useStudioStore((s) => s.modelOverrideId);
  const temperature = useStudioStore((s) => s.temperature);
  const maxTokens = useStudioStore((s) => s.maxTokens);
  const providerOptions = useStudioStore((s) => s.providerOptions);
  const update = useUpdateConversation();

  const canChat = hasPermission(STUDIO_PERMISSIONS.CHAT);
  const canShare = hasPermission(STUDIO_PERMISSIONS.SHARE);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Feature #12: auto-grow textarea — measure scrollHeight after each change
  // and set height up to a max so paste/long drafts don't require scrolling.
  useEffect(() => {
    const el = textareaRef.current;
    if (el == null) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, 280); // ~12 lines
    el.style.height = `${next}px`;
  }, [text]);

  // Feature #10 (re-bound here too): Esc aborts the active stream.
  useHotkey('esc', () => abort(), { allowInInput: true, enabled: isStreaming });

  // Feature #25: Welcome screen and empty-state chips fill the composer via
  // a custom-event bus so they stay decoupled from this component.
  useEffect(() => {
    return onComposerDraft((draft) => {
      setText(draft);
      requestAnimationFrame(() => textareaRef.current?.focus());
    });
  }, []);

  // --- Feature #14: slash command menu ----------------------------------------
  const [slashIndex, setSlashIndex] = useState(0);
  const slashOpen = text.startsWith('/') && !isStreaming;
  const commands = useSlashCommands({
    conversation,
    canShare,
    onClear: () => setText(''),
    onShareToggle: (willShare) => {
      update.mutate(
        {
          pathParams: { id: conversation.id },
          body: { id: conversation.id, shared: willShare },
        },
        {
          onSuccess: () =>
            toast.success(
              willShare ? 'Conversation shared with workspace' : 'Conversation made private'
            ),
          onError: (err) => toast.error(`Couldn't update sharing: ${err.message}`),
        }
      );
    },
  });
  const filteredCommands = useMemo(
    () => filterSlashCommands(commands, text),
    [commands, text]
  );

  function runSlashCommand(cmd: SlashCommand): void {
    setText('');
    cmd.run();
    setSlashIndex(0);
    textareaRef.current?.focus();
  }

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
      providerOptions,
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

  // Feature #13: character counter coloring escalates as you near the cap.
  const charCount = text.length;
  const approxTokens = Math.ceil(charCount / 4);
  const overSoft = charCount > SOFT_CHAR_LIMIT;
  const nearSoft = !overSoft && charCount > SOFT_CHAR_LIMIT * 0.85;
  const counterColor = overSoft
    ? 'text-rose-600'
    : nearSoft
      ? 'text-amber-600'
      : 'text-slate-400';

  return (
    <div className="relative border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {/* Feature #15: prominent stop banner during streaming. */}
      {isStreaming && (
        <div className="flex items-center justify-between gap-3 border-b border-rose-200 bg-rose-50 px-6 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-rose-500" />
            Streaming response — press{' '}
            <kbd className="rounded border border-rose-300 bg-white px-1 font-mono text-[10px] dark:border-rose-800 dark:bg-rose-900">
              Esc
            </kbd>{' '}
            to stop.
          </span>
          <button
            type="button"
            onClick={abort}
            className="rounded-md bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          >
            ⏹ Stop generating
          </button>
        </div>
      )}

      <div className="flex items-end gap-3 px-6 py-4">
        <div className="relative flex-1">
          <SlashMenu
            open={slashOpen}
            query={text}
            commands={commands}
            activeIndex={slashIndex}
            onHover={setSlashIndex}
            onRun={runSlashCommand}
          />
          <textarea
            ref={textareaRef}
            id={COMPOSER_INPUT_ID}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSlashIndex(0);
            }}
            onKeyDown={(e) => {
              if (slashOpen) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSlashIndex((idx) => Math.min(idx + 1, filteredCommands.length - 1));
                  return;
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSlashIndex((idx) => Math.max(idx - 1, 0));
                  return;
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  const target = filteredCommands[slashIndex];
                  if (target != null) runSlashCommand(target);
                  return;
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setText('');
                  return;
                }
              }
              const isSend = e.key === 'Enter' && !e.shiftKey && !e.altKey;
              if (isSend) {
                e.preventDefault();
                submit();
              }
            }}
            rows={3}
            placeholder={
              isStreaming
                ? 'Streaming response… (Esc to stop)'
                : `Message ${conversation.title} — Enter to send, "/" for commands`
            }
            disabled={isStreaming}
            aria-label="Message composer"
            aria-autocomplete="list"
            aria-expanded={slashOpen}
            aria-controls={slashOpen ? 'composer-slash-menu' : undefined}
            className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-900"
          />
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Shift+Enter for newline · {modKeyLabel()}+Enter to send
            </span>
            <span className={counterColor}>
              {charCount.toLocaleString()} chars · ~{approxTokens.toLocaleString()} tokens
            </span>
          </div>
        </div>

        <div className="flex w-48 shrink-0 flex-col gap-2">
          <ModelPicker conversationModelId={conversation.modelId} compact />
          <button
            type="button"
            onClick={submit}
            disabled={text.trim() === '' || isStreaming}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            Send ↵
          </button>
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

interface UseSlashCommandsArgs {
  conversation: Conversation;
  canShare: boolean;
  onClear: () => void;
  onShareToggle: (willShare: boolean) => void;
}

function useSlashCommands({
  conversation,
  canShare,
  onClear,
  onShareToggle,
}: UseSlashCommandsArgs): SlashCommand[] {
  return useMemo<SlashCommand[]>(() => {
    const list: SlashCommand[] = [
      {
        id: 'clear',
        label: 'Clear composer',
        hint: '/clear',
        description: 'Discard the current draft',
        run: onClear,
      },
    ];
    if (canShare) {
      if (conversation.shared === true) {
        list.push({
          id: 'private',
          label: 'Make conversation private',
          hint: '/private',
          description: 'Remove from the shared workspace',
          run: () => onShareToggle(false),
        });
      } else {
        list.push({
          id: 'share',
          label: 'Share with workspace',
          hint: '/share',
          description: 'Make this conversation visible to other members',
          run: () => onShareToggle(true),
        });
      }
    }
    return list;
  }, [conversation.shared, canShare, onClear, onShareToggle]);
}
