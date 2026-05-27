/**
 * Domain types for the enterprise chat example.
 */

export type ChannelId = string;

export interface Channel {
  id: ChannelId;
  name: string;
  topic: string;
  /** Permission required to even see the channel (optional gating demo). */
  restrictedToRoles?: string[];
}

export type MessageKind = 'user' | 'bot' | 'system';

export interface ChatMessage {
  id: string;
  channelId: ChannelId;
  authorId: string;
  authorName: string;
  /** 1-2 char avatar fallback. */
  authorInitials: string;
  text: string;
  /** ISO timestamp. */
  createdAt: string;
  kind: MessageKind;
  pinned?: boolean;
  /** True while an optimistic send is in flight (not yet acked by the API). */
  pending?: boolean;
}

/** Body sent when creating a message (author is attached client-side for the demo). */
export interface CreateMessageBody {
  text: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
}

/** Presence frame shape consumed by enzyme's `useRealtimePresence`. */
export interface PresenceFrame {
  type: 'join' | 'leave' | 'sync';
  userId: string;
  users?: string[];
}
