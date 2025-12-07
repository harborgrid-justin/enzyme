import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import { CLIDetector } from './cli-detector';

export interface CLIRunOptions {
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  onOutput?: (data: string) => void;
  onError?: (data: string) => void;
  signal?: AbortSignal;
}

export interface CLIRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export class CLIRunner {
  private runningProcesses: Map<string, ChildProcess> = new Map();

  constructor(private detector: CLIDetector) {}

  /**
   * Execute a CLI command
   */
  async run(options: CLIRunOptions): Promise<CLIRunResult> {
    const cliPath = await this.detector.getExecutablePath();
    if (!cliPath) {
      throw new Error('Enzyme CLI not found. Please install it first.');
    }

    return this.execute(cliPath, options);
  }

  /**
   * Execute a CLI command and stream output to a channel
   */
  async runWithOutput(
    options: CLIRunOptions,
    outputChannel: vscode.OutputChannel
  ): Promise<CLIRunResult> {
    return this.run({
      ...options,
      onOutput: (data) => {
        outputChannel.append(data);
        options.onOutput?.(data);
      },
      onError: (data) => {
        outputChannel.append(data);
        options.onError?.(data);
      },
    });
  }

  /**
   * Execute a CLI command with JSON output
   */
  async runJSON<T = any>(options: CLIRunOptions): Promise<T> {
    const result = await this.run({
      ...options,
      args: [...options.args, '--json'],
    });

    if (!result.success) {
      throw new Error(`CLI command failed: ${result.stderr}`);
    }

    try {
      return JSON.parse(result.stdout);
    } catch (error) {
      throw new Error(`Failed to parse CLI JSON output: ${error}`);
    }
  }

  /**
   * Get CLI version
   */
  async getVersion(): Promise<string | null> {
    try {
      const result = await this.run({
        args: ['--version'],
        timeout: 5000,
      });
      return result.stdout.trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * Generate code using CLI
   */
  async generate(type: string, name: string, options: Record<string, any> = {}): Promise<CLIRunResult> {
    const args = ['generate', type, name];

    // Add options as flags
    for (const [key, value] of Object.entries(options)) {
      if (typeof value === 'boolean') {
        if (value) {
          args.push(`--${key}`);
        }
      } else {
        args.push(`--${key}`, String(value));
      }
    }

    return this.run({ args });
  }

  /**
   * Add a feature using CLI
   */
  async addFeature(feature: string, options: Record<string, any> = {}): Promise<CLIRunResult> {
    const args = ['add', feature];

    for (const [key, value] of Object.entries(options)) {
      if (typeof value === 'boolean') {
        if (value) {
          args.push(`--${key}`);
        }
      } else {
        args.push(`--${key}`, String(value));
      }
    }

    return this.run({ args });
  }

  /**
   * Analyze project using CLI
   */
  async analyze(options: Record<string, any> = {}): Promise<any> {
    return this.runJSON({
      args: ['analyze', ...this.buildArgs(options)],
    });
  }

  /**
   * Run project doctor
   */
  async doctor(): Promise<any> {
    return this.runJSON({
      args: ['doctor'],
    });
  }

  /**
   * Cancel a running command
   */
  cancel(processId: string): void {
    const process = this.runningProcesses.get(processId);
    if (process) {
      process.kill('SIGTERM');
      this.runningProcesses.delete(processId);
    }
  }

  /**
   * Cancel all running commands
   */
  cancelAll(): void {
    for (const [id, process] of this.runningProcesses.entries()) {
      process.kill('SIGTERM');
      this.runningProcesses.delete(id);
    }
  }

  /**
   * Execute command with spawn
   */
  private async execute(command: string, options: CLIRunOptions): Promise<CLIRunResult> {
    return new Promise((resolve, reject) => {
      const processId = `${Date.now()}-${Math.random()}`;
      let stdout = '';
      let stderr = '';

      // Parse command if it contains spaces (like "npx @enzyme/cli")
      const [cmd, ...cmdArgs] = command.split(' ');
      const allArgs = [...cmdArgs, ...options.args];

      const childProcess = spawn(cmd, allArgs, {
        cwd: options.cwd || this.getWorkspaceRoot() || undefined,
        env: {
          ...process.env,
          ...options.env,
          // Ensure CLI outputs are not buffered
          FORCE_COLOR: '1',
        },
        shell: true,
      });

      this.runningProcesses.set(processId, childProcess);

      // Handle timeout
      let timeoutId: NodeJS.Timeout | undefined;
      if (options.timeout) {
        timeoutId = setTimeout(() => {
          childProcess.kill('SIGTERM');
          reject(new Error(`Command timeout after ${options.timeout}ms`));
        }, options.timeout);
      }

      // Handle cancellation
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          childProcess.kill('SIGTERM');
          reject(new Error('Command cancelled'));
        });
      }

      childProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        options.onOutput?.(text);
      });

      childProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        options.onError?.(text);
      });

      childProcess.on('error', (error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        this.runningProcesses.delete(processId);
        reject(error);
      });

      childProcess.on('close', (code) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        this.runningProcesses.delete(processId);

        const exitCode = code ?? 0;
        resolve({
          stdout,
          stderr,
          exitCode,
          success: exitCode === 0,
        });
      });
    });
  }

  /**
   * Build args from options object
   */
  private buildArgs(options: Record<string, any>): string[] {
    const args: string[] = [];

    for (const [key, value] of Object.entries(options)) {
      if (typeof value === 'boolean') {
        if (value) {
          args.push(`--${key}`);
        }
      } else if (Array.isArray(value)) {
        value.forEach(v => {
          args.push(`--${key}`, String(v));
        });
      } else {
        args.push(`--${key}`, String(value));
      }
    }

    return args;
  }

  /**
   * Get workspace root
   */
  private getWorkspaceRoot(): string | null {
    const folders = vscode.workspace.workspaceFolders;
    return folders && folders.length > 0 ? folders[0].uri.fsPath : null;
  }
}
