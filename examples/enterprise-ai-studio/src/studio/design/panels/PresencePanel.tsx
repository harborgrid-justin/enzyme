import { useEffect } from 'react';
import type { Collaborator } from '../types';
import { useDesignStore } from '../store';
import { SEED_PEERS } from '../seed';
import { SectionHeader } from '../ui';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function PresencePanel(): React.ReactElement {
  const collaborators = useDesignStore((s) => s.collaborators);
  const setCollaborators = useDesignStore((s) => s.setCollaborators);
  const actor = useDesignStore((s) => s.actor);

  useEffect(() => {
    const initial: Collaborator[] = SEED_PEERS.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      cursor: { x: Math.random(), y: Math.random() },
      focusId: null,
      lastSeen: Date.now(),
    }));
    setCollaborators(initial);

    const interval = setInterval(() => {
      setCollaborators(
        initial.map((c) => ({
          ...c,
          cursor: {
            x: clamp(c.cursor.x + (Math.random() - 0.5) * 0.08, 0, 1),
            y: clamp(c.cursor.y + (Math.random() - 0.5) * 0.08, 0, 1),
          },
          lastSeen: Date.now(),
        }))
      );
    }, 1200);

    return () => {
      clearInterval(interval);
      setCollaborators([]);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Live presence"
        subtitle="See who's active on this surface right now"
      />

      {/* Presence avatars */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Local actor */}
        <div className="flex items-center gap-1.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-white"
            style={{ backgroundColor: '#6366f1' }}
          >
            {initials(actor)}
          </span>
          <span className="text-xs text-slate-500">you</span>
        </div>

        {collaborators.map((c) => (
          <div key={c.id} className="flex items-center gap-1.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-white"
              style={{ backgroundColor: c.color }}
            >
              {initials(c.name)}
            </span>
            <span className="text-xs text-slate-500">{c.name}</span>
          </div>
        ))}
      </div>

      {/* Cursor canvas */}
      <div className="relative h-72 overflow-hidden rounded-lg bg-slate-50 border border-slate-200">
        {/* Actor's cursor label in top-left */}
        <div
          className="absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
          style={{ backgroundColor: '#6366f1' }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <polygon points="0,0 10,4 4,6 2,10" fill="white" />
          </svg>
          {actor}
        </div>

        {collaborators.map((c) => (
          <div
            key={c.id}
            className="absolute transition-all duration-700"
            style={{
              left: `${c.cursor.x * 100}%`,
              top: `${c.cursor.y * 100}%`,
              transform: 'translate(-4px, -4px)',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              aria-hidden="true"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
            >
              <polygon points="0,0 16,6 6,9 3,16" fill={c.color} />
            </svg>
            <span
              className="absolute left-4 top-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
              style={{ backgroundColor: c.color }}
            >
              {c.name}
            </span>
          </div>
        ))}

        {collaborators.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No remote peers active
          </div>
        )}
      </div>
    </div>
  );
}
