import { auth, monitoring } from '@missionfabric-js/enzyme';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Conversation } from '../types';
import { useChatCompletion } from '../api/completions';
import { useUpdateConversation, useConversationMessages } from '../api/conversations';
import { useStudioStore } from '../store/studioStore';
import { ModelPicker } from './ModelPicker';
import { STUDIO_PERMISSIONS } from '../users';
import { useHotkey } from '../ui/useHotkey';
import { COMPOSER_INPUT_ID } from '../ui/composerInputId';
import { toast } from '../ui/toast';
import { onComposerDraft, onComposerQuote } from '../ui/composerDraftBus';
import { loadDraft, saveDraft, clearDraft } from '../ui/composerDrafts';
import { loadSnippets, saveSnippets, type PromptSnippet } from '../ui/promptSnippets';
import { exportConversationMarkdown } from '../utils/exportConversation';
import { modelOrDefault } from '../providers/catalog';
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
  const [text, setText] = useState(() => loadDraft(conversation.id));
  const { send, abort, isStreaming, error } = useChatCompletion();
  const modelOverrideId = useStudioStore((s) => s.modelOverrideId);
  const temperature = useStudioStore((s) => s.temperature);
  const maxTokens = useStudioStore((s) => s.maxTokens);
  const providerOptions = useStudioStore((s) => s.providerOptions);
  const setTemperature = useStudioStore((s) => s.setTemperature);
  const enterToSend = useStudioStore((s) => s.enterToSend);
  const toggleEnterToSend = useStudioStore((s) => s.toggleEnterToSend);
  const update = useUpdateConversation();

  // Feature #62: prompt-snippet library + popover.
  const [snippets, setSnippets] = useState<PromptSnippet[]>(() => loadSnippets());
  const [snippetsOpen, setSnippetsOpen] = useState(false);
  // Feature #65: expand the composer to a taller editor.
  const [expanded, setExpanded] = useState(false);

  // Feature #35/#39: history recall + /export + /retry read the message history.
  const { data: messagesData } = useConversationMessages(conversation.id);
  const messages = useMemo(
    () => [...(messagesData ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messagesData]
  );
  const sentHistory = useMemo(
    () => messages.filter((m) => m.role === 'user').map((m) => m.content),
    [messages]
  );
  /** Index into `sentHistory` while recalling with ArrowUp/Down (null = live draft). */
  const historyIndexRef = useRef<number | null>(null);

  const canChat = hasPermission(STUDIO_PERMISSIONS.CHAT);
  const canShare = hasPermission(STUDIO_PERMISSIONS.SHARE);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Feature #33: restore the saved draft when switching conversations.
  useEffect(() => {
    setText(loadDraft(conversation.id));
    historyIndexRef.current = null;
  }, [conversation.id]);

  /** Update composer text and persist it as this conversation's draft. */
  function updateText(next: string): void {
    setText(next);
    saveDraft(conversation.id, next);
  }

  // Feature #12: auto-grow textarea — measure scrollHeight after each change
  // and set height up to a max so paste/long drafts don't require scrolling.
  useEffect(() => {
    const el = textareaRef.current;
    if (el == null) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, expanded ? 600 : 280); // ~12 lines, or tall when expanded
    el.style.height = `${next}px`;
  }, [text, expanded]);

  // Feature #61: context-window usage from the thread + draft vs the model cap.
  const activeModel = modelOrDefault(modelOverrideId ?? conversation.modelId);
  const contextUsage = useMemo(() => {
    const threadChars =
      conversation.systemPrompt.length +
      messages.reduce((acc, m) => acc + m.content.length, 0) +
      text.length;
    const usedTokens = Math.ceil(threadChars / 4);
    const pct = Math.min(100, (usedTokens / activeModel.contextWindow) * 100);
    return { usedTokens, pct };
  }, [conversation.systemPrompt, messages, text, activeModel.contextWindow]);

  // Feature #63: quote-reply appends a Markdown blockquote to the draft.
  useEffect(() => {
    return onComposerQuote((quoted) => {
      const block = quoted
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
      setText((prev) => {
        const next = `${prev.trim() === '' ? '' : `${prev}\n\n`}${block}\n\n`;
        saveDraft(conversation.id, next);
        return next;
      });
      requestAnimationFrame(() => textareaRef.current?.focus());
    });
  }, [conversation.id]);

  function insertSnippet(snippet: PromptSnippet): void {
    const next = text.trim() === '' ? snippet.text : `${text}\n${snippet.text}`;
    updateText(next);
    setSnippetsOpen(false);
    textareaRef.current?.focus();
  }

  function saveDraftAsSnippet(): void {
    const body = text.trim();
    if (body === '') {
      toast.info('Type something first to save it as a snippet');
      return;
    }
    const snippet: PromptSnippet = {
      id: `s-${Date.now().toString(36)}`,
      label: body.slice(0, 24) + (body.length > 24 ? '…' : ''),
      text: body,
    };
    const next = [snippet, ...snippets];
    setSnippets(next);
    saveSnippets(next);
    toast.success('Saved snippet');
  }

  function deleteSnippet(id: string): void {
    const next = snippets.filter((s) => s.id !== id);
    setSnippets(next);
    saveSnippets(next);
  }

  // Feature #10 (re-bound here too): Esc aborts the active stream.
  useHotkey('esc', () => abort(), { allowInInput: true, enabled: isStreaming });

  // Feature #25: Welcome screen and empty-state chips fill the composer via
  // a custom-event bus so they stay decoupled from this component.
  useEffect(() => {
    return onComposerDraft((draft) => {
      setText(draft);
      saveDraft(conversation.id, draft);
      requestAnimationFrame(() => textareaRef.current?.focus());
    });
  }, [conversation.id]);

  // --- Shared command actions (slash menu + typed commands) -------------------
  function shareToggle(willShare: boolean): void {
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
  }

  // Feature #36: regenerate a fresh response from the most recent user turn.
  function doRetry(): void {
    if (user == null || !canChat || isStreaming) return;
    const lastUser = sentHistory[sentHistory.length - 1];
    if (lastUser == null) {
      toast.info('Nothing to retry yet — send a message first');
      return;
    }
    void send({
      conversation,
      userText: lastUser,
      modelId: modelOverrideId ?? undefined,
      temperature,
      maxTokens,
      providerOptions,
      authorId: user.id,
    });
  }

  // Feature #39: export the current conversation as a Markdown transcript.
  function doExport(): void {
    exportConversationMarkdown(conversation, messages);
    toast.success('Exported conversation as Markdown');
  }

  // Feature #37: rename the conversation from a typed `/title …` command.
  function doRename(title: string): void {
    const next = title.trim();
    if (next === '' || next === conversation.title) return;
    update.mutate(
      {
        pathParams: { id: conversation.id },
        body: { id: conversation.id, title: next },
      },
      {
        onSuccess: () => toast.success('Conversation renamed'),
        onError: (err) => toast.error(`Rename failed: ${err.message}`),
      }
    );
  }

  function finishCommand(): void {
    setText('');
    clearDraft(conversation.id);
    setSlashIndex(0);
    historyIndexRef.current = null;
    textareaRef.current?.focus();
  }

  /**
   * Feature #36–#39: execute a fully-typed slash command (with optional args).
   * Returns true if the input was consumed as a command. Commands that need an
   * argument (`/title`, `/temp`) return false when no arg is present so the
   * menu's prefill entry can take over instead.
   */
  function runTypedCommand(raw: string): boolean {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('/')) return false;
    const [rawCmd, ...rest] = trimmed.slice(1).split(/\s+/);
    const cmd = (rawCmd ?? '').toLowerCase();
    const arg = rest.join(' ').trim();
    switch (cmd) {
      case 'clear':
        finishCommand();
        return true;
      case 'retry':
        doRetry();
        finishCommand();
        return true;
      case 'export':
        doExport();
        finishCommand();
        return true;
      case 'temp': {
        const n = Number(arg);
        if (arg === '' || !Number.isFinite(n)) {
          toast.info('Usage: /temp 0.0–2.0');
          return false;
        }
        setTemperature(n);
        toast.success(`Temperature set to ${Math.min(2, Math.max(0, n)).toFixed(1)}`);
        finishCommand();
        return true;
      }
      case 'title':
        if (arg === '') return false;
        doRename(arg);
        finishCommand();
        return true;
      case 'system': {
        if (arg === '') return false;
        update.mutate(
          { pathParams: { id: conversation.id }, body: { id: conversation.id, systemPrompt: arg } },
          {
            onSuccess: () => toast.success('System prompt updated'),
            onError: (err) => toast.error(`Couldn't update system prompt: ${err.message}`),
          }
        );
        finishCommand();
        return true;
      }
      case 'share':
        if (!canShare) return false;
        shareToggle(true);
        finishCommand();
        return true;
      case 'private':
        if (!canShare) return false;
        shareToggle(false);
        finishCommand();
        return true;
      default:
        return false;
    }
  }

  // --- Feature #14: slash command menu ----------------------------------------
  const [slashIndex, setSlashIndex] = useState(0);
  const slashOpen = text.startsWith('/') && !isStreaming;
  const commands = useSlashCommands({
    conversation,
    canShare,
    hasMessages: messages.length > 0,
    onClear: finishCommand,
    onRetry: () => {
      doRetry();
      finishCommand();
    },
    onExport: () => {
      doExport();
      finishCommand();
    },
    onPrefill: (value) => {
      updateText(value);
      textareaRef.current?.focus();
    },
    onShareToggle: shareToggle,
  });
  const filteredCommands = useMemo(
    () => filterSlashCommands(commands, text),
    [commands, text]
  );

  function runSlashCommand(cmd: SlashCommand): void {
    cmd.run();
    setSlashIndex(0);
  }

  function submit(): void {
    const trimmed = text.trim();
    if (user == null || !canChat || trimmed === '' || isStreaming) return;
    // A typed slash command (e.g. "/temp 0.3") runs instead of sending.
    if (runTypedCommand(trimmed)) return;
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
    // Feature #76: auto-title an untitled conversation from its first prompt.
    if (conversation.title === 'New conversation' && sentHistory.length === 0) {
      const derived = trimmed.replace(/\s+/g, ' ').slice(0, 48).trim();
      if (derived !== '') {
        update.mutate({
          pathParams: { id: conversation.id },
          body: { id: conversation.id, title: derived },
        });
      }
    }
    setText('');
    clearDraft(conversation.id);
    historyIndexRef.current = null;
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
              updateText(e.target.value);
              historyIndexRef.current = null;
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
                  // A fully-typed command (with args) executes directly;
                  // otherwise run the highlighted menu entry.
                  if (runTypedCommand(text)) return;
                  const target = filteredCommands[slashIndex];
                  if (target != null) runSlashCommand(target);
                  return;
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  updateText('');
                  return;
                }
              }
              // Feature #35: recall previously sent messages with ArrowUp/Down
              // (shell-style) when the caret is at the very start of the input.
              const atStart =
                e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === 0;
              if (e.key === 'ArrowUp' && !slashOpen && atStart && sentHistory.length > 0) {
                e.preventDefault();
                const current = historyIndexRef.current;
                const nextIndex = current == null ? sentHistory.length - 1 : Math.max(0, current - 1);
                historyIndexRef.current = nextIndex;
                updateText(sentHistory[nextIndex] ?? '');
                return;
              }
              if (e.key === 'ArrowDown' && !slashOpen && historyIndexRef.current != null) {
                e.preventDefault();
                const next = historyIndexRef.current + 1;
                if (next >= sentHistory.length) {
                  historyIndexRef.current = null;
                  updateText('');
                } else {
                  historyIndexRef.current = next;
                  updateText(sentHistory[next] ?? '');
                }
                return;
              }
              // Feature #66: honor the Enter-to-send preference.
              const isSend = e.key === 'Enter' && !e.shiftKey && !e.altKey && enterToSend;
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
          {/* Feature #61: context-window usage bar. */}
          <div
            className="mt-1.5"
            title={`~${contextUsage.usedTokens.toLocaleString()} of ${activeModel.contextWindow.toLocaleString()} context tokens`}
          >
            <div className="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full ${
                  contextUsage.pct > 90
                    ? 'bg-rose-500'
                    : contextUsage.pct > 70
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${contextUsage.pct}%` }}
              />
            </div>
          </div>

          <div className="relative mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              {/* Feature #62: snippets. */}
              <button
                type="button"
                onClick={() => setSnippetsOpen((v) => !v)}
                aria-expanded={snippetsOpen}
                className="rounded px-1.5 py-0.5 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                ✂ Snippets
              </button>
              {/* Feature #65: expand editor. */}
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="rounded px-1.5 py-0.5 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                {expanded ? '⤡ Collapse' : '⤢ Expand'}
              </button>
              {/* Feature #66: Enter-to-send preference. */}
              <label className="flex cursor-pointer items-center gap-1">
                <input
                  type="checkbox"
                  checked={enterToSend}
                  onChange={toggleEnterToSend}
                  className="h-3 w-3 accent-indigo-600"
                />
                Enter sends
              </label>
            </div>
            <span className={counterColor}>
              {charCount.toLocaleString()} chars · ~{approxTokens.toLocaleString()} tokens ·{' '}
              {Math.round(contextUsage.pct)}% ctx
            </span>

            {snippetsOpen && (
              <div className="absolute bottom-full left-0 z-20 mb-2 w-72 rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Snippets
                  </span>
                  <button
                    type="button"
                    onClick={saveDraftAsSnippet}
                    className="text-[11px] text-indigo-600 hover:underline"
                  >
                    + Save draft
                  </button>
                </div>
                <ul className="max-h-60 overflow-y-auto">
                  {snippets.length === 0 && (
                    <li className="px-2 py-2 text-[11px] text-slate-400">No snippets yet.</li>
                  )}
                  {snippets.map((s) => (
                    <li
                      key={s.id}
                      className="group flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <button
                        type="button"
                        onClick={() => insertSnippet(s)}
                        className="min-w-0 flex-1 truncate text-left text-xs text-slate-700 dark:text-slate-200"
                        title={s.text}
                      >
                        {s.label}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSnippet(s.id)}
                        aria-label={`Delete snippet ${s.label}`}
                        className="rounded p-0.5 text-slate-300 opacity-0 transition hover:text-rose-500 group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
  hasMessages: boolean;
  onClear: () => void;
  onRetry: () => void;
  onExport: () => void;
  onPrefill: (value: string) => void;
  onShareToggle: (willShare: boolean) => void;
}

function useSlashCommands({
  conversation,
  canShare,
  hasMessages,
  onClear,
  onRetry,
  onExport,
  onPrefill,
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
      {
        id: 'title',
        label: 'Rename conversation',
        hint: '/title …',
        description: 'Set a new title (type it after the command)',
        run: () => onPrefill('/title '),
      },
      {
        id: 'temp',
        label: 'Set temperature',
        hint: '/temp …',
        description: 'Adjust sampling temperature, 0.0–2.0',
        run: () => onPrefill('/temp '),
      },
      {
        id: 'system',
        label: 'Set system prompt',
        hint: '/system …',
        description: 'Replace the conversation system prompt',
        run: () => onPrefill('/system '),
      },
    ];
    // Feature #36/#39: retry + export only make sense once there's history.
    if (hasMessages) {
      list.push(
        {
          id: 'retry',
          label: 'Regenerate last response',
          hint: '/retry',
          description: 'Re-run the most recent prompt with the active model',
          run: onRetry,
        },
        {
          id: 'export',
          label: 'Export as Markdown',
          hint: '/export',
          description: 'Download the full transcript as a .md file',
          run: onExport,
        }
      );
    }
    if (canShare) {
      if (conversation.shared === true) {
        list.push({
          id: 'private',
          label: 'Make conversation private',
          hint: '/private',
          description: 'Remove from the shared workspace',
          run: () => {
            onShareToggle(false);
            onClear();
          },
        });
      } else {
        list.push({
          id: 'share',
          label: 'Share with workspace',
          hint: '/share',
          description: 'Make this conversation visible to other members',
          run: () => {
            onShareToggle(true);
            onClear();
          },
        });
      }
    }
    return list;
  }, [conversation.shared, canShare, hasMessages, onClear, onRetry, onExport, onPrefill, onShareToggle]);
}
