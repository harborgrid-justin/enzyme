/**
 * VS Code API Mock
 * This file provides a mock implementation of the vscode module for testing
 */

import { vi } from 'vitest';

class MockOutputChannel {
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

  show(): void {}
  hide(): void {}
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

class MockMemento {
  private storage = new Map<string, any>();

  get<T>(key: string, defaultValue?: T): T | undefined {
    const value = this.storage.get(key);
    return value !== undefined ? value : defaultValue;
  }

  async update(key: string, value: any): Promise<void> {
    this.storage.set(key, value);
  }

  keys(): readonly string[] {
    return Array.from(this.storage.keys());
  }
}

class MockSecretStorage {
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

class MockDiagnosticCollection {
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

  dispose(): void {
    this.diagnostics.clear();
  }
}

class MockStatusBarItem {
  public text = '';
  public tooltip?: string;
  public command?: string;
  public alignment = 2;
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
}

class MockEventEmitter<T> {
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

class MockWorkspaceConfiguration {
  private config = new Map<string, any>();

  get<T>(section: string, defaultValue?: T): T | undefined {
    const value = this.config.get(section);
    return value !== undefined ? value : defaultValue;
  }

  async update(section: string, value: any): Promise<void> {
    this.config.set(section, value);
  }

  has(section: string): boolean {
    return this.config.has(section);
  }
}

const mockConfig = new MockWorkspaceConfiguration();

export const window = {
  createOutputChannel: vi.fn((name: string) => new MockOutputChannel(name)),
  createStatusBarItem: vi.fn(() => new MockStatusBarItem()),
  showInformationMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  showTextDocument: vi.fn(),
  withProgress: vi.fn(),
};

export const workspace = {
  getConfiguration: vi.fn(() => mockConfig),
  workspaceFolders: [],
  onDidChangeConfiguration: vi.fn(),
  onDidChangeWorkspaceFolders: vi.fn(),
  isTrusted: true,
  onDidGrantWorkspaceTrust: vi.fn(),
};

export const commands = {
  registerCommand: vi.fn(),
  executeCommand: vi.fn(),
};

export const languages = {
  createDiagnosticCollection: vi.fn((name: string) => new MockDiagnosticCollection(name)),
};

export const Uri = {
  file: vi.fn((path: string) => ({ fsPath: path, scheme: 'file', toString: () => path })),
  parse: vi.fn((uri: string) => ({ fsPath: uri, scheme: 'file', toString: () => uri })),
};

export const EventEmitter = MockEventEmitter;

export const StatusBarAlignment = {
  Left: 1,
  Right: 2,
};

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3,
};

export const ProgressLocation = {
  SourceControl: 1,
  Window: 10,
  Notification: 15,
};

export const ExtensionMode = {
  Production: 1,
  Development: 2,
  Test: 3,
};

export const DiagnosticSeverity = {
  Error: 0,
  Warning: 1,
  Information: 2,
  Hint: 3,
};

export const env = {
  isTelemetryEnabled: false,
  openExternal: vi.fn(),
};
