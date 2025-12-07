import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { CLIRunner } from '../cli-runner';

export interface ProjectScaffoldOptions {
  name: string;
  template: 'basic' | 'full' | 'minimal' | 'enterprise';
  typescript: boolean;
  packageManager: 'npm' | 'yarn' | 'pnpm';
  git: boolean;
  install: boolean;
}

export interface ScaffoldResult {
  success: boolean;
  projectPath: string;
  errors: string[];
}

export class ProjectScaffold {
  constructor(private cliRunner: CLIRunner) {}

  /**
   * Create a new Enzyme project with interactive wizard
   */
  async createProject(targetDir?: string): Promise<ScaffoldResult | null> {
    // Get project options through wizard
    const options = await this.runWizard();
    if (!options) {
      return null;
    }

    // Determine project path
    const projectPath = targetDir
      ? path.join(targetDir, options.name)
      : path.join(process.cwd(), options.name);

    // Check if directory exists
    try {
      await fs.access(projectPath);
      const overwrite = await vscode.window.showWarningMessage(
        `Directory ${options.name} already exists. Overwrite?`,
        'Yes',
        'No'
      );
      if (overwrite !== 'Yes') {
        return null;
      }
    } catch {
      // Directory doesn't exist, proceed
    }

    // Create project
    return this.scaffold(projectPath, options);
  }

  /**
   * Run interactive setup wizard
   */
  private async runWizard(): Promise<ProjectScaffoldOptions | null> {
    // Project name
    const name = await vscode.window.showInputBox({
      prompt: 'Enter project name',
      placeHolder: 'my-enzyme-app',
      validateInput: (value) => {
        if (!value) {
          return 'Project name is required';
        }
        if (!/^[a-z0-9-_]+$/.test(value)) {
          return 'Project name must contain only lowercase letters, numbers, hyphens, and underscores';
        }
        return null;
      },
    });

    if (!name) {
      return null;
    }

    // Template selection
    const templateChoice = await vscode.window.showQuickPick(
      [
        {
          label: 'Basic',
          description: 'Basic React app with Enzyme',
          value: 'basic' as const,
        },
        {
          label: 'Full',
          description: 'Full-featured app with routing, state, and UI components',
          value: 'full' as const,
        },
        {
          label: 'Minimal',
          description: 'Minimal setup with just the essentials',
          value: 'minimal' as const,
        },
        {
          label: 'Enterprise',
          description: 'Enterprise-ready with all features and best practices',
          value: 'enterprise' as const,
        },
      ],
      { placeHolder: 'Select project template' }
    );

    if (!templateChoice) {
      return null;
    }

    // TypeScript
    const typescript = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
      { placeHolder: 'Use TypeScript?' }
    );

    if (typescript === undefined) {
      return null;
    }

    // Package manager
    const packageManager = await vscode.window.showQuickPick(
      [
        { label: 'npm', value: 'npm' as const },
        { label: 'yarn', value: 'yarn' as const },
        { label: 'pnpm', value: 'pnpm' as const },
      ],
      { placeHolder: 'Select package manager' }
    );

    if (!packageManager) {
      return null;
    }

    // Git
    const git = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
      { placeHolder: 'Initialize Git repository?' }
    );

    if (git === undefined) {
      return null;
    }

    // Install dependencies
    const install = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
      { placeHolder: 'Install dependencies now?' }
    );

    if (install === undefined) {
      return null;
    }

    return {
      name,
      template: templateChoice.value,
      typescript: typescript.value,
      packageManager: packageManager.value,
      git: git.value,
      install: install.value,
    };
  }

  /**
   * Scaffold the project
   */
  private async scaffold(
    projectPath: string,
    options: ProjectScaffoldOptions
  ): Promise<ScaffoldResult> {
    const errors: string[] = [];

    try {
      // Show progress
      return await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Creating Enzyme project: ${options.name}`,
          cancellable: false,
        },
        async (progress) => {
          // Step 1: Run CLI to create project
          progress.report({ message: 'Running enzyme CLI...', increment: 20 });

          try {
            await this.cliRunner.run({
              args: [
                'new',
                options.name,
                '--template',
                options.template,
                options.typescript ? '--typescript' : '--no-typescript',
                '--package-manager',
                options.packageManager,
                options.git ? '--git' : '--no-git',
                options.install ? '--install' : '--no-install',
              ],
              timeout: 300000, // 5 minutes
            });
          } catch (error) {
            errors.push(`CLI creation failed: ${error}`);
            throw error;
          }

          // Step 2: Initialize Git if needed
          if (options.git) {
            progress.report({ message: 'Initializing Git...', increment: 20 });
            try {
              await this.initializeGit(projectPath);
            } catch (error) {
              errors.push(`Git initialization failed: ${error}`);
            }
          }

          // Step 3: Install dependencies if needed
          if (options.install) {
            progress.report({ message: 'Installing dependencies...', increment: 30 });
            try {
              await this.installDependencies(projectPath, options.packageManager);
            } catch (error) {
              errors.push(`Dependency installation failed: ${error}`);
            }
          }

          // Step 4: Setup VS Code workspace
          progress.report({ message: 'Setting up VS Code...', increment: 20 });
          try {
            await this.setupWorkspace(projectPath);
          } catch (error) {
            errors.push(`Workspace setup failed: ${error}`);
          }

          progress.report({ message: 'Done!', increment: 10 });

          return {
            success: errors.length === 0,
            projectPath,
            errors,
          };
        }
      );
    } catch (error) {
      return {
        success: false,
        projectPath,
        errors: [...errors, `Scaffold failed: ${error}`],
      };
    }
  }

  /**
   * Initialize Git repository
   */
  private async initializeGit(projectPath: string): Promise<void> {
    const terminal = vscode.window.createTerminal({
      name: 'Enzyme Git Init',
      cwd: projectPath,
    });

    terminal.sendText('git init');
    terminal.sendText('git add .');
    terminal.sendText('git commit -m "Initial commit from Enzyme CLI"');
  }

  /**
   * Install dependencies
   */
  private async installDependencies(
    projectPath: string,
    packageManager: 'npm' | 'yarn' | 'pnpm'
  ): Promise<void> {
    const terminal = vscode.window.createTerminal({
      name: 'Enzyme Install',
      cwd: projectPath,
    });

    terminal.show();

    const installCommand =
      packageManager === 'yarn' ? 'yarn install' : `${packageManager} install`;

    terminal.sendText(installCommand);
  }

  /**
   * Setup VS Code workspace
   */
  private async setupWorkspace(projectPath: string): Promise<void> {
    // Create .vscode directory
    const vscodeDir = path.join(projectPath, '.vscode');
    await fs.mkdir(vscodeDir, { recursive: true });

    // Create settings.json
    const settings = {
      'typescript.tsdk': 'node_modules/typescript/lib',
      'typescript.enablePromptUseWorkspaceTsdk': true,
      'editor.formatOnSave': true,
      'editor.defaultFormatter': 'esbenp.prettier-vscode',
      'editor.codeActionsOnSave': {
        'source.fixAll.eslint': true,
      },
      'files.associations': {
        '*.css': 'tailwindcss',
      },
    };

    await fs.writeFile(
      path.join(vscodeDir, 'settings.json'),
      JSON.stringify(settings, null, 2)
    );

    // Create extensions.json
    const extensions = {
      recommendations: [
        'enzyme.enzyme-vscode',
        'dbaeumer.vscode-eslint',
        'esbenp.prettier-vscode',
        'bradlc.vscode-tailwindcss',
      ],
    };

    await fs.writeFile(
      path.join(vscodeDir, 'extensions.json'),
      JSON.stringify(extensions, null, 2)
    );

    // Open project in new window
    const openChoice = await vscode.window.showInformationMessage(
      `Project ${path.basename(projectPath)} created successfully!`,
      'Open Project',
      'Open in New Window',
      'Dismiss'
    );

    if (openChoice === 'Open Project') {
      await vscode.commands.executeCommand(
        'vscode.openFolder',
        vscode.Uri.file(projectPath),
        false
      );
    } else if (openChoice === 'Open in New Window') {
      await vscode.commands.executeCommand(
        'vscode.openFolder',
        vscode.Uri.file(projectPath),
        true
      );
    }
  }
}
