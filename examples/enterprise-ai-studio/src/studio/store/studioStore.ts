/**
 * Studio UI state — active conversation, per-conversation model override,
 * and global generation knobs (temperature, max tokens).
 *
 * Conversation list + messages are owned by React Query (api/conversations.ts).
 * The store is mirrored across browser tabs by enzyme's `state.useBroadcastSync`
 * in StudioShell, so swapping models in one tab updates the other.
 */
import { create } from 'zustand';
import { DEFAULT_MODEL_ID } from '../providers/catalog';

export interface StudioUiState {
  activeConversationId: string | null;
  /** When set, overrides the conversation's default model for the next turn. */
  modelOverrideId: string | null;
  /** Generation knobs surfaced in the right-rail Settings panel. */
  temperature: number;
  maxTokens: number;
  /** Toggles for the right-rail panels (collapsible to save real-estate). */
  isSettingsOpen: boolean;
  isUsageOpen: boolean;

  setActiveConversation: (id: string | null) => void;
  setModelOverride: (id: string | null) => void;
  setTemperature: (value: number) => void;
  setMaxTokens: (value: number) => void;
  toggleSettings: () => void;
  toggleUsage: () => void;
}

export const useStudioStore = create<StudioUiState>((set) => ({
  activeConversationId: null,
  modelOverrideId: null,
  temperature: 0.7,
  maxTokens: 512,
  isSettingsOpen: true,
  isUsageOpen: true,

  setActiveConversation: (id) => set({ activeConversationId: id, modelOverrideId: null }),
  setModelOverride: (id) => set({ modelOverrideId: id }),
  setTemperature: (value) => set({ temperature: clamp(value, 0, 2) }),
  setMaxTokens: (value) => set({ maxTokens: clamp(Math.round(value), 32, 4096) }),
  toggleSettings: () => set((s) => ({ isSettingsOpen: !s.isSettingsOpen })),
  toggleUsage: () => set((s) => ({ isUsageOpen: !s.isUsageOpen })),
}));

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export { DEFAULT_MODEL_ID };
