import * as vscode from 'vscode';
import { CLIDetector } from './cli-detector';

interface EnzymeTaskDefinition extends vscode.TaskDefinition {
  type: 'enzyme';
  command: string;
  args?: string[];
}

export class EnzymeTaskProvider implements vscode.TaskProvider {
  private tasks: vscode.Task[] = [];

  constructor(private detector: CLIDetector) {}

  /**
   * Provide tasks for Enzyme commands
   */
  async provideTasks(): Promise<vscode.Task[]> {
    if (this.tasks.length > 0) {
      return this.tasks;
    }

    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      return [];
    }

    const cliPath = await this.detector.getExecutablePath();
    if (!cliPath) {
      return [];
    }

    // Create tasks for common Enzyme commands
    this.tasks = [
      this.createTask('dev', 'Start development server', cliPath, ['dev'], 'build'),
      this.createTask('build', 'Build for production', cliPath, ['build'], 'build'),
      this.createTask('test', 'Run tests', cliPath, ['test'], 'test'),
      this.createTask('test:watch', 'Run tests in watch mode', cliPath, ['test', '--watch'], 'test'),
      this.createTask('lint', 'Lint code', cliPath, ['lint'], 'test'),
      this.createTask('lint:fix', 'Lint and fix code', cliPath, ['lint', '--fix'], 'test'),
      this.createTask('typecheck', 'Run TypeScript type checking', cliPath, ['typecheck'], 'test'),
      this.createTask('analyze', 'Analyze project', cliPath, ['analyze']),
      this.createTask('doctor', 'Run project diagnostics', cliPath, ['doctor']),
      this.createTask('clean', 'Clean build artifacts', cliPath, ['clean'], 'build'),
    ];

    return this.tasks;
  }

  /**
   * Resolve a task definition
   */
  async resolveTask(task: vscode.Task): Promise<vscode.Task | undefined> {
    const definition = task.definition as EnzymeTaskDefinition;

    if (definition.type !== 'enzyme') {
      return undefined;
    }

    const cliPath = await this.detector.getExecutablePath();
    if (!cliPath) {
      return undefined;
    }

    const args = definition.args || [];
    const execution = new vscode.ShellExecution(`${cliPath} ${definition.command} ${args.join(' ')}`);

    return new vscode.Task(
      definition,
      vscode.TaskScope.Workspace,
      definition.command,
      'enzyme',
      execution,
      this.getProblemMatchers(definition.command)
    );
  }

  /**
   * Create a task
   */
  private createTask(
    name: string,
    description: string,
    cliPath: string,
    args: string[],
    group?: string
  ): vscode.Task {
    const definition: EnzymeTaskDefinition = {
      type: 'enzyme',
      command: args[0],
      args: args.slice(1),
    };

    const execution = new vscode.ShellExecution(`${cliPath} ${args.join(' ')}`);

    const task = new vscode.Task(
      definition,
      vscode.TaskScope.Workspace,
      name,
      'enzyme',
      execution,
      this.getProblemMatchers(args[0])
    );

    task.detail = description;

    // Set task group
    if (group === 'build') {
      task.group = vscode.TaskGroup.Build;
    } else if (group === 'test') {
      task.group = vscode.TaskGroup.Test;
    }

    // Set presentation options
    task.presentationOptions = {
      reveal: vscode.TaskRevealKind.Always,
      panel: vscode.TaskPanelKind.Dedicated,
      clear: true,
      showReuseMessage: false,
    };

    return task;
  }

  /**
   * Get problem matchers for a command
   */
  private getProblemMatchers(command: string): string[] {
    const matchers: Record<string, string[]> = {
      build: ['$tsc', '$webpack'],
      dev: ['$tsc', '$webpack'],
      test: ['$jest'],
      lint: ['$eslint-stylish'],
      typecheck: ['$tsc'],
    };

    return matchers[command] || [];
  }

  /**
   * Get workspace root
   */
  private getWorkspaceRoot(): string | null {
    const folders = vscode.workspace.workspaceFolders;
    return folders && folders.length > 0 ? folders[0].uri.fsPath : null;
  }
}

/**
 * Register custom problem matchers for Enzyme
 */
export function registerProblemMatchers(context: vscode.ExtensionContext): void {
  // Problem matcher for Enzyme build errors
  const enzymeErrorMatcher: vscode.ProblemMatcher = {
    owner: 'enzyme',
    fileLocation: ['relative', '${workspaceFolder}'],
    pattern: {
      regexp: /^(.+)\\((\\d+),(\\d+)\\):\\s+(error|warning|info)\\s+(.+)$/,
      file: 1,
      line: 2,
      column: 3,
      severity: 4,
      message: 5,
    },
  };

  // Register via package.json contribution point
  // This is typically done in package.json, but can be dynamically registered
}
