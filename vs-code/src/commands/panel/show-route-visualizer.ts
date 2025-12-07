import * as vscode from 'vscode';
import { BaseCommand, CommandContext, CommandMetadata } from '../base-command';

/**
 * Show Route Visualizer Command
 * Opens the route visualizer panel
 * Keybinding: Ctrl+Shift+I R
 */
export class ShowRouteVisualizerCommand extends BaseCommand {
  private panel: vscode.WebviewPanel | undefined;

  getMetadata(): CommandMetadata {
    return {
      id: 'enzyme.panel.showRouteVisualizer',
      title: 'Enzyme: Show Route Visualizer',
      category: 'Enzyme Panel',
      icon: '$(graph)',
      keybinding: {
        key: 'ctrl+shift+i r',
        mac: 'cmd+shift+i r',
      },
    };
  }

  protected async executeCommand(_context: CommandContext): Promise<void> {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Two);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'enzymeRouteVisualizer',
      'Enzyme Route Visualizer',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    this.panel.webview.html = this.getWebviewContent(this.panel.webview);

    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
      },
      null,
      this.context.subscriptions
    );

    this.panel.webview.onDidReceiveMessage(
      (message) => this.handleWebviewMessage(message),
      null,
      this.context.subscriptions
    );

    this.log('info', 'Route Visualizer panel opened');
  }

  private getWebviewContent(webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';">
    <title>Route Visualizer</title>
    <style>
        body {
            padding: 20px;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .title {
            font-size: 18px;
            font-weight: 600;
        }
        .toolbar {
            display: flex;
            gap: 10px;
        }
        .button {
            padding: 4px 8px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-size: 12px;
        }
        .button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .route-tree {
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
        }
        .route-node {
            margin: 5px 0;
            padding: 8px 12px;
            border-left: 2px solid var(--vscode-charts-blue);
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            cursor: pointer;
        }
        .route-node:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        .route-path {
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
        }
        .route-component {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 3px;
        }
        .route-guards {
            display: inline-flex;
            gap: 5px;
            margin-top: 3px;
        }
        .guard-badge {
            font-size: 10px;
            padding: 2px 6px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 3px;
        }
        .nested {
            margin-left: 20px;
        }
        .empty-state {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">Route Visualizer</div>
        <div class="toolbar">
            <button class="button" onclick="refresh()">Refresh</button>
            <button class="button" onclick="exportRoutes()">Export</button>
        </div>
    </div>

    <div id="routes" class="route-tree">
        <div class="empty-state">
            <p>Loading routes...</p>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function refresh() {
            vscode.postMessage({ type: 'refresh' });
        }

        function exportRoutes() {
            vscode.postMessage({ type: 'export' });
        }

        function navigateToRoute(path) {
            vscode.postMessage({ type: 'navigate', path });
        }

        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.type) {
                case 'updateRoutes':
                    updateRouteTree(message.routes);
                    break;
            }
        });

        function updateRouteTree(routes) {
            const container = document.getElementById('routes');

            if (!routes || routes.length === 0) {
                container.innerHTML = \`
                    <div class="empty-state">
                        <p>No routes found</p>
                    </div>
                \`;
                return;
            }

            container.innerHTML = routes.map(route => renderRoute(route)).join('');
        }

        function renderRoute(route, level = 0) {
            const guards = route.guards || [];
            const guardBadges = guards.map(g => \`<span class="guard-badge">\${g}</span>\`).join('');

            let html = \`
                <div class="route-node" onclick="navigateToRoute('\${route.path}')" style="margin-left: \${level * 20}px">
                    <div class="route-path">\${route.path}</div>
                    \${route.component ? \`<div class="route-component">Component: \${route.component}</div>\` : ''}
                    \${guards.length > 0 ? \`<div class="route-guards">\${guardBadges}</div>\` : ''}
                </div>
            \`;

            if (route.children && route.children.length > 0) {
                html += route.children.map(child => renderRoute(child, level + 1)).join('');
            }

            return html;
        }

        // Request initial data
        refresh();
    </script>
</body>
</html>`;
  }

  private async handleWebviewMessage(message: { type: string; [key: string]: unknown }): Promise<void> {
    switch (message.type) {
      case 'refresh':
        this.log('info', 'Refreshing route visualizer');
        // Send mock route data
        this.panel?.webview.postMessage({
          type: 'updateRoutes',
          routes: [
            {
              path: '/',
              component: 'HomePage',
              guards: [],
            },
            {
              path: '/dashboard',
              component: 'DashboardPage',
              guards: ['auth'],
              children: [
                { path: '/dashboard/overview', component: 'OverviewPage', guards: ['auth'] },
                { path: '/dashboard/analytics', component: 'AnalyticsPage', guards: ['auth', 'admin'] },
              ],
            },
            {
              path: '/users/:id',
              component: 'UserDetailPage',
              guards: ['auth'],
            },
          ],
        });
        break;

      case 'export':
        this.log('info', 'Exporting routes');
        await this.showInfo('Route export functionality coming soon!');
        break;

      case 'navigate':
        this.log('info', `Navigating to route: ${message.path}`);
        await this.showInfo(`Navigate to: ${message.path}`);
        break;
    }
  }
}
