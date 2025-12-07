import * as vscode from 'vscode';
import { EnzymeCompletionProvider, getCompletionTriggerCharacters } from './completion-provider';
import { EnzymeDefinitionProvider } from './definition-provider';
import { EnzymeDocumentSymbolProvider } from './document-symbol-provider';
import { EnzymeIndex, getIndex } from './enzyme-index';
import { EnzymeFoldingProvider } from './folding-provider';
import { EnzymeHoverProvider } from './hover-provider';
import { EnzymeInlayHintsProvider } from './inlay-hints-provider';
import { EnzymeParser, getParser } from './parser';
import { EnzymeReferenceProvider } from './reference-provider';
import { EnzymeRenameProvider } from './rename-provider';
import { EnzymeSemanticTokensProvider, getSemanticTokensConfiguration } from './semantic-tokens-provider';
import { EnzymeSignatureProvider, getSignatureTriggerCharacters } from './signature-provider';
import { EnzymeWorkspaceSymbolProvider } from './workspace-symbol-provider';

/**
 * Export all language providers
 */
export {
  EnzymeCompletionProvider,
  EnzymeHoverProvider,
  EnzymeDefinitionProvider,
  EnzymeReferenceProvider,
  EnzymeSignatureProvider,
  EnzymeDocumentSymbolProvider,
  EnzymeWorkspaceSymbolProvider,
  EnzymeRenameProvider,
  EnzymeFoldingProvider,
  EnzymeSemanticTokensProvider,
  EnzymeInlayHintsProvider,
  EnzymeIndex,
  EnzymeParser,
  getIndex,
  getParser,
};

/**
 * Language selector for TypeScript/JavaScript files
 */
const LANGUAGE_SELECTOR: vscode.DocumentSelector = [
  { scheme: 'file', language: 'typescript' },
  { scheme: 'file', language: 'typescriptreact' },
  { scheme: 'file', language: 'javascript' },
  { scheme: 'file', language: 'javascriptreact' },
];

/**
 * Register all language providers
 * @param context Extension context
 * @param workspaceRoot Workspace root path
 */
export async function registerLanguageProviders(
  context: vscode.ExtensionContext,
  workspaceRoot: string
): Promise<void> {
  console.log('Registering Enzyme language providers...');

  // Initialize and start indexing
  const index = getIndex(workspaceRoot);
  await index.startIndexing();

  // Show indexing status
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title: 'Enzyme: Indexing workspace',
    },
    async () => {
      // Wait for initial indexing to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    }
  );

  // Log index statistics
  const stats = index.getStats();
  console.log('Enzyme index statistics:', stats);
  vscode.window.showInformationMessage(
    `Enzyme: Indexed ${stats.routes} routes, ${stats.components} components, ${stats.hooks} hooks, ${stats.stores} stores across ${stats.totalFiles} files`
  );

  // Register completion provider
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    LANGUAGE_SELECTOR,
    new EnzymeCompletionProvider(),
    ...getCompletionTriggerCharacters()
  );
  context.subscriptions.push(completionProvider);

  // Register hover provider
  const hoverProvider = vscode.languages.registerHoverProvider(
    LANGUAGE_SELECTOR,
    new EnzymeHoverProvider()
  );
  context.subscriptions.push(hoverProvider);

  // Register definition provider
  const definitionProvider = vscode.languages.registerDefinitionProvider(
    LANGUAGE_SELECTOR,
    new EnzymeDefinitionProvider()
  );
  context.subscriptions.push(definitionProvider);

  // Register reference provider
  const referenceProvider = vscode.languages.registerReferenceProvider(
    LANGUAGE_SELECTOR,
    new EnzymeReferenceProvider()
  );
  context.subscriptions.push(referenceProvider);

  // Register signature help provider
  const signatureProvider = vscode.languages.registerSignatureHelpProvider(
    LANGUAGE_SELECTOR,
    new EnzymeSignatureProvider(),
    ...getSignatureTriggerCharacters()
  );
  context.subscriptions.push(signatureProvider);

  // Register document symbol provider
  const documentSymbolProvider = vscode.languages.registerDocumentSymbolProvider(
    LANGUAGE_SELECTOR,
    new EnzymeDocumentSymbolProvider()
  );
  context.subscriptions.push(documentSymbolProvider);

  // Register workspace symbol provider
  const workspaceSymbolProvider = vscode.languages.registerWorkspaceSymbolProvider(
    new EnzymeWorkspaceSymbolProvider()
  );
  context.subscriptions.push(workspaceSymbolProvider);

  // Register rename provider
  const renameProvider = vscode.languages.registerRenameProvider(
    LANGUAGE_SELECTOR,
    new EnzymeRenameProvider()
  );
  context.subscriptions.push(renameProvider);

  // Register folding range provider
  const foldingProvider = vscode.languages.registerFoldingRangeProvider(
    LANGUAGE_SELECTOR,
    new EnzymeFoldingProvider()
  );
  context.subscriptions.push(foldingProvider);

  // Register semantic tokens provider
  const semanticTokensProvider = new EnzymeSemanticTokensProvider();
  const semanticTokensRegistration = vscode.languages.registerDocumentSemanticTokensProvider(
    LANGUAGE_SELECTOR,
    semanticTokensProvider,
    semanticTokensProvider.getLegend()
  );
  context.subscriptions.push(semanticTokensRegistration);

  // Register inlay hints provider
  const inlayHintsProvider = vscode.languages.registerInlayHintsProvider(
    LANGUAGE_SELECTOR,
    new EnzymeInlayHintsProvider()
  );
  context.subscriptions.push(inlayHintsProvider);

  // Register refresh commands
  context.subscriptions.push(
    vscode.commands.registerCommand('enzyme.refreshLanguageFeatures', async () => {
      await index.refresh();
      vscode.window.showInformationMessage('Enzyme language features refreshed');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('enzyme.showIndexStats', () => {
      const stats = index.getStats();
      vscode.window.showInformationMessage(
        `Enzyme Index:\n` +
        `Routes: ${stats.routes}\n` +
        `Components: ${stats.components}\n` +
        `Hooks: ${stats.hooks}\n` +
        `Stores: ${stats.stores}\n` +
        `APIs: ${stats.apis}\n` +
        `Files: ${stats.totalFiles}`
      );
    })
  );

  // Register index change handler to refresh diagnostics
  index.onDidChange(() => {
    // Trigger refresh of language features
    vscode.commands.executeCommand('enzyme.refreshDiagnostics');
  });

  // Dispose index on deactivation
  context.subscriptions.push({
    dispose: () => {
      index.dispose();
    },
  });

  console.log('Enzyme language providers registered successfully');
}

/**
 * Configuration for semantic tokens (for package.json)
 */
export function getSemanticTokensContribution() {
  const config = getSemanticTokensConfiguration();

  return {
    semanticTokenTypes: config.tokenTypes.map(type => ({
      id: type,
      description: `Enzyme ${type} token`,
    })),
    semanticTokenModifiers: config.tokenModifiers.map(modifier => ({
      id: modifier,
      description: `Enzyme ${modifier} modifier`,
    })),
    semanticTokenScopes: [
      {
        language: 'typescript',
        scopes: {
          enzymeRoute: ['variable.other.constant.enzyme.route'],
          enzymeHook: ['entity.name.function.enzyme.hook'],
          enzymeFeature: ['entity.name.type.enzyme.feature'],
          enzymeStore: ['entity.name.type.enzyme.store'],
          enzymeApi: ['entity.name.function.enzyme.api'],
        },
      },
      {
        language: 'typescriptreact',
        scopes: {
          enzymeRoute: ['variable.other.constant.enzyme.route'],
          enzymeHook: ['entity.name.function.enzyme.hook'],
          enzymeFeature: ['entity.name.type.enzyme.feature'],
          enzymeStore: ['entity.name.type.enzyme.store'],
          enzymeApi: ['entity.name.function.enzyme.api'],
        },
      },
    ],
  };
}

/**
 * Get language features status
 */
export function getLanguageFeaturesStatus(): {
  indexing: boolean;
  stats: {
    routes: number;
    components: number;
    hooks: number;
    stores: number;
    apis: number;
    totalFiles: number;
  };
} {
  try {
    const index = getIndex();
    return {
      indexing: false, // Would need to track this in EnzymeIndex
      stats: index.getStats(),
    };
  } catch {
    return {
      indexing: false,
      stats: {
        routes: 0,
        components: 0,
        hooks: 0,
        stores: 0,
        apis: 0,
        totalFiles: 0,
      },
    };
  }
}

/**
 * Language features configuration options
 */
export interface LanguageFeaturesConfig {
  enableCompletions: boolean;
  enableHover: boolean;
  enableDefinitions: boolean;
  enableReferences: boolean;
  enableRename: boolean;
  enableSignatureHelp: boolean;
  enableDocumentSymbols: boolean;
  enableWorkspaceSymbols: boolean;
  enableFolding: boolean;
  enableSemanticTokens: boolean;
  enableInlayHints: boolean;
}

/**
 * Get language features configuration from workspace settings
 */
export function getLanguageFeaturesConfig(): LanguageFeaturesConfig {
  const config = vscode.workspace.getConfiguration('enzyme');

  return {
    enableCompletions: config.get('enableCompletions', true),
    enableHover: config.get('enableHover', true),
    enableDefinitions: config.get('enableDefinitions', true),
    enableReferences: config.get('enableReferences', true),
    enableRename: config.get('enableRename', true),
    enableSignatureHelp: config.get('enableSignatureHelp', true),
    enableDocumentSymbols: config.get('enableDocumentSymbols', true),
    enableWorkspaceSymbols: config.get('enableWorkspaceSymbols', true),
    enableFolding: config.get('enableFolding', true),
    enableSemanticTokens: config.get('enableSemanticTokens', true),
    enableInlayHints: config.get('enableInlayHints', true),
  };
}
