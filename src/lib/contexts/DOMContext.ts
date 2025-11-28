/**
 * @file DOM Context
 * @description Context for DOM state management (Fast Refresh compliant).
 */

import { createContext } from 'react';

/**
 * Color scheme
 */
export type ColorScheme = 'light' | 'dark';

/**
 * DOM context value
 */
export interface DOMContext {
  viewportWidth: number;
  viewportHeight: number;
  scrollY: number;
  scrollX: number;
  colorScheme: ColorScheme;
  reducedMotion: boolean;
  touchEnabled: boolean;
  isClient: boolean;
}

/**
 * Default DOM context
 */
export const defaultDOMContext: DOMContext = {
  viewportWidth: 0,
  viewportHeight: 0,
  scrollY: 0,
  scrollX: 0,
  colorScheme: 'light',
  reducedMotion: false,
  touchEnabled: false,
  isClient: false,
};

/**
 * DOM context - extracted for Fast Refresh compliance
 */
export const DOMContextReactContext = createContext<DOMContext>(defaultDOMContext);

/**
 * DOM context update function context
 */
export const DOMContextUpdateContext = createContext<(() => void) | null>(null);
