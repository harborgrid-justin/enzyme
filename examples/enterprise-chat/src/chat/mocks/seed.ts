import type { Channel, ChatMessage } from '../types';

export const CHANNELS: Channel[] = [
  { id: 'general', name: 'general', topic: 'Company-wide announcements and chatter' },
  { id: 'engineering', name: 'engineering', topic: 'Builds, deploys, and incidents' },
  { id: 'design', name: 'design', topic: 'Design reviews and critique' },
  { id: 'leadership', name: 'leadership', topic: 'Restricted: managers & admins', restrictedToRoles: ['admin', 'manager'] },
];

export const DEFAULT_CHANNEL_ID = 'general';

/** Deterministic-ish seed history per channel. */
export function createSeedMessages(): ChatMessage[] {
  const base = Date.now() - 1000 * 60 * 30;
  const mk = (
    channelId: string,
    offsetMin: number,
    authorName: string,
    authorInitials: string,
    text: string,
    kind: ChatMessage['kind'] = 'user'
  ): ChatMessage => ({
    id: `seed-${channelId}-${offsetMin}`,
    channelId,
    authorId: `seed-${authorName.toLowerCase()}`,
    authorName,
    authorInitials,
    text,
    createdAt: new Date(base + offsetMin * 60 * 1000).toISOString(),
    kind,
  });

  return [
    mk('general', 0, 'Enzyme Bot', 'EB', 'Welcome to the enterprise chat demo! 👋', 'system'),
    mk('general', 2, 'Ada Admin', 'AA', 'Reminder: all-hands at 3pm today.'),
    mk('general', 5, 'Mia Member', 'MM', 'Thanks — adding it to my calendar.'),
    mk('engineering', 1, 'Max Manager', 'MM', 'Deploy to staging is green ✅'),
    mk('engineering', 4, 'Enzyme Bot', 'EB', 'CI pipeline #4821 passed in 2m 14s.', 'bot'),
    mk('design', 3, 'Mia Member', 'MM', 'New dashboard mockups are up for review.'),
    mk('leadership', 1, 'Ada Admin', 'AA', 'Q3 headcount plan attached.'),
  ];
}

/** Phrases the simulated "bots" emit over the realtime socket. */
export const BOT_LINES = [
  'Heads up: a new release is rolling out.',
  'Synced 3 documents to the workspace.',
  'A teammate just joined the channel.',
  'Reminder: stand-up in 10 minutes.',
  'Backup completed successfully.',
];
