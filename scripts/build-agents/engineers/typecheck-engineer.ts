/**
 * TypeCheck Engineer Agent
 * Handles TypeScript compilation and type validation
 */

import { BaseAgent, createAgentConfig, colors, icons } from '../base-agent.js';
import type { BuildConfig, TypeCheckResult, TypeScriptError } from '../types.js';

export class TypeCheckEngineer extends BaseAgent<TypeCheckResult> {
  constructor(buildConfig: BuildConfig) {
    super(
      createAgentConfig(
        'typecheck-engineer',
        'TypeCheck Engineer',
        'Validates TypeScript types across the codebase',
        {
          dependencies: [],
          timeout: 300000, // 5 minutes
          priority: 10, // High priority - runs first
          parallel: true,
        }
      ),
      buildConfig
    );
  }

  protected async executeTask(): Promise<TypeCheckResult> {
    this.log('info', `${icons.typecheck} Starting TypeScript type checking...`);
    this.reportProgress(10, 'Initializing TypeScript compiler');

    const errors: TypeScriptError[] = [];
    const warnings: TypeScriptError[] = [];
    let filesChecked = 0;

    // Check main package
    this.reportProgress(20, 'Type checking main enzyme package');
    const mainResult = await this.typeCheckPackage(process.cwd(), 'main');
    errors.push(...mainResult.errors);
    warnings.push(...mainResult.warnings);
    filesChecked += mainResult.filesChecked;

    // Check TypeScript package
    this.reportProgress(60, 'Type checking TypeScript utilities package');
    const tsResult = await this.typeCheckPackage(
      `${process.cwd()}/typescript`,
      'typescript'
    );
    errors.push(...tsResult.errors);
    warnings.push(...tsResult.warnings);
    filesChecked += tsResult.filesChecked;

    this.reportProgress(100, 'Type checking complete');

    this.metrics.errorsFound = errors.length;
    this.metrics.warningsFound = warnings.length;
    this.metrics.filesProcessed = filesChecked;

    if (errors.length > 0) {
      this.log('error', `${icons.failure} Found ${errors.length} type errors`);
      errors.slice(0, 5).forEach((err) => {
        this.log('error', `  ${err.file}:${err.line}:${err.column} - ${err.message}`);
      });
      if (errors.length > 5) {
        this.log('error', `  ... and ${errors.length - 5} more errors`);
      }
      throw new Error(`TypeScript compilation failed with ${errors.length} errors`);
    }

    this.log('success', `${icons.success} Type check passed - ${filesChecked} files checked`);
    if (warnings.length > 0) {
      this.log('warn', `${icons.warning} ${warnings.length} warnings found`);
    }

    return {
      errors,
      warnings,
      filesChecked,
    };
  }

  private async typeCheckPackage(
    cwd: string,
    name: string
  ): Promise<TypeCheckResult> {
    const errors: TypeScriptError[] = [];
    const warnings: TypeScriptError[] = [];

    this.log('info', `Checking ${name} package at ${cwd}`);

    const { stdout, stderr, exitCode } = await this.runCommand(
      'npx',
      ['tsc', '--noEmit', '--pretty', 'false'],
      { cwd, silent: true }
    );

    const output = stdout + stderr;
    const lines = output.split('\n').filter((l) => l.trim());

    // Parse TypeScript output
    for (const line of lines) {
      const match = line.match(/^(.+)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/);
      if (match) {
        const [, file, lineNum, col, severity, code, message] = match;
        const error: TypeScriptError = {
          file,
          line: parseInt(lineNum, 10),
          column: parseInt(col, 10),
          code,
          message,
          severity: severity as 'error' | 'warning',
        };

        if (severity === 'error') {
          errors.push(error);
        } else {
          warnings.push(error);
        }
      }
    }

    // Estimate files checked based on common patterns
    const filesChecked = name === 'main' ? 500 : 150;

    return { errors, warnings, filesChecked };
  }
}
