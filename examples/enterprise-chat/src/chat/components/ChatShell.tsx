import { monitoring, state } from '@missionfabric-js/enzyme';
import { useChatStore } from '../store/chatStore';
import { useChatStream } from '../transport/useChatStream';
import { CHANNELS } from '../mocks/seed';
import { ChannelSidebar } from './ChannelSidebar';
import { MessageList } from './MessageList';
import { MessageComposer } from './MessageComposer';
import { PresencePanel } from './PresencePanel';
import { BetaPanel } from './BetaPanel';
import { MetricsPanel } from './MetricsPanel';
import { ErrorProne } from './ErrorProne';
import { UserSwitcher } from './UserSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { ConnectionBadge } from './ConnectionBadge';

function boundaryFallback(error: { message: string }, reset: () => void): React.ReactElement {
  return (
    <div className="m-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      <p className="mb-2 font-semibold">Something broke: {error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-700"
      >
        Recover
      </button>
    </div>
  );
}

export function ChatShell(): React.ReactElement {
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);

  // Sync the selected channel across browser tabs (open this app twice to see it).
  state.useBroadcastSync(useChatStore, {
    channelName: 'enterprise-chat-sync',
    syncKeys: ['activeChannelId', 'lastReadByChannel'],
    conflictStrategy: 'last-write-wins',
  });

  // One realtime subscription per active channel; merges live messages into the cache.
  const stream = useChatStream(activeChannelId);

  const channel = CHANNELS.find((c) => c.id === activeChannelId) ?? CHANNELS[0];

  return (
    <div className="flex h-full flex-col bg-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-indigo-600">⚛ Enzyme Chat</span>
          <ConnectionBadge />
        </div>
        <div className="flex items-center gap-4">
          <UserSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-60 shrink-0 border-r border-slate-200 bg-white">
          <ChannelSidebar activeChannelId={activeChannelId} onSelect={setActiveChannel} />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-slate-50">
          <div className="border-b border-slate-200 bg-white px-5 py-3">
            <h2 className="text-base font-semibold text-slate-900"># {channel.name}</h2>
            <p className="text-xs text-slate-500">{channel.topic}</p>
          </div>
          <monitoring.ErrorBoundary fallback={boundaryFallback}>
            <MessageList channelId={activeChannelId} />
          </monitoring.ErrorBoundary>
          <MessageComposer channelId={activeChannelId} onBroadcast={stream.broadcast} />
        </main>

        <aside className="hidden w-72 shrink-0 space-y-4 overflow-y-auto border-l border-slate-200 bg-slate-50 p-4 lg:block">
          <PresencePanel channelId={activeChannelId} />
          <BetaPanel />
          <MetricsPanel />
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Error boundary</h3>
            <monitoring.ErrorBoundary fallback={boundaryFallback}>
              <ErrorProne />
            </monitoring.ErrorBoundary>
          </section>
        </aside>
      </div>
    </div>
  );
}
