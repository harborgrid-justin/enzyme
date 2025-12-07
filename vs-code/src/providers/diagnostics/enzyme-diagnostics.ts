import * as vscode from 'vscode';
import { debounce } from '../../utils/performance-utils';
import { ComponentRules } from './rules/component-rules';
import { PerformanceRules } from './rules/performance-rules';
import { RouteRules } from './rules/route-rules';
import { SecurityRules } from './rules/security-rules';

/**
 * PERFORMANCE: Enzyme diagnostics provider with optimized debouncing
 */
export class EnzymeDiagnosticsProvider {
  private readonly diagnosticCollection: vscode.DiagnosticCollection;
  private readonly routeRules: RouteRules;
  private readonly componentRules: ComponentRules;
  private readonly performanceRules: PerformanceRules;
  private readonly securityRules: SecurityRules;
  private debouncedAnalyze: (...args: unknown[]) => void;
  private configChangeListener?: vscode.Disposable;

  /**
   *
   */
  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('enzyme');
    this.routeRules = new RouteRules();
    this.componentRules = new ComponentRules();
    this.performanceRules = new PerformanceRules();
    this.securityRules = new SecurityRules();

    // Read debounce delay from configuration
    const config = vscode.workspace.getConfiguration('enzyme');
    const debounceDelay = config.get<number>('analysis.debounceMs', 500); // PERFORMANCE: Increased default from 300ms to 500ms

    // PERFORMANCE: Use utility debounce function
    this.debouncedAnalyze = debounce(((document: vscode.TextDocument) => {
      this.analyzeDocument(document);
    }) as (...args: unknown[]) => void, debounceDelay);
  }

  /**
   *
   * @param context
   */
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

    // PERFORMANCE: Use optimized debounced analysis
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

    // PERFORMANCE: Watch for configuration changes and recreate debounced function
    this.configChangeListener = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('enzyme.analysis.debounceMs')) {
        const config = vscode.workspace.getConfiguration('enzyme');
        const debounceDelay = config.get<number>('analysis.debounceMs', 500);
        this.debouncedAnalyze = debounce(((document: vscode.TextDocument) => {
          this.analyzeDocument(document);
        }) as (...args: unknown[]) => void, debounceDelay);
      }

      if (e.affectsConfiguration('enzyme.diagnostics.enabled')) {
        // Re-analyze all open documents when diagnostics are toggled
        vscode.workspace.textDocuments.forEach((document) => {
          this.analyzeDocument(document);
        });
      }
    });

    context.subscriptions.push(this.diagnosticCollection);
    context.subscriptions.push(this.configChangeListener);
  }

  /**
   * PERFORMANCE: Analyze document with debouncing handled by utility function
   * @param document
   */
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

  /**
   *
   * @param document
   */
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

  /**
   *
   */
  public clear(): void {
    this.diagnosticCollection.clear();
  }

  /**
   * PERFORMANCE: Dispose resources properly
   */
  public dispose(): void {
    this.diagnosticCollection.dispose();
    this.configChangeListener?.dispose();
  }
}

/**
 *
 * @param range
 * @param message
 * @param severity
 * @param code
 * @param relatedInformation
 */
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
