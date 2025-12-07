/**
 * @file Routes TreeView Provider
 * @description Displays all Enzyme routes with conflict detection and grouping options
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { BaseTreeProvider, TreeProviderOptions } from './base-tree-provider';
import { EnzymeRouteItem, EnzymeCategoryItem } from './tree-items';

interface RouteMetadata {
  path: string;
  filePath: string;
  feature?: string;
  params: string[];
  isProtected: boolean;
  hasLoader: boolean;
  hasAction: boolean;
  hasGuard: boolean;
  isLazy: boolean;
  hasConflict: boolean;
  conflictsWith?: string[];
}

type RouteGrouping = 'by-feature' | 'by-path' | 'flat';

/**
 * TreeView provider for Enzyme routes
 */
export class EnzymeRoutesTreeProvider extends BaseTreeProvider<EnzymeRouteItem | EnzymeCategoryItem> {
  private routes: RouteMetadata[] = [];
  private grouping: RouteGrouping = 'by-path';

  constructor(context: vscode.ExtensionContext, options?: TreeProviderOptions) {
    super(context, options);
  }

  /**
   * Get watch patterns for auto-refresh
   */
  protected getWatchPatterns(): string[] {
    return [
      '**/routes/**/*.{ts,tsx}',
      '**/pages/**/*.{ts,tsx}',
      '**/features/**/routes/**/*.{ts,tsx}',
    ];
  }

  /**
   * Set grouping mode
   */
  setGrouping(grouping: RouteGrouping): void {
    this.grouping = grouping;
    this.refresh(false);
  }

  /**
   * Get root tree items
   */
  protected async getRootItems(): Promise<Array<EnzymeRouteItem | EnzymeCategoryItem>> {
    return this.getCachedOrFetch('routes-root', async () => {
      await this.discoverRoutes();

      if (this.routes.length === 0) {
        return [];
      }

      switch (this.grouping) {
        case 'by-feature':
          return this.groupByFeature();
        case 'by-path':
          return this.groupByPath();
        case 'flat':
        default:
          return this.createFlatList();
      }
    });
  }

  /**
   * Get child items
   */
  protected async getChildItems(
    element: EnzymeRouteItem | EnzymeCategoryItem
  ): Promise<Array<EnzymeRouteItem | EnzymeCategoryItem>> {
    if (element instanceof EnzymeCategoryItem) {
      return this.getCategoryRoutes(element.categoryName);
    }

    // Routes don't have children in this view
    return [];
  }

  /**
   * Discover all routes in the workspace
   */
  private async discoverRoutes(): Promise<void> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      this.showWarning('No workspace folder open');
      return;
    }

    try {
      this.routes = [];

      // Find all route files
      const routePatterns = [
        '**/routes/**/*.{ts,tsx}',
        '**/pages/**/*.{ts,tsx}',
        '**/features/**/routes/**/*.{ts,tsx}',
      ];

      for (const pattern of routePatterns) {
        const files = await this.findFiles(pattern, '**/node_modules/**');

        for (const fileUri of files) {
          const routeData = await this.parseRouteFile(fileUri.fsPath);
          if (routeData) {
            this.routes.push(routeData);
          }
        }
      }

      // Detect conflicts
      this.detectConflicts();

      // Sort routes by path
      this.routes.sort((a, b) => a.path.localeCompare(b.path));
    } catch (error) {
      this.handleError(error as Error, 'discoverRoutes');
    }
  }

  /**
   * Parse a route file to extract metadata
   */
  private async parseRouteFile(filePath: string): Promise<RouteMetadata | null> {
    try {
      const content = await this.readFile(filePath);

      // Extract route path
      const routePath = this.extractRoutePathFromFile(filePath, content);

      // Extract route parameters
      const params = this.extractRouteParams(routePath);

      // Extract feature name
      const feature = this.extractFeatureFromPath(filePath);

      // Check for various route properties
      const isProtected = this.checkIsProtected(content);
      const hasLoader = this.checkHasLoader(content);
      const hasAction = this.checkHasAction(content);
      const hasGuard = this.checkHasGuard(content);
      const isLazy = this.checkIsLazy(content);

      return {
        path: routePath,
        filePath,
        feature,
        params,
        isProtected,
        hasLoader,
        hasAction,
        hasGuard,
        isLazy,
        hasConflict: false,
      };
    } catch (error) {
      console.error(`Error parsing route file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Extract route path from file
   */
  private extractRoutePathFromFile(filePath: string, content: string): string {
    // First try to find explicit path definition
    const pathMatch = content.match(/path:\s*['"`](.+?)['"`]/);
    if (pathMatch) {
      return pathMatch[1];
    }

    // Fall back to file-based routing
    const routesIndex = filePath.indexOf('/routes/');
    const pagesIndex = filePath.indexOf('/pages/');

    let baseIndex = -1;
    if (routesIndex !== -1) {
      baseIndex = routesIndex + '/routes/'.length;
    } else if (pagesIndex !== -1) {
      baseIndex = pagesIndex + '/pages/'.length;
    }

    if (baseIndex === -1) {
      return '/' + path.basename(filePath, path.extname(filePath));
    }

    const relativePath = filePath.substring(baseIndex);
    const segments = relativePath.split(path.sep);

    // Convert file-system path to URL path
    const urlPath = segments
      .map(segment => {
        // Remove file extension
        segment = segment.replace(/\.(tsx?|jsx?)$/, '');

        // Convert [param] to :param
        segment = segment.replace(/\[([^\]]+)\]/g, ':$1');

        // Convert (group) to nothing (route groups)
        segment = segment.replace(/\([^)]+\)/g, '');

        // Handle index files
        if (segment === 'index') {
          return '';
        }

        return segment;
      })
      .filter(Boolean)
      .join('/');

    return '/' + urlPath || '/';
  }

  /**
   * Extract route parameters from path
   */
  private extractRouteParams(routePath: string): string[] {
    const params: string[] = [];
    const paramRegex = /:([a-zA-Z0-9_]+)\??/g;
    let match;

    while ((match = paramRegex.exec(routePath)) !== null) {
      params.push(match[1]);
    }

    return params;
  }

  /**
   * Extract feature name from file path
   */
  private extractFeatureFromPath(filePath: string): string | undefined {
    const match = filePath.match(/\/features\/([^\/]+)\//);
    return match ? match[1] : undefined;
  }

  /**
   * Check if route is protected
   */
  private checkIsProtected(content: string): boolean {
    return (
      content.includes('requiresAuth') ||
      content.includes('protected:') ||
      content.includes('isPublic: false') ||
      content.includes('AuthGuard')
    );
  }

  /**
   * Check if route has loader
   */
  private checkHasLoader(content: string): boolean {
    return (
      content.includes('export const loader') ||
      content.includes('export async function loader')
    );
  }

  /**
   * Check if route has action
   */
  private checkHasAction(content: string): boolean {
    return (
      content.includes('export const action') ||
      content.includes('export async function action')
    );
  }

  /**
   * Check if route has guards
   */
  private checkHasGuard(content: string): boolean {
    return (
      content.includes('Guard') ||
      content.includes('canActivate') ||
      content.includes('canDeactivate')
    );
  }

  /**
   * Check if route is lazy loaded
   */
  private checkIsLazy(content: string): boolean {
    return (
      content.includes('React.lazy') ||
      content.includes('lazy(') ||
      content.includes('import(')
    );
  }

  /**
   * Detect route conflicts
   */
  private detectConflicts(): void {
    const pathMap = new Map<string, RouteMetadata[]>();

    // Group routes by path pattern
    for (const route of this.routes) {
      const normalizedPath = this.normalizePath(route.path);
      const existing = pathMap.get(normalizedPath) || [];
      existing.push(route);
      pathMap.set(normalizedPath, existing);
    }

    // Mark conflicts
    for (const [_path, routes] of pathMap) {
      if (routes.length > 1) {
        for (const route of routes) {
          route.hasConflict = true;
          route.conflictsWith = routes
            .filter(r => r !== route)
            .map(r => r.filePath);
        }
      }
    }
  }

  /**
   * Normalize path for conflict detection
   */
  private normalizePath(routePath: string): string {
    // Replace all parameters with a placeholder
    return routePath.replace(/:[a-zA-Z0-9_]+\??/g, ':param');
  }

  /**
   * Group routes by feature
   */
  private groupByFeature(): Array<EnzymeCategoryItem | EnzymeRouteItem> {
    const featureMap = new Map<string, RouteMetadata[]>();

    // Group routes by feature
    for (const route of this.routes) {
      const feature = route.feature || 'No Feature';
      const existing = featureMap.get(feature) || [];
      existing.push(route);
      featureMap.set(feature, existing);
    }

    // Create category items
    const items: Array<EnzymeCategoryItem> = [];
    for (const [feature, routes] of featureMap) {
      items.push(new EnzymeCategoryItem(
        feature,
        routes.length,
        vscode.TreeItemCollapsibleState.Collapsed
      ));
    }

    return items.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }

  /**
   * Group routes by path hierarchy
   */
  private groupByPath(): Array<EnzymeCategoryItem | EnzymeRouteItem> {
    // Get top-level path segments
    const topLevelPaths = new Set<string>();

    for (const route of this.routes) {
      const segments = route.path.split('/').filter(Boolean);
      if (segments.length > 0) {
        topLevelPaths.add('/' + segments[0]);
      } else {
        topLevelPaths.add('/');
      }
    }

    // Create category items for each top-level path
    const items: Array<EnzymeCategoryItem> = [];
    for (const topPath of topLevelPaths) {
      const matchingRoutes = this.routes.filter(r =>
        r.path === topPath || r.path.startsWith(topPath + '/')
      );

      items.push(new EnzymeCategoryItem(
        topPath,
        matchingRoutes.length,
        vscode.TreeItemCollapsibleState.Collapsed
      ));
    }

    return items.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }

  /**
   * Create flat list of routes
   */
  private createFlatList(): EnzymeRouteItem[] {
    return this.routes.map(route => this.createRouteItem(route));
  }

  /**
   * Get routes for a category
   */
  private getCategoryRoutes(categoryName: string): EnzymeRouteItem[] {
    let filteredRoutes: RouteMetadata[];

    if (this.grouping === 'by-feature') {
      filteredRoutes = this.routes.filter(r =>
        (r.feature || 'No Feature') === categoryName
      );
    } else if (this.grouping === 'by-path') {
      filteredRoutes = this.routes.filter(r =>
        r.path === categoryName || r.path.startsWith(categoryName + '/')
      );
    } else {
      filteredRoutes = this.routes;
    }

    return filteredRoutes.map(route => this.createRouteItem(route));
  }

  /**
   * Create a route tree item
   */
  private createRouteItem(route: RouteMetadata): EnzymeRouteItem {
    return new EnzymeRouteItem(
      route.path,
      route.filePath,
      {
        isProtected: route.isProtected,
        hasLoader: route.hasLoader,
        hasAction: route.hasAction,
        hasGuard: route.hasGuard,
        isLazy: route.isLazy,
        hasConflict: route.hasConflict,
        feature: route.feature,
        params: route.params,
      }
    );
  }

  /**
   * Get all discovered routes
   */
  getRoutes(): RouteMetadata[] {
    return [...this.routes];
  }

  /**
   * Get routes with conflicts
   */
  getConflictingRoutes(): RouteMetadata[] {
    return this.routes.filter(r => r.hasConflict);
  }
}
