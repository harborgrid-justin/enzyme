import { performance as perf, streaming } from '@missionfabric-js/enzyme';
import type { ArtifactKind, ArtifactVersion } from '../artifacts/types';

/**
 * Lazy-loaded artifact renderers.
 *
 * Each renderer is its own chunk so the studio bundle stays small until the
 * user actually opens an artifact of that kind. `createLazyComponent` is
 * enzyme's wrapped `React.lazy` — it adds retry-on-failure, a configurable
 * minimum-loading time (so the suspense fallback doesn't flicker), and a
 * `.preload()` method we can call to warm the chunk before it's mounted.
 */
const HtmlRenderer = perf.createLazyComponent({
  loader: () => import('./renderers/HtmlPreview'),
  retryCount: 2,
  minLoadingTime: 0,
});

const SvgRenderer = perf.createLazyComponent({
  loader: () => import('./renderers/SvgPreview'),
  retryCount: 2,
  minLoadingTime: 0,
});

const MarkdownRenderer = perf.createLazyComponent({
  loader: () => import('./renderers/MarkdownPreview'),
  retryCount: 2,
  minLoadingTime: 0,
});

const CodeRenderer = perf.createLazyComponent({
  loader: () => import('./renderers/CodePreview'),
  retryCount: 2,
  minLoadingTime: 0,
});

interface ArtifactPreviewProps {
  version: ArtifactVersion;
}

/**
 * Wraps the right renderer in a `streaming.StreamBoundary` so each preview is
 * its own stream surface — placeholders are uniform, errors are isolated to
 * the preview pane, and the renderer chunk loads without blocking the chat.
 */
export function ArtifactPreview({ version }: ArtifactPreviewProps): React.ReactElement {
  return (
    <streaming.StreamBoundary
      id={`artifact-${version.id}`}
      priority="high"
      placeholder={<RendererSkeleton kind={version.kind} />}
    >
      <Renderer version={version} />
    </streaming.StreamBoundary>
  );
}

function Renderer({ version }: { version: ArtifactVersion }): React.ReactElement {
  switch (version.kind) {
    case 'html':
      return <HtmlRenderer body={version.body} />;
    case 'svg':
      return <SvgRenderer body={version.body} />;
    case 'markdown':
      return <MarkdownRenderer body={version.body} />;
    case 'code':
    default:
      return <CodeRenderer body={version.body} language={version.language} />;
  }
}

function RendererSkeleton({ kind }: { kind: ArtifactKind }): React.ReactElement {
  const label =
    kind === 'html'
      ? 'Loading HTML renderer…'
      : kind === 'svg'
      ? 'Loading SVG renderer…'
      : kind === 'markdown'
      ? 'Loading markdown renderer…'
      : 'Loading code renderer…';
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-50">
      <div className="text-center">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
        <p className="mt-2 text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

/**
 * Optional pre-warming — once an artifact is detected mid-stream, we can call
 * this to start downloading the renderer chunk before the user clicks open.
 */
export function preloadRendererFor(kind: ArtifactKind): void {
  if (kind === 'html') void HtmlRenderer.preload();
  else if (kind === 'svg') void SvgRenderer.preload();
  else if (kind === 'markdown') void MarkdownRenderer.preload();
  else void CodeRenderer.preload();
}
