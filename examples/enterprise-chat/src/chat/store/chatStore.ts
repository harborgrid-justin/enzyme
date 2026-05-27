/**
 * Chat UI state (active channel, per-channel read markers). Plain Zustand store;
 * message data itself is owned by React Query (see api/messages.ts). The store is
 * mirrored across browser tabs by enzyme's `state.useBroadcastSync` in ChatShell.
 */
import { create } from 'zustand';
import { DEFAULT_CHANNEL_ID } from '../mocks/seed';

export interface ChatUiState {
  activeChannelId: string;
  /** Per-channel "last read" message id — synced across tabs for the demo. */
  lastReadByChannel: Record<string, string>;
  setActiveChannel: (id: string) => void;
  markRead: (channelId: string, messageId: string) => void;
}

export const useChatStore = create<ChatUiState>((set) => ({
  activeChannelId: DEFAULT_CHANNEL_ID,
  lastReadByChannel: {},
  setActiveChannel: (id) => set({ activeChannelId: id }),
  markRead: (channelId, messageId) =>
    set((s) => ({
      lastReadByChannel: { ...s.lastReadByChannel, [channelId]: messageId },
    })),
}));
