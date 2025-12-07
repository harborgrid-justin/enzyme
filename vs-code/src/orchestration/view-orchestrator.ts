/**
 * ViewOrchestrator - Coordinates TreeViews and WebViews
 */

import * as vscode from 'vscode';
import { EventBus } from './event-bus';
import { LoggerService } from '../services/logger-service';

/**
 * View type
 */
export enum ViewType {
  TREE_VIEW = 'treeview',
  WEB_VIEW = 'webview',
}

/**
 * View state
 */
export interface ViewState {
  visible: boolean;
  focused: boolean;
  data?: unknown;
  lastUpdate?: number;
}

/**
 * TreeView registration
 */
export interface TreeViewRegistration {
  id: string;
  viewId: string;
  provider: vscode.TreeDataProvider<unknown>;
  view: vscode.TreeView<unknown>;
  state: ViewState;
}

/**
 * WebView registration
 */
export interface WebViewRegistration {
  id: string;
  viewType: string;
  panel: vscode.WebviewPanel;
  state: ViewState;
  messageHandler?: (message: unknown) => void;
}

/**
 * ViewOrchestrator - Manages all views
 */
export class ViewOrchestrator {
  private static instance: ViewOrchestrator;
  private eventBus: EventBus;
  private logger: LoggerService;
  private treeViews: Map<string, TreeViewRegistration> = new Map();
  private webViews: Map<string, WebViewRegistration> = new Map();
  private layoutState: Map<string, unknown> = new Map();

  private constructor(eventBus: EventBus, logger: LoggerService) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  /**
   * Create the view orchestrator
   */
  public static create(eventBus: EventBus, logger: LoggerService): ViewOrchestrator {
    if (!ViewOrchestrator.instance) {
      ViewOrchestrator.instance = new ViewOrchestrator(eventBus, logger);
    }
    return ViewOrchestrator.instance;
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): ViewOrchestrator {
    if (!ViewOrchestrator.instance) {
      throw new Error('ViewOrchestrator not created. Call create() first.');
    }
    return ViewOrchestrator.instance;
  }

  /**
   * Register a TreeView
   */
  public registerTreeView(
    id: string,
    viewId: string,
    provider: vscode.TreeDataProvider<unknown>
  ): vscode.TreeView<unknown> {
    const view = vscode.window.createTreeView(viewId, {
      treeDataProvider: provider,
      showCollapseAll: true,
    });

    const registration: TreeViewRegistration = {
      id,
      viewId,
      provider,
      view,
      state: {
        visible: view.visible,
        focused: false,
      },
    };

    // Track visibility changes
    view.onDidChangeVisibility(e => {
      registration.state.visible = e.visible;
      this.logger.debug(`TreeView visibility changed: ${id} - ${e.visible}`);
    });

    // Track selection changes
    view.onDidChangeSelection(e => {
      this.logger.debug(`TreeView selection changed: ${id}`, { selection: e.selection });
    });

    this.treeViews.set(id, registration);
    this.logger.info(`TreeView registered: ${id}`);

    return view;
  }

  /**
   * Register a WebView
   */
  public registerWebView(
    id: string,
    viewType: string,
    title: string,
    column: vscode.ViewColumn = vscode.ViewColumn.One,
    options?: vscode.WebviewPanelOptions & vscode.WebviewOptions,
    messageHandler?: (message: unknown) => void
  ): vscode.WebviewPanel {
    const panel = vscode.window.createWebviewPanel(
      viewType,
      title,
      column,
      options
    );

    const registration: WebViewRegistration = {
      id,
      viewType,
      panel,
      state: {
        visible: panel.visible,
        focused: panel.active,
      },
      messageHandler,
    };

    // Handle messages
    if (messageHandler) {
      panel.webview.onDidReceiveMessage(messageHandler);
    }

    // Track state changes
    panel.onDidChangeViewState(e => {
      registration.state.visible = e.webviewPanel.visible;
      registration.state.focused = e.webviewPanel.active;
      this.logger.debug(`WebView state changed: ${id}`, {
        visible: e.webviewPanel.visible,
        active: e.webviewPanel.active,
      });
    });

    // Handle disposal
    panel.onDidDispose(() => {
      this.webViews.delete(id);
      this.logger.info(`WebView disposed: ${id}`);
    });

    this.webViews.set(id, registration);
    this.logger.info(`WebView registered: ${id}`);

    return panel;
  }

  /**
   * Get TreeView by ID
   */
  public getTreeView(id: string): vscode.TreeView<unknown> | undefined {
    return this.treeViews.get(id)?.view;
  }

  /**
   * Get WebView by ID
   */
  public getWebView(id: string): vscode.WebviewPanel | undefined {
    return this.webViews.get(id)?.panel;
  }

  /**
   * Refresh TreeView
   */
  public refreshTreeView(id: string): void {
    const registration = this.treeViews.get(id);
    if (registration) {
      if ('refresh' in registration.provider && typeof registration.provider.refresh === 'function') {
        (registration.provider as any).refresh();
      }
      this.logger.debug(`TreeView refreshed: ${id}`);
    }
  }

  /**
   * Update WebView content
   */
  public updateWebView(id: string, html: string): void {
    const registration = this.webViews.get(id);
    if (registration) {
      registration.panel.webview.html = html;
      registration.state.lastUpdate = Date.now();
      this.logger.debug(`WebView updated: ${id}`);
    }
  }

  /**
   * Post message to WebView
   */
  public postMessage(id: string, message: unknown): void {
    const registration = this.webViews.get(id);
    if (registration) {
      registration.panel.webview.postMessage(message);
      this.logger.debug(`Message posted to WebView: ${id}`, { message });
    }
  }

  /**
   * Focus view
   */
  public focusView(id: string): void {
    const treeView = this.treeViews.get(id);
    if (treeView) {
      // TreeViews don't have a focus method, but we can reveal them
      this.logger.debug(`TreeView focused: ${id}`);
      return;
    }

    const webView = this.webViews.get(id);
    if (webView) {
      webView.panel.reveal();
      this.logger.debug(`WebView focused: ${id}`);
    }
  }

  /**
   * Get view state
   */
  public getViewState(id: string): ViewState | undefined {
    const treeView = this.treeViews.get(id);
    if (treeView) {
      return treeView.state;
    }

    const webView = this.webViews.get(id);
    if (webView) {
      return webView.state;
    }

    return undefined;
  }

  /**
   * Synchronize view states
   */
  public synchronizeViews(sourceId: string, targetIds: string[], data: unknown): void {
    this.logger.debug(`Synchronizing views from ${sourceId}`, { targetIds });

    for (const targetId of targetIds) {
      const webView = this.webViews.get(targetId);
      if (webView) {
        this.postMessage(targetId, { type: 'sync', data });
      }
    }
  }

  /**
   * Save layout state
   */
  public saveLayout(context: vscode.ExtensionContext): void {
    const layout: Record<string, unknown> = {};

    for (const [id, registration] of this.treeViews) {
      layout[id] = registration.state;
    }

    for (const [id, registration] of this.webViews) {
      layout[id] = registration.state;
    }

    context.globalState.update('enzyme.viewLayout', layout);
    this.logger.debug('View layout saved');
  }

  /**
   * Restore layout state
   */
  public restoreLayout(context: vscode.ExtensionContext): void {
    const layout = context.globalState.get<Record<string, ViewState>>('enzyme.viewLayout', {});

    for (const [id, state] of Object.entries(layout)) {
      this.layoutState.set(id, state);
    }

    this.logger.info('View layout restored');
  }

  /**
   * Get all TreeViews
   */
  public getAllTreeViews(): Map<string, TreeViewRegistration> {
    return new Map(this.treeViews);
  }

  /**
   * Get all WebViews
   */
  public getAllWebViews(): Map<string, WebViewRegistration> {
    return new Map(this.webViews);
  }

  /**
   * Get view statistics
   */
  public getStatistics(): {
    treeViews: number;
    webViews: number;
    visibleTreeViews: number;
    visibleWebViews: number;
  } {
    let visibleTreeViews = 0;
    for (const registration of this.treeViews.values()) {
      if (registration.state.visible) {
        visibleTreeViews++;
      }
    }

    let visibleWebViews = 0;
    for (const registration of this.webViews.values()) {
      if (registration.state.visible) {
        visibleWebViews++;
      }
    }

    return {
      treeViews: this.treeViews.size,
      webViews: this.webViews.size,
      visibleTreeViews,
      visibleWebViews,
    };
  }

  /**
   * Dispose all views
   */
  public dispose(): void {
    this.logger.info('Disposing all views');

    for (const registration of this.treeViews.values()) {
      registration.view.dispose();
    }

    for (const registration of this.webViews.values()) {
      registration.panel.dispose();
    }

    this.treeViews.clear();
    this.webViews.clear();
    this.layoutState.clear();
  }
}
