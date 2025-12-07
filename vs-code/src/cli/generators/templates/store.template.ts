import type { GeneratorOptions, GeneratorTemplate } from '../index';

/**
 *
 * @param options
 */
export function storeTemplate(options: GeneratorOptions): GeneratorTemplate {
  const { name, path: basePath = 'src/store' } = options;
  const storePath = `${basePath}/${name}`;

  const files = [];

  // Main store file
  files.push({
    path: `${storePath}/${name}.store.ts`,
    content: generateStore(name),
  });

  // Types
  files.push({
    path: `${storePath}/${name}.types.ts`,
    content: generateTypes(name),
  });

  // Actions
  files.push({
    path: `${storePath}/${name}.actions.ts`,
    content: generateActions(name),
  });

  // Selectors
  files.push({
    path: `${storePath}/${name}.selectors.ts`,
    content: generateSelectors(name),
  });

  // Test file
  files.push({
    path: `${storePath}/${name}.store.test.ts`,
    content: generateTest(name),
  });

  // Index
  files.push({
    path: `${storePath}/index.ts`,
    content: generateIndex(name),
  });

  return {
    type: 'slice',
    files,
  };
}

/**
 *
 * @param name
 */
function generateStore(name: string): string {
  return `import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ${name}State, ${name}Store } from './${name}.types';
import { create${name}Actions } from './${name}.actions';

const initialState: ${name}State = {
  items: [],
  selectedItem: null,
  isLoading: false,
  error: null,
};

export const use${name}Store = create<${name}Store>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        ...create${name}Actions(set, get),
      }),
      {
        name: '${name.toLowerCase()}-storage',
        partialize: (state) => ({
          // Only persist these fields
          items: state.items,
          selectedItem: state.selectedItem,
        }),
      }
    ),
    {
      name: '${name}Store',
    }
  )
);
`;
}

/**
 *
 * @param name
 */
function generateTypes(name: string): string {
  return `export interface ${name}Item {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ${name}State {
  items: ${name}Item[];
  selectedItem: ${name}Item | null;
  isLoading: boolean;
  error: Error | null;
}

export interface ${name}Actions {
  // Fetch operations
  fetchItems: () => Promise<void>;
  fetchItemById: (id: string) => Promise<void>;

  // CRUD operations
  addItem: (item: Omit<${name}Item, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateItem: (id: string, updates: Partial<${name}Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;

  // Selection
  selectItem: (id: string | null) => void;

  // Utility
  clearError: () => void;
  reset: () => void;
}

export interface ${name}Store extends ${name}State, ${name}Actions {}
`;
}

/**
 *
 * @param name
 */
function generateActions(name: string): string {
  return `import { StateCreator } from 'zustand';
import { ${name}Actions, ${name}Item, ${name}State } from './${name}.types';

type SetState = (partial: Partial<${name}State> | ((state: ${name}State) => Partial<${name}State>)) => void;
type GetState = () => ${name}State;

export function create${name}Actions(set: SetState, get: GetState): ${name}Actions {
  return {
    fetchItems: async () => {
      set({ isLoading: true, error: null });

      try {
        // Replace with actual API call
        const items = await fetchItemsFromAPI();
        set({ items, isLoading: false });
      } catch (error) {
        set({ error: error as Error, isLoading: false });
      }
    },

    fetchItemById: async (id: string) => {
      set({ isLoading: true, error: null });

      try {
        // Replace with actual API call
        const item = await fetchItemByIdFromAPI(id);
        set({ selectedItem: item, isLoading: false });
      } catch (error) {
        set({ error: error as Error, isLoading: false });
      }
    },

    addItem: async (itemData) => {
      set({ isLoading: true, error: null });

      try {
        // Replace with actual API call
        const newItem = await createItemInAPI(itemData);
        set((state) => ({
          items: [...state.items, newItem],
          isLoading: false,
        }));
      } catch (error) {
        set({ error: error as Error, isLoading: false });
      }
    },

    updateItem: async (id: string, updates) => {
      set({ isLoading: true, error: null });

      try {
        // Replace with actual API call
        const updatedItem = await updateItemInAPI(id, updates);
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? updatedItem : item
          ),
          selectedItem: state.selectedItem?.id === id ? updatedItem : state.selectedItem,
          isLoading: false,
        }));
      } catch (error) {
        set({ error: error as Error, isLoading: false });
      }
    },

    deleteItem: async (id: string) => {
      set({ isLoading: true, error: null });

      try {
        // Replace with actual API call
        await deleteItemFromAPI(id);
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          selectedItem: state.selectedItem?.id === id ? null : state.selectedItem,
          isLoading: false,
        }));
      } catch (error) {
        set({ error: error as Error, isLoading: false });
      }
    },

    selectItem: (id: string | null) => {
      if (id === null) {
        set({ selectedItem: null });
        return;
      }

      const item = get().items.find((item) => item.id === id);
      set({ selectedItem: item || null });
    },

    clearError: () => {
      set({ error: null });
    },

    reset: () => {
      set({
        items: [],
        selectedItem: null,
        isLoading: false,
        error: null,
      });
    },
  };
}

// Mock API functions - replace with actual implementation
async function fetchItemsFromAPI(): Promise<${name}Item[]> {
  return [];
}

async function fetchItemByIdFromAPI(id: string): Promise<${name}Item> {
  throw new Error('Not implemented');
}

async function createItemInAPI(data: Omit<${name}Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<${name}Item> {
  throw new Error('Not implemented');
}

async function updateItemInAPI(id: string, updates: Partial<${name}Item>): Promise<${name}Item> {
  throw new Error('Not implemented');
}

async function deleteItemFromAPI(id: string): Promise<void> {
  throw new Error('Not implemented');
}
`;
}

/**
 *
 * @param name
 */
function generateSelectors(name: string): string {
  return `import { ${name}Store } from './${name}.types';

// Selector functions for derived state
export const ${name}Selectors = {
  // Get all items
  getItems: (state: ${name}Store) => state.items,

  // Get selected item
  getSelectedItem: (state: ${name}Store) => state.selectedItem,

  // Get item by ID
  getItemById: (state: ${name}Store, id: string) =>
    state.items.find((item) => item.id === id),

  // Get loading state
  isLoading: (state: ${name}Store) => state.isLoading,

  // Get error
  getError: (state: ${name}Store) => state.error,

  // Get total count
  getTotalCount: (state: ${name}Store) => state.items.length,

  // Check if items are loaded
  hasItems: (state: ${name}Store) => state.items.length > 0,
};
`;
}

/**
 *
 * @param name
 */
function generateTest(name: string): string {
  return `import { renderHook, act, waitFor } from '@testing-library/react';
import { use${name}Store } from './${name}.store';

describe('${name}Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => use${name}Store());
    act(() => {
      result.current.reset();
    });
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => use${name}Store());

    expect(result.current.items).toEqual([]);
    expect(result.current.selectedItem).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should select an item', () => {
    const { result } = renderHook(() => use${name}Store());

    // Add test item first
    const testItem = {
      id: '1',
      name: 'Test Item',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    act(() => {
      result.current.selectItem(testItem.id);
    });

    expect(result.current.selectedItem?.id).toBe(testItem.id);
  });

  it('should clear error', () => {
    const { result } = renderHook(() => use${name}Store());

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });

  it('should reset to initial state', () => {
    const { result } = renderHook(() => use${name}Store());

    act(() => {
      result.current.reset();
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.selectedItem).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });
});
`;
}

/**
 *
 * @param name
 */
function generateIndex(name: string): string {
  return `export { use${name}Store } from './${name}.store';
export { ${name}Selectors } from './${name}.selectors';
export type { ${name}Item, ${name}State, ${name}Actions, ${name}Store } from './${name}.types';
`;
}
