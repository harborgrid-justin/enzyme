import { realtime } from '@missionfabric-js/enzyme';

/** Live WebSocket connection status from enzyme's realtime context. */
export function ConnectionBadge(): React.ReactElement {
  const { isConnected, connectionState } = realtime.useRealtimeConnection();
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
      <span
        className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-400'}`}
        aria-hidden
      />
      {isConnected ? 'Realtime connected' : `Realtime: ${connectionState}`}
    </span>
  );
}
