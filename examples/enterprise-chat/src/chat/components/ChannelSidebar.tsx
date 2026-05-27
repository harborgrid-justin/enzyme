import { auth } from '@missionfabric-js/enzyme';
import { CHANNELS } from '../mocks/seed';

interface ChannelSidebarProps {
  activeChannelId: string;
  onSelect: (channelId: string) => void;
}

/** Channel navigation with role-gated channels (e.g. `# leadership`). */
export function ChannelSidebar({ activeChannelId, onSelect }: ChannelSidebarProps): React.ReactElement {
  const { isAuthenticated, hasAnyRole } = auth.useAuth();

  const visibleChannels = CHANNELS.filter((channel) => {
    if (channel.restrictedToRoles == null) return true;
    return isAuthenticated && hasAnyRole(channel.restrictedToRoles as auth.Role[]);
  });

  return (
    <nav className="flex h-full flex-col gap-1 p-3">
      <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Channels
      </div>
      {visibleChannels.map((channel) => {
        const active = channel.id === activeChannelId;
        return (
          <button
            key={channel.id}
            type="button"
            onClick={() => onSelect(channel.id)}
            className={`rounded-md px-3 py-2 text-left text-sm font-medium transition ${
              active
                ? 'bg-indigo-600 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            # {channel.name}
            {channel.restrictedToRoles != null && (
              <span className="ml-1 text-[10px] opacity-70">🔒</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
