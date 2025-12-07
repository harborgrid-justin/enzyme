import * as vscode from 'vscode';
import * as path from 'path';
import { CLIRunner } from './cli-runner';

export class EnzymeTerminalProvider {
  private terminal: vscode.Terminal | null = null;
  private linkProvider: vscode.Disposable | null = null;

  constructor(private cliRunner: CLIRunner) {
    this.registerLinkProvider();
  }

  /**
   * Create terminal profile for Enzyme commands
   */
  createTerminalProfile(): vscode.TerminalProfile {
    const workspaceRoot = this.getWorkspaceRoot();

    return new vscode.TerminalProfile({
      name: 'Enzyme Terminal',
      iconPath: new vscode.ThemeIcon('beaker'),
      color: new vscode.ThemeColor('terminal.ansiCyan'),
      cwd: workspaceRoot || undefined,
      env: {
        ENZYME_TERMINAL: 'true',
        FORCE_COLOR: '1',
      },
    });
  }

  /**
   * Get or create the Enzyme terminal
   */
  getOrCreateTerminal(): vscode.Terminal {
    if (!this.terminal || this.isTerminalClosed(this.terminal)) {
      this.terminal = vscode.window.createTerminal({
        name: 'Enzyme',
        iconPath: new vscode.ThemeIcon('beaker'),
        color: new vscode.ThemeColor('terminal.ansiCyan'),
        cwd: this.getWorkspaceRoot() || undefined,
        env: {
          ENZYME_TERMINAL: 'true',
          FORCE_COLOR: '1',
        },
      });

      // Clean up when terminal is closed
      vscode.window.onDidCloseTerminal((closedTerminal) => {
        if (closedTerminal === this.terminal) {
          this.terminal = null;
        }
      });
    }

    return this.terminal;
  }

  /**
   * Run a command in the Enzyme terminal
   */
  runCommand(command: string, show = true): void {
    const terminal = this.getOrCreateTerminal();

    if (show) {
      terminal.show();
    }

    terminal.sendText(command);
  }

  /**
   * Run an enzyme CLI command
   */
  runEnzymeCommand(args: string[], show = true): void {
    const command = `enzyme ${args.join(' ')}`;
    this.runCommand(command, show);
  }

  /**
   * Generate code and navigate to file
   */
  async generateAndNavigate(type: string, name: string, options: Record<string, any> = {}): Promise<void> {
    const terminal = this.getOrCreateTerminal();
    terminal.show();

    // Build command
    const args = ['generate', type, name];
    for (const [key, value] of Object.entries(options)) {
      if (typeof value === 'boolean') {
        if (value) {
          args.push(`--${key}`);
        }
      } else {
        args.push(`--${key}`, String(value));
      }
    }

    // Run command
    const command = `enzyme ${args.join(' ')}`;
    terminal.sendText(command);

    // Attempt to navigate to generated file after a delay
    setTimeout(async () => {
      const generatedFile = await this.findGeneratedFile(type, name);
      if (generatedFile) {
        const doc = await vscode.workspace.openTextDocument(generatedFile);
        await vscode.window.showTextDocument(doc);
      }
    }, 2000);
  }

  /**
   * Clear the terminal
   */
  clear(): void {
    if (this.terminal && !this.isTerminalClosed(this.terminal)) {
      this.terminal.sendText('clear');
    }
  }

  /**
   * Dispose terminal
   */
  dispose(): void {
    if (this.terminal) {
      this.terminal.dispose();
      this.terminal = null;
    }
    if (this.linkProvider) {
      this.linkProvider.dispose();
      this.linkProvider = null;
    }
  }

  /**
   * Register terminal link provider to make file paths clickable
   */
  private registerLinkProvider(): void {
    this.linkProvider = vscode.window.registerTerminalLinkProvider({
      provideTerminalLinks: (context: vscode.TerminalLinkContext) => {
        const links: vscode.TerminalLink[] = [];
        const workspaceRoot = this.getWorkspaceRoot();

        if (!workspaceRoot) {
          return links;
        }

        // Match file paths in terminal output
        // Patterns: src/components/Button.tsx, ./src/pages/Home.tsx, etc.
        const filePathRegex = /(?:\.\/)?(?:src|pages|components|hooks|services|features|store|api)\/[\w\-\/]+\.\w+/g;
        const line = context.line;

        let match;
        while ((match = filePathRegex.exec(line)) !== null) {
          const filePath = match[0].replace(/^\.\//, '');
          const fullPath = path.join(workspaceRoot, filePath);

          links.push({
            startIndex: match.index,
            length: match[0].length,
            tooltip: 'Open file',
            data: fullPath,
          });
        }

        return links;
      },
      handleTerminalLink: async (link: vscode.TerminalLink) => {
        const filePath = link.data as string;
        try {
          const doc = await vscode.workspace.openTextDocument(filePath);
          await vscode.window.showTextDocument(doc);
        } catch (error) {
          vscode.window.showErrorMessage(`Could not open file: ${filePath}`);
        }
      },
    });
  }

  /**
   * Find generated file based on type and name
   */
  private async findGeneratedFile(type: string, name: string): Promise<string | null> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      return null;
    }

    // Common paths based on type
    const pathMap: Record<string, string[]> = {
      component: [`src/components/${name}.tsx`, `src/components/${name}/index.tsx`],
      page: [`src/pages/${name}.tsx`, `src/pages/${name}/index.tsx`],
      hook: [`src/hooks/use${name}.ts`, `src/hooks/${name}.ts`],
      service: [`src/services/${name}.ts`, `src/services/${name}/index.ts`],
      feature: [`src/features/${name}/index.ts`],
      slice: [`src/store/${name}.ts`, `src/store/slices/${name}.ts`],
    };

    const possiblePaths = pathMap[type] || [];

    for (const relativePath of possiblePaths) {
      const fullPath = path.join(workspaceRoot, relativePath);
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(fullPath));
        return fullPath;
      } catch {
        // File doesn't exist, try next
      }
    }

    return null;
  }

  /**
   * Check if terminal is closed
   */
  private isTerminalClosed(terminal: vscode.Terminal): boolean {
    return vscode.window.terminals.indexOf(terminal) === -1;
  }

  /**
   * Get workspace root
   */
  private getWorkspaceRoot(): string | null {
    const folders = vscode.workspace.workspaceFolders;
    return folders && folders.length > 0 ? folders[0].uri.fsPath : null;
  }
}
