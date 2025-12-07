import * as crypto from 'node:crypto';
import * as vscode from 'vscode';
import { BaseCommand } from '../base-command';
import type { CommandContext, CommandMetadata } from '../base-command';

/**
 * Show Route Visualizer Command
 * Opens the route visualizer panel
 * Keybinding: Ctrl+Shift+I R
 */
export class ShowRouteVisualizerCommand extends BaseCommand {
  private panel: vscode.WebviewPanel | undefined;

  /**
   * Get command metadata for registration
   * @returns Command metadata object
   */
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

  /**
   * Execute the command
   * @param _context - Command execution context
   * @returns Promise that resolves when command completes
   */
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
      async (message) => this.handleWebviewMessage(message),
      null,
      this.context.subscriptions
    );

    this.log('info', 'Route Visualizer panel opened');
  }

  /**
   *
   */
  private getNonce(): string {
    return crypto.randomBytes(16).toString('base64');
  }

  /**
   *
   * @param webview
   */
  private getWebviewContent(webview: vscode.Webview): string {
    const nonce = this.getNonce();

    // SECURITY: Use nonces for both styles and scripts, no 'unsafe-inline'
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
    <title>Route Visualizer</title>
    <style nonce="${nonce}">
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
            <button class="button" id="refreshBtn">Refresh</button>
            <button class="button" id="exportBtn">Export</button>
        </div>
    </div>

    <div id="routes" class="route-tree">
        <div class="empty-state">
            <p>Loading routes...</p>
        </div>
    </div>

    <script nonce="${nonce}">
        (function() {
            const vscode = acquireVsCodeApi();

            // SECURITY: Use event listeners instead of inline onclick handlers
            document.getElementById('refreshBtn').addEventListener('click', function() {
                vscode.postMessage({ type: 'refresh' });
            });

            document.getElementById('exportBtn').addEventListener('click', function() {
                vscode.postMessage({ type: 'export' });
            });

            function navigateToRoute(path) {
                vscode.postMessage({ type: 'navigate', path: path });
            }

            window.addEventListener('message', function(event) {
                const message = event.data;

                switch (message.type) {
                    case 'updateRoutes':
                        updateRouteTree(message.routes);
                        break;
                }
            });

            // SECURITY: Use DOM methods instead of innerHTML to prevent XSS
            function updateRouteTree(routes) {
                const container = document.getElementById('routes');
                container.innerHTML = '';

                if (!routes || routes.length === 0) {
                    const emptyState = document.createElement('div');
                    emptyState.className = 'empty-state';
                    const p = document.createElement('p');
                    p.textContent = 'No routes found';
                    emptyState.appendChild(p);
                    container.appendChild(emptyState);
                    return;
                }

                routes.forEach(function(route) {
                    renderRoute(container, route, 0);
                });
            }

            function renderRoute(container, route, level) {
                const node = document.createElement('div');
                node.className = 'route-node';
                node.style.marginLeft = (level * 20) + 'px';
                node.addEventListener('click', function() {
                    navigateToRoute(route['path']);
                });

                const pathDiv = document.createElement('div');
                pathDiv.className = 'route-path';
                pathDiv.textContent = route['path'];
                node.appendChild(pathDiv);

                if (route.component) {
                    const componentDiv = document.createElement('div');
                    componentDiv.className = 'route-component';
                    componentDiv.textContent = 'Component: ' + route.component;
                    node.appendChild(componentDiv);
                }

                const guards = route.guards || [];
                if (guards.length > 0) {
                    const guardsDiv = document.createElement('div');
                    guardsDiv.className = 'route-guards';
                    guards.forEach(function(g) {
                        const badge = document.createElement('span');
                        badge.className = 'guard-badge';
                        badge.textContent = g;
                        guardsDiv.appendChild(badge);
                    });
                    node.appendChild(guardsDiv);
                }

                container.appendChild(node);

                // Render children
                if (route.children && route.children.length > 0) {
                    route.children.forEach(function(child) {
                        renderRoute(container, child, level + 1);
                    });
                }
            }

            // Request initial data
            vscode.postMessage({ type: 'refresh' });
        })();
    </script>
</body>
</html>`;
  }

  /**
   *
   * @param message
   * @param message.type
   */
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
        this.log('info', `Navigating to route: ${message['path']}`);
        await this.showInfo(`Navigate to: ${message['path']}`);
        break;
    }
  }
}
