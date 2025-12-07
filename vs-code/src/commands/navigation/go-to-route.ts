import * as path from 'node:path';
import * as vscode from 'vscode';
import { BaseCommand } from '../base-command';
import type { CommandContext, CommandMetadata } from '../base-command';

/**
 * Route definition interface
 */
interface RouteDefinition {
  path: string;
  file: string;
  line: number;
  component?: string;
}

/**
 * Go To Route Command
 * Navigate to route definition with fuzzy search
 * Keybinding: Ctrl+Shift+R
 */
export class GoToRouteCommand extends BaseCommand {
  /**
   * Get command metadata for registration
   * @returns Command metadata object
   */
  getMetadata(): CommandMetadata {
    return {
      id: 'enzyme.navigation.goToRoute',
      title: 'Enzyme: Go to Route',
      category: 'Enzyme Navigation',
      icon: '$(symbol-namespace)',
      keybinding: {
        key: 'ctrl+shift+r',
        mac: 'cmd+shift+r',
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

    // Find all routes
    const routes = await this.withProgress(
      'Scanning routes...',
      async (progress) => {
        progress.report({ message: 'Finding route definitions...' });
        return this.findRoutes(workspaceFolder);
      }
    );

    if (routes.length === 0) {
      await this.showWarning('No routes found in the workspace');
      return;
    }

    // Show quick pick with fuzzy search
    const selected = await this.showQuickPick(
      routes.map((route) => ({
        label: route.path,
        description: route.component || '',
        detail: route.file,
        route,
      })),
      {
        title: 'Go to Route',
        placeHolder: 'Search for a route...',
        matchOnDescription: true,
        matchOnDetail: true,
      }
    );

    if (!selected) {
      return;
    }

    // Open the file at the route definition
    const uri = vscode.Uri.file(selected.route.file);
    await this.openFile(uri, {
      selection: new vscode.Range(
        selected.route.line,
        0,
        selected.route.line,
        0
      ),
    });
  }

  /**
   *
   * @param workspaceFolder
   */
  private async findRoutes(
    workspaceFolder: vscode.WorkspaceFolder
  ): Promise<RouteDefinition[]> {
    const routes: RouteDefinition[] = [];
    const sourcePath = path.join(workspaceFolder.uri.fsPath, 'src');

    try {
      // Find route configuration files
      const routeFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(sourcePath, '**/routes/**/*.{ts,tsx,js,jsx}'),
        '**/node_modules/**'
      );

      // Parse each file for route definitions
      for (const fileUri of routeFiles) {
        const document = await vscode.workspace.openTextDocument(fileUri);
        const text = document.getText();

        // Look for route path patterns
        const pathRegex = /path:\s*["'`]([^"'`]+)["'`]/g;
        const componentRegex = /(?:element|component):\s*(?:<(\w+)|(\w+))/g;

        let match;
        while ((match = pathRegex.exec(text)) !== null) {
          const routePath = match[1];
          if (!routePath) {continue;}

          const {line} = document.positionAt(match.index);

          // Try to find associated component
          let component: string | undefined;
          const contextStart = Math.max(0, match.index - 200);
          const contextEnd = Math.min(text.length, match.index + 200);
          const context = text.slice(contextStart, contextEnd);

          const componentMatch = componentRegex.exec(context);
          if (componentMatch) {
            component = componentMatch[1] ?? componentMatch[2];
          }

          const route: RouteDefinition = {
            path: routePath,
            file: fileUri.fsPath,
            line,
          };

          if (component !== undefined) {
            route.component = component;
          }

          routes.push(route);
        }
      }

      // Sort routes by path
      routes.sort((a, b) => a.path.localeCompare(b.path));

      return routes;
    } catch (error) {
      this.log('error', 'Failed to find routes', error);
      return [];
    }
  }
}
