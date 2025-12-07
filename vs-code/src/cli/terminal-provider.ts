import * as path from 'node:path';
import * as vscode from 'vscode';
import type { CLIRunner } from './cli-runner';

/**
 *
 */
export class EnzymeTerminalProvider {
  private terminal: vscode.Terminal | null = null;
  private linkProvider: vscode.Disposable | null = null;

  /**
   *
   * @param _cliRunner
   */
  constructor(_cliRunner: CLIRunner) {
    // _cliRunner parameter reserved for future use
    this.registerLinkProvider();
  }

  /**
   * Create terminal profile for Enzyme commands
   */
  createTerminalProfile(): vscode.TerminalProfile {
    const workspaceRoot = this.getWorkspaceRoot();
    const options: any = {
      name: 'Enzyme Terminal',
      iconPath: new vscode.ThemeIcon('beaker'),
      color: new vscode.ThemeColor('terminal.ansiCyan'),
      env: {
        ENZYME_TERMINAL: 'true',
        FORCE_COLOR: '1',
      },
    };

    if (workspaceRoot !== null) {
      options.cwd = workspaceRoot;
    }

    return new vscode.TerminalProfile(options);
  }

  /**
   * Get or create the Enzyme terminal
   */
  getOrCreateTerminal(): vscode.Terminal {
    if (!this.terminal || this.isTerminalClosed(this.terminal)) {
      const workspaceRoot = this.getWorkspaceRoot();
      const options: any = {
        name: 'Enzyme',
        iconPath: new vscode.ThemeIcon('beaker'),
        color: new vscode.ThemeColor('terminal.ansiCyan'),
        env: {
          ENZYME_TERMINAL: 'true',
          FORCE_COLOR: '1',
        },
      };

      if (workspaceRoot !== null) {
        options.cwd = workspaceRoot;
      }

      this.terminal = vscode.window.createTerminal(options);

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
   * SECURITY: Validates command before execution
   * @param command
   * @param show
   */
  runCommand(command: string, show = true): void {
    // SECURITY: Basic validation - reject obviously malicious patterns
    if (this.containsMaliciousPatterns(command)) {
      throw new Error('Command contains potentially malicious patterns and was blocked');
    }

    const terminal = this.getOrCreateTerminal();

    if (show) {
      terminal.show();
    }

    terminal.sendText(command);
  }

  /**
   * Check for malicious command patterns
   * @param command
   */
  private containsMaliciousPatterns(command: string): boolean {
    // Check for command chaining that could be used for injection
    const maliciousPatterns = [
      /;\s*rm\s+-rf/i,           // rm -rf commands
      /;\s*dd\s+if=/i,            // dd commands
      /&&\s*rm\s+-rf/i,           // chained destructive commands
      /\|\s*sh\s*$/i,             // piping to shell
      /;\s*curl.*\|\s*bash/i,     // curl to bash
      /;\s*wget.*\|\s*bash/i,     // wget to bash
      /`.*`/,                     // backtick command substitution
      /\$\(.*\)/,                 // $() command substitution (but allow within quoted strings)
    ];

    return maliciousPatterns.some(pattern => pattern.test(command));
  }

  /**
   * Run an enzyme CLI command
   * @param args
   * @param show
   */
  runEnzymeCommand(args: string[], show = true): void {
    const command = `enzyme ${args.join(' ')}`;
    this.runCommand(command, show);
  }

  /**
   * Generate code and navigate to file
   * @param type
   * @param name
   * @param options
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
        const document = await vscode.workspace.openTextDocument(generatedFile);
        await vscode.window.showTextDocument(document);
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
        const filePathRegex = /(?:\.\/)?(?:src|pages|components|hooks|services|features|store|api)\/[\w/\-]+\.\w+/g;
        const {line} = context;

        let match;
        while ((match = filePathRegex.exec(line)) !== null) {
          const filePath = match[0].replace(/^\.\//, '');
          const fullPath = path.join(workspaceRoot, filePath);

          links.push({
            startIndex: match.index,
            length: match[0].length,
            tooltip: fullPath,
          } as vscode.TerminalLink & { data?: string });
        }

        return links;
      },
      handleTerminalLink: async (link: vscode.TerminalLink) => {
        // Use the tooltip to store the file path info
        try {
          const document = await vscode.workspace.openTextDocument(link.tooltip || '');
          await vscode.window.showTextDocument(document);
        } catch {
          vscode.window.showErrorMessage(`Could not open file`);
        }
      },
    });
  }

  /**
   * Find generated file based on type and name
   * @param type
   * @param name
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
   * @param terminal
   */
  private isTerminalClosed(terminal: vscode.Terminal): boolean {
    return !vscode.window.terminals.includes(terminal);
  }

  /**
   * Get workspace root
   */
  private getWorkspaceRoot(): string | null {
    const folders = vscode.workspace.workspaceFolders;
    const firstFolder = folders?.[0];
    return firstFolder ? firstFolder.uri.fsPath : null;
  }
}
