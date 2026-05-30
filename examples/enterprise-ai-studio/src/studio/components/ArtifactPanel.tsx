import { hooks } from '@missionfabric-js/enzyme';
import { useArtifactStore, useOpenArtifact } from '../artifacts/store';
import type { ArtifactKind, ArtifactVersion } from '../artifacts/types';
import { ArtifactPreview } from './ArtifactPreview';

/**
 * Right-pane artifact viewer. Shows the live preview, version timeline, and a
 * toolbar with download / copy / view-source. When no artifact is open this
 * component renders nothing — the parent decides whether to allocate space.
 */
export function ArtifactPanel(): React.ReactElement | null {
  const { artifact, selectedVersion } = useOpenArtifact();
  const viewMode = useArtifactStore((s) => s.viewMode);
  const setViewMode = useArtifactStore((s) => s.setViewMode);
  const selectVersion = useArtifactStore((s) => s.selectVersion);
  const closePanel = useArtifactStore((s) => s.openArtifact);
  const [, copy] = hooks.useCopyToClipboard();

  if (artifact == null || selectedVersion == null) return null;

  const artifactKey = `${artifact.conversationId}:${artifact.id}`;
  const isLatest = selectedVersion.id === artifact.versions[artifact.versions.length - 1]?.id;
  const downloadName = downloadFilename(artifact.title, selectedVersion);

  function copySource(): void {
    if (selectedVersion == null) return;
    void copy(selectedVersion.body);
  }

  function download(): void {
    if (selectedVersion == null) return;
    const blob = new Blob([selectedVersion.body], { type: mimeFor(selectedVersion.kind) });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-slate-200 bg-white lg:w-[640px] xl:w-[760px]">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-slate-900">{artifact.title}</h2>
            <KindChip kind={selectedVersion.kind} />
            {!isLatest && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                viewing v{selectedVersion.version} of {artifact.versions.length}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {selectedVersion.byteLength.toLocaleString()} bytes ·{' '}
            {selectedVersion.model?.label ?? 'unknown model'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ToolbarToggle
            active={viewMode === 'preview'}
            onClick={() => setViewMode('preview')}
            label="Preview"
          />
          <ToolbarToggle
            active={viewMode === 'code'}
            onClick={() => setViewMode('code')}
            label="Code"
          />
          <span className="mx-1 h-5 w-px bg-slate-200" />
          <ToolbarButton onClick={copySource} title="Copy source">⧉</ToolbarButton>
          <ToolbarButton onClick={download} title={`Download as ${downloadName}`}>↓</ToolbarButton>
          <ToolbarButton onClick={() => closePanel(null)} title="Close panel">✕</ToolbarButton>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        {viewMode === 'preview' ? (
          <ArtifactPreview version={selectedVersion} />
        ) : (
          <pre className="h-full w-full overflow-auto bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200">
            <code>{selectedVersion.body}</code>
          </pre>
        )}
      </div>

      {artifact.versions.length > 1 && (
        <footer className="border-t border-slate-200 bg-slate-50 px-4 py-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Iteration history
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {artifact.versions.map((v) => (
              <VersionPill
                key={v.id}
                version={v}
                isActive={v.id === selectedVersion.id}
                onClick={() => selectVersion(artifactKey, v.id)}
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Ask the assistant to "make it darker", "add a CTA", or "use a different
            palette" to create the next iteration.
          </p>
        </footer>
      )}
    </aside>
  );
}

function ToolbarToggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2.5 py-1 text-xs font-medium transition ${
        active
          ? 'bg-slate-900 text-white'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {label}
    </button>
  );
}

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="h-7 w-7 rounded text-sm text-slate-600 hover:bg-slate-100"
    >
      {children}
    </button>
  );
}

function VersionPill({
  version,
  isActive,
  onClick,
}: {
  version: ArtifactVersion;
  isActive: boolean;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex shrink-0 flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left text-xs transition ${
        isActive
          ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <span className="font-mono text-[10px] uppercase tracking-wide text-slate-500">
        v{version.version}
      </span>
      <span className={`font-medium ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>
        {version.label}
      </span>
    </button>
  );
}

function KindChip({ kind }: { kind: ArtifactKind }): React.ReactElement {
  const styles: Record<ArtifactKind, string> = {
    html: 'bg-orange-100 text-orange-700',
    svg: 'bg-violet-100 text-violet-700',
    markdown: 'bg-slate-100 text-slate-700',
    code: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${styles[kind]}`}>
      {kind}
    </span>
  );
}

function downloadFilename(title: string, version: ArtifactVersion): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const ext: Record<ArtifactKind, string> = {
    html: 'html',
    svg: 'svg',
    markdown: 'md',
    code: version.language === 'typescript' ? 'ts' : version.language ?? 'txt',
  };
  return `${slug}-v${version.version}.${ext[version.kind]}`;
}

function mimeFor(kind: ArtifactKind): string {
  if (kind === 'html') return 'text/html';
  if (kind === 'svg') return 'image/svg+xml';
  if (kind === 'markdown') return 'text/markdown';
  return 'text/plain';
}
