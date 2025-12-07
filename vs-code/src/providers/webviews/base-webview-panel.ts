import * as vscode from 'vscode';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Base class for all WebView panels in the Enzyme extension.
 * Provides common functionality for panel lifecycle, messaging, state persistence,
 * and security (CSP).
 */
export abstract class BaseWebViewPanel {
	protected panel: vscode.WebviewPanel | undefined;
	protected disposables: vscode.Disposable[] = [];
	protected context: vscode.ExtensionContext;
	protected viewType: string;
	protected title: string;

	constructor(
		context: vscode.ExtensionContext,
		viewType: string,
		title: string
	) {
		this.context = context;
		this.viewType = viewType;
		this.title = title;
	}

	/**
	 * Create or reveal the WebView panel
	 */
	public show(): void {
		if (this.panel) {
			this.panel.reveal(vscode.ViewColumn.One);
		} else {
			this.createPanel();
		}
	}

	/**
	 * Create a new WebView panel
	 */
	protected createPanel(): void {
		const columnToShowIn = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: vscode.ViewColumn.One;

		this.panel = vscode.window.createWebviewPanel(
			this.viewType,
			this.title,
			columnToShowIn || vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [
					vscode.Uri.file(path.join(this.context.extensionPath, 'out')),
					vscode.Uri.file(path.join(this.context.extensionPath, 'resources')),
					vscode.Uri.file(path.join(this.context.extensionPath, 'src', 'webview-ui'))
				]
			}
		);

		this.panel.webview.html = this.getHtmlContent(this.panel.webview);
		this.panel.iconPath = this.getIconPath();

		// Handle messages from the webview
		this.panel.webview.onDidReceiveMessage(
			(message) => this.handleMessage(message),
			undefined,
			this.disposables
		);

		// Handle panel disposal
		this.panel.onDidDispose(
			() => this.dispose(),
			undefined,
			this.disposables
		);

		// Handle view state changes
		this.panel.onDidChangeViewState(
			(e) => {
				if (e.webviewPanel.visible) {
					this.onPanelVisible();
				} else {
					this.onPanelHidden();
				}
			},
			undefined,
			this.disposables
		);

		// Notify subclass that panel was created
		this.onPanelCreated();
	}

	/**
	 * Generate HTML content for the webview
	 */
	protected getHtmlContent(webview: vscode.Webview): string {
		const nonce = this.getNonce();
		const cspSource = webview.cspSource;

		// Get the current color theme
		const theme = this.getCurrentTheme();

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}'; font-src ${cspSource}; img-src ${cspSource} https: data:; connect-src https:;">
	<title>${this.title}</title>
	${this.getStyles(webview, nonce)}
</head>
<body data-theme="${theme}">
	${this.getBodyContent(webview)}
	${this.getScripts(webview, nonce)}
</body>
</html>`;
	}

	/**
	 * Get the current VS Code theme (light, dark, or high-contrast)
	 */
	protected getCurrentTheme(): string {
		const theme = vscode.window.activeColorTheme.kind;
		switch (theme) {
			case vscode.ColorThemeKind.Light:
			case vscode.ColorThemeKind.HighContrastLight:
				return 'light';
			case vscode.ColorThemeKind.Dark:
			case vscode.ColorThemeKind.HighContrast:
			default:
				return 'dark';
		}
	}

	/**
	 * Get icon path for the panel
	 */
	protected getIconPath(): vscode.Uri | { light: vscode.Uri; dark: vscode.Uri } | undefined {
		return undefined;
	}

	/**
	 * Generate styles for the webview
	 * Override this method to add custom styles
	 */
	protected getStyles(webview: vscode.Webview, nonce: string): string {
		const sharedStylesUri = this.getWebviewUri(webview, ['src', 'webview-ui', 'shared', 'styles.css']);
		return `<link nonce="${nonce}" rel="stylesheet" href="${sharedStylesUri}">`;
	}

	/**
	 * Generate body content for the webview
	 * Override this method to provide custom content
	 */
	protected abstract getBodyContent(webview: vscode.Webview): string;

	/**
	 * Generate scripts for the webview
	 * Override this method to add custom scripts
	 */
	protected abstract getScripts(webview: vscode.Webview, nonce: string): string;

	/**
	 * Handle messages received from the webview
	 * Override this method to handle custom messages
	 */
	protected abstract handleMessage(message: any): void;

	/**
	 * Called when the panel is created
	 * Override to perform initialization
	 */
	protected onPanelCreated(): void {
		// Override in subclass
	}

	/**
	 * Called when the panel becomes visible
	 */
	protected onPanelVisible(): void {
		// Override in subclass
	}

	/**
	 * Called when the panel becomes hidden
	 */
	protected onPanelHidden(): void {
		// Override in subclass
	}

	/**
	 * Send a message to the webview
	 */
	protected postMessage(message: any): Thenable<boolean> | undefined {
		return this.panel?.webview.postMessage(message);
	}

	/**
	 * Persist state to workspace or global state
	 */
	protected async persistState(key: string, value: any, global: boolean = false): Promise<void> {
		const stateKey = `${this.viewType}.${key}`;
		const storage = global ? this.context.globalState : this.context.workspaceState;
		await storage.update(stateKey, value);
	}

	/**
	 * Retrieve persisted state
	 */
	protected getPersistedState<T>(key: string, defaultValue: T, global: boolean = false): T {
		const stateKey = `${this.viewType}.${key}`;
		const storage = global ? this.context.globalState : this.context.workspaceState;
		return storage.get<T>(stateKey, defaultValue);
	}

	/**
	 * Generate a nonce for CSP
	 */
	protected getNonce(): string {
		return crypto.randomBytes(16).toString('base64');
	}

	/**
	 * Get a webview URI for a resource
	 */
	protected getWebviewUri(webview: vscode.Webview, pathSegments: string[]): vscode.Uri {
		const diskPath = vscode.Uri.file(
			path.join(this.context.extensionPath, ...pathSegments)
		);
		return webview.asWebviewUri(diskPath);
	}

	/**
	 * Dispose of the panel and clean up resources
	 */
	public dispose(): void {
		if (this.panel) {
			this.panel.dispose();
			this.panel = undefined;
		}

		while (this.disposables.length) {
			const disposable = this.disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}

	/**
	 * Check if the panel is currently visible
	 */
	public isVisible(): boolean {
		return this.panel?.visible ?? false;
	}

	/**
	 * Check if the panel exists (but may not be visible)
	 */
	public exists(): boolean {
		return this.panel !== undefined;
	}
}
