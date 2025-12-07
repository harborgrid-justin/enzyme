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
   * @param type - The type of generator to use
   * @param options - Generator configuration options
   * @returns {Promise<GeneratorResult>} The result of the generation operation
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
   * @param type - The type of generator to use
   * @param options - Generator configuration options
   * @returns {Promise<GeneratorResult>} The result of the CLI generation
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
   * @param type - The type of generator to use
   * @param options - Generator configuration options
   * @returns {Promise<GeneratorResult>} The result of the direct generation
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
      const result = await this.processTemplateFile(file, workspaceRoot);
      if (result.success && result.filePath) {
        createdFiles.push(result.filePath);
      } else if (result.error) {
        errors.push(result.error);
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
   * SECURITY: Process a single template file with path validation
   * @param file - The template file to process
   * @param file.path - The file path
   * @param file.content - The file content
   * @param file.skipIfExists - Whether to skip if file exists
   * @param workspaceRoot - The workspace root path
   * @returns {Promise<{success: boolean, filePath?: string, error?: string}>} Processing result
   */
  private async processTemplateFile(
    file: { path: string; content: string; skipIfExists?: boolean },
    workspaceRoot: string
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      // SECURITY: Sanitize file path to prevent path traversal
      const sanitizedPath = sanitizePath(file.path, workspaceRoot);
      if (!sanitizedPath) {
        return { success: false, error: `Invalid or unsafe file path: ${file.path}` };
      }

      // SECURITY: Build full path and verify it's within workspace
      const fullPath = path.isAbsolute(sanitizedPath)
        ? sanitizedPath
        : path.join(workspaceRoot, sanitizedPath);

      // SECURITY: Double-check the resolved path is within workspace
      const normalizedFullPath = path.normalize(fullPath);
      const normalizedWorkspace = path.normalize(workspaceRoot);
      if (!normalizedFullPath.startsWith(normalizedWorkspace)) {
        return { success: false, error: `Path traversal detected: ${file.path}` };
      }

      const fileUri = vscode.Uri.file(fullPath);

      // SECURITY: Check if file exists using VS Code fs API
      if (file.skipIfExists) {
        try {
          await vscode.workspace.fs.stat(fileUri);
          return { success: false }; // Skip existing file
        } catch {
          // File doesn't exist, proceed
        }
      }

      // SECURITY: Create directory if needed using VS Code fs API
      const directoryUri = vscode.Uri.file(path.dirname(fullPath));
      try {
        await vscode.workspace.fs.createDirectory(directoryUri);
      } catch {
        // Directory might already exist, which is fine
      }

      // SECURITY: Write file using VS Code fs API
      const contentBuffer = Buffer.from(file.content, 'utf-8');
      await vscode.workspace.fs.writeFile(fileUri, contentBuffer);
      return { success: true, filePath: fullPath };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Failed to create ${file.path}: ${errorMessage}` };
    }
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
   * @param output - The CLI output to parse
   * @returns {string[]} Array of generated file paths
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
   * @param content - The template content
   * @param variables - Key-value pairs for variable substitution
   * @returns {string} The content with variables substituted
   */
  substituteVariables(content: string, variables: Record<string, string>): string {
    let result = content;

    for (const [key, value] of Object.entries(variables)) {
      // SECURITY: Safe to use RegExp constructor here as key comes from controlled template variables
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }

    return result;
  }

  /**
   * Get workspace root
   * @returns {string | null} The workspace root path or null if no workspace is open
   */
  private getWorkspaceRoot(): string | null {
    const folders = vscode.workspace.workspaceFolders;
    const firstFolder = folders?.[0];
    return firstFolder ? firstFolder.uri.fsPath : null;
  }
}
