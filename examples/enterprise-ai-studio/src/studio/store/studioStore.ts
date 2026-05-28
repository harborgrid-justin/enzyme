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
import type { ProviderOptions } from '../types';

export interface StudioUiState {
  activeConversationId: string | null;
  /** When set, overrides the conversation's default model for the next turn. */
  modelOverrideId: string | null;
  /** Generation knobs surfaced in the right-rail Settings panel. */
  temperature: number;
  maxTokens: number;
  /** Provider-specific options applied to the next turn (see types.ts). */
  providerOptions: ProviderOptions;
  /** Toggles for the right-rail panels (collapsible to save real-estate). */
  isSettingsOpen: boolean;
  isUsageOpen: boolean;
  /** Whether the "Request preview" expander in Settings is open. */
  isRequestPreviewOpen: boolean;

  setActiveConversation: (id: string | null) => void;
  setModelOverride: (id: string | null) => void;
  setTemperature: (value: number) => void;
  setMaxTokens: (value: number) => void;
  setProviderOption: <K extends keyof ProviderOptions>(
    key: K,
    value: ProviderOptions[K]
  ) => void;
  toggleSettings: () => void;
  toggleUsage: () => void;
  toggleRequestPreview: () => void;
}

const DEFAULT_PROVIDER_OPTIONS: ProviderOptions = {
  anthropic_thinking: 'off',
  openai_service_tier: 'auto',
  openai_reasoning_effort: 'medium',
  foundry_api_version: '2024-10-21',
  huggingface_provider: 'auto',
  gemini_thinking_budget: -1,
  gemini_code_execution: false,
};

export const useStudioStore = create<StudioUiState>((set) => ({
  activeConversationId: null,
  modelOverrideId: null,
  temperature: 0.7,
  maxTokens: 512,
  providerOptions: { ...DEFAULT_PROVIDER_OPTIONS },
  isSettingsOpen: true,
  isUsageOpen: true,
  isRequestPreviewOpen: false,

  setActiveConversation: (id) => set({ activeConversationId: id, modelOverrideId: null }),
  setModelOverride: (id) => set({ modelOverrideId: id }),
  setTemperature: (value) => set({ temperature: clamp(value, 0, 2) }),
  setMaxTokens: (value) => set({ maxTokens: clamp(Math.round(value), 32, 4096) }),
  setProviderOption: (key, value) =>
    set((s) => ({ providerOptions: { ...s.providerOptions, [key]: value } })),
  toggleSettings: () => set((s) => ({ isSettingsOpen: !s.isSettingsOpen })),
  toggleUsage: () => set((s) => ({ isUsageOpen: !s.isUsageOpen })),
  toggleRequestPreview: () => set((s) => ({ isRequestPreviewOpen: !s.isRequestPreviewOpen })),
}));

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export { DEFAULT_MODEL_ID };
