import { EnzymeDiagnosticsProvider } from './enzyme-diagnostics';
import type * as vscode from 'vscode';

/**
 *
 * @param context
 */
export function registerDiagnostics(context: vscode.ExtensionContext): void {
  const diagnosticsProvider = new EnzymeDiagnosticsProvider();
  diagnosticsProvider.activate(context);
}

export { EnzymeDiagnosticsProvider };
export * from './rules/route-rules';
export * from './rules/component-rules';
export * from './rules/performance-rules';
export * from './rules/security-rules';
