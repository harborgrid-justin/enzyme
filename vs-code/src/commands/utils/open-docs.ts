import * as vscode from 'vscode';
import { BaseCommand } from '../base-command';
import type { CommandContext, CommandMetadata } from '../base-command';

/**
 * Open Documentation Command
 * Opens Enzyme documentation in browser or editor
 * Keybinding: Ctrl+Shift+E D
 */
export class OpenDocsCommand extends BaseCommand {
  private readonly DOCS_BASE_URL = 'https://github.com/harborgrid-justin/enzyme#readme';

  /**
   *
   */
  getMetadata(): CommandMetadata {
    return {
      id: 'enzyme.utils.openDocs',
      title: 'Enzyme: Open Documentation',
      category: 'Enzyme Utils',
      icon: '$(book)',
      keybinding: {
        key: 'ctrl+shift+e d',
        mac: 'cmd+shift+e d',
      },
    };
  }

  /**
   *
   * @param _context
   */
  protected async executeCommand(_context: CommandContext): Promise<void> {
    // Show quick pick to select documentation section
    const section = await this.showQuickPick(
      [
        {
          label: '$(home) Home',
          description: 'Main documentation page',
          value: '',
        },
        {
          label: '$(rocket) Getting Started',
          description: 'Quick start guide and installation',
          value: '#getting-started',
        },
        {
          label: '$(package) Features',
          description: 'Feature modules and organization',
          value: '#features',
        },
        {
          label: '$(compass) Routing',
          description: 'Routing configuration and navigation',
          value: '#routing',
        },
        {
          label: '$(database) State Management',
          description: 'Zustand stores and state patterns',
          value: '#state-management',
        },
        {
          label: '$(cloud) API Integration',
          description: 'React Query and data fetching',
          value: '#api-integration',
        },
        {
          label: '$(beaker) Components',
          description: 'Component patterns and best practices',
          value: '#components',
        },
        {
          label: '$(settings-gear) Configuration',
          description: 'Project configuration and setup',
          value: '#configuration',
        },
        {
          label: '$(telescope) CLI Reference',
          description: 'Command-line interface documentation',
          value: '#cli-reference',
        },
        {
          label: '$(question) FAQ',
          description: 'Frequently asked questions',
          value: '#faq',
        },
        {
          label: '$(file-code) API Reference',
          description: 'Complete API documentation',
          value: '#api-reference',
        },
        {
          label: '$(lightbulb) Examples',
          description: 'Code examples and tutorials',
          value: '#examples',
        },
      ],
      {
        title: 'Open Enzyme Documentation',
        placeHolder: 'Select a documentation section',
      }
    );

    if (!section) {
      return;
    }

    // Build URL
    const url = `${this.DOCS_BASE_URL}${section.value}`;

    // Ask user how to open
    const openMethod = await this.showQuickPick(
      [
        {
          label: '$(browser) Open in Browser',
          description: 'Open documentation in default browser',
          value: 'browser',
        },
        {
          label: '$(file-code) Open in Editor',
          description: 'Open documentation in VS Code (if available locally)',
          value: 'editor',
        },
      ],
      {
        title: 'How would you like to open the documentation?',
      }
    );

    if (!openMethod) {
      return;
    }

    await (openMethod.value === 'browser' ? this.openInBrowser(url) : this.openInEditor(section.value));
  }

  /**
   *
   * @param url
   */
  private async openInBrowser(url: string): Promise<void> {
    try {
      await vscode.env.openExternal(vscode.Uri.parse(url));
      this.log('info', `Opened documentation: ${url}`);
    } catch (error) {
      await this.showError('Failed to open documentation in browser', error);
    }
  }

  /**
   *
   * @param section
   */
  private async openInEditor(section: string): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();

    if (!workspaceFolder) {
      await this.showWarning(
        'No workspace folder open. Opening in browser instead...'
      );
      await this.openInBrowser(`${this.DOCS_BASE_URL}${section}`);
      return;
    }

    // Try to find local documentation
    const docsFiles = await vscode.workspace.findFiles(
      new vscode.RelativePattern(workspaceFolder, 'docs/**/*.md'),
      '**/node_modules/**'
    );

    if (docsFiles.length === 0) {
      const result = await this.showWarning(
        'No local documentation found. Open in browser?',
        'Yes',
        'No'
      );

      if (result === 'Yes') {
        await this.openInBrowser(`${this.DOCS_BASE_URL}${section}`);
      }
      return;
    }

    // Show available documentation files
    const selected = await this.showQuickPick(
      docsFiles.map((file) => ({
        label: file.path.split('/').pop() || '',
        description: file.path,
        file,
      })),
      {
        title: 'Select Documentation File',
        placeHolder: 'Choose a documentation file to open',
      }
    );

    if (selected) {
      await this.openFile(selected.file);
    }
  }
}
