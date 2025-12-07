/**
 * @file Features TreeView Provider
 * @description Displays all registered Enzyme features with metadata
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { BaseTreeProvider, TreeProviderOptions } from './base-tree-provider';
import { EnzymeFeatureItem, EnzymeCategoryItem, EnzymeRouteItem } from './tree-items';

interface FeatureMetadata {
  name: string;
  description?: string;
  version?: string;
  enabled?: boolean;
  filePath: string;
  routes: Array<{
    path: string;
    filePath: string;
    isProtected?: boolean;
  }>;
  components: string[];
  stores: string[];
}

/**
 * TreeView provider for Enzyme features
 */
export class EnzymeFeaturesTreeProvider extends BaseTreeProvider<EnzymeFeatureItem | EnzymeCategoryItem | EnzymeRouteItem> {
  private features: FeatureMetadata[] = [];

  constructor(context: vscode.ExtensionContext, options?: TreeProviderOptions) {
    super(context, options);
  }

  /**
   * Get watch patterns for auto-refresh
   */
  protected getWatchPatterns(): string[] {
    return [
      '**/features/**/index.ts',
      '**/features/**/index.tsx',
      '**/features/**/*.feature.ts',
      '**/features/**/*.feature.tsx',
    ];
  }

  /**
   * Get root tree items (all features)
   */
  protected async getRootItems(): Promise<Array<EnzymeFeatureItem | EnzymeCategoryItem>> {
    return this.getCachedOrFetch('features-root', async () => {
      await this.discoverFeatures();

      if (this.features.length === 0) {
        return [];
      }

      return this.features.map(feature => new EnzymeFeatureItem(
        feature.name,
        feature.filePath,
        {
          description: feature.description,
          version: feature.version,
          enabled: feature.enabled,
          routes: feature.routes.length,
          components: feature.components.length,
          stores: feature.stores.length,
        },
        vscode.TreeItemCollapsibleState.Collapsed
      ));
    });
  }

  /**
   * Get child items for a feature
   */
  protected async getChildItems(
    element: EnzymeFeatureItem | EnzymeCategoryItem | EnzymeRouteItem
  ): Promise<Array<EnzymeFeatureItem | EnzymeCategoryItem | EnzymeRouteItem>> {
    if (element instanceof EnzymeFeatureItem) {
      return this.getFeatureChildren(element);
    }

    if (element instanceof EnzymeCategoryItem) {
      return this.getCategoryChildren(element);
    }

    return [];
  }

  /**
   * Get children for a feature item
   */
  private async getFeatureChildren(
    feature: EnzymeFeatureItem
  ): Promise<Array<EnzymeCategoryItem>> {
    const featureData = this.features.find(f => f.name === feature.featureName);
    if (!featureData) {
      return [];
    }

    const categories: EnzymeCategoryItem[] = [];

    // Routes category
    if (featureData.routes.length > 0) {
      categories.push(new EnzymeCategoryItem(
        'Routes',
        featureData.routes.length,
        vscode.TreeItemCollapsibleState.Collapsed
      ));
    }

    // Components category
    if (featureData.components.length > 0) {
      categories.push(new EnzymeCategoryItem(
        'Components',
        featureData.components.length,
        vscode.TreeItemCollapsibleState.Collapsed
      ));
    }

    // Stores category
    if (featureData.stores.length > 0) {
      categories.push(new EnzymeCategoryItem(
        'Stores',
        featureData.stores.length,
        vscode.TreeItemCollapsibleState.Collapsed
      ));
    }

    return categories;
  }

  /**
   * Get children for a category item
   */
  private async getCategoryChildren(
    category: EnzymeCategoryItem
  ): Promise<Array<EnzymeRouteItem>> {
    // Find the parent feature
    // This is a simplified implementation - in production you'd need proper parent tracking
    const categoryName = category.categoryName;

    if (categoryName === 'Routes') {
      // Return route items
      const allRoutes: EnzymeRouteItem[] = [];
      for (const feature of this.features) {
        for (const route of feature.routes) {
          allRoutes.push(new EnzymeRouteItem(
            route.path,
            route.filePath,
            {
              isProtected: route.isProtected,
              feature: feature.name,
            }
          ));
        }
      }
      return allRoutes;
    }

    return [];
  }

  /**
   * Discover all features in the workspace
   */
  private async discoverFeatures(): Promise<void> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      this.showWarning('No workspace folder open');
      return;
    }

    try {
      this.features = [];

      // Find all feature files
      const featureFiles = await this.findFiles('**/features/**/index.{ts,tsx}');

      for (const fileUri of featureFiles) {
        const featureData = await this.parseFeatureFile(fileUri.fsPath);
        if (featureData) {
          this.features.push(featureData);
        }
      }

      // Sort features by name
      this.features.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      this.handleError(error as Error, 'discoverFeatures');
    }
  }

  /**
   * Parse a feature file to extract metadata
   */
  private async parseFeatureFile(filePath: string): Promise<FeatureMetadata | null> {
    try {
      const content = await this.readFile(filePath);

      // Extract feature name from file path
      const featureName = this.extractFeatureName(filePath);

      // Parse feature metadata from file content
      const metadata: FeatureMetadata = {
        name: featureName,
        description: this.extractDescription(content),
        version: this.extractVersion(content),
        enabled: this.extractEnabled(content),
        filePath,
        routes: await this.findFeatureRoutes(filePath),
        components: await this.findFeatureComponents(filePath),
        stores: await this.findFeatureStores(filePath),
      };

      return metadata;
    } catch (error) {
      console.error(`Error parsing feature file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Extract feature name from file path
   */
  private extractFeatureName(filePath: string): string {
    const parts = filePath.split(path.sep);
    const featuresIndex = parts.findIndex(p => p === 'features');
    if (featuresIndex !== -1 && featuresIndex + 1 < parts.length) {
      return parts[featuresIndex + 1];
    }
    return path.basename(path.dirname(filePath));
  }

  /**
   * Extract description from file content
   */
  private extractDescription(content: string): string | undefined {
    // Look for JSDoc description or exported description
    const descMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)\s*\n/);
    if (descMatch) {
      return descMatch[1];
    }

    const exportDescMatch = content.match(/export\s+const\s+description\s*=\s*['"`](.+?)['"`]/);
    if (exportDescMatch) {
      return exportDescMatch[1];
    }

    return undefined;
  }

  /**
   * Extract version from file content
   */
  private extractVersion(content: string): string | undefined {
    const versionMatch = content.match(/version:\s*['"`](.+?)['"`]/);
    return versionMatch ? versionMatch[1] : undefined;
  }

  /**
   * Extract enabled status from file content
   */
  private extractEnabled(content: string): boolean {
    // Check for feature flag or enabled property
    const enabledMatch = content.match(/enabled:\s*(true|false)/);
    if (enabledMatch) {
      return enabledMatch[1] === 'true';
    }
    // Default to true if not specified
    return true;
  }

  /**
   * Find all routes belonging to a feature
   */
  private async findFeatureRoutes(featurePath: string): Promise<Array<{
    path: string;
    filePath: string;
    isProtected?: boolean;
  }>> {
    const featureDir = path.dirname(featurePath);
    const routesDir = path.join(featureDir, 'routes');

    try {
      const routeFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(routesDir, '**/*.{ts,tsx}'),
        '**/node_modules/**'
      );

      const routes: Array<{ path: string; filePath: string; isProtected?: boolean }> = [];

      for (const routeFile of routeFiles) {
        const routePath = this.extractRoutePath(routeFile.fsPath, routesDir);
        const content = await this.readFile(routeFile.fsPath);
        const isProtected = content.includes('protected:') || content.includes('requiresAuth');

        routes.push({
          path: routePath,
          filePath: routeFile.fsPath,
          isProtected,
        });
      }

      return routes;
    } catch {
      return [];
    }
  }

  /**
   * Extract route path from file path
   */
  private extractRoutePath(filePath: string, routesDir: string): string {
    const relativePath = path.relative(routesDir, filePath);
    const segments = relativePath.split(path.sep);

    // Convert file-system path to URL path
    let urlPath = segments
      .map(segment => {
        // Remove file extension
        segment = segment.replace(/\.(tsx?|jsx?)$/, '');

        // Convert [param] to :param
        segment = segment.replace(/\[([^\]]+)\]/g, ':$1');

        // Handle index files
        if (segment === 'index') {
          return '';
        }

        return segment;
      })
      .filter(Boolean)
      .join('/');

    return '/' + urlPath;
  }

  /**
   * Find all components belonging to a feature
   */
  private async findFeatureComponents(featurePath: string): Promise<string[]> {
    const featureDir = path.dirname(featurePath);
    const componentsDir = path.join(featureDir, 'components');

    try {
      const componentFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(componentsDir, '**/*.{ts,tsx}'),
        '**/node_modules/**'
      );

      return componentFiles.map(f => path.basename(f.fsPath, path.extname(f.fsPath)));
    } catch {
      return [];
    }
  }

  /**
   * Find all stores belonging to a feature
   */
  private async findFeatureStores(featurePath: string): Promise<string[]> {
    const featureDir = path.dirname(featurePath);
    const storesDir = path.join(featureDir, 'stores');

    try {
      const storeFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(storesDir, '**/*.{ts,tsx}'),
        '**/node_modules/**'
      );

      return storeFiles.map(f => path.basename(f.fsPath, path.extname(f.fsPath)));
    } catch {
      return [];
    }
  }

  /**
   * Refresh features
   */
  async refreshFeatures(): Promise<void> {
    this.clearCache();
    await this.discoverFeatures();
    this.refresh(false);
  }

  /**
   * Get all discovered features
   */
  getFeatures(): FeatureMetadata[] {
    return [...this.features];
  }
}
