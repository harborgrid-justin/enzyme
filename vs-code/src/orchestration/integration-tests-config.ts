/**
 * Integration Tests Configuration
 * Provides mock implementations and utilities for testing
 */

import * as vscode from 'vscode';
import { Container } from './container';
import { EventBus } from './event-bus';
import { LoggerService } from '../services/logger-service';
import { WorkspaceService } from '../services/workspace-service';
import { AnalysisService } from '../services/analysis-service';

/**
 * Mock container for testing
 */
export class MockContainer extends Container {
  private mockServices: Map<string, unknown> = new Map();

  /**
   * Register a mock service
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
   */
  public emit(event: any): void {
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

  public debug(message: string, data?: unknown): void {
    this.logs.push({ level: 'debug', message, data });
  }

  public info(message: string, data?: unknown): void {
    this.logs.push({ level: 'info', message, data });
  }

  public warn(message: string, data?: unknown): void {
    this.logs.push({ level: 'warn', message, data });
  }

  public error(message: string, error?: Error | unknown): void {
    this.logs.push({ level: 'error', message, data: error });
  }

  public getLogs(): Array<{ level: string; message: string; data?: unknown }> {
    return [...this.logs];
  }

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
        keys: () => Array.from(globalState.keys()),
      } as any,
      workspaceState: {
        get: <T>(key: string, defaultValue?: T) => {
          return (workspaceState.get(key) as T) ?? defaultValue;
        },
        update: async (key: string, value: unknown) => {
          workspaceState.set(key, value);
        },
        keys: () => Array.from(workspaceState.keys()),
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
    } as vscode.ExtensionContext;
  }

  /**
   * Wait for event
   */
  public static async waitForEvent(
    eventBus: EventBus,
    eventType: string,
    timeout: number = 5000
  ): Promise<void> {
    await eventBus.waitFor(eventType as any, timeout);
  }

  /**
   * Simulate workspace change
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
