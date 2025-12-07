import * as vscode from 'vscode';

/**
 * Mock TreeDataProvider for testing tree views
 */
export class MockTreeDataProvider<T> implements vscode.TreeDataProvider<T> {
  private _onDidChangeTreeData = new vscode.EventEmitter<T | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private items: T[] = [];

  constructor(items: T[] = []) {
    this.items = items;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: T): vscode.TreeItem {
    return element as any;
  }

  getChildren(element?: T): vscode.ProviderResult<T[]> {
    if (!element) {
      return this.items;
    }
    return [];
  }

  setItems(items: T[]): void {
    this.items = items;
    this.refresh();
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}

/**
 * Mock WebviewPanel for testing webviews
 */
export class MockWebviewPanel implements vscode.WebviewPanel {
  readonly viewType: string;
  title: string;
  readonly webview: MockWebview;
  readonly options: vscode.WebviewPanelOptions;
  readonly viewColumn?: vscode.ViewColumn;
  active: boolean = true;
  visible: boolean = true;

  private _onDidDispose = new vscode.EventEmitter<void>();
  readonly onDidDispose = this._onDidDispose.event;

  private _onDidChangeViewState = new vscode.EventEmitter<vscode.WebviewPanelOnDidChangeViewStateEvent>();
  readonly onDidChangeViewState = this._onDidChangeViewState.event;

  constructor(viewType: string, title: string, showOptions: vscode.ViewColumn) {
    this.viewType = viewType;
    this.title = title;
    this.viewColumn = showOptions;
    this.webview = new MockWebview();
    this.options = {};
  }

  reveal(viewColumn?: vscode.ViewColumn, preserveFocus?: boolean): void {
    this.visible = true;
  }

  dispose(): void {
    this.visible = false;
    this.active = false;
    this._onDidDispose.fire();
    this._onDidDispose.dispose();
    this._onDidChangeViewState.dispose();
    this.webview.dispose();
  }
}

/**
 * Mock Webview for testing webview content
 */
export class MockWebview implements vscode.Webview {
  html: string = '';
  options: vscode.WebviewOptions = {};

  private _onDidReceiveMessage = new vscode.EventEmitter<any>();
  readonly onDidReceiveMessage = this._onDidReceiveMessage.event;

  private messages: any[] = [];

  cspSource: string = '';
  asWebviewUri(localResource: vscode.Uri): vscode.Uri {
    return localResource;
  }

  postMessage(message: any): Thenable<boolean> {
    this.messages.push(message);
    return Promise.resolve(true);
  }

  getMessages(): any[] {
    return [...this.messages];
  }

  clearMessages(): void {
    this.messages = [];
  }

  simulateReceiveMessage(message: any): void {
    this._onDidReceiveMessage.fire(message);
  }

  dispose(): void {
    this._onDidReceiveMessage.dispose();
  }
}

/**
 * Mock DiagnosticCollection for testing diagnostics
 */
export class MockDiagnosticCollection implements vscode.DiagnosticCollection {
  readonly name: string;
  private diagnostics = new Map<string, vscode.Diagnostic[]>();

  constructor(name: string) {
    this.name = name;
  }

  set(uri: vscode.Uri, diagnostics: vscode.Diagnostic[] | undefined): void;
  set(entries: [vscode.Uri, vscode.Diagnostic[] | undefined][]): void;
  set(uriOrEntries: any, diagnostics?: any): void {
    if (Array.isArray(uriOrEntries)) {
      uriOrEntries.forEach(([uri, diags]) => {
        if (diags) {
          this.diagnostics.set(uri.toString(), diags);
        } else {
          this.diagnostics.delete(uri.toString());
        }
      });
    } else {
      if (diagnostics) {
        this.diagnostics.set(uriOrEntries.toString(), diagnostics);
      } else {
        this.diagnostics.delete(uriOrEntries.toString());
      }
    }
  }

  delete(uri: vscode.Uri): void {
    this.diagnostics.delete(uri.toString());
  }

  clear(): void {
    this.diagnostics.clear();
  }

  forEach(callback: (uri: vscode.Uri, diagnostics: vscode.Diagnostic[], collection: vscode.DiagnosticCollection) => any, thisArg?: any): void {
    this.diagnostics.forEach((diagnostics, uriString) => {
      callback.call(thisArg, vscode.Uri.parse(uriString), diagnostics, this);
    });
  }

  get(uri: vscode.Uri): vscode.Diagnostic[] | undefined {
    return this.diagnostics.get(uri.toString());
  }

  has(uri: vscode.Uri): boolean {
    return this.diagnostics.has(uri.toString());
  }

  dispose(): void {
    this.diagnostics.clear();
  }

  [Symbol.iterator](): Iterator<[vscode.Uri, vscode.Diagnostic[]]> {
    const entries = Array.from(this.diagnostics.entries()).map(([uriString, diagnostics]) =>
      [vscode.Uri.parse(uriString), diagnostics] as [vscode.Uri, vscode.Diagnostic[]]
    );
    return entries[Symbol.iterator]();
  }
}

/**
 * Mock OutputChannel for testing output
 */
export class MockOutputChannel implements vscode.OutputChannel {
  readonly name: string;
  private output: string[] = [];

  constructor(name: string) {
    this.name = name;
  }

  append(value: string): void {
    this.output.push(value);
  }

  appendLine(value: string): void {
    this.output.push(value + '\n');
  }

  replace(value: string): void {
    this.output = [value];
  }

  clear(): void {
    this.output = [];
  }

  show(preserveFocus?: boolean): void;
  show(column?: vscode.ViewColumn, preserveFocus?: boolean): void;
  show(columnOrPreserveFocus?: any, preserveFocus?: boolean): void {
    // Mock implementation
  }

  hide(): void {
    // Mock implementation
  }

  dispose(): void {
    this.output = [];
  }

  getOutput(): string {
    return this.output.join('');
  }
}

/**
 * Mock Terminal for testing terminal operations
 */
export class MockTerminal implements vscode.Terminal {
  readonly name: string;
  readonly processId: Thenable<number>;
  readonly creationOptions: Readonly<vscode.TerminalOptions>;
  readonly exitStatus: vscode.TerminalExitStatus | undefined;

  private commands: string[] = [];

  constructor(name: string) {
    this.name = name;
    this.processId = Promise.resolve(12345);
    this.creationOptions = { name };
  }

  sendText(text: string, shouldExecute?: boolean): void {
    this.commands.push(text);
  }

  show(preserveFocus?: boolean): void {
    // Mock implementation
  }

  hide(): void {
    // Mock implementation
  }

  dispose(): void {
    this.commands = [];
  }

  getCommands(): string[] {
    return [...this.commands];
  }

  clearCommands(): void {
    this.commands = [];
  }
}

/**
 * Mock QuickPick for testing quick pick interactions
 */
export class MockQuickPick<T extends vscode.QuickPickItem> implements vscode.QuickPick<T> {
  value: string = '';
  placeholder: string | undefined;
  readonly onDidChangeValue = new vscode.EventEmitter<string>().event;
  readonly onDidAccept = new vscode.EventEmitter<void>().event;
  buttons: readonly vscode.QuickInputButton[] = [];
  readonly onDidTriggerButton = new vscode.EventEmitter<vscode.QuickInputButton>().event;
  readonly onDidTriggerItemButton = new vscode.EventEmitter<vscode.QuickPickItemButtonEvent<T>>().event;
  items: readonly T[] = [];
  canSelectMany: boolean = false;
  matchOnDescription: boolean = false;
  matchOnDetail: boolean = false;
  keepScrollPosition?: boolean;
  activeItems: readonly T[] = [];
  readonly onDidChangeActive = new vscode.EventEmitter<readonly T[]>().event;
  selectedItems: readonly T[] = [];
  readonly onDidChangeSelection = new vscode.EventEmitter<readonly T[]>().event;
  title: string | undefined;
  step: number | undefined;
  totalSteps: number | undefined;
  enabled: boolean = true;
  busy: boolean = false;
  ignoreFocusOut: boolean = false;
  readonly onDidHide = new vscode.EventEmitter<void>().event;

  show(): void {}
  hide(): void {}
  dispose(): void {}
}
