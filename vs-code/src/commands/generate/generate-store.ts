import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { BaseCommand } from '../base-command';
import type { CommandContext, CommandMetadata } from '../base-command';

/**
 * Store options interface
 */
interface StoreOptions {
  name: string;
  stateShape: StateField[];
  withPersistence: boolean;
  withDevTools: boolean;
  devToolsName: string;
}

/**
 *
 */
interface StateField {
  name: string;
  type: string;
  defaultValue: string;
}

/**
 * Generate Store Command
 * Creates a new Zustand store/slice with state and actions
 * Keybinding: Ctrl+Shift+G S
 */
export class GenerateStoreCommand extends BaseCommand {
  /**
   * Get command metadata for registration
   * @returns Command metadata object
   */
  getMetadata(): CommandMetadata {
    return {
      id: 'enzyme.generate.store',
      title: 'Enzyme: Generate Store/Slice',
      category: 'Enzyme Generate',
      icon: '$(database)',
      keybinding: {
        key: 'ctrl+shift+g s',
        mac: 'cmd+shift+g s',
        when: 'editorTextFocus',
      },
    };
  }

  /**
   * Execute the command
   * @param _context - Command execution context
   * @returns Promise that resolves when command completes
   */
  protected async executeCommand(_context: CommandContext): Promise<void> {
    const workspaceFolder = await this.ensureWorkspaceFolder();

    // Gather store options
    const options = await this.gatherStoreOptions();
    if (!options) {
      return; // User cancelled
    }

    // Generate the store
    await this.withProgress(
      `Generating ${options.name} store...`,
      async (progress, token) => {
        progress.report({ message: 'Creating store files...' });

        const storePath = await this.generateStore(
          workspaceFolder,
          options,
          token
        );

        progress.report({ message: 'Opening files...', increment: 80 });

        // Open the generated store file
        const storeFile = vscode.Uri.file(storePath);
        await this.openFile(storeFile);

        progress.report({ message: 'Done!', increment: 100 });
      }
    );

    await this.showInfo(`Store "${options.name}" created successfully!`);
  }

  /**
   *
   */
  /**
   * Gather store generation options from user
   * @returns Promise resolving to store options or undefined if cancelled
   */
  private async gatherStoreOptions(): Promise<StoreOptions | undefined> {
    // Get store name
    const name = await this.showInputBox({
      prompt: 'Enter store/slice name (camelCase)',
      placeHolder: 'userSettings',
      validateInput: (value) => {
        if (!value) {
          return 'Store name is required';
        }
        if (!/^[a-z][\dA-Za-z]*$/.test(value)) {
          return 'Store name must be in camelCase (e.g., userSettings)';
        }
        return undefined;
      },
    });

    if (!name) {
      return undefined;
    }

    // Gather state fields
    const stateShape = await this.gatherStateFields();
    if (!stateShape || stateShape.length === 0) {
      return undefined;
    }

    // Persistence option
    const persistenceOptions = [
      { label: 'Yes - Persist to localStorage', value: true },
      { label: 'No - In-memory only', value: false },
    ];

    const persistenceSelection = await this.showQuickPick(persistenceOptions, {
      title: 'Enable State Persistence?',
      placeHolder: 'Should state be persisted to localStorage?',
    });

    if (!persistenceSelection) {
      return undefined;
    }

    const withPersistence = persistenceSelection.value;

    // DevTools option
    const developmentToolsOptions = [
      { label: 'Yes - Enable Redux DevTools', value: true },
      { label: 'No - Disable DevTools', value: false },
    ];

    const developmentToolsSelection = await this.showQuickPick(developmentToolsOptions, {
      title: 'Enable Redux DevTools Integration?',
      placeHolder: 'Should this store integrate with Redux DevTools?',
    });

    if (!developmentToolsSelection) {
      return undefined;
    }

    const withDevelopmentTools = developmentToolsSelection.value;

    // DevTools name
    let developmentToolsName = name;
    if (withDevelopmentTools) {
      const customName = await this.showInputBox({
        prompt: 'Enter DevTools name (optional)',
        placeHolder: `${name} Store`,
        value: `${name} Store`,
      });
      developmentToolsName = customName || `${name} Store`;
    }

    return {
      name,
      stateShape,
      withPersistence,
      withDevTools: withDevelopmentTools,
      devToolsName: developmentToolsName,
    };
  }

  /**
   *
   */
  private async gatherStateFields(): Promise<StateField[]> {
    const fields: StateField[] = [];
    let continueAdding = true;

    while (continueAdding) {
      const fieldName = await this.showInputBox({
        prompt: `Enter state field name (or leave empty to finish)`,
        placeHolder: 'isOpen',
      });

      if (!fieldName) {
        continueAdding = false;
        break;
      }

      const fieldType = await this.showInputBox({
        prompt: `Enter type for "${fieldName}"`,
        placeHolder: 'boolean',
        value: 'string',
      });

      if (!fieldType) {
        continueAdding = false;
        break;
      }

      const defaultValue = await this.showInputBox({
        prompt: `Enter default value for "${fieldName}"`,
        placeHolder: fieldType === 'boolean' ? 'false' : fieldType === 'number' ? '0' : "''",
        value: fieldType === 'boolean' ? 'false' : fieldType === 'number' ? '0' : "''",
      });

      if (defaultValue === undefined) {
        continueAdding = false;
        break;
      }

      fields.push({
        name: fieldName,
        type: fieldType,
        defaultValue: defaultValue || (fieldType === 'boolean' ? 'false' : fieldType === 'number' ? '0' : "''"),
      });

      const addMore = await this.showQuickPick(
        [
          { label: 'Yes', value: true },
          { label: 'No', value: false },
        ],
        {
          title: 'Add Another Field?',
          placeHolder: `Added ${fields.length} field(s). Add another?`,
        }
      );

      continueAdding = addMore?.value ?? false;
    }

    return fields;
  }

  /**
   *
   * @param workspaceFolder
   * @param options
   * @param token
   */
  private async generateStore(
    workspaceFolder: vscode.WorkspaceFolder,
    options: StoreOptions,
    token: vscode.CancellationToken
  ): Promise<string> {
    const sourcePath = path.join(workspaceFolder.uri.fsPath, 'src');
    const storePath = path.join(sourcePath, 'store', 'slices');

    // Create directory
    await fs.mkdir(storePath, { recursive: true });

    if (token.isCancellationRequested) {
      throw new Error('Operation cancelled');
    }

    // Generate store file
    const storeFilePath = path.join(storePath, `${options.name}.ts`);
    const storeContent = this.generateStoreContent(options);
    await fs.writeFile(storeFilePath, storeContent);

    // Update main store index
    await this.updateStoreIndex(sourcePath, options.name);

    return storeFilePath;
  }

  /**
   *
   * @param options
   */
  private generateStoreContent(options: StoreOptions): string {
    const { name, stateShape, withPersistence, withDevTools, devToolsName } =
      options;

    const pascalName = name.charAt(0).toUpperCase() + name.slice(1);

    // Generate imports
    const middlewareImports: string[] = [];
    if (withDevTools) {middlewareImports.push('devtools');}
    if (withPersistence) {middlewareImports.push('persist');}

    const imports = `import { create } from 'zustand';${middlewareImports.length > 0 ? `\nimport { ${middlewareImports.join(', ')} } from 'zustand/middleware';` : ''}`;

    // Generate state interface
    const stateInterface = `interface ${pascalName}State {
  ${stateShape.map((field) => `${field.name}: ${field.type};`).join('\n  ')}
}`;

    // Generate actions interface
    const actionsInterface = `interface ${pascalName}Actions {
  ${stateShape.map((field) => `set${field.name.charAt(0).toUpperCase() + field.name.slice(1)}: (${field.name}: ${field.type}) => void;`).join('\n  ')}
  reset: () => void;
}`;

    // Generate store type
    const storeType = `type ${pascalName}Store = ${pascalName}State & ${pascalName}Actions;`;

    // Generate initial state
    const initialState = `const initialState: ${pascalName}State = {
  ${stateShape.map((field) => `${field.name}: ${field.defaultValue},`).join('\n  ')}
};`;

    // Generate store implementation
    let storeImpl = `export const use${pascalName}Store = create<${pascalName}Store>()(`;

    // Add middleware wrappers
    if (withDevTools) {
      storeImpl += `\n  devtools(`;
    }
    if (withPersistence) {
      storeImpl += `\n    persist(`;
    }

    // Store body
    storeImpl += `
      (set) => ({
        ...initialState,

        ${stateShape.map((field) => `set${field.name.charAt(0).toUpperCase() + field.name.slice(1)}: (${field.name}) => set({ ${field.name} }),`).join('\n        ')}
        reset: () => set(initialState),
      })`;

    // Close middleware wrappers
    if (withPersistence) {
      storeImpl += `,
      {
        name: '${name}-storage',
      }
    )`;
    }
    if (withDevTools) {
      storeImpl += `,
    {
      name: '${devToolsName}',
    }
  )`;
    }

    storeImpl += `
);`;

    // Generate selectors
    const selectors = `
// Selectors
export const ${name}Selectors = {
  ${stateShape.map((field) => `${field.name}: (state: ${pascalName}Store) => state.${field.name},`).join('\n  ')}
};`;

    return `${imports}

${stateInterface}

${actionsInterface}

${storeType}

${initialState}

${storeImpl}
${selectors}
`;
  }

  /**
   *
   * @param sourcePath
   * @param storeName
   */
  private async updateStoreIndex(
    sourcePath: string,
    storeName: string
  ): Promise<void> {
    const indexPath = path.join(sourcePath, 'store', 'index.ts');
    let indexContent = '';

    try {
      indexContent = await fs.readFile(indexPath, 'utf-8');
    } catch {
      // File doesn't exist, create it
      indexContent = `// Store exports\n\n`;
    }

    // Add export if not already present
    const exportStatement = `export * from './slices/${storeName}';\n`;
    if (!indexContent.includes(exportStatement)) {
      indexContent += exportStatement;
      await fs.writeFile(indexPath, indexContent);
    }
  }
}
