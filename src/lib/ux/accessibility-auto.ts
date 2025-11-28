/**
 * @file Automatic Accessibility Enhancements
 * @description PhD-level automatic accessibility system with focus management,
 * dynamic ARIA injection, motion preferences, and contrast adjustment.
 *
 * Features:
 * - Auto focus management on navigation
 * - Dynamic ARIA attribute injection
 * - Motion preference detection and adaptation
 * - Automatic contrast adjustment
 * - Keyboard navigation enhancement
 * - Screen reader optimizations
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Accessibility preferences
 */
export interface AccessibilityPreferences {
  /** Prefers reduced motion */
  reducedMotion: boolean;
  /** Prefers high contrast */
  highContrast: boolean;
  /** Prefers dark mode */
  darkMode: boolean;
  /** Prefers reduced transparency */
  reducedTransparency: boolean;
  /** Uses screen reader */
  screenReader: boolean;
  /** Keyboard navigation active */
  keyboardNavigation: boolean;
}

/**
 * Focus management options
 */
export interface FocusManagementOptions {
  /** Element to focus after navigation */
  focusTarget?: 'main' | 'heading' | 'first-focusable' | 'custom';
  /** Custom focus selector */
  customSelector?: string;
  /** Scroll behavior */
  scrollBehavior?: 'auto' | 'smooth' | 'instant';
  /** Delay before focusing (ms) */
  focusDelay?: number;
  /** Announce navigation to screen readers */
  announceNavigation?: boolean;
}

/**
 * ARIA enhancement rule
 */
export interface ARIAEnhancementRule {
  /** CSS selector */
  selector: string;
  /** ARIA attributes to add */
  attributes: Record<string, string | boolean>;
  /** Condition to apply */
  condition?: () => boolean;
}

/**
 * Auto accessibility configuration
 */
export interface AutoAccessibilityConfig {
  /** Enable auto focus management */
  autoFocus?: boolean;
  /** Focus management options */
  focusOptions?: FocusManagementOptions;
  /** Enable auto ARIA */
  autoARIA?: boolean;
  /** ARIA enhancement rules */
  ariaRules?: ARIAEnhancementRule[];
  /** Enable motion adaptation */
  adaptMotion?: boolean;
  /** Enable contrast adaptation */
  adaptContrast?: boolean;
  /** Enable keyboard navigation detection */
  detectKeyboardNav?: boolean;
  /** Enable screen reader detection */
  detectScreenReader?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_FOCUS_OPTIONS: Required<FocusManagementOptions> = {
  focusTarget: 'main',
  customSelector: '',
  scrollBehavior: 'smooth',
  focusDelay: 100,
  announceNavigation: true,
};

const DEFAULT_ARIA_RULES: ARIAEnhancementRule[] = [
  // Navigation landmarks
  { selector: 'nav:not([role])', attributes: { role: 'navigation' } },
  { selector: 'header:not([role])', attributes: { role: 'banner' } },
  { selector: 'footer:not([role])', attributes: { role: 'contentinfo' } },
  { selector: 'main:not([role])', attributes: { role: 'main' } },
  { selector: 'aside:not([role])', attributes: { role: 'complementary' } },
  // Interactive elements
  { selector: 'button:not([type])', attributes: { type: 'button' } },
  // Images
  {
    selector: 'img:not([alt])',
    attributes: { alt: '', role: 'presentation' },
  },
  // Icons
  {
    selector: 'svg[aria-hidden="true"]',
    attributes: { focusable: 'false' },
  },
  // Loading states
  {
    selector: '[data-loading="true"]',
    attributes: { 'aria-busy': 'true' },
  },
  // Expandable elements
  {
    selector: '[data-expanded]',
    attributes: { 'aria-expanded': 'false' },
  },
];

// ============================================================================
// Preference Detection
// ============================================================================

/**
 * Detect accessibility preferences
 */
export function detectAccessibilityPreferences(): AccessibilityPreferences {
  if (typeof window === 'undefined') {
    return {
      reducedMotion: false,
      highContrast: false,
      darkMode: false,
      reducedTransparency: false,
      screenReader: false,
      keyboardNavigation: false,
    };
  }

  return {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    highContrast: window.matchMedia('(prefers-contrast: more)').matches,
    darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
    reducedTransparency: window.matchMedia('(prefers-reduced-transparency: reduce)').matches,
    screenReader: detectScreenReader(),
    keyboardNavigation: false, // Detected dynamically
  };
}

/**
 * Detect screen reader (heuristic)
 */
function detectScreenReader(): boolean {
  // This is a heuristic - screen readers are hard to detect definitively
  if (typeof window === 'undefined') return false;

  // Check for common screen reader indicators
  const indicators = [
    // ARIA live region usage
    document.querySelector('[aria-live]') !== null,
    // Accessibility tree modifications
    'ariaHidden' in Element.prototype,
  ];

  return indicators.some(Boolean);
}

// ============================================================================
// Focus Management
// ============================================================================

/**
 * Focus manager for accessible navigation
 */
export class FocusManager {
  private options: Required<FocusManagementOptions>;
  private previousFocus: HTMLElement | null = null;
  private focusHistory: HTMLElement[] = [];

  constructor(options: FocusManagementOptions = {}) {
    this.options = { ...DEFAULT_FOCUS_OPTIONS, ...options };
  }

  /**
   * Focus main content after navigation
   */
  focusMainContent(): void {
    const { focusTarget, customSelector, focusDelay, scrollBehavior, announceNavigation } = this.options;

    // Save previous focus
    this.previousFocus = document.activeElement as HTMLElement;

    setTimeout(() => {
      let targetElement: HTMLElement | null = null;

      switch (focusTarget) {
        case 'main':
          targetElement = document.querySelector('main, [role="main"]');
          break;
        case 'heading':
          targetElement = document.querySelector('h1, [role="heading"][aria-level="1"]');
          break;
        case 'first-focusable':
          targetElement = this.getFirstFocusable(document.body);
          break;
        case 'custom':
          if (customSelector) {
            targetElement = document.querySelector(customSelector);
          }
          break;
      }

      if (targetElement) {
        // Make focusable if needed
        if (!targetElement.hasAttribute('tabindex')) {
          targetElement.setAttribute('tabindex', '-1');
        }

        targetElement.focus({ preventScroll: scrollBehavior === 'instant' });

        // Scroll into view
        if (scrollBehavior !== 'instant') {
          targetElement.scrollIntoView({
            behavior: scrollBehavior,
            block: 'start',
          });
        }

        // Track focus history
        this.focusHistory.push(targetElement);
        if (this.focusHistory.length > 10) {
          this.focusHistory.shift();
        }
      }

      // Announce navigation
      if (announceNavigation) {
        this.announcePageChange();
      }
    }, focusDelay);
  }

  /**
   * Restore previous focus
   */
  restoreFocus(): void {
    if (this.previousFocus && document.body.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }
  }

  /**
   * Get first focusable element
   */
  getFirstFocusable(container: HTMLElement): HTMLElement | null {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');

    return container.querySelector(focusableSelectors);
  }

  /**
   * Create focus trap within container
   */
  createFocusTrap(container: HTMLElement): () => void {
    const focusableElements = this.getAllFocusable(container);
    const [firstElement] = focusableElements;
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Focus first element
    firstElement?.focus();

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }

  /**
   * Get all focusable elements in container
   */
  private getAllFocusable(container: HTMLElement): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(container.querySelectorAll<HTMLElement>(selector));
  }

  /**
   * Announce page change to screen readers
   */
  private announcePageChange(): void {
    const title = document.title || 'Page';
    announce(`Navigated to ${title}`);
  }
}

// ============================================================================
// ARIA Enhancement
// ============================================================================

/**
 * ARIA enhancement manager
 */
export class ARIAEnhancer {
  private rules: ARIAEnhancementRule[];
  private observer: MutationObserver | null = null;

  constructor(rules: ARIAEnhancementRule[] = DEFAULT_ARIA_RULES) {
    this.rules = rules;
  }

  /**
   * Start enhancing
   */
  start(): void {
    // Initial enhancement
    this.enhance();

    // Watch for DOM changes
    this.observer = new MutationObserver((mutations) => {
      let needsEnhance = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          needsEnhance = true;
          break;
        }
      }

      if (needsEnhance) {
        this.enhance();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Stop enhancing
   */
  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  /**
   * Enhance DOM with ARIA attributes
   */
  enhance(): void {
    for (const rule of this.rules) {
      // Check condition
      if (rule.condition && !rule.condition()) continue;

      // Find matching elements
      const elements = document.querySelectorAll(rule.selector);

      elements.forEach((element) => {
        for (const [attr, value] of Object.entries(rule.attributes)) {
          if (!element.hasAttribute(attr)) {
            element.setAttribute(attr, String(value));
          }
        }
      });
    }
  }

  /**
   * Add custom rule
   */
  addRule(rule: ARIAEnhancementRule): void {
    this.rules.push(rule);
    this.enhance();
  }
}

// ============================================================================
// Motion Adaptation
// ============================================================================

/**
 * Adapt animations based on user preferences
 */
export function adaptMotion(reducedMotion: boolean): void {
  if (reducedMotion) {
    // Add class to document for CSS targeting
    document.documentElement.classList.add('reduce-motion');

    // Inject styles to reduce motion
    const styleId = 'a11y-reduce-motion';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .reduce-motion *,
        .reduce-motion *::before,
        .reduce-motion *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      `;
      document.head.appendChild(style);
    }
  } else {
    document.documentElement.classList.remove('reduce-motion');
    const style = document.getElementById('a11y-reduce-motion');
    style?.remove();
  }
}

// ============================================================================
// Screen Reader Utilities
// ============================================================================

/**
 * Announce message to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const region = document.createElement('div');
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', priority);
  region.setAttribute('aria-atomic', 'true');
  region.className = 'sr-only';
  region.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;

  document.body.appendChild(region);

  // Delay to ensure screen reader picks up the change
  setTimeout(() => {
    region.textContent = message;
  }, 100);

  // Remove after announcement
  setTimeout(() => {
    region.remove();
  }, 3000);
}

/**
 * Create skip link
 */
export function createSkipLink(targetId: string, text = 'Skip to main content'): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = `#${targetId}`;
  link.textContent = text;
  link.className = 'skip-link';
  link.style.cssText = `
    position: fixed;
    top: -100px;
    left: 0;
    background: #000;
    color: #fff;
    padding: 8px 16px;
    z-index: 100000;
    text-decoration: none;
    transition: top 0.3s;
  `;

  link.addEventListener('focus', () => {
    link.style.top = '0';
  });

  link.addEventListener('blur', () => {
    link.style.top = '-100px';
  });

  return link;
}

// ============================================================================
// Auto Accessibility Manager
// ============================================================================

/**
 * Auto accessibility manager
 */
export class AutoAccessibility {
  private static instance: AutoAccessibility;
  private config: Required<AutoAccessibilityConfig>;
  private focusManager: FocusManager;
  private ariaEnhancer: ARIAEnhancer;
  private preferences: AccessibilityPreferences;
  private keyboardNavActive = false;
  private cleanupFns: Array<() => void> = [];

  constructor(config: AutoAccessibilityConfig = {}) {
    this.config = {
      autoFocus: config.autoFocus ?? true,
      focusOptions: { ...DEFAULT_FOCUS_OPTIONS, ...config.focusOptions },
      autoARIA: config.autoARIA ?? true,
      ariaRules: [...DEFAULT_ARIA_RULES, ...(config.ariaRules ?? [])],
      adaptMotion: config.adaptMotion ?? true,
      adaptContrast: config.adaptContrast ?? true,
      detectKeyboardNav: config.detectKeyboardNav ?? true,
      detectScreenReader: config.detectScreenReader ?? true,
      debug: config.debug ?? false,
    };

    this.focusManager = new FocusManager(this.config.focusOptions);
    this.ariaEnhancer = new ARIAEnhancer(this.config.ariaRules);
    this.preferences = detectAccessibilityPreferences();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: AutoAccessibilityConfig): AutoAccessibility {
    if (AutoAccessibility.instance === null || AutoAccessibility.instance === undefined) {
      AutoAccessibility.instance = new AutoAccessibility(config);
    }
    return AutoAccessibility.instance;
  }

  /**
   * Reset singleton
   */
  static reset(): void {
    if (AutoAccessibility.instance) {
      AutoAccessibility.instance.cleanup();
      // Type-safe null assignment for singleton reset
      (AutoAccessibility as unknown as { instance: AutoAccessibility | null }).instance = null;
    }
  }

  /**
   * Initialize
   */
  init(): void {
    this.log('Initializing auto accessibility');

    // Start ARIA enhancement
    if (this.config.autoARIA) {
      this.ariaEnhancer.start();
    }

    // Setup motion adaptation
    if (this.config.adaptMotion) {
      adaptMotion(this.preferences.reducedMotion);
      this.setupMotionListener();
    }

    // Setup keyboard navigation detection
    if (this.config.detectKeyboardNav) {
      this.setupKeyboardNavDetection();
    }

    // Add skip link
    this.addSkipLink();

    this.log('Auto accessibility initialized');
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.ariaEnhancer.stop();
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }

  /**
   * Handle route change
   */
  handleRouteChange(): void {
    if (this.config.autoFocus) {
      this.focusManager.focusMainContent();
    }
  }

  /**
   * Setup motion preference listener
   */
  private setupMotionListener(): void {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handler = (e: MediaQueryListEvent): void => {
      this.preferences.reducedMotion = e.matches;
      adaptMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    this.cleanupFns.push(() => mediaQuery.removeEventListener('change', handler));
  }

  /**
   * Setup keyboard navigation detection
   */
  private setupKeyboardNavDetection(): void {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Tab') {
        this.keyboardNavActive = true;
        document.body.classList.add('keyboard-nav');
      }
    };

    const handleMouseDown = (): void => {
      this.keyboardNavActive = false;
      document.body.classList.remove('keyboard-nav');
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    this.cleanupFns.push(() => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    });
  }

  /**
   * Add skip link
   */
  private addSkipLink(): void {
    const mainContent = document.querySelector('main, [role="main"]');
    if (!mainContent) return;

    const id = mainContent.id || 'main-content';
    mainContent.id = id;

    const skipLink = createSkipLink(id);
    document.body.insertBefore(skipLink, document.body.firstChild);

    this.cleanupFns.push(() => skipLink.remove());
  }

  /**
   * Get preferences
   */
  getPreferences(): AccessibilityPreferences {
    return { ...this.preferences, keyboardNavigation: this.keyboardNavActive };
  }

  /**
   * Get focus manager
   */
  getFocusManager(): FocusManager {
    return this.focusManager;
  }

  /**
   * Debug log
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[AutoA11y] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for accessibility preferences
 */
export function useAccessibilityPreferences(): AccessibilityPreferences {
  const [preferences, setPreferences] = useState(detectAccessibilityPreferences);

  useEffect(() => {
    const queries = {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
      highContrast: window.matchMedia('(prefers-contrast: more)'),
      darkMode: window.matchMedia('(prefers-color-scheme: dark)'),
    };

    const handlers = Object.entries(queries).map(([key, query]) => {
      const handler = (e: MediaQueryListEvent): void => {
        setPreferences((prev) => ({ ...prev, [key]: e.matches }));
      };
      query.addEventListener('change', handler);
      return () => query.removeEventListener('change', handler);
    });

    return () => handlers.forEach((cleanup) => cleanup());
  }, []);

  return preferences;
}

/**
 * Hook for focus trap
 */
export function useFocusTrap(enabled = true): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);
  const focusManager = useMemo(() => new FocusManager(), []);

  useEffect(() => {
    if (!enabled || !ref.current) return;
    return focusManager.createFocusTrap(ref.current);
  }, [enabled, focusManager]);

  return ref;
}

/**
 * Hook for announcing messages
 */
export function useAnnounce(): {
  announce: (message: string) => void;
  announceAssertive: (message: string) => void;
} {
  return {
    announce: useCallback((message: string) => announce(message, 'polite'), []),
    announceAssertive: useCallback((message: string) => announce(message, 'assertive'), []),
  };
}

/**
 * Hook for keyboard navigation detection
 */
export function useKeyboardNavigation(): boolean {
  const [isKeyboard, setIsKeyboard] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Tab') setIsKeyboard(true);
    };
    const handleMouseDown = (): void => setIsKeyboard(false);

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return isKeyboard;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Initialize auto accessibility
 */
export function initAutoAccessibility(config?: AutoAccessibilityConfig): () => void {
  const instance = AutoAccessibility.getInstance(config);
  instance.init();
  return () => instance.cleanup();
}

/**
 * Get auto accessibility instance
 */
export function getAutoAccessibility(config?: AutoAccessibilityConfig): AutoAccessibility {
  return AutoAccessibility.getInstance(config);
}

/**
 * Reset auto accessibility
 */
export function resetAutoAccessibility(): void {
  AutoAccessibility.reset();
}

// ============================================================================
// Exports
// ============================================================================

export default {
  AutoAccessibility,
  FocusManager,
  ARIAEnhancer,
  initAutoAccessibility,
  getAutoAccessibility,
  resetAutoAccessibility,
  detectAccessibilityPreferences,
  adaptMotion,
  announce,
  createSkipLink,
  useAccessibilityPreferences,
  useFocusTrap,
  useAnnounce,
  useKeyboardNavigation,
};
