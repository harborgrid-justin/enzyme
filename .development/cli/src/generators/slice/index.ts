/**
 * @file Slice Generator
 * @description Generates Zustand store slices following enzyme patterns
 */

import * as path from 'path';
import { BaseGenerator, type GeneratorOptions, type GeneratedFile } from '../base';
import type { SliceOptions } from '../types';
import {
  resolveSlicePath,
  toPascalCase,
  toCamelCase,
  validateIdentifier,
} from '../utils';

// ============================================================================
// Slice Generator
// ============================================================================

export interface SliceGeneratorOptions extends GeneratorOptions, SliceOptions {}

export class SliceGenerator extends BaseGenerator<SliceGeneratorOptions> {
  protected getName(): string {
    return 'Slice';
  }

  protected validate(): void {
    validateIdentifier(this.options.name, 'Slice name');
  }

  protected async generate(): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    const sliceName = toCamelCase(this.options.name) + 'Slice';
    const slicePath = resolveSlicePath(this.options.name);

    // Generate slice file
    const sliceContent = this.generateSliceFile();
    files.push({
      path: path.join(slicePath, `${sliceName}.ts`),
      content: sliceContent,
    });

    // Generate index file
    const indexContent = this.generateIndexFile();
    files.push({
      path: path.join(slicePath, 'index.ts'),
      content: indexContent,
    });

    // Generate selectors if requested
    if (this.options.withSelectors) {
      const selectorsContent = this.generateSelectorsFile();
      files.push({
        path: path.join(slicePath, 'selectors.ts'),
        content: selectorsContent,
      });
    }

    return files;
  }

  // ==========================================================================
  // File Generation Methods
  // ==========================================================================

  private generateSliceFile(): string {
    const typeName = toPascalCase(this.options.name);
    const sliceName = toCamelCase(this.options.name);
    const withCrud = this.options.withCrud ?? false;
    const withPersistence = this.options.withPersistence ?? false;

    let template = `/**
 * @file ${typeName} Slice
 * @description Zustand slice for ${typeName} state management
 */

import { createSlice } from '@missionfabric-js/enzyme/state';`;

    if (withPersistence) {
      template += `\nimport { persist } from 'zustand/middleware';`;
    }

    template += `

// ============================================================================
// Types
// ============================================================================

`;

    if (withCrud) {
      template += `/**
 * ${typeName} item
 */
export interface ${typeName}Item {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
}

`;
    }

    template += `/**
 * ${typeName} state interface
 */
export interface ${typeName}State {`;

    if (withCrud) {
      template += `
  items: ${typeName}Item[];
  selectedItem: ${typeName}Item | null;
  isLoading: boolean;
  error: string | null;`;
    } else {
      template += `
  value: string;
  count: number;`;
    }

    template += `
}

/**
 * ${typeName} actions interface
 */
export interface ${typeName}Actions {`;

    if (withCrud) {
      template += `
  // CRUD operations
  setItems: (items: ${typeName}Item[]) => void;
  addItem: (item: ${typeName}Item) => void;
  updateItem: (id: string, updates: Partial<${typeName}Item>) => void;
  removeItem: (id: string) => void;
  selectItem: (item: ${typeName}Item | null) => void;

  // Loading state
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Reset
  reset: () => void;`;
    } else {
      template += `
  setValue: (value: string) => void;
  increment: () => void;
  decrement: () => void;
  reset: () => void;`;
    }

    template += `
}

// ============================================================================
// Initial State
// ============================================================================

const initial${typeName}State: ${typeName}State = {`;

    if (withCrud) {
      template += `
  items: [],
  selectedItem: null,
  isLoading: false,
  error: null,`;
    } else {
      template += `
  value: '',
  count: 0,`;
    }

    template += `
};

// ============================================================================
// Slice Definition
// ============================================================================

/**
 * ${typeName} slice using createSlice factory
 * All actions are automatically prefixed with "${sliceName}/" in DevTools
 */
export const ${sliceName}Slice = createSlice<${typeName}State, ${typeName}Actions & Record<string, (...args: never[]) => unknown>>({
  name: '${sliceName}',
  initialState: initial${typeName}State,
  actions: (set, get) => ({`;

    if (withCrud) {
      template += `
    // ========================================================================
    // CRUD Actions
    // ========================================================================

    setItems: (items) => {
      set((state) => {
        state.items = items;
      }, 'setItems');
    },

    addItem: (item) => {
      set((state) => {
        state.items.push(item);
      }, 'addItem');
    },

    updateItem: (id, updates) => {
      set((state) => {
        const index = state.items.findIndex((item) => item.id === id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...updates, updatedAt: new Date().toISOString() };
        }
        // Update selected item if it matches
        if (state.selectedItem?.id === id) {
          state.selectedItem = { ...state.selectedItem, ...updates };
        }
      }, 'updateItem');
    },

    removeItem: (id) => {
      set((state) => {
        state.items = state.items.filter((item) => item.id !== id);
        // Clear selection if removed
        if (state.selectedItem?.id === id) {
          state.selectedItem = null;
        }
      }, 'removeItem');
    },

    selectItem: (item) => {
      set((state) => {
        state.selectedItem = item;
      }, 'selectItem');
    },

    // ========================================================================
    // Loading State Actions
    // ========================================================================

    setLoading: (loading) => {
      set((state) => {
        state.isLoading = loading;
        if (loading) {
          state.error = null;
        }
      }, 'setLoading');
    },

    setError: (error) => {
      set((state) => {
        state.error = error;
        state.isLoading = false;
      }, 'setError');
    },

    // ========================================================================
    // Reset
    // ========================================================================

    reset: () => {
      set(initial${typeName}State, 'reset');
    },`;
    } else {
      template += `
    // ========================================================================
    // Basic Actions
    // ========================================================================

    setValue: (value) => {
      set((state) => {
        state.value = value;
      }, 'setValue');
    },

    increment: () => {
      set((state) => {
        state.count += 1;
      }, 'increment');
    },

    decrement: () => {
      set((state) => {
        state.count -= 1;
      }, 'decrement');
    },

    reset: () => {
      set(initial${typeName}State, 'reset');
    },`;
    }

    template += `
  }),
});

// ============================================================================
// Exported Type
// ============================================================================

export type ${typeName}Slice = ${typeName}State & ${typeName}Actions;
`;

    return template;
  }

  private generateIndexFile(): string {
    const typeName = toPascalCase(this.options.name);
    const sliceName = toCamelCase(this.options.name) + 'Slice';

    let template = `/**
 * ${typeName} slice exports
 */

export { ${sliceName} } from './${sliceName}';
export type { ${typeName}State, ${typeName}Actions, ${typeName}Slice } from './${sliceName}';`;

    if (this.options.withCrud) {
      template += `\nexport type { ${typeName}Item } from './${sliceName}';`;
    }

    if (this.options.withSelectors) {
      template += `\nexport * from './selectors';`;
    }

    template += `\n`;

    return template;
  }

  private generateSelectorsFile(): string {
    const typeName = toPascalCase(this.options.name);
    const sliceName = toCamelCase(this.options.name);
    const withCrud = this.options.withCrud ?? false;

    let template = `/**
 * @file ${typeName} Selectors
 * @description Memoized selectors for ${typeName} slice
 */

import type { ${typeName}State } from './${sliceName}Slice';`;

    if (withCrud) {
      template += `\nimport type { ${typeName}Item } from './${sliceName}Slice';`;
    }

    template += `

// ============================================================================
// Selectors
// ============================================================================

`;

    if (withCrud) {
      template += `/**
 * Get all items
 */
export const selectAllItems = (state: ${typeName}State): ${typeName}Item[] => state.items;

/**
 * Get selected item
 */
export const selectSelectedItem = (state: ${typeName}State): ${typeName}Item | null => state.selectedItem;

/**
 * Get item by ID
 */
export const selectItemById = (id: string) => (state: ${typeName}State): ${typeName}Item | undefined => {
  return state.items.find((item) => item.id === id);
};

/**
 * Get items count
 */
export const selectItemsCount = (state: ${typeName}State): number => state.items.length;

/**
 * Get loading state
 */
export const selectIsLoading = (state: ${typeName}State): boolean => state.isLoading;

/**
 * Get error state
 */
export const selectError = (state: ${typeName}State): string | null => state.error;

/**
 * Get items sorted by name
 */
export const selectItemsSortedByName = (state: ${typeName}State): ${typeName}Item[] => {
  return [...state.items].sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Get items sorted by date
 */
export const selectItemsSortedByDate = (state: ${typeName}State): ${typeName}Item[] => {
  return [...state.items].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

/**
 * Search items by name
 */
export const selectItemsBySearch = (search: string) => (state: ${typeName}State): ${typeName}Item[] => {
  if (!search) return state.items;

  const lowerSearch = search.toLowerCase();
  return state.items.filter((item) =>
    item.name.toLowerCase().includes(lowerSearch)
  );
};`;
    } else {
      template += `/**
 * Get value
 */
export const selectValue = (state: ${typeName}State): string => state.value;

/**
 * Get count
 */
export const selectCount = (state: ${typeName}State): number => state.count;

/**
 * Get whether value is empty
 */
export const selectIsEmpty = (state: ${typeName}State): boolean => state.value === '';

/**
 * Get whether count is positive
 */
export const selectIsPositive = (state: ${typeName}State): boolean => state.count > 0;`;
    }

    template += `\n`;

    return template;
  }

  protected async afterGenerate(result: import('../base').GeneratorResult): Promise<void> {
    await super.afterGenerate(result);

    const sliceName = toCamelCase(this.options.name) + 'Slice';
    this.log(`\n✓ Generated ${sliceName} successfully!`, 'success');
    this.log(`\nFiles created:`, 'info');
    result.files.forEach(file => {
      this.log(`  ${this.formatPath(file)}`);
    });

    this.log(`\nNext steps:`, 'info');
    this.log(`  1. Add the slice to your store configuration`);
    this.log(`  2. Import and use the slice in your components`);
    if (this.options.withCrud) {
      this.log(`  3. CRUD operations are ready to use`);
    }
    if (this.options.withSelectors) {
      this.log(`  4. Use the provided selectors for optimized reads`);
    }
    this.log(`\nExample usage:`);
    this.log(`  import { ${sliceName} } from './state/slices/${sliceName}';`);
    this.log(`  import { create } from 'zustand';`);
    this.log(`  `);
    this.log(`  const useStore = create(${sliceName});`);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create and run slice generator
 */
export async function generateSlice(options: SliceGeneratorOptions): Promise<void> {
  const generator = new SliceGenerator(options);
  await generator.run();
}
