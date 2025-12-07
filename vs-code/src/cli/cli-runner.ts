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

  // Allowed CLI commands for security validation
  private static readonly ALLOWED_COMMANDS = [
    'enzyme',
    'npx',
    'npm',
    'node'
  ];

  constructor(private detector: CLIDetector) {}

  /**
   * Dispose and cleanup all running processes
   */
  dispose(): void {
    for (const [id, process] of this.runningProcesses.entries()) {
      try {
        process.kill('SIGTERM');

        // Force kill after timeout
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL');
          }
        }, 5000);
      } catch (error) {
        console.error(`Failed to kill process ${id}:`, error);
      }
    }

    this.runningProcesses.clear();
  }

  /**
   * Validate command is in allowlist for security
   */
  private isAllowedCommand(command: string): boolean {
    const executable = command.split(/[\\/]/).pop()?.split(' ')[0] || '';
    return CLIRunner.ALLOWED_COMMANDS.some(allowed =>
      executable === allowed || executable.startsWith(`${allowed}.`) || executable.endsWith(allowed)
    );
  }

  /**
   * Sanitize argument to prevent command injection
   * Removes shell metacharacters
   */
  private sanitizeArgument(arg: string): string {
    // Remove dangerous shell metacharacters
    return arg.replace(/[;&|`$(){}[\]<>!#]/g, '');
  }

  /**
   * Validate and sanitize arguments
   */
  private validateArgs(args: string[]): string[] {
    return args.map(arg => this.sanitizeArgument(arg));
  }

  /**
   * Get safe environment variables (whitelist approach)
   */
  private getSafeEnvironment(customEnv?: Record<string, string>): NodeJS.ProcessEnv {
    return {
      PATH: process.env['PATH'],
      HOME: process.env['HOME'],
      USER: process.env['USER'],
      TMPDIR: process.env['TMPDIR'],
      LANG: process.env['LANG'],
      NODE_ENV: process.env['NODE_ENV'],
      ...customEnv,
      FORCE_COLOR: '1',
    };
  }

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
   * Generate code using CLI with input validation
   */
  async generate(type: string, name: string, options: Record<string, any> = {}): Promise<CLIRunResult> {
    // Validate type
    const validTypes = ['component', 'page', 'hook', 'service', 'feature', 'slice', 'api', 'store', 'route'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid generator type: ${type}. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate name (alphanumeric, hyphens, underscores only)
    if (!/^[a-zA-Z0-9\-_]+$/.test(name)) {
      throw new Error(`Invalid name: ${name}. Use only alphanumeric characters, hyphens, and underscores.`);
    }

    const args = ['generate', type, name];

    // Add options as flags with validation
    for (const [key, value] of Object.entries(options)) {
      // Validate option key
      if (!/^[a-zA-Z][a-zA-Z0-9\-]*$/.test(key)) {
        throw new Error(`Invalid option key: ${key}`);
      }

      if (typeof value === 'boolean') {
        if (value) {
          args.push(`--${key}`);
        }
      } else if (typeof value === 'string' || typeof value === 'number') {
        args.push(`--${key}`, String(value));
      } else {
        throw new Error(`Invalid option value type for ${key}: ${typeof value}`);
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
   * Execute command with spawn (secure implementation)
   * Uses shell: false and validates all inputs for security
   */
  private async execute(command: string, options: CLIRunOptions): Promise<CLIRunResult> {
    return new Promise((resolve, reject) => {
      // Security: Validate command is in allowlist
      if (!this.isAllowedCommand(command)) {
        reject(new Error(`Command not allowed: ${command}`));
        return;
      }

      const processId = `${Date.now()}-${Math.random()}`;
      let stdout = '';
      let stderr = '';

      // Parse command if it contains spaces (like "npx @enzyme/cli")
      const [cmd, ...cmdArgs] = command.split(' ');

      // Security: Sanitize all arguments
      const sanitizedCmdArgs = this.validateArgs(cmdArgs);
      const sanitizedArgs = this.validateArgs(options.args);
      const allArgs = [...sanitizedCmdArgs, ...sanitizedArgs];

      // Security: Use shell: false to prevent command injection
      const childProcess = spawn(cmd, allArgs, {
        cwd: options.cwd || this.getWorkspaceRoot() || undefined,
        env: this.getSafeEnvironment(options.env),
        shell: false, // SECURITY: Never use shell: true
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

      childProcess.on('error', (error: Error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        this.runningProcesses.delete(processId);
        reject(error);
      });

      childProcess.on('close', (code: number | null) => {
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
