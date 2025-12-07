/**
 * @file VS Code API Mocks
 * @description Comprehensive mocks for VS Code API used in unit testing
 * This provides a complete mock implementation of the vscode module for testing
 */

import { vi } from 'vitest';

/**
 * Mock OutputChannel for testing logging
 */
export class MockOutputChannel {
  public name: string;
  private messages: string[] = [];

  constructor(name: string) {
    this.name = name;
  }

  append(value: string): void {
    this.messages.push(value);
  }

  appendLine(value: string): void {
    this.messages.push(value + '\n');
  }

  clear(): void {
    this.messages = [];
  }

  show(preserveFocus?: boolean): void {
    // Mock implementation
  }

  hide(): void {
    // Mock implementation
  }

  dispose(): void {
    this.messages = [];
  }

  getMessages(): string[] {
    return [...this.messages];
  }

  getLastMessage(): string | undefined {
    return this.messages[this.messages.length - 1];
  }
}

/**
 * Mock Memento for state storage
 */
export class MockMemento {
  private storage = new Map<string, unknown>();

  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  get<T>(key: string, defaultValue?: T): T | undefined {
    const value = this.storage.get(key);
    return value !== undefined ? (value as T) : defaultValue;
  }

  async update(key: string, value: unknown): Promise<void> {
    this.storage.set(key, value);
  }

  keys(): readonly string[] {
    return Array.from(this.storage.keys());
  }

  clear(): void {
    this.storage.clear();
  }
}

/**
 * Mock SecretStorage for secure storage
 */
export class MockSecretStorage {
  private secrets = new Map<string, string>();

  async get(key: string): Promise<string | undefined> {
    return this.secrets.get(key);
  }

  async store(key: string, value: string): Promise<void> {
    this.secrets.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.secrets.delete(key);
  }

  onDidChange = vi.fn();
}

/**
 * Mock ExtensionContext for testing
 */
export class MockExtensionContext {
  public subscriptions: { dispose(): unknown }[] = [];
  public workspaceState = new MockMemento();
  public globalState = new MockMemento() as MockMemento & {
    setKeysForSync(keys: readonly string[]): void;
  };
  public secrets = new MockSecretStorage();
  public extensionPath = '/mock/extension/path';
  public extensionUri = { fsPath: '/mock/extension/path', scheme: 'file' } as any;
  public storagePath = '/mock/storage/path';
  public globalStorageUri = { fsPath: '/mock/global/storage', scheme: 'file' } as any;
  public logUri = { fsPath: '/mock/log', scheme: 'file' } as any;
  public extensionMode = 3; // Production mode

  constructor() {
    // Add setKeysForSync method to globalState
    (this.globalState as any).setKeysForSync = vi.fn();
  }
}

/**
 * Mock DiagnosticCollection
 */
export class MockDiagnosticCollection {
  public name: string;
  private diagnostics = new Map<string, any[]>();

  constructor(name: string) {
    this.name = name;
  }

  set(uri: any, diagnostics: any[] | undefined): void {
    if (diagnostics === undefined) {
      this.diagnostics.delete(uri.toString());
    } else {
      this.diagnostics.set(uri.toString(), diagnostics);
    }
  }

  delete(uri: any): void {
    this.diagnostics.delete(uri.toString());
  }

  clear(): void {
    this.diagnostics.clear();
  }

  forEach(callback: (uri: any, diagnostics: any[]) => void): void {
    this.diagnostics.forEach(callback);
  }

  get(uri: any): any[] | undefined {
    return this.diagnostics.get(uri.toString());
  }

  has(uri: any): boolean {
    return this.diagnostics.has(uri.toString());
  }

  dispose(): void {
    this.diagnostics.clear();
  }
}

/**
 * Mock StatusBarItem
 */
export class MockStatusBarItem {
  public text = '';
  public tooltip?: string;
  public command?: string;
  public alignment = 2; // Right
  public priority = 0;
  private visible = false;

  show(): void {
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }

  dispose(): void {
    this.visible = false;
  }

  isVisible(): boolean {
    return this.visible;
  }
}

/**
 * Mock EventEmitter
 */
export class MockEventEmitter<T> {
  private listeners: Array<(e: T) => void> = [];

  get event() {
    return (listener: (e: T) => void) => {
      this.listeners.push(listener);
      return {
        dispose: () => {
          const index = this.listeners.indexOf(listener);
          if (index > -1) {
            this.listeners.splice(index, 1);
          }
        },
      };
    };
  }

  fire(data: T): void {
    this.listeners.forEach(listener => listener(data));
  }

  dispose(): void {
    this.listeners = [];
  }
}

/**
 * Mock WorkspaceConfiguration
 */
export class MockWorkspaceConfiguration {
  private config = new Map<string, unknown>();

  get<T>(section: string): T | undefined;
  get<T>(section: string, defaultValue: T): T;
  get<T>(section: string, defaultValue?: T): T | undefined {
    const value = this.config.get(section);
    return value !== undefined ? (value as T) : defaultValue;
  }

  async update(section: string, value: unknown, target?: number): Promise<void> {
    this.config.set(section, value);
  }

  has(section: string): boolean {
    return this.config.has(section);
  }

  inspect<T>(section: string): any {
    return {
      key: section,
      defaultValue: undefined,
      globalValue: this.config.get(section),
      workspaceValue: undefined,
      workspaceFolderValue: undefined,
    };
  }

  setConfig(section: string, value: unknown): void {
    this.config.set(section, value);
  }
}

/**
 * Create a complete VS Code API mock
 */
export function createVSCodeMock() {
  const mockConfig = new MockWorkspaceConfiguration();

  return {
    window: {
      createOutputChannel: vi.fn((name: string) => new MockOutputChannel(name)),
      createStatusBarItem: vi.fn(() => new MockStatusBarItem()),
      showInformationMessage: vi.fn(),
      showWarningMessage: vi.fn(),
      showErrorMessage: vi.fn(),
      showTextDocument: vi.fn(),
      withProgress: vi.fn(),
    },
    workspace: {
      getConfiguration: vi.fn(() => mockConfig),
      workspaceFolders: [],
      onDidChangeConfiguration: vi.fn(),
      onDidChangeWorkspaceFolders: vi.fn(),
      isTrusted: true,
      onDidGrantWorkspaceTrust: vi.fn(),
    },
    commands: {
      registerCommand: vi.fn(),
      executeCommand: vi.fn(),
    },
    languages: {
      createDiagnosticCollection: vi.fn((name: string) => new MockDiagnosticCollection(name)),
    },
    Uri: {
      file: vi.fn((path: string) => ({ fsPath: path, scheme: 'file', toString: () => path })),
      parse: vi.fn((uri: string) => ({ fsPath: uri, scheme: 'file', toString: () => uri })),
    },
    EventEmitter: MockEventEmitter,
    StatusBarAlignment: {
      Left: 1,
      Right: 2,
    },
    ConfigurationTarget: {
      Global: 1,
      Workspace: 2,
      WorkspaceFolder: 3,
    },
    ProgressLocation: {
      SourceControl: 1,
      Window: 10,
      Notification: 15,
    },
    ExtensionMode: {
      Production: 1,
      Development: 2,
      Test: 3,
    },
    DiagnosticSeverity: {
      Error: 0,
      Warning: 1,
      Information: 2,
      Hint: 3,
    },
    env: {
      isTelemetryEnabled: false,
      openExternal: vi.fn(),
    },
  };
}

/**
 * Setup VS Code mocks for tests
 * @returns Mock VS Code API object
 */
export function setupVSCodeMocks() {
  const vscodeMock = createVSCodeMock();

  // Mock the vscode module
  vi.mock('vscode', () => vscodeMock);

  return vscodeMock;
}
