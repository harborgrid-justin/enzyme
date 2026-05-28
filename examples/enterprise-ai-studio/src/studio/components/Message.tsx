import { security } from '@missionfabric-js/enzyme';
import type { StudioMessage } from '../types';
import { ACCENT_CLASSES, PROVIDERS } from '../providers/catalog';

interface MessageRowProps {
  message: StudioMessage;
  userInitials: string;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageRow({ message, userInitials }: MessageRowProps): React.ReactElement {
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

  const providerId = message.model?.provider;
  const provider = providerId != null ? PROVIDERS[providerId] : null;
  const classes =
    provider != null
      ? (ACCENT_CLASSES[provider.accent] ?? ACCENT_CLASSES.indigo)
      : ACCENT_CLASSES.indigo;

  return (
    <div className={`flex gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}>
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          isAssistant ? classes.chip : 'bg-indigo-100 text-indigo-700'
        }`}
        title={isAssistant ? provider?.label ?? 'Assistant' : 'You'}
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
          <span>{formatTime(message.createdAt)}</span>
        </div>
        <div
          className={`studio-prose max-w-full rounded-lg px-3 py-2 text-sm leading-relaxed shadow-sm ${
            isAssistant
              ? `${classes.bg} text-slate-800 ring-1 ${classes.ring}`
              : 'bg-indigo-600 text-white'
          }`}
        >
          {safeContent}
          {message.streaming === true && <CursorBlink />}
        </div>
      </div>
    </div>
  );
}

function CursorBlink(): React.ReactElement {
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-slate-500"
    />
  );
}
