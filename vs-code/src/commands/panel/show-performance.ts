import * as crypto from 'node:crypto';
import * as vscode from 'vscode';
import { BaseCommand } from '../base-command';
import type { CommandContext, CommandMetadata } from '../base-command';

/**
 * Show Performance Command
 * Opens the performance monitoring panel
 * Keybinding: Ctrl+Shift+I P
 */
export class ShowPerformanceCommand extends BaseCommand {
  private panel: vscode.WebviewPanel | undefined;

  /**
   * Get command metadata for registration
   * @returns Command metadata object
   */
  getMetadata(): CommandMetadata {
    return {
      id: 'enzyme.panel.showPerformance',
      title: 'Enzyme: Show Performance Monitor',
      category: 'Enzyme Panel',
      icon: '$(dashboard)',
      keybinding: {
        key: 'ctrl+shift+i p',
        mac: 'cmd+shift+i p',
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
      'enzymePerformance',
      'Enzyme Performance',
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

    this.log('info', 'Performance panel opened');
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
    <title>Performance Monitor</title>
    <style nonce="${nonce}">
        body {
            padding: 20px;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .header {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .metric-card {
            padding: 15px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }
        .metric-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 5px;
        }
        .metric-value {
            font-size: 24px;
            font-weight: 600;
        }
        .metric-value.good { color: #4caf50; }
        .metric-value.warning { color: #ff9800; }
        .metric-value.bad { color: #f44336; }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        .renders-list {
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
        }
        .render-item {
            padding: 8px;
            margin-bottom: 5px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-left: 3px solid var(--vscode-charts-blue);
        }
        .render-item.slow {
            border-left-color: var(--vscode-charts-red);
        }
        .waiting-state {
            color: var(--vscode-descriptionForeground);
            padding: 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">Performance Monitor</div>

    <div class="metrics">
        <div class="metric-card">
            <div class="metric-label">FCP (First Contentful Paint)</div>
            <div class="metric-value good" id="fcp">-</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">LCP (Largest Contentful Paint)</div>
            <div class="metric-value good" id="lcp">-</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">FID (First Input Delay)</div>
            <div class="metric-value good" id="fid">-</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">CLS (Cumulative Layout Shift)</div>
            <div class="metric-value good" id="cls">-</div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Component Renders</div>
        <div id="renders" class="renders-list">
            <div class="waiting-state">
                Waiting for performance data...
            </div>
        </div>
    </div>

    <script nonce="${nonce}">
        (function() {
            const vscode = acquireVsCodeApi();

            // Simulate performance data updates
            setInterval(function() {
                document.getElementById('fcp').textContent = (Math.random() * 2000).toFixed(0) + 'ms';
                document.getElementById('lcp').textContent = (Math.random() * 3000).toFixed(0) + 'ms';
                document.getElementById('fid').textContent = (Math.random() * 100).toFixed(0) + 'ms';
                document.getElementById('cls').textContent = (Math.random() * 0.1).toFixed(3);
            }, 2000);
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
    this.log('info', `Performance panel message: ${message.type}`);
  }
}
