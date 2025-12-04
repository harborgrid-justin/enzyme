/**
 * Validation Engine
 *
 * Validates generated code against Enzyme standards and best practices.
 * Provides pre-commit hook integration.
 */

import { readFileSync, existsSync } from 'fs';
import { relative, basename, extname } from 'path';

export interface ValidationRule {
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  validate: (context: ValidationContext) => ValidationIssue[];
}

export interface ValidationContext {
  file: string;
  content: string;
  type: 'component' | 'hook' | 'route' | 'util' | 'test' | 'unknown';
  cwd: string;
}

export interface ValidationIssue {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  fix?: string;
}

export interface ValidationResult {
  file: string;
  valid: boolean;
  issues: ValidationIssue[];
}

export interface ValidateOptions {
  cwd?: string;
  fix?: boolean;
  rules?: string[];
}

/**
 * Validation Engine
 */
export class ValidationEngine {
  private rules: ValidationRule[] = [];
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    this.registerDefaultRules();
  }

  /**
   * Register validation rule
   */
  register(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  /**
   * Validate file
   */
  validateFile(filePath: string, options: ValidateOptions = {}): ValidationResult {
    const content = readFileSync(filePath, 'utf-8');
    const type = this.detectFileType(filePath);

    const context: ValidationContext = {
      file: filePath,
      content,
      type,
      cwd: options.cwd || this.cwd,
    };

    const issues: ValidationIssue[] = [];

    // Filter rules if specified
    const applicableRules = options.rules
      ? this.rules.filter((r) => options.rules!.includes(r.name))
      : this.rules;

    for (const rule of applicableRules) {
      const ruleIssues = rule.validate(context);
      issues.push(...ruleIssues);
    }

    return {
      file: relative(this.cwd, filePath),
      valid: !issues.some((i) => i.severity === 'error'),
      issues,
    };
  }

  /**
   * Validate multiple files
   */
  validateFiles(files: string[], options: ValidateOptions = {}): ValidationResult[] {
    return files.map((file) => this.validateFile(file, options));
  }

  /**
   * Detect file type
   */
  private detectFileType(filePath: string): ValidationContext['type'] {
    const fileName = basename(filePath);
    const content = readFileSync(filePath, 'utf-8');

    if (fileName.includes('.test.') || fileName.includes('.spec.')) {
      return 'test';
    }

    if (fileName.startsWith('use') && extname(filePath) === '.ts') {
      return 'hook';
    }

    if (filePath.includes('/routes/') || filePath.includes('/pages/')) {
      return 'route';
    }

    if (filePath.includes('/components/')) {
      return 'component';
    }

    if (content.includes('export function') || content.includes('export const')) {
      return 'util';
    }

    return 'unknown';
  }

  /**
   * Register default validation rules
   */
  private registerDefaultRules(): void {
    // Component naming convention
    this.register({
      name: 'component-naming',
      description: 'Components must use PascalCase naming',
      severity: 'error',
      validate: (context) => {
        if (context.type !== 'component') {
          return [];
        }

        const fileName = basename(context.file, extname(context.file));
        const isPascalCase = /^[A-Z][a-zA-Z0-9]*$/.test(fileName);

        if (!isPascalCase) {
          return [
            {
              rule: 'component-naming',
              severity: 'error',
              message: `Component file name must be PascalCase, got: ${fileName}`,
              fix: `Rename to ${fileName.charAt(0).toUpperCase() + fileName.slice(1)}`,
            },
          ];
        }

        return [];
      },
    });

    // Hook naming convention
    this.register({
      name: 'hook-naming',
      description: 'Hooks must start with "use"',
      severity: 'error',
      validate: (context) => {
        if (context.type !== 'hook') {
          return [];
        }

        const fileName = basename(context.file, extname(context.file));

        if (!fileName.startsWith('use')) {
          return [
            {
              rule: 'hook-naming',
              severity: 'error',
              message: `Hook file name must start with "use", got: ${fileName}`,
              fix: `Rename to use${fileName.charAt(0).toUpperCase() + fileName.slice(1)}`,
            },
          ];
        }

        return [];
      },
    });

    // Required exports
    this.register({
      name: 'required-exports',
      description: 'Components must have default export',
      severity: 'error',
      validate: (context) => {
        if (context.type !== 'component') {
          return [];
        }

        const hasDefaultExport =
          context.content.includes('export default') ||
          (context.content.includes('export { ') &&
          context.content.includes('as default'));

        if (!hasDefaultExport) {
          return [
            {
              rule: 'required-exports',
              severity: 'error',
              message: 'Component must have a default export',
              fix: 'Add "export default ComponentName"',
            },
          ];
        }

        return [];
      },
    });

    // TypeScript types
    this.register({
      name: 'typescript-types',
      description: 'Components should have prop types defined',
      severity: 'warning',
      validate: (context) => {
        if (context.type !== 'component' || !context.file.endsWith('.tsx')) {
          return [];
        }

        const hasPropsInterface =
          context.content.includes('interface') &&
          context.content.includes('Props');

        const hasPropsType =
          context.content.includes('type') &&
          context.content.includes('Props');

        if (!hasPropsInterface && !hasPropsType) {
          return [
            {
              rule: 'typescript-types',
              severity: 'warning',
              message: 'Component should define prop types',
              fix: 'Add "interface ComponentNameProps { ... }"',
            },
          ];
        }

        return [];
      },
    });

    // Import organization
    this.register({
      name: 'import-organization',
      description: 'Imports should be organized',
      severity: 'info',
      validate: (context) => {
        const lines = context.content.split('\n');
        const importLines: number[] = [];

        lines.forEach((line, index) => {
          if (line.trim().startsWith('import ')) {
            importLines.push(index);
          }
        });

        // Check if imports are grouped
        if (importLines.length > 1) {
          const gaps = importLines.slice(1).map((line, i) => line - importLines[i] - 1);
          const hasGaps = gaps.some((gap) => gap > 1);

          if (hasGaps) {
            return [
              {
                rule: 'import-organization',
                severity: 'info',
                message: 'Imports should be grouped together',
                fix: 'Group all imports at the top of the file',
              },
            ];
          }
        }

        return [];
      },
    });

    // React hooks rules
    this.register({
      name: 'react-hooks-rules',
      description: 'React hooks must follow rules of hooks',
      severity: 'error',
      validate: (context) => {
        const issues: ValidationIssue[] = [];

        // Check for hooks in conditions
        const conditionalHookPattern = /if\s*\([^)]*\)\s*\{[^}]*use[A-Z]/;
        if (conditionalHookPattern.test(context.content)) {
          issues.push({
            rule: 'react-hooks-rules',
            severity: 'error',
            message: 'Hooks cannot be called conditionally',
            fix: 'Move hook call outside of conditional',
          });
        }

        // Check for hooks in loops
        const loopHookPattern = /(for|while)\s*\([^)]*\)\s*\{[^}]*use[A-Z]/;
        if (loopHookPattern.test(context.content)) {
          issues.push({
            rule: 'react-hooks-rules',
            severity: 'error',
            message: 'Hooks cannot be called in loops',
            fix: 'Move hook call outside of loop',
          });
        }

        return issues;
      },
    });

    // Test coverage
    this.register({
      name: 'test-file-exists',
      description: 'Components should have test files',
      severity: 'warning',
      validate: (context) => {
        if (context.type !== 'component') {
          return [];
        }

        const testFile = context.file.replace(/\.(tsx?|jsx?)$/, '.test$1');
        const specFile = context.file.replace(/\.(tsx?|jsx?)$/, '.spec$1');

        if (!existsSync(testFile) && !existsSync(specFile)) {
          return [
            {
              rule: 'test-file-exists',
              severity: 'warning',
              message: 'Component should have a test file',
              fix: `Create ${basename(testFile)}`,
            },
          ];
        }

        return [];
      },
    });

    // Enzyme imports
    this.register({
      name: 'enzyme-imports',
      description: 'Use Enzyme framework imports',
      severity: 'info',
      validate: (context) => {
        const issues: ValidationIssue[] = [];

        // Check for direct React Router imports when routing feature is enabled
        if (context.content.includes("from 'react-router-dom'")) {
          issues.push({
            rule: 'enzyme-imports',
            severity: 'info',
            message: 'Consider using @missionfabric-js/enzyme/routing instead',
            fix: "import { useRouter } from '@missionfabric-js/enzyme/routing'",
          });
        }

        // Check for direct Zustand imports when state feature is enabled
        if (context.content.includes("from 'zustand'")) {
          issues.push({
            rule: 'enzyme-imports',
            severity: 'info',
            message: 'Consider using @missionfabric-js/enzyme/state instead',
            fix: "import { createStore } from '@missionfabric-js/enzyme/state'",
          });
        }

        return issues;
      },
    });

    // Code complexity
    this.register({
      name: 'component-complexity',
      description: 'Components should not be too complex',
      severity: 'warning',
      validate: (context) => {
        if (context.type !== 'component') {
          return [];
        }

        const lines = context.content.split('\n').length;
        const maxLines = 300;

        if (lines > maxLines) {
          return [
            {
              rule: 'component-complexity',
              severity: 'warning',
              message: `Component is too large (${lines} lines, max ${maxLines})`,
              fix: 'Consider splitting into smaller components',
            },
          ];
        }

        return [];
      },
    });

    // Accessibility
    this.register({
      name: 'accessibility',
      description: 'Components should be accessible',
      severity: 'warning',
      validate: (context) => {
        if (context.type !== 'component') {
          return [];
        }

        const issues: ValidationIssue[] = [];

        // Check for images without alt text
        if (/<img[^>]*(?<!alt=)[^>]*>/.test(context.content)) {
          issues.push({
            rule: 'accessibility',
            severity: 'warning',
            message: 'Images should have alt text',
            fix: 'Add alt attribute to img tags',
          });
        }

        // Check for buttons without aria-label
        if (/<button[^>]*>(?!.*<\/button>).*<\/button>/.test(context.content)) {
          const hasAriaLabel = /<button[^>]*aria-label=/.test(context.content);
          const hasText = /<button[^>]*>[^<]+<\/button>/.test(context.content);

          if (!hasAriaLabel && !hasText) {
            issues.push({
              rule: 'accessibility',
              severity: 'warning',
              message: 'Buttons should have accessible labels',
              fix: 'Add aria-label or text content to buttons',
            });
          }
        }

        return issues;
      },
    });
  }

  /**
   * Get all rules
   */
  getRules(): ValidationRule[] {
    return this.rules;
  }
}

/**
 * Validate file
 */
export function validateFile(
  filePath: string,
  options: ValidateOptions = {}
): ValidationResult {
  const engine = new ValidationEngine(options.cwd);
  return engine.validateFile(filePath, options);
}

/**
 * Validate multiple files
 */
export function validateFiles(
  files: string[],
  options: ValidateOptions = {}
): ValidationResult[] {
  const engine = new ValidationEngine(options.cwd);
  return engine.validateFiles(files, options);
}

/**
 * Format validation results
 */
export function formatValidationResults(results: ValidationResult[]): string {
  const lines: string[] = [];

  let totalIssues = 0;
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  for (const result of results) {
    if (result.issues.length === 0) {
      continue;
    }

    lines.push(`\n${result.file}:`);

    for (const issue of result.issues) {
      const icon =
        issue.severity === 'error'
          ? '❌'
          : issue.severity === 'warning'
          ? '⚠️'
          : 'ℹ️';

      const location = issue.line
        ? `:${issue.line}${issue.column ? `:${issue.column}` : ''}`
        : '';

      lines.push(`  ${icon} ${issue.message}${location}`);
      lines.push(`     Rule: ${issue.rule}`);

      if (issue.fix) {
        lines.push(`     💡 Fix: ${issue.fix}`);
      }

      totalIssues++;
      if (issue.severity === 'error') errorCount++;
      else if (issue.severity === 'warning') warningCount++;
      else infoCount++;
    }
  }

  if (totalIssues === 0) {
    return '✅ All files validated successfully!\n';
  }

  lines.push('');
  lines.push('Summary:');
  lines.push(`  Total issues: ${totalIssues}`);
  if (errorCount > 0) lines.push(`  Errors: ${errorCount}`);
  if (warningCount > 0) lines.push(`  Warnings: ${warningCount}`);
  if (infoCount > 0) lines.push(`  Info: ${infoCount}`);

  return lines.join('\n');
}

/**
 * Create pre-commit hook
 */
export function createPreCommitHook(): string {
  return `#!/bin/sh
# Enzyme validation pre-commit hook

# Get staged files
FILES=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\\.(tsx?|jsx?)$')

if [ -z "$FILES" ]; then
  exit 0
fi

# Run validation
echo "Running Enzyme validation..."
npx enzyme validate $FILES

# Check exit code
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Validation failed. Please fix the issues before committing."
  echo "   Run 'enzyme validate --fix' to auto-fix some issues."
  exit 1
fi

echo "✅ Validation passed!"
exit 0
`;
}
