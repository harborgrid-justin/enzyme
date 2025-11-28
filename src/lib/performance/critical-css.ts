/**
 * @file Critical CSS System
 * @description PhD-level critical CSS extraction and inline injection for optimal
 * LCP and first contentful paint performance.
 *
 * Features:
 * - Automatic critical CSS extraction
 * - Inline injection with deferred loading
 * - Route-based critical CSS splitting
 * - LCP element optimization
 * - CSS containment automation
 * - Font preloading coordination
 */

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Critical CSS configuration
 */
export interface CriticalCSSConfig {
  /** Viewport height for critical path (default: 100vh) */
  viewportHeight?: number;
  /** Enable automatic extraction */
  autoExtract?: boolean;
  /** Cache extracted CSS */
  cacheCSS?: boolean;
  /** Route patterns for route-specific CSS */
  routePatterns?: Record<string, string[]>;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * CSS rule classification
 */
export type CSSRuleType = 'critical' | 'above-fold' | 'deferred' | 'unused';

/**
 * Analyzed CSS rule
 */
export interface AnalyzedCSSRule {
  /** CSS selector */
  selector: string;
  /** CSS declarations */
  declarations: string;
  /** Full rule text */
  ruleText: string;
  /** Classification */
  type: CSSRuleType;
  /** Specificity score */
  specificity: number;
  /** Source stylesheet */
  source?: string;
}

/**
 * Critical CSS result
 */
export interface CriticalCSSResult {
  /** Critical CSS for immediate inline */
  critical: string;
  /** Above-fold CSS (important but can be slightly deferred) */
  aboveFold: string;
  /** Deferred CSS (load async) */
  deferred: string;
  /** Unused CSS (can be removed) */
  unused: string;
  /** LCP element styles */
  lcpStyles: string;
  /** Font preload hints */
  fontPreloads: string[];
  /** Extraction timestamp */
  timestamp: number;
}

/**
 * Font resource
 */
export interface FontResource {
  /** Font family */
  family: string;
  /** Font URL */
  url: string;
  /** Font weight */
  weight?: string;
  /** Font style */
  style?: string;
  /** Unicode range */
  unicodeRange?: string;
  /** Format */
  format?: string;
}

/**
 * CSS containment options
 */
export interface ContainmentOptions {
  /** Layout containment */
  layout?: boolean;
  /** Paint containment */
  paint?: boolean;
  /** Size containment */
  size?: boolean;
  /** Style containment */
  style?: boolean;
  /** Content visibility */
  contentVisibility?: 'auto' | 'hidden' | 'visible';
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_VIEWPORT_HEIGHT = 800;

const CRITICAL_SELECTORS = [
  'html',
  'body',
  ':root',
  '[data-critical]',
  '[data-lcp]',
  '.hero',
  '.header',
  '.nav',
  '.logo',
  'h1',
  '.headline',
];

const DEFERRED_PATTERNS = [
  /footer/i,
  /modal/i,
  /tooltip/i,
  /dropdown/i,
  /sidebar/i,
  /drawer/i,
  /dialog/i,
  /@media\s+print/,
];

// ============================================================================
// RegExp Pattern Cache
// ============================================================================

/**
 * Cache for compiled RegExp patterns to avoid creating new RegExp objects
 * on every call to isCriticalSelector
 */
const patternCache = new Map<string, RegExp>();

/**
 * Get or create a cached RegExp pattern
 */
function getCachedPattern(pattern: string, flags: string = 'i'): RegExp {
  const cacheKey = `${pattern}:${flags}`;
  let cached = patternCache.get(cacheKey);

  if (!cached) {
    cached = new RegExp(pattern, flags);
    patternCache.set(cacheKey, cached);
  }

  return cached;
}

// Pre-compile critical selector patterns at module load time
const CRITICAL_SELECTOR_PATTERNS = CRITICAL_SELECTORS.map((pattern) =>
  getCachedPattern(pattern, 'i')
);

// ============================================================================
// CSS Analyzer
// ============================================================================

/**
 * Analyzes and classifies CSS rules
 */
class CSSAnalyzer {
  private viewportHeight: number;
  // private __analyzedRules: Map<string, AnalyzedCSSRule> = new Map();
  private aboveFoldElements: Set<Element> = new Set();

  constructor(viewportHeight: number = DEFAULT_VIEWPORT_HEIGHT) {
    this.viewportHeight = viewportHeight;
  }

  /**
   * Analyze all stylesheets
   */
  analyzeStylesheets(): AnalyzedCSSRule[] {
    this.collectAboveFoldElements();
    const rules: AnalyzedCSSRule[] = [];

    // Analyze all stylesheets
    Array.from(document.styleSheets).forEach((stylesheet) => {
      try {
        const cssRules = stylesheet.cssRules ?? stylesheet.rules;
        if (cssRules == null) return;

        Array.from(cssRules).forEach((rule) => {
          const analyzed = this.analyzeRule(rule, stylesheet.href ?? 'inline');
          if (analyzed != null) {
            rules.push(...analyzed);
          }
        });
      } catch {
        // CORS blocked stylesheet - skip
      }
    });

    return rules;
  }

  /**
   * Collect elements above the fold
   */
  private collectAboveFoldElements(): void {
    this.aboveFoldElements.clear();

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      null
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
      const element = node as Element;
      const rect = element.getBoundingClientRect();

      // Element is above the fold if any part is visible
      if (rect.top < this.viewportHeight) {
        this.aboveFoldElements.add(element);
      }
    }
  }

  /**
   * Analyze a single CSS rule
   */
  private analyzeRule(rule: CSSRule, source: string): AnalyzedCSSRule[] | null {
    if (rule instanceof CSSStyleRule) {
      return [this.analyzeStyleRule(rule, source)];
    }

    if (rule instanceof CSSMediaRule) {
      return this.analyzeMediaRule(rule, source);
    }

    if (rule instanceof CSSKeyframesRule) {
      // Keyframes are deferred unless used by critical elements
      return [{
        selector: `@keyframes ${rule.name}`,
        declarations: rule.cssText,
        ruleText: rule.cssText,
        type: 'deferred',
        specificity: 0,
        source,
      }];
    }

    if (rule instanceof CSSFontFaceRule) {
      // Font-face rules are critical if font is used above fold
      return [{
        selector: '@font-face',
        declarations: rule.cssText,
        ruleText: rule.cssText,
        type: this.isFontUsedAboveFold(rule) ? 'critical' : 'deferred',
        specificity: 0,
        source,
      }];
    }

    return null;
  }

  /**
   * Analyze style rule
   */
  private analyzeStyleRule(rule: CSSStyleRule, source: string): AnalyzedCSSRule {
    const selector = rule.selectorText;
    const declarations = rule.style.cssText;
    const ruleText = rule.cssText;
    const specificity = this.calculateSpecificity(selector);

    // Determine rule type
    let type: CSSRuleType = 'unused';

    if (this.isCriticalSelector(selector)) {
      type = 'critical';
    } else if (this.isDeferredSelector(selector)) {
      type = 'deferred';
    } else if (this.matchesAboveFoldElement(selector)) {
      type = 'above-fold';
    }

    return { selector, declarations, ruleText, type, specificity, source };
  }

  /**
   * Analyze media rule
   */
  private analyzeMediaRule(rule: CSSMediaRule, source: string): AnalyzedCSSRule[] {
    const mediaCondition = rule.conditionText;

    // Print media is always deferred
    if (mediaCondition.includes('print')) {
      return [{
        selector: `@media ${mediaCondition}`,
        declarations: rule.cssText,
        ruleText: rule.cssText,
        type: 'deferred',
        specificity: 0,
        source,
      }];
    }

    // Check if media query matches current viewport
    if (!window.matchMedia(mediaCondition).matches) {
      return [{
        selector: `@media ${mediaCondition}`,
        declarations: rule.cssText,
        ruleText: rule.cssText,
        type: 'deferred',
        specificity: 0,
        source,
      }];
    }

    // Analyze inner rules
    const innerRules: AnalyzedCSSRule[] = [];
    Array.from(rule.cssRules).forEach((innerRule) => {
      const analyzed = this.analyzeRule(innerRule, source);
      if (analyzed) {
        innerRules.push(...analyzed);
      }
    });

    return innerRules;
  }

  /**
   * Check if selector matches critical patterns
   * Uses pre-compiled RegExp patterns from cache for performance
   */
  private isCriticalSelector(selector: string): boolean {
    return CRITICAL_SELECTORS.some((pattern, index) => {
      const regexPattern = CRITICAL_SELECTOR_PATTERNS[index];
      return selector.includes(pattern) || regexPattern?.test(selector) === true;
    });
  }

  /**
   * Check if selector matches deferred patterns
   */
  private isDeferredSelector(selector: string): boolean {
    return DEFERRED_PATTERNS.some((pattern) => pattern.test(selector));
  }

  /**
   * Check if selector matches above-fold elements
   */
  private matchesAboveFoldElement(selector: string): boolean {
    try {
      for (const element of this.aboveFoldElements) {
        if (element.matches(selector)) {
          return true;
        }
      }
    } catch {
      // Invalid selector
    }
    return false;
  }

  /**
   * Check if font is used above fold
   */
  private isFontUsedAboveFold(rule: CSSFontFaceRule): boolean {
    const fontFamily = rule.style.getPropertyValue('font-family').replace(/["']/g, '');

    for (const element of this.aboveFoldElements) {
      const computedFont = window.getComputedStyle(element).fontFamily;
      if (computedFont.includes(fontFamily)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate specificity score
   */
  private calculateSpecificity(selector: string): number {
    let score = 0;

    // IDs
    const ids = (selector.match(/#[a-zA-Z][\w-]*/g) ?? []).length;
    score += ids * 100;

    // Classes, attributes, pseudo-classes
    const classes = (selector.match(/\.[a-zA-Z][\w-]*/g) ?? []).length;
    const attrs = (selector.match(/\[[^\]]+\]/g) ?? []).length;
    const pseudoClasses = (selector.match(/:[a-zA-Z][\w-]*/g) ?? []).length;
    score += (classes + attrs + pseudoClasses) * 10;

    // Elements, pseudo-elements
    const elements = (selector.match(/(?:^|\s)[a-zA-Z][\w-]*/g) ?? []).length;
    const pseudoElements = (selector.match(/::[a-zA-Z][\w-]*/g) ?? []).length;
    score += elements + pseudoElements;

    return score;
  }
}

// ============================================================================
// Critical CSS Extractor
// ============================================================================

/**
 * Extracts and categorizes critical CSS
 */
export class CriticalCSSExtractor {
  private static instance: CriticalCSSExtractor;
  private config: Required<CriticalCSSConfig>;
  private analyzer: CSSAnalyzer;
  private cache: Map<string, CriticalCSSResult> = new Map();

  constructor(config: CriticalCSSConfig = {}) {
    this.config = {
      viewportHeight: config.viewportHeight ?? DEFAULT_VIEWPORT_HEIGHT,
      autoExtract: config.autoExtract ?? false,
      cacheCSS: config.cacheCSS ?? true,
      routePatterns: config.routePatterns ?? {},
      debug: config.debug ?? false,
    };

    this.analyzer = new CSSAnalyzer(this.config.viewportHeight);
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: CriticalCSSConfig): CriticalCSSExtractor {
    CriticalCSSExtractor.instance ??= new CriticalCSSExtractor(config);
    return CriticalCSSExtractor.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    // Type-safe null assignment for singleton reset
    (CriticalCSSExtractor as unknown as { instance: CriticalCSSExtractor | null }).instance = null;
  }

  /**
   * Extract critical CSS
   */
  extract(routePath?: string): CriticalCSSResult {
    const cacheKey = routePath ?? window.location.pathname;

    // Check cache
    if (this.config.cacheCSS && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached != null) return cached;
    }

    this.log('Extracting critical CSS...');

    const rules = this.analyzer.analyzeStylesheets();

    // Group rules by type
    const criticalRules: string[] = [];
    const aboveFoldRules: string[] = [];
    const deferredRules: string[] = [];
    const unusedRules: string[] = [];

    rules.forEach((rule) => {
      switch (rule.type) {
        case 'critical':
          criticalRules.push(rule.ruleText);
          break;
        case 'above-fold':
          aboveFoldRules.push(rule.ruleText);
          break;
        case 'deferred':
          deferredRules.push(rule.ruleText);
          break;
        case 'unused':
          unusedRules.push(rule.ruleText);
          break;
      }
    });

    // Extract LCP element styles
    const lcpStyles = this.extractLCPStyles();

    // Extract font preloads
    const fontPreloads = this.extractFontPreloads(rules);

    const result: CriticalCSSResult = {
      critical: this.minifyCSS(criticalRules.join('\n')),
      aboveFold: this.minifyCSS(aboveFoldRules.join('\n')),
      deferred: this.minifyCSS(deferredRules.join('\n')),
      unused: this.minifyCSS(unusedRules.join('\n')),
      lcpStyles: this.minifyCSS(lcpStyles),
      fontPreloads,
      timestamp: Date.now(),
    };

    // Cache result
    if (this.config.cacheCSS) {
      this.cache.set(cacheKey, result);
    }

    this.log('Critical CSS extraction complete', {
      critical: result.critical.length,
      aboveFold: result.aboveFold.length,
      deferred: result.deferred.length,
      unused: result.unused.length,
    });

    return result;
  }

  /**
   * Extract LCP element styles
   */
  private extractLCPStyles(): string {
    // Find potential LCP elements
    const lcpCandidates = document.querySelectorAll(
      'img[data-lcp], video[data-lcp], [data-lcp], h1, .hero img, .hero video'
    );

    const styles: string[] = [];

    lcpCandidates.forEach((element) => {
      const computedStyle = window.getComputedStyle(element);
      const relevantProps = [
        'width',
        'height',
        'max-width',
        'max-height',
        'aspect-ratio',
        'object-fit',
        'object-position',
        'display',
        'position',
        'top',
        'left',
        'right',
        'bottom',
        'margin',
        'padding',
      ];

      const selector = this.generateSelector(element);
      const declarations = relevantProps
        .map((prop) => `${prop}: ${computedStyle.getPropertyValue(prop)}`)
        .filter((d) => !d.endsWith(': '))
        .join('; ');

      if (declarations) {
        styles.push(`${selector} { ${declarations} }`);
      }
    });

    return styles.join('\n');
  }

  /**
   * Generate unique selector for element
   */
  private generateSelector(element: Element): string {
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.className) {
      const classes = Array.from(element.classList).join('.');
      return `${element.tagName.toLowerCase()}.${classes}`;
    }

    return element.tagName.toLowerCase();
  }

  /**
   * Extract font preload URLs
   */
  private extractFontPreloads(rules: AnalyzedCSSRule[]): string[] {
    const fontUrls: string[] = [];

    rules.forEach((rule) => {
      if (rule.type === 'critical' && rule.selector === '@font-face') {
        const urlMatch = rule.declarations.match(/url\(['"]?([^'")\s]+)['"]?\)/);
        const matchedUrl = urlMatch?.[1];
        if (matchedUrl != null && matchedUrl !== '') {
          fontUrls.push(matchedUrl);
        }
      }
    });

    return fontUrls;
  }

  /**
   * Minify CSS (simple minification)
   */
  private minifyCSS(css: string): string {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/\s*([{}:;,])\s*/g, '$1') // Remove space around symbols
      .replace(/;}/g, '}') // Remove trailing semicolons
      .trim();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Debug logging
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log(`[CriticalCSS] ${message}`, ...args);
    }
  }
}

// ============================================================================
// CSS Injection Utilities
// ============================================================================

/**
 * Inject critical CSS inline
 */
export function injectCriticalCSS(css: string, id = 'critical-css'): HTMLStyleElement {
  const existing = document.getElementById(id) as HTMLStyleElement | null;
  if (existing != null) {
    existing.textContent = css;
    return existing;
  }

  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;

  // Insert at the top of head for highest priority
  const {head} = document;
  const {firstChild} = head;
  if (firstChild) {
    head.insertBefore(style, firstChild);
  } else {
    head.appendChild(style);
  }

  return style;
}

/**
 * Load CSS asynchronously
 */
export async function loadCSSAsync(href: string, id?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    if (id != null && id !== '') link.id = id;

    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));

    document.head.appendChild(link);
  });
}

/**
 * Preload font
 */
export function preloadFont(url: string, crossOrigin = true): HTMLLinkElement {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.href = url;
  link.type = 'font/woff2';
  if (crossOrigin) {
    link.crossOrigin = 'anonymous';
  }

  document.head.appendChild(link);
  return link;
}

/**
 * Apply CSS containment to element
 */
export function applyContainment(element: HTMLElement, options: ContainmentOptions): void {
  const containValues: string[] = [];

  if (options.layout === true) containValues.push('layout');
  if (options.paint === true) containValues.push('paint');
  if (options.size === true) containValues.push('size');
  if (options.style === true) containValues.push('style');

  if (containValues.length > 0) {
    element.style.contain = containValues.join(' ');
  }

  if (options.contentVisibility) {
    element.style.contentVisibility = options.contentVisibility;
  }
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for critical CSS extraction and injection
 */
export function useCriticalCSS(config?: CriticalCSSConfig): {
  result: CriticalCSSResult | null;
  extract: () => CriticalCSSResult;
  inject: () => void;
  isExtracted: boolean;
} {
  const extractor = useRef(CriticalCSSExtractor.getInstance(config));
  const [result, setResult] = useState<CriticalCSSResult | null>(null);
  const [isExtracted, setIsExtracted] = useState(false);

  const extract = useCallback(() => {
    const extracted = extractor.current.extract();
    setResult(extracted);
    setIsExtracted(true);
    return extracted;
  }, []);

  const inject = useCallback(() => {
    if (result) {
      injectCriticalCSS(result.critical);
      result.fontPreloads.forEach((url) => preloadFont(url));
    }
  }, [result]);

  return { result, extract, inject, isExtracted };
}

/**
 * Hook for CSS containment
 */
export function useCSSContainment(
  options: ContainmentOptions = {}
): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      applyContainment(ref.current, options);
    }
  }, [options]);

  return ref;
}

/**
 * Hook for deferred CSS loading
 */
export function useDeferredCSS(
  stylesheets: string[],
  options: { loadOnIdle?: boolean } = {}
): { loaded: boolean; load: () => Promise<void> } {
  const { loadOnIdle = true } = options;
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    await Promise.all(stylesheets.map(async (href) => loadCSSAsync(href)));
    setLoaded(true);
  }, [stylesheets]);

  useEffect(() => {
    if (!loadOnIdle || loaded) return;

    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(() => {
        void load();
      });
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(() => {
        void load();
      }, 100);
      return () => clearTimeout(id);
    }
  }, [load, loadOnIdle, loaded]);

  return { loaded, load };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the global critical CSS extractor
 */
export function getCriticalCSSExtractor(config?: CriticalCSSConfig): CriticalCSSExtractor {
  return CriticalCSSExtractor.getInstance(config);
}

/**
 * Reset the extractor (for testing)
 */
export function resetCriticalCSSExtractor(): void {
  CriticalCSSExtractor.reset();
}

/**
 * Extract and inject critical CSS in one call
 */
export function extractAndInjectCriticalCSS(config?: CriticalCSSConfig): CriticalCSSResult {
  const extractor = CriticalCSSExtractor.getInstance(config);
  const result = extractor.extract();

  injectCriticalCSS(result.critical);
  result.fontPreloads.forEach((url) => preloadFont(url));

  return result;
}

// ============================================================================
// Exports
// ============================================================================

export default {
  CriticalCSSExtractor,
  getCriticalCSSExtractor,
  resetCriticalCSSExtractor,
  extractAndInjectCriticalCSS,
  injectCriticalCSS,
  loadCSSAsync,
  preloadFont,
  applyContainment,
  useCriticalCSS,
  useCSSContainment,
  useDeferredCSS,
};
