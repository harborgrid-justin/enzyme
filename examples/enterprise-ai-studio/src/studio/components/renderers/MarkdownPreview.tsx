import { useMemo } from 'react';

interface MarkdownPreviewProps {
  body: string;
}

/**
 * Minimal markdown→HTML renderer. We deliberately don't bring in
 * `marked`/`markdown-it` to keep the example dependency-free; this covers the
 * subset the assistant emits (headings, lists, emphasis, code, blockquote,
 * tables) and route-escapes the input first so untrusted markdown can't smuggle
 * raw HTML into the page.
 */
export default function MarkdownPreview({ body }: MarkdownPreviewProps): React.ReactElement {
  const html = useMemo(() => renderMarkdown(body), [body]);

  return (
    <div className="h-full w-full overflow-y-auto bg-white p-10">
      <article
        className="prose mx-auto max-w-3xl text-slate-800"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em] text-slate-800">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a class="text-indigo-600 underline" href="$2" rel="noopener noreferrer" target="_blank">$1</a>');
}

function renderMarkdown(raw: string): string {
  const lines = escapeHtml(raw).split('\n');
  let out = '';
  let inTable = false;
  let inList = false;

  function closeList(): void {
    if (inList) {
      out += '</ul>\n';
      inList = false;
    }
  }
  function closeTable(): void {
    if (inTable) {
      out += '</tbody></table>\n';
      inTable = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line == null) continue;

    if (/^#{1,3} /.test(line)) {
      closeList();
      closeTable();
      const level = line.match(/^#+/)?.[0].length ?? 1;
      const text = renderInline(line.replace(/^#+\s+/, ''));
      const sizes = ['text-3xl font-bold mt-6 mb-3', 'text-2xl font-semibold mt-5 mb-2', 'text-lg font-semibold mt-4 mb-2'];
      out += `<h${level} class="${sizes[level - 1] ?? ''}">${text}</h${level}>\n`;
      continue;
    }

    if (/^>\s+/.test(line)) {
      closeList();
      closeTable();
      out += `<blockquote class="my-3 border-l-4 border-slate-200 pl-3 italic text-slate-600">${renderInline(line.replace(/^>\s+/, ''))}</blockquote>\n`;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      closeTable();
      if (!inList) {
        out += '<ul class="my-3 ml-6 list-disc space-y-1">\n';
        inList = true;
      }
      out += `<li>${renderInline(line.replace(/^\s*[-*]\s+/, ''))}</li>\n`;
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      closeTable();
      if (!inList) {
        out += '<ol class="my-3 ml-6 list-decimal space-y-1">\n';
        inList = true;
      }
      out += `<li>${renderInline(line.replace(/^\s*\d+\.\s+/, ''))}</li>\n`;
      continue;
    }

    if (/^\|.*\|$/.test(line)) {
      closeList();
      const cells = line.slice(1, -1).split('|').map((c) => c.trim());
      const isDivider = cells.every((c) => /^[:\-\s]+$/.test(c));
      if (isDivider) continue;
      if (!inTable) {
        out += '<table class="my-3 w-full text-left text-sm"><thead><tr>';
        for (const cell of cells) {
          out += `<th class="border-b border-slate-200 px-2 py-1 font-semibold">${renderInline(cell)}</th>`;
        }
        out += '</tr></thead><tbody>';
        inTable = true;
        continue;
      }
      out += '<tr>';
      for (const cell of cells) {
        out += `<td class="border-b border-slate-100 px-2 py-1">${renderInline(cell)}</td>`;
      }
      out += '</tr>\n';
      continue;
    }

    if (line.trim() === '') {
      closeList();
      closeTable();
      continue;
    }

    closeList();
    closeTable();
    out += `<p class="my-2 leading-relaxed">${renderInline(line)}</p>\n`;
  }

  closeList();
  closeTable();
  return out;
}
