import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { BaseCommand, CommandContext, CommandMetadata } from '../base-command';

interface StoreOptions {
  name: string;
  stateShape: StateField[];
  withPersistence: boolean;
  withDevTools: boolean;
  devToolsName: string;
}

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

  private async gatherStoreOptions(): Promise<StoreOptions | undefined> {
    // Get store name
    const name = await this.showInputBox({
      prompt: 'Enter store/slice name (camelCase)',
      placeHolder: 'userSettings',
      validateInput: (value) => {
        if (!value) {
          return 'Store name is required';
        }
        if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
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
    const devToolsOptions = [
      { label: 'Yes - Enable Redux DevTools', value: true },
      { label: 'No - Disable DevTools', value: false },
    ];

    const devToolsSelection = await this.showQuickPick(devToolsOptions, {
      title: 'Enable Redux DevTools Integration?',
      placeHolder: 'Should this store integrate with Redux DevTools?',
    });

    if (!devToolsSelection) {
      return undefined;
    }

    const withDevTools = devToolsSelection.value;

    // DevTools name
    let devToolsName = name;
    if (withDevTools) {
      const customName = await this.showInputBox({
        prompt: 'Enter DevTools name (optional)',
        placeHolder: `${name} Store`,
        value: `${name} Store`,
      });
      devToolsName = customName || `${name} Store`;
    }

    return {
      name,
      stateShape,
      withPersistence,
      withDevTools,
      devToolsName,
    };
  }

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

  private async generateStore(
    workspaceFolder: vscode.WorkspaceFolder,
    options: StoreOptions,
    token: vscode.CancellationToken
  ): Promise<string> {
    const srcPath = path.join(workspaceFolder.uri.fsPath, 'src');
    const storePath = path.join(srcPath, 'store', 'slices');

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
    await this.updateStoreIndex(srcPath, options.name);

    return storeFilePath;
  }

  private generateStoreContent(options: StoreOptions): string {
    const { name, stateShape, withPersistence, withDevTools, devToolsName } =
      options;

    const pascalName = name.charAt(0).toUpperCase() + name.slice(1);

    // Generate imports
    const middlewareImports: string[] = [];
    if (withDevTools) middlewareImports.push('devtools');
    if (withPersistence) middlewareImports.push('persist');

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

  private async updateStoreIndex(
    srcPath: string,
    storeName: string
  ): Promise<void> {
    const indexPath = path.join(srcPath, 'store', 'index.ts');
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
