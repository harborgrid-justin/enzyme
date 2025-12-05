/**
 * @missionfabric-js/enzyme Multi-Agent Build System
 * Base Agent Class - Foundation for all engineer agents
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import type {
  AgentId,
  AgentStatus,
  AgentConfig,
  AgentResult,
  AgentLogEntry,
  AgentMetrics,
  LogLevel,
  BuildConfig,
} from './types.js';

// ============================================================================
// Utility Functions
// ============================================================================

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(1);
  return `${minutes}m ${seconds}s`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ============================================================================
// Console Output Styling
// ============================================================================

export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

export const icons = {
  success: '✓',
  failure: '✗',
  warning: '⚠',
  info: 'ℹ',
  running: '⟳',
  waiting: '○',
  blocked: '⊘',
  agent: '🤖',
  build: '🔨',
  test: '🧪',
  lint: '🔍',
  security: '🔒',
  performance: '⚡',
  publish: '📦',
  docs: '📄',
  quality: '⭐',
  bundle: '📦',
  typecheck: '🔤',
};

// ============================================================================
// Base Agent Class
// ============================================================================

export abstract class BaseAgent<TResult = unknown> extends EventEmitter {
  protected config: AgentConfig;
  protected buildConfig: BuildConfig;
  protected logs: AgentLogEntry[] = [];
  protected metrics: AgentMetrics = {};
  protected status: AgentStatus = 'idle';
  protected currentProcess: ChildProcess | null = null;
  protected abortController: AbortController | null = null;

  constructor(config: AgentConfig, buildConfig: BuildConfig) {
    super();
    this.config = config;
    this.buildConfig = buildConfig;
  }

  // Abstract method - each agent implements its specific task
  protected abstract executeTask(): Promise<TResult>;

  // Get agent icon for display
  protected getIcon(): string {
    const iconMap: Record<AgentId, string> = {
      orchestrator: icons.agent,
      'build-engineer': icons.build,
      'typecheck-engineer': icons.typecheck,
      'lint-engineer': icons.lint,
      'test-engineer': icons.test,
      'bundle-engineer': icons.bundle,
      'security-engineer': icons.security,
      'quality-engineer': icons.quality,
      'documentation-engineer': icons.docs,
      'performance-engineer': icons.performance,
      'publish-engineer': icons.publish,
    };
    return iconMap[this.config.id] || icons.agent;
  }

  // Main execution method
  async execute(): Promise<AgentResult<TResult>> {
    this.status = 'initializing';
    this.metrics.startTime = new Date();
    this.abortController = new AbortController();

    this.log('info', `${this.getIcon()} Agent initializing: ${this.config.name}`);
    this.emit('started', { agentId: this.config.id });

    try {
      this.status = 'running';
      this.log('info', `Starting task execution...`);

      const result = await this.withTimeout(
        this.executeTask(),
        this.config.timeout
      );

      this.status = 'success';
      this.metrics.endTime = new Date();
      this.metrics.duration = this.metrics.endTime.getTime() - this.metrics.startTime.getTime();

      this.log('success', `${icons.success} Completed in ${formatDuration(this.metrics.duration)}`);
      this.emit('completed', { agentId: this.config.id, result });

      return {
        success: true,
        agentId: this.config.id,
        status: this.status,
        data: result,
        logs: this.logs,
        metrics: this.metrics,
      };
    } catch (error) {
      this.status = 'failed';
      this.metrics.endTime = new Date();
      this.metrics.duration = this.metrics.endTime.getTime() - this.metrics.startTime.getTime();

      const err = error instanceof Error ? error : new Error(String(error));
      this.log('error', `${icons.failure} Failed: ${err.message}`);
      this.emit('failed', { agentId: this.config.id, error: err });

      return {
        success: false,
        agentId: this.config.id,
        status: this.status,
        error: err,
        logs: this.logs,
        metrics: this.metrics,
      };
    }
  }

  // Execute with retries
  async executeWithRetries(): Promise<AgentResult<TResult>> {
    let lastResult: AgentResult<TResult> | null = null;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      if (attempt > 0) {
        this.log('warn', `Retry attempt ${attempt}/${this.config.retries}`);
        await this.sleep(1000 * attempt); // Exponential backoff
      }

      lastResult = await this.execute();

      if (lastResult.success) {
        return lastResult;
      }
    }

    return lastResult!;
  }

  // Cancel execution
  cancel(): void {
    this.status = 'cancelled';
    this.abortController?.abort();

    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = null;
    }

    this.log('warn', `${icons.warning} Agent cancelled`);
    this.emit('cancelled', { agentId: this.config.id });
  }

  // Logging
  protected log(level: LogLevel, message: string, details?: Record<string, unknown>): void {
    const entry: AgentLogEntry = {
      timestamp: new Date(),
      agentId: this.config.id,
      level,
      message,
      details,
    };

    this.logs.push(entry);
    this.emit('log', entry);

    if (this.buildConfig.verbose) {
      this.printLog(entry);
    }
  }

  protected printLog(entry: AgentLogEntry): void {
    const timestamp = entry.timestamp.toISOString().slice(11, 23);
    const colorMap: Record<LogLevel, string> = {
      debug: colors.dim,
      info: colors.cyan,
      warn: colors.yellow,
      error: colors.red,
      success: colors.green,
    };

    const color = colorMap[entry.level];
    const prefix = `${colors.dim}[${timestamp}]${colors.reset} ${color}[${entry.agentId}]${colors.reset}`;
    console.log(`${prefix} ${entry.message}`);
  }

  // Progress reporting
  protected reportProgress(progress: number, message: string): void {
    this.emit('progress', {
      agentId: this.config.id,
      progress: Math.min(100, Math.max(0, progress)),
      message,
    });
  }

  // Execute shell command
  protected async runCommand(
    command: string,
    args: string[],
    options: {
      cwd?: string;
      env?: Record<string, string>;
      silent?: boolean;
    } = {}
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const cwd = options.cwd || process.cwd();
      const env = { ...process.env, ...options.env };

      this.log('debug', `Executing: ${command} ${args.join(' ')}`);

      const child = spawn(command, args, {
        cwd,
        env,
        stdio: 'pipe',
        shell: true,
      });

      this.currentProcess = child;

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        if (!options.silent && this.buildConfig.verbose) {
          process.stdout.write(data);
        }
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
        if (!options.silent && this.buildConfig.verbose) {
          process.stderr.write(data);
        }
      });

      child.on('error', (error) => {
        this.currentProcess = null;
        reject(error);
      });

      child.on('close', (code) => {
        this.currentProcess = null;
        resolve({
          stdout,
          stderr,
          exitCode: code ?? 1,
        });
      });

      // Handle abort signal
      this.abortController?.signal.addEventListener('abort', () => {
        child.kill('SIGTERM');
        reject(new Error('Command aborted'));
      });
    });
  }

  // Timeout wrapper
  protected async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${ms}ms`));
      }, ms);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (error) {
      clearTimeout(timeoutId!);
      throw error;
    }
  }

  // Sleep utility
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Get agent status
  getStatus(): AgentStatus {
    return this.status;
  }

  // Get agent config
  getConfig(): AgentConfig {
    return this.config;
  }

  // Get current logs
  getLogs(): AgentLogEntry[] {
    return [...this.logs];
  }

  // Get current metrics
  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }
}

// ============================================================================
// Agent Factory Helper
// ============================================================================

export function createAgentConfig(
  id: AgentId,
  name: string,
  description: string,
  overrides: Partial<AgentConfig> = {}
): AgentConfig {
  return {
    id,
    name,
    description,
    dependencies: [],
    timeout: 300000, // 5 minutes default
    retries: 1,
    priority: 5,
    parallel: true,
    ...overrides,
  };
}
