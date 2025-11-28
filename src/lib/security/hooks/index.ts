/**
 * @fileoverview Security Hooks Index
 * @module @/lib/security/hooks
 *
 * Central export for all security-related React hooks.
 *
 * @author Harbor Security Team
 * @version 1.0.0
 */

// ============================================================================
// Secure Storage Hooks
// ============================================================================

export {
  useSecureStorage,
  useSecureStorageWithTTL,
  type UseSecureStorageOptions,
} from './useSecureStorage';

// ============================================================================
// CSP Nonce Hooks
// ============================================================================

export {
  useCSPNonce,
  useNonceScript,
  useNonceStyle,
  type UseCSPNonceOptions,
} from './useCSPNonce';

// ============================================================================
// CSRF Token Hooks
// ============================================================================

export {
  useCSRFToken,
  useSecureFetch,
  useSecureFormSubmit,
  type UseCSRFTokenOptions,
} from './useCSRFToken';

// ============================================================================
// XSS Prevention / Sanitization Hooks
// ============================================================================

export {
  useSanitizedContent,
  useSafeInnerHTML,
  useValidatedInput,
  useSafeText,
  useContextEncoder,
  useSafeHTMLWithReport,
  type UseSanitizedContentOptions,
} from './useSanitizedContent';

// ============================================================================
// Security Context Hooks
// ============================================================================

export {
  useSecurityContext,
  useSecurityState,
  useSecurityActions,
  useSecurityConfig,
  useViolationReporter,
  useViolations,
  useSecurityStatus,
  useSecurityReady,
  useSecureHandler,
} from './useSecurityContext';

// Re-export all exports from individual hook files
