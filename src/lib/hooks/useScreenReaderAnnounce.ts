/**
 * @file Screen Reader Announcement Hook
 * @description Hook for announcing dynamic content changes to screen readers
 *
 * WCAG 2.1 Reference: Success Criterion 4.1.3 Status Messages (Level AA)
 * Uses ARIA live regions to announce content changes without moving focus.
 */

import { useCallback, useRef, useEffect } from 'react';

/**
 * Announcement priority levels
 * - polite: Waits for user to finish current task before announcing
 * - assertive: Interrupts current speech immediately (use sparingly)
 */
export type AnnouncementPriority = 'polite' | 'assertive';

/**
 * Options for announcements
 */
export interface AnnounceOptions {
  /** Priority level - 'polite' (default) or 'assertive' */
  priority?: AnnouncementPriority;
  /** Clear the announcement after this many milliseconds */
  clearAfter?: number;
}

/**
 * Create and manage a live region element
 */
function createLiveRegion(priority: AnnouncementPriority): HTMLDivElement {
  const region = document.createElement('div');
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', priority);
  region.setAttribute('aria-atomic', 'true');
  region.className = `live-region-${priority}`;

  // Visually hidden but accessible to screen readers
  Object.assign(region.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0',
  });

  return region;
}

/**
 * Get or create a shared live region
 */
const liveRegions: Record<AnnouncementPriority, HTMLDivElement | null> = {
  polite: null,
  assertive: null,
};

function getLiveRegion(priority: AnnouncementPriority): HTMLDivElement {
  if (!liveRegions[priority]) {
    liveRegions[priority] = createLiveRegion(priority);
    document.body.appendChild(liveRegions[priority]!);
  }
  return liveRegions[priority]!;
}

/**
 * Hook for announcing dynamic content to screen readers
 *
 * @example
 * ```tsx
 * function SearchResults({ results }) {
 *   const announce = useScreenReaderAnnounce();
 *
 *   useEffect(() => {
 *     announce(`Found ${results.length} results`);
 *   }, [results.length, announce]);
 *
 *   return <div>...</div>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Assertive announcement for errors
 * function ErrorBanner({ error }) {
 *   const announce = useScreenReaderAnnounce();
 *
 *   useEffect(() => {
 *     if (error) {
 *       announce(`Error: ${error.message}`, { priority: 'assertive' });
 *     }
 *   }, [error, announce]);
 * }
 * ```
 */
export function useScreenReaderAnnounce() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const announce = useCallback(
    (message: string, options: AnnounceOptions = {}) => {
      const { priority = 'polite', clearAfter = 1000 } = options;
      const region = getLiveRegion(priority);

      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Clear and then set the message (forces re-announcement)
      region.textContent = '';

      // Small delay to ensure the clear is processed
      requestAnimationFrame(() => {
        region.textContent = message;
      });

      // Optionally clear the message after a delay
      if (clearAfter > 0) {
        timeoutRef.current = setTimeout(() => {
          region.textContent = '';
        }, clearAfter);
      }
    },
    []
  );

  return announce;
}

/**
 * Screen Reader Announcement Provider Component
 *
 * Add this to your app root if you prefer a component-based approach.
 *
 * @example
 * ```tsx
 * <ScreenReaderAnnouncementRegion />
 * ```
 */
export function ScreenReaderAnnouncementRegion(): React.ReactElement {
  useEffect(() => {
    // Initialize both live regions on mount
    getLiveRegion('polite');
    getLiveRegion('assertive');
  }, []);

  return null as unknown as React.ReactElement;
}

/**
 * Announce a message imperatively (not as a hook)
 * Useful for non-component code or callbacks
 *
 * @example
 * ```ts
 * // In an event handler
 * function handleSave() {
 *   saveData().then(() => {
 *     announceToScreenReader('Changes saved successfully');
 *   });
 * }
 * ```
 */
export function announceToScreenReader(
  message: string,
  options: AnnounceOptions = {}
): void {
  const { priority = 'polite', clearAfter = 1000 } = options;
  const region = getLiveRegion(priority);

  // Clear and then set the message
  region.textContent = '';
  requestAnimationFrame(() => {
    region.textContent = message;
  });

  if (clearAfter > 0) {
    setTimeout(() => {
      region.textContent = '';
    }, clearAfter);
  }
}

export default useScreenReaderAnnounce;
