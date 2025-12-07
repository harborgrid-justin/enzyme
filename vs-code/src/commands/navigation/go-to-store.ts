import * as path from 'node:path';
import * as vscode from 'vscode';
import { BaseCommand } from '../base-command';
import type { CommandContext, CommandMetadata } from '../base-command';

/**
 *
 */
interface StoreDefinition {
  name: string;
  file: string;
  hookName: string;
  type: 'slice' | 'store' | 'context';
}

/**
 * Go To Store Command
 * Navigate to store/slice definition
 * Keybinding: Ctrl+Shift+T
 */
export class GoToStoreCommand extends BaseCommand {
  /**
   *
   */
  getMetadata(): CommandMetadata {
    return {
      id: 'enzyme.navigation.goToStore',
      title: 'Enzyme: Go to Store',
      category: 'Enzyme Navigation',
      icon: '$(database)',
      keybinding: {
        key: 'ctrl+shift+t',
        mac: 'cmd+shift+t',
      },
    };
  }

  /**
   *
   * @param _context
   */
  protected async executeCommand(_context: CommandContext): Promise<void> {
    const workspaceFolder = await this.ensureWorkspaceFolder();

    // Find all stores
    const stores = await this.withProgress(
      'Scanning stores...',
      async (progress) => {
        progress.report({ message: 'Finding store definitions...' });
        return this.findStores(workspaceFolder);
      }
    );

    if (stores.length === 0) {
      await this.showWarning('No stores found in the workspace');
      return;
    }

    // Show quick pick
    const selected = await this.showQuickPick(
      stores.map((store) => ({
        label: `$(database) ${store.hookName}`,
        description: store.type,
        detail: store.file,
        store,
      })),
      {
        title: 'Go to Store',
        placeHolder: 'Search for a store/slice...',
        matchOnDescription: true,
        matchOnDetail: true,
      }
    );

    if (!selected) {
      return;
    }

    // Open the store file
    const uri = vscode.Uri.file(selected.store.file);
    await this.openFile(uri);
  }

  /**
   *
   * @param workspaceFolder
   */
  private async findStores(
    workspaceFolder: vscode.WorkspaceFolder
  ): Promise<StoreDefinition[]> {
    const stores: StoreDefinition[] = [];
    const sourcePath = path.join(workspaceFolder.uri.fsPath, 'src');

    try {
      // Find store files in common locations
      const storeFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(
          sourcePath,
          '**/store/**/*.{ts,tsx,js,jsx}'
        ),
        '**/node_modules/**'
      );

      // Also find stores in features
      const featureStoreFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(
          sourcePath,
          '**/features/**/store/**/*.{ts,tsx,js,jsx}'
        ),
        '**/node_modules/**'
      );

      // Combine all store files
      const allStoreFiles = [...storeFiles, ...featureStoreFiles];

      // Parse each file for store definitions
      for (const fileUri of allStoreFiles) {
        const document = await vscode.workspace.openTextDocument(fileUri);
        const text = document.getText();

        // Skip index files
        if (fileUri.fsPath.endsWith('index.ts') || fileUri.fsPath.endsWith('index.tsx')) {
          continue;
        }

        // Look for Zustand store patterns
        const zustandPattern = /export\s+const\s+(use\w+Store)\s*=/g;
        let match;

        while ((match = zustandPattern.exec(text)) !== null) {
          const hookName = match[1];
          if (!hookName) continue;

          const storeName = hookName.replace(/^use/, '').replace(/Store$/, '');

          stores.push({
            name: storeName,
            file: fileUri.fsPath,
            hookName,
            type: 'slice',
          });
        }

        // Look for Context-based stores
        const contextPattern = /export\s+const\s+(\w+Context)\s*=/g;
        while ((match = contextPattern.exec(text)) !== null) {
          const contextName = match[1];
          if (!contextName) continue;

          const storeName = contextName.replace(/Context$/, '');

          // Look for accompanying hook
          const hookPattern = new RegExp(
            `export\\s+(?:function|const)\\s+(use${storeName})`,
            'g'
          );
          const hookMatch = hookPattern.exec(text);
          const foundHookName = hookMatch?.[1];

          if (foundHookName) {
            stores.push({
              name: storeName,
              file: fileUri.fsPath,
              hookName: foundHookName,
              type: 'context',
            });
          }
        }
      }

      // Remove duplicates and sort
      const uniqueStores = [...new Map(stores.map((s) => [s.hookName, s])).values()];

      uniqueStores.sort((a, b) => a.name.localeCompare(b.name));

      return uniqueStores;
    } catch (error) {
      this.log('error', 'Failed to find stores', error);
      return [];
    }
  }
}
