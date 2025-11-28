/**
 * @file Security Context
 * @description Context for security management (Fast Refresh compliant).
 */

import { createContext } from 'react';

/**
 * Sanitization level
 */
export type SanitizationLevel = 'strict' | 'moderate' | 'permissive';

/**
 * Security context value
 */
export interface SecurityContextValue {
  csrfToken: string | null;
  nonce: string | null;
  sanitizationLevel: SanitizationLevel;
  allowedTags: string[];
  allowedAttributes: Record<string, string[]>;
  allowedSchemes: string[];
  sanitize: (html: string) => string;
  validateUrl: (url: string) => boolean;
}

/**
 * Security context - extracted for Fast Refresh compliance
 */
export const SecurityContext = createContext<SecurityContextValue | null>(null);
