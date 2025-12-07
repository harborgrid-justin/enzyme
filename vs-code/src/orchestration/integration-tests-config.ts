/**
 * Integration Tests Configuration
 * Provides mock implementations and utilities for testing
 */

import * as vscode from 'vscode';
import { AnalysisService } from '../services/analysis-service';
import { LoggerService } from '../services/logger-service';
import { WorkspaceService } from '../services/workspace-service';
import { Container } from './container';
import { EventBus } from './event-bus';

/**
 * Mock container for testing
 */
export class MockContainer extends Container {
  private readonly mockServices = new Map<string, unknown>();

  /**
   * Register a mock service
   * @param name
   * @param instance
   */
  public registerMock<T>(name: string, instance: T): void {
    this.mockServices.set(name, instance);
    this.registerInstance(name, instance);
  }

  /**
   * Clear all mocks
   */
  public clearMocks(): void {
    this.mockServices.clear();
    this.clear();
  }
}

/**
 * Mock EventBus for testing
 */
export class MockEventBus extends EventBus {
  private firedEvents: Array<{ type: string; payload?: unknown }> = [];

  /**
   * Override emit to capture events
   * @param event
   */
  public override emit(event: any): void {
    this.firedEvents.push(event);
    super.emit(event);
  }

  /**
   * Get fired events
   */
  public getFiredEvents(): Array<{ type: string; payload?: unknown }> {
    return [...this.firedEvents];
  }

  /**
   * Clear fired events
   */
  public clearFiredEvents(): void {
    this.firedEvents = [];
  }

  /**
   * Check if event was fired
   * @param type
   */
  public wasEventFired(type: string): boolean {
    return this.firedEvents.some(e => e.type === type);
  }
}

/**
 * Mock LoggerService for testing
 */
export class MockLoggerService extends LoggerService {
  private logs: Array<{ level: string; message: string; data?: unknown }> = [];

  /**
   *
   * @param message
   * @param data
   */
  public override debug(message: string, data?: unknown): void {
    this.logs.push({ level: 'debug', message, data });
  }

  /**
   *
   * @param message
   * @param data
   */
  public override info(message: string, data?: unknown): void {
    this.logs.push({ level: 'info', message, data });
  }

  /**
   *
   * @param message
   * @param data
   */
  public override warn(message: string, data?: unknown): void {
    this.logs.push({ level: 'warn', message, data });
  }

  /**
   *
   * @param message
   * @param error
   */
  public override error(message: string, error?: Error | unknown): void {
    this.logs.push({ level: 'error', message, data: error });
  }

  /**
   *
   */
  public getLogs(): Array<{ level: string; message: string; data?: unknown }> {
    return [...this.logs];
  }

  /**
   *
   */
  public clearLogs(): void {
    this.logs = [];
  }
}

/**
 * Test utilities
 */
export class TestUtilities {
  /**
   * Create a test container
   */
  public static createTestContainer(): MockContainer {
    const container = new MockContainer();

    // Register mock services
    container.registerMock('EventBus', new MockEventBus());
    container.registerMock('LoggerService', new MockLoggerService());
    container.registerMock('WorkspaceService', WorkspaceService.getInstance());
    container.registerMock('AnalysisService', AnalysisService.getInstance());

    return container;
  }

  /**
   * Create a test extension context
   */
  public static createTestContext(): vscode.ExtensionContext {
    const globalState = new Map<string, unknown>();
    const workspaceState = new Map<string, unknown>();

    return {
      subscriptions: [],
      extensionPath: '/test/path',
      extensionUri: vscode.Uri.file('/test/path'),
      globalState: {
        get: <T>(key: string, defaultValue?: T) => {
          return (globalState.get(key) as T) ?? defaultValue;
        },
        update: async (key: string, value: unknown) => {
          globalState.set(key, value);
        },
        setKeysForSync: () => {},
        keys: () => [...globalState.keys()],
      } as any,
      workspaceState: {
        get: <T>(key: string, defaultValue?: T) => {
          return (workspaceState.get(key) as T) ?? defaultValue;
        },
        update: async (key: string, value: unknown) => {
          workspaceState.set(key, value);
        },
        keys: () => [...workspaceState.keys()],
      } as any,
      secrets: {
        get: async () => undefined,
        store: async () => {},
        delete: async () => {},
        onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event,
      } as any,
      globalStorageUri: vscode.Uri.file('/test/global'),
      logUri: vscode.Uri.file('/test/logs'),
      storageUri: vscode.Uri.file('/test/storage'),
      extensionMode: vscode.ExtensionMode.Test,
      environmentVariableCollection: {} as any,
      extension: {} as any,
      storagePath: '/test/storage',
      globalStoragePath: '/test/global',
      logPath: '/test/logs',
      asAbsolutePath: (relativePath: string) => `/test/path/${relativePath}`,
    } as unknown as vscode.ExtensionContext;
  }

  /**
   * Wait for event
   * @param eventBus
   * @param eventType
   * @param timeout
   */
  public static async waitForEvent(
    eventBus: EventBus,
    eventType: string,
    timeout = 5000
  ): Promise<void> {
    await eventBus.waitFor(eventType as any, timeout);
  }

  /**
   * Simulate workspace change
   * @param workspaceService
   */
  public static async simulateWorkspaceChange(
    workspaceService: WorkspaceService
  ): Promise<void> {
    await workspaceService.analyzeWorkspace();
  }
}

/**
 * Integration point configurations
 */
export const IntegrationConfig = {
  /**
   * Default test timeout
   */
  DEFAULT_TIMEOUT: 5000,

  /**
   * Test workspace paths
   */
  TEST_WORKSPACE_PATH: '/test/workspace',

  /**
   * Mock service names
   */
  MOCK_SERVICES: [
    'EventBus',
    'LoggerService',
    'WorkspaceService',
    'AnalysisService',
  ],
};
