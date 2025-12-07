import * as vscode from 'vscode';
import { CLIDetector } from './cli-detector';
import { CLIRunner } from './cli-runner';
import { EnzymeDebugConfigurationProvider } from './debug/debug-configuration-provider';
import { GeneratorRunner } from './generators/generator-runner';
import { MigrationRunner } from './migration/migration-runner';
import { NPMScripts } from './npm/npm-scripts';
import { ProjectScaffold } from './scaffold/project-scaffold';
import { EnzymeTaskProvider } from './task-provider';
import { EnzymeTerminalProvider } from './terminal-provider';

export {
  CLIRunner,
  CLIDetector,
  EnzymeTerminalProvider,
  EnzymeTaskProvider,
  EnzymeDebugConfigurationProvider,
  GeneratorRunner,
  ProjectScaffold,
  MigrationRunner,
  NPMScripts,
};

let cliRunner: CLIRunner;
let cliDetector: CLIDetector;
let terminalProvider: EnzymeTerminalProvider;
let taskProvider: vscode.Disposable;
let debugProvider: vscode.Disposable;
let npmScripts: NPMScripts;
let generatorRunner: GeneratorRunner;
let projectScaffold: ProjectScaffold;
let migrationRunner: MigrationRunner;

/**
 * Register all CLI-related features for the Enzyme VS Code extension
 * IMPORTANT: Ensures proper disposal of all CLI services on extension deactivation
 * @param context
 */
export async function registerCLIFeatures(context: vscode.ExtensionContext): Promise<void> {
  // Initialize core services
  cliDetector = new CLIDetector();
  cliRunner = new CLIRunner(cliDetector);
  terminalProvider = new EnzymeTerminalProvider(cliRunner);
  npmScripts = new NPMScripts();
  generatorRunner = new GeneratorRunner(cliRunner);
  projectScaffold = new ProjectScaffold(cliRunner);
  migrationRunner = new MigrationRunner(cliRunner);

  // Register task provider
  taskProvider = vscode.tasks.registerTaskProvider('enzyme', new EnzymeTaskProvider(cliDetector));

  // Register debug configuration provider
  debugProvider = vscode.debug.registerDebugConfigurationProvider(
    'enzyme',
    new EnzymeDebugConfigurationProvider()
  );

  // Register terminal profile
  const terminalProfile = vscode.window.registerTerminalProfileProvider('enzyme.terminal', {
    provideTerminalProfile: () => terminalProvider.createTerminalProfile(),
  });

  // Register disposable for cleanup
  const cliDisposable = {
    dispose: () => {
      cliRunner.dispose();
      terminalProvider.dispose();
      npmScripts.dispose();
    }
  };

  // Detect CLI on activation
  const cliInfo = await cliDetector.detect();
  if (cliInfo) {
    vscode.window.showInformationMessage(
      `Enzyme CLI detected (v${cliInfo.version}) at ${cliInfo.path}`
    );
  } else {
    const choice = await vscode.window.showWarningMessage(
      'Enzyme CLI not found. Some features may be unavailable.',
      'Install CLI',
      'Dismiss'
    );
    if (choice === 'Install CLI') {
      await installCLI();
    }
  }

  // Add disposables to context for proper cleanup on deactivation
  context.subscriptions.push(
    taskProvider,
    debugProvider,
    terminalProfile,
    cliDisposable, // IMPORTANT: Ensures CLI services are disposed properly
    vscode.commands.registerCommand('enzyme.cli.detect', async () => {
      const info = await cliDetector.detect(true); // Force re-detect
      if (info) {
        vscode.window.showInformationMessage(
          `Enzyme CLI v${info.version} found at ${info.path}`
        );
      } else {
        vscode.window.showErrorMessage('Enzyme CLI not found');
      }
    }),
    vscode.commands.registerCommand('enzyme.cli.install', installCLI),
    vscode.commands.registerCommand('enzyme.cli.version', async () => {
      const version = await cliRunner.getVersion();
      if (version) {
        vscode.window.showInformationMessage(`Enzyme CLI version: ${version}`);
      }
    })
  );
}

/**
 * Install Enzyme CLI via terminal
 * SECURITY: Uses predefined commands only, no user input
 *
 * @private
 */
async function installCLI(): Promise<void> {
  const choice = await vscode.window.showQuickPick(
    [
      { label: 'Global Installation', value: 'global', description: 'npm install -g @enzyme/cli' },
      { label: 'Local Installation', value: 'local', description: 'npm install --save-dev @enzyme/cli' },
    ],
    { placeHolder: 'Choose installation type' }
  );

  if (!choice) {
    return;
  }

  const terminal = vscode.window.createTerminal('Enzyme CLI Installation');
  terminal.show();

  // SECURITY: Use predefined commands only - no string interpolation
  const commands: Record<string, string> = {
    global: 'npm install -g @enzyme/cli',
    local: 'npm install --save-dev @enzyme/cli',
  };

  const command = commands[choice.value];
  if (command) {
    terminal.sendText(command);
  }
}

/**
 * Get the CLI runner instance
 */
export function getCLIRunner(): CLIRunner {
  return cliRunner;
}

/**
 * Get the CLI detector instance
 */
export function getCLIDetector(): CLIDetector {
  return cliDetector;
}

/**
 * Get the terminal provider instance
 */
export function getTerminalProvider(): EnzymeTerminalProvider {
  return terminalProvider;
}

/**
 * Get the generator runner instance
 */
export function getGeneratorRunner(): GeneratorRunner {
  return generatorRunner;
}

/**
 * Get the project scaffold instance
 */
export function getProjectScaffold(): ProjectScaffold {
  return projectScaffold;
}

/**
 * Get the migration runner instance
 */
export function getMigrationRunner(): MigrationRunner {
  return migrationRunner;
}

/**
 * Get the NPM scripts utility instance
 */
export function getNPMScripts(): NPMScripts {
  return npmScripts;
}
