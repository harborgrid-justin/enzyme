/**
 * @file Scroll Container Context
 * @description Context for scroll container management (Fast Refresh compliant).
 */

import { createContext } from 'react';

/**
 * Scroll position
 */
export interface ScrollPosition {
  x: number;
  y: number;
}

/**
 * Scroll container
 */
export interface ScrollContainer {
  element: HTMLElement | null;
  position: ScrollPosition;
  isScrolling: boolean;
  scrollTo: (x: number, y: number, smooth?: boolean) => void;
  scrollToTop: (smooth?: boolean) => void;
  scrollToBottom: (smooth?: boolean) => void;
  scrollToElement: (element: HTMLElement, options?: ScrollIntoViewOptions) => void;
}

/**
 * Scroll container context - extracted for Fast Refresh compliance
 */
export const ScrollContainerContext = createContext<ScrollContainer | null>(null);

ScrollContainerContext.displayName = 'ScrollContainerContext';
