import { useMemo } from 'react';

interface HtmlPreviewProps {
  body: string;
  /** When the stream hasn't closed yet, we still render whatever's arrived. */
  streaming?: boolean;
}

/**
 * HTML preview — renders the artifact body in a fully sandboxed iframe via
 * `srcdoc`. The sandbox blocks all forms of script execution that could escape
 * the iframe (no `allow-same-origin`), so model-generated markup can't reach
 * the host page's DOM, cookies, or storage. The Tailwind CDN inside the iframe
 * is the only "script" we permit, which is enabled via `allow-scripts`.
 */
export default function HtmlPreview({ body, streaming }: HtmlPreviewProps): React.ReactElement {
  // Only assign srcdoc once the HTML document is structurally complete —
  // streaming a partial document into the iframe causes constant reloads + the
  // partial DOM can crash Tailwind's CDN script. While we wait we show a
  // streaming placeholder so the user knows something's happening.
  const looksComplete = /<\/html>/i.test(body);
  const srcDoc = useMemo(() => body, [body]);

  if (!looksComplete) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50">
        <div className="text-center">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
          <p className="mt-2 text-xs text-slate-500">
            Receiving HTML… {Math.round(body.length / 1024)} KB so far
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-white">
      {streaming === true && (
        <div className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Streaming
        </div>
      )}
      <iframe
        title="Artifact preview"
        sandbox="allow-scripts"
        className="h-full w-full border-0"
        srcDoc={srcDoc}
      />
    </div>
  );
}
