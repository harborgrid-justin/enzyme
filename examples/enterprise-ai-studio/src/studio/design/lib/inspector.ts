/**
 * Direct-manipulation inspector (feature #6).
 *
 * Parses an artifact body into a flat list of editable element nodes (tag,
 * text, inline style), and round-trips edits back into the source string —
 * no re-prompt required. Works on the markup string so it stays usable in the
 * no-backend studio and is trivially testable.
 */
import type { InspectedNode } from '../types';

interface RawNode {
  index: number;
  tag: string;
  attrsRaw: string;
  /** Character range of the opening tag's attribute section. */
  open: { start: number; end: number };
  /** Inner text immediately following the open tag (up to the next `<`). */
  text: { value: string; start: number; end: number };
}

const OPEN_TAG = /<([a-z][\w-]*)\b([^>]*)>/gi;

function rawNodes(html: string): RawNode[] {
  const nodes: RawNode[] = [];
  let index = 0;
  let m: RegExpExecArray | null;
  OPEN_TAG.lastIndex = 0;
  while ((m = OPEN_TAG.exec(html)) != null) {
    const tag = m[1]!.toLowerCase();
    const attrsRaw = m[2] ?? '';
    const openStart = m.index;
    const openEnd = m.index + m[0].length;
    const rest = html.slice(openEnd);
    const nextTag = rest.indexOf('<');
    const textValue = nextTag === -1 ? rest : rest.slice(0, nextTag);
    nodes.push({
      index,
      tag,
      attrsRaw,
      open: { start: openStart, end: openEnd },
      text: { value: textValue, start: openEnd, end: openEnd + textValue.length },
    });
    index += 1;
  }
  return nodes;
}

function parseStyle(attrsRaw: string): Record<string, string> {
  const styleMatch = /style="([^"]*)"/i.exec(attrsRaw);
  const style: Record<string, string> = {};
  if (styleMatch?.[1] != null) {
    for (const decl of styleMatch[1].split(';')) {
      const [prop, ...rest] = decl.split(':');
      if (prop != null && rest.length > 0) style[prop.trim()] = rest.join(':').trim();
    }
  }
  return style;
}

/** Flatten an artifact body into inspectable nodes. */
export function parseNodes(html: string): InspectedNode[] {
  return rawNodes(html).map((n) => ({
    path: n.index,
    tag: n.tag,
    text: n.text.value.trim(),
    style: parseStyle(n.attrsRaw),
  }));
}

function serializeStyle(style: Record<string, string>): string {
  return Object.entries(style)
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
}

/** Apply a text + style edit to the node at `path`, returning new HTML. */
export function applyNodeEdit(
  html: string,
  path: number,
  edit: { text?: string; style?: Record<string, string> }
): string {
  const nodes = rawNodes(html);
  const node = nodes[path];
  if (node == null) return html;

  let out = html;

  // Replace inner text first (later offset) so earlier offsets stay valid.
  if (edit.text != null) {
    out = out.slice(0, node.text.start) + edit.text + out.slice(node.text.end);
  }

  // Re-resolve the open tag against the (possibly) updated string.
  if (edit.style != null) {
    const refreshed = rawNodes(out)[path];
    if (refreshed != null) {
      const styleStr = serializeStyle(edit.style);
      const tagText = out.slice(refreshed.open.start, refreshed.open.end);
      const newTag = /style="[^"]*"/i.test(tagText)
        ? tagText.replace(/style="[^"]*"/i, `style="${styleStr}"`)
        : tagText.replace(/>$/, ` style="${styleStr}">`);
      out = out.slice(0, refreshed.open.start) + newTag + out.slice(refreshed.open.end);
    }
  }

  return out;
}
