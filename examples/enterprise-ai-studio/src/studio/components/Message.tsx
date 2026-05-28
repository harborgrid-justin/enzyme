import { security } from '@missionfabric-js/enzyme';
import { Fragment } from 'react';
import type { StudioMessage } from '../types';
import { ACCENT_CLASSES, PROVIDERS } from '../providers/catalog';
import { ArtifactChip } from './ArtifactChip';
import { Tooltip } from '../ui/Tooltip';
import { toast } from '../ui/toast';

interface MessageRowProps {
  message: StudioMessage;
  userInitials: string;
  userDisplayName: string;
  /** Renders the regenerate button on the last assistant turn. */
  isLastAssistant?: boolean;
  onRegenerate?: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

const ARTIFACT_TOKEN_RE = /\[Artifact: ([^\]]+)\]/g;

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

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    // Feature #21: toast on copy success so the click feels confirmed.
    toast.success('Copied to clipboard');
  } catch {
    toast.error("Couldn't copy — clipboard permission denied");
  }
}

export function MessageRow({
  message,
  userInitials,
  userDisplayName,
  isLastAssistant,
  onRegenerate,
}: MessageRowProps): React.ReactElement {
  // All message bodies — user OR assistant — are rendered through useSafeText so
  // a model response containing HTML/script tags can't be injected into the DOM.
  const safeContent = security.useSafeText(message.content);
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';

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
            </>
          ) : (
            <span className="font-semibold text-slate-700">You</span>
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
          {segments.map((segment, i) => (
            <Fragment key={i}>{segment}</Fragment>
          ))}
          {message.streaming === true && <CursorBlink />}
        </div>

        {showActions && (
          <div
            className={`mt-1 flex items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 ${
              isAssistant ? '' : 'flex-row-reverse'
            }`}
          >
            {/* Feature #21: copy message to clipboard. */}
            <Tooltip label="Copy message">
              <button
                type="button"
                onClick={() => void copyToClipboard(message.content)}
                aria-label="Copy message to clipboard"
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <span aria-hidden>📋</span>
              </button>
            </Tooltip>
            {/* Feature #22: regenerate the last assistant response. */}
            {isAssistant && isLastAssistant === true && onRegenerate != null && (
              <Tooltip label="Regenerate response">
                <button
                  type="button"
                  onClick={onRegenerate}
                  aria-label="Regenerate the assistant response"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <span aria-hidden>↻</span>
                </button>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </div>
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
