import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';

export interface NPMScript {
  name: string;
  command: string;
  description?: string;
}

export class NPMScripts {
  private statusBarItem: vscode.StatusBarItem | null = null;
  private scripts: NPMScript[] = [];

  /**
   * Detect available npm scripts from package.json
   */
  async detectScripts(): Promise<NPMScript[]> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      return [];
    }

    try {
      const packageJsonPath = path.join(workspaceRoot, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);

      if (!packageJson.scripts) {
        return [];
      }

      this.scripts = Object.entries(packageJson.scripts).map(([name, command]) => ({
        name,
        command: command as string,
      }));

      return this.scripts;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to read package.json: ${error}`);
      return [];
    }
  }

  /**
   * Run a specific npm script
   */
  async runScript(scriptName: string, packageManager: 'npm' | 'yarn' | 'pnpm' = 'npm'): Promise<void> {
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
      await this.runScript(choice.script.name, packageManager);
    }
  }

  /**
   * Run script with output streaming
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

    const channel = outputChannel || vscode.window.createOutputChannel(`npm ${scriptName}`);
    channel.show();

    return new Promise((resolve, reject) => {
      const command = packageManager === 'npm' ? 'npm' : packageManager;
      const args = packageManager === 'npm' ? ['run', scriptName] : [scriptName];

      const child = spawn(command, args, {
        cwd: workspaceRoot,
        shell: true,
      });

      child.stdout?.on('data', (data) => {
        channel.append(data.toString());
      });

      child.stderr?.on('data', (data) => {
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
   * Create status bar item for scripts
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
    } catch {}

    try {
      await fs.access(path.join(workspaceRoot, 'yarn.lock'));
      return 'yarn';
    } catch {}

    return 'npm';
  }

  /**
   * Update status bar based on script state
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
   */
  private resetStatusBar(): void {
    if (this.statusBarItem) {
      this.statusBarItem.text = '$(tools) NPM Scripts';
      this.statusBarItem.color = undefined;
    }
  }

  /**
   * Get script category/type
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
   */
  dispose(): void {
    if (this.statusBarItem) {
      this.statusBarItem.dispose();
      this.statusBarItem = null;
    }
  }

  /**
   * Get workspace root
   */
  private getWorkspaceRoot(): string | null {
    const folders = vscode.workspace.workspaceFolders;
    return folders && folders.length > 0 ? folders[0].uri.fsPath : null;
  }
}
