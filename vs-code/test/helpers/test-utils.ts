import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Create a mock extension context for testing
 */
export function createMockContext(): vscode.ExtensionContext {
  const workspaceRoot = path.resolve(__dirname, '../fixtures/sample-project');

  return {
    subscriptions: [],
    workspaceState: {
      get: (key: string) => undefined,
      update: async (key: string, value: any) => {},
      keys: () => []
    },
    globalState: {
      get: (key: string) => undefined,
      update: async (key: string, value: any) => {},
      keys: () => [],
      setKeysForSync: (keys: string[]) => {}
    },
    extensionPath: workspaceRoot,
    extensionUri: vscode.Uri.file(workspaceRoot),
    environmentVariableCollection: {} as any,
    extensionMode: vscode.ExtensionMode.Test,
    storageUri: vscode.Uri.file(path.join(workspaceRoot, '.storage')),
    storagePath: path.join(workspaceRoot, '.storage'),
    globalStorageUri: vscode.Uri.file(path.join(workspaceRoot, '.global-storage')),
    globalStoragePath: path.join(workspaceRoot, '.global-storage'),
    logUri: vscode.Uri.file(path.join(workspaceRoot, '.log')),
    logPath: path.join(workspaceRoot, '.log'),
    asAbsolutePath: (relativePath: string) => path.join(workspaceRoot, relativePath),
    extension: {} as any,
    secrets: {} as any,
    languageModelAccessInformation: {} as any
  } as vscode.ExtensionContext;
}

/**
 * Create a mock text document
 */
export function createMockDocument(content: string, languageId: string = 'typescript'): vscode.TextDocument {
  const uri = vscode.Uri.file('/test/document.ts');

  return {
    uri,
    fileName: uri.fsPath,
    isUntitled: false,
    languageId,
    version: 1,
    isDirty: false,
    isClosed: false,
    save: async () => true,
    eol: vscode.EndOfLine.LF,
    lineCount: content.split('\n').length,
    lineAt: (line: number) => {
      const lines = content.split('\n');
      const text = lines[line] || '';
      return {
        lineNumber: line,
        text,
        range: new vscode.Range(line, 0, line, text.length),
        rangeIncludingLineBreak: new vscode.Range(line, 0, line + 1, 0),
        firstNonWhitespaceCharacterIndex: text.search(/\S/),
        isEmptyOrWhitespace: text.trim().length === 0
      };
    },
    offsetAt: (position: vscode.Position) => {
      const lines = content.split('\n');
      let offset = 0;
      for (let i = 0; i < position.line; i++) {
        offset += lines[i].length + 1; // +1 for newline
      }
      return offset + position.character;
    },
    positionAt: (offset: number) => {
      const lines = content.split('\n');
      let currentOffset = 0;
      for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length + 1;
        if (currentOffset + lineLength > offset) {
          return new vscode.Position(i, offset - currentOffset);
        }
        currentOffset += lineLength;
      }
      return new vscode.Position(0, 0);
    },
    getText: (range?: vscode.Range) => {
      if (!range) return content;
      const start = content.split('\n').slice(0, range.start.line).join('\n').length + range.start.character;
      const end = content.split('\n').slice(0, range.end.line).join('\n').length + range.end.character;
      return content.substring(start, end);
    },
    getWordRangeAtPosition: (position: vscode.Position) => {
      const line = content.split('\n')[position.line];
      const wordPattern = /\w+/g;
      let match;
      while ((match = wordPattern.exec(line)) !== null) {
        if (match.index <= position.character && match.index + match[0].length >= position.character) {
          return new vscode.Range(position.line, match.index, position.line, match.index + match[0].length);
        }
      }
      return undefined;
    },
    validateRange: (range: vscode.Range) => range,
    validatePosition: (position: vscode.Position) => position
  } as vscode.TextDocument;
}

/**
 * Create a mock workspace folder
 */
export function createMockWorkspace(): vscode.WorkspaceFolder {
  const uri = vscode.Uri.file(path.resolve(__dirname, '../fixtures/sample-project'));
  return {
    uri,
    name: 'sample-project',
    index: 0
  };
}

/**
 * Wait for a condition to be true
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Activate the extension for testing
 */
export async function activateExtension(): Promise<vscode.Extension<any>> {
  const ext = vscode.extensions.getExtension('missionfabric.enzyme-vscode');
  if (!ext) {
    throw new Error('Extension not found');
  }

  if (!ext.isActive) {
    await ext.activate();
  }

  return ext;
}

/**
 * Get the extension instance
 */
export function getExtension(): vscode.Extension<any> | undefined {
  return vscode.extensions.getExtension('missionfabric.enzyme-vscode');
}

/**
 * Create a temporary file for testing
 */
export async function createTempFile(content: string, filename: string = 'test.ts'): Promise<vscode.Uri> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    throw new Error('No workspace folder found');
  }

  const uri = vscode.Uri.file(path.join(workspaceRoot, filename));
  const encoder = new TextEncoder();
  await vscode.workspace.fs.writeFile(uri, encoder.encode(content));

  return uri;
}

/**
 * Clean up temporary files
 */
export async function cleanupTempFile(uri: vscode.Uri): Promise<void> {
  try {
    await vscode.workspace.fs.delete(uri);
  } catch (err) {
    // Ignore errors
  }
}

/**
 * Open a document in the editor
 */
export async function openDocument(uri: vscode.Uri): Promise<vscode.TextEditor> {
  const document = await vscode.workspace.openTextDocument(uri);
  return await vscode.window.showTextDocument(document);
}

/**
 * Execute a command and wait for it to complete
 */
export async function executeCommand<T = any>(command: string, ...args: any[]): Promise<T> {
  return await vscode.commands.executeCommand<T>(command, ...args);
}

/**
 * Get all diagnostics for a document
 */
export function getDiagnostics(uri: vscode.Uri): vscode.Diagnostic[] {
  return vscode.languages.getDiagnostics(uri);
}

/**
 * Wait for diagnostics to be updated
 */
export async function waitForDiagnostics(uri: vscode.Uri, timeout: number = 5000): Promise<vscode.Diagnostic[]> {
  await waitForCondition(() => {
    const diagnostics = getDiagnostics(uri);
    return diagnostics.length > 0;
  }, timeout);

  return getDiagnostics(uri);
}
