import { GeneratorOptions, GeneratorTemplate } from '../index';

export function featureTemplate(options: GeneratorOptions): GeneratorTemplate {
  const { name, path: basePath = 'src/features' } = options;
  const featurePath = `${basePath}/${name}`;

  const files = [];

  // Feature index
  files.push({
    path: `${featurePath}/index.ts`,
    content: generateIndex(name),
  });

  // Feature registration
  files.push({
    path: `${featurePath}/${name}.feature.ts`,
    content: generateFeature(name),
  });

  // Routes
  files.push({
    path: `${featurePath}/routes.tsx`,
    content: generateRoutes(name),
  });

  // Store/State
  files.push({
    path: `${featurePath}/store/${name}.store.ts`,
    content: generateStore(name),
  });

  // API client
  files.push({
    path: `${featurePath}/api/${name}.api.ts`,
    content: generateAPI(name),
  });

  // Types
  files.push({
    path: `${featurePath}/types/index.ts`,
    content: generateTypes(name),
  });

  // Components directory with example component
  files.push({
    path: `${featurePath}/components/${name}Dashboard.tsx`,
    content: generateDashboard(name),
  });

  // Hooks directory with example hook
  files.push({
    path: `${featurePath}/hooks/use${name}.ts`,
    content: generateHook(name),
  });

  return {
    type: 'feature',
    files,
  };
}

function generateIndex(name: string): string {
  return `// Feature: ${name}
export { ${name}Feature } from './${name}.feature';
export { ${name}Routes } from './routes';
export { use${name}Store } from './store/${name}.store';
export { ${name}API } from './api/${name}.api';
export * from './types';
`;
}

function generateFeature(name: string): string {
  return `import { Feature } from '@enzyme/core';
import { ${name}Routes } from './routes';
import { ${name}API } from './api/${name}.api';

export const ${name}Feature: Feature = {
  name: '${name}',
  version: '1.0.0',

  async initialize() {
    console.log('Initializing ${name} feature');

    // Initialize API
    await ${name}API.initialize();

    // Add any initialization logic here
  },

  async cleanup() {
    console.log('Cleaning up ${name} feature');
    // Add cleanup logic here
  },

  routes: ${name}Routes,

  permissions: [
    '${name}:read',
    '${name}:write',
    '${name}:delete',
  ],
};
`;
}

function generateRoutes(name: string): string {
  return `import React from 'react';
import { RouteObject } from 'react-router-dom';
import { ${name}Dashboard } from './components/${name}Dashboard';

export const ${name}Routes: RouteObject[] = [
  {
    path: '/${name.toLowerCase()}',
    element: <${name}Dashboard />,
    children: [
      {
        index: true,
        element: <div>Overview</div>,
      },
      {
        path: 'settings',
        element: <div>Settings</div>,
      },
    ],
  },
];
`;
}

function generateStore(name: string): string {
  return `import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ${name}State, ${name}Actions } from '../types';

interface ${name}Store extends ${name}State, ${name}Actions {}

export const use${name}Store = create<${name}Store>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        items: [],
        isLoading: false,
        error: null,

        // Actions
        fetchItems: async () => {
          set({ isLoading: true, error: null });

          try {
            // Fetch items
            const items = await fetch${name}Items();
            set({ items, isLoading: false });
          } catch (error) {
            set({ error: error as Error, isLoading: false });
          }
        },

        addItem: (item) => {
          set((state) => ({
            items: [...state.items, item],
          }));
        },

        removeItem: (id) => {
          set((state) => ({
            items: state.items.filter((item) => item.id !== id),
          }));
        },

        clearError: () => {
          set({ error: null });
        },
      }),
      {
        name: '${name.toLowerCase()}-storage',
      }
    )
  )
);

// Helper functions
async function fetch${name}Items(): Promise<any[]> {
  // Implement fetching logic
  return [];
}
`;
}

function generateAPI(name: string): string {
  return `import { APIClient } from '@enzyme/core';

class ${name}APIClient {
  private client: APIClient;

  constructor() {
    this.client = new APIClient({
      baseURL: process.env.REACT_APP_API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async initialize() {
    // Initialize API client
  }

  async getAll() {
    return this.client.get('/${name.toLowerCase()}');
  }

  async getById(id: string) {
    return this.client.get(\`/${name.toLowerCase()}/\${id}\`);
  }

  async create(data: any) {
    return this.client.post('/${name.toLowerCase()}', data);
  }

  async update(id: string, data: any) {
    return this.client.put(\`/${name.toLowerCase()}/\${id}\`, data);
  }

  async delete(id: string) {
    return this.client.delete(\`/${name.toLowerCase()}/\${id}\`);
  }
}

export const ${name}API = new ${name}APIClient();
`;
}

function generateTypes(name: string): string {
  return `export interface ${name}Item {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ${name}State {
  items: ${name}Item[];
  isLoading: boolean;
  error: Error | null;
}

export interface ${name}Actions {
  fetchItems: () => Promise<void>;
  addItem: (item: ${name}Item) => void;
  removeItem: (id: string) => void;
  clearError: () => void;
}
`;
}

function generateDashboard(name: string): string {
  return `import React from 'react';
import { Outlet } from 'react-router-dom';
import { use${name}Store } from '../store/${name}.store';

export const ${name}Dashboard: React.FC = () => {
  const { items, isLoading, error, fetchItems } = use${name}Store();

  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="${name.toLowerCase()}-dashboard">
      <h1>${name} Dashboard</h1>
      <div className="content">
        <Outlet />
      </div>
    </div>
  );
};
`;
}

function generateHook(name: string): string {
  return `import { use${name}Store } from '../store/${name}.store';

export function use${name}() {
  const store = use${name}Store();

  return {
    ...store,
    // Add derived state or memoized selectors here
  };
}
`;
}
