/**
 * Documentation Engineer Agent
 * Handles documentation generation and validation
 */

import { BaseAgent, createAgentConfig, icons, colors } from '../base-agent.js';
import type { BuildConfig, DocumentationResult } from '../types.js';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

export class DocumentationEngineer extends BaseAgent<DocumentationResult> {
  constructor(buildConfig: BuildConfig) {
    super(
      createAgentConfig(
        'documentation-engineer',
        'Documentation Engineer',
        'Validates documentation and generates API docs',
        {
          dependencies: [
            { agentId: 'typecheck-engineer', required: false },
          ],
          timeout: 300000, // 5 minutes
          priority: 2,
          parallel: true,
        }
      ),
      buildConfig
    );
  }

  protected async executeTask(): Promise<DocumentationResult> {
    this.log('info', `${icons.docs} Starting documentation validation...`);
    this.reportProgress(10, 'Scanning documentation files');

    let filesCreated = 0;
    let apiDocs = 0;
    let readme = false;
    let changelog = false;

    // Check README
    this.reportProgress(20, 'Validating README');
    readme = this.validateReadme();

    // Check CHANGELOG
    this.reportProgress(30, 'Validating CHANGELOG');
    changelog = this.validateChangelog();

    // Validate JSDoc comments
    this.reportProgress(50, 'Analyzing JSDoc coverage');
    const jsdocCoverage = await this.analyzeJsDocCoverage();
    apiDocs = jsdocCoverage.documented;

    // Check docs directory
    this.reportProgress(70, 'Scanning documentation directory');
    const docsFiles = this.scanDocsDirectory();
    filesCreated = docsFiles.length;

    // Validate TypeScript declaration files
    this.reportProgress(90, 'Validating type declarations');
    const typesValid = this.validateTypeDeclarations();

    this.reportProgress(100, 'Documentation validation complete');

    // Log summary
    this.log('success', `${icons.success} Documentation validation complete`);
    this.log('info', `  ${colors.cyan}README:${colors.reset} ${readme ? '✓ Present' : '✗ Missing'}`);
    this.log('info', `  ${colors.cyan}CHANGELOG:${colors.reset} ${changelog ? '✓ Present' : '✗ Missing'}`);
    this.log('info', `  ${colors.cyan}Doc files:${colors.reset} ${filesCreated}`);
    this.log('info', `  ${colors.cyan}JSDoc coverage:${colors.reset} ${jsdocCoverage.percentage.toFixed(1)}% (${apiDocs}/${jsdocCoverage.total} exports)`);
    this.log('info', `  ${colors.cyan}Type declarations:${colors.reset} ${typesValid ? '✓ Valid' : '⚠ Issues found'}`);

    if (jsdocCoverage.percentage < 50) {
      this.log('warn', `${icons.warning} Low JSDoc coverage. Consider documenting more exports.`);
    }

    return {
      generated: true,
      filesCreated,
      apiDocs,
      readme,
      changelog,
    };
  }

  private validateReadme(): boolean {
    const readmePath = join(process.cwd(), 'README.md');
    if (!existsSync(readmePath)) {
      this.log('warn', 'README.md not found');
      return false;
    }

    const content = readFileSync(readmePath, 'utf-8');
    const hasTitle = content.includes('# ');
    const hasInstallation = /install/i.test(content);
    const hasUsage = /usage|getting started/i.test(content);

    if (!hasTitle || !hasInstallation || !hasUsage) {
      this.log('warn', 'README.md may be incomplete (missing title, installation, or usage sections)');
    }

    return true;
  }

  private validateChangelog(): boolean {
    const changelogPath = join(process.cwd(), 'CHANGELOG.md');
    return existsSync(changelogPath);
  }

  private async analyzeJsDocCoverage(): Promise<{ documented: number; total: number; percentage: number }> {
    const srcPath = join(process.cwd(), 'src');
    let documented = 0;
    let total = 0;

    const analyzeFile = (filePath: string): void => {
      try {
        const content = readFileSync(filePath, 'utf-8');

        // Count exported functions/classes/types
        const exports = content.match(/export\s+(function|const|class|type|interface|enum)\s+\w+/g);
        const exportCount = exports?.length || 0;
        total += exportCount;

        // Count JSDoc comments before exports
        const jsdocPattern = /\/\*\*[\s\S]*?\*\/\s*\n\s*export/g;
        const jsdocCount = (content.match(jsdocPattern) || []).length;
        documented += jsdocCount;
      } catch {
        // Ignore file read errors
      }
    };

    const walkDir = (dir: string): void => {
      try {
        const items = readdirSync(dir);
        for (const item of items) {
          if (item.startsWith('.') || item === 'node_modules' || item === 'dist') {
            continue;
          }

          const fullPath = join(dir, item);
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            walkDir(fullPath);
          } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
            if (!item.includes('.test.') && !item.includes('.spec.')) {
              analyzeFile(fullPath);
            }
          }
        }
      } catch {
        // Ignore directory errors
      }
    };

    if (existsSync(srcPath)) {
      walkDir(srcPath);
    }

    const percentage = total > 0 ? (documented / total) * 100 : 0;
    return { documented, total, percentage };
  }

  private scanDocsDirectory(): string[] {
    const docsPath = join(process.cwd(), 'docs');
    const files: string[] = [];

    if (!existsSync(docsPath)) {
      return files;
    }

    const walkDir = (dir: string): void => {
      try {
        const items = readdirSync(dir);
        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            walkDir(fullPath);
          } else if (item.endsWith('.md') || item.endsWith('.mdx')) {
            files.push(fullPath);
          }
        }
      } catch {
        // Ignore errors
      }
    };

    walkDir(docsPath);
    return files;
  }

  private validateTypeDeclarations(): boolean {
    const distPath = join(process.cwd(), 'dist');

    if (!existsSync(distPath)) {
      return false;
    }

    // Check if .d.ts files exist
    let hasDeclarations = false;

    const checkDir = (dir: string): void => {
      try {
        const items = readdirSync(dir);
        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            checkDir(fullPath);
          } else if (item.endsWith('.d.ts')) {
            hasDeclarations = true;
            return;
          }
        }
      } catch {
        // Ignore errors
      }
    };

    checkDir(distPath);
    return hasDeclarations;
  }
}
