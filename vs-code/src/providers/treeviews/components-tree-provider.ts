/**
 * @file Components TreeView Provider
 * @description Displays all Enzyme components with categorization and usage tracking
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { BaseTreeProvider, TreeProviderOptions } from './base-tree-provider';
import { EnzymeComponentItem, EnzymeCategoryItem } from './tree-items';

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
 */
export class EnzymeComponentsTreeProvider extends BaseTreeProvider<EnzymeComponentItem | EnzymeCategoryItem> {
  private components: ComponentMetadata[] = [];
  private filterText: string = '';

  constructor(context: vscode.ExtensionContext, options?: TreeProviderOptions) {
    super(context, options);
  }

  /**
   * Get watch patterns for auto-refresh
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
   */
  protected async getChildItems(
    element: EnzymeComponentItem | EnzymeCategoryItem
  ): Promise<Array<EnzymeComponentItem>> {
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
        propsInterface,
      };
    } catch (error) {
      console.error(`Error parsing component file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Extract component name from file content or path
   */
  private extractComponentName(content: string, filePath: string): string | null {
    // Try to find export default or named export
    const defaultExportMatch = content.match(/export\s+default\s+(?:function\s+)?(\w+)/);
    if (defaultExportMatch) {
      return defaultExportMatch[1];
    }

    const namedExportMatch = content.match(/export\s+(?:const|function)\s+(\w+)/);
    if (namedExportMatch) {
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
   */
  private determineCategory(filePath: string, content: string): ComponentCategory {
    const lowerPath = filePath.toLowerCase();
    const lowerContent = content.toLowerCase();

    // Check path segments
    if (lowerPath.includes('/forms/')) return 'forms';
    if (lowerPath.includes('/layout/')) return 'layout';
    if (lowerPath.includes('/feedback/')) return 'feedback';
    if (lowerPath.includes('/data-display/')) return 'data-display';
    if (lowerPath.includes('/navigation/')) return 'navigation';
    if (lowerPath.includes('/inputs/')) return 'inputs';
    if (lowerPath.includes('/overlays/')) return 'overlays';

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
   */
  private checkHasProps(content: string): boolean {
    return (
      content.includes('Props') &&
      (content.includes('interface') || content.includes('type'))
    );
  }

  /**
   * Extract props interface name
   */
  private extractPropsInterface(content: string): string | undefined {
    const match = content.match(/(?:interface|type)\s+(\w+Props)/);
    return match ? match[1] : undefined;
  }

  /**
   * Check if component has a Storybook story
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
    if (!workspaceRoot) return;

    for (const component of this.components) {
      try {
        // Search for component usage in the workspace
        const searchPattern = new RegExp(`<${component.name}[\\s/>]`, 'g');

        // This is a simplified implementation
        // In a real implementation, you would use workspace.findTextInFiles
        // or a similar API to search across all files
        component.usageCount = 0;
      } catch {
        component.usageCount = 0;
      }
    }
  }

  /**
   * Group components by category
   */
  private groupByCategory(components: ComponentMetadata[]): Array<EnzymeCategoryItem> {
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
   */
  private formatCategoryName(category: ComponentCategory): string {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get components for a category
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
        usageCount: component.usageCount,
        hasProps: component.hasProps,
        hasStory: component.hasStory,
        hasTests: component.hasTests,
      }
    ));
  }

  /**
   * Get all discovered components
   */
  getComponents(): ComponentMetadata[] {
    return [...this.components];
  }

  /**
   * Get components by category
   */
  getComponentsByCategory(category: ComponentCategory): ComponentMetadata[] {
    return this.components.filter(c => c.category === category);
  }
}
