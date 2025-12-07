import * as vscode from 'vscode';
import { EnzymeDiagnosticsProvider } from './enzyme-diagnostics';

export function registerDiagnostics(context: vscode.ExtensionContext): void {
  const diagnosticsProvider = new EnzymeDiagnosticsProvider();
  diagnosticsProvider.activate(context);
}

export { EnzymeDiagnosticsProvider };
export * from './rules/route-rules';
export * from './rules/component-rules';
export * from './rules/performance-rules';
export * from './rules/security-rules';
