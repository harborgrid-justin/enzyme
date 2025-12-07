import * as vscode from 'vscode';

// Import all command classes
import {
  AnalyzeProjectCommand,
  AnalyzeBundleCommand,
  FindRouteConflictsCommand,
} from './analysis';
import {
  GenerateComponentCommand,
  GeneratePageCommand,
  GenerateHookCommand,
  GenerateFeatureCommand,
  GenerateStoreCommand,
  GenerateAPICommand,
} from './generate';
import {
  GoToRouteCommand,
  GoToFeatureCommand,
  GoToStoreCommand,
} from './navigation';
import {
  ShowStateInspectorCommand,
  ShowPerformanceCommand,
  ShowRouteVisualizerCommand,
  ShowAPIExplorerCommand,
} from './panel';
import {
  RefreshAllCommand,
  OpenDocsCommand,
} from './utils';

/**
 * Command categories for organization
 */
export enum CommandCategory {
  Generate = 'generate',
  Navigation = 'navigation',
  Analysis = 'analysis',
  Panel = 'panel',
  Utilities = 'utils',
}

/**
 * Register all commands with VS Code
 * @param context - Extension context for registration
 * @returns Array of disposables for command registrations
 */
export function registerAllCommands(
  context: vscode.ExtensionContext
): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];
  const outputChannel = vscode.window.createOutputChannel('Enzyme Extension', {
    log: true,
  });

  // Keep output channel alive
  context.subscriptions.push(outputChannel);

  // Generator Commands
  const generatorCommands = [
    new GenerateComponentCommand(context, outputChannel),
    new GeneratePageCommand(context, outputChannel),
    new GenerateHookCommand(context, outputChannel),
    new GenerateFeatureCommand(context, outputChannel),
    new GenerateStoreCommand(context, outputChannel),
    new GenerateAPICommand(context, outputChannel),
  ];

  // Navigation Commands
  const navigationCommands = [
    new GoToRouteCommand(context, outputChannel),
    new GoToFeatureCommand(context, outputChannel),
    new GoToStoreCommand(context, outputChannel),
  ];

  // Analysis Commands
  const analysisCommands = [
    new AnalyzeProjectCommand(context, outputChannel),
    new AnalyzeBundleCommand(context, outputChannel),
    new FindRouteConflictsCommand(context, outputChannel),
  ];

  // Panel Commands
  const panelCommands = [
    new ShowStateInspectorCommand(context, outputChannel),
    new ShowPerformanceCommand(context, outputChannel),
    new ShowRouteVisualizerCommand(context, outputChannel),
    new ShowAPIExplorerCommand(context, outputChannel),
  ];

  // Utility Commands
  const utilityCommands = [
    new RefreshAllCommand(context, outputChannel),
    new OpenDocsCommand(context, outputChannel),
  ];

  // Register all commands
  const allCommands = [
    ...generatorCommands,
    ...navigationCommands,
    ...analysisCommands,
    ...panelCommands,
    ...utilityCommands,
  ];

  for (const command of allCommands) {
    const disposable = command.register();
    disposables.push(disposable);
  }

  // Log command registration summary
  outputChannel.appendLine(
    '='.repeat(80)
  );
  outputChannel.appendLine('ENZYME EXTENSION COMMANDS REGISTERED');
  outputChannel.appendLine(
    '='.repeat(80)
  );
  outputChannel.appendLine(`Generator Commands: ${generatorCommands.length}`);
  outputChannel.appendLine(`Navigation Commands: ${navigationCommands.length}`);
  outputChannel.appendLine(`Analysis Commands: ${analysisCommands.length}`);
  outputChannel.appendLine(`Panel Commands: ${panelCommands.length}`);
  outputChannel.appendLine(`Utility Commands: ${utilityCommands.length}`);
  outputChannel.appendLine(`Total Commands: ${allCommands.length}`);
  outputChannel.appendLine(
    '='.repeat(80)
  );

  return disposables;
}

/**
 * Get all registered command IDs
 * @returns Array of all registered command identifier strings
 */
export function getRegisteredCommandIds(): string[] {
  return [
    // Generator commands
    'enzyme.generate.component',
    'enzyme.generate.page',
    'enzyme.generate.hook',
    'enzyme.generate.feature',
    'enzyme.generate.store',
    'enzyme.generate.api',

    // Navigation commands
    'enzyme.navigation.goToRoute',
    'enzyme.navigation.goToFeature',
    'enzyme.navigation.goToStore',

    // Analysis commands
    'enzyme.analysis.analyzeProject',
    'enzyme.analysis.analyzeBundle',
    'enzyme.analysis.findRouteConflicts',

    // Panel commands
    'enzyme.panel.showStateInspector',
    'enzyme.panel.showPerformance',
    'enzyme.panel.showRouteVisualizer',
    'enzyme.panel.showAPIExplorer',

    // Utility commands
    'enzyme.utils.refreshAll',
    'enzyme.utils.openDocs',
  ];
}

/**
 * Get command metadata for package.json contribution
 * @returns Object containing commands and keybindings configuration
 */
export function getCommandContributions(): { commands: unknown[]; keybindings: unknown[] } {
  return {
    commands: [
      // Generator Commands
      {
        command: 'enzyme.generate.component',
        title: 'Enzyme: Generate Component',
        category: 'Enzyme Generate',
        icon: '$(symbol-class)',
      },
      {
        command: 'enzyme.generate.page',
        title: 'Enzyme: Generate Page',
        category: 'Enzyme Generate',
        icon: '$(file)',
      },
      {
        command: 'enzyme.generate.hook',
        title: 'Enzyme: Generate Hook',
        category: 'Enzyme Generate',
        icon: '$(symbol-method)',
      },
      {
        command: 'enzyme.generate.feature',
        title: 'Enzyme: Generate Feature Module',
        category: 'Enzyme Generate',
        icon: '$(package)',
      },
      {
        command: 'enzyme.generate.store',
        title: 'Enzyme: Generate Store/Slice',
        category: 'Enzyme Generate',
        icon: '$(database)',
      },
      {
        command: 'enzyme.generate.api',
        title: 'Enzyme: Generate API Integration',
        category: 'Enzyme Generate',
        icon: '$(cloud)',
      },

      // Navigation Commands
      {
        command: 'enzyme.navigation.goToRoute',
        title: 'Enzyme: Go to Route',
        category: 'Enzyme Navigation',
        icon: '$(symbol-namespace)',
      },
      {
        command: 'enzyme.navigation.goToFeature',
        title: 'Enzyme: Go to Feature',
        category: 'Enzyme Navigation',
        icon: '$(package)',
      },
      {
        command: 'enzyme.navigation.goToStore',
        title: 'Enzyme: Go to Store',
        category: 'Enzyme Navigation',
        icon: '$(database)',
      },

      // Analysis Commands
      {
        command: 'enzyme.analysis.analyzeProject',
        title: 'Enzyme: Analyze Project',
        category: 'Enzyme Analysis',
        icon: '$(search)',
      },
      {
        command: 'enzyme.analysis.analyzeBundle',
        title: 'Enzyme: Analyze Bundle Size',
        category: 'Enzyme Analysis',
        icon: '$(package)',
      },
      {
        command: 'enzyme.analysis.findRouteConflicts',
        title: 'Enzyme: Find Route Conflicts',
        category: 'Enzyme Analysis',
        icon: '$(warning)',
      },

      // Panel Commands
      {
        command: 'enzyme.panel.showStateInspector',
        title: 'Enzyme: Show State Inspector',
        category: 'Enzyme Panel',
        icon: '$(inspect)',
      },
      {
        command: 'enzyme.panel.showPerformance',
        title: 'Enzyme: Show Performance Monitor',
        category: 'Enzyme Panel',
        icon: '$(dashboard)',
      },
      {
        command: 'enzyme.panel.showRouteVisualizer',
        title: 'Enzyme: Show Route Visualizer',
        category: 'Enzyme Panel',
        icon: '$(graph)',
      },
      {
        command: 'enzyme.panel.showAPIExplorer',
        title: 'Enzyme: Show API Explorer',
        category: 'Enzyme Panel',
        icon: '$(globe)',
      },

      // Utility Commands
      {
        command: 'enzyme.utils.refreshAll',
        title: 'Enzyme: Refresh All',
        category: 'Enzyme Utils',
        icon: '$(refresh)',
      },
      {
        command: 'enzyme.utils.openDocs',
        title: 'Enzyme: Open Documentation',
        category: 'Enzyme Utils',
        icon: '$(book)',
      },
    ],

    keybindings: [
      // Generator Commands
      {
        command: 'enzyme.generate.component',
        key: 'ctrl+shift+g c',
        mac: 'cmd+shift+g c',
        when: 'editorTextFocus',
      },
      {
        command: 'enzyme.generate.page',
        key: 'ctrl+shift+g p',
        mac: 'cmd+shift+g p',
        when: 'editorTextFocus',
      },
      {
        command: 'enzyme.generate.hook',
        key: 'ctrl+shift+g h',
        mac: 'cmd+shift+g h',
        when: 'editorTextFocus',
      },
      {
        command: 'enzyme.generate.feature',
        key: 'ctrl+shift+g f',
        mac: 'cmd+shift+g f',
        when: 'editorTextFocus',
      },
      {
        command: 'enzyme.generate.store',
        key: 'ctrl+shift+g s',
        mac: 'cmd+shift+g s',
        when: 'editorTextFocus',
      },
      {
        command: 'enzyme.generate.api',
        key: 'ctrl+shift+g a',
        mac: 'cmd+shift+g a',
        when: 'editorTextFocus',
      },

      // Navigation Commands
      {
        command: 'enzyme.navigation.goToRoute',
        key: 'ctrl+shift+r',
        mac: 'cmd+shift+r',
      },
      {
        command: 'enzyme.navigation.goToFeature',
        key: 'ctrl+shift+f',
        mac: 'cmd+shift+f',
      },
      {
        command: 'enzyme.navigation.goToStore',
        key: 'ctrl+shift+t',
        mac: 'cmd+shift+t',
      },

      // Analysis Commands
      {
        command: 'enzyme.analysis.analyzeProject',
        key: 'ctrl+shift+a p',
        mac: 'cmd+shift+a p',
      },

      // Panel Commands
      {
        command: 'enzyme.panel.showStateInspector',
        key: 'ctrl+shift+i s',
        mac: 'cmd+shift+i s',
      },
      {
        command: 'enzyme.panel.showPerformance',
        key: 'ctrl+shift+i p',
        mac: 'cmd+shift+i p',
      },
      {
        command: 'enzyme.panel.showRouteVisualizer',
        key: 'ctrl+shift+i r',
        mac: 'cmd+shift+i r',
      },
      {
        command: 'enzyme.panel.showAPIExplorer',
        key: 'ctrl+shift+i a',
        mac: 'cmd+shift+i a',
      },

      // Utility Commands
      {
        command: 'enzyme.utils.refreshAll',
        key: 'ctrl+shift+e r',
        mac: 'cmd+shift+e r',
      },
      {
        command: 'enzyme.utils.openDocs',
        key: 'ctrl+shift+e d',
        mac: 'cmd+shift+e d',
      },
    ],
  };
}

// Export all command classes for use in other parts of the extension
export * from './base-command';
export * from './generate';
export * from './navigation';
export * from './analysis';
export * from './panel';
export * from './utils';
