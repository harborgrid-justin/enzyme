/**
 * @file API TreeView Provider
 * @description Displays all API endpoints with HTTP methods, types, and mock status
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { BaseTreeProvider, TreeProviderOptions } from './base-tree-provider';
import { EnzymeAPIItem, EnzymeCategoryItem } from './tree-items';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

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
 */
export class EnzymeAPITreeProvider extends BaseTreeProvider<EnzymeAPIItem | EnzymeCategoryItem> {
  private endpoints: APIEndpointMetadata[] = [];

  constructor(context: vscode.ExtensionContext, options?: TreeProviderOptions) {
    super(context, options);
  }

  /**
   * Get watch patterns for auto-refresh
   */
  protected getWatchPatterns(): string[] {
    return [
      '**/api/**/*.{ts,tsx}',
      '**/services/**/*.{ts,tsx}',
      '**/client/**/*.{ts,tsx}',
    ];
  }

  /**
   * Get root tree items
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
   */
  protected async getChildItems(
    element: EnzymeAPIItem | EnzymeCategoryItem
  ): Promise<Array<EnzymeAPIItem>> {
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
        if (resourceCompare !== 0) return resourceCompare;
        return a.method.localeCompare(b.method);
      });
    } catch (error) {
      this.handleError(error as Error, 'discoverEndpoints');
    }
  }

  /**
   * Parse an API file to extract endpoint metadata
   */
  private async parseAPIFile(filePath: string): Promise<APIEndpointMetadata[] | null> {
    try {
      const content = await this.readFile(filePath);

      const endpoints: APIEndpointMetadata[] = [];

      // Look for various API client patterns
      // Pattern 1: axios/fetch calls
      const httpMethodPattern = /(get|post|put|patch|delete)\s*[<(]['"`]([^'"`]+)['"`]/gi;
      let match;

      while ((match = httpMethodPattern.exec(content)) !== null) {
        const method = match[1].toUpperCase() as HttpMethod;
        const apiPath = match[2];

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
      const apiMethodPattern = /export\s+(?:const|function)\s+(\w+)\s*=?\s*(?:async)?\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*{[^}]*(?:get|post|put|patch|delete)\s*[<(]['"`]([^'"`]+)['"`]/gis;

      while ((match = apiMethodPattern.exec(content)) !== null) {
        const methodName = match[1];
        const apiPath = match[2];
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
        requestType,
        responseType,
        isMocked,
        hasAuth,
        description,
      };
    } catch {
      return null;
    }
  }

  /**
   * Infer HTTP method from function name
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
   */
  private extractResourceFromPath(apiPath: string): string {
    // Remove leading slash and query params
    const cleanPath = apiPath.replace(/^\//, '').split('?')[0];

    // Get first segment
    const segments = cleanPath.split('/');
    const resource = segments[0] || 'Unknown';

    // Capitalize
    return resource.charAt(0).toUpperCase() + resource.slice(1);
  }

  /**
   * Extract request type from content
   */
  private extractRequestType(content: string, context: string): string | undefined {
    // Look for type annotations near the context
    const requestTypePattern = new RegExp(
      `${context}[^<]*<\\s*([^,>]+)\\s*,`,
      'i'
    );
    const match = content.match(requestTypePattern);

    if (match && match[1]) {
      return match[1].trim();
    }

    // Look for data parameter type
    const dataTypePattern = /data:\s*([^,)]+)/i;
    const dataMatch = content.match(dataTypePattern);

    if (dataMatch && dataMatch[1]) {
      return dataMatch[1].trim();
    }

    return undefined;
  }

  /**
   * Extract response type from content
   */
  private extractResponseType(content: string, context: string): string | undefined {
    // Look for return type annotation
    const returnTypePattern = new RegExp(
      `${context}[^:]*:\\s*Promise<\\s*([^>]+)\\s*>`,
      'i'
    );
    const match = content.match(returnTypePattern);

    if (match && match[1]) {
      return match[1].trim();
    }

    // Look for generic type in API call
    const genericPattern = new RegExp(
      `(?:get|post|put|patch|delete)\\s*<\\s*([^>]+)\\s*>`,
      'i'
    );
    const genericMatch = content.match(genericPattern);

    if (genericMatch && genericMatch[1]) {
      return genericMatch[1].trim();
    }

    return undefined;
  }

  /**
   * Check if endpoint is mocked
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
   */
  private extractDescription(content: string, methodName?: string): string | undefined {
    if (!methodName) return undefined;

    // Look for JSDoc comment before the method
    const docPattern = new RegExp(
      `/\\*\\*([^*]|\\*(?!/))*\\*/\\s*export\\s+(?:const|function)\\s+${methodName}`,
      's'
    );
    const match = content.match(docPattern);

    if (match) {
      const docComment = match[0];
      const descMatch = docComment.match(/\/\*\*\s*\n\s*\*\s*(.+?)\s*\n/);
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
        requestType: endpoint.requestType,
        responseType: endpoint.responseType,
        isMocked: endpoint.isMocked,
        hasAuth: endpoint.hasAuth,
      }
    ));
  }

  /**
   * Get all discovered endpoints
   */
  getEndpoints(): APIEndpointMetadata[] {
    return [...this.endpoints];
  }

  /**
   * Get endpoints by method
   */
  getEndpointsByMethod(method: HttpMethod): APIEndpointMetadata[] {
    return this.endpoints.filter(e => e.method === method);
  }

  /**
   * Get mocked endpoints
   */
  getMockedEndpoints(): APIEndpointMetadata[] {
    return this.endpoints.filter(e => e.isMocked);
  }

  /**
   * Get authenticated endpoints
   */
  getAuthenticatedEndpoints(): APIEndpointMetadata[] {
    return this.endpoints.filter(e => e.hasAuth);
  }
}
