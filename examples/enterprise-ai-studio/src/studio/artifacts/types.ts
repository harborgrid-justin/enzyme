/**
 * Artifacts — the "Claude Artifacts" equivalent.
 *
 * An artifact is a structured deliverable the assistant produces (an HTML
 * page, an SVG, a markdown document, a code file). Each iteration the user
 * runs produces a new version, and the studio shows a live preview alongside
 * the chat.
 *
 * On the wire, the assistant emits artifacts as `<artifact …>…</artifact>`
 * blocks inside its streaming response. The studio's parser strips those
 * blocks out of the rendered message and routes them into the artifact store
 * where the preview pane renders them.
 */

export type ArtifactKind = 'html' | 'svg' | 'markdown' | 'code';

export interface ArtifactVersion {
  /** Stable per-version id (used for keys + diff history). */
  id: string;
  /** Order — 1-indexed, increments per iteration in the same conversation. */
  version: number;
  /** Human-readable label (e.g. "Initial draft", "Darker theme"). */
  label: string;
  kind: ArtifactKind;
  /** Language hint for code artifacts (typescript, python, rust, …). */
  language?: string;
  /** The actual body of the artifact (HTML markup, SVG markup, markdown, …). */
  body: string;
  /** ISO timestamp. */
  createdAt: string;
  /** Provider + model that produced this version. */
  model?: { provider: string; id: string; label: string };
  /** Mirror of `body.length` once streaming completes; used by the toolbar. */
  byteLength: number;
}

export interface Artifact {
  /** Stable identifier — versions live under this id. */
  id: string;
  /** The conversation this artifact belongs to. */
  conversationId: string;
  /** Display title (taken from the artifact's `title=` attribute). */
  title: string;
  /** All versions in iteration order (newest last). */
  versions: ArtifactVersion[];
}
