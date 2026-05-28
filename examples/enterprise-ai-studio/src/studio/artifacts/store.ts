/**
 * Artifact store — per-conversation, version-history-aware.
 *
 * The chat stream writes parsed artifact events into this store via
 * `recordArtifactEvent`, which patches the most recent version of the artifact
 * (since the parser re-emits the same artifact on every chunk update with a
 * progressively longer body). A *new* version is created at the start of each
 * assistant turn via `startTurn` — that gives us the "Initial draft / Darker
 * theme / Added CTA" version timeline.
 */
import { create } from 'zustand';
import type { Artifact, ArtifactVersion } from './types';
import type { ParsedArtifactEvent } from './parser';

interface ArtifactState {
  /** All artifacts keyed by `${conversationId}:${artifactId}`. */
  artifacts: Record<string, Artifact>;
  /** Which version each artifact is currently displaying (id of ArtifactVersion). */
  selectedVersionByArtifact: Record<string, string>;
  /** Which artifact is open in the right pane (or null if collapsed). */
  openArtifactKey: string | null;
  /** Toggle between live preview ("preview") and source ("code"). */
  viewMode: 'preview' | 'code';
  /**
   * Set of artifact keys that are currently mid-stream (placeholder versions
   * being patched). Cleared once the turn completes.
   */
  streamingKeys: Set<string>;

  /** Called by the completions hook when a new assistant turn starts. */
  startTurn: () => void;
  /** Called when the assistant turn finishes (or aborts) so the next event creates a fresh version. */
  endTurn: () => void;
  recordArtifactEvent: (
    conversationId: string,
    event: ParsedArtifactEvent,
    model?: { provider: string; id: string; label: string }
  ) => void;
  openArtifact: (key: string | null) => void;
  selectVersion: (artifactKey: string, versionId: string) => void;
  setViewMode: (mode: 'preview' | 'code') => void;
}

function keyFor(conversationId: string, artifactId: string): string {
  return `${conversationId}:${artifactId}`;
}

export const useArtifactStore = create<ArtifactState>((set) => ({
  artifacts: {},
  selectedVersionByArtifact: {},
  openArtifactKey: null,
  viewMode: 'preview',
  streamingKeys: new Set(),

  startTurn: () => set({ streamingKeys: new Set() }),
  endTurn: () => set({ streamingKeys: new Set() }),

  recordArtifactEvent: (conversationId, event, model) =>
    set((state) => {
      const key = keyFor(conversationId, event.artifactId);
      const existing = state.artifacts[key];
      const isStreamingThisTurn = state.streamingKeys.has(key);

      if (existing != null && isStreamingThisTurn) {
        // We've already created a placeholder version for this turn — patch it.
        const versions = [...existing.versions];
        const idx = versions.length - 1;
        const latest = versions[idx];
        if (latest != null) {
          versions[idx] = {
            ...latest,
            label: event.label ?? latest.label,
            kind: event.kind,
            language: event.language ?? latest.language,
            body: event.body,
            byteLength: event.body.length,
          };
        }
        return {
          artifacts: { ...state.artifacts, [key]: { ...existing, title: event.title, versions } },
        };
      }

      // First time we've seen this artifact this turn — create a new version slot.
      const nextVersionNumber = (existing?.versions.length ?? 0) + 1;
      const newVersion = makeVersion(nextVersionNumber, event, model);
      const nextArtifact: Artifact =
        existing != null
          ? { ...existing, title: event.title, versions: [...existing.versions, newVersion] }
          : {
              id: event.artifactId,
              conversationId,
              title: event.title,
              versions: [newVersion],
            };
      const nextStreamingKeys = new Set(state.streamingKeys);
      nextStreamingKeys.add(key);

      return {
        artifacts: { ...state.artifacts, [key]: nextArtifact },
        streamingKeys: nextStreamingKeys,
        openArtifactKey: state.openArtifactKey ?? key,
        selectedVersionByArtifact: {
          ...state.selectedVersionByArtifact,
          [key]: newVersion.id,
        },
      };
    }),

  openArtifact: (key) => set({ openArtifactKey: key }),
  selectVersion: (artifactKey, versionId) =>
    set((state) => ({
      selectedVersionByArtifact: {
        ...state.selectedVersionByArtifact,
        [artifactKey]: versionId,
      },
    })),
  setViewMode: (mode) => set({ viewMode: mode }),
}));

function makeVersion(
  versionNumber: number,
  event: ParsedArtifactEvent,
  model?: { provider: string; id: string; label: string }
): ArtifactVersion {
  return {
    id: `v-${event.artifactId}-${versionNumber}-${Math.random().toString(36).slice(2, 8)}`,
    version: versionNumber,
    label: event.label ?? (versionNumber === 1 ? 'Initial draft' : `Iteration ${versionNumber}`),
    kind: event.kind,
    language: event.language,
    body: event.body,
    createdAt: new Date().toISOString(),
    model,
    byteLength: event.body.length,
  };
}

// --- selectors ---------------------------------------------------------------

export interface OpenArtifactState {
  key: string | null;
  artifact: Artifact | null;
  selectedVersion: ArtifactVersion | null;
}

export function useOpenArtifact(): OpenArtifactState {
  const openKey = useArtifactStore((s) => s.openArtifactKey);
  const artifact = useArtifactStore((s) => (openKey != null ? s.artifacts[openKey] ?? null : null));
  const selectedId = useArtifactStore((s) =>
    openKey != null ? s.selectedVersionByArtifact[openKey] : undefined
  );
  if (openKey == null || artifact == null) {
    return { key: openKey, artifact: null, selectedVersion: null };
  }
  const selectedVersion =
    artifact.versions.find((v) => v.id === selectedId) ??
    artifact.versions[artifact.versions.length - 1] ??
    null;
  return { key: openKey, artifact, selectedVersion };
}

export function useConversationArtifacts(conversationId: string | null): Artifact[] {
  return useArtifactStore((state) => {
    if (conversationId == null) return [];
    return Object.values(state.artifacts).filter((a) => a.conversationId === conversationId);
  });
}

export function artifactKey(conversationId: string, artifactId: string): string {
  return keyFor(conversationId, artifactId);
}
