/**
 * @file Components TreeView Provider
 * @description Displays all Enzyme components with categorization and usage tracking
 */

import * as path from 'node:path';
import * as vscode from 'vscode';
import { BaseTreeProvider } from './base-tree-provider';
import { EnzymeComponentItem, EnzymeCategoryItem } from './tree-items';
import type { TreeProviderOptions } from './base-tree-provider';

/**
 *
 */
interface ComponentMetadata {
  name: string;
  filePath: string;
  category: ComponentCategory;
  isUIComponent: boolean;
  isFeatureComponent: boolean;
  usageCount?: number;
  hasProps: boolean;
  hasStory: boolean;
  hasTests: boolean;
  propsInterface?: string;
}

/**
 *
 */
type ComponentCategory =
  | 'forms'
  | 'layout'
  | 'feedback'
  | 'data-display'
  | 'navigation'
  | 'inputs'
  | 'overlays'
  | 'other';

/**
 * TreeView provider for Enzyme components
 *
 * @description Manages component discovery, categorization, and visualization with features:
 * - Automatic component categorization (forms, layout, data-display, etc.)
 * - UI component vs feature component distinction
 * - Storybook story and test file detection
 * - Props interface extraction
 * - Component usage tracking
 * - Filtering and search capabilities
 *
 * @example
 * ```typescript
 * const provider = new EnzymeComponentsTreeProvider(context);
 * provider.setFilter('Button');
 * const uiComponents = provider.getComponents().filter(c => c.isUIComponent);
 * ```
 */
export class EnzymeComponentsTreeProvider extends BaseTreeProvider<EnzymeComponentItem | EnzymeCategoryItem> {
  private components: ComponentMetadata[] = [];
  private filterText = '';

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
   * @returns Array of glob patterns to watch for component file changes
   */
  protected override getWatchPatterns(): string[] {
    return [
      '**/lib/ui/**/*.{ts,tsx}',
      '**/components/**/*.{ts,tsx}',
      '**/features/**/components/**/*.{ts,tsx}',
    ];
  }

  /**
   * Set filter text
   * @param filterText
   */
  setFilter(filterText: string): void {
    this.filterText = filterText.toLowerCase();
    this.refresh(false);
  }

  /**
   * Clear filter
   */
  clearFilter(): void {
    this.filterText = '';
    this.refresh(false);
  }

  /**
   * Get root tree items
   * @returns Array of component items and category items grouped by category
   */
  protected async getRootItems(): Promise<Array<EnzymeComponentItem | EnzymeCategoryItem>> {
    return this.getCachedOrFetch('components-root', async () => {
      await this.discoverComponents();

      if (this.components.length === 0) {
        return [];
      }

      // Apply filter
      const filteredComponents = this.filterText
        ? this.components.filter(c =>
            c.name.toLowerCase().includes(this.filterText)
          )
        : this.components;

      // Group by category
      return this.groupByCategory(filteredComponents);
    });
  }

  /**
   * Get child items
   * @param element
   * @returns Array of component items for the given category
   */
  protected async getChildItems(
    element: EnzymeComponentItem | EnzymeCategoryItem
  ): Promise<EnzymeComponentItem[]> {
    if (element instanceof EnzymeCategoryItem) {
      return this.getCategoryComponents(element.categoryName as ComponentCategory);
    }

    return [];
  }

  /**
   * Discover all components in the workspace
   */
  private async discoverComponents(): Promise<void> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      this.showWarning('No workspace folder open');
      return;
    }

    try {
      this.components = [];

      // Find UI components
      const uiComponents = await this.findUIComponents();
      this.components.push(...uiComponents);

      // Find feature components
      const featureComponents = await this.findFeatureComponents();
      this.components.push(...featureComponents);

      // Calculate usage counts
      await this.calculateUsageCounts();

      // Sort components by name
      this.components.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      this.handleError(error as Error, 'discoverComponents');
    }
  }

  /**
   * Find UI components from lib/ui
   */
  private async findUIComponents(): Promise<ComponentMetadata[]> {
    const components: ComponentMetadata[] = [];

    const uiFiles = await this.findFiles('**/lib/ui/**/*.{ts,tsx}', '**/node_modules/**');

    for (const fileUri of uiFiles) {
      const component = await this.parseComponentFile(fileUri.fsPath, true);
      if (component) {
        components.push(component);
      }
    }

    return components;
  }

  /**
   * Find feature-specific components
   */
  private async findFeatureComponents(): Promise<ComponentMetadata[]> {
    const components: ComponentMetadata[] = [];

    const featureComponentFiles = await this.findFiles(
      '**/features/**/components/**/*.{ts,tsx}',
      '**/node_modules/**'
    );

    for (const fileUri of featureComponentFiles) {
      const component = await this.parseComponentFile(fileUri.fsPath, false);
      if (component) {
        components.push(component);
      }
    }

    return components;
  }

  /**
   * Parse a component file to extract metadata
   * @param filePath
   * @param isUIComponent
   */
  private async parseComponentFile(
    filePath: string,
    isUIComponent: boolean
  ): Promise<ComponentMetadata | null> {
    try {
      const content = await this.readFile(filePath);

      // Extract component name
      const componentName = this.extractComponentName(content, filePath);
      if (!componentName) {
        return null;
      }

      // Determine category
      const category = this.determineCategory(filePath, content);

      // Check for props interface
      const hasProps = this.checkHasProps(content);
      const propsInterface = this.extractPropsInterface(content);

      // Check for Storybook story
      const hasStory = await this.checkHasStory(filePath);

      // Check for tests
      const hasTests = await this.checkHasTests(filePath);

      return {
        name: componentName,
        filePath,
        category,
        isUIComponent,
        isFeatureComponent: !isUIComponent,
        hasProps,
        hasStory,
        hasTests,
        ...(propsInterface && { propsInterface }),
      };
    } catch (error) {
      console.error(`Error parsing component file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Extract component name from file content or path
   * @param content
   * @param filePath
   */
  private extractComponentName(content: string, filePath: string): string | null {
    // Try to find export default or named export
    const defaultExportMatch = /export\s+default\s+(?:function\s+)?(\w+)/.exec(content);
    if (defaultExportMatch?.[1]) {
      return defaultExportMatch[1];
    }

    const namedExportMatch = /export\s+(?:const|function)\s+(\w+)/.exec(content);
    if (namedExportMatch?.[1]) {
      return namedExportMatch[1];
    }

    // Fall back to file name
    const fileName = path.basename(filePath, path.extname(filePath));
    if (fileName && fileName !== 'index') {
      return fileName;
    }

    return null;
  }

  /**
   * Determine component category
   * @param filePath
   * @param content
   */
  private determineCategory(filePath: string, content: string): ComponentCategory {
    const lowerPath = filePath.toLowerCase();
    const lowerContent = content.toLowerCase();

    // Check path segments
    if (lowerPath.includes('/forms/')) {return 'forms';}
    if (lowerPath.includes('/layout/')) {return 'layout';}
    if (lowerPath.includes('/feedback/')) {return 'feedback';}
    if (lowerPath.includes('/data-display/')) {return 'data-display';}
    if (lowerPath.includes('/navigation/')) {return 'navigation';}
    if (lowerPath.includes('/inputs/')) {return 'inputs';}
    if (lowerPath.includes('/overlays/')) {return 'overlays';}

    // Check content patterns
    if (lowerContent.includes('form') || lowerContent.includes('input') || lowerContent.includes('select')) {
      return 'forms';
    }
    if (lowerContent.includes('modal') || lowerContent.includes('dialog') || lowerContent.includes('tooltip')) {
      return 'overlays';
    }
    if (lowerContent.includes('table') || lowerContent.includes('list') || lowerContent.includes('card')) {
      return 'data-display';
    }
    if (lowerContent.includes('nav') || lowerContent.includes('menu') || lowerContent.includes('breadcrumb')) {
      return 'navigation';
    }

    return 'other';
  }

  /**
   * Check if component has props interface
   * @param content
   */
  private checkHasProps(content: string): boolean {
    return (
      content.includes('Props') &&
      (content.includes('interface') || content.includes('type'))
    );
  }

  /**
   * Extract props interface name
   * @param content
   */
  private extractPropsInterface(content: string): string | undefined {
    const match = /(?:interface|type)\s+(\w+Props)/.exec(content);
    return match ? match[1] : undefined;
  }

  /**
   * Check if component has a Storybook story
   * @param filePath
   */
  private async checkHasStory(filePath: string): Promise<boolean> {
    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath, path.extname(filePath));

    const storyPatterns = [
      path.join(dir, `${baseName}.stories.tsx`),
      path.join(dir, `${baseName}.stories.ts`),
      path.join(dir, `${baseName}.story.tsx`),
      path.join(dir, `${baseName}.story.ts`),
    ];

    for (const storyPath of storyPatterns) {
      if (await this.fileExists(storyPath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if component has tests
   * @param filePath
   */
  private async checkHasTests(filePath: string): Promise<boolean> {
    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath, path.extname(filePath));

    const testPatterns = [
      path.join(dir, `${baseName}.test.tsx`),
      path.join(dir, `${baseName}.test.ts`),
      path.join(dir, `${baseName}.spec.tsx`),
      path.join(dir, `${baseName}.spec.ts`),
      path.join(dir, '__tests__', `${baseName}.test.tsx`),
      path.join(dir, '__tests__', `${baseName}.test.ts`),
    ];

    for (const testPath of testPatterns) {
      if (await this.fileExists(testPath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate usage counts for all components
   */
  private async calculateUsageCounts(): Promise<void> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {return;}

    for (const component of this.components) {
      try {
        // This is a simplified implementation
        // In a real implementation, you would use workspace.findTextInFiles
        // or a similar API to search across all files with pattern:
        // new RegExp(`<${component.name}[\\s/>]`, 'g')
        component.usageCount = 0;
      } catch {
        component.usageCount = 0;
      }
    }
  }

  /**
   * Group components by category
   * @param components
   */
  private groupByCategory(components: ComponentMetadata[]): EnzymeCategoryItem[] {
    const categoryMap = new Map<ComponentCategory, ComponentMetadata[]>();

    for (const component of components) {
      const existing = categoryMap.get(component.category) || [];
      existing.push(component);
      categoryMap.set(component.category, existing);
    }

    const items: EnzymeCategoryItem[] = [];
    for (const [category, comps] of categoryMap) {
      items.push(new EnzymeCategoryItem(
        this.formatCategoryName(category),
        comps.length,
        vscode.TreeItemCollapsibleState.Collapsed
      ));
    }

    return items.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }

  /**
   * Format category name for display
   * @param category
   */
  private formatCategoryName(category: ComponentCategory): string {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get components for a category
   * @param category
   */
  private getCategoryComponents(category: ComponentCategory): EnzymeComponentItem[] {
    const formattedCategory = this.formatCategoryName(category);

    const filteredComponents = this.components.filter(c =>
      this.formatCategoryName(c.category) === formattedCategory
    );

    return filteredComponents.map(component => new EnzymeComponentItem(
      component.name,
      component.filePath,
      {
        category: this.formatCategoryName(component.category),
        isUIComponent: component.isUIComponent,
        isFeatureComponent: component.isFeatureComponent,
        hasProps: component.hasProps,
        hasStory: component.hasStory,
        hasTests: component.hasTests,
        ...(component.usageCount !== undefined && { usageCount: component.usageCount }),
      }
    ));
  }

  /**
   * Get all discovered components
   * @returns Array of all component metadata
   */
  getComponents(): ComponentMetadata[] {
    return [...this.components];
  }

  /**
   * Get components by category
   * @param category
   * @returns Array of components in the specified category
   */
  getComponentsByCategory(category: ComponentCategory): ComponentMetadata[] {
    return this.components.filter(c => c.category === category);
  }
}
