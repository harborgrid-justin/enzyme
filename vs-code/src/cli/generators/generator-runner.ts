import * as path from 'node:path';
import * as vscode from 'vscode';
import { sanitizePath } from '../../core/security-utils';
import { apiTemplate } from './templates/api.template';
import { componentTemplate } from './templates/component.template';
import { featureTemplate } from './templates/feature.template';
import { hookTemplate } from './templates/hook.template';
import { pageTemplate } from './templates/page.template';
import { storeTemplate } from './templates/store.template';
import type { CLIRunner } from '../cli-runner';
import type { GeneratorOptions, GeneratorResult, GeneratorType, GeneratorTemplate } from './index';

/**
 *
 */
export class GeneratorRunner {
  private readonly templates: Map<GeneratorType, (options: GeneratorOptions) => GeneratorTemplate>;

  /**
   *
   * @param cliRunner
   */
  constructor(private readonly cliRunner: CLIRunner) {
    this.templates = new Map();
    this.registerTemplates();
  }

  /**
   * generate code using CLI or fallback to direct generation
   * @param type
   * @param options
   */
  async generate(type: GeneratorType, options: GeneratorOptions): Promise<GeneratorResult> {
    try {
      // Try CLI first
      return await this.generateViaCLI(type, options);
    } catch {
      // Fallback to direct generation
      vscode.window.showWarningMessage(
        'CLI generation failed, using built-in templates',
        'OK'
      );
      return await this.generateDirect(type, options);
    }
  }

  /**
   * generate using CLI
   * @param type
   * @param options
   */
  private async generateViaCLI(type: GeneratorType, options: GeneratorOptions): Promise<GeneratorResult> {
    const result = await this.cliRunner.generate(type, options.name, options);

    if (!result.success) {
      throw new Error(result.stderr);
    }

    // Parse output to find generated files
    const files = this.parseGeneratedFiles(result.stdout);

    return {
      success: true,
      files,
      errors: [],
    };
  }

  /**
   * SECURITY: Generate directly using templates with path validation
   * Uses VS Code fs API for security and validates all file paths
   * @param type
   * @param options
   */
  private async generateDirect(type: GeneratorType, options: GeneratorOptions): Promise<GeneratorResult> {
    const templateFn = this.templates.get(type);
    if (!templateFn) {
      throw new Error(`No template found for type: ${type}`);
    }

    const template = templateFn(options);
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      throw new Error('No workspace folder open');
    }

    const createdFiles: string[] = [];
    const errors: string[] = [];

    for (const file of template.files) {
      try {
        // SECURITY: Sanitize file path to prevent path traversal
        const sanitizedPath = sanitizePath(file.path, workspaceRoot);
        if (!sanitizedPath) {
          errors.push(`Invalid or unsafe file path: ${file.path}`);
          continue;
        }

        // SECURITY: Build full path and verify it's within workspace
        const fullPath = path.isAbsolute(sanitizedPath)
          ? sanitizedPath
          : path.join(workspaceRoot, sanitizedPath);

        // SECURITY: Double-check the resolved path is within workspace
        const normalizedFullPath = path.normalize(fullPath);
        const normalizedWorkspace = path.normalize(workspaceRoot);
        if (!normalizedFullPath.startsWith(normalizedWorkspace)) {
          errors.push(`Path traversal detected: ${file.path}`);
          continue;
        }

        const fileUri = vscode.Uri.file(fullPath);

        // SECURITY: Check if file exists using VS Code fs API
        if (file.skipIfExists) {
          try {
            await vscode.workspace.fs.stat(fileUri);
            continue; // Skip existing file
          } catch {
            // File doesn't exist, proceed
          }
        }

        // SECURITY: Create directory if needed using VS Code fs API
        const dirUri = vscode.Uri.file(path.dirname(fullPath));
        try {
          await vscode.workspace.fs.createDirectory(dirUri);
        } catch {
          // Directory might already exist, which is fine
        }

        // SECURITY: Write file using VS Code fs API
        const contentBuffer = Buffer.from(file.content, 'utf-8');
        await vscode.workspace.fs.writeFile(fileUri, contentBuffer);
        createdFiles.push(fullPath);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to create ${file.path}: ${errorMessage}`);
      }
    }

    if (errors.length > 0) {
      vscode.window.showErrorMessage(`Generation completed with errors: ${errors.join(', ')}`);
    }

    return {
      success: errors.length === 0,
      files: createdFiles,
      errors,
    };
  }

  /**
   * Register built-in templates
   */
  private registerTemplates(): void {
    this.templates.set('component', componentTemplate);
    this.templates.set('page', pageTemplate);
    this.templates.set('hook', hookTemplate);
    this.templates.set('feature', featureTemplate);
    this.templates.set('slice', storeTemplate);
    this.templates.set('api', apiTemplate);
  }

  /**
   * Parse generated files from CLI output
   * @param output
   */
  private parseGeneratedFiles(output: string): string[] {
    const files: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Match patterns like "Created src/components/Button.tsx"
      const match = /(?:created|generated|added)\s+(.+)/i.exec(line);
      if (match?.[1]) {
        files.push(match[1].trim());
      }
    }

    return files;
  }

  /**
   * Substitute variables in template content
   * @param content
   * @param variables
   */
  substituteVariables(content: string, variables: Record<string, string>): string {
    let result = content;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }

    return result;
  }

  /**
   * Get workspace root
   */
  private getWorkspaceRoot(): string | null {
    const folders = vscode.workspace.workspaceFolders;
    const firstFolder = folders?.[0];
    return firstFolder ? firstFolder.uri.fsPath : null;
  }
}
