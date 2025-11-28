/**
 * @file Accessibility Enhancer
 * @description A11y improvements including focus management, screen reader
 * announcements, keyboard navigation, and ARIA utilities.
 *
 * Features:
 * - Focus management and trapping
 * - Screen reader announcements
 * - Keyboard navigation helpers
 * - ARIA attribute management
 * - Reduced motion support
 * - Color contrast utilities
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Announcement priority
 */
export type AnnouncementPriority = 'polite' | 'assertive';

/**
 * Focus trap options
 */
export interface FocusTrapOptions {
  /** Element to trap focus within */
  container: HTMLElement;
  /** Initial focus element */
  initialFocus?: HTMLElement | string;
  /** Final focus element (when trap is released) */
  returnFocus?: HTMLElement | boolean;
  /** Allow escape key to release trap */
  escapeDeactivates?: boolean;
  /** Callback when escape is pressed */
  onEscape?: () => void;
  /** Click outside behavior */
  clickOutsideDeactivates?: boolean;
  /** Callback when clicking outside */
  onClickOutside?: () => void;
}

/**
 * Focus trap controller
 */
export interface FocusTrapController {
  activate: () => void;
  deactivate: () => void;
  pause: () => void;
  resume: () => void;
}

/**
 * Roving tabindex options
 */
export interface RovingTabindexOptions {
  /** Container element */
  container: HTMLElement;
  /** Selector for focusable items */
  itemSelector: string;
  /** Orientation */
  orientation: 'horizontal' | 'vertical' | 'both';
  /** Loop navigation */
  loop?: boolean;
  /** Initial focused index */
  initialIndex?: number;
  /** Callback when item is focused */
  onFocus?: (element: HTMLElement, index: number) => void;
}

/**
 * Skip link options
 */
export interface SkipLinkOptions {
  /** Target element ID */
  targetId: string;
  /** Link text */
  text?: string;
  /** Custom class name */
  className?: string;
}

/**
 * Color contrast result
 */
export interface ContrastResult {
  ratio: number;
  aa: boolean;
  aaLarge: boolean;
  aaa: boolean;
  aaaLarge: boolean;
}

// ============================================================================
// Screen Reader Announcements
// ============================================================================

let announcerElement: HTMLElement | null = null;
let assertiveAnnouncerElement: HTMLElement | null = null;

/**
 * Initialize screen reader announcer elements
 */
export function initAnnouncer(): void {
  if (typeof document === 'undefined') return;

  // Polite announcer
  if (!announcerElement) {
    announcerElement = document.createElement('div');
    announcerElement.setAttribute('role', 'status');
    announcerElement.setAttribute('aria-live', 'polite');
    announcerElement.setAttribute('aria-atomic', 'true');
    announcerElement.className = 'sr-only';
    document.body.appendChild(announcerElement);
  }

  // Assertive announcer
  if (!assertiveAnnouncerElement) {
    assertiveAnnouncerElement = document.createElement('div');
    assertiveAnnouncerElement.setAttribute('role', 'alert');
    assertiveAnnouncerElement.setAttribute('aria-live', 'assertive');
    assertiveAnnouncerElement.setAttribute('aria-atomic', 'true');
    assertiveAnnouncerElement.className = 'sr-only';
    document.body.appendChild(assertiveAnnouncerElement);
  }
}

/**
 * Announce a message to screen readers
 */
export function announce(
  message: string,
  priority: AnnouncementPriority = 'polite'
): void {
  initAnnouncer();

  const element =
    priority === 'assertive' ? assertiveAnnouncerElement : announcerElement;

  if (!element) return;

  // Clear and set after a brief delay to ensure announcement
  element.textContent = '';
  setTimeout(() => {
    element.textContent = message;
  }, 50);
}

/**
 * Announce a message assertively (interrupts current speech)
 */
export function announceAssertive(message: string): void {
  announce(message, 'assertive');
}

/**
 * Announce route change
 */
export function announceRouteChange(pageTitle: string): void {
  announce(`Navigated to ${pageTitle}`);
}

/**
 * Announce loading state
 */
export function announceLoading(isLoading: boolean, context?: string): void {
  if (isLoading) {
    announce(`Loading${context ? ` ${context}` : ''}...`);
  } else {
    announce(`${context || 'Content'} loaded`);
  }
}

/**
 * Announce form validation error
 */
export function announceError(message: string): void {
  announceAssertive(`Error: ${message}`);
}

/**
 * Announce success message
 */
export function announceSuccess(message: string): void {
  announce(message);
}

// ============================================================================
// Focus Management
// ============================================================================

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null // Exclude hidden elements
  );
}

/**
 * Get the first focusable element within a container
 */
export function getFirstFocusable(container: HTMLElement): HTMLElement | null {
  const elements = getFocusableElements(container);
  return elements[0] || null;
}

/**
 * Get the last focusable element within a container
 */
export function getLastFocusable(container: HTMLElement): HTMLElement | null {
  const elements = getFocusableElements(container);
  return elements[elements.length - 1] || null;
}

/**
 * Focus the first focusable element in a container
 */
export function focusFirst(container: HTMLElement): boolean {
  const element = getFirstFocusable(container);
  if (element) {
    element.focus();
    return true;
  }
  return false;
}

/**
 * Focus the last focusable element in a container
 */
export function focusLast(container: HTMLElement): boolean {
  const element = getLastFocusable(container);
  if (element) {
    element.focus();
    return true;
  }
  return false;
}

/**
 * Create a focus trap
 */
export function createFocusTrap(options: FocusTrapOptions): FocusTrapController {
  const {
    container,
    initialFocus,
    returnFocus = true,
    escapeDeactivates = true,
    onEscape,
    clickOutsideDeactivates = false,
    onClickOutside,
  } = options;

  let isActive = false;
  let isPaused = false;
  let previouslyFocused: HTMLElement | null = null;

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (isPaused) return;

    if (event.key === 'Tab') {
      const focusables = getFocusableElements(container);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement;

      if (event.shiftKey && active === first && last) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last && first) {
        event.preventDefault();
        first.focus();
      }
    }

    if (event.key === 'Escape' && escapeDeactivates) {
      event.preventDefault();
      onEscape?.();
      deactivate();
    }
  };

  const handleClickOutside = (event: MouseEvent): void => {
    if (isPaused) return;
    if (!container.contains(event.target as Node)) {
      if (clickOutsideDeactivates) {
        onClickOutside?.();
        deactivate();
      }
    }
  };

  const activate = (): void => {
    if (isActive) return;
    isActive = true;

    // Store previously focused element
    previouslyFocused = document.activeElement as HTMLElement;

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    if (clickOutsideDeactivates) {
      document.addEventListener('click', handleClickOutside, true);
    }

    // Focus initial element
    setTimeout(() => {
      if (initialFocus) {
        const element =
          typeof initialFocus === 'string'
            ? container.querySelector<HTMLElement>(initialFocus)
            : initialFocus;
        element?.focus();
      } else {
        focusFirst(container);
      }
    }, 0);
  };

  const deactivate = (): void => {
    if (!isActive) return;
    isActive = false;

    // Remove event listeners
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('click', handleClickOutside, true);

    // Return focus
    if (returnFocus && previouslyFocused) {
      const target =
        typeof returnFocus === 'boolean' ? previouslyFocused : returnFocus;
      target?.focus();
    }
  };

  const pause = (): void => {
    isPaused = true;
  };

  const resume = (): void => {
    isPaused = false;
  };

  return { activate, deactivate, pause, resume };
}

// ============================================================================
// Roving Tabindex
// ============================================================================

/**
 * Create a roving tabindex controller
 */
export function createRovingTabindex(
  options: RovingTabindexOptions
): {
  init: () => void;
  destroy: () => void;
  setFocusedIndex: (index: number) => void;
} {
  const {
    container,
    itemSelector,
    orientation,
    loop = true,
    initialIndex = 0,
    onFocus,
  } = options;

  let currentIndex = initialIndex;
  let items: HTMLElement[] = [];

  const updateTabindices = (): void => {
    items.forEach((item, index) => {
      item.setAttribute('tabindex', index === currentIndex ? '0' : '-1');
    });
  };

  const focusItem = (index: number): void => {
    if (index < 0 || index >= items.length) return;
    const item = items[index];
    if (!item) return;
    currentIndex = index;
    updateTabindices();
    item.focus();
    onFocus?.(item, index);
  };

  const getNextIndex = (direction: number): number => {
    let nextIndex = currentIndex + direction;

    if (loop) {
      if (nextIndex < 0) nextIndex = items.length - 1;
      if (nextIndex >= items.length) nextIndex = 0;
    } else {
      nextIndex = Math.max(0, Math.min(items.length - 1, nextIndex));
    }

    return nextIndex;
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    const isHorizontal = orientation === 'horizontal' || orientation === 'both';
    const isVertical = orientation === 'vertical' || orientation === 'both';

    let direction: number | null = null;

    if (isHorizontal && event.key === 'ArrowRight') direction = 1;
    if (isHorizontal && event.key === 'ArrowLeft') direction = -1;
    if (isVertical && event.key === 'ArrowDown') direction = 1;
    if (isVertical && event.key === 'ArrowUp') direction = -1;
    if (event.key === 'Home') {
      event.preventDefault();
      focusItem(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      focusItem(items.length - 1);
      return;
    }

    if (direction !== null) {
      event.preventDefault();
      focusItem(getNextIndex(direction));
    }
  };

  const init = (): void => {
    items = Array.from(container.querySelectorAll<HTMLElement>(itemSelector));
    updateTabindices();
    container.addEventListener('keydown', handleKeyDown);
  };

  const destroy = (): void => {
    container.removeEventListener('keydown', handleKeyDown);
  };

  const setFocusedIndex = (index: number): void => {
    focusItem(index);
  };

  return { init, destroy, setFocusedIndex };
}

// ============================================================================
// Skip Links
// ============================================================================

/**
 * Create a skip link element
 */
export function createSkipLink(options: SkipLinkOptions): HTMLAnchorElement {
  const { targetId, text = 'Skip to main content', className = 'skip-link' } = options;

  const link = document.createElement('a');
  link.href = `#${targetId}`;
  link.className = className;
  link.textContent = text;

  link.addEventListener('click', (event) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus();
      target.removeAttribute('tabindex');
    }
  });

  return link;
}

/**
 * Install default skip links
 */
export function installSkipLinks(): void {
  if (typeof document === 'undefined') return;

  const skipLinkContainer = document.createElement('div');
  skipLinkContainer.className = 'skip-links';

  // Main content skip link
  if (document.getElementById('main-content') || document.querySelector('main')) {
    const mainLink = createSkipLink({
      targetId: 'main-content',
      text: 'Skip to main content',
    });
    skipLinkContainer.appendChild(mainLink);
  }

  // Navigation skip link
  if (document.getElementById('main-nav') || document.querySelector('nav')) {
    const navLink = createSkipLink({
      targetId: 'main-nav',
      text: 'Skip to navigation',
    });
    skipLinkContainer.appendChild(navLink);
  }

  if (skipLinkContainer.children.length > 0) {
    document.body.insertBefore(skipLinkContainer, document.body.firstChild);
  }
}

// ============================================================================
// ARIA Utilities
// ============================================================================

/**
 * Set ARIA expanded state
 */
export function setExpanded(
  element: HTMLElement,
  expanded: boolean,
  controlledId?: string
): void {
  element.setAttribute('aria-expanded', String(expanded));
  if (controlledId) {
    element.setAttribute('aria-controls', controlledId);
  }
}

/**
 * Set ARIA pressed state (for toggle buttons)
 */
export function setPressed(element: HTMLElement, pressed: boolean): void {
  element.setAttribute('aria-pressed', String(pressed));
}

/**
 * Set ARIA selected state
 */
export function setSelected(element: HTMLElement, selected: boolean): void {
  element.setAttribute('aria-selected', String(selected));
}

/**
 * Set ARIA busy state
 */
export function setBusy(element: HTMLElement, busy: boolean): void {
  element.setAttribute('aria-busy', String(busy));
}

/**
 * Set ARIA disabled state
 */
export function setDisabled(element: HTMLElement, disabled: boolean): void {
  element.setAttribute('aria-disabled', String(disabled));
  if (disabled) {
    element.setAttribute('tabindex', '-1');
  } else {
    element.removeAttribute('tabindex');
  }
}

/**
 * Set ARIA hidden state
 */
export function setHidden(element: HTMLElement, hidden: boolean): void {
  if (hidden) {
    element.setAttribute('aria-hidden', 'true');
    element.setAttribute('inert', '');
  } else {
    element.removeAttribute('aria-hidden');
    element.removeAttribute('inert');
  }
}

/**
 * Generate unique ID for ARIA relationships
 */
let ariaIdCounter = 0;
export function generateAriaId(prefix: string = 'aria'): string {
  return `${prefix}-${++ariaIdCounter}`;
}

// ============================================================================
// Reduced Motion
// ============================================================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Subscribe to reduced motion preference changes
 */
export function onReducedMotionChange(
  callback: (prefersReduced: boolean) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const handler = (event: MediaQueryListEvent): void => {
    callback(event.matches);
  };

  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}

/**
 * Get safe animation duration based on user preference
 */
export function getSafeAnimationDuration(
  normalDuration: number,
  reducedDuration: number = 0
): number {
  return prefersReducedMotion() ? reducedDuration : normalDuration;
}

// ============================================================================
// Color Contrast
// ============================================================================

/**
 * Calculate relative luminance of a color
 */
export function getLuminance(r: number, g: number, b: number): number {
  const [rs = 0, gs = 0, bs = 0] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(
  color1: [number, number, number],
  color2: [number, number, number]
): number {
  const l1 = getLuminance(...color1);
  const l2 = getLuminance(...color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG requirements
 */
export function checkContrast(
  foreground: [number, number, number],
  background: [number, number, number]
): ContrastResult {
  const ratio = getContrastRatio(foreground, background);

  return {
    ratio,
    aa: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaa: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  };
}

/**
 * Parse hex color to RGB
 */
export function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result && result[1] && result[2] && result[3]
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : null;
}

// ============================================================================
// CSS Export
// ============================================================================

export const accessibilityStyles = `
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: #fff;
    padding: 8px 16px;
    z-index: 10000;
    text-decoration: none;
  }

  .skip-link:focus {
    top: 0;
  }

  .skip-links {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 10000;
  }

  /* Visible focus styles */
  :focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;
