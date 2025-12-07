/**
 * @file Configuration Validator
 * @description Real-time validation for Enzyme configuration files
 */

import * as vscode from 'vscode';
import {
  enzymeConfigSchema,
  schemaRegistry,
  type SchemaKey,
  type EnzymeConfigSchema,
} from './config-schema';
import type { z } from 'zod';

// =============================================================================
// Types
// =============================================================================

/**
 * Validation error with location
 */
export interface ValidationError {
  message: string;
  path: string[];
  line?: number;
  column?: number;
  severity: vscode.DiagnosticSeverity;
  suggestion?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  schemaVersion?: string;
}

/**
 * Schema version info
 */
export interface SchemaVersion {
  version: string;
  minVersion?: string;
  maxVersion?: string;
  deprecated?: boolean;
  migrationGuide?: string;
}

// =============================================================================
// Config Validator
// =============================================================================

/**
 * Configuration validator with real-time support
 */
export class ConfigValidator {
  private readonly diagnosticCollection: vscode.DiagnosticCollection;
  private readonly schemaVersions = new Map<string, SchemaVersion>();

  /**
   *
   */
  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('enzyme-config');
    this.initializeSchemaVersions();
  }

  /**
   * Initialize schema versions
   */
  private initializeSchemaVersions(): void {
    this.schemaVersions.set('1.0.0', {
      version: '1.0.0',
      minVersion: '1.0.0',
      maxVersion: '1.9.9',
    });

    this.schemaVersions.set('2.0.0', {
      version: '2.0.0',
      minVersion: '2.0.0',
    });
  }

  /**
   * Validate configuration object
   * @param config
   */
  public validate(config: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      const result = enzymeConfigSchema.safeParse(config);

      if (!result.success) {
        for (const error of result.error.issues) {
          const suggestion = this.getSuggestion(error);
          const validationError: ValidationError = {
            message: error.message,
            path: error.path.map(String),
            severity: vscode.DiagnosticSeverity.Error,
            ...(suggestion !== undefined && { suggestion }),
          };
          errors.push(validationError);
        }
      }

      // Additional validation checks
      if (result.success) {
        const additionalValidation = this.validateAdditionalRules(result.data);
        warnings.push(...additionalValidation.warnings);
        errors.push(...additionalValidation.errors);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [{
          message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          path: [],
          severity: vscode.DiagnosticSeverity.Error,
        }],
        warnings: [],
      };
    }
  }

  /**
   * Validate document content
   * @param document
   */
  public async validateDocument(document: vscode.TextDocument): Promise<ValidationResult> {
    try {
      const text = document.getText();
      const config = this.parseDocument(text);
      const result = this.validate(config);

      // Add line/column information
      result.errors = result.errors.map((error) => this.addLocationInfo(error, text));
      result.warnings = result.warnings.map((warning) => this.addLocationInfo(warning, text));

      // Update diagnostics
      this.updateDiagnostics(document, result);

      return result;
    } catch (error) {
      return {
        valid: false,
        errors: [{
          message: `Failed to parse document: ${error instanceof Error ? error.message : 'Unknown error'}`,
          path: [],
          severity: vscode.DiagnosticSeverity.Error,
          line: 0,
          column: 0,
        }],
        warnings: [],
      };
    }
  }

  /**
   * Parse document text to config object
   * @param text
   */
  private parseDocument(text: string): unknown {
    // Remove comments
    const cleanText = text.replace(/\/\*[\S\s]*?\*\/|\/\/.*/g, '');

    // Try to extract config object
    const exportMatch = /export\s+default\s+([\S\s]*?)(?:;|\n|$)/.exec(cleanText);
    if (exportMatch?.[1]) {
      // Simple JSON parse (in production, use proper TS parser)
      const configString = exportMatch[1]
        .replace(/([,{]\s*)(\w+):/g, '$1"$2":')
        .replace(/'/g, '"')
        .replace(/,(\s*[\]}])/g, '$1')
        .replace(/defineConfig\(([\S\s]*)\)/, '$1');

      return JSON.parse(configString);
    }

    // Try as pure JSON
    return JSON.parse(text);
  }

  /**
   * Add line/column information to error
   * @param error
   * @param text
   */
  private addLocationInfo(error: ValidationError, text: string): ValidationError {
    if (error.path.length === 0) {
      return error;
    }

    const lastPath = error.path[error.path.length - 1];
    if (!lastPath) {
      return error;
    }
    const regex = new RegExp(`["']?${lastPath}["']?\\s*:`, 'g');
    const match = regex.exec(text);

    if (match?.index !== undefined) {
      const lines = text.slice(0, Math.max(0, match.index)).split('\n');
      const lastLine = lines[lines.length - 1];
      if (lastLine !== undefined) {
        error.line = lines.length - 1;
        error.column = lastLine.length;
      }
    }

    return error;
  }

  /**
   * Update VS Code diagnostics
   * @param document
   * @param result
   */
  private updateDiagnostics(document: vscode.TextDocument, result: ValidationResult): void {
    const diagnostics: vscode.Diagnostic[] = [];

    const allIssues = [...result.errors, ...result.warnings];

    for (const issue of allIssues) {
      const line = issue.line ?? 0;
      const column = issue.column ?? 0;

      const range = new vscode.Range(
        new vscode.Position(line, column),
        new vscode.Position(line, column + 100) // Approximate end
      );

      const diagnostic = new vscode.Diagnostic(
        range,
        issue.message,
        issue.severity
      );

      diagnostic.source = 'enzyme';
      diagnostic.code = issue.path.join('.');

      if (issue.suggestion) {
        diagnostic.relatedInformation = [
          new vscode.DiagnosticRelatedInformation(
            new vscode.Location(document.uri, range),
            issue.suggestion
          ),
        ];
      }

      diagnostics.push(diagnostic);
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  /**
   * Get suggestion for error
   * @param error
   */
  private getSuggestion(error: z.ZodIssue): string | undefined {
    switch (error.code) {
      case 'invalid_type':
        return `Expected ${(error as any).expected}, received ${(error as any).received}`;

      case 'invalid_value':
        return `Invalid value provided`;

      case 'too_small':
        return `Minimum value: ${(error as any).minimum}`;

      case 'too_big':
        return `Maximum value: ${(error as any).maximum}`;

      default:
        return undefined;
    }
  }

  /**
   * Validate additional business rules
   * @param config
   */
  private validateAdditionalRules(config: EnzymeConfigSchema): {
    errors: ValidationError[];
    warnings: ValidationError[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check for production warnings
    if (config.environment === 'production') {
      if (config.devServer) {
        warnings.push({
          message: 'Dev server configuration should not be used in production',
          path: ['devServer'],
          severity: vscode.DiagnosticSeverity.Warning,
          suggestion: 'Remove devServer configuration for production',
        });
      }

      if (config.build?.sourcemap === true) {
        warnings.push({
          message: 'Source maps enabled in production',
          path: ['build', 'sourcemap'],
          severity: vscode.DiagnosticSeverity.Warning,
          suggestion: 'Consider disabling source maps in production',
        });
      }
    }

    // Check for conflicting settings
    if (config.performance?.sourceMaps === false && config.build?.sourcemap === true) {
      warnings.push({
        message: 'Conflicting source map settings',
        path: ['performance', 'sourceMaps'],
        severity: vscode.DiagnosticSeverity.Warning,
        suggestion: 'Ensure performance.sourceMaps and build.sourcemap are aligned',
      });
    }

    // Check for missing required production configs
    if (config.environment === 'production') {
      if (!config.monitoring?.sentry?.dsn) {
        warnings.push({
          message: 'No error monitoring configured for production',
          path: ['monitoring', 'sentry', 'dsn'],
          severity: vscode.DiagnosticSeverity.Information,
          suggestion: 'Consider adding Sentry DSN for error tracking',
        });
      }
    }

    // Validate route paths
    if (config.routes?.routes) {
      for (let i = 0; i < config.routes.routes.length; i++) {
        const route = config.routes.routes[i];
        if (route?.path && !route.path.startsWith('/')) {
          errors.push({
            message: 'Route path must start with /',
            path: ['routes', 'routes', i.toString(), 'path'],
            severity: vscode.DiagnosticSeverity.Error,
            suggestion: `Change "${route.path}" to "/${route.path}"`,
          });
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate specific schema
   * @param key
   * @param config
   */
  public validateWithSchema<K extends SchemaKey>(
    key: K,
    config: unknown
  ): ValidationResult {
    const schema = schemaRegistry[key];
    const result = schema.safeParse(config);

    const errors: ValidationError[] = [];

    if (!result.success) {
      for (const error of result.error.issues) {
        const suggestion = this.getSuggestion(error);
        errors.push({
          message: error.message,
          path: error.path.map(String),
          severity: vscode.DiagnosticSeverity.Error,
          ...(suggestion !== undefined && { suggestion }),
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * Clear diagnostics for document
   * @param document
   */
  public clearDiagnostics(document: vscode.TextDocument): void {
    this.diagnosticCollection.delete(document.uri);
  }

  /**
   * Clear all diagnostics
   */
  public clearAll(): void {
    this.diagnosticCollection.clear();
  }

  /**
   * Dispose validator
   */
  public dispose(): void {
    this.diagnosticCollection.dispose();
  }
}

// =============================================================================
// Validator Provider
// =============================================================================

/**
 * Provides real-time validation for config files
 */
export class ConfigValidatorProvider {
  private readonly validator: ConfigValidator;
  private readonly disposables: vscode.Disposable[] = [];

  /**
   *
   */
  constructor() {
    this.validator = new ConfigValidator();
    this.registerValidation();
  }

  /**
   * Register validation for config files
   */
  private registerValidation(): void {
    // Validate on open
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument((document: vscode.TextDocument) => {
        if (this.isConfigFile(document)) {
          this.validator.validateDocument(document);
        }
      })
    );

    // Validate on change
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event: vscode.TextDocumentChangeEvent) => {
        if (this.isConfigFile(event.document)) {
          this.validator.validateDocument(event.document);
        }
      })
    );

    // Clear on close
    this.disposables.push(
      vscode.workspace.onDidCloseTextDocument((document: vscode.TextDocument) => {
        if (this.isConfigFile(document)) {
          this.validator.clearDiagnostics(document);
        }
      })
    );

    // Validate all open documents
    vscode.workspace.textDocuments.forEach((document) => {
      if (this.isConfigFile(document)) {
        this.validator.validateDocument(document);
      }
    });
  }

  /**
   * Check if document is a config file
   * @param document
   */
  private isConfigFile(document: vscode.TextDocument): boolean {
    const fileName = document.fileName.toLowerCase();
    return (
      fileName.endsWith('enzyme.config.ts') ||
      fileName.endsWith('enzyme.config.js') ||
      fileName.endsWith('enzyme.config.json') ||
      fileName.endsWith('.enzymerc') ||
      fileName.endsWith('.enzymerc.json')
    );
  }

  /**
   * Get validator instance
   */
  public getValidator(): ConfigValidator {
    return this.validator;
  }

  /**
   * Dispose provider
   */
  public dispose(): void {
    this.validator.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

let validatorProvider: ConfigValidatorProvider | null = null;

/**
 * Get global validator provider
 */
export function getValidatorProvider(): ConfigValidatorProvider {
  if (!validatorProvider) {
    validatorProvider = new ConfigValidatorProvider();
  }
  return validatorProvider;
}

/**
 * Get validator instance
 */
export function getValidator(): ConfigValidator {
  return getValidatorProvider().getValidator();
}
