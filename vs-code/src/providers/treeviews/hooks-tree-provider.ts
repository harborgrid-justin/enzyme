/**
 * @file Hooks TreeView Provider
 * @description Displays all custom Enzyme hooks grouped by category
 */

import * as vscode from 'vscode';
import { BaseTreeProvider } from './base-tree-provider';
import { EnzymeHookItem, EnzymeCategoryItem } from './tree-items';
import type { TreeProviderOptions } from './base-tree-provider';

/**
 *
 */
interface HookMetadata {
  name: string;
  filePath: string;
  category: HookCategory;
  parameters: string[];
  returnType?: string;
  dependencies: string[];
  isAsync: boolean;
  description?: string;
}

/**
 *
 */
type HookCategory =
  | 'state'
  | 'effect'
  | 'data-fetching'
  | 'form'
  | 'routing'
  | 'auth'
  | 'utility'
  | 'other';

/**
 * TreeView provider for Enzyme hooks
 *
 * @description Discovers and categorizes custom React hooks with intelligent analysis:
 * - Automatic categorization (state, effect, data-fetching, form, routing, auth, utility)
 * - JSDoc description extraction
 * - Parameter and return type detection
 * - Hook dependency graph analysis
 * - Async/sync hook identification
 * - Cross-hook dependency tracking
 *
 * @example
 * ```typescript
 * const provider = new EnzymeHooksTreeProvider(context);
 * const hooks = provider.getHooks();
 * const dataFetchingHooks = provider.getHooksByCategory('data-fetching');
 * const asyncHooks = provider.getAsyncHooks();
 * ```
 */
export class EnzymeHooksTreeProvider extends BaseTreeProvider<EnzymeHookItem | EnzymeCategoryItem> {
  private hooks: HookMetadata[] = [];

  /**
   *
   * @param context
   * @param options
   */
  constructor(context: vscode.ExtensionContext, options?: TreeProviderOptions) {
    super(context, options);
  }

  /**
   * Get watch patterns for auto-refresh
   * @returns Array of glob patterns to watch for hook file changes
   */
  protected override getWatchPatterns(): string[] {
    return [
      '**/hooks/**/*.{ts,tsx}',
      '**/lib/hooks/**/*.{ts,tsx}',
      '**/features/**/hooks/**/*.{ts,tsx}',
    ];
  }

  /**
   * Get root tree items
   * @returns Array of hook items and category items grouped by category
   */
  protected async getRootItems(): Promise<Array<EnzymeHookItem | EnzymeCategoryItem>> {
    return this.getCachedOrFetch('hooks-root', async () => {
      await this.discoverHooks();

      if (this.hooks.length === 0) {
        return [];
      }

      // Group by category
      return this.groupByCategory();
    });
  }

  /**
   * Get child items
   * @param element
   * @returns Array of hook items for the given category
   */
  protected async getChildItems(
    element: EnzymeHookItem | EnzymeCategoryItem
  ): Promise<EnzymeHookItem[]> {
    if (element instanceof EnzymeCategoryItem) {
      return this.getCategoryHooks(element.categoryName as HookCategory);
    }

    return [];
  }

  /**
   * Discover all hooks in the workspace
   */
  private async discoverHooks(): Promise<void> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      this.showWarning('No workspace folder open');
      return;
    }

    try {
      this.hooks = [];

      // Find all hook files
      const hookPatterns = [
        '**/hooks/**/*.{ts,tsx}',
        '**/lib/hooks/**/*.{ts,tsx}',
        '**/features/**/hooks/**/*.{ts,tsx}',
      ];

      for (const pattern of hookPatterns) {
        const files = await this.findFiles(pattern, '**/node_modules/**');

        for (const fileUri of files) {
          const hookData = await this.parseHookFile(fileUri.fsPath);
          if (hookData) {
            this.hooks.push(...hookData);
          }
        }
      }

      // Sort hooks by name
      this.hooks.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      this.handleError(error as Error, 'discoverHooks');
    }
  }

  /**
   * Parse a hook file to extract metadata
   * @param filePath
   */
  private async parseHookFile(filePath: string): Promise<HookMetadata[] | null> {
    try {
      const content = await this.readFile(filePath);

      const hooks: HookMetadata[] = [];

      // Find all hook exports
      const hookMatches = content.matchAll(/export\s+(?:function|const)\s+(use\w+)/g);

      for (const match of hookMatches) {
        const hookName = match[1];
        if (!hookName) {
          continue;
        }
        const hookData = this.extractHookData(content, hookName, filePath);
        if (hookData) {
          hooks.push(hookData);
        }
      }

      return hooks.length > 0 ? hooks : null;
    } catch (error) {
      console.error(`Error parsing hook file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Extract data for a specific hook
   * @param content
   * @param hookName
   * @param filePath
   */
  private extractHookData(content: string, hookName: string, filePath: string): HookMetadata | null {
    try {
      // Extract description from JSDoc
      const description = this.extractDescription(content, hookName);

      // Determine category
      const category = this.determineCategory(hookName, content);

      // Extract parameters
      const parameters = this.extractParameters(content, hookName);

      // Extract return type
      const returnType = this.extractReturnType(content, hookName);

      // Extract dependencies (other hooks used)
      const dependencies = this.extractDependencies(content);

      // Check if async
      const isAsync = this.checkIsAsync(content, hookName);

      return {
        name: hookName,
        filePath,
        category,
        parameters,
        dependencies,
        isAsync,
        ...(returnType && { returnType }),
        ...(description && { description }),
      };
    } catch {
      return null;
    }
  }

  /**
   * Extract JSDoc description for a hook
   * @param content
   * @param hookName
   */
  private extractDescription(content: string, hookName: string): string | undefined {
    // Look for JSDoc comment before the hook
    const hookPattern = new RegExp(`/\\*\\*([^*]|\\*(?!/))*\\*/\\s*export\\s+(?:function|const)\\s+${hookName}`, 's');
    const match = content.match(hookPattern);

    if (match) {
      const documentComment = match[0];
      const descMatch = /\/\*\*\s*\n\s*\*\s*(.+?)\s*\n/.exec(documentComment);
      if (descMatch) {
        return descMatch[1];
      }
    }

    return undefined;
  }

  /**
   * Determine hook category
   * @param hookName
   * @param content
   */
  private determineCategory(hookName: string, content: string): HookCategory {
    const lowerName = hookName.toLowerCase();
    const lowerContent = content.toLowerCase();

    // State management hooks
    if (lowerName.includes('state') || lowerName.includes('store') || lowerName.includes('zustand')) {
      return 'state';
    }

    // Effect hooks
    if (lowerName.includes('effect') || lowerName.includes('mount') || lowerName.includes('update')) {
      return 'effect';
    }

    // Data fetching hooks
    if (
      lowerName.includes('query') ||
      lowerName.includes('fetch') ||
      lowerName.includes('mutation') ||
      lowerName.includes('data')
    ) {
      return 'data-fetching';
    }

    // Form hooks
    if (lowerName.includes('form') || lowerName.includes('input') || lowerName.includes('validation')) {
      return 'form';
    }

    // Routing hooks
    if (lowerName.includes('route') || lowerName.includes('navigate') || lowerName.includes('params')) {
      return 'routing';
    }

    // Auth hooks
    if (lowerName.includes('auth') || lowerName.includes('user') || lowerName.includes('permission')) {
      return 'auth';
    }

    // Check content patterns
    if (lowerContent.includes('tanstack') || lowerContent.includes('react-query')) {
      return 'data-fetching';
    }

    return 'utility';
  }

  /**
   * Extract parameters from hook signature
   * @param content
   * @param hookName
   */
  private extractParameters(content: string, hookName: string): string[] {
    const parameters: string[] = [];

    // Find the hook function signature
    const signaturePatterns = [
      new RegExp(`function\\s+${hookName}\\s*\\(([^)]*)\\)`, 's'),
      new RegExp(`const\\s+${hookName}\\s*=\\s*\\(([^)]*)\\)`, 's'),
    ];

    for (const pattern of signaturePatterns) {
      const match = content.match(pattern);
      if (match?.[1]) {
        const paramsString = match[1].trim();
        if (paramsString) {
          // Split parameters and clean them up
          const params = paramsString.split(',').map(p => {
            // Extract parameter name (before the colon if typed)
            const paramMatch = /^(\w+)/.exec(p.trim());
            return paramMatch?.[1] ? paramMatch[1] : p.trim();
          });
          parameters.push(...params.filter(Boolean));
        }
        break;
      }
    }

    return parameters;
  }

  /**
   * Extract return type from hook
   * @param content
   * @param hookName
   */
  private extractReturnType(content: string, hookName: string): string | undefined {
    // Look for explicit return type annotation
    const returnTypePatterns = [
      new RegExp(`function\\s+${hookName}[^:]*:\\s*([^{\\n]+)`, 's'),
      new RegExp(`const\\s+${hookName}[^:]*:\\s*\\([^)]*\\)\\s*=>\\s*([^{\\n=]+)`, 's'),
    ];

    for (const pattern of returnTypePatterns) {
      const match = content.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Extract hook dependencies (other hooks used)
   * @param content
   */
  private extractDependencies(content: string): string[] {
    const dependencies: string[] = [];

    // Find all hook calls (use*)
    const hookCallMatches = content.matchAll(/\b(use[A-Z]\w+)\s*\(/g);

    for (const match of hookCallMatches) {
      const hookName = match[1];
      if (hookName && !dependencies.includes(hookName)) {
        dependencies.push(hookName);
      }
    }

    // Remove React built-in hooks
    const builtInHooks = [
      'useState',
      'useEffect',
      'useCallback',
      'useMemo',
      'useRef',
      'useContext',
      'useReducer',
      'useImperativeHandle',
      'useLayoutEffect',
      'useDebugValue',
      'useId',
      'useDeferredValue',
      'useTransition',
      'useSyncExternalStore',
      'useInsertionEffect',
    ];

    return dependencies.filter(dep => !builtInHooks.includes(dep));
  }

  /**
   * Check if hook is async
   * @param content
   * @param hookName
   */
  private checkIsAsync(content: string, hookName: string): boolean {
    // Look for async keyword in hook definition
    const asyncPatterns = [
      new RegExp(`async\\s+function\\s+${hookName}`),
      new RegExp(`const\\s+${hookName}\\s*=\\s*async`),
    ];

    for (const pattern of asyncPatterns) {
      if (pattern.test(content)) {
        return true;
      }
    }

    // Check if hook uses async operations
    return content.includes('await') || content.includes('Promise');
  }

  /**
   * Group hooks by category
   */
  private groupByCategory(): EnzymeCategoryItem[] {
    const categoryMap = new Map<HookCategory, HookMetadata[]>();

    for (const hook of this.hooks) {
      const existing = categoryMap.get(hook.category) || [];
      existing.push(hook);
      categoryMap.set(hook.category, existing);
    }

    const items: EnzymeCategoryItem[] = [];
    for (const [category, hooks] of categoryMap) {
      items.push(new EnzymeCategoryItem(
        this.formatCategoryName(category),
        hooks.length,
        vscode.TreeItemCollapsibleState.Collapsed
      ));
    }

    return items.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }

  /**
   * Format category name for display
   * @param category
   */
  private formatCategoryName(category: HookCategory): string {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get hooks for a category
   * @param category
   */
  private getCategoryHooks(category: HookCategory): EnzymeHookItem[] {
    const formattedCategory = this.formatCategoryName(category);

    const filteredHooks = this.hooks.filter(h =>
      this.formatCategoryName(h.category) === formattedCategory
    );

    return filteredHooks.map(hook => new EnzymeHookItem(
      hook.name,
      hook.filePath,
      {
        category: this.formatCategoryName(hook.category),
        parameters: hook.parameters,
        dependencies: hook.dependencies,
        isAsync: hook.isAsync,
        ...(hook.returnType && { returnType: hook.returnType }),
      }
    ));
  }

  /**
   * Get all discovered hooks
   * @returns Array of all hook metadata
   */
  getHooks(): HookMetadata[] {
    return [...this.hooks];
  }

  /**
   * Get hooks by category
   * @param category
   * @returns Array of hooks in the specified category
   */
  getHooksByCategory(category: HookCategory): HookMetadata[] {
    return this.hooks.filter(h => h.category === category);
  }

  /**
   * Get async hooks
   * @returns Array of all async hooks
   */
  getAsyncHooks(): HookMetadata[] {
    return this.hooks.filter(h => h.isAsync);
  }
}
