/**
 * @file API TreeView Provider
 * @description Displays all API endpoints with HTTP methods, types, and mock status
 */

import * as vscode from 'vscode';
import { BaseTreeProvider } from './base-tree-provider';
import { EnzymeAPIItem, EnzymeCategoryItem } from './tree-items';
import type { TreeProviderOptions } from './base-tree-provider';

/**
 *
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 *
 */
interface APIEndpointMetadata {
  name: string;
  filePath: string;
  method: HttpMethod;
  path: string;
  resource: string;
  requestType?: string;
  responseType?: string;
  isMocked: boolean;
  hasAuth: boolean;
  description?: string;
}

/**
 * TreeView provider for Enzyme API endpoints
 *
 * @description Discovers and organizes API endpoints with comprehensive metadata:
 * - HTTP method detection (GET, POST, PUT, PATCH, DELETE)
 * - Endpoint path extraction and normalization
 * - Request/response type inference from TypeScript annotations
 * - Mock service integration detection (MSW, faker)
 * - Authentication requirement identification
 * - Resource-based grouping and organization
 * - JSDoc description extraction
 *
 * @example
 * ```typescript
 * const provider = new EnzymeAPITreeProvider(context);
 * const endpoints = provider.getEndpoints();
 * const getEndpoints = provider.getEndpointsByMethod('GET');
 * const mockedEndpoints = provider.getMockedEndpoints();
 * const authenticatedEndpoints = provider.getAuthenticatedEndpoints();
 * ```
 */
export class EnzymeAPITreeProvider extends BaseTreeProvider<EnzymeAPIItem | EnzymeCategoryItem> {
  private endpoints: APIEndpointMetadata[] = [];

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
   * @returns Array of glob patterns to watch for API file changes
   */
  protected override getWatchPatterns(): string[] {
    return [
      '**/api/**/*.{ts,tsx}',
      '**/services/**/*.{ts,tsx}',
      '**/client/**/*.{ts,tsx}',
    ];
  }

  /**
   * Get root tree items
   * @returns Array of API items and category items grouped by resource
   */
  protected async getRootItems(): Promise<Array<EnzymeAPIItem | EnzymeCategoryItem>> {
    return this.getCachedOrFetch('api-root', async () => {
      await this.discoverEndpoints();

      if (this.endpoints.length === 0) {
        return [];
      }

      // Group by resource
      return this.groupByResource();
    });
  }

  /**
   * Get child items
   * @param element
   * @returns Array of API endpoint items for the given category
   */
  protected async getChildItems(
    element: EnzymeAPIItem | EnzymeCategoryItem
  ): Promise<EnzymeAPIItem[]> {
    if (element instanceof EnzymeCategoryItem) {
      return this.getResourceEndpoints(element.categoryName);
    }

    return [];
  }

  /**
   * Discover all API endpoints in the workspace
   */
  private async discoverEndpoints(): Promise<void> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      this.showWarning('No workspace folder open');
      return;
    }

    try {
      this.endpoints = [];

      // Find all API files
      const apiPatterns = [
        '**/api/**/*.{ts,tsx}',
        '**/services/**/*.{ts,tsx}',
        '**/client/**/*.{ts,tsx}',
      ];

      for (const pattern of apiPatterns) {
        const files = await this.findFiles(pattern, '**/node_modules/**');

        for (const fileUri of files) {
          const endpointData = await this.parseAPIFile(fileUri.fsPath);
          if (endpointData) {
            this.endpoints.push(...endpointData);
          }
        }
      }

      // Sort endpoints by resource and method
      this.endpoints.sort((a, b) => {
        const resourceCompare = a.resource.localeCompare(b.resource);
        if (resourceCompare !== 0) {return resourceCompare;}
        return a.method.localeCompare(b.method);
      });
    } catch (error) {
      this.handleError(error as Error, 'discoverEndpoints');
    }
  }

  /**
   * Parse an API file to extract endpoint metadata
   * @param filePath
   */
  private async parseAPIFile(filePath: string): Promise<APIEndpointMetadata[] | null> {
    try {
      const content = await this.readFile(filePath);

      const endpoints: APIEndpointMetadata[] = [];

      // Look for various API client patterns
      // Pattern 1: axios/fetch calls
      const httpMethodPattern = /(get|post|put|patch|delete)\s*[(<]["'`]([^"'`]+)["'`]/gi;
      let match;

      while ((match = httpMethodPattern.exec(content)) !== null) {
        const method = match[1]?.toUpperCase() as HttpMethod;
        const apiPath = match[2];

        if (!method || !apiPath) {
          continue;
        }

        const endpoint = this.createEndpointMetadata(
          content,
          filePath,
          method,
          apiPath
        );

        if (endpoint) {
          endpoints.push(endpoint);
        }
      }

      // Pattern 2: API client method definitions
      const apiMethodPattern = /export\s+(?:const|function)\s+(\w+)\s*=?\s*(?:async)?\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*{[^}]*(?:get|post|put|patch|delete)\s*[(<]["'`]([^"'`]+)["'`]/gis;

      while ((match = apiMethodPattern.exec(content)) !== null) {
        const methodName = match[1];
        const apiPath = match[2];

        if (!methodName || !apiPath) {
          continue;
        }

        const method = this.inferMethodFromName(methodName);

        const endpoint = this.createEndpointMetadata(
          content,
          filePath,
          method,
          apiPath,
          methodName
        );

        if (endpoint) {
          endpoints.push(endpoint);
        }
      }

      return endpoints.length > 0 ? endpoints : null;
    } catch (error) {
      console.error(`Error parsing API file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Create endpoint metadata
   * @param content
   * @param filePath
   * @param method
   * @param apiPath
   * @param methodName
   */
  private createEndpointMetadata(
    content: string,
    filePath: string,
    method: HttpMethod,
    apiPath: string,
    methodName?: string
  ): APIEndpointMetadata | null {
    try {
      // Extract resource name from path
      const resource = this.extractResourceFromPath(apiPath);

      // Generate endpoint name
      const name = methodName || `${method} ${apiPath}`;

      // Extract request/response types
      const requestType = this.extractRequestType(content, methodName || apiPath);
      const responseType = this.extractResponseType(content, methodName || apiPath);

      // Check if mocked
      const isMocked = this.checkIsMocked(content);

      // Check for authentication
      const hasAuth = this.checkHasAuth(content);

      // Extract description
      const description = this.extractDescription(content, methodName);

      return {
        name,
        filePath,
        method,
        path: apiPath,
        resource,
        isMocked,
        hasAuth,
        ...(requestType && { requestType }),
        ...(responseType && { responseType }),
        ...(description && { description }),
      };
    } catch {
      return null;
    }
  }

  /**
   * Infer HTTP method from function name
   * @param methodName
   * @returns Inferred HTTP method based on function name pattern
   */
  private inferMethodFromName(methodName: string): HttpMethod {
    const lowerName = methodName.toLowerCase();

    if (lowerName.startsWith('get') || lowerName.includes('fetch') || lowerName.includes('list')) {
      return 'GET';
    }
    if (lowerName.startsWith('create') || lowerName.startsWith('add')) {
      return 'POST';
    }
    if (lowerName.startsWith('update') || lowerName.startsWith('edit')) {
      return 'PUT';
    }
    if (lowerName.startsWith('patch') || lowerName.startsWith('modify')) {
      return 'PATCH';
    }
    if (lowerName.startsWith('delete') || lowerName.startsWith('remove')) {
      return 'DELETE';
    }

    return 'GET'; // Default
  }

  /**
   * Extract resource name from API path
   * @param apiPath
   * @returns Capitalized resource name extracted from path
   */
  private extractResourceFromPath(apiPath: string): string {
    // Remove leading slash and query params
    const cleanPath = apiPath.replace(/^\//, '').split('?')[0];

    if (!cleanPath) {
      return 'Unknown';
    }

    // Get first segment
    const segments = cleanPath.split('/');
    const resource = segments[0] ?? 'Unknown';

    // Capitalize
    return resource.charAt(0).toUpperCase() + resource.slice(1);
  }

  /**
   * Extract request type from content
   * @param content
   * @param context
   * @returns Request type string if found, undefined otherwise
   */
  private extractRequestType(content: string, context: string): string | undefined {
    // Look for type annotations near the context
    const requestTypePattern = new RegExp(
      `${context}[^<]*<\\s*([^,>]+)\\s*,`,
      'i'
    );
    const match = content.match(requestTypePattern);

    if (match?.[1]) {
      return match[1].trim();
    }

    // Look for data parameter type
    const dataTypePattern = /data:\s*([^),]+)/i;
    const dataMatch = dataTypePattern.exec(content);

    if (dataMatch?.[1]) {
      return dataMatch[1].trim();
    }

    return undefined;
  }

  /**
   * Extract response type from content
   * @param content
   * @param context
   * @returns Response type string if found, undefined otherwise
   */
  private extractResponseType(content: string, context: string): string | undefined {
    // Look for return type annotation
    const returnTypePattern = new RegExp(
      `${context}[^:]*:\\s*Promise<\\s*([^>]+)\\s*>`,
      'i'
    );
    const match = content.match(returnTypePattern);

    if (match?.[1]) {
      return match[1].trim();
    }

    // Look for generic type in API call
    const genericPattern = new RegExp(
      `(?:get|post|put|patch|delete)\\s*<\\s*([^>]+)\\s*>`,
      'i'
    );
    const genericMatch = genericPattern.exec(content);

    if (genericMatch?.[1]) {
      return genericMatch[1].trim();
    }

    return undefined;
  }

  /**
   * Check if endpoint is mocked
   * @param content
   * @returns True if endpoint appears to be mocked
   */
  private checkIsMocked(content: string): boolean {
    return (
      content.includes('mock') ||
      content.includes('msw') ||
      content.includes('MockService') ||
      content.includes('faker')
    );
  }

  /**
   * Check if endpoint requires authentication
   * @param content
   * @returns True if endpoint requires authentication
   */
  private checkHasAuth(content: string): boolean {
    return (
      content.includes('auth') ||
      content.includes('token') ||
      content.includes('bearer') ||
      content.includes('Authorization')
    );
  }

  /**
   * Extract description from JSDoc
   * @param content
   * @param methodName
   * @returns Description string if found, undefined otherwise
   */
  private extractDescription(content: string, methodName?: string): string | undefined {
    if (!methodName) {return undefined;}

    // Look for JSDoc comment before the method
    const documentPattern = new RegExp(
      `/\\*\\*([^*]|\\*(?!/))*\\*/\\s*export\\s+(?:const|function)\\s+${methodName}`,
      's'
    );
    const match = content.match(documentPattern);

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
   * Group endpoints by resource
   */
  private groupByResource(): EnzymeCategoryItem[] {
    const resourceMap = new Map<string, APIEndpointMetadata[]>();

    for (const endpoint of this.endpoints) {
      const existing = resourceMap.get(endpoint.resource) || [];
      existing.push(endpoint);
      resourceMap.set(endpoint.resource, existing);
    }

    const items: EnzymeCategoryItem[] = [];
    for (const [resource, endpoints] of resourceMap) {
      items.push(new EnzymeCategoryItem(
        resource,
        endpoints.length,
        vscode.TreeItemCollapsibleState.Collapsed
      ));
    }

    return items.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }

  /**
   * Get endpoints for a resource
   * @param resource
   */
  private getResourceEndpoints(resource: string): EnzymeAPIItem[] {
    const filteredEndpoints = this.endpoints.filter(e => e.resource === resource);

    return filteredEndpoints.map(endpoint => new EnzymeAPIItem(
      endpoint.name,
      endpoint.filePath,
      {
        method: endpoint.method,
        path: endpoint.path,
        resource: endpoint.resource,
        isMocked: endpoint.isMocked,
        hasAuth: endpoint.hasAuth,
        ...(endpoint.requestType && { requestType: endpoint.requestType }),
        ...(endpoint.responseType && { responseType: endpoint.responseType }),
      }
    ));
  }

  /**
   * Get all discovered endpoints
   * @returns Array of all API endpoint metadata
   */
  getEndpoints(): APIEndpointMetadata[] {
    return [...this.endpoints];
  }

  /**
   * Get endpoints by method
   * @param method
   * @returns Array of endpoints matching the specified HTTP method
   */
  getEndpointsByMethod(method: HttpMethod): APIEndpointMetadata[] {
    return this.endpoints.filter(e => e.method === method);
  }

  /**
   * Get mocked endpoints
   * @returns Array of mocked endpoints
   */
  getMockedEndpoints(): APIEndpointMetadata[] {
    return this.endpoints.filter(e => e.isMocked);
  }

  /**
   * Get authenticated endpoints
   * @returns Array of endpoints that require authentication
   */
  getAuthenticatedEndpoints(): APIEndpointMetadata[] {
    return this.endpoints.filter(e => e.hasAuth);
  }
}
