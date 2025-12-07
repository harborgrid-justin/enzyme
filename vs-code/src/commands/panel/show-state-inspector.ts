import * as crypto from 'node:crypto';
import * as vscode from 'vscode';
import { BaseCommand } from '../base-command';
import type { CommandContext, CommandMetadata } from '../base-command';

/**
 * Show State Inspector Command
 * Opens the state inspector webview panel
 * Keybinding: Ctrl+Shift+I S
 */
export class ShowStateInspectorCommand extends BaseCommand {
  private panel: vscode.WebviewPanel | undefined;

  /**
   *
   */
  getMetadata(): CommandMetadata {
    return {
      id: 'enzyme.panel.showStateInspector',
      title: 'Enzyme: Show State Inspector',
      category: 'Enzyme Panel',
      icon: '$(inspect)',
      keybinding: {
        key: 'ctrl+shift+i s',
        mac: 'cmd+shift+i s',
      },
    };
  }

  /**
   *
   * @param _context
   */
  protected async executeCommand(_context: CommandContext): Promise<void> {
    // If panel already exists, reveal it
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Two);
      return;
    }

    // Create new webview panel
    this.panel = vscode.window.createWebviewPanel(
      'enzymeStateInspector',
      'Enzyme State Inspector',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview'),
        ],
      }
    );

    // Set panel icon
    this.panel.iconPath = {
      light: vscode.Uri.joinPath(
        this.context.extensionUri,
        'resources',
        'light',
        'state-inspector.svg'
      ),
      dark: vscode.Uri.joinPath(
        this.context.extensionUri,
        'resources',
        'dark',
        'state-inspector.svg'
      ),
    };

    // Set webview content
    this.panel.webview.html = this.getWebviewContent(this.panel.webview);

    // Handle panel disposal
    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
      },
      null,
      this.context.subscriptions
    );

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      async (message) => this.handleWebviewMessage(message),
      null,
      this.context.subscriptions
    );

    this.log('info', 'State Inspector panel opened');
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
    // Use textContent and proper DOM methods to prevent XSS
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
    <title>State Inspector</title>
    <style nonce="${nonce}">
        body {
            padding: 0;
            margin: 0;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .container {
            padding: 20px;
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
        .store-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .store-item {
            padding: 15px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            cursor: pointer;
        }
        .store-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        .store-name {
            font-weight: 600;
            margin-bottom: 5px;
        }
        .store-state {
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        .empty-state {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }
        .empty-state-hint {
            font-size: 12px;
        }
        .refresh-button {
            padding: 6px 12px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 2px;
            cursor: pointer;
        }
        .refresh-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">State Inspector</div>
            <button class="refresh-button" id="refreshBtn">Refresh</button>
        </div>
        <div id="stores" class="store-list">
            <div class="empty-state">
                <p>No stores detected</p>
                <p class="empty-state-hint">Make sure your app is running and connected</p>
            </div>
        </div>
    </div>
    <script nonce="${nonce}">
        (function() {
            const vscode = acquireVsCodeApi();

            // Use event listeners instead of inline onclick handlers
            document.getElementById('refreshBtn').addEventListener('click', function() {
                vscode.postMessage({ type: 'refresh' });
            });

            function inspectStore(storeName) {
                vscode.postMessage({ type: 'inspect', storeName: storeName });
            }

            window.addEventListener('message', function(event) {
                const message = event.data;

                switch (message.type) {
                    case 'updateStores':
                        updateStoresList(message.stores);
                        break;
                }
            });

            // SECURITY: Use DOM methods instead of innerHTML to prevent XSS
            function updateStoresList(stores) {
                const container = document.getElementById('stores');
                container.innerHTML = '';

                if (!stores || stores.length === 0) {
                    const emptyState = document.createElement('div');
                    emptyState.className = 'empty-state';

                    const p1 = document.createElement('p');
                    p1.textContent = 'No stores detected';
                    emptyState.appendChild(p1);

                    const p2 = document.createElement('p');
                    p2.className = 'empty-state-hint';
                    p2.textContent = 'Make sure your app is running and connected';
                    emptyState.appendChild(p2);

                    container.appendChild(emptyState);
                    return;
                }

                stores.forEach(function(store) {
                    const item = document.createElement('div');
                    item.className = 'store-item';
                    item.addEventListener('click', function() {
                        inspectStore(store.name);
                    });

                    const nameDiv = document.createElement('div');
                    nameDiv.className = 'store-name';
                    nameDiv.textContent = store.name;
                    item.appendChild(nameDiv);

                    const stateDiv = document.createElement('div');
                    stateDiv.className = 'store-state';
                    const stateStr = JSON.stringify(store.state, null, 2);
                    stateDiv.textContent = stateStr.substring(0, 100) + (stateStr.length > 100 ? '...' : '');
                    item.appendChild(stateDiv);

                    container.appendChild(item);
                });
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
        this.log('info', 'Refreshing state inspector');
        // In production, this would query the running app for store state
        // For now, send mock data
        this.panel?.webview.postMessage({
          type: 'updateStores',
          stores: [
            { name: 'userStore', state: { isAuthenticated: false, user: null } },
            { name: 'themeStore', state: { mode: 'dark', fontSize: 14 } },
          ],
        });
        break;

      case 'inspect':
        this.log('info', `Inspecting store: ${message['storeName']}`);
        await this.showInfo(`Inspecting store: ${message['storeName']}`);
        break;

      default:
        this.log('warn', `Unknown message type: ${message.type}`);
    }
  }
}
