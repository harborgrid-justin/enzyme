/**
 * @file WebView Registration
 * @description Registers command handlers for WebView panels
 */

import * as vscode from 'vscode';
import { EnzymeExtensionContext } from '../../core/context';
import { logger } from '../../core/logger';
import {
  StateInspectorPanel,
  PerformancePanel,
  RouteVisualizerPanel,
  APIExplorerPanel,
} from './index';

/**
 * Register all WebView panel commands
 */
export function registerWebViewProviders(
  enzymeContext: EnzymeExtensionContext
): vscode.Disposable[] {
  logger.info('Registering WebView providers');

  const context = enzymeContext.getContext();
  const disposables: vscode.Disposable[] = [];

  try {
    // State Inspector Panel
    const stateInspectorCommand = vscode.commands.registerCommand(
      'enzyme.panel.showStateInspector',
      () => {
        StateInspectorPanel.show(context);
      }
    );
    disposables.push(stateInspectorCommand);
    logger.info('State Inspector panel command registered');

    // Performance Panel
    const performanceCommand = vscode.commands.registerCommand(
      'enzyme.panel.showPerformance',
      () => {
        PerformancePanel.show(context);
      }
    );
    disposables.push(performanceCommand);
    logger.info('Performance panel command registered');

    // Route Visualizer Panel
    const routeVisualizerCommand = vscode.commands.registerCommand(
      'enzyme.panel.showRouteVisualizer',
      () => {
        RouteVisualizerPanel.show(context);
      }
    );
    disposables.push(routeVisualizerCommand);
    logger.info('Route Visualizer panel command registered');

    // API Explorer Panel
    const apiExplorerCommand = vscode.commands.registerCommand(
      'enzyme.panel.showAPIExplorer',
      () => {
        APIExplorerPanel.show(context);
      }
    );
    disposables.push(apiExplorerCommand);
    logger.info('API Explorer panel command registered');

    logger.success('All WebView providers registered successfully');

  } catch (error) {
    logger.error('Failed to register WebView providers', error);
    throw error;
  }

  return disposables;
}
