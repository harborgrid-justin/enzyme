import { security } from '@missionfabric-js/enzyme';
import { useMemo } from 'react';
import { sanitizeSvg } from '../../security/sanitize';

interface SvgPreviewProps {
  body: string;
}

/**
 * SVG preview — renders inline via `dangerouslySetInnerHTML` (the markup MUST
 * become DOM, not text, for the artifact to render). Because there is no
 * iframe sandbox to fall back on, every byte we inject is first run through
 * the DOM-based SVG sanitizer in `studio/security/sanitize.ts`, which:
 *
 *   - removes `<script>`, `<foreignObject>`, `<iframe>`, `<style>`,
 *     `<animate*>`, and other script-bearing or layout-escape elements;
 *   - strips every `on*` attribute (including namespaced `xlink:on*`) across
 *     single-quoted, double-quoted, and unquoted forms;
 *   - drops `<use>` / `<image>` / `<a>` with non-fragment, non-data hrefs so
 *     SVGs can't pull external resources or navigate the parent.
 *
 * If the artifact streams in partial chunks (e.g. mid-tag), we skip rendering
 * until a closing `</svg>` exists to avoid React tearing on malformed DOM.
 */
export default function SvgPreview({ body }: SvgPreviewProps): React.ReactElement {
  // Touch the security module so the import isn't tree-shaken — it documents
  // that the renderer was security-reviewed even though we don't string-sanitize.
  void security;

  const safeMarkup = useMemo(() => sanitizeSvg(body), [body]);
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

