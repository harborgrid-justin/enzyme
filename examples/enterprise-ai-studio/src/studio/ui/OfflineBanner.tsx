/**
 * Network status banner — shows a fixed bar when `navigator.onLine === false`.
 * Reflects a real concern for an AI workspace: streaming completions fail
 * silently when the SSE connection drops, so making the offline state explicit
 * prevents users from staring at a frozen typing indicator.
 */
import { hooks } from '@missionfabric-js/enzyme';

export function OfflineBanner(): React.ReactElement | null {
  // enzyme's `useOnlineStatus` wraps the framework's network monitor (SSR-safe,
  // shared across the app) instead of hand-binding window online/offline events.
  const online = hooks.useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-1.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200"
    >
      <span aria-hidden>⚡</span>
      You&apos;re offline — new messages won&apos;t send and streaming responses are
      paused until the connection returns.
    </div>
  );
}
