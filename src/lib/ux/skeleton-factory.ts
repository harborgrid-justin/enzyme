/**
 * @file Skeleton Factory
 * @description Dynamic skeleton generation with configurable patterns,
 * responsive layouts, and animation options.
 *
 * Features:
 * - Configurable skeleton patterns
 * - Responsive skeleton layouts
 * - Animation variants
 * - Auto-sizing from content
 * - Component-based skeletons
 * - Factory pattern for reusability
 * - Returns React elements (not HTML strings)
 */

import React, { type CSSProperties, type ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Skeleton element type
 */
export type SkeletonElementType =
  | 'text'
  | 'heading'
  | 'paragraph'
  | 'avatar'
  | 'thumbnail'
  | 'image'
  | 'button'
  | 'input'
  | 'card'
  | 'list'
  | 'table'
  | 'custom';

/**
 * Skeleton animation type
 */
export type SkeletonAnimation = 'pulse' | 'wave' | 'shimmer' | 'none';

/**
 * Skeleton element definition
 */
export interface SkeletonElement {
  type: SkeletonElementType;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  count?: number;
  gap?: string | number;
  className?: string;
  children?: SkeletonElement[];
}

/**
 * Skeleton pattern definition
 */
export interface SkeletonPattern {
  name: string;
  elements: SkeletonElement[];
  animation?: SkeletonAnimation;
  baseColor?: string;
  highlightColor?: string;
  speed?: number;
  direction?: 'ltr' | 'rtl';
}

/**
 * Skeleton factory configuration
 */
export interface SkeletonFactoryConfig {
  /** Default animation */
  defaultAnimation: SkeletonAnimation;
  /** Base color */
  baseColor: string;
  /** Highlight color */
  highlightColor: string;
  /** Animation speed in ms */
  speed: number;
  /** Border radius */
  borderRadius: string;
  /** Default text height */
  textHeight: string;
  /** Default heading height */
  headingHeight: string;
  /** Default avatar size */
  avatarSize: string;
  /** Default thumbnail size */
  thumbnailSize: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: SkeletonFactoryConfig = {
  defaultAnimation: 'pulse',
  baseColor: '#e5e7eb',
  highlightColor: '#f3f4f6',
  speed: 1500,
  borderRadius: '4px',
  textHeight: '1rem',
  headingHeight: '1.5rem',
  avatarSize: '40px',
  thumbnailSize: '80px',
};

// Static base styles
const skeletonBaseStyle: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
};

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  alignItems: 'center',
};

// ============================================================================
// Skeleton Factory
// ============================================================================

/**
 * Factory for creating skeleton patterns - returns React elements
 */
export class SkeletonFactory {
  private config: SkeletonFactoryConfig;
  private patterns: Map<string, SkeletonPattern> = new Map();
  private keyCounter = 0;

  constructor(config: Partial<SkeletonFactoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registerBuiltInPatterns();
  }

  /**
   * Register a skeleton pattern
   */
  registerPattern(pattern: SkeletonPattern): void {
    this.patterns.set(pattern.name, pattern);
  }

  /**
   * Get a registered pattern
   */
  getPattern(name: string): SkeletonPattern | undefined {
    return this.patterns.get(name);
  }

  /**
   * Create skeleton React element from a pattern
   */
  createFromPattern(patternName: string): ReactElement | null {
    const pattern = this.patterns.get(patternName);
    if (!pattern) {
      console.warn(`Skeleton pattern "${patternName}" not found`);
      return null;
    }

    return this.createSkeletonElement(pattern);
  }

  /**
   * Create skeleton React element from elements
   */
  createFromElements(
    elements: SkeletonElement[],
    options: Partial<SkeletonPattern> = {}
  ): ReactElement {
    const pattern: SkeletonPattern = {
      name: 'custom',
      elements,
      animation: options.animation ?? this.config.defaultAnimation,
      baseColor: options.baseColor ?? this.config.baseColor,
      highlightColor: options.highlightColor ?? this.config.highlightColor,
      speed: options.speed ?? this.config.speed,
      direction: options.direction ?? 'ltr',
    };

    return this.createSkeletonElement(pattern);
  }

  /**
   * Create a text skeleton
   */
  createText(
    options: {
      lines?: number;
      width?: string | number;
      gap?: string | number;
      lastLineWidth?: string;
    } = {}
  ): ReactElement {
    const lines = options.lines ?? 1;
    const elements: SkeletonElement[] = [];

    for (let i = 0; i < lines; i++) {
      const isLast = i === lines - 1;
      const hasLastLineWidth =
        options.lastLineWidth !== null &&
        options.lastLineWidth !== undefined &&
        options.lastLineWidth !== '';
      elements.push({
        type: 'text',
        width: isLast && hasLastLineWidth ? options.lastLineWidth : (options.width ?? '100%'),
        height: this.config.textHeight,
      });
    }

    return this.createFromElements(elements, {
      animation: this.config.defaultAnimation,
    });
  }

  /**
   * Create a paragraph skeleton
   */
  createParagraph(
    options: {
      lines?: number;
      lineVariation?: boolean;
    } = {}
  ): ReactElement {
    const lines = options.lines ?? 4;
    const widths =
      options.lineVariation === true ? this.generateLineWidths(lines) : Array(lines).fill('100%');

    const elements: SkeletonElement[] = widths.map((width: string | number) => ({
      type: 'text',
      width,
      height: this.config.textHeight,
    }));

    return this.createFromElements(elements);
  }

  /**
   * Create an avatar skeleton
   */
  createAvatar(
    options: {
      size?: string | number;
      shape?: 'circle' | 'square' | 'rounded';
    } = {}
  ): ReactElement {
    const size = options.size ?? this.config.avatarSize;
    let borderRadius: string;
    if (options.shape === 'circle') {
      borderRadius = '50%';
    } else if (options.shape === 'rounded') {
      borderRadius = '8px';
    } else {
      borderRadius = '0';
    }

    return this.createFromElements([
      {
        type: 'avatar',
        width: size,
        height: size,
        borderRadius,
      },
    ]);
  }

  /**
   * Create a card skeleton
   */
  createCard(
    options: {
      hasImage?: boolean;
      imageHeight?: string;
      hasTitle?: boolean;
      hasSubtitle?: boolean;
      textLines?: number;
      hasButton?: boolean;
    } = {}
  ): ReactElement {
    const elements: SkeletonElement[] = [];

    if (options.hasImage === undefined || options.hasImage) {
      elements.push({
        type: 'image',
        width: '100%',
        height: options.imageHeight ?? '200px',
        borderRadius: '0',
      });
    }

    if (options.hasTitle === undefined || options.hasTitle) {
      elements.push({
        type: 'heading',
        width: '70%',
        height: this.config.headingHeight,
      });
    }

    if (options.hasSubtitle === true) {
      elements.push({
        type: 'text',
        width: '50%',
        height: this.config.textHeight,
      });
    }

    const textLines = options.textLines ?? 3;
    for (let i = 0; i < textLines; i++) {
      elements.push({
        type: 'text',
        width: i === textLines - 1 ? '80%' : '100%',
        height: this.config.textHeight,
      });
    }

    if (options.hasButton === true) {
      elements.push({
        type: 'button',
        width: '120px',
        height: '36px',
      });
    }

    return this.createFromElements(elements);
  }

  /**
   * Create a list skeleton
   */
  createList(
    options: {
      items?: number;
      hasAvatar?: boolean;
      hasSecondaryText?: boolean;
    } = {}
  ): ReactElement {
    const items = options.items ?? 5;
    const elements: SkeletonElement[] = [];

    for (let i = 0; i < items; i++) {
      const children: SkeletonElement[] = [];

      if (options.hasAvatar === true) {
        children.push({
          type: 'avatar',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
        });
      }

      children.push({
        type: 'text',
        width: '60%',
        height: this.config.textHeight,
      });

      if (options.hasSecondaryText === true) {
        children.push({
          type: 'text',
          width: '40%',
          height: '0.875rem',
        });
      }

      elements.push({
        type: 'list',
        children,
        gap: '12px',
      });
    }

    return this.createFromElements(elements);
  }

  /**
   * Create a table skeleton
   */
  createTable(
    options: {
      rows?: number;
      columns?: number;
      hasHeader?: boolean;
    } = {}
  ): ReactElement {
    const rows = options.rows ?? 5;
    const columns = options.columns ?? 4;
    const elements: SkeletonElement[] = [];

    // Header
    if (options.hasHeader === undefined || options.hasHeader) {
      const headerChildren: SkeletonElement[] = [];
      for (let col = 0; col < columns; col++) {
        headerChildren.push({
          type: 'text',
          width: '80%',
          height: '1rem',
        });
      }
      elements.push({
        type: 'table',
        className: 'skeleton-table-header',
        children: headerChildren,
      });
    }

    // Rows
    for (let row = 0; row < rows; row++) {
      const rowChildren: SkeletonElement[] = [];
      for (let col = 0; col < columns; col++) {
        rowChildren.push({
          type: 'text',
          width: `${60 + Math.random() * 30}%`,
          height: this.config.textHeight,
        });
      }
      elements.push({
        type: 'table',
        className: 'skeleton-table-row',
        children: rowChildren,
      });
    }

    return this.createFromElements(elements);
  }

  /**
   * Generate CSS for skeletons (for global stylesheet injection)
   */
  generateCSS(): string {
    return `
      .skeleton {
        background: ${this.config.baseColor};
        position: relative;
        overflow: hidden;
      }

      .skeleton-container {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .skeleton-row {
        display: flex;
        gap: 0.75rem;
        align-items: center;
      }

      .skeleton-text {
        height: ${this.config.textHeight};
        border-radius: ${this.config.borderRadius};
      }

      .skeleton-heading {
        height: ${this.config.headingHeight};
        border-radius: ${this.config.borderRadius};
      }

      .skeleton-avatar {
        width: ${this.config.avatarSize};
        height: ${this.config.avatarSize};
        border-radius: 50%;
        flex-shrink: 0;
      }

      .skeleton-thumbnail {
        width: ${this.config.thumbnailSize};
        height: ${this.config.thumbnailSize};
        border-radius: ${this.config.borderRadius};
        flex-shrink: 0;
      }

      .skeleton-image {
        border-radius: ${this.config.borderRadius};
      }

      .skeleton-button {
        border-radius: ${this.config.borderRadius};
      }

      .skeleton-input {
        height: 40px;
        border-radius: ${this.config.borderRadius};
      }

      .skeleton-table-header {
        display: grid;
        gap: 1rem;
        padding: 0.75rem 0;
        border-bottom: 1px solid ${this.config.baseColor};
      }

      .skeleton-table-row {
        display: grid;
        gap: 1rem;
        padding: 0.75rem 0;
      }

      /* Pulse animation */
      .skeleton-pulse {
        animation: skeleton-pulse ${this.config.speed}ms ease-in-out infinite;
      }

      @keyframes skeleton-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      /* Wave animation */
      .skeleton-wave::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          90deg,
          transparent,
          ${this.config.highlightColor},
          transparent
        );
        animation: skeleton-wave ${this.config.speed}ms linear infinite;
      }

      @keyframes skeleton-wave {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }

      /* Shimmer animation */
      .skeleton-shimmer {
        background: linear-gradient(
          90deg,
          ${this.config.baseColor} 0%,
          ${this.config.highlightColor} 50%,
          ${this.config.baseColor} 100%
        );
        background-size: 200% 100%;
        animation: skeleton-shimmer ${this.config.speed}ms linear infinite;
      }

      @keyframes skeleton-shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private registerBuiltInPatterns(): void {
    // Article pattern
    this.registerPattern({
      name: 'article',
      elements: [
        { type: 'heading', width: '80%' },
        { type: 'text', width: '40%' },
        { type: 'image', width: '100%', height: '300px' },
        { type: 'paragraph', count: 3 },
      ],
    });

    // Profile pattern
    this.registerPattern({
      name: 'profile',
      elements: [
        {
          type: 'custom',
          className: 'skeleton-row',
          children: [
            { type: 'avatar', borderRadius: '50%' },
            {
              type: 'custom',
              children: [
                { type: 'heading', width: '200px' },
                { type: 'text', width: '150px' },
              ],
            },
          ],
        },
      ],
    });

    // Comment pattern
    this.registerPattern({
      name: 'comment',
      elements: [
        {
          type: 'custom',
          className: 'skeleton-row',
          children: [
            { type: 'avatar', width: '32px', height: '32px', borderRadius: '50%' },
            {
              type: 'custom',
              children: [
                { type: 'text', width: '120px' },
                { type: 'text', width: '200px' },
              ],
            },
          ],
        },
      ],
    });

    // Form pattern
    this.registerPattern({
      name: 'form',
      elements: [
        { type: 'text', width: '100px', height: '0.875rem' },
        { type: 'input' },
        { type: 'text', width: '100px', height: '0.875rem' },
        { type: 'input' },
        { type: 'text', width: '100px', height: '0.875rem' },
        { type: 'input', height: '100px' },
        { type: 'button', width: '100px' },
      ],
    });

    // Dashboard widget pattern
    this.registerPattern({
      name: 'dashboard-widget',
      elements: [
        { type: 'heading', width: '50%' },
        { type: 'text', width: '30%' },
        { type: 'image', width: '100%', height: '150px' },
      ],
    });
  }

  private generateKey(): string {
    return `skeleton-${++this.keyCounter}`;
  }

  private createSkeletonElement(pattern: SkeletonPattern): ReactElement {
    const animationClass = this.getAnimationClass(pattern.animation);

    const children = pattern.elements.map((el) =>
      this.createElementComponent(el, animationClass, pattern)
    );

    return React.createElement(
      'div',
      {
        key: this.generateKey(),
        style: containerStyle,
        className: 'skeleton-container',
        'aria-hidden': true,
        'aria-label': 'Loading content',
      },
      ...children
    );
  }

  private createElementComponent(
    element: SkeletonElement,
    animationClass: string,
    pattern: SkeletonPattern
  ): ReactElement {
    const style = this.createElementStyle(element, pattern);
    const className = this.getElementClassName(element.type, animationClass, element.className);

    // Handle children
    if (element.children && element.children.length > 0) {
      const childElements = element.children.map((child) =>
        this.createElementComponent(child, animationClass, pattern)
      );

      const childContainerStyle: CSSProperties = {
        ...style,
        ...(element.type === 'list' || (element.className?.includes('row') ?? false)
          ? rowStyle
          : containerStyle),
      };

      return React.createElement(
        'div',
        {
          key: this.generateKey(),
          className,
          style: childContainerStyle,
        },
        ...childElements
      );
    }

    // Handle count (multiple of same element)
    if (element.count !== null && element.count !== undefined && element.count > 1) {
      const repeatedElements = Array(element.count)
        .fill(null)
        .map(() =>
          React.createElement('div', {
            key: this.generateKey(),
            className,
            style,
          })
        );

      return React.createElement(React.Fragment, { key: this.generateKey() }, ...repeatedElements);
    }

    // Single element
    return React.createElement('div', {
      key: this.generateKey(),
      className,
      style,
    });
  }

  private createElementStyle(element: SkeletonElement, pattern: SkeletonPattern): CSSProperties {
    const style: CSSProperties = {
      ...skeletonBaseStyle,
      backgroundColor: pattern.baseColor ?? this.config.baseColor,
    };

    if (element.width !== null && element.width !== undefined) {
      style.width = typeof element.width === 'number' ? `${element.width}px` : element.width;
    }

    if (element.height !== null && element.height !== undefined) {
      style.height = typeof element.height === 'number' ? `${element.height}px` : element.height;
    } else {
      // Apply default heights based on type
      switch (element.type) {
        case 'text':
          style.height = this.config.textHeight;
          break;
        case 'heading':
          style.height = this.config.headingHeight;
          break;
        case 'avatar':
          style.height = this.config.avatarSize;
          style.width = style.width ?? this.config.avatarSize;
          break;
        case 'thumbnail':
          style.height = this.config.thumbnailSize;
          style.width = style.width ?? this.config.thumbnailSize;
          break;
        case 'input':
          style.height = '40px';
          break;
        case 'button':
          style.height = '36px';
          break;
      }
    }

    if (element.borderRadius !== null && element.borderRadius !== undefined) {
      style.borderRadius =
        typeof element.borderRadius === 'number'
          ? `${element.borderRadius}px`
          : element.borderRadius;
    } else {
      // Apply default border radius based on type
      switch (element.type) {
        case 'avatar':
          style.borderRadius = '50%';
          break;
        case 'text':
        case 'heading':
        case 'button':
        case 'input':
        case 'thumbnail':
        case 'image':
          style.borderRadius = this.config.borderRadius;
          break;
      }
    }

    if (element.gap !== null && element.gap !== undefined) {
      style.gap = typeof element.gap === 'number' ? `${element.gap}px` : element.gap;
    }

    // Apply flex-shrink for avatar and thumbnail
    if (element.type === 'avatar' || element.type === 'thumbnail') {
      style.flexShrink = 0;
    }

    return style;
  }

  private getElementClassName(
    type: SkeletonElementType,
    animationClass: string,
    customClass?: string
  ): string {
    const classes = ['skeleton', `skeleton-${type}`, animationClass];
    if (customClass !== null && customClass !== undefined && customClass !== '') {
      classes.push(customClass);
    }
    return classes.filter(Boolean).join(' ');
  }

  private getAnimationClass(animation?: SkeletonAnimation): string {
    switch (animation ?? this.config.defaultAnimation) {
      case 'pulse':
        return 'skeleton-pulse';
      case 'wave':
        return 'skeleton-wave';
      case 'shimmer':
        return 'skeleton-shimmer';
      case 'none':
      default:
        return '';
    }
  }

  private generateLineWidths(count: number): string[] {
    const widths: string[] = [];
    for (let i = 0; i < count; i++) {
      if (i === count - 1) {
        // Last line is shorter
        widths.push(`${50 + Math.random() * 30}%`);
      } else {
        widths.push(`${85 + Math.random() * 15}%`);
      }
    }
    return widths;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let factoryInstance: SkeletonFactory | null = null;

/**
 * Get or create the global skeleton factory
 */
export function getSkeletonFactory(config?: Partial<SkeletonFactoryConfig>): SkeletonFactory {
  factoryInstance ??= new SkeletonFactory(config);
  return factoryInstance;
}

/**
 * Reset the factory instance
 */
export function resetSkeletonFactory(): void {
  factoryInstance = null;
}

// ============================================================================
// Convenience Functions - Return React Elements
// ============================================================================

/**
 * Create a text skeleton
 */
export function createTextSkeleton(
  options?: Parameters<SkeletonFactory['createText']>[0]
): ReactElement {
  return getSkeletonFactory().createText(options);
}

/**
 * Create a paragraph skeleton
 */
export function createParagraphSkeleton(
  options?: Parameters<SkeletonFactory['createParagraph']>[0]
): ReactElement {
  return getSkeletonFactory().createParagraph(options);
}

/**
 * Create a card skeleton
 */
export function createCardSkeleton(
  options?: Parameters<SkeletonFactory['createCard']>[0]
): ReactElement {
  return getSkeletonFactory().createCard(options);
}

/**
 * Create a list skeleton
 */
export function createListSkeleton(
  options?: Parameters<SkeletonFactory['createList']>[0]
): ReactElement {
  return getSkeletonFactory().createList(options);
}

/**
 * Create a table skeleton
 */
export function createTableSkeleton(
  options?: Parameters<SkeletonFactory['createTable']>[0]
): ReactElement {
  return getSkeletonFactory().createTable(options);
}

// ============================================================================
// React Hook for Skeleton Factory
// ============================================================================

/**
 * Hook to use skeleton factory within React components
 */
export function useSkeletonFactory(config?: Partial<SkeletonFactoryConfig>): SkeletonFactory {
  return React.useMemo(() => {
    if (config) {
      return new SkeletonFactory(config);
    }
    return getSkeletonFactory();
  }, [config]);
}
