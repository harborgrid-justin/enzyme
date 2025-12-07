import * as vscode from 'vscode';
import { ComponentCodeLensProvider } from './component-code-lens';
import { FeatureCodeLensProvider } from './feature-code-lens';
import { HookCodeLensProvider } from './hook-code-lens';
import { RouteCodeLensProvider } from './route-code-lens';

/**
 *
 * @param context
 */
export function registerCodeLensProviders(context: vscode.ExtensionContext): void {
  const config = vscode.workspace.getConfiguration('enzyme');
  const enableCodeLens = config.get<boolean>('codeLens.enabled', true);

  if (!enableCodeLens) {
    return;
  }

  // Watch for configuration changes to enable/disable CodeLens dynamically
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('enzyme.codeLens.enabled')) {
        const newConfig = vscode.workspace.getConfiguration('enzyme');
        const newEnabled = newConfig.get<boolean>('codeLens.enabled', true);

        if (newEnabled) {
          vscode.window.showInformationMessage(
            'CodeLens enabled. Reload window to see changes.',
            'Reload'
          ).then((action) => {
            if (action === 'Reload') {
              vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
          });
        } else {
          vscode.window.showInformationMessage(
            'CodeLens disabled. Reload window to see changes.',
            'Reload'
          ).then((action) => {
            if (action === 'Reload') {
              vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
          });
        }
      }
    })
  );

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

/**
 *
 * @param context
 */
function registerCodeLensCommands(context: vscode.ExtensionContext): void {
  // Route commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'enzyme.navigateToComponent',
      async (componentName: string, _uri: vscode.Uri) => {
        // Find and open component file
        const files = await vscode.workspace.findFiles(
          `**/${componentName}.{tsx,ts,jsx,js}`,
          '**/node_modules/**'
        );

        const firstFile = files[0];
        if (firstFile) {
          await vscode.window.showTextDocument(firstFile);
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
      async (componentName: string, _uri: vscode.Uri) => {
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
      async (hookName: string, _uri: vscode.Uri) => {
        vscode.window.showInformationMessage(`Debug hook: ${hookName} - Coming soon!`);
      }
    )
  );

  // Feature commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'enzyme.toggleFeature',
      async (featureName: string, _uri: vscode.Uri) => {
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
      async (featureName: string, _uri: vscode.Uri) => {
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
