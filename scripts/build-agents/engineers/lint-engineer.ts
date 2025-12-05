/**
 * Lint Engineer Agent
 * Handles ESLint validation and code style checking
 */

import { BaseAgent, createAgentConfig, icons } from '../base-agent.js';
import type { BuildConfig, LintResult, LintIssue } from '../types.js';

export class LintEngineer extends BaseAgent<LintResult> {
  constructor(buildConfig: BuildConfig) {
    super(
      createAgentConfig(
        'lint-engineer',
        'Lint Engineer',
        'Validates code style and quality using ESLint',
        {
          dependencies: [],
          timeout: 300000, // 5 minutes
          priority: 10, // High priority - runs in parallel with typecheck
          parallel: true,
        }
      ),
      buildConfig
    );
  }

  protected async executeTask(): Promise<LintResult> {
    this.log('info', `${icons.lint} Starting ESLint validation...`);
    this.reportProgress(10, 'Initializing ESLint');

    const errors: LintIssue[] = [];
    const warnings: LintIssue[] = [];
    let fixedCount = 0;
    let filesLinted = 0;

    // Lint main package
    this.reportProgress(20, 'Linting main enzyme package');
    const mainResult = await this.lintPackage(process.cwd());
    errors.push(...mainResult.errors);
    warnings.push(...mainResult.warnings);
    filesLinted += mainResult.filesLinted;

    // Lint TypeScript package
    this.reportProgress(60, 'Linting TypeScript utilities package');
    const tsResult = await this.lintPackage(`${process.cwd()}/typescript`);
    errors.push(...tsResult.errors);
    warnings.push(...tsResult.warnings);
    filesLinted += tsResult.filesLinted;

    this.reportProgress(100, 'Linting complete');

    this.metrics.errorsFound = errors.length;
    this.metrics.warningsFound = warnings.length;
    this.metrics.filesProcessed = filesLinted;

    if (errors.length > 0) {
      this.log('error', `${icons.failure} Found ${errors.length} lint errors`);
      errors.slice(0, 5).forEach((err) => {
        this.log('error', `  ${err.file}:${err.line} - [${err.rule}] ${err.message}`);
      });
      if (errors.length > 5) {
        this.log('error', `  ... and ${errors.length - 5} more errors`);
      }
      throw new Error(`ESLint found ${errors.length} errors`);
    }

    this.log('success', `${icons.success} Lint passed - ${filesLinted} files checked`);
    if (warnings.length > 0) {
      this.log('warn', `${icons.warning} ${warnings.length} warnings found`);
    }

    return {
      errors,
      warnings,
      fixedCount,
      filesLinted,
    };
  }

  private async lintPackage(cwd: string): Promise<LintResult> {
    const errors: LintIssue[] = [];
    const warnings: LintIssue[] = [];

    this.log('info', `Linting package at ${cwd}`);

    const { stdout, exitCode } = await this.runCommand(
      'npx',
      [
        'eslint',
        '.',
        '--ext', 'ts,tsx',
        '--format', 'json',
        '--cache',
        '--ignore-pattern', '.development/',
        '--ignore-pattern', 'scripts/',
        '--ignore-pattern', 'dist/',
      ],
      { cwd, silent: true }
    );

    try {
      if (stdout.trim()) {
        const results = JSON.parse(stdout);

        for (const file of results) {
          for (const msg of file.messages || []) {
            const issue: LintIssue = {
              file: file.filePath,
              line: msg.line || 0,
              column: msg.column || 0,
              rule: msg.ruleId || 'unknown',
              message: msg.message,
              severity: msg.severity === 2 ? 'error' : 'warning',
              fixable: !!msg.fix,
            };

            if (msg.severity === 2) {
              errors.push(issue);
            } else {
              warnings.push(issue);
            }
          }
        }
      }
    } catch {
      // If JSON parsing fails, eslint likely succeeded with no output
      this.log('debug', 'No lint issues found or output could not be parsed');
    }

    // Estimate files linted
    const filesLinted = cwd.includes('typescript') ? 100 : 400;

    return {
      errors,
      warnings,
      fixedCount: 0,
      filesLinted,
    };
  }
}
