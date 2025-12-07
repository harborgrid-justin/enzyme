/**
 * @file TreeView Registration
 * @description Registers all TreeView providers for the Enzyme extension
 */

import * as vscode from 'vscode';
import { logger } from '../../core/logger';
import { ViewOrchestrator } from '../../orchestration/view-orchestrator';
import {
  EnzymeFeaturesTreeProvider,
  EnzymeRoutesTreeProvider,
  EnzymeComponentsTreeProvider,
  EnzymeStateTreeProvider,
  EnzymeAPITreeProvider,
} from './index';
import type { EnzymeExtensionContext } from '../../core/context';

/**
 * Performance TreeView provider placeholder
 * TODO: Implement full performance metrics tree
 */
class EnzymePerformanceTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  /**
   *
   * @param _context
   */
  constructor(_context: vscode.ExtensionContext) {
    // Context parameter reserved for future use
  }

  /**
   * Refresh the tree view
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Get tree item representation for VS Code
   * @param element
   * @returns The tree item
   */
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children of a tree item
   * @param element
   * @returns Array of child tree items
   */
  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (!element) {
      // Root items - placeholder for now
      const item = new vscode.TreeItem('Performance Metrics', vscode.TreeItemCollapsibleState.None);
      item.description = 'Coming Soon';
      item.iconPath = new vscode.ThemeIcon('pulse');
      return [item];
    }
    return [];
  }
}

/**
 * Register all TreeView providers
 * @param enzymeContext
 * @returns Array of disposables for cleanup
 */
export function registerTreeViewProviders(
  enzymeContext: EnzymeExtensionContext
): vscode.Disposable[] {
  logger.info('Registering TreeView providers');

  const context = enzymeContext.getContext();
  const disposables: vscode.Disposable[] = [];

  try {
    // Get or create ViewOrchestrator
    const viewOrchestrator = ViewOrchestrator.getInstance();

    // Features TreeView
    const featuresProvider = new EnzymeFeaturesTreeProvider(context);
    const featuresView = viewOrchestrator.registerTreeView(
      'features-tree',
      'enzyme.views.features',
      featuresProvider as vscode.TreeDataProvider<unknown>
    );
    disposables.push(featuresView);
    logger.info('Features TreeView registered');

    // Routes TreeView
    const routesProvider = new EnzymeRoutesTreeProvider(context);
    const routesView = viewOrchestrator.registerTreeView(
      'routes-tree',
      'enzyme.views.routes',
      routesProvider as vscode.TreeDataProvider<unknown>
    );
    disposables.push(routesView);
    logger.info('Routes TreeView registered');

    // Components TreeView
    const componentsProvider = new EnzymeComponentsTreeProvider(context);
    const componentsView = viewOrchestrator.registerTreeView(
      'components-tree',
      'enzyme.views.components',
      componentsProvider as vscode.TreeDataProvider<unknown>
    );
    disposables.push(componentsView);
    logger.info('Components TreeView registered');

    // State Stores TreeView
    const stateProvider = new EnzymeStateTreeProvider(context);
    const stateView = viewOrchestrator.registerTreeView(
      'state-tree',
      'enzyme.views.stores',
      stateProvider as vscode.TreeDataProvider<unknown>
    );
    disposables.push(stateView);
    logger.info('State Stores TreeView registered');

    // API Clients TreeView
    const apiProvider = new EnzymeAPITreeProvider(context);
    const apiView = viewOrchestrator.registerTreeView(
      'api-tree',
      'enzyme.views.api',
      apiProvider as vscode.TreeDataProvider<unknown>
    );
    disposables.push(apiView);
    logger.info('API Clients TreeView registered');

    // Performance TreeView
    const performanceProvider = new EnzymePerformanceTreeProvider(context);
    const performanceView = viewOrchestrator.registerTreeView(
      'performance-tree',
      'enzyme.views.performance',
      performanceProvider as vscode.TreeDataProvider<unknown>
    );
    disposables.push(performanceView);
    logger.info('Performance TreeView registered');

    // Store providers in context for later access
    enzymeContext.registerDisposable({
      dispose: () => {
        featuresProvider.dispose();
        routesProvider.dispose();
        componentsProvider.dispose();
        stateProvider.dispose();
        apiProvider.dispose();
      }
    });

    logger.success('All TreeView providers registered successfully');

  } catch (error) {
    logger.error('Failed to register TreeView providers', error);
    throw error;
  }

  return disposables;
}
