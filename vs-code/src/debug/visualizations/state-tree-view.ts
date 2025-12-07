/**
 * @file State Tree View
 * @description Render state as an interactive tree structure
 */

// ============================================================================
// Types
// ============================================================================

export enum NodeType {
  OBJECT = 'object',
  ARRAY = 'array',
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  NULL = 'null',
  UNDEFINED = 'undefined',
  FUNCTION = 'function',
  SYMBOL = 'symbol',
}

export interface TreeNode {
  id: string;
  key: string;
  value: unknown;
  type: NodeType;
  path: string[];
  children?: TreeNode[];
  expanded: boolean;
  editable: boolean;
  modified?: boolean;
}

export interface TreeViewOptions {
  /** Maximum depth to render */
  maxDepth?: number;
  /** Show functions */
  showFunctions?: boolean;
  /** Show symbols */
  showSymbols?: boolean;
  /** Paths to expand by default */
  expandedPaths?: string[];
  /** Enable editing */
  enableEditing?: boolean;
  /** Highlight modified nodes */
  highlightModified?: boolean;
}

export interface NodeUpdate {
  path: string[];
  oldValue: unknown;
  newValue: unknown;
}

export type NodeUpdateCallback = (update: NodeUpdate) => void | Promise<void>;

// ============================================================================
// State Tree View
// ============================================================================

export class StateTreeView {
  private options: Required<TreeViewOptions>;
  private rootNode: TreeNode | null = null;
  private nodeMap = new Map<string, TreeNode>();
  private expandedPaths = new Set<string>();
  private callbacks = new Set<NodeUpdateCallback>();
  private nodeIdCounter = 0;

  constructor(options: TreeViewOptions = {}) {
    this.options = {
      maxDepth: options.maxDepth ?? 10,
      showFunctions: options.showFunctions ?? false,
      showSymbols: options.showSymbols ?? false,
      expandedPaths: options.expandedPaths ?? [],
      enableEditing: options.enableEditing ?? false,
      highlightModified: options.highlightModified ?? true,
    };

    // Initialize expanded paths
    for (const path of this.options.expandedPaths) {
      this.expandedPaths.add(path);
    }
  }

  /**
   * Build tree from state
   */
  buildTree(state: unknown, rootKey = 'root'): TreeNode {
    this.nodeMap.clear();
    this.nodeIdCounter = 0;

    this.rootNode = this.createNode(rootKey, state, []);
    return this.rootNode;
  }

  /**
   * Get tree node by path
   */
  getNode(path: string[]): TreeNode | undefined {
    const pathKey = path.join('.');
    return this.nodeMap.get(pathKey);
  }

  /**
   * Expand node
   */
  expandNode(path: string[]): void {
    const pathKey = path.join('.');
    const node = this.nodeMap.get(pathKey);

    if (node) {
      node.expanded = true;
      this.expandedPaths.add(pathKey);
    }
  }

  /**
   * Collapse node
   */
  collapseNode(path: string[]): void {
    const pathKey = path.join('.');
    const node = this.nodeMap.get(pathKey);

    if (node) {
      node.expanded = false;
      this.expandedPaths.delete(pathKey);
    }
  }

  /**
   * Toggle node expansion
   */
  toggleNode(path: string[]): void {
    const pathKey = path.join('.');
    const node = this.nodeMap.get(pathKey);

    if (node) {
      if (node.expanded) {
        this.collapseNode(path);
      } else {
        this.expandNode(path);
      }
    }
  }

  /**
   * Expand all nodes
   */
  expandAll(): void {
    for (const node of this.nodeMap.values()) {
      if (node.children && node.children.length > 0) {
        node.expanded = true;
        this.expandedPaths.add(node.path.join('.'));
      }
    }
  }

  /**
   * Collapse all nodes
   */
  collapseAll(): void {
    for (const node of this.nodeMap.values()) {
      node.expanded = false;
    }
    this.expandedPaths.clear();
  }

  /**
   * Update node value
   */
  async updateNodeValue(path: string[], newValue: unknown): Promise<boolean> {
    const node = this.getNode(path);
    if (!node || !node.editable) {
      return false;
    }

    const oldValue = node.value;

    // Update node
    node.value = newValue;
    node.type = this.getNodeType(newValue);
    node.modified = true;

    // Rebuild children if complex type
    if (node.type === NodeType.OBJECT || node.type === NodeType.ARRAY) {
      node.children = this.createChildren(newValue, path);
    } else {
      node.children = undefined;
    }

    // Notify callbacks
    await this.notifyCallbacks({
      path,
      oldValue,
      newValue,
    });

    return true;
  }

  /**
   * Copy node value
   */
  copyNodeValue(path: string[]): string | null {
    const node = this.getNode(path);
    if (!node) {
      return null;
    }

    return JSON.stringify(node.value, null, 2);
  }

  /**
   * Copy node path
   */
  copyNodePath(path: string[]): string {
    return path.join('.');
  }

  /**
   * Register update callback
   */
  onUpdate(callback: NodeUpdateCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Get root node
   */
  getRootNode(): TreeNode | null {
    return this.rootNode;
  }

  /**
   * Filter tree by search query
   */
  search(query: string): TreeNode[] {
    const lowerQuery = query.toLowerCase();
    const matches: TreeNode[] = [];

    for (const node of this.nodeMap.values()) {
      // Search in key
      if (node.key.toLowerCase().includes(lowerQuery)) {
        matches.push(node);
        continue;
      }

      // Search in value
      const valueStr = String(node.value).toLowerCase();
      if (valueStr.includes(lowerQuery)) {
        matches.push(node);
      }
    }

    return matches;
  }

  /**
   * Get modified nodes
   */
  getModifiedNodes(): TreeNode[] {
    return Array.from(this.nodeMap.values()).filter((node) => node.modified);
  }

  /**
   * Clear modified flags
   */
  clearModified(): void {
    for (const node of this.nodeMap.values()) {
      node.modified = false;
    }
  }

  /**
   * Create tree node
   */
  private createNode(key: string, value: unknown, path: string[], depth = 0): TreeNode {
    const type = this.getNodeType(value);
    const pathKey = path.join('.');
    const expanded = this.expandedPaths.has(pathKey);

    const node: TreeNode = {
      id: this.generateNodeId(),
      key,
      value,
      type,
      path,
      expanded,
      editable: this.options.enableEditing && this.isEditableType(type),
    };

    // Create children for complex types
    if (depth < this.options.maxDepth && (type === NodeType.OBJECT || type === NodeType.ARRAY)) {
      node.children = this.createChildren(value, path, depth);
    }

    // Store in map
    this.nodeMap.set(pathKey, node);

    return node;
  }

  /**
   * Create children nodes
   */
  private createChildren(value: unknown, parentPath: string[], depth = 0): TreeNode[] {
    const children: TreeNode[] = [];

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const childPath = [...parentPath, String(i)];
        const child = this.createNode(String(i), value[i], childPath, depth + 1);
        children.push(child);
      }
    } else if (this.isObject(value)) {
      const entries = Object.entries(value as Record<string, unknown>);

      for (const [key, val] of entries) {
        // Skip functions and symbols if not enabled
        if (typeof val === 'function' && !this.options.showFunctions) {
          continue;
        }
        if (typeof val === 'symbol' && !this.options.showSymbols) {
          continue;
        }

        const childPath = [...parentPath, key];
        const child = this.createNode(key, val, childPath, depth + 1);
        children.push(child);
      }
    }

    return children;
  }

  /**
   * Get node type
   */
  private getNodeType(value: unknown): NodeType {
    if (value === null) return NodeType.NULL;
    if (value === undefined) return NodeType.UNDEFINED;

    const type = typeof value;

    switch (type) {
      case 'string':
        return NodeType.STRING;
      case 'number':
        return NodeType.NUMBER;
      case 'boolean':
        return NodeType.BOOLEAN;
      case 'function':
        return NodeType.FUNCTION;
      case 'symbol':
        return NodeType.SYMBOL;
      case 'object':
        return Array.isArray(value) ? NodeType.ARRAY : NodeType.OBJECT;
      default:
        return NodeType.OBJECT;
    }
  }

  /**
   * Check if type is editable
   */
  private isEditableType(type: NodeType): boolean {
    return (
      type === NodeType.STRING ||
      type === NodeType.NUMBER ||
      type === NodeType.BOOLEAN ||
      type === NodeType.NULL
    );
  }

  /**
   * Check if value is plain object
   */
  private isObject(value: unknown): boolean {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  /**
   * Notify callbacks
   */
  private async notifyCallbacks(update: NodeUpdate): Promise<void> {
    for (const callback of this.callbacks) {
      try {
        await callback(update);
      } catch (error) {
        console.error('Node update callback error:', error);
      }
    }
  }

  /**
   * Generate node ID
   */
  private generateNodeId(): string {
    return `node_${this.nodeIdCounter++}`;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format node value for display
 */
export function formatNodeValue(node: TreeNode): string {
  switch (node.type) {
    case NodeType.STRING:
      return `"${node.value}"`;
    case NodeType.NUMBER:
    case NodeType.BOOLEAN:
      return String(node.value);
    case NodeType.NULL:
      return 'null';
    case NodeType.UNDEFINED:
      return 'undefined';
    case NodeType.FUNCTION:
      return '[Function]';
    case NodeType.SYMBOL:
      return String(node.value);
    case NodeType.ARRAY:
      return `Array(${(node.value as unknown[]).length})`;
    case NodeType.OBJECT:
      return `Object(${Object.keys(node.value as object).length})`;
    default:
      return String(node.value);
  }
}

/**
 * Get node icon/color based on type
 */
export function getNodeStyle(node: TreeNode): {
  icon: string;
  color: string;
} {
  switch (node.type) {
    case NodeType.OBJECT:
      return { icon: '{}', color: '#569CD6' }; // Blue
    case NodeType.ARRAY:
      return { icon: '[]', color: '#4EC9B0' }; // Cyan
    case NodeType.STRING:
      return { icon: 'S', color: '#CE9178' }; // Orange
    case NodeType.NUMBER:
      return { icon: '#', color: '#B5CEA8' }; // Green
    case NodeType.BOOLEAN:
      return { icon: 'B', color: '#569CD6' }; // Blue
    case NodeType.NULL:
      return { icon: '∅', color: '#808080' }; // Gray
    case NodeType.UNDEFINED:
      return { icon: '?', color: '#808080' }; // Gray
    case NodeType.FUNCTION:
      return { icon: 'ƒ', color: '#DCDCAA' }; // Yellow
    case NodeType.SYMBOL:
      return { icon: 'S', color: '#4EC9B0' }; // Cyan
    default:
      return { icon: '•', color: '#D4D4D4' }; // White
  }
}
