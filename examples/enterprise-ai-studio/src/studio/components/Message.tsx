import { hooks, security } from '@missionfabric-js/enzyme';
import { Fragment, useEffect, useMemo, useState } from 'react';
import type { StudioMessage } from '../types';
import { ACCENT_CLASSES, PROVIDERS, costFor } from '../providers/catalog';
import { ArtifactChip } from './ArtifactChip';
import { Tooltip } from '../ui/Tooltip';
import { toast } from '../ui/toast';
import type { Feedback } from '../ui/messageMeta';

interface MessageRowProps {
  message: StudioMessage;
  userInitials: string;
  userDisplayName: string;
  /** Renders the regenerate button on the last assistant turn. */
  isLastAssistant?: boolean;
  onRegenerate?: () => void;
  /** Feature #68: bookmark state + toggle. */
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  /** Feature #71: thumbs feedback. */
  feedback?: Feedback;
  onFeedback?: (value: Feedback) => void;
  /** Feature #63: quote this message into the composer. */
  onReply?: () => void;
  /** Feature #72: load a user prompt back into the composer to re-ask. */
  onEdit?: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

const ARTIFACT_TOKEN_RE = /\[Artifact: ([^\]]+)\]/g;

/** Feature #45: messages longer than this collapse behind a "Show more" toggle. */
const COLLAPSE_CHAR_THRESHOLD = 1200;

/** Feature #46: rough word count for the per-message meta line. */
function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

/** Feature #70: extract fenced code blocks from message text. */
function extractCodeBlocks(text: string): string[] {
  const blocks: string[] = [];
  const re = /```[\w-]*\n?([\s\S]*?)```/g;
  let match: RegExpExecArray | null = re.exec(text);
  while (match != null) {
    const body = (match[1] ?? '').trim();
    if (body !== '') blocks.push(body);
    match = re.exec(text);
  }
  return blocks;
}

/**
 * Splits the assistant text on `[Artifact: …]` placeholders the artifact
 * parser leaves behind, interleaving inline chips that open the right-pane
 * preview. Text segments still flow through `useSafeText` so model-emitted
 * markup can't reach the DOM.
 */
function renderWithArtifactChips(text: string, conversationId: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  ARTIFACT_TOKEN_RE.lastIndex = 0;
  match = ARTIFACT_TOKEN_RE.exec(text);
  while (match != null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <ArtifactChip
        key={`chip-${match.index}`}
        conversationId={conversationId}
        title={match[1]}
      />
    );
    lastIndex = match.index + match[0].length;
    match = ARTIFACT_TOKEN_RE.exec(text);
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

export function MessageRow({
  message,
  userInitials,
  userDisplayName,
  isLastAssistant,
  onRegenerate,
  isBookmarked,
  onToggleBookmark,
  feedback,
  onFeedback,
  onReply,
  onEdit,
}: MessageRowProps): React.ReactElement {
  // All message bodies — user OR assistant — are rendered through useSafeText so
  // a model response containing HTML/script tags can't be injected into the DOM.
  const safeContent = security.useSafeText(message.content);
  // Feature #21: copy via enzyme's `useCopyToClipboard` (Clipboard API with a
  // legacy execCommand fallback); toast confirms success/failure.
  const [, copy] = hooks.useCopyToClipboard();
  async function copyToClipboard(text: string): Promise<void> {
    const ok = await copy(text);
    if (ok) {
      toast.success('Copied to clipboard');
    } else {
      toast.error("Couldn't copy — clipboard permission denied");
    }
  }
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';
  // Feature #45: collapse very long messages until the reader expands them.
  const [expanded, setExpanded] = useState(false);
  const collapsible =
    message.streaming !== true && message.content.length > COLLAPSE_CHAR_THRESHOLD;
  const isCollapsed = collapsible && !expanded;
  // Feature #46/#47: per-message word count + assistant turn cost.
  const wordCount = countWords(message.content);
  const turnCost =
    isAssistant && message.usage != null && message.model != null
      ? costFor(message.model.id, message.usage)
      : null;
  // Feature #69: read-aloud via the Web Speech API.
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  function toggleSpeak(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Text-to-speech is not available in this browser');
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(message.content);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }
  // Feature #70: copy code blocks found in the message.
  const codeBlocks = useMemo(() => extractCodeBlocks(message.content), [message.content]);

  if (isSystem) {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] text-slate-600">
          {safeContent}
        </span>
      </div>
    );
  }

  const segments = isAssistant
    ? renderWithArtifactChips(safeContent, message.conversationId)
    : [safeContent];

  const providerId = message.model?.provider;
  const provider = providerId != null ? PROVIDERS[providerId] : null;
  const classes =
    provider != null
      ? (ACCENT_CLASSES[provider.accent] ?? ACCENT_CLASSES.indigo)
      : ACCENT_CLASSES.indigo;

  const avatarLabel = isAssistant
    ? `Response from ${message.model?.label ?? provider?.label ?? 'Assistant'}`
    : `You — ${userDisplayName}`;
  const showActions = !isSystem && message.streaming !== true;

  return (
    <div className={`group flex gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}>
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          isAssistant ? classes.chip : 'bg-indigo-100 text-indigo-700'
        }`}
        aria-label={avatarLabel}
        title={avatarLabel}
      >
        {isAssistant ? provider?.glyph ?? '✳' : userInitials}
      </span>
      <div className={`min-w-0 flex-1 ${isAssistant ? '' : 'flex flex-col items-end'}`}>
        <div className="mb-1 flex items-center gap-2 text-[11px] text-slate-500">
          {isAssistant ? (
            <>
              <span className="font-semibold text-slate-700">
                {message.model?.label ?? 'Assistant'}
              </span>
              {message.usage && (
                <span>
                  · {message.usage.inputTokens.toLocaleString()} in /{' '}
                  {message.usage.outputTokens.toLocaleString()} out
                </span>
              )}
              {/* Feature #47: per-turn cost from the model's pricing. */}
              {turnCost != null && (
                <span title="Estimated cost for this turn">· ${turnCost.toFixed(4)}</span>
              )}
            </>
          ) : (
            <span className="font-semibold text-slate-700">You</span>
          )}
          {/* Feature #46: word count for the message. */}
          {message.streaming !== true && wordCount > 0 && (
            <span title={`${message.content.length.toLocaleString()} characters`}>
              · {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
            </span>
          )}
          {/* Feature #23: full date on hover, short time inline. */}
          <Tooltip label={formatFullDate(message.createdAt)}>
            <span tabIndex={0} className="cursor-default focus:outline-none">
              {formatTime(message.createdAt)}
            </span>
          </Tooltip>
        </div>
        <div
          className={`studio-prose max-w-full rounded-lg px-3 py-2 text-sm leading-relaxed shadow-sm ${
            isAssistant
              ? `${classes.bg} text-slate-800 ring-1 ${classes.ring}`
              : 'bg-indigo-600 text-white'
          }`}
        >
          <div className={isCollapsed ? 'max-h-60 overflow-hidden' : ''}>
            {segments.map((segment, i) => (
              <Fragment key={i}>{segment}</Fragment>
            ))}
            {message.streaming === true && <CursorBlink />}
          </div>
          {collapsible && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className={`mt-1 text-[11px] font-medium underline-offset-2 hover:underline focus:outline-none ${
                isAssistant ? 'text-indigo-600' : 'text-indigo-100'
              }`}
              aria-expanded={expanded}
            >
              {expanded ? 'Show less ▲' : 'Show more ▼'}
            </button>
          )}
        </div>

        {showActions && (
          <div
            className={`mt-1 flex items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 ${
              isAssistant ? '' : 'flex-row-reverse'
            }`}
          >
            {/* Feature #21: copy message to clipboard. */}
            <ActionIcon label="Copy message" icon="📋" onClick={() => void copyToClipboard(message.content)} />
            {/* Feature #70: copy code blocks. */}
            {codeBlocks.length > 0 && (
              <ActionIcon
                label={`Copy code (${codeBlocks.length})`}
                icon="⟨⟩"
                onClick={() => void copyToClipboard(codeBlocks.join('\n\n'))}
              />
            )}
            {/* Feature #63: quote-reply. */}
            {onReply != null && <ActionIcon label="Quote reply" icon="↩" onClick={onReply} />}
            {/* Feature #68: bookmark. */}
            {onToggleBookmark != null && (
              <ActionIcon
                label={isBookmarked === true ? 'Remove bookmark' : 'Bookmark message'}
                icon={isBookmarked === true ? '★' : '☆'}
                active={isBookmarked === true}
                onClick={onToggleBookmark}
              />
            )}
            {/* Feature #72: edit a user prompt (re-ask). */}
            {!isAssistant && onEdit != null && (
              <ActionIcon label="Edit & re-ask" icon="✎" onClick={onEdit} />
            )}
            {/* Feature #69: read aloud (assistant turns). */}
            {isAssistant && (
              <ActionIcon
                label={speaking ? 'Stop reading' : 'Read aloud'}
                icon={speaking ? '⏹' : '🔊'}
                active={speaking}
                onClick={toggleSpeak}
              />
            )}
            {/* Feature #71: thumbs feedback (assistant turns). */}
            {isAssistant && onFeedback != null && (
              <>
                <ActionIcon
                  label="Good response"
                  icon="👍"
                  active={feedback === 'up'}
                  onClick={() => onFeedback('up')}
                />
                <ActionIcon
                  label="Bad response"
                  icon="👎"
                  active={feedback === 'down'}
                  onClick={() => onFeedback('down')}
                />
              </>
            )}
            {/* Feature #22: regenerate the last assistant response. */}
            {isAssistant && isLastAssistant === true && onRegenerate != null && (
              <ActionIcon label="Regenerate response" icon="↻" onClick={onRegenerate} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ActionIconProps {
  label: string;
  icon: string;
  onClick: () => void;
  active?: boolean;
}

/** A small icon button used in the per-message action row. */
function ActionIcon({ label, icon, onClick, active }: ActionIconProps): React.ReactElement {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={active === true}
        className={`rounded p-1 font-mono text-xs leading-none transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
          active === true
            ? 'text-indigo-600'
            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <span aria-hidden>{icon}</span>
      </button>
    </Tooltip>
  );
}

function CursorBlink(): React.ReactElement {
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-slate-500 motion-reduce:animate-none"
    />
  );
}
