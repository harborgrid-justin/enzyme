import type { GeneratorOptions, GeneratorTemplate } from '../index';

/**
 * Generate API template files
 * @param options - Generator configuration options
 * @returns {GeneratorTemplate} The generated API template structure
 */
export function apiTemplate(options: GeneratorOptions): GeneratorTemplate {
  const { name, path: basePath = 'src/api' } = options;
  const apiPath = `${basePath}/${name}`;

  const files = [];

  // API client
  files.push({
    path: `${apiPath}/${name}.api.ts`,
    content: generateAPI(name),
  });

  // Types
  files.push({
    path: `${apiPath}/${name}.types.ts`,
    content: generateTypes(name),
  });

  // Endpoints
  files.push({
    path: `${apiPath}/${name}.endpoints.ts`,
    content: generateEndpoints(name),
  });

  // Mock data
  files.push({
    path: `${apiPath}/${name}.mock.ts`,
    content: generateMock(name),
  });

  // Test file
  files.push({
    path: `${apiPath}/${name}.api.test.ts`,
    content: generateTest(name),
  });

  // Index
  files.push({
    path: `${apiPath}/index.ts`,
    content: generateIndex(name),
  });

  return {
    type: 'api',
    files,
  };
}

/**
 * Generate API client class
 * @param name - The name of the API
 * @returns {string} The generated API client code
 */
function generateAPI(name: string): string {
  return `import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ${name}Endpoints } from './${name}.endpoints';
import {
  ${name}ListParams,
  ${name}ListResponse,
  ${name}GetParams,
  ${name}GetResponse,
  ${name}CreateParams,
  ${name}CreateResponse,
  ${name}UpdateParams,
  ${name}UpdateResponse,
  ${name}DeleteParams,
  ${name}DeleteResponse,
} from './${name}.types';

export class ${name}API {
  private client: AxiosInstance;
  private endpoints: ${name}Endpoints;

  constructor(config?: AxiosRequestConfig) {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
      ...config,
    });

    this.endpoints = new ${name}Endpoints();
    this.setupInterceptors();
  }

  /**
   * List all items
   */
  async list(params?: ${name}ListParams): Promise<${name}ListResponse> {
    const response = await this.client.get(
      this.endpoints.list(),
      { params }
    );
    return response.data;
  }

  /**
   * Get single item by ID
   */
  async get(params: ${name}GetParams): Promise<${name}GetResponse> {
    const response = await this.client.get(
      this.endpoints.get(params.id)
    );
    return response.data;
  }

  /**
   * Create new item
   */
  async create(params: ${name}CreateParams): Promise<${name}CreateResponse> {
    const response = await this.client.post(
      this.endpoints.create(),
      params.data
    );
    return response.data;
  }

  /**
   * Update existing item
   */
  async update(params: ${name}UpdateParams): Promise<${name}UpdateResponse> {
    const response = await this.client.put(
      this.endpoints.update(params.id),
      params.data
    );
    return response.data;
  }

  /**
   * Delete item
   */
  async delete(params: ${name}DeleteParams): Promise<${name}DeleteResponse> {
    const response = await this.client.delete(
      this.endpoints.delete(params.id)
    );
    return response.data;
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = \`Bearer \${token}\`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Handle common errors
        if (error.response?.status === 401) {
          // Handle unauthorized
          console.error('Unauthorized access');
        }
        return Promise.reject(error);
      }
    );
  }
}

// Export singleton instance
export const ${name.toLowerCase()}API = new ${name}API();
`;
}

/**
 * Generate TypeScript types for API
 * @param name - The name of the API
 * @returns {string} The generated TypeScript types code
 */
function generateTypes(name: string): string {
  return `// Entity types
export interface ${name}Entity {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// List
export interface ${name}ListParams {
  page?: number;
  limit?: number;
  sort?: string;
  filter?: Record<string, any>;
}

export interface ${name}ListResponse {
  data: ${name}Entity[];
  total: number;
  page: number;
  limit: number;
}

// Get
export interface ${name}GetParams {
  id: string;
}

export interface ${name}GetResponse {
  data: ${name}Entity;
}

// Create
export interface ${name}CreateParams {
  data: Omit<${name}Entity, 'id' | 'createdAt' | 'updatedAt'>;
}

export interface ${name}CreateResponse {
  data: ${name}Entity;
}

// Update
export interface ${name}UpdateParams {
  id: string;
  data: Partial<Omit<${name}Entity, 'id' | 'createdAt' | 'updatedAt'>>;
}

export interface ${name}UpdateResponse {
  data: ${name}Entity;
}

// Delete
export interface ${name}DeleteParams {
  id: string;
}

export interface ${name}DeleteResponse {
  success: boolean;
}

// Error response
export interface ${name}ErrorResponse {
  error: {
    message: string;
    code: string;
    details?: any;
  };
}
`;
}

/**
 * Generate API endpoints class
 * @param name - The name of the API
 * @returns {string} The generated endpoints code
 */
function generateEndpoints(name: string): string {
  return `export class ${name}Endpoints {
  private readonly basePath = '/${name.toLowerCase()}';

  list(): string {
    return this.basePath;
  }

  get(id: string): string {
    return \`\${this.basePath}/\${id}\`;
  }

  create(): string {
    return this.basePath;
  }

  update(id: string): string {
    return \`\${this.basePath}/\${id}\`;
  }

  delete(id: string): string {
    return \`\${this.basePath}/\${id}\`;
  }

  // Custom endpoints
  search(): string {
    return \`\${this.basePath}/search\`;
  }

  bulk(): string {
    return \`\${this.basePath}/bulk\`;
  }
}
`;
}

/**
 * Generate mock data for testing
 * @param name - The name of the API
 * @returns {string} The generated mock data code
 */
function generateMock(name: string): string {
  return `import { ${name}Entity, ${name}ListResponse, ${name}GetResponse } from './${name}.types';

export const mock${name}Entity: ${name}Entity = {
  id: '1',
  name: 'Sample ${name}',
  description: 'This is a sample ${name} entity',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const mock${name}List: ${name}Entity[] = [
  mock${name}Entity,
  {
    id: '2',
    name: 'Another ${name}',
    description: 'This is another ${name} entity',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const mock${name}ListResponse: ${name}ListResponse = {
  data: mock${name}List,
  total: mock${name}List.length,
  page: 1,
  limit: 10,
};

export const mock${name}GetResponse: ${name}GetResponse = {
  data: mock${name}Entity,
};

// Mock API handlers for testing
export const ${name}MockHandlers = {
  list: () => Promise.resolve(mock${name}ListResponse),
  get: (id: string) => Promise.resolve(mock${name}GetResponse),
  create: (data: any) => Promise.resolve({ data: { ...mock${name}Entity, ...data } }),
  update: (id: string, data: any) => Promise.resolve({ data: { ...mock${name}Entity, id, ...data } }),
  delete: (id: string) => Promise.resolve({ success: true }),
};
`;
}

/**
 * Generate test file
 * @param name - The name of the API
 * @returns {string} The generated test code
 */
function generateTest(name: string): string {
  return `import { ${name}API } from './${name}.api';
import { mock${name}Entity, mock${name}List } from './${name}.mock';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('${name}API', () => {
  let api: ${name}API;

  beforeEach(() => {
    api = new ${name}API();
    mockedAxios.create.mockReturnThis();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should fetch list of items', async () => {
      const mockResponse = {
        data: {
          data: mock${name}List,
          total: mock${name}List.length,
          page: 1,
          limit: 10,
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await api.list();

      expect(result.data).toEqual(mock${name}List);
      expect(result.total).toBe(mock${name}List.length);
    });
  });

  describe('get', () => {
    it('should fetch single item by ID', async () => {
      const mockResponse = {
        data: { data: mock${name}Entity },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await api.get({ id: '1' });

      expect(result.data).toEqual(mock${name}Entity);
    });
  });

  describe('create', () => {
    it('should create new item', async () => {
      const newItem = {
        name: 'New ${name}',
        description: 'New description',
      };

      const mockResponse = {
        data: { data: { ...mock${name}Entity, ...newItem } },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await api.create({ data: newItem });

      expect(result.data.name).toBe(newItem.name);
    });
  });

  describe('update', () => {
    it('should update existing item', async () => {
      const updates = {
        name: 'Updated ${name}',
      };

      const mockResponse = {
        data: { data: { ...mock${name}Entity, ...updates } },
      };

      mockedAxios.put.mockResolvedValue(mockResponse);

      const result = await api.update({ id: '1', data: updates });

      expect(result.data.name).toBe(updates.name);
    });
  });

  describe('delete', () => {
    it('should delete item', async () => {
      const mockResponse = {
        data: { success: true },
      };

      mockedAxios.delete.mockResolvedValue(mockResponse);

      const result = await api.delete({ id: '1' });

      expect(result.success).toBe(true);
    });
  });
});
`;
}

/**
 * Generate index barrel export
 * @param name - The name of the API
 * @returns {string} The generated index code
 */
function generateIndex(name: string): string {
  return `export { ${name}API, ${name.toLowerCase()}API } from './${name}.api';
export { ${name}Endpoints } from './${name}.endpoints';
export * from './${name}.types';
export * from './${name}.mock';
`;
}
