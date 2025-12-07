/**
 * @file Accessibility Utilities
 * @description Accessibility helper functions (Fast Refresh compliant).
 */

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  if (typeof document === 'undefined') return;

  // Find or create live region
  let liveRegion = document.getElementById('a11y-live-region');

  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'a11y-live-region';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';

    // Screen reader only styles
    Object.assign(liveRegion.style, {
      position: 'absolute',
      left: '-10000px',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
    });

    document.body.appendChild(liveRegion);
  }

  // Update message
  liveRegion.textContent = message;

  // Clear after delay to allow re-announcing same message
  setTimeout(() => {
    if (liveRegion !== null) {
      liveRegion.textContent = '';
    }
  }, 1000);
}

/**
 * Create visually hidden but screen reader accessible text
 */
export function createScreenReaderText(text: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.textContent = text;
  span.className = 'sr-only';

  Object.assign(span.style, {
    position: 'absolute',
    left: '-10000px',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
  });

  return span;
}

/**
 * Set focus to element with optional delay
 */
export function setFocusTo(element: HTMLElement | null, delay = 0): void {
  if (!element) return;

  if (delay > 0) {
    setTimeout(() => element.focus(), delay);
  } else {
    element.focus();
  }
}

/**
 * Trap focus within container
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  const [firstElement] = focusableElements;
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        lastElement?.focus();
        e.preventDefault();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        firstElement?.focus();
        e.preventDefault();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}
/**
 * Get all focusable elements within container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll<HTMLElement>(selector));
}

/**
 * Restore focus to previous element
 */
export function createFocusRestorer(): { save: () => void; restore: () => void } {
  let previouslyFocused: HTMLElement | null = null;

  return {
    save: () => {
      previouslyFocused = document.activeElement as HTMLElement;
    },
    restore: () => {
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    },
  };
}

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get ARIA attributes for loading state
 */
export function getLoadingAriaAttributes(
  isLoading: boolean,
  label?: string
): {
  'aria-busy': boolean;
  'aria-live': 'polite';
  'aria-label'?: string;
} {
  return {
    'aria-busy': isLoading,
    'aria-live': 'polite' as const,
    ...(label !== undefined ? { 'aria-label': label } : {}),
  };
}

/**
 * Get ARIA attributes for expanded/collapsed state
 */
export function getExpandableAriaAttributes(
  isExpanded: boolean,
  controlsId?: string
): Record<string, boolean | string> {
  return {
    'aria-expanded': isExpanded,
    ...(controlsId !== undefined && controlsId !== '' && { 'aria-controls': controlsId }),
  };
}

/**
 * Generate unique ID for accessibility
 */
let idCounter = 0;
export function generateA11yId(prefix = 'a11y'): string {
  return `${prefix}-${++idCounter}`;
}
