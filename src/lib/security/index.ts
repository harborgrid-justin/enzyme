/**
 * @fileoverview Security Infrastructure Module
 * @module @/lib/security
 *
 * Comprehensive security infrastructure for the Harbor React Framework.
 * This module provides enterprise-grade security features including:
 *
 * - Content Security Policy (CSP) management with nonce support
 * - Cross-Site Scripting (XSS) prevention and sanitization
 * - Cross-Site Request Forgery (CSRF) protection
 * - Encrypted secure storage (localStorage/sessionStorage)
 * - React hooks for security operations
 * - Global security context provider
 *
 * @example Basic Usage
 * ```tsx
 * import {
 *   SecurityProvider,
 *   useSecurityContext,
 *   useCSRFToken,
 *   useSanitizedContent,
 * } from '@/lib/security';
 *
 * // Wrap your app with SecurityProvider
 * function App() {
 *   return (
 *     <SecurityProvider>
 *       <MainContent />
 *     </SecurityProvider>
 *   );
 * }
 *
 * // Use security features in components
 * function SecureForm() {
 *   const { formInputProps } = useCSRFToken();
 *
 *   return (
 *     <form method="POST">
 *       <input {...formInputProps} />
 *       <button type="submit">Submit</button>
 *     </form>
 *   );
 * }
 * ```
 *
 * @author Harbor Security Team
 * @version 1.0.0
 */

// ============================================================================
// Imports
// ============================================================================

import { isDev } from '@/lib/core/config/env-helper';

// ============================================================================
// Types
// ============================================================================

export type {
  // CSP Types
  CSPDirective,
  CSPSourceValue,
  CSPPolicy,
  CSPNonce,
  CSPManagerConfig,
  CSPViolationReport,
  CSPViolationHandler,
  CSPNonceValue,
  // XSS Types
  HTMLEncodingContext,
  SanitizationOptions,
  DangerousContentResult,
  DangerousThreatType,
  ThreatDetail,
  SafeHTMLResult,
  SanitizedHTML,
  TagTransformer,
  // CSRF Types
  CSRFToken,
  CSRFConfig,
  CSRFProtectionMode,
  CSRFValidationResult,
  CSRFRequestInterceptor,
  ValidatedCSRFToken,
  // Secure Storage Types
  SecureStorageConfig,
  SecureStorageInterface,
  SecureStorageResult,
  SecureStorageSetOptions,
  SecureStorageMetadata,
  StorageQuotaInfo,
  EncryptedData,
  EncryptionAlgorithm,
  EncryptedString,
  // Security Context Types
  SecurityContextState,
  SecurityContextActions,
  SecurityContextValue,
  SecurityViolation,
  SecurityConfiguration,
  SecurityEvent,
  SecurityEventType,
  SecurityEventHandler,
  // Hook Return Types
  UseSecureStorageResult,
  UseCSPNonceResult,
  UseCSRFTokenResult,
  UseSanitizedContentResult,
  // Utility Types
  DeepReadonly,
} from './types';

// ============================================================================
// CSP Manager
// ============================================================================

export {
  CSPManager,
  generateNonce,
  parseCSPString,
  mergeCSPPolicies,
  createStrictPolicy,
  validateCSPPolicy,
  type CSPManagerClass,
} from './csp-manager';

// ============================================================================
// XSS Prevention
// ============================================================================

export {
  // Encoding functions
  encodeHTML,
  encodeHTMLAttribute,
  encodeJavaScript,
  encodeCSS,
  encodeURL,
  encodeURLParam,
  encodeForContext,
  decodeHTML,
  // Sanitization functions
  sanitizeHTML,
  stripTags,
  // Detection functions
  detectDangerousContent,
  isDangerous,
  // Safe HTML utilities
  createSafeHTMLProps,
  createTextOnlyProps,
  createSafeInnerHTMLRef,
  // Type guards
  isSanitizedHTML,
  assertSanitizedHTML,
  // Validation
  isContextSafe,
  isValidEmail,
  isValidURL,
} from './xss-prevention';

// ============================================================================
// CSRF Protection
// ============================================================================

export {
  CSRFProtection,
  generateOneTimeToken,
  createSecureRequestInit,
  createProtectedFormHandler,
  validateRequest,
  createCSRFInputProps,
  createCSRFMetaProps,
  type CSRFProtectionClass,
} from './csrf-protection';

// ============================================================================
// Secure Storage
// ============================================================================

export {
  SecureStorage,
  createSecureLocalStorage,
  createSecureSessionStorage,
  initSecureStorage,
  getSecureStorage,
  isSecureStorageAvailable,
  secureWipe,
  generateEncryptionKey,
  hashForKey,
} from './secure-storage';

// ============================================================================
// Security Provider
// ============================================================================

export {
  SecurityProvider,
  SecurityConsumer,
  withSecurityProvider,
  type SecurityProviderProps,
} from './SecurityProvider';

export { SecurityContext } from '../contexts/SecurityContext';

// ============================================================================
// Security Hooks
// ============================================================================

export {
  // Secure Storage Hooks
  useSecureStorage,
  useSecureStorageWithTTL,
  type UseSecureStorageOptions,
  // CSP Nonce Hooks
  useCSPNonce,
  useNonceScript,
  useNonceStyle,
  type UseCSPNonceOptions,
  // CSRF Token Hooks
  useCSRFToken,
  useSecureFetch,
  useSecureFormSubmit,
  type UseCSRFTokenOptions,
  // XSS Prevention Hooks
  useSanitizedContent,
  useSafeInnerHTML,
  useValidatedInput,
  useSafeText,
  useContextEncoder,
  useSafeHTMLWithReport,
  type UseSanitizedContentOptions,
  // Security Context Hooks
  useSecurityContext,
  useSecurityState,
  useSecurityActions,
  useSecurityConfig,
  useViolationReporter,
  useViolations,
  useSecurityStatus,
  useSecurityReady,
  useSecureHandler,
} from './hooks';

// ============================================================================
// Convenience Re-exports from Config
// ============================================================================

export {
  securityConfig,
  cspConfig,
  csrfConfig,
  secureStorageConfig,
  SECURITY_TIMING,
  SECURITY_HEADERS,
  ALLOWED_HTML_TAGS,
  ALLOWED_HTML_ATTRIBUTES,
  ALLOWED_URL_SCHEMES,
  isAllowedUrlScheme,
  isAllowedOrigin,
  isCSRFExcludedPath,
  requiresCSRFProtection,
  getSecurityConfigSummary,
} from '@/config/security.config';

// ============================================================================
// Module Verification (Development Only)
// ============================================================================

if (isDev()) {
  console.info('[Security] Module loaded successfully');
}
