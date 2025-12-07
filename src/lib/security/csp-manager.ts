/**
 * @fileoverview Content Security Policy Manager
 * @module @/lib/security/csp-manager
 *
 * Comprehensive CSP management for the Harbor React Framework.
 * Provides nonce generation, dynamic policy building, violation reporting,
 * and integration with React for inline script/style handling.
 *
 * @see https://www.w3.org/TR/CSP3/
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
 *
 * @author Harbor Security Team
 * @version 1.0.0
 */

import type {
  CSPDirective,
  CSPManagerConfig,
  CSPNonce,
  CSPNonceValue,
  CSPPolicy,
  CSPSourceValue,
  CSPViolationHandler,
  CSPViolationReport,
} from './types';
import { cspConfig, SECURITY_TIMING } from '@/config/security.config';

// ============================================================================
// Constants
// ============================================================================

/**
 * Nonce entropy in bytes (256 bits)
 */
const NONCE_ENTROPY_BYTES = 32;

/**
 * Maximum number of violations to store
 */
const MAX_VIOLATIONS_STORED = 100;

/**
 * Debounce time for violation reports in milliseconds
 */
const { VIOLATION_REPORT_DEBOUNCE } = SECURITY_TIMING;

// ============================================================================
// Cryptographic Utilities
// ============================================================================

/**
 * Generate cryptographically secure random bytes
 * Uses Web Crypto API for security
 */
function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Convert bytes to base64 string
 */
function bytesToBase64(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binString);
}

/**
 * Generate a cryptographically secure nonce
 * @returns Base64-encoded nonce string
 */
function generateNonceValue(): string {
  const bytes = getRandomBytes(NONCE_ENTROPY_BYTES);
  return bytesToBase64(bytes);
}

// ============================================================================
// CSP Manager Class
// ============================================================================

/**
 * CSP Manager for handling Content Security Policy
 *
 * Features:
 * - Cryptographically secure nonce generation
 * - Dynamic policy building with nonce injection
 * - CSP violation monitoring and reporting
 * - Support for report-only mode
 * - Automatic nonce rotation
 *
 * @example
 * ```typescript
 * const cspManager = CSPManager.getInstance();
 *
 * // Get current nonce for inline scripts
 * const nonce = cspManager.getCurrentNonce();
 *
 * // Build CSP header value
 * const cspHeader = cspManager.buildPolicyString();
 *
 * // Add violation handler
 * cspManager.addViolationHandler((violation) => {
 *   console.error('CSP Violation:', violation);
 * });
 * ```
 */
class CSPManagerClass {
  private static instance: CSPManagerClass | null = null;

  private config: CSPManagerConfig;
  private currentNonce: CSPNonce | null = null;
  private violations: CSPViolationReport[] = [];
  private violationHandlers: Set<CSPViolationHandler> = new Set();
  private reportDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingReports: CSPViolationReport[] = [];
  private initialized = false;

  private constructor(config: CSPManagerConfig = cspConfig) {
    this.config = { ...config };

    // Add configured handlers
    config.violationHandlers.forEach((handler) => {
      this.violationHandlers.add(handler);
    });
  }

  /**
   * Get singleton instance of CSP Manager
   */
  static getInstance(config?: CSPManagerConfig): CSPManagerClass {
    CSPManagerClass.instance ??= new CSPManagerClass(config);
    return CSPManagerClass.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance(): void {
    if (CSPManagerClass.instance) {
      CSPManagerClass.instance.cleanup();
      CSPManagerClass.instance = null;
    }
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize the CSP Manager
   * Sets up violation reporting listener
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    // Generate initial nonce
    if (this.config.enableNonces) {
      this.regenerateNonce();
    }

    // Set up violation reporting
    if (this.config.reportViolations) {
      this.setupViolationListener();
    }

    this.initialized = true;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.reportDebounceTimer) {
      clearTimeout(this.reportDebounceTimer);
      this.reportDebounceTimer = null;
    }

    // Remove violation listener
    if (typeof document !== 'undefined') {
      document.removeEventListener('securitypolicyviolation', this.handleViolationEvent);
    }

    this.violations = [];
    this.pendingReports = [];
    this.violationHandlers.clear();
    this.initialized = false;
  }

  // ==========================================================================
  // Nonce Management
  // ==========================================================================

  /**
   * Generate a new nonce
   * @returns The generated nonce object
   */
  regenerateNonce(): CSPNonce {
    const nonce: CSPNonce = {
      value: generateNonceValue(),
      generatedAt: Date.now(),
      ttl: this.config.nonceTtl,
      used: false,
    };

    this.currentNonce = nonce;
    return nonce;
  }

  /**
   * Get the current nonce value
   * Regenerates if expired
   * @returns Current nonce value as branded type
   */
  getCurrentNonce(): CSPNonceValue {
    if (!this.config.enableNonces) {
      throw new Error('Nonces are not enabled in CSP configuration');
    }

    // Check if nonce exists and is not expired
    if (this.currentNonce) {
      const age = Date.now() - this.currentNonce.generatedAt;
      if (age < this.currentNonce.ttl) {
        return this.currentNonce.value as CSPNonceValue;
      }
    }

    // Regenerate expired or missing nonce
    const nonce = this.regenerateNonce();
    return nonce.value as CSPNonceValue;
  }

  /**
   * Get nonce attribute string for inline scripts
   * @returns Nonce attribute for use in script tags
   */
  getScriptNonceAttr(): string {
    const nonce = this.getCurrentNonce();
    return `nonce="${nonce}"`;
  }

  /**
   * Get nonce attribute string for inline styles
   * @returns Nonce attribute for use in style tags
   */
  getStyleNonceAttr(): string {
    const nonce = this.getCurrentNonce();
    return `nonce="${nonce}"`;
  }

  /**
   * Mark current nonce as used
   * For tracking nonce usage
   */
  markNonceUsed(): void {
    if (this.currentNonce) {
      this.currentNonce.used = true;
    }
  }

  /**
   * Check if nonce is still valid
   */
  isNonceValid(): boolean {
    if (!this.currentNonce) {
      return false;
    }
    const age = Date.now() - this.currentNonce.generatedAt;
    return age < this.currentNonce.ttl;
  }

  // ==========================================================================
  // Policy Building
  // ==========================================================================

  /**
   * Build the complete CSP policy object
   * Injects nonces into script-src and style-src directives
   * @returns Complete CSP policy
   */
  buildPolicy(): CSPPolicy {
    const policy: CSPPolicy = { ...this.config.basePolicy };

    // Inject nonce into script and style directives
    if (this.config.enableNonces) {
      const nonceValue = `'nonce-${this.getCurrentNonce()}'`;

      // Script directives
      const scriptSrc = policy['script-src'] ?? ["'self'"];
      policy['script-src'] = [...scriptSrc, nonceValue];

      const scriptSrcElem = policy['script-src-elem'];
      if (scriptSrcElem) {
        policy['script-src-elem'] = [...scriptSrcElem, nonceValue];
      }

      // Style directives
      const styleSrc = policy['style-src'] ?? ["'self'"];
      policy['style-src'] = [...styleSrc, nonceValue];

      const styleSrcElem = policy['style-src-elem'];
      if (styleSrcElem) {
        policy['style-src-elem'] = [...styleSrcElem, nonceValue];
      }
    }

    // Add report-uri if configured
    if (this.config.reportUri != null && this.config.reportUri !== '') {
      policy['report-uri'] = [this.config.reportUri];
    }

    return policy;
  }

  /**
   * Build CSP header string from policy
   * @returns CSP header value string
   */
  buildPolicyString(): string {
    const policy = this.buildPolicy();
    const directives: string[] = [];

    for (const [directive, values] of Object.entries(policy)) {
      if (values != null && values.length > 0) {
        // Some directives don't have values (e.g., upgrade-insecure-requests)
        const valueStr = values.length > 0 && values[0] !== '' ? ` ${values.join(' ')}` : '';
        directives.push(`${directive}${valueStr}`);
      } else if (values != null) {
        // Directive without values (boolean-like)
        directives.push(directive);
      }
    }

    return directives.join('; ');
  }

  /**
   * Get the appropriate CSP header name
   * @returns Header name based on report-only setting
   */
  getHeaderName(): string {
    return this.config.reportOnly
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';
  }

  /**
   * Add a source to a directive
   * @param directive - The CSP directive
   * @param source - The source value to add
   */
  addSource(directive: CSPDirective, source: CSPSourceValue): void {
    const currentSources = this.config.basePolicy[directive] ?? [];
    if (!currentSources.includes(source)) {
      this.config = {
        ...this.config,
        basePolicy: {
          ...this.config.basePolicy,
          [directive]: [...currentSources, source],
        },
      };
    }
  }

  /**
   * Remove a source from a directive
   * @param directive - The CSP directive
   * @param source - The source value to remove
   */
  removeSource(directive: CSPDirective, source: CSPSourceValue): void {
    const currentSources = this.config.basePolicy[directive];
    if (currentSources) {
      this.config = {
        ...this.config,
        basePolicy: {
          ...this.config.basePolicy,
          [directive]: currentSources.filter((s) => s !== source),
        },
      };
    }
  }

  // ==========================================================================
  // Violation Reporting
  // ==========================================================================

  /**
   * Record a CSP violation
   * @param violation - The violation report
   */
  recordViolation(violation: CSPViolationReport): void {
    // Add to stored violations
    this.violations.push(violation);

    // Trim if exceeds max
    while (this.violations.length > MAX_VIOLATIONS_STORED) {
      this.violations.shift();
    }

    // Notify handlers
    this.violationHandlers.forEach((handler) => {
      try {
        handler(violation);
      } catch (error) {
        console.error('[CSP] Violation handler error:', error);
      }
    });

    // Queue for reporting
    if (this.config.reportUri != null && this.config.reportUri !== '') {
      this.queueViolationReport(violation);
    }
  }

  /**
   * Add a violation handler
   * @param handler - The handler function
   * @returns Cleanup function to remove handler
   */
  addViolationHandler(handler: CSPViolationHandler): () => void {
    this.violationHandlers.add(handler);
    return () => this.violationHandlers.delete(handler);
  }

  /**
   * Remove a violation handler
   * @param handler - The handler to remove
   */
  removeViolationHandler(handler: CSPViolationHandler): void {
    this.violationHandlers.delete(handler);
  }

  /**
   * Get recorded violations
   * @returns Array of recorded violations
   */
  getViolations(): readonly CSPViolationReport[] {
    return [...this.violations];
  }

  /**
   * Clear recorded violations
   */
  clearViolations(): void {
    this.violations = [];
  }

  /**
   * Create a meta tag element with CSP
   * For client-side CSP enforcement
   * @returns HTMLMetaElement with CSP policy
   */
  createMetaTag(): HTMLMetaElement {
    const meta = document.createElement('meta');
    meta.httpEquiv = this.config.reportOnly
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';
    meta.content = this.buildPolicyString();
    return meta;
  }

  /**
   * Inject CSP meta tag into document head
   * Note: Meta tag CSP is less effective than HTTP header
   */
  injectMetaTag(): void {
    if (typeof document === 'undefined') {
      return;
    }

    // Remove existing CSP meta tags
    const existingMetas = document.querySelectorAll(
      'meta[http-equiv="Content-Security-Policy"], meta[http-equiv="Content-Security-Policy-Report-Only"]'
    );
    existingMetas.forEach((meta) => meta.remove());

    // Inject new meta tag
    const meta = this.createMetaTag();
    document.head.insertBefore(meta, document.head.firstChild);
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<CSPManagerConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param updates - Partial configuration updates
   */
  updateConfig(updates: Partial<CSPManagerConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      // Merge base policy if provided
      basePolicy: updates.basePolicy
        ? { ...this.config.basePolicy, ...updates.basePolicy }
        : this.config.basePolicy,
    };
  }

  // ==========================================================================
  // Meta Tag Injection
  // ==========================================================================

  /**
   * Check if CSP Manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Set up listener for CSP violation events
   */
  private setupViolationListener(): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.addEventListener('securitypolicyviolation', this.handleViolationEvent);
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Handle CSP violation event from browser
   */
  private handleViolationEvent = (event: SecurityPolicyViolationEvent): void => {
    const violation: CSPViolationReport = {
      documentUri: event.documentURI,
      referrer: event.referrer,
      blockedUri: event.blockedURI,
      violatedDirective: event.violatedDirective,
      effectiveDirective: event.effectiveDirective,
      originalPolicy: event.originalPolicy,
      disposition: event.disposition as 'enforce' | 'report',
      statusCode: event.statusCode,
      lineNumber: event.lineNumber || undefined,
      columnNumber: event.columnNumber || undefined,
      sourceFile: event.sourceFile || undefined,
      sample: event.sample || undefined,
    };

    this.recordViolation(violation);
  };

  /**
   * Queue violation for debounced reporting
   */
  private queueViolationReport(violation: CSPViolationReport): void {
    this.pendingReports.push(violation);

    // Clear existing timer
    if (this.reportDebounceTimer) {
      clearTimeout(this.reportDebounceTimer);
    }

    // Set up debounced report
    this.reportDebounceTimer = setTimeout(() => {
      void this.flushViolationReports();
    }, VIOLATION_REPORT_DEBOUNCE);
  }

  /**
   * Flush pending violation reports to server
   *
   * Note: This method intentionally uses raw fetch() rather than apiClient because:
   * 1. CSP reports have special Content-Type (application/csp-report)
   * 2. Security reporting must be independent of the main API client
   * 3. Uses keepalive for reliability when page is unloading
   *
   * @see {@link @/lib/api/api-client} for application API calls
   */
  private async flushViolationReports(): Promise<void> {
    if (
      this.pendingReports.length === 0 ||
      this.config.reportUri == null ||
      this.config.reportUri === ''
    ) {
      return;
    }

    const reports = [...this.pendingReports];
    this.pendingReports = [];

    try {
      // Raw fetch is intentional - CSP reports require special Content-Type
      await fetch(this.config.reportUri, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/csp-report',
        },
        body: JSON.stringify({
          'csp-reports': reports,
        }),
        // Don't fail silently - we want to know if reporting fails
        keepalive: true,
      });
    } catch (error) {
      console.error('[CSP] Failed to report violations:', error);
      // Re-queue failed reports (with limit to prevent infinite growth)
      if (this.pendingReports.length < MAX_VIOLATIONS_STORED) {
        this.pendingReports.push(...reports);
      }
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * CSP Manager singleton instance
 */
export const CSPManager = CSPManagerClass.getInstance();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a new cryptographic nonce
 * Standalone function for one-off nonce generation
 */
export function generateNonce(): CSPNonceValue {
  return generateNonceValue() as CSPNonceValue;
}

/**
 * Parse a CSP header string into policy object
 * @param cspString - The CSP header value
 * @returns Parsed CSP policy object
 */
export function parseCSPString(cspString: string): CSPPolicy {
  const policy: CSPPolicy = {};

  const directives = cspString.split(';').map((d) => d.trim());

  for (const directive of directives) {
    if (!directive) continue;

    const parts = directive.split(/\s+/);
    const name = parts[0] as CSPDirective;
    const values = parts.slice(1);

    policy[name] = values.length > 0 ? values : [];
  }

  return policy;
}

/**
 * Merge multiple CSP policies
 * Later policies take precedence for conflicting directives
 * @param policies - Array of policies to merge
 * @returns Merged policy
 */
export function mergeCSPPolicies(...policies: CSPPolicy[]): CSPPolicy {
  const merged: CSPPolicy = {};

  for (const policy of policies) {
    for (const [directive, values] of Object.entries(policy)) {
      const key = directive as CSPDirective;
      const existing = merged[key] ?? [];
      const newValues = values ?? [];

      // Deduplicate values

      merged[key] = [...new Set([...existing, ...newValues])];
    }
  }

  return merged;
}

/**
 * Create a strict CSP policy for high-security contexts
 * @returns Strict CSP policy
 */
export function createStrictPolicy(): CSPPolicy {
  return {
    'default-src': ["'none'"],
    'script-src': ["'self'"],
    'style-src': ["'self'"],
    'img-src': ["'self'"],
    'font-src': ["'self'"],
    'connect-src': ["'self'"],
    'media-src': ["'none'"],
    'object-src': ["'none'"],
    'frame-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'upgrade-insecure-requests': [],
    'block-all-mixed-content': [],
  };
}

/**
 * Validate that a CSP policy doesn't contain dangerous values
 * @param policy - The policy to validate
 * @returns Validation result with warnings
 */
export function validateCSPPolicy(policy: CSPPolicy): {
  isSecure: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  const dangerousValues = [
    { value: "'unsafe-inline'", message: 'unsafe-inline allows XSS attacks' },
    { value: "'unsafe-eval'", message: 'unsafe-eval allows code injection' },
    { value: '*', message: 'Wildcard allows any source' },
    { value: 'data:', message: 'data: URLs can bypass CSP' },
  ];

  const criticalDirectives = ['script-src', 'script-src-elem', 'object-src', 'base-uri'];

  for (const directive of criticalDirectives) {
    const values = policy[directive as CSPDirective];
    if (!values) continue;

    for (const { value, message } of dangerousValues) {
      if (values.includes(value)) {
        warnings.push(`${directive}: ${message}`);
      }
    }
  }

  // Check for missing default-src
  if (!policy['default-src']) {
    warnings.push('Missing default-src directive - recommend setting to "\'none\'" or "\'self\'"');
  }

  // Check for missing object-src
  if (!policy['object-src']) {
    warnings.push('Missing object-src directive - recommend setting to "\'none\'"');
  }

  return {
    isSecure: warnings.length === 0,
    warnings,
  };
}

// ============================================================================
// Type Exports
// ============================================================================

export type { CSPManagerClass };
export type {
  CSPPolicy,
  CSPDirective,
  CSPSourceValue,
  CSPNonce,
  CSPManagerConfig,
  CSPViolationReport,
  CSPViolationHandler,
  CSPNonceValue,
};
