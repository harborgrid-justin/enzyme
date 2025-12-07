/**
 * CommandRegistry - Manages command registration and execution
 */

import * as vscode from 'vscode';
import { EventBus } from './event-bus';
import { LoggerService } from '../services/logger-service';

/**
 * Command metadata
 */
export interface CommandMetadata {
  id: string;
  title: string;
  description?: string;
  category?: string;
  enablement?: string;
  keybinding?: string;
  dependencies?: string[];
}

/**
 * Command execution context
 */
export interface CommandExecutionContext {
  commandId: string;
  args: unknown[];
  timestamp: number;
  duration?: number;
  error?: Error;
}

/**
 * Command registration
 */
export interface CommandRegistration {
  metadata: CommandMetadata;
  handler: (...args: unknown[]) => unknown | Promise<unknown>;
  disposable: vscode.Disposable;
  executionCount: number;
  lastExecuted?: number;
  lastError?: Error;
}

/**
 * CommandRegistry - Registry for managing commands
 */
export class CommandRegistry {
  private static instance: CommandRegistry;
  private commands: Map<string, CommandRegistration> = new Map();
  private eventBus: EventBus;
  private logger: LoggerService;
  private executionHistory: CommandExecutionContext[] = [];
  private maxHistorySize: number = 100;

  private constructor(eventBus: EventBus, logger: LoggerService) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  /**
   * Create the command registry
   */
  public static create(eventBus: EventBus, logger: LoggerService): CommandRegistry {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry(eventBus, logger);
    }
    return CommandRegistry.instance;
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): CommandRegistry {
    if (!CommandRegistry.instance) {
      throw new Error('CommandRegistry not created. Call create() first.');
    }
    return CommandRegistry.instance;
  }

  /**
   * Register a command
   */
  public register(
    metadata: CommandMetadata,
    handler: (...args: unknown[]) => unknown | Promise<unknown>
  ): vscode.Disposable {
    // Wrap handler with telemetry and error handling
    const wrappedHandler = async (...args: unknown[]) => {
      const startTime = Date.now();
      const context: CommandExecutionContext = {
        commandId: metadata.id,
        args,
        timestamp: startTime,
      };

      try {
        this.logger.debug(`Executing command: ${metadata.id}`, { args });

        const result = await handler(...args);

        context.duration = Date.now() - startTime;
        this.recordExecution(metadata.id, context);

        this.logger.debug(`Command completed: ${metadata.id}`, {
          duration: context.duration,
        });

        return result;

      } catch (error) {
        context.duration = Date.now() - startTime;
        context.error = error as Error;
        this.recordExecution(metadata.id, context);

        this.logger.error(`Command failed: ${metadata.id}`, error);

        this.eventBus.emit({
          type: 'error:occurred',
          payload: {
            message: `Command failed: ${metadata.id}`,
            error: error as Error,
          },
        });

        throw error;
      }
    };

    const disposable = vscode.commands.registerCommand(metadata.id, wrappedHandler);

    const registration: CommandRegistration = {
      metadata,
      handler,
      disposable,
      executionCount: 0,
      lastExecuted: undefined,
      lastError: undefined,
    };

    this.commands.set(metadata.id, registration);

    this.logger.info(`Command registered: ${metadata.id}`);

    return disposable;
  }

  /**
   * Unregister a command
   */
  public unregister(commandId: string): void {
    const registration = this.commands.get(commandId);
    if (!registration) {
      return;
    }

    registration.disposable.dispose();
    this.commands.delete(commandId);

    this.logger.info(`Command unregistered: ${commandId}`);
  }

  /**
   * Execute a command
   */
  public async execute(commandId: string, ...args: unknown[]): Promise<unknown> {
    return await vscode.commands.executeCommand(commandId, ...args);
  }

  /**
   * Check if command is registered
   */
  public has(commandId: string): boolean {
    return this.commands.has(commandId);
  }

  /**
   * Get command registration
   */
  public getRegistration(commandId: string): CommandRegistration | undefined {
    return this.commands.get(commandId);
  }

  /**
   * Get all commands
   */
  public getAllCommands(): Map<string, CommandRegistration> {
    return new Map(this.commands);
  }

  /**
   * Get commands by category
   */
  public getCommandsByCategory(category: string): CommandRegistration[] {
    return Array.from(this.commands.values()).filter(
      reg => reg.metadata.category === category
    );
  }

  /**
   * Record command execution
   */
  private recordExecution(commandId: string, context: CommandExecutionContext): void {
    const registration = this.commands.get(commandId);
    if (registration) {
      registration.executionCount++;
      registration.lastExecuted = context.timestamp;

      if (context.error) {
        registration.lastError = context.error;
      }
    }

    // Add to history
    this.executionHistory.push(context);
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory.shift();
    }
  }

  /**
   * Get execution history
   */
  public getExecutionHistory(count?: number): CommandExecutionContext[] {
    if (count) {
      return this.executionHistory.slice(-count);
    }
    return [...this.executionHistory];
  }

  /**
   * Get command statistics
   */
  public getStatistics(): {
    total: number;
    totalExecutions: number;
    byCategory: Record<string, number>;
    mostUsed: Array<{ id: string; count: number }>;
  } {
    const stats = {
      total: this.commands.size,
      totalExecutions: 0,
      byCategory: {} as Record<string, number>,
      mostUsed: [] as Array<{ id: string; count: number }>,
    };

    const commands = Array.from(this.commands.values());

    for (const registration of commands) {
      stats.totalExecutions += registration.executionCount;

      const category = registration.metadata.category || 'uncategorized';
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    }

    // Get most used commands
    stats.mostUsed = commands
      .map(reg => ({ id: reg.metadata.id, count: reg.executionCount }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  /**
   * Check for keyboard shortcut conflicts
   */
  public checkKeybindingConflicts(): Array<{
    commandId: string;
    keybinding: string;
    conflicts: string[];
  }> {
    const conflicts: Array<{
      commandId: string;
      keybinding: string;
      conflicts: string[];
    }> = [];

    const keybindingMap = new Map<string, string[]>();

    for (const [id, registration] of this.commands) {
      const keybinding = registration.metadata.keybinding;
      if (keybinding) {
        const commands = keybindingMap.get(keybinding) || [];
        commands.push(id);
        keybindingMap.set(keybinding, commands);
      }
    }

    for (const [keybinding, commandIds] of keybindingMap) {
      if (commandIds.length > 1) {
        for (const commandId of commandIds) {
          conflicts.push({
            commandId,
            keybinding,
            conflicts: commandIds.filter(id => id !== commandId),
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Dispose all commands
   */
  public dispose(): void {
    this.logger.info('Disposing all commands');

    for (const registration of this.commands.values()) {
      registration.disposable.dispose();
    }

    this.commands.clear();
    this.executionHistory = [];
  }
}
