import * as vscode from 'vscode';
import { CLIRunner } from './cli-runner';
import { CLIDetector } from './cli-detector';
import { EnzymeTerminalProvider } from './terminal-provider';
import { EnzymeTaskProvider } from './task-provider';
import { EnzymeDebugConfigurationProvider } from './debug/debug-configuration-provider';
import { GeneratorRunner } from './generators/generator-runner';
import { ProjectScaffold } from './scaffold/project-scaffold';
import { MigrationRunner } from './migration/migration-runner';
import { NPMScripts } from './npm/npm-scripts';

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

  // Add disposables to context
  context.subscriptions.push(
    taskProvider,
    debugProvider,
    terminalProfile,
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

  if (choice.value === 'global') {
    terminal.sendText('npm install -g @enzyme/cli');
  } else {
    terminal.sendText('npm install --save-dev @enzyme/cli');
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
