import { useArtifactStore, useConversationArtifacts, artifactKey } from '../artifacts/store';

/**
 * Inline link in a message body that opens an artifact in the right pane.
 *
 * The chip is rendered wherever a `<artifact>` block appeared in the assistant
 * text (the parser leaves a `[Artifact: <title>]` placeholder; the message
 * renderer replaces those placeholders with this component).
 */
interface ArtifactChipProps {
  conversationId: string;
  title: string;
}

export function ArtifactChip({ conversationId, title }: ArtifactChipProps): React.ReactElement {
  const artifacts = useConversationArtifacts(conversationId);
  const openArtifact = useArtifactStore((s) => s.openArtifact);
  const openKey = useArtifactStore((s) => s.openArtifactKey);

  // Match by title — assistant artifacts in a conversation are titled uniquely.
  const match = artifacts.find((a) => a.title === title);
  if (match == null) {
    return (
      <span className="my-1 inline-flex items-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-2.5 py-1 text-xs text-slate-500">
        <span>📎</span>
        <span>{title} (rendering…)</span>
      </span>
    );
  }

  const key = artifactKey(conversationId, match.id);
  const isOpen = openKey === key;
  const latest = match.versions[match.versions.length - 1];

  return (
    <button
      type="button"
      onClick={() => openArtifact(isOpen ? null : key)}
      className={`my-1 inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
        isOpen
          ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
          : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50'
      }`}
    >
      <span className="text-base leading-none">📎</span>
      <span>{title}</span>
      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
        v{latest?.version ?? 1}
        {match.versions.length > 1 ? ` · ${match.versions.length} versions` : ''}
      </span>
    </button>
  );
}
