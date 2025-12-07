/**
 * @file State Diff Utility
 * @description Deep diff between states with visual representation
 */

// ============================================================================
// Types
// ============================================================================

export enum DiffType {
  ADDED = 'added',
  REMOVED = 'removed',
  MODIFIED = 'modified',
  UNCHANGED = 'unchanged',
}

export interface DiffNode {
  type: DiffType;
  path: string[];
  oldValue?: unknown;
  newValue?: unknown;
  children?: Map<string | number, DiffNode>;
}

export interface DiffOptions {
  /** Paths to ignore (e.g., ['_hasHydrated', 'timestamp']) */
  ignorePaths?: string[];
  /** Maximum depth to diff (default: 10) */
  maxDepth?: number;
  /** Include unchanged values (default: false) */
  includeUnchanged?: boolean;
  /** Custom comparison function */
  customCompare?: (a: unknown, b: unknown, path: string[]) => boolean | undefined;
}

export interface DiffSummary {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
  paths: {
    added: string[];
    removed: string[];
    modified: string[];
  };
}

// ============================================================================
// State Diff Utility
// ============================================================================

export class StateDiff {
  private options: Required<DiffOptions>;

  constructor(options: DiffOptions = {}) {
    this.options = {
      ignorePaths: options.ignorePaths ?? [],
      maxDepth: options.maxDepth ?? 10,
      includeUnchanged: options.includeUnchanged ?? false,
      customCompare: options.customCompare ?? (() => undefined),
    };
  }

  /**
   * Compute deep diff between two states
   */
  diff(oldState: unknown, newState: unknown): DiffNode {
    return this.diffRecursive(oldState, newState, []);
  }

  /**
   * Get diff summary with counts
   */
  getSummary(diff: DiffNode): DiffSummary {
    const summary: DiffSummary = {
      added: 0,
      removed: 0,
      modified: 0,
      unchanged: 0,
      paths: {
        added: [],
        removed: [],
        modified: [],
      },
    };

    this.collectSummary(diff, summary);
    return summary;
  }

  /**
   * Generate visual diff representation
   */
  visualize(diff: DiffNode, colorize = true): string {
    const lines: string[] = [];
    this.visualizeNode(diff, lines, 0, colorize);
    return lines.join('\n');
  }

  /**
   * Get all changed paths
   */
  getChangedPaths(diff: DiffNode): string[] {
    const paths: string[] = [];
    this.collectChangedPaths(diff, paths);
    return paths;
  }

  /**
   * Check if path matches ignore patterns
   */
  private shouldIgnorePath(path: string[]): boolean {
    const pathStr = path.join('.');
    return this.options.ignorePaths.some((pattern) => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(pathStr);
      }
      return pathStr === pattern || pathStr.startsWith(pattern + '.');
    });
  }

  /**
   * Recursive diff implementation
   */
  private diffRecursive(oldVal: unknown, newVal: unknown, path: string[]): DiffNode {
    // Check depth limit
    if (path.length > this.options.maxDepth) {
      return {
        type: DiffType.UNCHANGED,
        path,
        oldValue: oldVal,
        newValue: newVal,
      };
    }

    // Check if path should be ignored
    if (this.shouldIgnorePath(path)) {
      return {
        type: DiffType.UNCHANGED,
        path,
        oldValue: oldVal,
        newValue: newVal,
      };
    }

    // Custom comparison
    const customResult = this.options.customCompare(oldVal, newVal, path);
    if (customResult !== undefined) {
      return {
        type: customResult ? DiffType.UNCHANGED : DiffType.MODIFIED,
        path,
        oldValue: oldVal,
        newValue: newVal,
      };
    }

    // Handle null/undefined
    if (oldVal === null || oldVal === undefined) {
      if (newVal === null || newVal === undefined) {
        return { type: DiffType.UNCHANGED, path, oldValue: oldVal, newValue: newVal };
      }
      return { type: DiffType.ADDED, path, newValue: newVal };
    }
    if (newVal === null || newVal === undefined) {
      return { type: DiffType.REMOVED, path, oldValue: oldVal };
    }

    // Primitive comparison
    if (this.isPrimitive(oldVal) || this.isPrimitive(newVal)) {
      if (oldVal === newVal) {
        return this.options.includeUnchanged
          ? { type: DiffType.UNCHANGED, path, oldValue: oldVal, newValue: newVal }
          : { type: DiffType.UNCHANGED, path };
      }
      return { type: DiffType.MODIFIED, path, oldValue: oldVal, newValue: newVal };
    }

    // Array comparison
    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      return this.diffArray(oldVal, newVal, path);
    }
    if (Array.isArray(oldVal) !== Array.isArray(newVal)) {
      return { type: DiffType.MODIFIED, path, oldValue: oldVal, newValue: newVal };
    }

    // Object comparison
    if (this.isObject(oldVal) && this.isObject(newVal)) {
      return this.diffObject(oldVal, newVal, path);
    }

    // Type mismatch
    return { type: DiffType.MODIFIED, path, oldValue: oldVal, newValue: newVal };
  }

  /**
   * Diff two arrays
   */
  private diffArray(oldArr: unknown[], newArr: unknown[], path: string[]): DiffNode {
    const children = new Map<string | number, DiffNode>();
    const maxLength = Math.max(oldArr.length, newArr.length);

    let hasChanges = false;

    for (let i = 0; i < maxLength; i++) {
      const childDiff = this.diffRecursive(oldArr[i], newArr[i], [...path, String(i)]);
      if (childDiff.type !== DiffType.UNCHANGED || this.options.includeUnchanged) {
        children.set(i, childDiff);
      }
      if (childDiff.type !== DiffType.UNCHANGED) {
        hasChanges = true;
      }
    }

    return {
      type: hasChanges ? DiffType.MODIFIED : DiffType.UNCHANGED,
      path,
      oldValue: oldArr,
      newValue: newArr,
      children,
    };
  }

  /**
   * Diff two objects
   */
  private diffObject(
    oldObj: Record<string, unknown>,
    newObj: Record<string, unknown>,
    path: string[]
  ): DiffNode {
    const children = new Map<string | number, DiffNode>();
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    let hasChanges = false;

    for (const key of allKeys) {
      const childPath = [...path, key];

      if (this.shouldIgnorePath(childPath)) {
        continue;
      }

      const oldValue = oldObj[key];
      const newValue = newObj[key];

      const childDiff = this.diffRecursive(oldValue, newValue, childPath);

      if (childDiff.type !== DiffType.UNCHANGED || this.options.includeUnchanged) {
        children.set(key, childDiff);
      }
      if (childDiff.type !== DiffType.UNCHANGED) {
        hasChanges = true;
      }
    }

    return {
      type: hasChanges ? DiffType.MODIFIED : DiffType.UNCHANGED,
      path,
      oldValue: oldObj,
      newValue: newObj,
      children,
    };
  }

  /**
   * Collect summary statistics
   */
  private collectSummary(node: DiffNode, summary: DiffSummary): void {
    const pathStr = node.path.join('.');

    switch (node.type) {
      case DiffType.ADDED:
        summary.added++;
        summary.paths.added.push(pathStr);
        break;
      case DiffType.REMOVED:
        summary.removed++;
        summary.paths.removed.push(pathStr);
        break;
      case DiffType.MODIFIED:
        if (!node.children || node.children.size === 0) {
          summary.modified++;
          summary.paths.modified.push(pathStr);
        }
        break;
      case DiffType.UNCHANGED:
        summary.unchanged++;
        break;
    }

    if (node.children) {
      for (const child of node.children.values()) {
        this.collectSummary(child, summary);
      }
    }
  }

  /**
   * Collect changed paths
   */
  private collectChangedPaths(node: DiffNode, paths: string[]): void {
    if (node.type !== DiffType.UNCHANGED) {
      paths.push(node.path.join('.'));
    }

    if (node.children) {
      for (const child of node.children.values()) {
        this.collectChangedPaths(child, paths);
      }
    }
  }

  /**
   * Visualize diff node
   */
  private visualizeNode(node: DiffNode, lines: string[], indent: number, colorize: boolean): void {
    const prefix = '  '.repeat(indent);
    const pathStr = node.path.length > 0 ? node.path[node.path.length - 1] : 'root';

    let symbol = ' ';
    let color = '';
    let resetColor = '';

    if (colorize) {
      resetColor = '\x1b[0m';
      switch (node.type) {
        case DiffType.ADDED:
          symbol = '+';
          color = '\x1b[32m'; // Green
          break;
        case DiffType.REMOVED:
          symbol = '-';
          color = '\x1b[31m'; // Red
          break;
        case DiffType.MODIFIED:
          symbol = '~';
          color = '\x1b[33m'; // Yellow
          break;
        case DiffType.UNCHANGED:
          symbol = ' ';
          color = '\x1b[90m'; // Gray
          break;
      }
    } else {
      switch (node.type) {
        case DiffType.ADDED:
          symbol = '+';
          break;
        case DiffType.REMOVED:
          symbol = '-';
          break;
        case DiffType.MODIFIED:
          symbol = '~';
          break;
      }
    }

    // Build line
    let line = `${prefix}${color}${symbol} ${pathStr}${resetColor}`;

    // Add values for leaf nodes
    if (!node.children || node.children.size === 0) {
      if (node.type === DiffType.REMOVED) {
        line += `: ${color}${this.formatValue(node.oldValue)}${resetColor}`;
      } else if (node.type === DiffType.ADDED) {
        line += `: ${color}${this.formatValue(node.newValue)}${resetColor}`;
      } else if (node.type === DiffType.MODIFIED) {
        line += `: ${color}${this.formatValue(node.oldValue)} → ${this.formatValue(node.newValue)}${resetColor}`;
      } else if (this.options.includeUnchanged) {
        line += `: ${this.formatValue(node.newValue)}`;
      }
    }

    if (node.type !== DiffType.UNCHANGED || this.options.includeUnchanged) {
      lines.push(line);
    }

    // Recurse for children
    if (node.children) {
      const childArray = Array.from(node.children.entries()).sort((a, b) => {
        const aKey = String(a[0]);
        const bKey = String(b[0]);
        return aKey.localeCompare(bKey);
      });

      for (const [, child] of childArray) {
        this.visualizeNode(child, lines, indent + 1, colorize);
      }
    }
  }

  /**
   * Format value for display
   */
  private formatValue(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (this.isObject(value)) return `Object(${Object.keys(value).length})`;
    return String(value);
  }

  /**
   * Check if value is primitive
   */
  private isPrimitive(value: unknown): boolean {
    return (
      value === null ||
      value === undefined ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'symbol' ||
      typeof value === 'bigint'
    );
  }

  /**
   * Check if value is plain object
   */
  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Quick diff function for simple comparisons
 */
export function quickDiff(oldState: unknown, newState: unknown, options?: DiffOptions): DiffNode {
  const differ = new StateDiff(options);
  return differ.diff(oldState, newState);
}

/**
 * Get diff summary
 */
export function getDiffSummary(
  oldState: unknown,
  newState: unknown,
  options?: DiffOptions
): DiffSummary {
  const differ = new StateDiff(options);
  const diff = differ.diff(oldState, newState);
  return differ.getSummary(diff);
}

/**
 * Get visual diff string
 */
export function visualizeDiff(
  oldState: unknown,
  newState: unknown,
  options?: DiffOptions & { colorize?: boolean }
): string {
  const differ = new StateDiff(options);
  const diff = differ.diff(oldState, newState);
  return differ.visualize(diff, options?.colorize ?? true);
}
