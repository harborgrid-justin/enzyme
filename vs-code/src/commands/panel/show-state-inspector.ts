import * as vscode from 'vscode';
import { BaseCommand, CommandContext, CommandMetadata } from '../base-command';

/**
 * Show State Inspector Command
 * Opens the state inspector webview panel
 * Keybinding: Ctrl+Shift+I S
 */
export class ShowStateInspectorCommand extends BaseCommand {
  private panel: vscode.WebviewPanel | undefined;

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
      (message) => this.handleWebviewMessage(message),
      null,
      this.context.subscriptions
    );

    this.log('info', 'State Inspector panel opened');
  }

  private getWebviewContent(webview: vscode.Webview): string {
    // In production, this would load the compiled webview bundle
    // For now, we'll provide a placeholder HTML

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';">
    <title>State Inspector</title>
    <style>
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
            <button class="refresh-button" onclick="refreshStores()">Refresh</button>
        </div>
        <div id="stores" class="store-list">
            <div class="empty-state">
                <p>No stores detected</p>
                <p style="font-size: 12px;">Make sure your app is running and connected</p>
            </div>
        </div>
    </div>
    <script>
        const vscode = acquireVsCodeApi();

        function refreshStores() {
            vscode.postMessage({ type: 'refresh' });
        }

        function inspectStore(storeName) {
            vscode.postMessage({ type: 'inspect', storeName });
        }

        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.type) {
                case 'updateStores':
                    updateStoresList(message.stores);
                    break;
            }
        });

        function updateStoresList(stores) {
            const container = document.getElementById('stores');

            if (!stores || stores.length === 0) {
                container.innerHTML = \`
                    <div class="empty-state">
                        <p>No stores detected</p>
                        <p style="font-size: 12px;">Make sure your app is running and connected</p>
                    </div>
                \`;
                return;
            }

            container.innerHTML = stores.map(store => \`
                <div class="store-item" onclick="inspectStore('\${store.name}')">
                    <div class="store-name">\${store.name}</div>
                    <div class="store-state">\${JSON.stringify(store.state, null, 2).substring(0, 100)}...</div>
                </div>
            \`).join('');
        }

        // Request initial data
        refreshStores();
    </script>
</body>
</html>`;
  }

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
        this.log('info', `Inspecting store: ${message.storeName}`);
        await this.showInfo(`Inspecting store: ${message.storeName}`);
        break;

      default:
        this.log('warn', `Unknown message type: ${message.type}`);
    }
  }
}
