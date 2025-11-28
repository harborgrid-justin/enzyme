/**
 * @fileoverview useSanitizedContent Hook
 * @module @/lib/security/hooks/useSanitizedContent
 *
 * React hook for XSS-safe content handling with automatic
 * sanitization, threat detection, and context-aware encoding.
 *
 * @author Harbor Security Team
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  HTMLEncodingContext,
  SanitizationOptions,
  ThreatDetail,
  SafeHTMLResult,
  UseSanitizedContentResult,
} from '../types';
import {
  sanitizeHTML,
  encodeForContext,
  detectDangerousContent,
  isDangerous,
  createSafeHTMLProps,
} from '../xss-prevention';

/**
 * Options for the useSanitizedContent hook
 */
export interface UseSanitizedContentOptions extends SanitizationOptions {
  /** Whether to auto-sanitize on content change */
  autoSanitize?: boolean;
  /** Callback when threats are detected */
  onThreatsDetected?: (threats: readonly ThreatDetail[]) => void;
}

/**
 * Hook for XSS-safe content handling
 *
 * Provides sanitized HTML content, threat detection, and
 * context-aware encoding utilities.
 *
 * @param content - The content to sanitize
 * @param options - Sanitization options
 * @returns Sanitized content and utilities
 *
 * @example
 * ```tsx
 * function UserContent({ html }: { html: string }) {
 *   const {
 *     sanitizedHTML,
 *     wasModified,
 *     threats,
 *     isSafe,
 *   } = useSanitizedContent(html);
 *
 *   if (!isSafe) {
 *     console.warn('Threats detected:', threats);
 *   }
 *
 *   return (
 *     <div>
 *       {wasModified && (
 *         <div className="warning">Content was sanitized for safety</div>
 *       )}
 *       <div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useSanitizedContent(
  content: string,
  options: UseSanitizedContentOptions = {}
): UseSanitizedContentResult {
  const {
    autoSanitize = true,
    onThreatsDetected,
    ...sanitizationOptions
  } = options;

  // State
  const [sanitizedHTML, setSanitizedHTML] = useState<string>('');
  const [wasModified, setWasModified] = useState(false);
  const [threats, setThreats] = useState<readonly ThreatDetail[]>([]);

  // Memoized sanitization options
  const memoizedOptions = useMemo(
    () => sanitizationOptions,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(sanitizationOptions)]
  );

  // Sanitize content effect
  useEffect(() => {
    if (!autoSanitize || !content) {
      setSanitizedHTML('');
      setWasModified(false);
      setThreats([]);
      return;
    }

    // Detect threats
    const detectionResult = detectDangerousContent(content);
    setThreats(detectionResult.details);

    // Notify about threats
    if (detectionResult.isDangerous && onThreatsDetected) {
      onThreatsDetected(detectionResult.details);
    }

    // Sanitize
    const result = sanitizeHTML(content, memoizedOptions);
    setSanitizedHTML(result.html);
    setWasModified(result.wasModified);
  }, [content, autoSanitize, memoizedOptions, onThreatsDetected]);

  // Manual sanitize function
  const sanitize = useCallback(
    (newContent: string, overrideOptions?: SanitizationOptions): SafeHTMLResult => {
      const opts = { ...memoizedOptions, ...overrideOptions };
      return sanitizeHTML(newContent, opts);
    },
    [memoizedOptions]
  );

  // Context-aware encode function
  const encode = useCallback(
    (text: string, context: HTMLEncodingContext): string => {
      return encodeForContext(text, context);
    },
    []
  );

  // Computed isSafe
  const isSafe = threats.length === 0;

  return {
    sanitizedHTML,
    wasModified,
    threats,
    isSafe,
    sanitize,
    encode,
  };
}

/**
 * Hook for creating safe innerHTML props
 *
 * Convenience hook that returns props ready for React elements.
 *
 * @example
 * ```tsx
 * function RichText({ content }: { content: string }) {
 *   const { props, isSafe, warnings } = useSafeInnerHTML(content);
 *
 *   return (
 *     <div {...props} className="rich-text" />
 *   );
 * }
 * ```
 */
export function useSafeInnerHTML(
  content: string,
  options?: SanitizationOptions
): {
  props: { dangerouslySetInnerHTML: { __html: string } };
  isSafe: boolean;
  warnings: readonly string[];
} {
  const [result, setResult] = useState<SafeHTMLResult>({
    html: '',
    wasModified: false,
    removedItems: [],
    warnings: [],
  });

  useEffect(() => {
    if (!content) {
      setResult({
        html: '',
        wasModified: false,
        removedItems: [],
        warnings: [],
      });
      return;
    }

    const sanitized = sanitizeHTML(content, options);
    setResult(sanitized);
  }, [content, options]);

  const props = useMemo(
    () => ({
      dangerouslySetInnerHTML: { __html: result.html },
    }),
    [result.html]
  );

  return {
    props,
    isSafe: !isDangerous(content),
    warnings: result.warnings,
  };
}

/**
 * Hook for validating user input in real-time
 *
 * @example
 * ```tsx
 * function CommentInput() {
 *   const [value, setValue] = useState('');
 *   const { isValid, threats, preview } = useValidatedInput(value);
 *
 *   return (
 *     <div>
 *       <textarea
 *         value={value}
 *         onChange={(e) => setValue(e.target.value)}
 *         className={isValid ? '' : 'error'}
 *       />
 *       {!isValid && (
 *         <p className="warning">
 *           Content contains potentially dangerous patterns
 *         </p>
 *       )}
 *       <div className="preview">
 *         <strong>Preview:</strong>
 *         <div dangerouslySetInnerHTML={{ __html: preview }} />
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useValidatedInput(
  input: string,
  options?: SanitizationOptions
): {
  isValid: boolean;
  threats: readonly ThreatDetail[];
  preview: string;
  sanitized: string;
} {
  const [state, setState] = useState({
    isValid: true,
    threats: [] as readonly ThreatDetail[],
    preview: '',
    sanitized: '',
  });

  useEffect(() => {
    if (!input) {
      setState({
        isValid: true,
        threats: [],
        preview: '',
        sanitized: '',
      });
      return;
    }

    // Detect threats
    const detection = detectDangerousContent(input);

    // Sanitize for preview
    const result = sanitizeHTML(input, options);

    setState({
      isValid: !detection.isDangerous,
      threats: detection.details,
      preview: result.html,
      sanitized: result.html,
    });
  }, [input, options]);

  return state;
}

/**
 * Hook for safe text rendering (no HTML)
 *
 * Strips all HTML and encodes for safe display.
 *
 * @example
 * ```tsx
 * function PlainText({ content }: { content: string }) {
 *   const safeText = useSafeText(content);
 *
 *   return <p>{safeText}</p>;
 * }
 * ```
 */
export function useSafeText(content: string): string {
  return useMemo(() => {
    if (!content) return '';

    const result = sanitizeHTML(content, { stripAllHtml: true });
    return result.html;
  }, [content]);
}

/**
 * Hook for context-aware encoding
 *
 * @example
 * ```tsx
 * function SearchHighlight({ term }: { term: string }) {
 *   const encode = useContextEncoder();
 *
 *   // Safe for HTML content
 *   const htmlSafe = encode(term, 'html-content');
 *
 *   // Safe for URL parameter
 *   const urlSafe = encode(term, 'url-param');
 *
 *   return (
 *     <a href={`/search?q=${urlSafe}`}>
 *       Search for: {htmlSafe}
 *     </a>
 *   );
 * }
 * ```
 */
export function useContextEncoder(): (
  content: string,
  context: HTMLEncodingContext
) => string {
  return useCallback((content: string, context: HTMLEncodingContext) => {
    return encodeForContext(content, context);
  }, []);
}

/**
 * Hook for creating safe HTML props with threat reporting
 *
 * @example
 * ```tsx
 * function ModeratedContent({ html }: { html: string }) {
 *   const { props, report } = useSafeHTMLWithReport(html, {
 *     onReport: (report) => analytics.track('xss_attempt', report),
 *   });
 *
 *   return <div {...props} />;
 * }
 * ```
 */
export function useSafeHTMLWithReport(
  content: string,
  options: {
    sanitizationOptions?: SanitizationOptions;
    onReport?: (report: {
      originalContent: string;
      threats: readonly ThreatDetail[];
      sanitizedContent: string;
      timestamp: number;
    }) => void;
  } = {}
): {
  props: ReturnType<typeof createSafeHTMLProps>;
  report: {
    hadThreats: boolean;
    threatCount: number;
    threatTypes: readonly string[];
  };
} {
  const { sanitizationOptions, onReport } = options;

  const [report, setReport] = useState({
    hadThreats: false,
    threatCount: 0,
    threatTypes: [] as readonly string[],
  });

  const props = useMemo(() => {
    if (!content) {
      return { dangerouslySetInnerHTML: { __html: '' } };
    }

    // Detect threats
    const detection = detectDangerousContent(content);

    // Get sanitized props
    const safeProps = createSafeHTMLProps(content, sanitizationOptions);

    // Update report
    const newReport = {
      hadThreats: detection.isDangerous,
      threatCount: detection.details.length,
      threatTypes: [...new Set(detection.threats)],
    };
    setReport(newReport);

    // Call report callback if threats detected
    if (detection.isDangerous && onReport) {
      onReport({
        originalContent: content,
        threats: detection.details,
        sanitizedContent: safeProps.dangerouslySetInnerHTML.__html,
        timestamp: Date.now(),
      });
    }

    return safeProps;
  }, [content, sanitizationOptions, onReport]);

  return { props, report };
}

export default useSanitizedContent;
