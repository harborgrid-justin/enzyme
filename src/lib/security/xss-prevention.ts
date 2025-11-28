/**
 * @fileoverview XSS Prevention Utilities
 * @module @/lib/security/xss-prevention
 *
 * Comprehensive XSS (Cross-Site Scripting) prevention utilities for the
 * Harbor React Framework. Provides input sanitization, output encoding,
 * dangerous content detection, and safe HTML rendering alternatives.
 *
 * @see https://owasp.org/www-community/attacks/xss/
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
 *
 * @author Harbor Security Team
 * @version 1.0.0
 */

import type {
  HTMLEncodingContext,
  SanitizationOptions,
  DangerousContentResult,
  DangerousThreatType,
  ThreatDetail,
  SafeHTMLResult,
  SanitizedHTML,
  TagTransformer,
} from './types';
import {
  ALLOWED_HTML_TAGS,
  ALLOWED_HTML_ATTRIBUTES,
  ALLOWED_URL_SCHEMES,
} from '@/config/security.config';

// ============================================================================
// Constants
// ============================================================================

/**
 * HTML entity encoding map
 */
const HTML_ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Reverse HTML entity map for decoding
 */
const HTML_ENTITY_DECODE: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
  '&#x2F;': '/',
  '&#x60;': '`',
  '&#x3D;': '=',
  '&nbsp;': ' ',
};

/**
 * JavaScript escape sequences for string context
 */
const JS_ESCAPE: Readonly<Record<string, string>> = {
  '\\': '\\\\',
  "'": "\\'",
  '"': '\\"',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\0': '\\0',
  '<': '\\x3c',
  '>': '\\x3e',
  '/': '\\/',
};

/**
 * Dangerous patterns for XSS detection
 */
const DANGEROUS_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  type: DangerousThreatType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}> = [
  // Script injection
  {
    pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    type: 'script-injection',
    severity: 'critical',
    recommendation: 'Remove all script tags from user content',
  },
  {
    pattern: /<script[^>]*>/gi,
    type: 'script-injection',
    severity: 'critical',
    recommendation: 'Remove script opening tags',
  },
  // Event handlers
  {
    pattern: /\bon\w+\s*=/gi,
    type: 'event-handler',
    severity: 'critical',
    recommendation: 'Remove all on* event handler attributes',
  },
  // JavaScript URLs
  {
    pattern: /javascript\s*:/gi,
    type: 'javascript-url',
    severity: 'critical',
    recommendation: 'Remove javascript: protocol URLs',
  },
  {
    pattern: /vbscript\s*:/gi,
    type: 'javascript-url',
    severity: 'critical',
    recommendation: 'Remove vbscript: protocol URLs',
  },
  // Data URLs with potential script content
  {
    pattern: /data\s*:\s*text\/html/gi,
    type: 'data-url',
    severity: 'high',
    recommendation: 'Remove data: URLs with HTML content type',
  },
  {
    pattern: /data\s*:\s*[^,]*;base64/gi,
    type: 'data-url',
    severity: 'medium',
    recommendation: 'Validate data: URLs carefully',
  },
  // SVG scripts
  {
    pattern: /<svg[\s\S]*?onload/gi,
    type: 'svg-script',
    severity: 'critical',
    recommendation: 'Remove SVG elements with event handlers',
  },
  {
    pattern: /<svg[\s\S]*?<script/gi,
    type: 'svg-script',
    severity: 'critical',
    recommendation: 'Remove SVG elements containing scripts',
  },
  // Meta refresh
  {
    pattern: /<meta[^>]*http-equiv\s*=\s*["']?refresh/gi,
    type: 'meta-refresh',
    severity: 'high',
    recommendation: 'Remove meta refresh tags',
  },
  // Iframe injection
  {
    pattern: /<iframe[\s\S]*?>/gi,
    type: 'iframe-injection',
    severity: 'high',
    recommendation: 'Remove or validate iframe elements',
  },
  // Object/embed injection
  {
    pattern: /<(?:object|embed|applet)[\s\S]*?>/gi,
    type: 'object-embed',
    severity: 'critical',
    recommendation: 'Remove object, embed, and applet elements',
  },
  // Base tag hijacking
  {
    pattern: /<base[\s\S]*?>/gi,
    type: 'base-hijack',
    severity: 'critical',
    recommendation: 'Remove base tags from user content',
  },
  // Form action hijacking
  {
    pattern: /<form[\s\S]*?action\s*=/gi,
    type: 'form-action-hijack',
    severity: 'high',
    recommendation: 'Validate form action URLs',
  },
  // CSS expressions (legacy IE)
  {
    pattern: /expression\s*\(/gi,
    type: 'css-expression',
    severity: 'medium',
    recommendation: 'Remove CSS expression() calls',
  },
  {
    pattern: /url\s*\(\s*["']?\s*javascript:/gi,
    type: 'css-expression',
    severity: 'critical',
    recommendation: 'Remove javascript: URLs in CSS',
  },
  // Encoded payloads
  {
    pattern: /&#x?[0-9a-f]+;?\s*(?:&#x?[0-9a-f]+;?\s*){3,}/gi,
    type: 'encoded-payload',
    severity: 'medium',
    recommendation: 'Decode and validate HTML entities',
  },
  // Template injection (for template engines)
  {
    pattern: /\{\{[\s\S]*?\}\}/g,
    type: 'template-injection',
    severity: 'medium',
    recommendation: 'Escape template delimiters',
  },
  {
    pattern: /\$\{[\s\S]*?\}/g,
    type: 'template-injection',
    severity: 'medium',
    recommendation: 'Escape template literals',
  },
];

/**
 * Dangerous tag names that should always be removed
 */
const DANGEROUS_TAGS: ReadonlySet<string> = new Set([
  'script',
  'style',
  'link',
  'meta',
  'base',
  'object',
  'embed',
  'applet',
  'form',
  'input',
  'button',
  'select',
  'textarea',
  'iframe',
  'frame',
  'frameset',
  'layer',
  'ilayer',
  'bgsound',
  'title',
  'head',
  'html',
  'body',
  'xml',
  'blink',
  'marquee',
  'plaintext',
  'xmp',
  'noscript',
  'template',
]);

/**
 * Dangerous attributes that should always be removed
 */
const DANGEROUS_ATTRIBUTES: ReadonlySet<string> = new Set([
  // Event handlers
  'onabort', 'onafterprint', 'onanimationend', 'onanimationiteration',
  'onanimationstart', 'onauxclick', 'onbeforecopy', 'onbeforecut',
  'onbeforeinput', 'onbeforepaste', 'onbeforeprint', 'onbeforeunload',
  'onblur', 'oncancel', 'oncanplay', 'oncanplaythrough', 'onchange',
  'onclick', 'onclose', 'oncontextmenu', 'oncopy', 'oncuechange',
  'oncut', 'ondblclick', 'ondrag', 'ondragend', 'ondragenter',
  'ondragleave', 'ondragover', 'ondragstart', 'ondrop', 'ondurationchange',
  'onemptied', 'onended', 'onerror', 'onfocus', 'onfocusin', 'onfocusout',
  'onformdata', 'onfullscreenchange', 'onfullscreenerror', 'ongotpointercapture',
  'onhashchange', 'oninput', 'oninvalid', 'onkeydown', 'onkeypress',
  'onkeyup', 'onlanguagechange', 'onload', 'onloadeddata', 'onloadedmetadata',
  'onloadstart', 'onlostpointercapture', 'onmessage', 'onmessageerror',
  'onmousedown', 'onmouseenter', 'onmouseleave', 'onmousemove', 'onmouseout',
  'onmouseover', 'onmouseup', 'onmousewheel', 'onoffline', 'ononline',
  'onpagehide', 'onpageshow', 'onpaste', 'onpause', 'onplay', 'onplaying',
  'onpointercancel', 'onpointerdown', 'onpointerenter', 'onpointerleave',
  'onpointermove', 'onpointerout', 'onpointerover', 'onpointerup',
  'onpopstate', 'onprogress', 'onratechange', 'onrejectionhandled',
  'onreset', 'onresize', 'onscroll', 'onsearch', 'onseeked', 'onseeking',
  'onselect', 'onselectionchange', 'onselectstart', 'onshow', 'onstalled',
  'onstorage', 'onsubmit', 'onsuspend', 'ontimeupdate', 'ontoggle',
  'ontouchcancel', 'ontouchend', 'ontouchmove', 'ontouchstart',
  'ontransitioncancel', 'ontransitionend', 'ontransitionrun', 'ontransitionstart',
  'onunhandledrejection', 'onunload', 'onvolumechange', 'onwaiting',
  'onwebkitanimationend', 'onwebkitanimationiteration', 'onwebkitanimationstart',
  'onwebkittransitionend', 'onwheel',
  // Other dangerous attributes
  'formaction',
  'xlink:href',
  'xmlns',
]);

// ============================================================================
// Encoding Functions
// ============================================================================

/**
 * Encode a string for safe insertion into HTML content
 * @param input - The string to encode
 * @returns HTML-encoded string
 */
export function encodeHTML(input: string): string {
  if (!input) return '';

  return input.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] ?? char);
}

/**
 * Encode a string for safe insertion into an HTML attribute
 * More aggressive encoding than content encoding
 * @param input - The string to encode
 * @returns Attribute-safe encoded string
 */
export function encodeHTMLAttribute(input: string): string {
  if (!input) return '';

  // Encode all non-alphanumeric characters
  return input.replace(/[^a-zA-Z0-9]/g, (char) => {
    const code = char.charCodeAt(0);
    if (code < 256) {
      return `&#x${code.toString(16).padStart(2, '0')};`;
    }
    return `&#x${code.toString(16)};`;
  });
}

/**
 * Encode a string for safe insertion into JavaScript context
 * @param input - The string to encode
 * @returns JavaScript-safe encoded string
 */
export function encodeJavaScript(input: string): string {
  if (!input) return '';

  return input.replace(/[\\'"\n\r\t\0<>/]/g, (char) => JS_ESCAPE[char] ?? char);
}

/**
 * Encode a string for safe insertion into CSS context
 * @param input - The string to encode
 * @returns CSS-safe encoded string
 */
export function encodeCSS(input: string): string {
  if (!input) return '';

  // Encode non-alphanumeric characters as CSS escape sequences
  return input.replace(/[^a-zA-Z0-9]/g, (char) => {
    const code = char.charCodeAt(0);
    return `\\${code.toString(16)} `;
  });
}

/**
 * Encode a string for safe insertion into a URL
 * @param input - The string to encode
 * @returns URL-encoded string
 */
export function encodeURL(input: string): string {
  if (!input) return '';

  return encodeURIComponent(input);
}

/**
 * Encode a string for safe use as a URL parameter
 * @param input - The string to encode
 * @returns URL parameter safe string
 */
export function encodeURLParam(input: string): string {
  if (!input) return '';

  // encodeURIComponent doesn't encode: !'()*
  return encodeURIComponent(input).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

/**
 * Context-aware encoding function
 * @param input - The string to encode
 * @param context - The encoding context
 * @returns Encoded string
 */
export function encodeForContext(
  input: string,
  context: HTMLEncodingContext
): string {
  switch (context) {
    case 'html-content':
      return encodeHTML(input);
    case 'html-attribute':
      return encodeHTMLAttribute(input);
    case 'javascript':
      return encodeJavaScript(input);
    case 'css':
      return encodeCSS(input);
    case 'url':
      return encodeURL(input);
    case 'url-param':
      return encodeURLParam(input);
    default: {
      // Exhaustive check
      const _exhaustive: never = context;
      return _exhaustive;
    }
  }
}

/**
 * Decode HTML entities
 * @param input - The string with HTML entities
 * @returns Decoded string
 */
export function decodeHTML(input: string): string {
  if (!input) return '';

  // First decode named entities
  let result = input;
  for (const [entity, char] of Object.entries(HTML_ENTITY_DECODE)) {
    result = result.replace(new RegExp(entity, 'gi'), char);
  }

  // Decode numeric entities
  result = result.replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  result = result.replace(/&#(\d+);?/g, (_, dec: string) =>
    String.fromCharCode(parseInt(dec, 10))
  );

  return result;
}

// ============================================================================
// Sanitization Functions
// ============================================================================

/**
 * Default sanitization options
 */
const DEFAULT_SANITIZATION_OPTIONS: Required<SanitizationOptions> = {
  allowedTags: ALLOWED_HTML_TAGS,
  allowedAttributes: ALLOWED_HTML_ATTRIBUTES,
  allowedSchemes: ALLOWED_URL_SCHEMES,
  allowDataUrls: false,
  stripAllHtml: false,
  maxLength: 100000, // 100KB
  transformTags: {},
};

/**
 * Sanitize HTML content
 * Removes dangerous elements and attributes while preserving safe content
 *
 * @param input - The HTML string to sanitize
 * @param options - Sanitization options
 * @returns Safe HTML result
 */
export function sanitizeHTML(
  input: string,
  options: SanitizationOptions = {}
): SafeHTMLResult {
  const opts = { ...DEFAULT_SANITIZATION_OPTIONS, ...options };
  const removedItems: string[] = [];
  const warnings: string[] = [];

  if (!input) {
    return {
      html: '',
      wasModified: false,
      removedItems: [],
      warnings: [],
    };
  }

  // Enforce max length
  let html = input;
  if (html.length > opts.maxLength) {
    html = html.slice(0, opts.maxLength);
    warnings.push(`Content truncated to ${opts.maxLength} characters`);
  }

  // Strip all HTML if requested
  if (opts.stripAllHtml) {
    const stripped = stripTags(html);
    return {
      html: encodeHTML(stripped),
      wasModified: html !== stripped,
      removedItems: ['[all HTML tags]'],
      warnings,
    };
  }

  // Parse and sanitize
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<div id="sanitize-root">${html}</div>`,
    'text/html'
  );
  const root = doc.getElementById('sanitize-root');

  if (!root) {
    return {
      html: encodeHTML(input),
      wasModified: true,
      removedItems: ['[failed to parse]'],
      warnings: ['Failed to parse HTML content'],
    };
  }

  // Walk the DOM and sanitize
  sanitizeNode(root, opts, removedItems);

  const sanitized = root.innerHTML;

  return {
    html: sanitized as SanitizedHTML,
    wasModified: sanitized !== input,
    removedItems,
    warnings,
  };
}

/**
 * Recursively sanitize a DOM node
 */
function sanitizeNode(
  node: Node,
  opts: Required<SanitizationOptions>,
  removedItems: string[]
): void {
  const nodesToRemove: Node[] = [];

  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const element = child as Element;
      const tagName = element.tagName.toLowerCase();

      // Check if tag is allowed
      if (!isAllowedTag(tagName, opts.allowedTags)) {
        nodesToRemove.push(element);
        removedItems.push(`<${tagName}>`);
        continue;
      }

      // Apply tag transformers
      const transformer = opts.transformTags[tagName];
      if (transformer) {
        const attrs: Record<string, string> = {};
        for (const attr of Array.from(element.attributes)) {
          attrs[attr.name] = attr.value;
        }

        const result = transformer(tagName, attrs);
        if (result === null) {
          nodesToRemove.push(element);
          removedItems.push(`<${tagName}> (transformer rejected)`);
          continue;
        }

        // Apply transformed attributes
        for (const attr of Array.from(element.attributes)) {
          if (!(attr.name in result.attributes)) {
            element.removeAttribute(attr.name);
          }
        }
        for (const [name, value] of Object.entries(result.attributes)) {
          element.setAttribute(name, value);
        }
      }

      // Sanitize attributes
      sanitizeAttributes(element, opts, removedItems);

      // Recursively sanitize children
      sanitizeNode(element, opts, removedItems);
    } else if (child.nodeType === Node.COMMENT_NODE) {
      // Remove comments (can contain conditional IE code)
      nodesToRemove.push(child);
      removedItems.push('<!-- comment -->');
    }
  }

  // Remove collected nodes
  for (const nodeToRemove of nodesToRemove) {
    nodeToRemove.parentNode?.removeChild(nodeToRemove);
  }
}

/**
 * Sanitize element attributes
 */
function sanitizeAttributes(
  element: Element,
  opts: Required<SanitizationOptions>,
  removedItems: string[]
): void {
  const tagName = element.tagName.toLowerCase();
  const attributesToRemove: string[] = [];

  for (const attr of Array.from(element.attributes)) {
    const attrName = attr.name.toLowerCase();

    // Check if attribute is dangerous
    if (isDangerousAttribute(attrName)) {
      attributesToRemove.push(attrName);
      removedItems.push(`${attrName} (dangerous)`);
      continue;
    }

    // Check if attribute is allowed for this tag
    if (!isAllowedAttribute(tagName, attrName, opts.allowedAttributes)) {
      attributesToRemove.push(attrName);
      removedItems.push(`${attrName} on <${tagName}>`);
      continue;
    }

    // Validate URL attributes
    if (isUrlAttribute(attrName)) {
      const sanitizedUrl = sanitizeUrl(
        attr.value,
        opts.allowedSchemes,
        opts.allowDataUrls
      );
      if (sanitizedUrl === null) {
        attributesToRemove.push(attrName);
        removedItems.push(`${attrName}="${attr.value}" (invalid URL)`);
      } else if (sanitizedUrl !== attr.value) {
        element.setAttribute(attrName, sanitizedUrl);
      }
    }
  }

  // Remove collected attributes
  for (const attrName of attributesToRemove) {
    element.removeAttribute(attrName);
  }
}

/**
 * Check if a tag is allowed
 */
function isAllowedTag(
  tagName: string,
  allowedTags: readonly string[]
): boolean {
  // Dangerous tags are never allowed
  if (DANGEROUS_TAGS.has(tagName)) {
    return false;
  }
  return allowedTags.includes(tagName);
}

/**
 * Check if an attribute is dangerous
 */
function isDangerousAttribute(attrName: string): boolean {
  // Check exact match
  if (DANGEROUS_ATTRIBUTES.has(attrName)) {
    return true;
  }

  // Check for event handlers (on*)
  if (attrName.startsWith('on')) {
    return true;
  }

  return false;
}

/**
 * Check if an attribute is allowed for a tag
 */
function isAllowedAttribute(
  tagName: string,
  attrName: string,
  allowedAttributes: Readonly<Record<string, readonly string[]>>
): boolean {
  // Check global attributes
  const globalAttrs = allowedAttributes['*'] ?? [];
  if (matchesAttributePattern(attrName, globalAttrs)) {
    return true;
  }

  // Check tag-specific attributes
  const tagAttrs = allowedAttributes[tagName];
  if (tagAttrs && matchesAttributePattern(attrName, tagAttrs)) {
    return true;
  }

  return false;
}

/**
 * Check if attribute matches any pattern in the list
 */
function matchesAttributePattern(
  attrName: string,
  patterns: readonly string[]
): boolean {
  for (const pattern of patterns) {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      if (attrName.startsWith(prefix)) {
        return true;
      }
    } else if (pattern === attrName) {
      return true;
    }
  }
  return false;
}

/**
 * Check if attribute is a URL attribute
 */
function isUrlAttribute(attrName: string): boolean {
  return ['href', 'src', 'action', 'formaction', 'data', 'poster', 'srcset'].includes(
    attrName
  );
}

/**
 * Sanitize a URL value
 */
function sanitizeUrl(
  url: string,
  allowedSchemes: readonly string[],
  allowDataUrls: boolean
): string | null {
  const trimmed = url.trim();

  // Empty URLs are allowed
  if (!trimmed) {
    return '';
  }

  // Check for javascript: and other dangerous protocols
  const lowerUrl = trimmed.toLowerCase().replace(/\s+/g, '');
  if (
    lowerUrl.startsWith('javascript:') ||
    lowerUrl.startsWith('vbscript:') ||
    lowerUrl.startsWith('data:text/html')
  ) {
    return null;
  }

  // Handle data: URLs
  if (lowerUrl.startsWith('data:')) {
    if (!allowDataUrls) {
      return null;
    }
    // Only allow safe data URL types
    if (
      !lowerUrl.startsWith('data:image/') &&
      !lowerUrl.startsWith('data:audio/') &&
      !lowerUrl.startsWith('data:video/')
    ) {
      return null;
    }
  }

  // Check scheme
  try {
    const parsed = new URL(trimmed, 'https://example.com');
    const scheme = parsed.protocol.slice(0, -1); // Remove trailing :

    // Relative URLs are okay
    if (trimmed.startsWith('/') || trimmed.startsWith('.')) {
      return trimmed;
    }

    // Check allowed schemes
    if (!allowedSchemes.includes(scheme)) {
      return null;
    }
  } catch {
    // If URL parsing fails, check if it's a relative URL
    if (!trimmed.includes(':')) {
      return trimmed;
    }
    return null;
  }

  return trimmed;
}

/**
 * Strip all HTML tags from a string
 */
export function stripTags(input: string): string {
  if (!input) return '';

  // Use DOM parser for accurate tag stripping
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, 'text/html');
  return doc.body.textContent ?? '';
}

// ============================================================================
// Dangerous Content Detection
// ============================================================================

/**
 * Detect dangerous content in input
 * @param input - The content to analyze
 * @returns Detection result with threat details
 */
export function detectDangerousContent(input: string): DangerousContentResult {
  if (!input) {
    return {
      isDangerous: false,
      threats: [],
      details: [],
      sanitized: '',
    };
  }

  const threats: DangerousThreatType[] = [];
  const details: ThreatDetail[] = [];

  // Check against all dangerous patterns
  for (const { pattern, type, severity, recommendation } of DANGEROUS_PATTERNS) {
    // Clone regex to reset lastIndex
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(input)) !== null) {
      if (!threats.includes(type)) {
        threats.push(type);
      }

      details.push({
        type,
        pattern: pattern.source,
        position: match.index,
        match: match[0],
        severity,
        recommendation,
      });
    }
  }

  // Sanitize the content
  const { html: sanitized } = sanitizeHTML(input);

  return {
    isDangerous: threats.length > 0,
    threats,
    details,
    sanitized,
  };
}

/**
 * Check if content contains any dangerous patterns
 * Fast check without detailed analysis
 */
export function isDangerous(input: string): boolean {
  if (!input) return false;

  for (const { pattern } of DANGEROUS_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// Safe Alternatives to dangerouslySetInnerHTML
// ============================================================================

/**
 * Create safe props for setting HTML content in React
 * @param content - The HTML content
 * @param options - Sanitization options
 * @returns Props object for React element
 */
export function createSafeHTMLProps(
  content: string,
  options?: SanitizationOptions
): { dangerouslySetInnerHTML: { __html: string } } {
  const { html } = sanitizeHTML(content, options);
  return {
    dangerouslySetInnerHTML: { __html: html },
  };
}

/**
 * Create a text-only version (no HTML)
 * @param content - The HTML content
 * @returns Plain text props
 */
export function createTextOnlyProps(
  content: string
): { children: string } {
  const text = stripTags(decodeHTML(content));
  return { children: text };
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate that a string is safe for the given context
 */
export function isContextSafe(
  input: string,
  context: HTMLEncodingContext
): boolean {
  switch (context) {
    case 'html-content':
      return !/<[^>]*>/g.test(input);
    case 'html-attribute':
      return !/["'<>&]/g.test(input);
    case 'javascript':
      return !/[\\'"\n\r\t\0<>]/g.test(input);
    case 'css':
      return !/[{}<>()\\;]/g.test(input);
    case 'url':
    case 'url-param':
      return !/[^a-zA-Z0-9\-._~]/g.test(input);
    default:
      return false;
  }
}

/**
 * Validate an email address format
 */
export function isValidEmail(email: string): boolean {
  // RFC 5322 compliant regex (simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Validate a URL format
 */
export function isValidURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// ============================================================================
// React-specific Utilities
// ============================================================================

/**
 * Create a safe ref callback that validates innerHTML
 */
export function createSafeInnerHTMLRef(
  html: string,
  options?: SanitizationOptions
): (element: HTMLElement | null) => void {
  const { html: sanitized } = sanitizeHTML(html, options);

  return (element: HTMLElement | null) => {
    if (element) {
      element.innerHTML = sanitized;
    }
  };
}

/**
 * Type guard for sanitized HTML
 */
export function isSanitizedHTML(value: unknown): value is SanitizedHTML {
  if (typeof value !== 'string') {
    return false;
  }
  const result = detectDangerousContent(value);
  return !result.isDangerous;
}

/**
 * Assert that a string is sanitized HTML
 * @throws Error if content is dangerous
 */
export function assertSanitizedHTML(content: string): SanitizedHTML {
  const result = detectDangerousContent(content);
  if (result.isDangerous) {
    throw new Error(
      `Content contains dangerous patterns: ${result.threats.join(', ')}`
    );
  }
  return content as SanitizedHTML;
}

// ============================================================================
// Export Types
// ============================================================================

export type {
  HTMLEncodingContext,
  SanitizationOptions,
  DangerousContentResult,
  DangerousThreatType,
  ThreatDetail,
  SafeHTMLResult,
  SanitizedHTML,
  TagTransformer,
};
