import * as vscode from 'vscode';
import { RouteRules } from './rules/route-rules';
import { ComponentRules } from './rules/component-rules';
import { PerformanceRules } from './rules/performance-rules';
import { SecurityRules } from './rules/security-rules';

export class EnzymeDiagnosticsProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private routeRules: RouteRules;
  private componentRules: ComponentRules;
  private performanceRules: PerformanceRules;
  private securityRules: SecurityRules;
  private debounceTimer?: NodeJS.Timeout;
  private debounceDelay: number;
  private configChangeListener?: vscode.Disposable;

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('enzyme');
    this.routeRules = new RouteRules();
    this.componentRules = new ComponentRules();
    this.performanceRules = new PerformanceRules();
    this.securityRules = new SecurityRules();

    // Read debounce delay from configuration
    const config = vscode.workspace.getConfiguration('enzyme');
    this.debounceDelay = config.get<number>('analysis.debounceMs', 300);
  }

  public activate(context: vscode.ExtensionContext): void {
    // Analyze open documents
    if (vscode.window.activeTextEditor) {
      this.analyzeDocument(vscode.window.activeTextEditor.document);
    }

    // Watch for document changes
    context.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument((document) => {
        this.analyzeDocument(document);
      })
    );

    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        this.debouncedAnalyze(event.document);
      })
    );

    context.subscriptions.push(
      vscode.workspace.onDidCloseTextDocument((document) => {
        this.diagnosticCollection.delete(document.uri);
      })
    );

    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.analyzeDocument(editor.document);
        }
      })
    );

    // Watch for configuration changes
    this.configChangeListener = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('enzyme.analysis.debounceMs')) {
        const config = vscode.workspace.getConfiguration('enzyme');
        this.debounceDelay = config.get<number>('analysis.debounceMs', 300);
      }

      if (e.affectsConfiguration('enzyme.diagnostics.enabled')) {
        // Re-analyze all open documents when diagnostics are toggled
        vscode.workspace.textDocuments.forEach((doc) => {
          this.analyzeDocument(doc);
        });
      }
    });

    context.subscriptions.push(this.diagnosticCollection);
    context.subscriptions.push(this.configChangeListener);
  }

  private debouncedAnalyze(document: vscode.TextDocument): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.analyzeDocument(document);
    }, this.debounceDelay);
  }

  public async analyzeDocument(document: vscode.TextDocument): Promise<void> {
    // Only analyze TypeScript/JavaScript files
    if (!this.shouldAnalyze(document)) {
      return;
    }

    const diagnostics: vscode.Diagnostic[] = [];

    try {
      // Run all rule checks
      diagnostics.push(...(await this.routeRules.analyze(document)));
      diagnostics.push(...(await this.componentRules.analyze(document)));
      diagnostics.push(...(await this.performanceRules.analyze(document)));
      diagnostics.push(...(await this.securityRules.analyze(document)));

      // Set diagnostics for this document
      this.diagnosticCollection.set(document.uri, diagnostics);
    } catch (error) {
      console.error('Error analyzing document:', error);
    }
  }

  private shouldAnalyze(document: vscode.TextDocument): boolean {
    const config = vscode.workspace.getConfiguration('enzyme', document.uri);
    const enableDiagnostics = config.get<boolean>('diagnostics.enabled', true);

    if (!enableDiagnostics) {
      return false;
    }

    // Only analyze TS/JS files
    const language = document.languageId;
    const supportedLanguages = ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'];

    if (!supportedLanguages.includes(language)) {
      return false;
    }

    // Skip node_modules
    if (document.uri.fsPath.includes('node_modules')) {
      return false;
    }

    return true;
  }

  public clear(): void {
    this.diagnosticCollection.clear();
  }

  public dispose(): void {
    this.diagnosticCollection.dispose();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}

export function createDiagnostic(
  range: vscode.Range,
  message: string,
  severity: vscode.DiagnosticSeverity,
  code: string,
  relatedInformation?: vscode.DiagnosticRelatedInformation[]
): vscode.Diagnostic {
  const diagnostic = new vscode.Diagnostic(range, message, severity);
  diagnostic.source = 'enzyme';
  diagnostic.code = code;

  if (relatedInformation) {
    diagnostic.relatedInformation = relatedInformation;
  }

  return diagnostic;
}
