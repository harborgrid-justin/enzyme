/**
 * Artifact sanitization helpers.
 *
 * Model-generated HTML and SVG are untrusted input. They render in two
 * isolation layers:
 *
 *   1. HTML artifacts render inside a `srcdoc` iframe with `sandbox="allow-scripts"`
 *      (no `allow-same-origin` — origin is "null", so scripts cannot reach the
 *      host page's DOM, cookies, or localStorage). On top of the sandbox we
 *      inject a strict Content-Security-Policy meta tag that whitelists only
 *      the Tailwind CDN for scripts and blocks all outbound network egress
 *      (`connect-src 'none'`) so an artifact cannot beacon out.
 *
 *   2. SVG artifacts render INLINE via `dangerouslySetInnerHTML`. There is no
 *      sandbox to fall back on, so we DOM-parse the SVG and strip every
 *      dangerous element (`<script>`, `<foreignObject>`, `<iframe>`, `<link>`,
 *      `<meta>`, `<style>`), every event-handler attribute (`on*`), and every
 *      `href` / `xlink:href` whose target is not a same-document fragment or a
 *      `data:image/...` URL. The XML walker handles single-quoted, unquoted,
 *      and namespaced attributes that a naive regex would miss.
 *
 * Both helpers are pure and safe to call on every render.
 */

/**
 * Injects a strict CSP + referrer policy into the artifact's `<head>` and
 * returns the augmented document. If the document has no `<head>`, the meta
 * tags are prepended to the first `<html>` tag, or to the very start of the
 * document as a last resort, so the CSP is always present before any script.
 *
 * The CSP allows only the Tailwind CDN for scripts, permits inline styles
 * (Tailwind generates them at runtime), allows images from data:/https:, and
 * BLOCKS all `connect-src` / `frame-src` / `form-action`, preventing the
 * artifact from exfiltrating data or being weaponized for clickjacking.
 */
export function withHtmlSecurityMeta(html: string): string {
  const csp = [
    "default-src 'none'",
    "script-src https://cdn.tailwindcss.com",
    "style-src 'unsafe-inline' https://cdn.tailwindcss.com",
    "img-src 'self' data: https:",
    "font-src data: https:",
    "connect-src 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');

  const meta =
    `<meta http-equiv="Content-Security-Policy" content="${csp}">` +
    `<meta name="referrer" content="no-referrer">`;

  if (/<head(\s[^>]*)?>/i.test(html)) {
    return html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${meta}`);
  }
  if (/<html(\s[^>]*)?>/i.test(html)) {
    return html.replace(
      /<html(\s[^>]*)?>/i,
      (match) => `${match}<head>${meta}</head>`
    );
  }
  return `<!DOCTYPE html><html><head>${meta}</head><body>${html}</body></html>`;
}

const DANGEROUS_ELEMENTS = new Set([
  'script',
  'foreignobject',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'style',
  'animate',
  'animatemotion',
  'animatetransform',
  'set',
]);

const HREF_BEARING_ELEMENTS = new Set(['use', 'image', 'a', 'feimage']);

/**
 * Sanitize SVG markup before mounting it into the host DOM.
 *
 * Uses the browser's XML parser to walk the tree so quoting style, namespaces,
 * and self-closing forms are handled correctly. Falls back to a defensive
 * regex sweep when no DOMParser is available (SSR, unit tests).
 */
export function sanitizeSvg(svg: string): string {
  if (typeof DOMParser === 'undefined') {
    return regexSanitizeSvg(svg);
  }
  try {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
      return regexSanitizeSvg(svg);
    }
    const root = doc.documentElement;
    sanitizeNode(root);
    return new XMLSerializer().serializeToString(root);
  } catch {
    return regexSanitizeSvg(svg);
  }
}

function sanitizeNode(node: Element): void {
  for (const attr of Array.from(node.attributes)) {
    const name = attr.name.toLowerCase();
    const localName = (attr.localName ?? name).toLowerCase();

    if (/^on/i.test(localName)) {
      node.removeAttributeNode(attr);
      continue;
    }
    if (localName === 'href' || (name === 'xlink:href')) {
      if (!isSafeHref(attr.value)) node.removeAttributeNode(attr);
      continue;
    }
    if (localName === 'style' && /expression\s*\(|javascript:/i.test(attr.value)) {
      node.removeAttributeNode(attr);
      continue;
    }
    // Block javascript: in any other attribute value (e.g. SMIL `from`/`to`).
    if (/javascript:/i.test(attr.value)) {
      node.removeAttributeNode(attr);
    }
  }

  const children = Array.from(node.children);
  for (const child of children) {
    const tag = child.localName.toLowerCase();
    if (DANGEROUS_ELEMENTS.has(tag)) {
      child.remove();
      continue;
    }
    if (HREF_BEARING_ELEMENTS.has(tag)) {
      const href = child.getAttribute('href') ?? child.getAttribute('xlink:href') ?? '';
      if (href !== '' && !isSafeHref(href)) {
        child.remove();
        continue;
      }
    }
    sanitizeNode(child);
  }
}

function isSafeHref(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === '') return true;
  if (trimmed.startsWith('#')) return true;
  if (/^data:image\//i.test(trimmed)) return true;
  return false;
}

/**
 * Regex fallback when DOMParser is unavailable. Intentionally aggressive —
 * favors over-stripping over under-stripping. Handles single-quoted,
 * double-quoted, and unquoted attribute values, and strips namespaced `xlink:`
 * event handlers as well as the standard `on*` ones.
 */
function regexSanitizeSvg(svg: string): string {
  return svg
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<script\b[^>]*\/?>/gi, '')
    .replace(/<foreignObject\b[\s\S]*?<\/foreignObject\s*>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, '')
    .replace(/<(iframe|object|embed|link|meta|use|image|animate|animateMotion|animateTransform|set)\b[^>]*\/?>(?:[\s\S]*?<\/\1\s*>)?/gi, '')
    .replace(/\s(?:xlink:)?on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(?:href|xlink:href)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi, '')
    .replace(/\sstyle\s*=\s*(?:"[^"]*(?:expression\s*\(|javascript:)[^"]*"|'[^']*(?:expression\s*\(|javascript:)[^']*')/gi, '');
}
