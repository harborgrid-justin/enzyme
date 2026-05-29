import { useState, useMemo } from 'react';
import type { ActivityKind, ActivityEvent } from '../types';
import { useDesignStore, parseMentions } from '../store';
import { SectionHeader, Btn, TextArea, Badge, EmptyHint } from '../ui';
import { toast } from '../../ui/toast';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const KIND_EMOJI: Record<ActivityKind, string> = {
  component: '🧩',
  comment: '💬',
  approval: '✅',
  deploy: '🚀',
  commit: '📝',
  mention: '@',
  eval: '🧪',
  agent: '🤖',
};

const ALL_KINDS: ActivityKind[] = [
  'component',
  'comment',
  'approval',
  'deploy',
  'commit',
  'mention',
  'eval',
  'agent',
];

function MentionBody({ text }: { text: string }): React.ReactElement {
  const parts = text.split(/(@[A-Za-z][\w-]*)/g);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span
            key={i}
            className="inline-flex items-center rounded-full bg-indigo-100 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

function EventRow({ event }: { event: ActivityEvent }): React.ReactElement {
  const emoji = KIND_EMOJI[event.kind];
  return (
    <div className="flex gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5">
      <span className="mt-0.5 text-base leading-none" aria-hidden="true">
        {emoji}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-1">
          <span className="text-sm font-semibold text-slate-800">{event.actor}</span>
          <span className="text-xs text-slate-500">{relativeTime(event.createdAt)}</span>
        </div>
        <p className="mt-0.5 text-sm text-slate-600">
          <MentionBody text={event.summary} />
        </p>
      </div>
    </div>
  );
}

export function ActivityPanel(): React.ReactElement {
  const activity = useDesignStore((s) => s.activity);
  const logActivity = useDesignStore((s) => s.logActivity);

  const [text, setText] = useState('');
  const [activeKind, setActiveKind] = useState<ActivityKind | 'all'>('all');

  const presentKinds = useMemo<ActivityKind[]>(() => {
    const seen = new Set(activity.map((e) => e.kind));
    return ALL_KINDS.filter((k) => seen.has(k));
  }, [activity]);

  const filtered = useMemo<ActivityEvent[]>(
    () =>
      activeKind === 'all' ? activity : activity.filter((e) => e.kind === activeKind),
    [activity, activeKind]
  );

  function handlePost(): void {
    const trimmed = text.trim();
    if (trimmed === '') return;
    const mentions = parseMentions(trimmed);
    logActivity('mention', trimmed);
    setText('');
    if (mentions.length > 0) {
      toast.success(`Update posted — mentioned ${mentions.join(', ')}`);
    } else {
      toast.success('Update posted');
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Activity"
        subtitle="Presence-aware @mentions and team activity feed"
      />

      {/* Compose box */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
        <TextArea
          value={text}
          onChange={setText}
          placeholder="Post an update… (@mention teammates)"
          rows={3}
        />
        <div className="flex justify-end">
          <Btn
            variant="primary"
            onClick={handlePost}
            disabled={text.trim() === ''}
          >
            Post update
          </Btn>
        </div>
      </div>

      {/* Kind filter chips */}
      {presentKinds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveKind('all')}
            className={[
              'rounded-full px-3 py-1 text-xs font-medium transition',
              activeKind === 'all'
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-300 text-slate-600 hover:bg-slate-100',
            ].join(' ')}
          >
            all
          </button>
          {presentKinds.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setActiveKind(k)}
              className={[
                'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition',
                activeKind === k
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-300 text-slate-600 hover:bg-slate-100',
              ].join(' ')}
            >
              <span aria-hidden="true">{KIND_EMOJI[k]}</span>
              {k}
            </button>
          ))}
        </div>
      )}

      {/* Feed */}
      {filtered.length === 0 ? (
        <EmptyHint>
          {activeKind === 'all'
            ? 'No activity yet. Post an update above.'
            : `No "${activeKind}" events yet.`}
        </EmptyHint>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </div>
      )}

      {/* Summary badge */}
      {activity.length > 0 && (
        <div className="flex justify-end">
          <Badge tone="slate">{activity.length} total events</Badge>
        </div>
      )}
    </div>
  );
}
