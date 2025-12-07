/**
 * ProviderRegistry - Manages all VS Code providers
 */

import type { EventBus } from './event-bus';
import type { LoggerService } from '../services/logger-service';
import type * as vscode from 'vscode';

/**
 * Provider type
 */
export enum ProviderType {
  TREE_VIEW = 'treeview',
  LANGUAGE = 'language',
  CODE_ACTION = 'codeaction',
  CODE_LENS = 'codelens',
  DIAGNOSTIC = 'diagnostic',
  DEBUG = 'debug',
  TASK = 'task',
  TERMINAL = 'terminal',
  HOVER = 'hover',
  COMPLETION = 'completion',
  DEFINITION = 'definition',
  REFERENCE = 'reference',
  RENAME = 'rename',
  FORMATTING = 'formatting',
}

/**
 * Provider status
 */
export enum ProviderStatus {
  REGISTERED = 'registered',
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  ERROR = 'error',
}

/**
 * Provider metadata
 */
export interface ProviderMetadata {
  id: string;
  name: string;
  type: ProviderType;
  description?: string;
  dependencies?: string[];
  enabled: boolean;
}

/**
 * Provider registration
 */
export interface ProviderRegistration {
  metadata: ProviderMetadata;
  disposable: vscode.Disposable;
  status: ProviderStatus;
  registeredAt: number;
  lastError?: Error;
}

/**
 * ProviderRegistry - Registry for managing providers
 */
export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private readonly providers = new Map<string, ProviderRegistration>();
  private readonly eventBus: EventBus;
  private readonly logger: LoggerService;
  private disposables: vscode.Disposable[] = [];

  /**
   *
   * @param eventBus
   * @param logger
   */
  private constructor(eventBus: EventBus, logger: LoggerService) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  /**
   * Create the provider registry
   * @param eventBus
   * @param logger
   */
  public static create(eventBus: EventBus, logger: LoggerService): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry(eventBus, logger);
    }
    return ProviderRegistry.instance;
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      throw new Error('ProviderRegistry not created. Call create() first.');
    }
    return ProviderRegistry.instance;
  }

  /**
   * Register a provider
   * @param metadata
   * @param disposable
   */
  public register(
    metadata: ProviderMetadata,
    disposable: vscode.Disposable
  ): void {
    const registration: ProviderRegistration = {
      metadata,
      disposable,
      status: metadata.enabled ? ProviderStatus.ENABLED : ProviderStatus.DISABLED,
      registeredAt: Date.now(),
    };

    this.providers.set(metadata.id, registration);
    this.disposables.push(disposable);

    this.logger.info(`Provider registered: ${metadata.name} (${metadata.type})`);
    this.eventBus.emit({
      type: 'provider:registered',
      payload: { name: metadata.name },
    });
  }

  /**
   * Unregister a provider
   * @param id
   */
  public unregister(id: string): void {
    const registration = this.providers.get(id);
    if (!registration) {
      return;
    }

    registration.disposable.dispose();
    this.providers.delete(id);

    this.logger.info(`Provider unregistered: ${registration.metadata.name}`);
  }

  /**
   * Enable a provider
   * @param id
   */
  public enable(id: string): void {
    const registration = this.providers.get(id);
    if (!registration) {
      throw new Error(`Provider not found: ${id}`);
    }

    registration.metadata.enabled = true;
    registration.status = ProviderStatus.ENABLED;

    this.logger.info(`Provider enabled: ${registration.metadata.name}`);
  }

  /**
   * Disable a provider
   * @param id
   */
  public disable(id: string): void {
    const registration = this.providers.get(id);
    if (!registration) {
      throw new Error(`Provider not found: ${id}`);
    }

    registration.metadata.enabled = false;
    registration.status = ProviderStatus.DISABLED;

    this.logger.info(`Provider disabled: ${registration.metadata.name}`);
    this.eventBus.emit({
      type: 'provider:disabled',
      payload: { name: registration.metadata.name },
    });
  }

  /**
   * Get provider status
   * @param id
   */
  public getStatus(id: string): ProviderStatus | undefined {
    return this.providers.get(id)?.status;
  }

  /**
   * Get provider registration
   * @param id
   */
  public getRegistration(id: string): ProviderRegistration | undefined {
    return this.providers.get(id);
  }

  /**
   * Get all providers
   */
  public getAllProviders(): Map<string, ProviderRegistration> {
    return new Map(this.providers);
  }

  /**
   * Get providers by type
   * @param type
   */
  public getProvidersByType(type: ProviderType): ProviderRegistration[] {
    return [...this.providers.values()].filter(
      reg => reg.metadata.type === type
    );
  }

  /**
   * Get enabled providers
   */
  public getEnabledProviders(): ProviderRegistration[] {
    return [...this.providers.values()].filter(
      reg => reg.metadata.enabled
    );
  }

  /**
   * Check dependencies
   * @param id
   */
  public checkDependencies(id: string): boolean {
    const registration = this.providers.get(id);
    if (!registration?.metadata.dependencies) {
      return true;
    }

    for (const dep of registration.metadata.dependencies) {
      const depReg = this.providers.get(dep);
      if (!depReg?.metadata.enabled) {
        return false;
      }
    }

    return true;
  }

  /**
   * Record provider error
   * @param id
   * @param error
   */
  public recordError(id: string, error: Error): void {
    const registration = this.providers.get(id);
    if (registration) {
      registration.lastError = error;
      registration.status = ProviderStatus.ERROR;
      this.logger.error(`Provider error: ${registration.metadata.name}`, error);
    }
  }

  /**
   * Get provider statistics
   */
  public getStatistics(): {
    total: number;
    enabled: number;
    disabled: number;
    errors: number;
    byType: Record<ProviderType, number>;
  } {
    const stats = {
      total: this.providers.size,
      enabled: 0,
      disabled: 0,
      errors: 0,
      byType: {} as Record<ProviderType, number>,
    };

    for (const registration of this.providers.values()) {
      if (registration.metadata.enabled) {
        stats.enabled++;
      } else {
        stats.disabled++;
      }

      if (registration.status === ProviderStatus.ERROR) {
        stats.errors++;
      }

      const {type} = registration.metadata;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    }

    return stats;
  }

  /**
   * Dispose all providers
   */
  public dispose(): void {
    this.logger.info('Disposing all providers');

    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    this.providers.clear();
  }
}
