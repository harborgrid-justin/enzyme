/**
 * Figma interop (feature #7).
 *
 * A pragmatic bridge — not a full Figma plugin — that maps between an HTML
 * page body and a Figma-style node tree (FRAME + TEXT/RECTANGLE children).
 * Importing a frame yields a starter page; exporting a page yields JSON a
 * Figma importer can consume.
 */
import type { DesignPage } from '../types';

export interface FigmaNode {
  type: 'FRAME' | 'TEXT' | 'RECTANGLE';
  name: string;
  characters?: string;
  fills?: Array<{ color: string }>;
  children?: FigmaNode[];
}

export interface FigmaDocument {
  name: string;
  frame: FigmaNode;
}

/** Export a page to a Figma-style document. */
export function pageToFigma(page: DesignPage): FigmaDocument {
  const children: FigmaNode[] = [];
  for (const m of page.body.matchAll(/<(h[1-6]|p|button|a)\b[^>]*>([^<]+)</gi)) {
    children.push({ type: 'TEXT', name: m[1]!.toUpperCase(), characters: m[2]!.trim() });
  }
  for (const m of page.body.matchAll(/#[0-9a-f]{6}/gi)) {
    children.push({ type: 'RECTANGLE', name: 'Fill', fills: [{ color: m[0] }] });
  }
  return {
    name: page.name,
    frame: { type: 'FRAME', name: page.route, children },
  };
}

/** Import a Figma document into a starter page body. */
export function figmaToPage(doc: FigmaDocument, id: string): DesignPage {
  const parts: string[] = [];
  const walk = (node: FigmaNode): void => {
    if (node.type === 'TEXT' && node.characters != null) {
      const tag = /^H[1-6]$/.test(node.name) ? node.name.toLowerCase() : 'p';
      parts.push(`<${tag}>${node.characters}</${tag}>`);
    }
    if (node.type === 'RECTANGLE' && node.fills?.[0] != null) {
      parts.push(`<div style="background:${node.fills[0].color};height:48px"></div>`);
    }
    node.children?.forEach(walk);
  };
  walk(doc.frame);
  return {
    id,
    name: doc.name,
    route: doc.frame.name.startsWith('/') ? doc.frame.name : `/${slug(doc.name)}`,
    body: `<main style="padding:24px;font-family:system-ui">\n  ${parts.join('\n  ')}\n</main>`,
  };
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
