import * as vscode from 'vscode';
import { RouteCodeLensProvider } from './route-code-lens';
import { ComponentCodeLensProvider } from './component-code-lens';
import { HookCodeLensProvider } from './hook-code-lens';
import { FeatureCodeLensProvider } from './feature-code-lens';

export function registerCodeLensProviders(context: vscode.ExtensionContext): void {
  const config = vscode.workspace.getConfiguration('enzyme');
  const enableCodeLens = config.get<boolean>('enableCodeLens', true);

  if (!enableCodeLens) {
    return;
  }

  // Register route code lens provider
  const routeCodeLensProvider = new RouteCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      [
        { scheme: 'file', language: 'typescript' },
        { scheme: 'file', language: 'typescriptreact' },
        { scheme: 'file', language: 'javascript' },
        { scheme: 'file', language: 'javascriptreact' },
      ],
      routeCodeLensProvider
    )
  );

  // Register component code lens provider
  const componentCodeLensProvider = new ComponentCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      [
        { scheme: 'file', language: 'typescriptreact' },
        { scheme: 'file', language: 'javascriptreact' },
      ],
      componentCodeLensProvider
    )
  );

  // Register hook code lens provider
  const hookCodeLensProvider = new HookCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      [
        { scheme: 'file', language: 'typescript' },
        { scheme: 'file', language: 'typescriptreact' },
        { scheme: 'file', language: 'javascript' },
        { scheme: 'file', language: 'javascriptreact' },
      ],
      hookCodeLensProvider
    )
  );

  // Register feature code lens provider
  const featureCodeLensProvider = new FeatureCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      [
        { scheme: 'file', language: 'typescript' },
        { scheme: 'file', language: 'typescriptreact' },
      ],
      featureCodeLensProvider
    )
  );

  // Register commands for code lens actions
  registerCodeLensCommands(context);
}

function registerCodeLensCommands(context: vscode.ExtensionContext): void {
  // Route commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'enzyme.navigateToComponent',
      async (componentName: string, uri: vscode.Uri) => {
        // Find and open component file
        const files = await vscode.workspace.findFiles(
          `**/${componentName}.{tsx,ts,jsx,js}`,
          '**/node_modules/**'
        );

        if (files.length > 0) {
          const document = await vscode.workspace.openTextDocument(files[0]);
          await vscode.window.showTextDocument(document);
        } else {
          vscode.window.showWarningMessage(`Component ${componentName} not found`);
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('enzyme.showGuardDetails', async (guards: string[]) => {
      const message = `Guards in order:\n${guards.map((g, i) => `${i + 1}. ${g}`).join('\n')}`;
      vscode.window.showInformationMessage(message);
    })
  );

  // Component commands
  context.subscriptions.push(
    vscode.commands.registerCommand('enzyme.runComponentTests', async (testPath: string) => {
      const terminal = vscode.window.createTerminal('Enzyme Tests');
      terminal.show();
      terminal.sendText(`npm test -- ${testPath}`);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'enzyme.showComponentMetrics',
      async (componentName: string, uri: vscode.Uri) => {
        vscode.window.showInformationMessage(
          `Performance metrics for ${componentName} - Coming soon!`
        );
      }
    )
  );

  // Hook commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'enzyme.showHookDependencies',
      async (hookName: string, dependencies: string[]) => {
        const message = `Dependencies for ${hookName}:\n${dependencies.join(', ')}`;
        vscode.window.showInformationMessage(message);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'enzyme.showHookComplexity',
      async (hookName: string, info: any) => {
        const message = `Hook ${hookName} has complexity score: ${info.complexity}\nConsider refactoring if > 10`;
        vscode.window.showWarningMessage(message);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'enzyme.debugHook',
      async (hookName: string, uri: vscode.Uri) => {
        vscode.window.showInformationMessage(`Debug hook: ${hookName} - Coming soon!`);
      }
    )
  );

  // Feature commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'enzyme.toggleFeature',
      async (featureName: string, uri: vscode.Uri) => {
        vscode.window.showInformationMessage(`Toggle feature: ${featureName} - Coming soon!`);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('enzyme.editFeatureFlag', async (flag: string) => {
      vscode.window.showInformationMessage(`Edit feature flag: ${flag} - Coming soon!`);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'enzyme.showFeatureRoutes',
      async (featureName: string, uri: vscode.Uri) => {
        vscode.window.showInformationMessage(`Show routes for: ${featureName} - Coming soon!`);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('enzyme.openFeatureDashboard', async (featureName: string) => {
      vscode.window.showInformationMessage(`Open dashboard for: ${featureName} - Coming soon!`);
    })
  );
}

export { RouteCodeLensProvider, ComponentCodeLensProvider, HookCodeLensProvider, FeatureCodeLensProvider };
