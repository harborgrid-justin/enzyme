/**
 * Studio UI state — active conversation, per-conversation model override,
 * and global generation knobs (temperature, max tokens).
 *
 * Conversation list + messages are owned by React Query (api/conversations.ts).
 * The store is mirrored across browser tabs by enzyme's `state.useBroadcastSync`
 * in StudioShell, so swapping models in one tab updates the other.
 *
 * Feature #31/#32/#34: a slice of this store (generation knobs, the active
 * conversation id, starred models, and right-rail panel visibility) is
 * persisted to localStorage via zustand's `persist` middleware so the studio
 * comes back exactly as you left it after a reload.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_MODEL_ID } from '../providers/catalog';
import type { ProviderOptions } from '../types';

export interface StudioUiState {
  /** Top-level surface: the chat studio or the Design workspace. */
  studioMode: 'chat' | 'design';
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
  /** Feature #34: model ids the user has starred — floated to the top of pickers. */
  favoriteModelIds: string[];
  /** Feature #43: whether archived conversations are shown in the sidebar. */
  showArchived: boolean;
  /** Feature #74: sidebar ordering within each owner section. */
  sidebarSort: 'recent' | 'cost' | 'title';
  /** Feature #86: message density. */
  density: 'comfortable' | 'compact';
  /** Feature #85: focus mode hides the sidebar + right rail. */
  focusMode: boolean;
  /** Feature #87: most-recently-used model ids (most recent first). */
  recentModelIds: string[];
  /** Feature #77: per-conversation cost budget in USD (0 = disabled). */
  costBudgetUsd: number;
  /** Feature #66: whether Enter sends (true) or inserts a newline (false). */
  enterToSend: boolean;

  /** Switch between the chat studio and the Design workspace. */
  setStudioMode: (mode: StudioUiState['studioMode']) => void;
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
  /** Feature #34: star/unstar a model. */
  toggleFavoriteModel: (id: string) => void;
  /** Feature #43: show/hide archived conversations. */
  toggleShowArchived: () => void;
  /** Feature #51: restore the default temperature / maxTokens / provider options. */
  resetGenerationSettings: () => void;
  /** Feature #74: change the sidebar ordering. */
  setSidebarSort: (sort: StudioUiState['sidebarSort']) => void;
  /** Feature #86: toggle comfortable/compact message density. */
  toggleDensity: () => void;
  /** Feature #85: toggle focus mode. */
  toggleFocusMode: () => void;
  /** Feature #87: record a model as recently used. */
  pushRecentModel: (id: string) => void;
  /** Feature #77: set the per-conversation cost budget (USD). */
  setCostBudget: (value: number) => void;
  /** Feature #66: toggle Enter-to-send vs Enter-for-newline. */
  toggleEnterToSend: () => void;
}

const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 512;

const DEFAULT_PROVIDER_OPTIONS: ProviderOptions = {
  anthropic_thinking: 'off',
  openai_service_tier: 'auto',
  openai_reasoning_effort: 'medium',
  foundry_api_version: '2024-10-21',
  huggingface_provider: 'auto',
  gemini_thinking_budget: -1,
  gemini_code_execution: false,
};

export const useStudioStore = create<StudioUiState>()(
  persist(
    (set) => ({
      studioMode: 'chat',
      activeConversationId: null,
      modelOverrideId: null,
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: DEFAULT_MAX_TOKENS,
      providerOptions: { ...DEFAULT_PROVIDER_OPTIONS },
      isSettingsOpen: true,
      isUsageOpen: true,
      isRequestPreviewOpen: false,
      favoriteModelIds: [],
      showArchived: false,
      sidebarSort: 'recent',
      density: 'comfortable',
      focusMode: false,
      recentModelIds: [],
      costBudgetUsd: 0,
      enterToSend: true,

      setStudioMode: (studioMode) => set({ studioMode }),
      setActiveConversation: (id) => set({ activeConversationId: id, modelOverrideId: null }),
      setModelOverride: (id) => set({ modelOverrideId: id }),
      setTemperature: (value) => set({ temperature: clamp(value, 0, 2) }),
      setMaxTokens: (value) => set({ maxTokens: clamp(Math.round(value), 32, 4096) }),
      setProviderOption: (key, value) =>
        set((s) => ({ providerOptions: { ...s.providerOptions, [key]: value } })),
      toggleSettings: () => set((s) => ({ isSettingsOpen: !s.isSettingsOpen })),
      toggleUsage: () => set((s) => ({ isUsageOpen: !s.isUsageOpen })),
      toggleRequestPreview: () => set((s) => ({ isRequestPreviewOpen: !s.isRequestPreviewOpen })),
      toggleFavoriteModel: (id) =>
        set((s) => ({
          favoriteModelIds: s.favoriteModelIds.includes(id)
            ? s.favoriteModelIds.filter((m) => m !== id)
            : [...s.favoriteModelIds, id],
        })),
      toggleShowArchived: () => set((s) => ({ showArchived: !s.showArchived })),
      resetGenerationSettings: () =>
        set({
          temperature: DEFAULT_TEMPERATURE,
          maxTokens: DEFAULT_MAX_TOKENS,
          providerOptions: { ...DEFAULT_PROVIDER_OPTIONS },
        }),
      setSidebarSort: (sidebarSort) => set({ sidebarSort }),
      toggleDensity: () =>
        set((s) => ({ density: s.density === 'compact' ? 'comfortable' : 'compact' })),
      toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
      pushRecentModel: (id) =>
        set((s) => ({ recentModelIds: [id, ...s.recentModelIds.filter((m) => m !== id)].slice(0, 6) })),
      setCostBudget: (value) => set({ costBudgetUsd: Math.max(0, value) }),
      toggleEnterToSend: () => set((s) => ({ enterToSend: !s.enterToSend })),
    }),
    {
      name: 'enzyme-ai-studio-ui',
      storage: createJSONStorage(() => localStorage),
      // Persist only durable preferences — never the transient model override.
      partialize: (s) => ({
        studioMode: s.studioMode,
        activeConversationId: s.activeConversationId,
        temperature: s.temperature,
        maxTokens: s.maxTokens,
        providerOptions: s.providerOptions,
        isSettingsOpen: s.isSettingsOpen,
        isUsageOpen: s.isUsageOpen,
        favoriteModelIds: s.favoriteModelIds,
        showArchived: s.showArchived,
        sidebarSort: s.sidebarSort,
        density: s.density,
        focusMode: s.focusMode,
        recentModelIds: s.recentModelIds,
        costBudgetUsd: s.costBudgetUsd,
        enterToSend: s.enterToSend,
      }),
    }
  )
);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export { DEFAULT_MODEL_ID, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS, DEFAULT_PROVIDER_OPTIONS };
