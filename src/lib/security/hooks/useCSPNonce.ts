/**
 * @fileoverview useCSPNonce Hook
 * @module @/lib/security/hooks/useCSPNonce
 *
 * React hook for accessing CSP nonce values for inline scripts and styles.
 * Provides formatted attributes ready for use in JSX.
 *
 * @author Harbor Security Team
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { UseCSPNonceResult } from '../types';
import { CSPManager, generateNonce } from '../csp-manager';

/**
 * Options for the useCSPNonce hook
 */
export interface UseCSPNonceOptions {
  /** Auto-regenerate nonce at this interval (ms) */
  regenerateInterval?: number;
  /** Whether to initialize CSP Manager if not already */
  autoInitialize?: boolean;
}

/**
 * Hook for accessing CSP nonce values
 *
 * Provides nonce values for inline scripts and styles that comply
 * with Content Security Policy requirements.
 *
 * @param options - Hook options
 * @returns CSP nonce operations and values
 *
 * @example
 * ```tsx
 * function ScriptLoader() {
 *   const { nonce, scriptNonce } = useCSPNonce();
 *
 *   return (
 *     <script nonce={nonce} dangerouslySetInnerHTML={{
 *       __html: 'console.log("Secure inline script")'
 *     }} />
 *   );
 * }
 *
 * // Or with style
 * function InlineStyle() {
 *   const { nonce, styleNonce } = useCSPNonce();
 *
 *   return (
 *     <style nonce={nonce}>{`
 *       .secure-class { color: blue; }
 *     `}</style>
 *   );
 * }
 * ```
 */
export function useCSPNonce(
  options: UseCSPNonceOptions = {}
): UseCSPNonceResult {
  const { regenerateInterval, autoInitialize = true } = options;

  // State for the current nonce
  const [nonce, setNonce] = useState<string>(() => {
    // Try to get existing nonce from CSP Manager
    try {
      if (CSPManager.isInitialized()) {
        return CSPManager.getCurrentNonce();
      }
    } catch {
      // Manager not initialized, generate a standalone nonce
    }
    return generateNonce();
  });

  // Initialize CSP Manager if needed
  useEffect(() => {
    if (autoInitialize && !CSPManager.isInitialized()) {
      CSPManager.initialize();
      // Schedule nonce update for next render to avoid cascading renders
      Promise.resolve().then(() => {
        try {
          setNonce(CSPManager.getCurrentNonce());
        } catch {
          // Keep the generated nonce
        }
      }).catch(() => {
        // Ignore errors
      });
    }
    return undefined;
  }, [autoInitialize]);

  // Regenerate nonce function
  const regenerate = useCallback((): string => {
    let newNonce: string;

    if (CSPManager.isInitialized()) {
      const nonceObj = CSPManager.regenerateNonce();
      newNonce = nonceObj.value;
    } else {
      newNonce = generateNonce();
    }

    setNonce(newNonce);
    return newNonce;
  }, []);

  // Set up auto-regeneration interval
  useEffect(() => {
    if (regenerateInterval && regenerateInterval > 0) {
      const intervalId = setInterval(() => {
        regenerate();
      }, regenerateInterval);

      return () => clearInterval(intervalId);
    }
    return undefined;
  }, [regenerateInterval, regenerate]);

  // Memoized nonce attributes
  const scriptNonce = useMemo(() => nonce, [nonce]);
  const styleNonce = useMemo(() => nonce, [nonce]);

  return {
    nonce,
    scriptNonce,
    styleNonce,
    regenerate,
  };
}

/**
 * Hook for creating nonce-protected inline script props
 *
 * @example
 * ```tsx
 * function TrackerScript() {
 *   const scriptProps = useNonceScript('console.log("tracked")');
 *
 *   return <script {...scriptProps} />;
 * }
 * ```
 */
export function useNonceScript(
  scriptContent: string
): {
  nonce: string;
  dangerouslySetInnerHTML: { __html: string };
} {
  const { nonce } = useCSPNonce();

  return useMemo(
    () => ({
      nonce,
      dangerouslySetInnerHTML: { __html: scriptContent },
    }),
    [nonce, scriptContent]
  );
}

/**
 * Hook for creating nonce-protected inline style props
 *
 * @example
 * ```tsx
 * function CustomStyles() {
 *   const styleProps = useNonceStyle('.custom { color: red; }');
 *
 *   return <style {...styleProps} />;
 * }
 * ```
 */
export function useNonceStyle(
  styleContent: string
): {
  nonce: string;
  dangerouslySetInnerHTML: { __html: string };
} {
  const { nonce } = useCSPNonce();

return useMemo(
  () => ({
    nonce,
    dangerouslySetInnerHTML: { __html: styleContent },
  }),
  [nonce, styleContent]
);
}