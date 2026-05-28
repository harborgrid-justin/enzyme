/**
 * Streaming artifact parser.
 *
 * Scans assistant output for `<artifact …>…</artifact>` blocks as the stream
 * arrives. Designed to be resilient to chunk boundaries: the parser keeps a
 * buffer of trailing text that hasn't yet matched either an opening tag or a
 * closing tag, and only emits artifacts once the close tag is seen.
 *
 * It also emits **partial updates** while an artifact is mid-stream so the
 * preview pane can render incrementally (the live-iterating effect — you see
 * the page take shape as the model types it).
 */
import type { ArtifactKind } from './types';

const OPEN_TAG = /<artifact(\s[^>]*)?>/i;
const CLOSE_TAG = /<\/artifact>/i;
const ATTR_RE = /(\w+)\s*=\s*"([^"]*)"/g;

export interface ParsedArtifactEvent {
  /** Stable per-artifact id pulled from the `id=` attribute. */
  artifactId: string;
  /** Display title (from `title=` attribute). */
  title: string;
  kind: ArtifactKind;
  /** Language hint, only meaningful for `kind: 'code'`. */
  language?: string;
  /** Iteration label (from `label=` attribute, e.g. "Darker theme"). */
  label?: string;
  /** Current body content, possibly partial. */
  body: string;
  /** Whether the closing `</artifact>` has been seen. */
  complete: boolean;
}

interface OpenArtifact {
  artifactId: string;
  title: string;
  kind: ArtifactKind;
  language?: string;
  label?: string;
  /** Position in the FULL text where the body starts (right after `>`). */
  bodyStart: number;
}

/**
 * Walks the full streaming text on each tick and returns:
 *   - `visibleText`: the assistant text with artifact tags removed (and a
 *     placeholder chip token left in their place so messages can link out).
 *   - `events`: one event per artifact found, with `complete` set once closed.
 *
 * Pure / idempotent: callers can invoke it on every chunk update.
 */
export function parseArtifacts(text: string): {
  visibleText: string;
  events: ParsedArtifactEvent[];
} {
  const events: ParsedArtifactEvent[] = [];
  let cursor = 0;
  let visible = '';

  while (cursor < text.length) {
    OPEN_TAG.lastIndex = 0;
    const remaining = text.slice(cursor);
    const openMatch = remaining.match(OPEN_TAG);

    if (!openMatch || openMatch.index == null) {
      visible += remaining;
      break;
    }

    // Everything before the open tag passes through to visible text.
    visible += remaining.slice(0, openMatch.index);

    const openStartGlobal = cursor + openMatch.index;
    const openEndGlobal = openStartGlobal + openMatch[0].length;
    const open = readAttributes(openMatch[1] ?? '');

    // Scan for the matching close tag from where the open tag ended.
    const afterOpen = text.slice(openEndGlobal);
    const closeMatch = afterOpen.match(CLOSE_TAG);

    if (!closeMatch || closeMatch.index == null) {
      // Incomplete artifact mid-stream — emit a partial event and stop.
      const body = afterOpen;
      const artifact: OpenArtifact = { ...open, bodyStart: openEndGlobal };
      events.push(eventFor(artifact, body, false));
      visible += `[Artifact: ${open.title}]`;
      return { visibleText: visible, events };
    }

    const body = afterOpen.slice(0, closeMatch.index);
    const artifact: OpenArtifact = { ...open, bodyStart: openEndGlobal };
    events.push(eventFor(artifact, body, true));
    visible += `[Artifact: ${open.title}]`;

    cursor = openEndGlobal + closeMatch.index + closeMatch[0].length;
  }

  return { visibleText: visible.replace(/\n{3,}/g, '\n\n').trim(), events };
}

function eventFor(a: OpenArtifact, body: string, complete: boolean): ParsedArtifactEvent {
  return {
    artifactId: a.artifactId,
    title: a.title,
    kind: a.kind,
    language: a.language,
    label: a.label,
    body,
    complete,
  };
}

function readAttributes(raw: string): Omit<OpenArtifact, 'bodyStart'> {
  ATTR_RE.lastIndex = 0;
  const attrs: Record<string, string> = {};
  let match: RegExpExecArray | null = ATTR_RE.exec(raw);
  while (match != null) {
    attrs[match[1].toLowerCase()] = match[2];
    match = ATTR_RE.exec(raw);
  }
  return {
    artifactId: attrs.id ?? `artifact-${Math.random().toString(36).slice(2, 10)}`,
    title: attrs.title ?? 'Untitled artifact',
    kind: ((attrs.type ?? 'code') as ArtifactKind),
    language: attrs.language,
    label: attrs.label,
  };
}
