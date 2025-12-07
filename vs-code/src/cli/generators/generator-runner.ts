import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { CLIRunner } from '../cli-runner';
import { GeneratorOptions, GeneratorResult, GeneratorType, GeneratorTemplate, GeneratorFile } from './index';
import { componentTemplate } from './templates/component.template';
import { pageTemplate } from './templates/page.template';
import { hookTemplate } from './templates/hook.template';
import { featureTemplate } from './templates/feature.template';
import { storeTemplate } from './templates/store.template';
import { apiTemplate } from './templates/api.template';

export class GeneratorRunner {
  private templates: Map<GeneratorType, (options: GeneratorOptions) => GeneratorTemplate>;

  constructor(private cliRunner: CLIRunner) {
    this.templates = new Map();
    this.registerTemplates();
  }

  /**
   * Generate code using CLI or fallback to direct generation
   */
  async generate(type: GeneratorType, options: GeneratorOptions): Promise<GeneratorResult> {
    try {
      // Try CLI first
      return await this.generateViaCLI(type, options);
    } catch (error) {
      // Fallback to direct generation
      vscode.window.showWarningMessage(
        'CLI generation failed, using built-in templates',
        'OK'
      );
      return await this.generateDirect(type, options);
    }
  }

  /**
   * Generate using CLI
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
   * Generate directly using templates
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
        const fullPath = path.join(workspaceRoot, file.path);

        // Check if file exists
        if (file.skipIfExists) {
          try {
            await fs.access(fullPath);
            continue; // Skip existing file
          } catch {
            // File doesn't exist, proceed
          }
        }

        // Create directory if needed
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });

        // Write file
        await fs.writeFile(fullPath, file.content, 'utf-8');
        createdFiles.push(fullPath);
      } catch (error) {
        errors.push(`Failed to create ${file.path}: ${error}`);
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
   */
  private parseGeneratedFiles(output: string): string[] {
    const files: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Match patterns like "Created src/components/Button.tsx"
      const match = line.match(/(?:Created|Generated|Added)\s+(.+)/i);
      if (match) {
        files.push(match[1].trim());
      }
    }

    return files;
  }

  /**
   * Substitute variables in template content
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
    return folders && folders.length > 0 ? folders[0].uri.fsPath : null;
  }
}
