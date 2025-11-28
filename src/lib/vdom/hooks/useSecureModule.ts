/**
 * @file useSecureModule Hook
 * @module vdom/hooks/useSecureModule
 * @description Hook for accessing module security context with content
 * validation, sanitization, and violation reporting capabilities.
 *
 * @author Agent 5 - PhD Virtual DOM Expert
 * @version 1.0.0
 */

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import {
  type UseSecureModuleReturn,
  type SecurityViolation,
  type SecurityNonce,
  ModuleLifecycleEvent,
} from '../types';
import { useModuleContext } from '../ModuleBoundary';
import { devWarn } from '@/lib/core/config/env-helper';

/**
 * Hook for accessing module security context.
 * Provides content validation, sanitization, and security monitoring.
 *
 * @returns Security context and utilities
 * @throws Error if used outside a ModuleBoundary
 *
 * @example
 * ```tsx
 * function UserContent({ html }: { html: string }) {
 *   const {
 *     validateContent,
 *     sanitize,
 *     isSecure,
 *     nonce,
 *     violations,
 *   } = useSecureModule();
 *
 *   // Validate before rendering
 *   if (!validateContent(html)) {
 *     return <p>Invalid content detected</p>;
 *   }
 *
 *   // Sanitize for safe rendering
 *   const safeHtml = sanitize(html);
 *
 *   return (
 *     <div>
 *       {!isSecure && (
 *         <Warning>Security violations detected: {violations.length}</Warning>
 *       )}
 *       <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useSecureModule(): UseSecureModuleReturn {
  const context = useModuleContext();
  const securityContext = context.security;

  // Local violations state for tracking
  const [violations, setViolations] = useState<SecurityViolation[]>(
    () => [...securityContext.violations]
  );

  // Sync with context violations using queueMicrotask to avoid synchronous setState
  useEffect(() => {
    queueMicrotask(() => {
      setViolations([...securityContext.violations]);
    });
  }, [securityContext.violations]);

  // Report a new violation
  const reportViolation = useCallback(
    (violation: Omit<SecurityViolation, 'timestamp'>) => {
      const fullViolation: SecurityViolation = {
        ...violation,
        timestamp: Date.now(),
      };

      setViolations((prev) => [...prev, fullViolation]);

      // Log in development
      devWarn('[Security Violation]', fullViolation);
    },
    []
  );

  // Memoize return value
  return useMemo<UseSecureModuleReturn>(
    () => ({
      securityContext,
      nonce: securityContext.nonce,
      isSecure: securityContext.isSecure && violations.length === 0,
      validateContent: securityContext.validateContent,
      sanitize: securityContext.sanitize,
      isEventAllowed: securityContext.isEventAllowed,
      violations,
      reportViolation,
    }),
    [securityContext, violations, reportViolation]
  );
}

/**
 * Hook to get the security nonce.
 * @returns Security nonce or null
 */
export function useSecurityNonce(): SecurityNonce | null {
  const { nonce } = useSecureModule();
  return nonce;
}

/**
 * Hook to check if the module is in secure state.
 * @returns Whether module is secure
 */
export function useIsSecure(): boolean {
  const { isSecure } = useSecureModule();
  return isSecure;
}

/**
 * Hook to get a content sanitizer function.
 * @returns Sanitizer function
 *
 * @example
 * ```tsx
 * const sanitize = useSanitizer();
 * const safeContent = sanitize(userInput);
 * ```
 */
export function useSanitizer(): (content: string) => string {
  const { sanitize } = useSecureModule();
  return sanitize;
}

/**
 * Hook to get a content validator function.
 * @returns Validator function
 */
export function useContentValidator(): (content: string) => boolean {
  const { validateContent } = useSecureModule();
  return validateContent;
}

/**
 * Hook to get security violations.
 * @returns Array of violations
 */
export function useSecurityViolations(): ReadonlyArray<SecurityViolation> {
  const { violations } = useSecureModule();
  return violations;
}

/**
 * Hook for safely rendering user-provided HTML.
 * @param html - Raw HTML string
 * @returns Safe HTML and validation state
 *
 * @example
 * ```tsx
 * function RichText({ content }: { content: string }) {
 *   const { safeHtml, isValid, error } = useSafeHtml(content);
 *
 *   if (!isValid) {
 *     return <p>Invalid content: {error}</p>;
 *   }
 *
 *   return <div dangerouslySetInnerHTML={{ __html: safeHtml }} />;
 * }
 * ```
 */
export function useSafeHtml(html: string): {
  safeHtml: string;
  isValid: boolean;
  error: string | null;
} {
  const { validateContent, sanitize, reportViolation } = useSecureModule();
  const context = useModuleContext();

  return useMemo(() => {
    const isValid = validateContent(html);

    if (!isValid) {
      reportViolation({
        type: 'xss',
        message: 'Potentially dangerous HTML content detected',
        moduleId: context.moduleId,
        blockedContent: html.substring(0, 100),
      });

      return {
        safeHtml: '',
        isValid: false,
        error: 'Content failed security validation',
      };
    }

    const safeHtml = sanitize(html);

    return {
      safeHtml,
      isValid: true,
      error: null,
    };
  }, [html, validateContent, sanitize, reportViolation, context.moduleId]);
}

/**
 * Hook for secure URL validation.
 * @param url - URL to validate
 * @returns Whether URL is safe
 *
 * @example
 * ```tsx
 * function Link({ href }: { href: string }) {
 *   const isSafe = useSecureUrl(href);
 *
 *   if (!isSafe) {
 *     return <span>{href}</span>;
 *   }
 *
 *   return <a href={href}>{href}</a>;
 * }
 * ```
 */
export function useSecureUrl(url: string): boolean {
  return useMemo(() => {
    try {
      const parsed = new URL(url, window.location.origin);
      const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
      return safeProtocols.includes(parsed.protocol);
    } catch {
      return false;
    }
  }, [url]);
}

/**
 * Hook for CSP nonce injection in style tags.
 * @returns Props to spread on style elements
 *
 * @example
 * ```tsx
 * function InlineStyles() {
 *   const styleProps = useSecureStyleProps();
 *
 *   return (
 *     <style {...styleProps}>
 *       {`.my-class { color: blue; }`}
 *     </style>
 *   );
 * }
 * ```
 */
export function useSecureStyleProps(): { nonce?: string } {
  const { nonce } = useSecureModule();

  return useMemo(
    () => (nonce ? { nonce } : {}),
    [nonce]
  );
}

/**
 * Hook for CSP nonce injection in script tags.
 * @returns Props to spread on script elements
 */
export function useSecureScriptProps(): { nonce?: string } {
  const { nonce } = useSecureModule();

  return useMemo(
    () => (nonce ? { nonce } : {}),
    [nonce]
  );
}

/**
 * Hook for event permission checking.
 * @param eventName - Event name to check
 * @returns Whether event is allowed
 */
export function useIsEventAllowed(eventName: string): boolean {
  const { isEventAllowed } = useSecureModule();
  return isEventAllowed(eventName);
}

/**
 * Hook for secure cross-module messaging.
 * Validates and sanitizes messages before sending.
 *
 * @returns Secure messaging utilities
 *
 * @example
 * ```tsx
 * function SecureMessenger() {
 *   const { sendSecure, onSecureMessage } = useSecureMessaging();
 *
 *   const handleSend = () => {
 *     sendSecure('data:update', { value: 'safe data' });
 *   };
 *
 *   useEffect(() => {
 *     return onSecureMessage('data:received', (payload) => {
 *       console.log('Received:', payload);
 *     });
 *   }, [onSecureMessage]);
 *
 *   return <button onClick={handleSend}>Send</button>;
 * }
 * ```
 */
export function useSecureMessaging(): {
  sendSecure: <T>(eventName: string, payload: T) => boolean;
  onSecureMessage: <T>(
    eventName: string,
    handler: (payload: T) => void
  ) => () => void;
} {
  const { isEventAllowed, sanitize, reportViolation } = useSecureModule();
  const context = useModuleContext();

  const sendSecure = useCallback(
    <T>(eventName: string, payload: T): boolean => {
      // Validate event is allowed
      if (!isEventAllowed(eventName)) {
        reportViolation({
          type: 'origin',
          message: `Event not allowed: ${eventName}`,
          moduleId: context.moduleId,
        });
        return false;
      }

      // Sanitize string payloads
      let safePayload = payload;
      if (typeof payload === 'string') {
        safePayload = sanitize(payload) as unknown as T;
      } else if (typeof payload === 'object' && payload !== null) {
        // Deep sanitize object strings
        safePayload = JSON.parse(
          sanitize(JSON.stringify(payload))
        ) as T;
      }

      // Emit through context
      context.dispatch({
        type: 'SET_STATE',
        key: `__event_${eventName}_${Date.now()}`,
        value: safePayload,
      });

      return true;
    },
    [isEventAllowed, sanitize, reportViolation, context]
  );

  const onSecureMessage = useCallback(
    <T>(eventName: string, _handler: (payload: T) => void): (() => void) => {
      if (!isEventAllowed(eventName)) {
        return () => {};
      }

      // Subscribe to lifecycle events as a proxy for secure messaging
      return context.subscribe(ModuleLifecycleEvent.AFTER_UPDATE, () => {
        // This is a simplified implementation
        // Real implementation would use the event bus with validation
      });
    },
    [isEventAllowed, context]
  );

return useMemo(
  () => ({
    sendSecure,
    onSecureMessage,
  }),
  [sendSecure, onSecureMessage]
);
}