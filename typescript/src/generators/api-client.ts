/**
 * API Client Code Generator from OpenAPI Specs
 *
 * Generates TypeScript API client code from OpenAPI/Swagger specifications
 * with full type safety and request/response handling.
 *
 * @example
 * ```typescript
 * const generator = new ApiClientGenerator();
 * const client = generator.generateFromOpenAPI(openApiSpec);
 * ```
 *
 * @module generators/api-client
 */

import { TypeGenerator, JSONSchema } from './types';

/**
 * HTTP method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * API endpoint definition
 */
export interface ApiEndpoint {
  /**
   * HTTP method
   */
  method: HttpMethod;

  /**
   * Endpoint path (e.g., '/users/{id}')
   */
  path: string;

  /**
   * Operation ID (used for method name)
   */
  operationId?: string;

  /**
   * Endpoint description
   */
  description?: string;

  /**
   * Path parameters
   */
  pathParams?: ApiParameter[];

  /**
   * Query parameters
   */
  queryParams?: ApiParameter[];

  /**
   * Request body schema
   */
  requestBody?: JSONSchema;

  /**
   * Response schema
   */
  response?: JSONSchema;

  /**
   * Response status code
   */
  responseStatus?: number;

  /**
   * Tags for grouping
   */
  tags?: string[];
}

/**
 * API parameter definition
 */
export interface ApiParameter {
  /**
   * Parameter name
   */
  name: string;

  /**
   * Parameter type
   */
  type: string;

  /**
   * Is required
   */
  required?: boolean;

  /**
   * Description
   */
  description?: string;

  /**
   * Default value
   */
  default?: unknown;
}

/**
 * OpenAPI specification (simplified)
 */
export interface OpenAPISpec {
  /**
   * OpenAPI version
   */
  openapi?: string;

  /**
   * API info
   */
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };

  /**
   * Base server URL
   */
  servers?: Array<{
    url: string;
    description?: string;
  }>;

  /**
   * API paths
   */
  paths: Record<string, Record<string, unknown>>;

  /**
   * Component schemas
   */
  components?: {
    schemas?: Record<string, JSONSchema>;
  };
}

/**
 * API client generation options
 */
export interface ApiClientOptions {
  /**
   * Client class name
   */
  className?: string;

  /**
   * Base URL
   */
  baseUrl?: string;

  /**
   * Include request/response types
   */
  includeTypes?: boolean;

  /**
   * Use fetch API (default) or axios
   */
  httpClient?: 'fetch' | 'axios';

  /**
   * Include error handling
   */
  errorHandling?: boolean;

  /**
   * Include authentication
   */
  auth?: {
    type: 'bearer' | 'api-key' | 'basic';
    headerName?: string;
  };

  /**
   * Export type
   */
  exportType?: 'named' | 'default';
}

/**
 * API client code generator
 *
 * @example
 * ```typescript
 * const generator = new ApiClientGenerator();
 *
 * // Generate from endpoints
 * const client = generator.generate([
 *   {
 *     method: 'GET',
 *     path: '/users/{id}',
 *     operationId: 'getUser',
 *     pathParams: [{ name: 'id', type: 'string', required: true }],
 *     response: {
 *       type: 'object',
 *       properties: {
 *         id: { type: 'string' },
 *         name: { type: 'string' }
 *       }
 *     }
 *   }
 * ]);
 *
 * // Generate from OpenAPI spec
 * const apiClient = generator.generateFromOpenAPI(openApiSpec);
 * ```
 */
export class ApiClientGenerator {
  private typeGenerator: TypeGenerator;

  constructor() {
    this.typeGenerator = new TypeGenerator();
  }

  /**
   * Generate API client from endpoint definitions
   *
   * @param endpoints - Array of endpoint definitions
   * @param options - Generation options
   * @returns Generated API client code
   *
   * @example
   * ```typescript
   * const code = generator.generate([
   *   {
   *     method: 'POST',
   *     path: '/users',
   *     operationId: 'createUser',
   *     requestBody: { type: 'object', properties: { name: { type: 'string' } } },
   *     response: { type: 'object', properties: { id: { type: 'string' } } }
   *   }
   * ], { className: 'UserApi', baseUrl: 'https://api.example.com' });
   * ```
   */
  generate(endpoints: ApiEndpoint[], options?: ApiClientOptions): string {
    const opts = this.getDefaultOptions(options);
    const className = opts.className || 'ApiClient';

    // Generate types
    const types = opts.includeTypes ? this.generateTypes(endpoints) : '';

    // Generate methods
    const methods = endpoints.map(endpoint => this.generateMethod(endpoint, opts)).join('\n\n');

    // Generate client class
    const clientCode = this.generateClientClass(className, methods, opts);

    // Combine all parts
    return `${this.generateImports(opts)}\n\n${types}\n\n${clientCode}`;
  }

  /**
   * Generate API client from OpenAPI specification
   *
   * @param spec - OpenAPI specification
   * @param options - Generation options
   * @returns Generated API client code
   *
   * @example
   * ```typescript
   * const openApiSpec = {
   *   openapi: '3.0.0',
   *   paths: {
   *     '/users/{id}': {
   *       get: {
   *         operationId: 'getUser',
   *         parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }]
   *       }
   *     }
   *   }
   * };
   *
   * const code = generator.generateFromOpenAPI(openApiSpec);
   * ```
   */
  generateFromOpenAPI(spec: OpenAPISpec, options?: ApiClientOptions): string {
    const endpoints = this.parseOpenAPISpec(spec);
    const baseUrl = options?.baseUrl || spec.servers?.[0]?.url || '';

    return this.generate(endpoints, { ...options, baseUrl });
  }

  /**
   * Parse OpenAPI spec to endpoint definitions
   */
  private parseOpenAPISpec(spec: OpenAPISpec): ApiEndpoint[] {
    const endpoints: ApiEndpoint[] = [];

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem as Record<string, any>)) {
        if (!['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
          continue;
        }

        const endpoint: ApiEndpoint = {
          method: method.toUpperCase() as HttpMethod,
          path,
          operationId: operation.operationId,
          description: operation.summary || operation.description,
          pathParams: [],
          queryParams: [],
          tags: operation.tags,
        };

        // Parse parameters
        if (operation.parameters) {
          for (const param of operation.parameters) {
            const parameter: ApiParameter = {
              name: param.name,
              type: this.schemaToTypeString(param.schema || { type: 'string' }),
              required: param.required,
              description: param.description,
            };

            if (param.in === 'path') {
              endpoint.pathParams?.push(parameter);
            } else if (param.in === 'query') {
              endpoint.queryParams?.push(parameter);
            }
          }
        }

        // Parse request body
        if (operation.requestBody) {
          const content = operation.requestBody.content;
          const jsonContent = content?.['application/json'];
          if (jsonContent?.schema) {
            endpoint.requestBody = jsonContent.schema;
          }
        }

        // Parse response
        if (operation.responses) {
          const successResponse = operation.responses['200'] || operation.responses['201'];
          if (successResponse) {
            const content = successResponse.content;
            const jsonContent = content?.['application/json'];
            if (jsonContent?.schema) {
              endpoint.response = jsonContent.schema;
            }
          }
        }

        endpoints.push(endpoint);
      }
    }

    return endpoints;
  }

  /**
   * Generate TypeScript types for endpoints
   */
  private generateTypes(endpoints: ApiEndpoint[]): string {
    const types: string[] = [];
    const typeNames = new Set<string>();

    endpoints.forEach(endpoint => {
      const baseName = this.getOperationName(endpoint);

      // Request type
      if (endpoint.requestBody) {
        const typeName = `${baseName}Request`;
        if (!typeNames.has(typeName)) {
          const typeDef = this.typeGenerator.fromJSONSchema(endpoint.requestBody, {
            name: typeName,
            export: true,
          });
          types.push(typeDef.code);
          typeNames.add(typeName);
        }
      }

      // Response type
      if (endpoint.response) {
        const typeName = `${baseName}Response`;
        if (!typeNames.has(typeName)) {
          const typeDef = this.typeGenerator.fromJSONSchema(endpoint.response, {
            name: typeName,
            export: true,
          });
          types.push(typeDef.code);
          typeNames.add(typeName);
        }
      }
    });

    return types.join('\n\n');
  }

  /**
   * Generate a method for an endpoint
   */
  private generateMethod(endpoint: ApiEndpoint, options: Required<ApiClientOptions>): string {
    const methodName = this.getOperationName(endpoint);
    const params = this.generateMethodParams(endpoint);
    const returnType = endpoint.response
      ? `${methodName}Response`
      : 'void';

    const url = this.generateUrlExpression(endpoint);
    const requestConfig = this.generateRequestConfig(endpoint, options);

    const description = endpoint.description
      ? `  /**\n   * ${endpoint.description}\n   */\n`
      : '';

    if (options.httpClient === 'fetch') {
      return `${description}  async ${methodName}(${params}): Promise<${returnType}> {
    const response = await this.fetch(${url}, ${requestConfig});
    ${endpoint.response ? 'return response.json();' : 'return;'}
  }`;
    } else {
      return `${description}  async ${methodName}(${params}): Promise<${returnType}> {
    const response = await this.axios.${endpoint.method.toLowerCase()}${returnType !== 'void' ? `<${returnType}>` : ''}(${url}${endpoint.requestBody ? ', data' : ''});
    return response.data;
  }`;
    }
  }

  /**
   * Generate method parameters
   */
  private generateMethodParams(endpoint: ApiEndpoint): string {
    const params: string[] = [];

    // Path parameters
    if (endpoint.pathParams && endpoint.pathParams.length > 0) {
      endpoint.pathParams.forEach(param => {
        const optional = param.required ? '' : '?';
        params.push(`${param.name}${optional}: ${param.type}`);
      });
    }

    // Query parameters
    if (endpoint.queryParams && endpoint.queryParams.length > 0) {
      const queryProps = endpoint.queryParams.map(param => {
        const optional = param.required ? '' : '?';
        return `${param.name}${optional}: ${param.type}`;
      }).join('; ');
      params.push(`query?: { ${queryProps} }`);
    }

    // Request body
    if (endpoint.requestBody) {
      const operationName = this.getOperationName(endpoint);
      params.push(`data: ${operationName}Request`);
    }

    return params.join(', ');
  }

  /**
   * Generate URL expression
   */
  private generateUrlExpression(endpoint: ApiEndpoint): string {
    let path = endpoint.path;

    // Replace path parameters with template literals
    if (endpoint.pathParams && endpoint.pathParams.length > 0) {
      endpoint.pathParams.forEach(param => {
        path = path.replace(`{${param.name}}`, `\${${param.name}}`);
      });
    }

    // Add query parameters
    if (endpoint.queryParams && endpoint.queryParams.length > 0) {
      return `\`${path}\${this.buildQuery(query)}\``;
    }

    return `\`${path}\``;
  }

  /**
   * Generate request config
   */
  private generateRequestConfig(endpoint: ApiEndpoint, options: Required<ApiClientOptions>): string {
    const config: string[] = [`method: '${endpoint.method}'`];

    if (endpoint.requestBody) {
      config.push('body: JSON.stringify(data)');
      config.push("headers: { 'Content-Type': 'application/json', ...this.headers }");
    } else {
      config.push('headers: this.headers');
    }

    return `{ ${config.join(', ')} }`;
  }

  /**
   * Generate client class
   */
  private generateClientClass(
    className: string,
    methods: string,
    options: Required<ApiClientOptions>
  ): string {
    const exportKeyword = options.exportType === 'named' ? 'export ' : '';
    const authProperty = options.auth ? '\n  private token?: string;' : '';

    const constructor = `  constructor(
    private baseUrl: string = '${options.baseUrl}',
    ${options.auth ? 'token?: string' : ''}
  ) {
    ${options.auth ? 'this.token = token;' : ''}
  }`;

    const helperMethods = options.httpClient === 'fetch'
      ? this.generateFetchHelpers(options)
      : this.generateAxiosHelpers(options);

    const defaultExport = options.exportType === 'default'
      ? `\n\nexport default ${className};`
      : '';

    return `${exportKeyword}class ${className} {${authProperty}

${constructor}

${helperMethods}

${methods}
}${defaultExport}`;
  }

  /**
   * Generate fetch helper methods
   */
  private generateFetchHelpers(options: Required<ApiClientOptions>): string {
    const authHeader = options.auth
      ? options.auth.type === 'bearer'
        ? "      'Authorization': `Bearer ${this.token}`,"
        : options.auth.type === 'api-key'
        ? `      '${options.auth.headerName || 'X-API-Key'}': this.token,`
        : "      'Authorization': `Basic ${btoa(this.token || '')}`,"
      : '';

    return `  private get headers(): Record<string, string> {
    return {
${authHeader}
    };
  }

  private async fetch(path: string, config: RequestInit): Promise<Response> {
    const url = \`\${this.baseUrl}\${path}\`;
    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }

    return response;
  }

  private buildQuery(params?: Record<string, any>): string {
    if (!params) return '';
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        query.append(key, String(value));
      }
    });
    const queryString = query.toString();
    return queryString ? \`?\${queryString}\` : '';
  }`;
  }

  /**
   * Generate axios helper methods
   */
  private generateAxiosHelpers(options: Required<ApiClientOptions>): string {
    return `  private axios = axios.create({
    baseURL: this.baseUrl,
    ${options.auth ? `headers: this.token ? { 'Authorization': \`Bearer \${this.token}\` } : {}` : ''}
  });`;
  }

  /**
   * Generate imports
   */
  private generateImports(options: Required<ApiClientOptions>): string {
    if (options.httpClient === 'axios') {
      return "import axios from 'axios';";
    }
    return '// Using native fetch API';
  }

  /**
   * Get operation name from endpoint
   */
  private getOperationName(endpoint: ApiEndpoint): string {
    if (endpoint.operationId) {
      return endpoint.operationId;
    }

    // Generate from method and path
    const method = endpoint.method.toLowerCase();
    const pathParts = endpoint.path.split('/').filter(p => p && !p.startsWith('{'));
    const resource = pathParts[pathParts.length - 1] || 'resource';

    return `${method}${resource.charAt(0).toUpperCase()}${resource.slice(1)}`;
  }

  /**
   * Convert schema to TypeScript type string
   */
  private schemaToTypeString(schema: JSONSchema): string {
    if (!schema.type) return 'unknown';

    switch (schema.type) {
      case 'string':
        return 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        return 'unknown[]';
      case 'object':
        return 'object';
      default:
        return 'unknown';
    }
  }

  /**
   * Get default options
   */
  private getDefaultOptions(options?: ApiClientOptions): Required<ApiClientOptions> {
    return {
      className: 'ApiClient',
      baseUrl: '',
      includeTypes: true,
      httpClient: 'fetch',
      errorHandling: true,
      auth: undefined as any,
      exportType: 'named',
      ...options,
    };
  }
}

/**
 * Quick function to generate API client from endpoints
 *
 * @param endpoints - API endpoints
 * @param className - Client class name
 * @returns Generated API client code
 *
 * @example
 * ```typescript
 * const code = generateApiClient([
 *   {
 *     method: 'GET',
 *     path: '/users',
 *     operationId: 'listUsers'
 *   }
 * ], 'UserApi');
 * ```
 */
export function generateApiClient(
  endpoints: ApiEndpoint[],
  className?: string
): string {
  const generator = new ApiClientGenerator();
  return generator.generate(endpoints, { className });
}

/**
 * Quick function to generate API client from OpenAPI spec
 *
 * @param spec - OpenAPI specification
 * @param className - Client class name
 * @returns Generated API client code
 *
 * @example
 * ```typescript
 * const code = fromOpenAPI(openApiSpec, 'MyApiClient');
 * ```
 */
export function fromOpenAPI(spec: OpenAPISpec, className?: string): string {
  const generator = new ApiClientGenerator();
  return generator.generateFromOpenAPI(spec, { className });
}
