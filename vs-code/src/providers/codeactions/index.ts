import * as vscode from 'vscode';
import { EnzymeCodeActionProvider } from './enzyme-code-action-provider';
import { executeExtractFeature } from './refactorings/extract-feature';
import { executeExtractHook } from './refactorings/extract-hook';

export function registerCodeActionProviders(context: vscode.ExtensionContext): void {
  // Register the main code action provider
  const codeActionProvider = new EnzymeCodeActionProvider();

  const codeActionDisposable = vscode.languages.registerCodeActionsProvider(
    [
      { scheme: 'file', language: 'typescript' },
      { scheme: 'file', language: 'typescriptreact' },
      { scheme: 'file', language: 'javascript' },
      { scheme: 'file', language: 'javascriptreact' },
    ],
    codeActionProvider,
    {
      providedCodeActionKinds: EnzymeCodeActionProvider.providedCodeActionKinds,
    }
  );

  context.subscriptions.push(codeActionDisposable);

  // Register refactoring commands
  context.subscriptions.push(
    vscode.commands.registerCommand('enzyme.extractFeature', executeExtractFeature)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('enzyme.extractHook', executeExtractHook)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('enzyme.extractComponent', async (uri, range) => {
      vscode.window.showInformationMessage('Extract Component - Coming soon!');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('enzyme.splitComponent', async (uri, range) => {
      vscode.window.showInformationMessage('Split Component - Coming soon!');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('enzyme.splitStore', async (uri, range) => {
      vscode.window.showInformationMessage('Split Store - Coming soon!');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('enzyme.extractStoreSlice', async (uri, range) => {
      vscode.window.showInformationMessage('Extract Store Slice - Coming soon!');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('enzyme.removeUnusedImports', async (uri) => {
      vscode.window.showInformationMessage('Remove Unused Imports - Coming soon!');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('enzyme.organizeImports', async (uri) => {
      await vscode.commands.executeCommand('editor.action.organizeImports', uri);
    })
  );
}

export { EnzymeCodeActionProvider };
export * from './quick-fixes/route-quick-fixes';
export * from './quick-fixes/component-quick-fixes';
export * from './quick-fixes/hook-quick-fixes';
export * from './quick-fixes/store-quick-fixes';
export * from './quick-fixes/import-quick-fixes';
export * from './refactorings/extract-feature';
export * from './refactorings/extract-hook';
export * from './refactorings/convert-to-lazy-route';
