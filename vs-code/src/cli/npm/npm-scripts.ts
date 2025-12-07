import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';

/**
 *
 */
export interface NPMScript {
  name: string;
  command: string;
  description?: string;
}

/**
 *
 */
export class NPMScripts {
  private statusBarItem: vscode.StatusBarItem | null = null;
  private scripts: NPMScript[] = [];

  /**
   * Detect available npm scripts from package.json
   * @returns Array of NPM scripts
   */
  async detectScripts(): Promise<NPMScript[]> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      return [];
    }

    try {
      const packageJsonPath = path.join(workspaceRoot, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson: { scripts?: Record<string, unknown> } = JSON.parse(content) as { scripts?: Record<string, unknown> };

      if (!packageJson.scripts) {
        return [];
      }

      this.scripts = Object.entries(packageJson.scripts).map(([name, command]) => ({
        name,
        command: typeof command === 'string' ? command : String(command),
      }));

      return this.scripts;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to read package.json: ${errorMessage}`);
      return [];
    }
  }

  /**
   * Run a specific npm script
   * @param scriptName
   * @param packageManager
   * @returns void
   */
  runScript(scriptName: string, packageManager: 'npm' | 'yarn' | 'pnpm' = 'npm'): void {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    const terminal = vscode.window.createTerminal({
      name: `${packageManager} ${scriptName}`,
      cwd: workspaceRoot,
    });

    terminal.show();

    const command = packageManager === 'npm' ? `npm run ${scriptName}` : `${packageManager} ${scriptName}`;
    terminal.sendText(command);

    // Update status bar
    this.updateStatusBar(scriptName, 'running');
  }

  /**
   * Show quick pick for available scripts
   * @returns Promise that resolves when complete
   */
  async showScriptPicker(): Promise<void> {
    const scripts = await this.detectScripts();

    if (scripts.length === 0) {
      vscode.window.showInformationMessage('No npm scripts found in package.json');
      return;
    }

    const choice = await vscode.window.showQuickPick(
      scripts.map((script) => ({
        label: script.name,
        description: script.command,
        detail: this.getScriptCategory(script.name),
        script,
      })),
      {
        placeHolder: 'Select npm script to run',
        matchOnDescription: true,
        matchOnDetail: true,
      }
    );

    if (choice) {
      const packageManager = await this.detectPackageManager();
      this.runScript(choice.script.name, packageManager);
    }
  }

  /**
   * Run script with output streaming
   * SECURITY: Uses shell: false to prevent command injection
   * @param scriptName
   * @param packageManager
   * @param outputChannel
   * @returns Exit code of the process
   */
  async runScriptWithOutput(
    scriptName: string,
    packageManager: 'npm' | 'yarn' | 'pnpm' = 'npm',
    outputChannel?: vscode.OutputChannel
  ): Promise<number> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      throw new Error('No workspace folder open');
    }

    // SECURITY: Validate script name to prevent injection
    if (!this.isValidScriptName(scriptName)) {
      throw new Error(`Invalid script name: ${scriptName}. Only alphanumeric, hyphens, and colons allowed.`);
    }

    const channel = outputChannel ?? vscode.window.createOutputChannel(`npm ${scriptName}`);
    channel.show();

    return new Promise((resolve, reject) => {
      const command = packageManager === 'npm' ? 'npm' : packageManager;
      const args = packageManager === 'npm' ? ['run', scriptName] : [scriptName];

      // SECURITY: Use shell: false to prevent command injection attacks
      const child = spawn(command, args, {
        cwd: workspaceRoot,
        shell: false,
      });

      child.stdout.on('data', (data: Buffer) => {
        channel.append(data.toString());
      });

      child.stderr.on('data', (data: Buffer) => {
        channel.append(data.toString());
      });

      child.on('error', (error) => {
        channel.appendLine(`Error: ${error.message}`);
        reject(error);
      });

      child.on('close', (code) => {
        channel.appendLine(`\nProcess exited with code ${code}`);
        this.updateStatusBar(scriptName, code === 0 ? 'success' : 'failed');
        resolve(code ?? 1);
      });

      this.updateStatusBar(scriptName, 'running');
    });
  }

  /**
   * Validate script name to prevent command injection
   * @param name
   * @returns True if script name is valid, false otherwise
   */
  private isValidScriptName(name: string): boolean {
    // Allow alphanumeric characters, hyphens, underscores, and colons (for namespaced scripts)
    return /^[\w:-]+$/.test(name);
  }

  /**
   * Create status bar item for scripts
   * @returns Status bar item instance
   */
  createStatusBarItem(): vscode.StatusBarItem {
    if (this.statusBarItem) {
      return this.statusBarItem;
    }

    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );

    this.statusBarItem.text = '$(tools) NPM Scripts';
    this.statusBarItem.tooltip = 'Click to run npm scripts';
    this.statusBarItem.command = 'enzyme.npm.showScripts';
    this.statusBarItem.show();

    return this.statusBarItem;
  }

  /**
   * Detect package manager used in project
   * @returns Package manager type
   */
  private async detectPackageManager(): Promise<'npm' | 'yarn' | 'pnpm'> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      return 'npm';
    }

    // Check for lock files
    try {
      await fs.access(path.join(workspaceRoot, 'pnpm-lock.yaml'));
      return 'pnpm';
    } catch {
      // pnpm-lock.yaml not found, continue
    }

    try {
      await fs.access(path.join(workspaceRoot, 'yarn.lock'));
      return 'yarn';
    } catch {
      // yarn.lock not found, continue
    }

    return 'npm';
  }

  /**
   * Update status bar based on script state
   * @param scriptName
   * @param state
   * @returns void
   */
  private updateStatusBar(scriptName: string, state: 'running' | 'success' | 'failed'): void {
    if (!this.statusBarItem) {
      return;
    }

    switch (state) {
      case 'running':
        this.statusBarItem.text = `$(sync~spin) ${scriptName}`;
        this.statusBarItem.color = undefined;
        break;
      case 'success':
        this.statusBarItem.text = `$(check) ${scriptName}`;
        this.statusBarItem.color = new vscode.ThemeColor('terminal.ansiGreen');
        setTimeout(() => this.resetStatusBar(), 3000);
        break;
      case 'failed':
        this.statusBarItem.text = `$(x) ${scriptName}`;
        this.statusBarItem.color = new vscode.ThemeColor('terminal.ansiRed');
        setTimeout(() => this.resetStatusBar(), 3000);
        break;
    }
  }

  /**
   * Reset status bar to default
   * @returns void
   */
  private resetStatusBar(): void {
    if (this.statusBarItem) {
      this.statusBarItem.text = '$(tools) NPM Scripts';
      this.statusBarItem.color = undefined;
    }
  }

  /**
   * Get script category/type
   * @param scriptName
   * @returns Script category
   */
  private getScriptCategory(scriptName: string): string {
    if (scriptName.includes('dev') || scriptName.includes('start')) {
      return 'Development';
    }
    if (scriptName.includes('build')) {
      return 'Build';
    }
    if (scriptName.includes('test')) {
      return 'Testing';
    }
    if (scriptName.includes('lint')) {
      return 'Linting';
    }
    if (scriptName.includes('format')) {
      return 'Formatting';
    }
    if (scriptName.includes('deploy')) {
      return 'Deployment';
    }
    return 'Other';
  }

  /**
   * Get common Enzyme scripts
   * @returns Array of common Enzyme scripts
   */
  getCommonScripts(): NPMScript[] {
    return [
      { name: 'dev', command: 'enzyme dev', description: 'Start development server' },
      { name: 'build', command: 'enzyme build', description: 'Build for production' },
      { name: 'test', command: 'enzyme test', description: 'Run tests' },
      { name: 'lint', command: 'enzyme lint', description: 'Lint code' },
      { name: 'typecheck', command: 'enzyme typecheck', description: 'Type check' },
    ];
  }

  /**
   * Dispose status bar item
   * @returns void
   */
  dispose(): void {
    if (this.statusBarItem) {
      this.statusBarItem.dispose();
      this.statusBarItem = null;
    }
  }

  /**
   * Get workspace root
   * @returns Workspace root path or null
   */
  private getWorkspaceRoot(): string | null {
    const folders = vscode.workspace.workspaceFolders;
    const firstFolder = folders?.[0];
    return firstFolder ? firstFolder.uri.fsPath : null;
  }
}
