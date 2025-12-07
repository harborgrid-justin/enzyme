/**
 * @file State TreeView Provider
 * @description Displays all Zustand stores with slices, persistence, and DevTools info
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { BaseTreeProvider, TreeProviderOptions } from './base-tree-provider';
import { EnzymeStoreItem, EnzymeCategoryItem } from './tree-items';

interface StoreMetadata {
  name: string;
  filePath: string;
  slices: SliceMetadata[];
  isPersisted: boolean;
  hasDevTools: boolean;
  hasMiddleware: boolean;
  stateShape: Record<string, string>;
}

interface SliceMetadata {
  name: string;
  actions: string[];
  selectors: string[];
  stateKeys: string[];
}

/**
 * TreeView provider for Enzyme state stores
 */
export class EnzymeStateTreeProvider extends BaseTreeProvider<EnzymeStoreItem | EnzymeCategoryItem> {
  private stores: StoreMetadata[] = [];

  constructor(context: vscode.ExtensionContext, options?: TreeProviderOptions) {
    super(context, options);
  }

  /**
   * Get watch patterns for auto-refresh
   */
  protected override getWatchPatterns(): string[] {
    return [
      '**/store/**/*.{ts,tsx}',
      '**/stores/**/*.{ts,tsx}',
      '**/state/**/*.{ts,tsx}',
      '**/slices/**/*.{ts,tsx}',
    ];
  }

  /**
   * Get root tree items
   */
  protected async getRootItems(): Promise<Array<EnzymeStoreItem | EnzymeCategoryItem>> {
    return this.getCachedOrFetch('stores-root', async () => {
      await this.discoverStores();

      if (this.stores.length === 0) {
        return [];
      }

      return this.stores.map(store => new EnzymeStoreItem(
        store.name,
        store.filePath,
        {
          slices: store.slices.map(s => s.name),
          isPersisted: store.isPersisted,
          hasDevTools: store.hasDevTools,
          hasMiddleware: store.hasMiddleware,
          stateShape: store.stateShape,
        },
        store.slices.length > 0
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None
      ));
    });
  }

  /**
   * Get child items (slices)
   */
  protected async getChildItems(
    element: EnzymeStoreItem | EnzymeCategoryItem
  ): Promise<Array<EnzymeCategoryItem>> {
    if (element instanceof EnzymeStoreItem) {
      return this.getStoreSlices(element.storeName);
    }

    return [];
  }

  /**
   * Discover all stores in the workspace
   */
  private async discoverStores(): Promise<void> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      this.showWarning('No workspace folder open');
      return;
    }

    try {
      this.stores = [];

      // Find all store files
      const storePatterns = [
        '**/store/**/*.{ts,tsx}',
        '**/stores/**/*.{ts,tsx}',
        '**/state/**/*.{ts,tsx}',
      ];

      for (const pattern of storePatterns) {
        const files = await this.findFiles(pattern, '**/node_modules/**');

        for (const fileUri of files) {
          const storeData = await this.parseStoreFile(fileUri.fsPath);
          if (storeData) {
            this.stores.push(storeData);
          }
        }
      }

      // Sort stores by name
      this.stores.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      this.handleError(error as Error, 'discoverStores');
    }
  }

  /**
   * Parse a store file to extract metadata
   */
  private async parseStoreFile(filePath: string): Promise<StoreMetadata | null> {
    try {
      const content = await this.readFile(filePath);

      // Check if this is actually a Zustand store
      if (!this.isZustandStore(content)) {
        return null;
      }

      // Extract store name
      const storeName = this.extractStoreName(content, filePath);

      // Extract slices
      const slices = this.extractSlices(content);

      // Check for persistence
      const isPersisted = this.checkIsPersisted(content);

      // Check for DevTools
      const hasDevTools = this.checkHasDevTools(content);

      // Check for middleware
      const hasMiddleware = this.checkHasMiddleware(content);

      // Extract state shape
      const stateShape = this.extractStateShape(content);

      return {
        name: storeName,
        filePath,
        slices,
        isPersisted,
        hasDevTools,
        hasMiddleware,
        stateShape,
      };
    } catch (error) {
      console.error(`Error parsing store file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Check if file contains a Zustand store
   */
  private isZustandStore(content: string): boolean {
    return (
      content.includes('create') &&
      (content.includes('zustand') || content.includes('useStore'))
    );
  }

  /**
   * Extract store name from content or file path
   */
  private extractStoreName(content: string, filePath: string): string {
    // Try to find store export
    const exportMatch = content.match(/export\s+const\s+(\w+Store)/);
    if (exportMatch) {
      return exportMatch[1];
    }

    const useStoreMatch = content.match(/export\s+const\s+(use\w+)/);
    if (useStoreMatch) {
      return useStoreMatch[1];
    }

    // Fall back to file name
    const fileName = path.basename(filePath, path.extname(filePath));
    return fileName.charAt(0).toUpperCase() + fileName.slice(1);
  }

  /**
   * Extract slices from store content
   */
  private extractSlices(content: string): SliceMetadata[] {
    const slices: SliceMetadata[] = [];

    // Look for slice patterns
    // Pattern 1: createSlice() or similar
    const sliceMatches = content.matchAll(/(?:const|export)\s+(\w+Slice)\s*=\s*{/g);

    for (const match of sliceMatches) {
      const sliceName = match[1];
      const sliceData = this.extractSliceData(content, sliceName);
      if (sliceData) {
        slices.push(sliceData);
      }
    }

    return slices;
  }

  /**
   * Extract data for a specific slice
   */
  private extractSliceData(content: string, sliceName: string): SliceMetadata | null {
    try {
      // This is a simplified extraction
      // In production, you'd use a proper AST parser
      const actions = this.extractSliceActions(content, sliceName);
      const selectors = this.extractSliceSelectors(content, sliceName);
      const stateKeys = this.extractSliceStateKeys(content, sliceName);

      return {
        name: sliceName,
        actions,
        selectors,
        stateKeys,
      };
    } catch {
      return null;
    }
  }

  /**
   * Extract actions from a slice
   */
  private extractSliceActions(content: string, sliceName: string): string[] {
    const actions: string[] = [];

    // Look for action patterns
    const actionMatches = content.matchAll(/(\w+):\s*\([^)]*\)\s*=>\s*(?:set|get)/g);

    for (const match of actionMatches) {
      if (match[1] && !match[1].startsWith('_')) {
        actions.push(match[1]);
      }
    }

    return actions;
  }

  /**
   * Extract selectors from a slice
   */
  private extractSliceSelectors(content: string, sliceName: string): string[] {
    const selectors: string[] = [];

    // Look for selector patterns
    const selectorMatches = content.matchAll(/export\s+const\s+(select\w+)/g);

    for (const match of selectorMatches) {
      selectors.push(match[1]);
    }

    return selectors;
  }

  /**
   * Extract state keys from a slice
   */
  private extractSliceStateKeys(content: string, sliceName: string): string[] {
    const keys: string[] = [];

    // Look for state interface or type
    const stateInterfaceMatch = content.match(/interface\s+\w+State\s*{([^}]+)}/);
    if (stateInterfaceMatch) {
      const stateBody = stateInterfaceMatch[1];
      const keyMatches = stateBody.matchAll(/(\w+):/g);

      for (const match of keyMatches) {
        keys.push(match[1]);
      }
    }

    return keys;
  }

  /**
   * Check if store has persistence
   */
  private checkIsPersisted(content: string): boolean {
    return (
      content.includes('persist') ||
      content.includes('localStorage') ||
      content.includes('sessionStorage')
    );
  }

  /**
   * Check if store has DevTools enabled
   */
  private checkHasDevTools(content: string): boolean {
    return (
      content.includes('devtools') ||
      content.includes('__REDUX_DEVTOOLS_EXTENSION__')
    );
  }

  /**
   * Check if store has middleware
   */
  private checkHasMiddleware(content: string): boolean {
    return (
      content.includes('middleware') ||
      content.includes('immer') ||
      content.includes('redux-logger')
    );
  }

  /**
   * Extract state shape from store
   */
  private extractStateShape(content: string): Record<string, string> {
    const shape: Record<string, string> = {};

    // Look for state interface
    const stateInterfaceMatch = content.match(/interface\s+\w+State\s*{([^}]+)}/);
    if (!stateInterfaceMatch) {
      return shape;
    }

    const stateBody = stateInterfaceMatch[1];
    const propertyMatches = stateBody.matchAll(/(\w+)\s*:\s*([^;,\n]+)/g);

    for (const match of propertyMatches) {
      const key = match[1];
      const type = match[2].trim();
      shape[key] = type;
    }

    return shape;
  }

  /**
   * Get slices for a store
   */
  private getStoreSlices(storeName: string): EnzymeCategoryItem[] {
    const store = this.stores.find(s => s.name === storeName);
    if (!store || store.slices.length === 0) {
      return [];
    }

    return store.slices.map(slice => new EnzymeCategoryItem(
      slice.name,
      slice.actions.length + slice.selectors.length,
      vscode.TreeItemCollapsibleState.None
    ));
  }

  /**
   * Get all discovered stores
   */
  getStores(): StoreMetadata[] {
    return [...this.stores];
  }

  /**
   * Get persisted stores
   */
  getPersistedStores(): StoreMetadata[] {
    return this.stores.filter(s => s.isPersisted);
  }

  /**
   * Get stores with DevTools
   */
  getStoresWithDevTools(): StoreMetadata[] {
    return this.stores.filter(s => s.hasDevTools);
  }
}
