import * as vscode from 'vscode';
import { BaseCommand } from '../base-command';
import type { CommandContext, CommandMetadata } from '../base-command';

/**
 * Refresh All Command
 * Refreshes all tree views and re-scans the project
 * Keybinding: Ctrl+Shift+E R
 */
export class RefreshAllCommand extends BaseCommand {
  /**
   * Get command metadata for registration
   * @returns Command metadata object
   */
  getMetadata(): CommandMetadata {
    return {
      id: 'enzyme.utils.refreshAll',
      title: 'Enzyme: Refresh All',
      category: 'Enzyme Utils',
      icon: '$(refresh)',
      keybinding: {
        key: 'ctrl+shift+e r',
        mac: 'cmd+shift+e r',
      },
    };
  }

  /**
   * Execute the command
   * @param _context - Command execution context
   * @returns Promise that resolves when command completes
   */
  protected async executeCommand(_context: CommandContext): Promise<void> {
    await this.withProgress(
      'Refreshing Enzyme extension...',
      async (progress) => {
        // Refresh tree views
        progress.report({ message: 'Refreshing tree views...', increment: 25 });
        await this.refreshTreeViews();

        // Re-scan project
        progress.report({ message: 'Scanning project...', increment: 50 });
        await this.rescanProject();

        // Clear caches
        progress.report({ message: 'Clearing caches...', increment: 75 });
        await this.clearCaches();

        progress.report({ message: 'Done!', increment: 100 });
      }
    );

    await this.showInfo('All Enzyme views and caches refreshed!');
  }

  /**
   *
   */
  private async refreshTreeViews(): Promise<void> {
    // Fire refresh events for all registered tree views
    // In production, these would be actual tree view data providers

    this.log('info', 'Refreshing tree views');

    // Simulate refresh by firing commands
    const treeViewCommands = [
      'enzyme.treeview.features.refresh',
      'enzyme.treeview.routes.refresh',
      'enzyme.treeview.stores.refresh',
    ];

    for (const command of treeViewCommands) {
      try {
        await vscode.commands.executeCommand(command);
      } catch {
        // Command might not be registered yet
        this.log('debug', `Command ${command} not found, skipping`);
      }
    }
  }

  /**
   *
   */
  private async rescanProject(): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) {
      return;
    }

    this.log('info', 'Re-scanning project structure');

    // In production, this would trigger a full project scan
    // and update internal caches with discovered routes, components, etc.

    // Simulate scan by finding key files
    const patterns = [
      '**/routes/**/*.{ts,tsx}',
      '**/features/**/index.{ts,tsx}',
      '**/store/**/*.{ts,tsx}',
      '**/components/**/*.{tsx,jsx}',
    ];

    let totalFiles = 0;

    for (const pattern of patterns) {
      const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(workspaceFolder, pattern),
        '**/node_modules/**'
      );
      totalFiles += files.length;
    }

    this.log('info', `Scanned ${totalFiles} files`);
  }

  /**
   *
   */
  private async clearCaches(): Promise<void> {
    this.log('info', 'Clearing extension caches');

    // Clear global state cache if needed
    const cacheKeys = [
      'enzyme.cache.routes',
      'enzyme.cache.features',
      'enzyme.cache.stores',
      'enzyme.cache.components',
    ];

    for (const key of cacheKeys) {
      await this.context.globalState.update(key, undefined);
    }

    // Clear workspace state cache
    for (const key of cacheKeys) {
      await this.context.workspaceState.update(key, undefined);
    }
  }
}
