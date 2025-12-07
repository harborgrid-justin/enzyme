import * as vscode from 'vscode';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * WebView panel options
 */
export interface WebViewPanelOptions {
	/** Retain context when hidden (default: true) - set to false for simple panels to improve performance */
	retainContextWhenHidden?: boolean;
	/** Enable find widget (default: false) */
	enableFindWidget?: boolean;
	/** Enable command URIs (default: false) */
	enableCommandUris?: boolean;
}

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
	protected options: WebViewPanelOptions;

	/**
	 * PERFORMANCE: Default retainContextWhenHidden to false to reduce memory usage
	 * Only set to true for webviews that need to preserve state when hidden
	 */
	constructor(
		context: vscode.ExtensionContext,
		viewType: string,
		title: string,
		options: WebViewPanelOptions = {}
	) {
		this.context = context;
		this.viewType = viewType;
		this.title = title;
		this.options = {
			retainContextWhenHidden: options.retainContextWhenHidden ?? false, // PERFORMANCE: Changed default from true to false
			enableFindWidget: options.enableFindWidget ?? false,
			enableCommandUris: options.enableCommandUris ?? false,
		};
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
	 * PERFORMANCE: Create webview panel with lazy HTML loading
	 * HTML content is only generated when the panel becomes visible
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
				retainContextWhenHidden: this.options.retainContextWhenHidden,
				enableFindWidget: this.options.enableFindWidget,
				enableCommandUris: this.options.enableCommandUris,
				localResourceRoots: [
					vscode.Uri.file(path.join(this.context.extensionPath, 'out')),
					vscode.Uri.file(path.join(this.context.extensionPath, 'resources')),
					vscode.Uri.file(path.join(this.context.extensionPath, 'src', 'webview-ui'))
				]
			}
		);

		// PERFORMANCE: Lazy load HTML content only when visible
		if (this.panel.visible) {
			this.panel.webview.html = this.getHtmlContent(this.panel.webview);
		}
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

		// PERFORMANCE: Handle view state changes with lazy content loading
		this.panel.onDidChangeViewState(
			(e) => {
				if (e.webviewPanel.visible) {
					// PERFORMANCE: Load HTML content when panel becomes visible
					if (!e.webviewPanel.webview.html || e.webviewPanel.webview.html.length < 100) {
						e.webviewPanel.webview.html = this.getHtmlContent(e.webviewPanel.webview);
					}
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
	 * SECURITY: Implements strict Content Security Policy
	 */
	protected getHtmlContent(webview: vscode.Webview): string {
		const nonce = this.getNonce();
		const cspSource = webview.cspSource;

		// Get the current color theme
		const theme = this.getCurrentTheme();

		// SECURITY: Build strict CSP
		const csp = this.buildContentSecurityPolicy(cspSource, nonce);

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="${csp}">
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
	 * SECURITY: Build strict Content Security Policy
	 *
	 * Implements defense-in-depth CSP following OWASP and Microsoft VS Code guidelines:
	 * - Block everything by default (default-src 'none')
	 * - Only allow vetted resources with nonces
	 * - No eval() or unsafe-inline
	 * - Prevent clickjacking (frame-ancestors 'none')
	 * - Block form submissions (form-action 'none')
	 * - Prevent base tag hijacking (base-uri 'none')
	 *
	 * Override this method in subclasses to customize CSP for specific webviews
	 *
	 * @param cspSource - VS Code webview CSP source
	 * @param nonce - Cryptographic nonce for inline scripts/styles
	 * @returns CSP header value
	 */
	protected buildContentSecurityPolicy(cspSource: string, nonce: string): string {
		// SECURITY: Start with strictest policy - deny everything
		const directives = [
			"default-src 'none'",

			// SECURITY: Only allow styles from extension with nonce (no unsafe-inline)
			`style-src ${cspSource} 'nonce-${nonce}'`,

			// SECURITY: Only allow scripts with nonce (no eval, no unsafe-inline, no unsafe-eval)
			`script-src 'nonce-${nonce}'`,

			// SECURITY: Only allow fonts from extension
			`font-src ${cspSource}`,

			// SECURITY: Only allow HTTPS images, data URIs, and extension resources
			// Note: 'https:' allows any HTTPS image source (required for some features)
			// Override this method if you need stricter image CSP
			`img-src ${cspSource} https: data:`,

			// SECURITY: Only allow connections to extension resources by default
			// Override this method if you need to connect to external APIs
			`connect-src ${cspSource}`,

			// SECURITY: Block object/embed/applet tags
			"object-src 'none'",

			// SECURITY: Prevent base tag hijacking
			"base-uri 'none'",

			// SECURITY: Block form submissions (webviews should use postMessage)
			"form-action 'none'",

			// SECURITY: Prevent framing (clickjacking protection)
			"frame-ancestors 'none'",

			// SECURITY: Disable plugins
			"plugin-types 'none'",

			// SECURITY: Block worker/shared-worker (unless specifically needed)
			"worker-src 'none'",
			"child-src 'none'",
		];

		return directives.join('; ');
	}

	/**
	 * Get the current VS Code theme (light, dark, high-contrast, or high-contrast-light)
	 */
	protected getCurrentTheme(): string {
		const theme = vscode.window.activeColorTheme.kind;
		switch (theme) {
			case vscode.ColorThemeKind.Light:
				return 'light';
			case vscode.ColorThemeKind.HighContrastLight:
				return 'high-contrast-light';
			case vscode.ColorThemeKind.HighContrast:
				return 'high-contrast';
			case vscode.ColorThemeKind.Dark:
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
