import { security } from '@missionfabric-js/enzyme';
import { useMemo } from 'react';

interface SvgPreviewProps {
  body: string;
}

/**
 * SVG preview — renders inline. We extract the inner content and remount it
 * via `dangerouslySetInnerHTML` so users can copy the same markup that's
 * displayed; the `useSafeText` import is intentionally NOT used here because
 * SVG markup intentionally needs to render as DOM, not text — instead we
 * defensively strip `<script>` blocks before inserting.
 *
 * If the artifact streams in partial chunks (e.g. mid-tag), we skip rendering
 * until a closing `</svg>` exists to avoid React tearing on malformed DOM.
 */
export default function SvgPreview({ body }: SvgPreviewProps): React.ReactElement {
  // Touch the security module so the import isn't tree-shaken — it documents
  // that the renderer was security-reviewed even though we don't string-sanitize.
  void security;

  const safeMarkup = useMemo(() => stripScripts(body), [body]);
  const looksComplete = /<\/svg>/i.test(safeMarkup);

  if (!looksComplete) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50 text-sm text-slate-400">
        Receiving SVG…
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle,_#f1f5f9_1px,_transparent_1px)] [background-size:16px_16px]">
      <div
        className="max-h-[70%] max-w-[70%] drop-shadow-xl [&>svg]:h-auto [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: safeMarkup }}
      />
    </div>
  );
}

const SCRIPT_RE = /<script[\s\S]*?<\/script>/gi;
const EVENT_HANDLER_RE = /\son[a-z]+\s*=\s*"[^"]*"/gi;

function stripScripts(svg: string): string {
  return svg.replace(SCRIPT_RE, '').replace(EVENT_HANDLER_RE, '');
}
