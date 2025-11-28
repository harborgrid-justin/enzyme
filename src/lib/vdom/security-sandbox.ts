/**
 * @file Security Sandbox
 * @module vdom/security-sandbox
 * @description Comprehensive security layer for module boundaries providing
 * CSP integration, XSS prevention, sanitized hydration, and secure cross-module
 * communication. Implements defense-in-depth security strategies.
 *
 * @author Agent 5 - PhD Virtual DOM Expert
 * @version 1.0.0
 */

import {
  type ModuleId,
  type SecurityNonce,
  type ModuleSecurityConfig,
  type SecurityContext,
  type SecurityViolation,
  type CSPDirectives,
  type HydrationData,
  DEFAULT_SECURITY_CONFIG,
  createSecurityNonce,
} from './types';
import { devWarn } from '@/lib/core/config/env-helper';

// ============================================================================
// Constants
// ============================================================================

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
 *
 * SECURITY: Only these CSS properties are allowed in style attributes.
 * This is a defense-in-depth measure against CSS injection attacks that
 * could lead to data exfiltration or UI manipulation.
 *
 * Properties are categorized for maintainability:
 * - Layout: display, position, overflow, visibility
 * - Sizing: width, height, margin, padding
 * - Typography: font-*, text-*, line-height, letter-spacing
 * - Colors: color, background-color, border-color, opacity
 * - Borders: border-*, border-radius
 * - Flexbox: flex-*, justify-*, align-*
 * - Grid: grid-* (basic)
 * - Effects: box-shadow (without url), transform (limited)
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
 *
 * SECURITY: These patterns in CSS values can lead to XSS or data exfiltration:
 * - url() - Can load external resources or execute javascript:
 * - expression() - IE-specific CSS expressions (execute JavaScript)
 * - javascript: - Direct JavaScript execution
 * - behavior: - IE-specific HTC behaviors
 * - -moz-binding: - Firefox XBL binding
 * - @import - Can load external stylesheets
 * - var() with untrusted content - CSS variable injection
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

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a cryptographically secure nonce.
 * @returns Security nonce
 */
function generateNonce(): SecurityNonce {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const nonce = Array.from(array, (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
  return createSecurityNonce(nonce);
}

/**
 * Escapes HTML special characters.
 * @param str - String to escape
 * @returns Escaped string
 */
function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
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
 * Computes a checksum for data integrity.
 * @param data - Data to checksum
 * @returns Checksum string
 */
async function computeChecksum(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// ContentSanitizer Class
// ============================================================================

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
   *
   * SECURITY: Uses an allowlist of safe CSS properties rather than a blocklist.
   * This is significantly more secure because:
   * - Blocklists can be bypassed with encoding tricks, browser quirks, or new attack vectors
   * - Allowlists only permit known-safe properties, blocking unknown/dangerous ones by default
   *
   * Each CSS property is validated:
   * 1. Property name must be in the SAFE_CSS_PROPERTIES allowlist
   * 2. Property value must not contain dangerous patterns (url(), expression(), etc.)
   *
   * @param style - Style string to sanitize
   * @returns Sanitized style string with only safe properties
   */
  private sanitizeStyle(style: string): string {
    if (!style || typeof style !== 'string') {
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

      // SECURITY: Only allow properties in the safe list (allowlist approach)
      if (!SAFE_CSS_PROPERTIES.has(property)) {
        continue; // Skip unknown/dangerous properties
      }

      // SECURITY: Check value for dangerous patterns
      if (this.containsDangerousCSSValue(value)) {
        continue; // Skip properties with dangerous values
      }

      sanitizedDeclarations.push(`${property}: ${value}`);
    }

    return sanitizedDeclarations.join('; ');
  }

  /**
   * Checks if a CSS value contains dangerous patterns.
   *
   * SECURITY: Defense-in-depth check for values that could execute code
   * or exfiltrate data, even within allowed properties.
   *
   * @param value - CSS value to check
   * @returns true if value contains dangerous patterns
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
    // Check for data: URIs (can be used for script injection)
    if (/data\s*:/i.test(lowerValue)) {
      return true;
    }

    // Check for vbscript: (IE-specific)
    if (/vbscript\s*:/i.test(lowerValue)) {
      return true;
    }

    // Check for -o-link (Opera-specific, can execute JavaScript)
    if (/-o-link/i.test(lowerValue)) {
      return true;
    }

    return false;
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
}

// ============================================================================
// CSPManager Class
// ============================================================================

/**
 * Manages Content Security Policy for modules.
 */
export class CSPManager {
  /** CSP directives */
  private readonly directives: CSPDirectives;

  /** Generated nonce */
  private readonly nonce: SecurityNonce;

  /**
   * Creates a new CSPManager.
   * @param directives - CSP directives
   */
  constructor(directives: CSPDirectives = {}) {
    this.directives = directives;
    this.nonce = generateNonce();
  }

  /**
   * Gets the current nonce.
   */
  getNonce(): SecurityNonce {
    return this.nonce;
  }

  /**
   * Generates CSP header value.
   * @returns CSP header string
   */
  generateHeader(): string {
    const parts: string[] = [];

    const directiveNames = Object.keys(this.directives) as Array<
      keyof CSPDirectives
    >;

    for (const directive of directiveNames) {
      const values = this.directives[directive];
      if (values && values.length > 0) {
        // Add nonce to script-src and style-src
        if (directive === 'script-src' || directive === 'style-src') {
          parts.push(`${directive} 'nonce-${this.nonce}' ${values.join(' ')}`);
        } else {
          parts.push(`${directive} ${values.join(' ')}`);
        }
      }
    }

    return parts.join('; ');
  }

  /**
   * Validates content against CSP directives.
   * @param type - Content type
   * @param source - Content source
   * @returns Whether content is allowed
   */
  validateSource(
    type: keyof CSPDirectives,
    source: string
  ): boolean {
    const allowedSources = this.directives[type];
    if (!allowedSources || allowedSources.length === 0) {
      // Fall back to default-src
      const defaultSrc = this.directives['default-src'];
      if (!defaultSrc || defaultSrc.length === 0) {
        return true; // No restriction
      }
      return this.matchesSource(source, defaultSrc);
    }

    return this.matchesSource(source, allowedSources);
  }

  /**
   * Checks if a source matches allowed sources.
   * @param source - Source to check
   * @param allowedSources - Allowed source patterns
   * @returns Whether source matches
   */
  private matchesSource(
    source: string,
    allowedSources: ReadonlyArray<string>
  ): boolean {
    for (const allowed of allowedSources) {
      if (allowed === "'self'") {
        if (source.startsWith(window.location.origin)) {
          return true;
        }
      } else if (allowed === "'unsafe-inline'") {
        return true; // Inline is allowed
      } else if (allowed === "'unsafe-eval'") {
        return true; // Eval is allowed
      } else if (allowed === '*') {
        return true; // All sources allowed
      } else if (allowed.startsWith('*.')) {
        // Wildcard subdomain
        const domain = allowed.substring(2);
        try {
          const url = new URL(source);
          if (url.hostname.endsWith(domain)) {
            return true;
          }
        } catch {
          // Invalid URL
        }
      } else if (source.startsWith(allowed)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Applies CSP meta tag to document.
   */
  applyMetaTag(): void {
    const existing = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (existing) {
      existing.remove();
    }

    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = this.generateHeader();
    document.head.appendChild(meta);
  }
}

// ============================================================================
// EventValidator Class
// ============================================================================

/**
 * Validates cross-module events against security policies.
 */
export class EventValidator {
  /** Allowed event patterns */
  private readonly allowedPatterns: Array<string | RegExp>;

  /** Blocked event patterns */
  private readonly blockedPatterns: Array<string | RegExp>;

  /** Maximum message size */
  private readonly maxMessageSize: number;

  /**
   * Creates a new EventValidator.
   * @param config - Security configuration
   */
  constructor(config: ModuleSecurityConfig) {
    this.allowedPatterns = config.allowedEvents
      ? [...config.allowedEvents]
      : [];
    this.blockedPatterns = config.blockedEvents
      ? [...config.blockedEvents]
      : [];
    this.maxMessageSize = config.maxMessageSize ?? 1024 * 1024;
  }

  /**
   * Validates an event name.
   * @param eventName - Event name to validate
   * @returns Whether event is allowed
   */
  isEventAllowed(eventName: string): boolean {
    // Check blocked patterns first
    for (const pattern of this.blockedPatterns) {
      if (typeof pattern === 'string') {
        if (eventName === pattern) {
          return false;
        }
      } else if (pattern.test(eventName)) {
        return false;
      }
    }

    // If allowed patterns are specified, check them
    if (this.allowedPatterns.length > 0) {
      for (const pattern of this.allowedPatterns) {
        if (typeof pattern === 'string') {
          if (eventName === pattern) {
            return true;
          }
        } else if (pattern.test(eventName)) {
          return true;
        }
      }
      return false;
    }

    // If no allowed patterns, allow by default
    return true;
  }

  /**
   * Validates message payload size.
   * @param payload - Message payload
   * @returns Whether size is valid
   */
  isPayloadSizeValid(payload: unknown): boolean {
    try {
      const { size } = new Blob([JSON.stringify(payload)]);
      return size <= this.maxMessageSize;
    } catch {
      return false;
    }
  }

  /**
   * Validates origin for cross-module messages.
   * @param sourceModuleId - Source module ID
   * @param targetModuleId - Target module ID
   * @param allowedOrigins - Allowed module origins
   * @returns Whether origin is valid
   */
  isOriginValid(
    sourceModuleId: ModuleId,
    _targetModuleId: ModuleId,
    allowedOrigins?: ModuleId[]
  ): boolean {
    if (!allowedOrigins || allowedOrigins.length === 0) {
      return true; // No restriction
    }

    return allowedOrigins.includes(sourceModuleId);
  }
}

// ============================================================================
// SecuritySandbox Class
// ============================================================================

/**
 * Comprehensive security sandbox for module boundaries.
 * Provides CSP integration, XSS prevention, and secure communication.
 *
 * @example
 * ```typescript
 * const sandbox = new SecuritySandbox(moduleId, {
 *   csp: {
 *     'default-src': ["'self'"],
 *     'script-src': ["'self'", 'cdn.example.com'],
 *   },
 *   sanitizeHydration: true,
 * });
 *
 * // Validate content
 * const isSafe = sandbox.validateContent('<script>alert(1)</script>');
 *
 * // Sanitize content
 * const safe = sandbox.sanitize('<div onclick="evil()">Hello</div>');
 * ```
 */
export class SecuritySandbox {
  /** Module ID */
  private readonly moduleId: ModuleId;

  /** Security configuration */
  private readonly config: ModuleSecurityConfig;

  /** Content sanitizer */
  private readonly sanitizer: ContentSanitizer;

  /** CSP manager */
  private readonly cspManager: CSPManager;

  /** Event validator */
  private readonly eventValidator: EventValidator;

  /** Security violations */
  private readonly violations: SecurityViolation[] = [];

  /** Violation limit before alerting */
  private readonly violationLimit: number = 100;

  /**
   * Creates a new SecuritySandbox.
   * @param moduleId - Module ID
   * @param config - Security configuration
   */
  constructor(moduleId: ModuleId, config: Partial<ModuleSecurityConfig> = {}) {
    this.moduleId = moduleId;
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
    this.sanitizer = new ContentSanitizer();
    this.cspManager = new CSPManager(this.config.csp);
    this.eventValidator = new EventValidator(this.config);
  }

  // ==========================================================================
  // Content Validation
  // ==========================================================================

  /**
   * Validates content against security policies.
   * @param content - Content to validate
   * @returns Whether content is safe
   */
  validateContent(content: string): boolean {
    const isValid = this.sanitizer.validate(content);

    if (!isValid) {
      this.reportViolation({
        type: 'xss',
        message: 'Potentially dangerous content detected',
        moduleId: this.moduleId,
        blockedContent: content.substring(0, 100),
      });
    }

    return isValid;
  }

  /**
   * Sanitizes content to make it safe.
   * @param content - Content to sanitize
   * @returns Sanitized content
   */
  sanitize(content: string): string {
    return this.sanitizer.sanitize(content);
  }

  /**
   * Sanitizes text (escape HTML).
   * @param text - Text to sanitize
   * @returns Escaped text
   */
  sanitizeText(text: string): string {
    return this.sanitizer.sanitizeText(text);
  }

  // ==========================================================================
  // Hydration Security
  // ==========================================================================

  /**
   * Sanitizes hydration data for secure server-to-client transfer.
   * @param data - Raw hydration data
   * @returns Sanitized hydration data
   */
  async sanitizeHydrationData(
    data: Omit<HydrationData, 'sanitized' | 'checksum'>
  ): Promise<HydrationData> {
    if (this.config.sanitizeHydration !== true) {
      return {
        ...data,
        sanitized: false,
        checksum: '',
      };
    }

    // Deep sanitize state
    const sanitizedState = this.sanitizeValue(data.state);

    // Compute checksum
    const checksum = await computeChecksum(JSON.stringify(sanitizedState));

    return {
      ...data,
      state: sanitizedState,
      sanitized: true,
      checksum,
    };
  }

  /**
   * Validates hydration data integrity.
   * @param data - Hydration data to validate
   * @returns Whether data is valid
   */
  async validateHydrationData(data: HydrationData): Promise<boolean> {
    if (!data.sanitized) {
      this.reportViolation({
        type: 'injection',
        message: 'Unsanitized hydration data detected',
        moduleId: this.moduleId,
      });
      return false;
    }

    // Verify checksum
    const expectedChecksum = await computeChecksum(JSON.stringify(data.state));

    if (expectedChecksum !== data.checksum) {
      this.reportViolation({
        type: 'injection',
        message: 'Hydration data integrity check failed',
        moduleId: this.moduleId,
      });
      return false;
    }

    return true;
  }

  /**
   * Recursively sanitizes a value.
   * @param value - Value to sanitize
   * @returns Sanitized value
   */
  private sanitizeValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return this.sanitize(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item));
    }

    if (typeof value === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        // Sanitize both key and value
        const sanitizedKey = this.sanitizeText(key);
        sanitized[sanitizedKey] = this.sanitizeValue(val);
      }
      return sanitized;
    }

    return value;
  }

  // ==========================================================================
  // Event Security
  // ==========================================================================

  /**
   * Checks if an event is allowed.
   * @param eventName - Event name
   * @returns Whether event is allowed
   */
  isEventAllowed(eventName: string): boolean {
    const allowed = this.eventValidator.isEventAllowed(eventName);

    if (!allowed) {
      this.reportViolation({
        type: 'origin',
        message: `Event not allowed: ${eventName}`,
        moduleId: this.moduleId,
      });
    }

    return allowed;
  }

  /**
   * Validates a cross-module message.
   * @param sourceModuleId - Source module
   * @param eventName - Event name
   * @param payload - Message payload
   * @returns Whether message is valid
   */
  validateMessage(
    sourceModuleId: ModuleId,
    eventName: string,
    payload: unknown
  ): boolean {
    // Validate event name
    if (!this.isEventAllowed(eventName)) {
      return false;
    }

    // Validate payload size
    if (!this.eventValidator.isPayloadSizeValid(payload)) {
      this.reportViolation({
        type: 'size',
        message: 'Message payload exceeds size limit',
        moduleId: this.moduleId,
        source: sourceModuleId,
      });
      return false;
    }

    return true;
  }

  // ==========================================================================
  // CSP Management
  // ==========================================================================

  /**
   * Gets the current security nonce.
   */
  getNonce(): SecurityNonce {
    return this.cspManager.getNonce();
  }

  /**
   * Generates CSP header.
   * @returns CSP header string
   */
  generateCSPHeader(): string {
    return this.cspManager.generateHeader();
  }

  /**
   * Validates a source against CSP.
   * @param type - Directive type
   * @param source - Source to validate
   * @returns Whether source is allowed
   */
  validateCSPSource(type: keyof CSPDirectives, source: string): boolean {
    const allowed = this.cspManager.validateSource(type, source);

    if (!allowed) {
      this.reportViolation({
        type: 'csp',
        message: `CSP violation: ${type} source not allowed`,
        moduleId: this.moduleId,
        source,
      });
    }

    return allowed;
  }

  // ==========================================================================
  // Violation Management
  // ==========================================================================

  /**
   * Reports a security violation.
   * @param violation - Violation details
   */
  reportViolation(
    violation: Omit<SecurityViolation, 'timestamp'>
  ): void {
    const fullViolation: SecurityViolation = {
      ...violation,
      timestamp: Date.now(),
    };

    this.violations.push(fullViolation);

    // Trim old violations if exceeding limit
    if (this.violations.length > this.violationLimit) {
      this.violations.shift();
    }

    // Log in development
    devWarn('[Security Violation]', fullViolation);
  }

  /**
   * Gets all recorded violations.
   * @returns Array of violations
   */
  getViolations(): ReadonlyArray<SecurityViolation> {
    return [...this.violations];
  }

  /**
   * Clears recorded violations.
   */
  clearViolations(): void {
    this.violations.length = 0;
  }

  // ==========================================================================
  // Security Context
  // ==========================================================================

  /**
   * Creates a security context for the module.
   * @returns Security context
   */
  createContext(): SecurityContext {
    return {
      config: this.config,
      nonce: this.getNonce(),
      isSecure: this.violations.length === 0,
      violations: this.getViolations(),
      validateContent: (content: string) => this.validateContent(content),
      sanitize: (content: string) => this.sanitize(content),
      isEventAllowed: (eventName: string) => this.isEventAllowed(eventName),
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a new security sandbox.
 * @param moduleId - Module ID
 * @param config - Security configuration
 * @returns Security sandbox instance
 */
export function createSecuritySandbox(
  moduleId: ModuleId,
  config?: Partial<ModuleSecurityConfig>
): SecuritySandbox {
  return new SecuritySandbox(moduleId, config);
}

/**
 * Creates a strict security configuration.
 * @returns Strict security config
 */
export function createStrictSecurityConfig(): ModuleSecurityConfig {
  return {
    csp: {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'"],
      'connect-src': ["'self'"],
      'frame-src': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
    },
    sandbox: true,
    sanitizeHydration: true,
    maxMessageSize: 512 * 1024, // 512KB
    validateOrigins: true,
  };
}

/**
 * Creates a relaxed security configuration for development.
 * @returns Relaxed security config
 */
export function createRelaxedSecurityConfig(): ModuleSecurityConfig {
  return {
    csp: {
      'default-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    },
    sandbox: false,
    sanitizeHydration: false,
    maxMessageSize: 10 * 1024 * 1024, // 10MB
    validateOrigins: false,
  };
}
