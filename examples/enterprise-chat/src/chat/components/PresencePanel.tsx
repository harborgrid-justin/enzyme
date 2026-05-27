import { realtime } from '@missionfabric-js/enzyme';
import { initials } from '../users';

/** Online roster via enzyme's `useRealtimePresence` (fed by the mock socket). */
export function PresencePanel({ channelId }: { channelId: string }): React.ReactElement {
  const { users, count } = realtime.useRealtimePresence(channelId);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">
        Online — {count}
      </h3>
      {count === 0 ? (
        <p className="text-xs text-slate-400">No one here yet…</p>
      ) : (
        <ul className="space-y-2">
          {users.map((name) => (
            <li key={name} className="flex items-center gap-2 text-sm text-slate-700">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                {initials(name)}
              </span>
              {name}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
