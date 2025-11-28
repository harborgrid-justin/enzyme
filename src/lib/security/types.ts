/**
 * @fileoverview Security Infrastructure Type Definitions
 * @module @/lib/security/types
 *
 * Comprehensive type definitions for the security infrastructure.
 * These types ensure type safety across all security modules and
 * provide clear contracts for security-related operations.
 *
 * @author Harbor Security Team
 * @version 1.0.0
 */

// ============================================================================
// Content Security Policy (CSP) Types
// ============================================================================

/**
 * CSP directive names as defined in W3C Content Security Policy Level 3
 * @see https://www.w3.org/TR/CSP3/
 */
export type CSPDirective =
  | 'default-src'
  | 'script-src'
  | 'script-src-elem'
  | 'script-src-attr'
  | 'style-src'
  | 'style-src-elem'
  | 'style-src-attr'
  | 'img-src'
  | 'font-src'
  | 'connect-src'
  | 'media-src'
  | 'object-src'
  | 'frame-src'
  | 'child-src'
  | 'worker-src'
  | 'manifest-src'
  | 'prefetch-src'
  | 'navigate-to'
  | 'form-action'
  | 'frame-ancestors'
  | 'base-uri'
  | 'sandbox'
  | 'report-uri'
  | 'report-to'
  | 'require-trusted-types-for'
  | 'trusted-types'
  | 'upgrade-insecure-requests'
  | 'block-all-mixed-content';

/**
 * CSP source values that can be used in directives
 */
export type CSPSourceValue =
  | "'self'"
  | "'unsafe-inline'"
  | "'unsafe-eval'"
  | "'unsafe-hashes'"
  | "'strict-dynamic'"
  | "'report-sample'"
  | "'wasm-unsafe-eval'"
  | 'none'
  | 'data:'
  | 'blob:'
  | 'mediastream:'
  | 'filesystem:'
  | string; // For URLs and nonces

/**
 * CSP policy configuration mapping directives to their values
 */
export type CSPPolicy = Partial<Record<CSPDirective, CSPSourceValue[]>>;

/**
 * CSP nonce for inline scripts and styles
 */
export interface CSPNonce {
  /** The nonce value (base64 encoded) */
  readonly value: string;
  /** Timestamp when the nonce was generated */
  readonly generatedAt: number;
  /** Time-to-live in milliseconds */
  readonly ttl: number;
  /** Whether this nonce has been used */
  used: boolean;
}

/**
 * CSP violation report as sent by the browser
 * @see https://www.w3.org/TR/CSP3/#violation-reports
 */
export interface CSPViolationReport {
  /** The URI of the document in which the violation occurred */
  readonly documentUri: string;
  /** The referrer of the document */
  readonly referrer: string;
  /** The URI of the resource that was blocked */
  readonly blockedUri: string;
  /** The directive that was violated */
  readonly violatedDirective: string;
  /** The effective directive that was violated */
  readonly effectiveDirective: string;
  /** The original policy that was violated */
  readonly originalPolicy: string;
  /** The disposition of the policy (enforce or report) */
  readonly disposition: 'enforce' | 'report';
  /** HTTP status code of the resource */
  readonly statusCode: number;
  /** Line number in the source file where the violation occurred */
  readonly lineNumber?: number;
  /** Column number in the source file where the violation occurred */
  readonly columnNumber?: number;
  /** URL of the script where the violation occurred */
  readonly sourceFile?: string;
  /** Sample of the violating code */
  readonly sample?: string;
}

/**
 * CSP violation handler function type
 */
export type CSPViolationHandler = (violation: CSPViolationReport) => void;

/**
 * CSP manager configuration
 */
export interface CSPManagerConfig {
  /** Base policy to start with */
  readonly basePolicy: CSPPolicy;
  /** Whether to enable nonce generation */
  readonly enableNonces: boolean;
  /** Nonce time-to-live in milliseconds */
  readonly nonceTtl: number;
  /** Whether to report violations */
  readonly reportViolations: boolean;
  /** Endpoint to report violations to */
  readonly reportUri?: string;
  /** Whether to use report-only mode */
  readonly reportOnly: boolean;
  /** Custom violation handlers */
  readonly violationHandlers: CSPViolationHandler[];
}

// ============================================================================
// XSS Prevention Types
// ============================================================================

/**
 * HTML encoding context for contextual output encoding
 */
export type HTMLEncodingContext =
  | 'html-content'      // Inside HTML element content
  | 'html-attribute'    // Inside HTML attribute value
  | 'javascript'        // Inside JavaScript context
  | 'css'               // Inside CSS context
  | 'url'               // Inside URL context
  | 'url-param';        // Inside URL query parameter

/**
 * Sanitization options for HTML content
 */
export interface SanitizationOptions {
  /** Allowed HTML tags */
  readonly allowedTags?: readonly string[];
  /** Allowed HTML attributes per tag */
  readonly allowedAttributes?: Readonly<Record<string, readonly string[]>>;
  /** Allowed URL schemes for href/src attributes */
  readonly allowedSchemes?: readonly string[];
  /** Whether to allow data: URLs */
  readonly allowDataUrls?: boolean;
  /** Whether to strip all HTML (text only) */
  readonly stripAllHtml?: boolean;
  /** Maximum length of the output */
  readonly maxLength?: number;
  /** Custom tag transformations */
  readonly transformTags?: Readonly<Record<string, TagTransformer>>;
}

/**
 * Tag transformer function for custom sanitization
 */
export type TagTransformer = (
  tagName: string,
  attributes: Record<string, string>,
) => { tagName: string; attributes: Record<string, string> } | null;

/**
 * Result of dangerous content detection
 */
export interface DangerousContentResult {
  /** Whether dangerous content was detected */
  readonly isDangerous: boolean;
  /** Types of dangerous content found */
  readonly threats: readonly DangerousThreatType[];
  /** Detailed threat information */
  readonly details: readonly ThreatDetail[];
  /** Sanitized safe version of the content */
  readonly sanitized: string;
}

/**
 * Types of dangerous content threats
 */
export type DangerousThreatType =
  | 'script-injection'
  | 'event-handler'
  | 'javascript-url'
  | 'data-url'
  | 'svg-script'
  | 'meta-refresh'
  | 'iframe-injection'
  | 'object-embed'
  | 'base-hijack'
  | 'form-action-hijack'
  | 'css-expression'
  | 'encoded-payload'
  | 'template-injection';

/**
 * Detailed information about a detected threat
 */
export interface ThreatDetail {
  /** Type of threat */
  readonly type: DangerousThreatType;
  /** Pattern that matched */
  readonly pattern: string;
  /** Position in the input where threat was found */
  readonly position: number;
  /** The matched dangerous content */
  readonly match: string;
  /** Severity level */
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  /** Recommended action */
  readonly recommendation: string;
}

/**
 * Safe HTML creation result
 */
export interface SafeHTMLResult {
  /** The sanitized HTML string */
  readonly html: string;
  /** Whether the original content was modified */
  readonly wasModified: boolean;
  /** List of removed elements/attributes */
  readonly removedItems: readonly string[];
  /** Warning messages if any */
  readonly warnings: readonly string[];
}

// ============================================================================
// CSRF Protection Types
// ============================================================================

/**
 * CSRF token data structure
 */
export interface CSRFToken {
  /** The token value */
  readonly token: string;
  /** Timestamp when the token was created */
  readonly createdAt: number;
  /** Time-to-live in milliseconds */
  readonly ttl: number;
  /** Whether the token has been used (for one-time tokens) */
  used: boolean;
  /** Associated session identifier */
  readonly sessionId?: string;
}

/**
 * CSRF protection mode
 */
export type CSRFProtectionMode =
  | 'synchronizer-token'    // Traditional synchronizer token pattern
  | 'double-submit-cookie'  // Double-submit cookie pattern
  | 'origin-check'          // Origin/Referer header check
  | 'custom-header';        // Custom header requirement

/**
 * CSRF protection configuration
 */
export interface CSRFConfig {
  /** Protection mode to use */
  readonly mode: CSRFProtectionMode;
  /** Token cookie name */
  readonly cookieName: string;
  /** Token header name */
  readonly headerName: string;
  /** Token form field name */
  readonly fieldName: string;
  /** Token time-to-live in milliseconds */
  readonly tokenTtl: number;
  /** Whether to rotate tokens after each request */
  readonly rotateAfterUse: boolean;
  /** Paths to exclude from CSRF protection */
  readonly excludePaths: readonly string[];
  /** HTTP methods that require CSRF protection */
  readonly protectedMethods: readonly string[];
  /** Whether to validate Origin header */
  readonly validateOrigin: boolean;
  /** Allowed origins for cross-origin requests */
  readonly allowedOrigins: readonly string[];
  /** Whether to use secure cookies */
  readonly secureCookies: boolean;
  /** Cookie SameSite attribute */
  readonly sameSite: 'strict' | 'lax' | 'none';
}

/**
 * CSRF validation result
 */
export interface CSRFValidationResult {
  /** Whether the request is valid */
  readonly isValid: boolean;
  /** Reason for failure if invalid */
  readonly reason?: string;
  /** The token that was validated */
  readonly token?: string;
  /** Whether a new token should be issued */
  readonly shouldRotate: boolean;
}

/**
 * Request interceptor for automatic CSRF token injection
 */
export type CSRFRequestInterceptor = (
  config: RequestInit,
) => RequestInit | Promise<RequestInit>;

// ============================================================================
// Secure Storage Types
// ============================================================================

/**
 * Encryption algorithm for secure storage
 */
export type EncryptionAlgorithm = 'AES-GCM' | 'AES-CBC';

/**
 * Key derivation function for encryption key generation
 */
export type KeyDerivationFunction = 'PBKDF2' | 'Argon2' | 'scrypt';

/**
 * Secure storage configuration
 */
export interface SecureStorageConfig {
  /** Encryption algorithm to use */
  readonly algorithm: EncryptionAlgorithm;
  /** Key length in bits */
  readonly keyLength: 128 | 192 | 256;
  /** Key derivation function */
  readonly kdf: KeyDerivationFunction;
  /** Number of iterations for key derivation */
  readonly iterations: number;
  /** Salt length in bytes */
  readonly saltLength: number;
  /** IV length in bytes */
  readonly ivLength: number;
  /** Storage prefix for encrypted items */
  readonly storagePrefix: string;
  /** Whether to compress data before encryption */
  readonly compress: boolean;
  /** Maximum item size in bytes */
  readonly maxItemSize: number;
  /** Storage quota in bytes */
  readonly storageQuota: number;
  /** Whether to use IndexedDB for larger items */
  readonly useIndexedDB: boolean;
  /** Time-to-live for cached encryption keys */
  readonly keyTtl: number;
}

/**
 * Encrypted data structure as stored
 */
export interface EncryptedData {
  /** Version of the encryption scheme */
  readonly version: number;
  /** Encryption algorithm used */
  readonly algorithm: EncryptionAlgorithm;
  /** Salt used for key derivation (base64) */
  readonly salt: string;
  /** Initialization vector (base64) */
  readonly iv: string;
  /** Encrypted data (base64) */
  readonly data: string;
  /** Authentication tag (base64) - for AES-GCM */
  readonly tag?: string;
  /** Timestamp when encrypted */
  readonly encryptedAt: number;
  /** Optional expiration timestamp */
  readonly expiresAt?: number;
  /** Integrity checksum */
  readonly checksum: string;
}

/**
 * Storage quota information
 */
export interface StorageQuotaInfo {
  /** Total quota in bytes */
  readonly total: number;
  /** Used storage in bytes */
  readonly used: number;
  /** Available storage in bytes */
  readonly available: number;
  /** Usage percentage */
  readonly usagePercent: number;
  /** Whether approaching quota limit */
  readonly isNearLimit: boolean;
  /** Number of items stored */
  readonly itemCount: number;
}

/**
 * Secure storage item metadata
 */
export interface SecureStorageMetadata {
  /** Storage key */
  readonly key: string;
  /** Size of encrypted data in bytes */
  readonly size: number;
  /** When the item was created */
  readonly createdAt: number;
  /** When the item was last accessed */
  readonly lastAccessedAt: number;
  /** When the item expires (if applicable) */
  readonly expiresAt?: number;
  /** Data type stored */
  readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array';
}

/**
 * Result of a secure storage operation
 */
export interface SecureStorageResult<T> {
  /** Whether the operation succeeded */
  readonly success: boolean;
  /** The data if successful */
  readonly data?: T;
  /** Error message if failed */
  readonly error?: string;
  /** Metadata about the stored item */
  readonly metadata?: SecureStorageMetadata;
}

// ============================================================================
// Security Context Types
// ============================================================================

/**
 * Security context state
 */
export interface SecurityContextState {
  /** Current CSP nonce */
  readonly cspNonce: string;
  /** Whether security is initialized */
  readonly isInitialized: boolean;
  /** Current CSRF token */
  readonly csrfToken: string;
  /** Whether secure storage is available */
  readonly secureStorageAvailable: boolean;
  /** Security configuration */
  readonly config: SecurityConfiguration;
  /** Security violations detected */
  readonly violations: readonly SecurityViolation[];
  /** Last security event timestamp */
  readonly lastEventAt: number;
}

/**
 * Security violation event
 */
export interface SecurityViolation {
  /** Unique identifier */
  readonly id: string;
  /** Type of violation */
  readonly type: 'csp' | 'xss' | 'csrf' | 'storage' | 'other';
  /** Violation details */
  readonly details: string;
  /** Timestamp when violation occurred */
  readonly timestamp: number;
  /** Severity level */
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  /** Whether the violation was blocked */
  readonly blocked: boolean;
  /** Source of the violation */
  readonly source?: string;
}

/**
 * Main security configuration
 */
export interface SecurityConfiguration {
  /** CSP configuration */
  readonly csp: CSPManagerConfig;
  /** CSRF configuration */
  readonly csrf: CSRFConfig;
  /** Secure storage configuration */
  readonly storage: SecureStorageConfig;
  /** Whether to enable security logging */
  readonly enableLogging: boolean;
  /** Whether to report violations to server */
  readonly reportToServer: boolean;
  /** Violation report endpoint */
  readonly reportEndpoint?: string;
  /** Maximum violations to store */
  readonly maxViolationHistory: number;
  /** Whether to block on violations */
  readonly blockOnViolation: boolean;
}

/**
 * Security context actions
 */
export interface SecurityContextActions {
  /** Regenerate CSP nonce */
  regenerateNonce: () => string;
  /** Regenerate CSRF token */
  regenerateCsrfToken: () => Promise<string>;
  /** Report a security violation */
  reportViolation: (violation: Omit<SecurityViolation, 'id' | 'timestamp'>) => void;
  /** Clear violation history */
  clearViolations: () => void;
  /** Get secure storage instance */
  getSecureStorage: () => SecureStorageInterface;
  /** Update security configuration */
  updateConfig: (partial: Partial<SecurityConfiguration>) => void;
}

/**
 * Complete security context value
 */
export interface SecurityContextValue extends SecurityContextState, SecurityContextActions {}

// ============================================================================
// Secure Storage Interface
// ============================================================================

/**
 * Secure storage interface for encrypted data operations
 */
export interface SecureStorageInterface {
  /** Set an encrypted item */
  setItem<T>(key: string, value: T, options?: SecureStorageSetOptions): Promise<SecureStorageResult<void>>;
  /** Get a decrypted item */
  getItem<T>(key: string): Promise<SecureStorageResult<T>>;
  /** Remove an item */
  removeItem(key: string): Promise<SecureStorageResult<void>>;
  /** Check if an item exists */
  hasItem(key: string): Promise<boolean>;
  /** Get all keys */
  keys(): Promise<string[]>;
  /** Get storage quota info */
  getQuotaInfo(): Promise<StorageQuotaInfo>;
  /** Clear all secure storage */
  clear(): Promise<SecureStorageResult<void>>;
  /** Get item metadata */
  getMetadata(key: string): Promise<SecureStorageMetadata | null>;
  /** Cleanup expired items */
  cleanup(): Promise<number>;
}

/**
 * Options for setting secure storage items
 */
export interface SecureStorageSetOptions {
  /** Time-to-live in milliseconds */
  readonly ttl?: number;
  /** Override compression setting */
  readonly compress?: boolean;
  /** Custom metadata */
  readonly metadata?: Record<string, unknown>;
}

// ============================================================================
// Security Event Types
// ============================================================================

/**
 * Security event types
 */
export type SecurityEventType =
  | 'csp-violation'
  | 'xss-attempt'
  | 'csrf-failure'
  | 'storage-error'
  | 'nonce-regenerated'
  | 'token-rotated'
  | 'config-updated'
  | 'initialization-complete'
  | 'cleanup-performed';

/**
 * Security event
 */
export interface SecurityEvent {
  /** Event type */
  readonly type: SecurityEventType;
  /** Event payload */
  readonly payload: unknown;
  /** Timestamp */
  readonly timestamp: number;
  /** Event source */
  readonly source: string;
}

/**
 * Security event handler
 */
export type SecurityEventHandler = (event: SecurityEvent) => void;

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * Return type for useSecureStorage hook
 */
export interface UseSecureStorageResult<T> {
  /** Current value (null if not loaded or not found) */
  readonly value: T | null;
  /** Whether the value is loading */
  readonly isLoading: boolean;
  /** Error if any */
  readonly error: Error | null;
  /** Set a new value */
  setValue: (value: T, options?: SecureStorageSetOptions) => Promise<void>;
  /** Remove the value */
  removeValue: () => Promise<void>;
  /** Refresh the value from storage */
  refresh: () => Promise<void>;
}

/**
 * Return type for useCSPNonce hook
 */
export interface UseCSPNonceResult {
  /** Current nonce value */
  readonly nonce: string;
  /** Get nonce attribute for inline scripts */
  readonly scriptNonce: string;
  /** Get nonce attribute for inline styles */
  readonly styleNonce: string;
  /** Regenerate the nonce */
  regenerate: () => string;
}

/**
 * Return type for useCSRFToken hook
 */
export interface UseCSRFTokenResult {
  /** Current CSRF token */
  readonly token: string;
  /** Token header name */
  readonly headerName: string;
  /** Token field name for forms */
  readonly fieldName: string;
  /** Get headers object with token */
  readonly headers: Record<string, string>;
  /** Regenerate the token */
  regenerate: () => Promise<string>;
  /** Hidden input element props for forms */
  readonly formInputProps: {
    readonly type: 'hidden';
    readonly name: string;
    readonly value: string;
  };
}

/**
 * Return type for useSanitizedContent hook
 */
export interface UseSanitizedContentResult {
  /** Sanitized HTML content */
  readonly sanitizedHTML: string;
  /** Whether the content was modified */
  readonly wasModified: boolean;
  /** Detected threats */
  readonly threats: readonly ThreatDetail[];
  /** Whether content is safe */
  readonly isSafe: boolean;
  /** Sanitize new content */
  sanitize: (content: string, options?: SanitizationOptions) => SafeHTMLResult;
  /** Encode content for specific context */
  encode: (content: string, context: HTMLEncodingContext) => string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Deep readonly type
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Branded type for validated/sanitized strings
 */
declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

/**
 * Type for sanitized HTML string
 */
export type SanitizedHTML = Brand<string, 'SanitizedHTML'>;

/**
 * Type for validated CSRF token
 */
export type ValidatedCSRFToken = Brand<string, 'ValidatedCSRFToken'>;

/**
 * Type for CSP nonce string
 */
export type CSPNonceValue = Brand<string, 'CSPNonceValue'>;

/**
 * Type for encrypted string
 */
export type EncryptedString = Brand<string, 'EncryptedString'>;
