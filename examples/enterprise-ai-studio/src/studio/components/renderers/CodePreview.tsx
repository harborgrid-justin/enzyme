interface CodePreviewProps {
  body: string;
  language?: string;
}

/**
 * Code preview — renders the body as a syntax-tinted `<pre>` block.
 *
 * We do a tiny token-coloring pass for keywords/strings/comments rather than
 * pulling in highlight.js or shiki (both ship 100KB+ for the small payoff
 * inside an example). The point is to show how to slot a real highlighter in:
 * swap `tokenize` with shiki's html output and you're done.
 */
export default function CodePreview({ body, language }: CodePreviewProps): React.ReactElement {
  const html = tokenize(body);
  return (
    <div className="h-full w-full overflow-auto bg-slate-950 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
          <span className="rounded bg-slate-800 px-2 py-0.5 font-mono">{language ?? 'plaintext'}</span>
          <span>{body.split('\n').length} lines</span>
        </div>
        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm leading-relaxed">
          <code
            className="font-mono text-slate-200"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </pre>
      </div>
    </div>
  );
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
  'import', 'from', 'export', 'default', 'class', 'extends', 'new', 'this',
  'typeof', 'instanceof', 'in', 'of', 'await', 'async', 'try', 'catch',
  'throw', 'finally', 'true', 'false', 'null', 'undefined', 'interface',
  'type', 'enum', 'as', 'public', 'private', 'protected', 'static', 'readonly',
]);

function tokenize(code: string): string {
  const escaped = escape(code);
  // Block comments
  let out = escaped.replace(/\/\*[\s\S]*?\*\//g, (m) => `<span class="text-slate-500 italic">${m}</span>`);
  // Line comments
  out = out.replace(/(^|\n)(\s*\/\/[^\n]*)/g, (_m, lead: string, c: string) => `${lead}<span class="text-slate-500 italic">${c}</span>`);
  // Strings
  out = out.replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, (m) => `<span class="text-emerald-300">${m}</span>`);
  // Numbers
  out = out.replace(/\b\d+(\.\d+)?\b/g, (m) => `<span class="text-amber-300">${m}</span>`);
  // Keywords
  out = out.replace(/\b([a-zA-Z_$][\w$]*)\b/g, (m) =>
    KEYWORDS.has(m) ? `<span class="text-fuchsia-400">${m}</span>` : m
  );
  return out;
}
