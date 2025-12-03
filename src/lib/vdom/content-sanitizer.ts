/**
 * Dangerous HTML patterns to sanitize.
 */
const DANGEROUS_PATTERNS: RegExp[] = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:/gi,
  /<iframe\b[^>]*>/gi,
  /<object\b[^>]*>/gi,
  /<embed\b[^>]*>/gi,
  /<form\b[^>]*>/gi,
  /expression\s*\(/gi,
  /url\s*\(/gi,
];

/**
 * Safe HTML tags whitelist.
 */
const SAFE_TAGS = new Set([
  'a',
  'abbr',
  'b',
  'blockquote',
  'br',
  'code',
  'dd',
  'div',
  'dl',
  'dt',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  'q',
  's',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);

/**
 * Safe attributes whitelist.
 */
const SAFE_ATTRIBUTES = new Set([
  'alt',
  'class',
  'dir',
  'height',
  'href',
  'id',
  'lang',
  'name',
  'rel',
  'src',
  'style',
  'target',
  'title',
  'type',
  'width',
]);

/**
 * URL schemes whitelist.
 */
const SAFE_URL_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/**
 * Safe CSS properties whitelist.
 */
const SAFE_CSS_PROPERTIES = new Set([
  // Layout
  'display',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'float',
  'clear',
  'visibility',
  'overflow',
  'overflow-x',
  'overflow-y',
  'z-index',
  // Sizing
  'width',
  'height',
  'min-width',
  'max-width',
  'min-height',
  'max-height',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'box-sizing',
  // Typography
  'font',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'font-variant',
  'line-height',
  'letter-spacing',
  'word-spacing',
  'text-align',
  'text-decoration',
  'text-transform',
  'text-indent',
  'white-space',
  'word-wrap',
  'word-break',
  'vertical-align',
  // Colors
  'color',
  'background',
  'background-color',
  'background-position',
  'background-repeat',
  'background-size',
  'border-color',
  'opacity',
  // Borders
  'border',
  'border-width',
  'border-style',
  'border-color',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-radius',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius',
  'outline',
  'outline-width',
  'outline-style',
  'outline-color',
  // Flexbox
  'flex',
  'flex-direction',
  'flex-wrap',
  'flex-flow',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'justify-content',
  'align-items',
  'align-self',
  'align-content',
  'order',
  'gap',
  'row-gap',
  'column-gap',
  // Grid (basic)
  'grid-template-columns',
  'grid-template-rows',
  'grid-column',
  'grid-row',
  'grid-gap',
  // Table
  'table-layout',
  'border-collapse',
  'border-spacing',
  // Misc safe properties
  'cursor',
  'list-style',
  'list-style-type',
  'list-style-position',
  'pointer-events',
  'user-select',
]);

/**
 * Dangerous patterns in CSS values that should block the property.
 */
const DANGEROUS_CSS_VALUE_PATTERNS = [
  /url\s*\(/i,
  /expression\s*\(/i,
  /javascript\s*:/i,
  /behavior\s*:/i,
  /-moz-binding\s*:/i,
  /@import/i,
  /\\[0-9a-f]/i,  // Encoded characters
];

/**
 * Escapes HTML special characters.
 * @param str - String to escape
 * @returns Escaped string
 */
function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };

  return str.replace(/[&<>"'`=/]/g, (char) => htmlEscapes[char] ?? char);
}

/**
 * Validates a URL against safe schemes.
 * @param url - URL to validate
 * @returns Whether URL is safe
 */
function isUrlSafe(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return SAFE_URL_SCHEMES.has(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Sanitizes HTML content to prevent XSS attacks.
 */
export class ContentSanitizer {
  /** Custom safe tags */
  private readonly customSafeTags: Set<string>;

  /** Custom safe attributes */
  private readonly customSafeAttributes: Set<string>;

  /**
   * Creates a new ContentSanitizer.
   * @param options - Sanitizer options
   */
  constructor(
    options: {
      additionalTags?: string[];
      additionalAttributes?: string[];
    } = {}
  ) {
    this.customSafeTags = new Set([
      ...SAFE_TAGS,
      ...(options.additionalTags ?? []),
    ]);
    this.customSafeAttributes = new Set([
      ...SAFE_ATTRIBUTES,
      ...(options.additionalAttributes ?? []),
    ]);
  }

  /**
   * Sanitizes HTML content.
   * @param html - HTML to sanitize
   * @returns Sanitized HTML
   */
  sanitize(html: string): string {
    // First pass: Remove dangerous patterns
    let sanitized = html;
    for (const pattern of DANGEROUS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Use DOMParser for structured sanitization if available
    if (typeof DOMParser !== 'undefined') {
      sanitized = this.sanitizeWithDOM(sanitized);
    }

    return sanitized;
  }

  /**
   * Sanitizes plain text (escape HTML).
   * @param text - Text to sanitize
   * @returns Escaped text
   */
  sanitizeText(text: string): string {
    return escapeHtml(text);
  }

  /**
   * Validates content against dangerous patterns.
   * @param content - Content to validate
   * @returns Whether content is safe
   */
  validate(content: string): boolean {
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(content)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Sanitizes HTML using DOM parsing.
   * @param html - HTML to sanitize
   * @returns Sanitized HTML
   */
  private sanitizeWithDOM(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    this.sanitizeNode(doc.body);
    return doc.body.innerHTML;
  }

  /**
   * Recursively sanitizes a DOM node.
   * @param node - Node to sanitize
   */
  private sanitizeNode(node: Node): void {
    const nodesToRemove: Node[] = [];

    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as Element;
        const tagName = element.tagName.toLowerCase();

        // Remove unsafe tags
        if (!this.customSafeTags.has(tagName)) {
          nodesToRemove.push(child);
          continue;
        }

        // Sanitize attributes
        for (const attr of Array.from(element.attributes)) {
          if (!this.customSafeAttributes.has(attr.name.toLowerCase())) {
            element.removeAttribute(attr.name);
            continue;
          }

          // Validate URLs
          if (
            (attr.name === 'href' || attr.name === 'src') &&
            !isUrlSafe(attr.value)
          ) {
            element.removeAttribute(attr.name);
          }

          // Validate style attribute
          if (attr.name === 'style') {
            element.setAttribute('style', this.sanitizeStyle(attr.value));
          }
        }

        // Recurse into children
        this.sanitizeNode(element);
      } else if (child.nodeType === Node.COMMENT_NODE) {
        // Remove comments
        nodesToRemove.push(child);
      }
    }

    // Remove marked nodes
    for (const nodeToRemove of nodesToRemove) {
      node.removeChild(nodeToRemove);
    }
  }

  /**
   * Sanitizes CSS style content using allowlist approach.
   */
  private sanitizeStyle(style: string): string {
    if (!style) {
      return '';
    }

    // Parse style declarations
    const declarations = style.split(';');
    const sanitizedDeclarations: string[] = [];

    for (const declaration of declarations) {
      const trimmed = declaration.trim();
      if (!trimmed) continue;

      // Split into property and value
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const property = trimmed.substring(0, colonIndex).trim().toLowerCase();
      const value = trimmed.substring(colonIndex + 1).trim();

      // Skip if property is empty or value is empty
      if (!property || !value) continue;

      // Only allow properties in the safe list (allowlist approach)
      if (!SAFE_CSS_PROPERTIES.has(property)) {
        continue; // Skip unknown/dangerous properties
      }

      // Check value for dangerous patterns
      if (this.containsDangerousCSSValue(value)) {
        continue; // Skip properties with dangerous values
      }

      sanitizedDeclarations.push(`${property}: ${value}`);
    }

    return sanitizedDeclarations.join('; ');
  }

  /**
   * Checks if a CSS value contains dangerous patterns.
   */
  private containsDangerousCSSValue(value: string): boolean {
    const lowerValue = value.toLowerCase();

    // Check against all dangerous patterns
    for (const pattern of DANGEROUS_CSS_VALUE_PATTERNS) {
      if (pattern.test(lowerValue)) {
        return true;
      }
    }

    // Additional checks for common XSS vectors in CSS
    if (/data\s*:/i.test(lowerValue)) {
      return true;
    }

    if (/vbscript\s*:/i.test(lowerValue)) {
      return true;
    }

    return /-o-link/i.test(lowerValue);


  }
}
