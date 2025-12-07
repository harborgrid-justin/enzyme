import * as crypto from 'node:crypto';
import * as vscode from 'vscode';
import { BaseCommand } from '../base-command';
import type { CommandContext, CommandMetadata } from '../base-command';

/**
 * Show API Explorer Command
 * Opens the API explorer panel for testing endpoints
 * Keybinding: Ctrl+Shift+I A
 */
export class ShowAPIExplorerCommand extends BaseCommand {
  private panel: vscode.WebviewPanel | undefined;

  /**
   *
   */
  getMetadata(): CommandMetadata {
    return {
      id: 'enzyme.panel.showAPIExplorer',
      title: 'Enzyme: Show API Explorer',
      category: 'Enzyme Panel',
      icon: '$(globe)',
      keybinding: {
        key: 'ctrl+shift+i a',
        mac: 'cmd+shift+i a',
      },
    };
  }

  /**
   *
   * @param _context
   */
  protected async executeCommand(_context: CommandContext): Promise<void> {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Two);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'enzymeAPIExplorer',
      'Enzyme API Explorer',
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

    this.log('info', 'API Explorer panel opened');
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
    <title>API Explorer</title>
    <style nonce="${nonce}">
        body {
            padding: 0;
            margin: 0;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .container {
            display: flex;
            height: 100vh;
        }
        .sidebar {
            width: 250px;
            border-right: 1px solid var(--vscode-panel-border);
            padding: 20px;
            overflow-y: auto;
        }
        .main {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
        }
        .header {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .endpoint-group {
            margin-bottom: 20px;
        }
        .group-title {
            font-size: 12px;
            font-weight: 600;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
            text-transform: uppercase;
        }
        .endpoint-item {
            padding: 8px 12px;
            margin-bottom: 5px;
            cursor: pointer;
            border-radius: 3px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .endpoint-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        .endpoint-item.active {
            background-color: var(--vscode-list-activeSelectionBackground);
            color: var(--vscode-list-activeSelectionForeground);
        }
        .method {
            font-size: 10px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 2px;
        }
        .method.get { background-color: #4caf50; color: white; }
        .method.post { background-color: #2196f3; color: white; }
        .method.put { background-color: #ff9800; color: white; }
        .method.delete { background-color: #f44336; color: white; }
        .request-section {
            margin-bottom: 20px;
        }
        .section-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        .form-group {
            margin-bottom: 15px;
        }
        .form-label {
            display: block;
            font-size: 12px;
            margin-bottom: 5px;
            color: var(--vscode-descriptionForeground);
        }
        .form-input {
            width: 100%;
            padding: 6px 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            font-family: var(--vscode-editor-font-family);
        }
        .form-textarea {
            min-height: 100px;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
        }
        .button {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-weight: 600;
        }
        .button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .response-container {
            margin-top: 20px;
            padding: 15px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }
        .response-status {
            font-weight: 600;
            margin-bottom: 10px;
        }
        .response-status.success { color: #4caf50; }
        .response-status.error { color: #f44336; }
        .response-body {
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            white-space: pre-wrap;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="sidebar">
            <div class="header">Endpoints</div>
            <div class="endpoint-group">
                <div class="group-title">Users</div>
                <div class="endpoint-item active" data-method="GET" data-path="/api/users">
                    <span class="method get">GET</span>
                    <span>/api/users</span>
                </div>
                <div class="endpoint-item" data-method="POST" data-path="/api/users">
                    <span class="method post">POST</span>
                    <span>/api/users</span>
                </div>
                <div class="endpoint-item" data-method="GET" data-path="/api/users/:id">
                    <span class="method get">GET</span>
                    <span>/api/users/:id</span>
                </div>
            </div>
            <div class="endpoint-group">
                <div class="group-title">Products</div>
                <div class="endpoint-item" data-method="GET" data-path="/api/products">
                    <span class="method get">GET</span>
                    <span>/api/products</span>
                </div>
            </div>
        </div>
        <div class="main">
            <div class="header">Request</div>

            <div class="request-section">
                <div class="section-title">URL</div>
                <div class="form-group">
                    <input type="text" class="form-input" id="url" value="/api/users" />
                </div>
            </div>

            <div class="request-section">
                <div class="section-title">Headers</div>
                <div class="form-group">
                    <textarea class="form-input form-textarea" id="headers" placeholder="{\n  \"Content-Type\": \"application/json\"\n}"></textarea>
                </div>
            </div>

            <div class="request-section">
                <div class="section-title">Body</div>
                <div class="form-group">
                    <textarea class="form-input form-textarea" id="body" placeholder="{\n  \"name\": \"John Doe\"\n}"></textarea>
                </div>
            </div>

            <button class="button" id="sendBtn">Send Request</button>

            <div id="response" class="response-container" style="display: none;">
                <div class="section-title">Response</div>
                <div class="response-status" id="status"></div>
                <div class="response-body" id="responseBody"></div>
            </div>
        </div>
    </div>

    <script nonce="${nonce}">
        (function() {
            const vscode = acquireVsCodeApi();
            let currentMethod = 'GET';

            // SECURITY: Use event delegation instead of inline onclick handlers
            document.querySelectorAll('.endpoint-item').forEach(function(item) {
                item.addEventListener('click', function() {
                    currentMethod = this.dataset.method;
                    document.getElementById('url').value = this.dataset.path;

                    // Update active state
                    document.querySelectorAll('.endpoint-item').forEach(function(el) {
                        el.classList.remove('active');
                    });
                    this.classList.add('active');
                });
            });

            document.getElementById('sendBtn').addEventListener('click', function() {
                const url = document.getElementById('url').value;
                const headers = document.getElementById('headers').value;
                const body = document.getElementById('body').value;

                try {
                    vscode.postMessage({
                        type: 'sendRequest',
                        method: currentMethod,
                        url: url,
                        headers: headers ? JSON.parse(headers) : {},
                        body: body || undefined
                    });
                } catch (e) {
                    // Handle JSON parse error for headers
                    vscode.postMessage({
                        type: 'sendRequest',
                        method: currentMethod,
                        url: url,
                        headers: {},
                        body: body || undefined
                    });
                }
            });

            window.addEventListener('message', function(event) {
                const message = event.data;

                switch (message.type) {
                    case 'response':
                        displayResponse(message);
                        break;
                }
            });

            function displayResponse(response) {
                const responseDiv = document.getElementById('response');
                const statusDiv = document.getElementById('status');
                const bodyDiv = document.getElementById('responseBody');

                responseDiv.style.display = 'block';

                // SECURITY: Use textContent instead of innerHTML
                statusDiv.textContent = 'Status: ' + response.status + ' ' + response.statusText;
                statusDiv.className = 'response-status ' + (response.status < 400 ? 'success' : 'error');

                bodyDiv.textContent = JSON.stringify(response.body, null, 2);
            }
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
      case 'sendRequest':
        this.log('info', `Sending ${message['method']} request to ${message['url']}`);

        // Simulate API response
        const mockResponse = {
          status: 200,
          statusText: 'OK',
          body: {
            success: true,
            data: [
              { id: 1, name: 'User 1' },
              { id: 2, name: 'User 2' },
            ],
          },
        };

        this.panel?.webview.postMessage({
          type: 'response',
          ...mockResponse,
        });
        break;
    }
  }
}
