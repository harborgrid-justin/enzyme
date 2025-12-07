import { spawn } from 'node:child_process';
import * as vscode from 'vscode';
import type { CLIDetector } from './cli-detector';

/**
 *
 */
export interface CLIRunOptions {
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  onOutput?: (data: string) => void;
  onError?: (data: string) => void;
  signal?: AbortSignal;
}

/**
 *
 */
export interface CLIRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

/**
 *
 */
export class CLIRunner {
  private readonly runningProcesses = new Map<string, ReturnType<typeof spawn>>();

  // Allowed CLI commands for security validation
  private static readonly ALLOWED_COMMANDS = [
    'enzyme',
    'npx',
    'npm',
    'node'
  ];

  /**
   *
   * @param detector
   */
  constructor(private readonly detector: CLIDetector) {}

  /**
   * Dispose and cleanup all running processes
   * Ensures all child processes are properly terminated
   * Uses SIGTERM first, then SIGKILL after 5s timeout
   *
   * @public
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
   * SECURITY: Prevents execution of unauthorized commands
   *
   * @param command - The command to validate
   * @returns True if command is allowed, false otherwise
   * @private
   */
  private isAllowedCommand(command: string): boolean {
    const executable = command.split(/[/\\]/).pop()?.split(' ')[0] ?? '';
    return CLIRunner.ALLOWED_COMMANDS.some(allowed =>
      executable === allowed || executable.startsWith(`${allowed}.`) || executable.endsWith(allowed)
    );
  }

  /**
   * Sanitize argument to prevent command injection
   * SECURITY: Removes shell metacharacters that could be used for injection attacks
   *
   * @param argument - The argument to sanitize
   * @returns Sanitized argument string
   * @private
   */
  private sanitizeArgument(argument: string): string {
    // Remove dangerous shell metacharacters
    return argument.replace(/[!#$&();<>[\]`{|}]/g, '');
  }

  /**
   * Validate and sanitize arguments
   * SECURITY: Applies sanitization to all arguments in array
   *
   * @param args - Array of arguments to validate
   * @returns Array of sanitized arguments
   * @private
   */
  private validateArgs(args: string[]): string[] {
    return args.map(argument => this.sanitizeArgument(argument));
  }

  /**
   * Get safe environment variables (whitelist approach)
   * SECURITY: Only passes whitelisted environment variables to child processes
   *
   * @param customEnvironment - Optional custom environment variables to merge
   * @returns Safe environment object for child process
   * @private
   */
  private getSafeEnvironment(customEnvironment?: Record<string, string>): NodeJS.ProcessEnv {
    return {
      PATH: process.env['PATH'],
      HOME: process.env['HOME'],
      USER: process.env['USER'],
      TMPDIR: process.env['TMPDIR'],
      LANG: process.env['LANG'],
      NODE_ENV: process.env['NODE_ENV'],
      ...customEnvironment,
      FORCE_COLOR: '1',
    };
  }

  /**
   * Execute a CLI command
   * @param options
   * @returns CLI execution result
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
   * @param options
   * @param outputChannel
   * @returns CLI execution result
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
   * @param options
   * @returns Parsed JSON output
   */
  async runJSON<T = unknown>(options: CLIRunOptions): Promise<T> {
    const result = await this.run({
      ...options,
      args: [...options.args, '--json'],
    });

    if (!result.success) {
      throw new Error(`CLI command failed: ${result.stderr}`);
    }

    try {
      return JSON.parse(result.stdout) as T;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse CLI JSON output: ${errorMessage}`);
    }
  }

  /**
   * Get CLI version
   * @returns CLI version string or null if not available
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
   * @param type
   * @param name
   * @param options
   * @returns CLI execution result
   */
  async generate(type: string, name: string, options: Record<string, unknown> = {}): Promise<CLIRunResult> {
    // Validate type
    const validTypes = ['component', 'page', 'hook', 'service', 'feature', 'slice', 'api', 'store', 'route'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid generator type: ${type}. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate name (alphanumeric, hyphens, underscores only)
    if (!/^[\w-]+$/.test(name)) {
      throw new Error(`Invalid name: ${name}. Use only alphanumeric characters, hyphens, and underscores.`);
    }

    const args = ['generate', type, name];

    // Add options as flags with validation
    for (const [key, value] of Object.entries(options)) {
      // Validate option key
      if (!/^[A-Za-z][\dA-Za-z-]*$/.test(key)) {
        throw new Error(`Invalid option key: ${key}`);
      }

      if (typeof value === 'boolean') {
        if (value) {
          args.push(`--${key}`);
        }
      } else if (typeof value === 'string' || typeof value === 'number') {
        args.push(`--${key}`, String(value));
      } else {
        throw new TypeError(`Invalid option value type for ${key}: ${typeof value}`);
      }
    }

    return this.run({ args });
  }

  /**
   * Add a feature using CLI
   * @param feature
   * @param options
   * @returns CLI execution result
   */
  async addFeature(feature: string, options: Record<string, unknown> = {}): Promise<CLIRunResult> {
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
   * @param options
   * @returns Analysis results
   */
  async analyze(options: Record<string, unknown> = {}): Promise<unknown> {
    return this.runJSON({
      args: ['analyze', ...this.buildArgs(options)],
    });
  }

  /**
   * Run project doctor
   * @returns Doctor diagnostics results
   */
  async doctor(): Promise<unknown> {
    return this.runJSON({
      args: ['doctor'],
    });
  }

  /**
   * Cancel a running command
   * @param processId
   * @returns void
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
   * @returns void
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
   * @param command
   * @param options
   * @returns CLI execution result
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
      const parts = command.split(' ');
      // split always returns at least one element
      const cmd = parts[0] ?? command;
      const cmdArgs = parts.slice(1);

      // Security: Sanitize all arguments
      const sanitizedCmdArgs = this.validateArgs(cmdArgs);
      const sanitizedArgs = this.validateArgs(options.args);
      const allArgs = [...sanitizedCmdArgs, ...sanitizedArgs];

      // Determine working directory
      const workspaceRoot = this.getWorkspaceRoot();
      const cwd: string | null = options.cwd ?? workspaceRoot;

      // Security: Use shell: false to prevent command injection
      // Build spawn options conditionally to satisfy exactOptionalPropertyTypes
      /**
       * Spawn options interface
       */
      interface SpawnOptions {
        shell: boolean;
        cwd?: string;
        env: NodeJS.ProcessEnv;
      }
      const spawnOptions: SpawnOptions = {
        shell: false, // SECURITY: Never use shell: true
        env: this.getSafeEnvironment(options.env),
      };
      if (cwd) {
        spawnOptions.cwd = cwd;
      }
      const childProcess: ReturnType<typeof spawn> = spawn(cmd, allArgs, spawnOptions);

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
   * Converts key-value pairs into CLI flag arguments
   *
   * @param options - Object containing option key-value pairs
   * @returns Array of CLI arguments
   * @private
   */
  private buildArgs(options: Record<string, unknown>): string[] {
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
   * Get workspace root directory
   *
   * @returns Path to workspace root or null if no workspace is open
   * @private
   */
  private getWorkspaceRoot(): string | null {
    const folders = vscode.workspace.workspaceFolders;
    const firstFolder = folders?.[0];
    return firstFolder ? firstFolder.uri.fsPath : null;
  }
}
