import * as vscode from 'vscode';
import { BaseWebViewPanel } from './base-webview-panel';

/**
 * WebView panel for welcoming new users to Enzyme.
 * Provides quick start guide, tutorials, and configuration wizard.
 */
export class WelcomePanel extends BaseWebViewPanel {
	private static instance: WelcomePanel | undefined;
	private showOnStartup: boolean = true;

	private constructor(context: vscode.ExtensionContext) {
		super(context, 'enzyme.welcome', 'Welcome to Enzyme');
		this.loadPreferences();
	}

	/**
	 * Get or create the singleton instance
	 */
	public static getInstance(context: vscode.ExtensionContext): WelcomePanel {
		if (!WelcomePanel.instance) {
			WelcomePanel.instance = new WelcomePanel(context);
		}
		return WelcomePanel.instance;
	}

	/**
	 * Show the welcome panel
	 */
	public static show(context: vscode.ExtensionContext): void {
		const panel = WelcomePanel.getInstance(context);
		panel.show();
	}

	/**
	 * Show welcome panel on startup if enabled
	 */
	public static showOnStartupIfEnabled(context: vscode.ExtensionContext): void {
		const panel = WelcomePanel.getInstance(context);
		if (panel.showOnStartup) {
			panel.show();
		}
	}

	protected override getIconPath(): vscode.Uri | { light: vscode.Uri; dark: vscode.Uri } | undefined {
		return {
			light: vscode.Uri.file(this.context.asAbsolutePath('resources/icons/enzyme-light.svg')),
			dark: vscode.Uri.file(this.context.asAbsolutePath('resources/icons/enzyme-dark.svg'))
		};
	}

	protected getBodyContent(webview: vscode.Webview): string {
		const logoUri = this.getWebviewUri(webview, ['resources', 'images', 'enzyme-logo.png']);

		return `
			<div class="welcome-container">
				<div class="hero">
					<div class="logo">
						<img src="${logoUri}" alt="Enzyme Framework Logo" onerror="this.style.display='none'" />
						<h1 class="brand-name"><span class="codicon codicon-beaker"></span> Enzyme</h1>
					</div>
					<p class="tagline">Enterprise React Framework for Modern Web Applications</p>
					<p class="version">VS Code Extension v1.0.0</p>
				</div>

				<div class="content">
					<section class="section">
						<h2>
							<span class="codicon codicon-rocket" aria-hidden="true"></span>
							Quick Start
						</h2>
						<div class="quick-actions" role="list">
							<article class="action-card" data-action="create-project" role="listitem">
								<span class="action-icon codicon codicon-folder-opened" aria-hidden="true"></span>
								<h3>Create New Project</h3>
								<p>Start a new Enzyme project with our CLI</p>
								<button class="btn btn-primary" aria-label="Create new Enzyme project">Create Project</button>
							</article>

							<article class="action-card" data-action="open-generator" role="listitem">
								<span class="action-icon codicon codicon-wand" aria-hidden="true"></span>
								<h3>Generate Code</h3>
								<p>Use generators to create components, pages, and more</p>
								<button class="btn btn-primary" aria-label="Open code generator wizard">Open Generator</button>
							</article>

							<article class="action-card" data-action="configure" role="listitem">
								<span class="action-icon codicon codicon-settings-gear" aria-hidden="true"></span>
								<h3>Configure Extension</h3>
								<p>Set up your preferences and workspace settings</p>
								<button class="btn btn-primary" aria-label="Configure Enzyme extension settings">Configure</button>
							</article>
						</div>
					</section>

					<section class="section">
						<h2>
							<span class="codicon codicon-star" aria-hidden="true"></span>
							Key Features
						</h2>
						<div class="features-grid" role="list">
							<article class="feature-item" role="listitem">
								<span class="feature-icon codicon codicon-inspect" aria-hidden="true"></span>
								<h3>State Inspector</h3>
								<p>Real-time Zustand state visualization and time-travel debugging</p>
								<a href="#" class="feature-link" data-action="open-state-inspector" aria-label="Open State Inspector panel">Open Inspector</a>
							</article>

							<article class="feature-item" role="listitem">
								<span class="feature-icon codicon codicon-dashboard" aria-hidden="true"></span>
								<h3>Performance Monitor</h3>
								<p>Track Core Web Vitals and optimize your application</p>
								<a href="#" class="feature-link" data-action="open-performance" aria-label="Open Performance Monitor panel">Open Monitor</a>
							</article>

							<article class="feature-item" role="listitem">
								<span class="feature-icon codicon codicon-type-hierarchy" aria-hidden="true"></span>
								<h3>Route Visualizer</h3>
								<p>Interactive route tree and navigation flow diagrams</p>
								<a href="#" class="feature-link" data-action="open-routes" aria-label="Open Route Visualizer panel">Open Visualizer</a>
							</article>

							<article class="feature-item" role="listitem">
								<span class="feature-icon codicon codicon-server-environment" aria-hidden="true"></span>
								<h3>Feature Dashboard</h3>
								<p>Manage feature flags and A/B tests with ease</p>
								<a href="#" class="feature-link" data-action="open-features" aria-label="Open Feature Dashboard panel">Open Dashboard</a>
							</article>

							<article class="feature-item" role="listitem">
								<span class="feature-icon codicon codicon-globe" aria-hidden="true"></span>
								<h3>API Explorer</h3>
								<p>Test and debug APIs right from VS Code</p>
								<a href="#" class="feature-link" data-action="open-api" aria-label="Open API Explorer panel">Open Explorer</a>
							</article>

							<article class="feature-item" role="listitem">
								<span class="feature-icon codicon codicon-wand" aria-hidden="true"></span>
								<h3>Code Generators</h3>
								<p>Scaffold components, hooks, and more with templates</p>
								<a href="#" class="feature-link" data-action="open-generator" aria-label="Open code generator wizard">Open Generator</a>
							</article>
						</div>
					</section>

					<section class="section">
						<h2>
							<span class="codicon codicon-book"></span>
							Learn More
						</h2>
						<div class="resources-grid">
							<a href="https://enzyme.dev/docs" class="resource-card" target="_blank">
								<span class="codicon codicon-book"></span>
								<h3>Documentation</h3>
								<p>Complete guides and API reference</p>
							</a>

							<a href="https://enzyme.dev/tutorial" class="resource-card" target="_blank">
								<span class="codicon codicon-mortar-board"></span>
								<h3>Tutorials</h3>
								<p>Step-by-step learning paths</p>
							</a>

							<a href="https://enzyme.dev/examples" class="resource-card" target="_blank">
								<span class="codicon codicon-code"></span>
								<h3>Examples</h3>
								<p>Sample projects and code snippets</p>
							</a>

							<a href="https://github.com/enzyme/enzyme" class="resource-card" target="_blank">
								<span class="codicon codicon-github"></span>
								<h3>GitHub</h3>
								<p>Source code and issue tracker</p>
							</a>
						</div>
					</section>

					<section class="section">
						<h2>
							<span class="codicon codicon-keyboard"></span>
							Keyboard Shortcuts
						</h2>
						<div class="shortcuts-list">
							<div class="shortcut-item">
								<kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd>
								<span>Open Enzyme Command Palette</span>
							</div>
							<div class="shortcut-item">
								<kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>
								<span>Open State Inspector</span>
							</div>
							<div class="shortcut-item">
								<kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>
								<span>Open Performance Monitor</span>
							</div>
							<div class="shortcut-item">
								<kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>G</kbd>
								<span>Open Code Generator</span>
							</div>
						</div>
					</section>

					<section class="section configuration-section">
						<h2>
							<span class="codicon codicon-settings"></span>
							Configuration Wizard
						</h2>
						<p>Let's set up your Enzyme development environment</p>

						<div class="config-wizard">
							<div class="config-item">
								<label class="checkbox-label">
									<input type="checkbox" id="enableAutoComplete" checked />
									<span>Enable IntelliSense for Enzyme APIs</span>
								</label>
							</div>

							<div class="config-item">
								<label class="checkbox-label">
									<input type="checkbox" id="enableLinting" checked />
									<span>Enable Enzyme-specific linting rules</span>
								</label>
							</div>

							<div class="config-item">
								<label class="checkbox-label">
									<input type="checkbox" id="enableFormatting" checked />
									<span>Format files on save with Enzyme conventions</span>
								</label>
							</div>

							<div class="config-item">
								<label class="checkbox-label">
									<input type="checkbox" id="showTelemetry" />
									<span>Send anonymous usage data to help improve Enzyme</span>
								</label>
							</div>

							<button id="saveConfig" class="btn btn-primary">Save Configuration</button>
						</div>
					</section>

					<section class="section">
						<h2>
							<span class="codicon codicon-comment-discussion"></span>
							Get Help
						</h2>
						<div class="help-links">
							<a href="https://enzyme.dev/discord" target="_blank">
								<span class="codicon codicon-comment"></span>
								Join Discord Community
							</a>
							<a href="https://enzyme.dev/docs/troubleshooting" target="_blank">
								<span class="codicon codicon-debug"></span>
								Troubleshooting Guide
							</a>
							<a href="https://github.com/enzyme/enzyme/issues" target="_blank">
								<span class="codicon codicon-issues"></span>
								Report an Issue
							</a>
						</div>
					</section>
				</div>

				<div class="footer">
					<label class="checkbox-label">
						<input type="checkbox" id="showOnStartup" ${this.showOnStartup ? 'checked' : ''} />
						<span>Show this page on startup</span>
					</label>
				</div>
			</div>
		`;
	}

	protected override getStyles(webview: vscode.Webview, nonce: string): string {
		const sharedStylesUri = this.getWebviewUri(webview, ['src', 'webview-ui', 'shared', 'styles.css']);
		const welcomeStylesUri = this.getWebviewUri(webview, ['src', 'webview-ui', 'welcome', 'styles.css']);
		return `
			<link nonce="${nonce}" rel="stylesheet" href="${sharedStylesUri}">
			<link nonce="${nonce}" rel="stylesheet" href="${welcomeStylesUri}">
		`;
	}

	protected getScripts(webview: vscode.Webview, nonce: string): string {
		const scriptUri = this.getWebviewUri(webview, ['src', 'webview-ui', 'welcome', 'main.js']);
		return `<script nonce="${nonce}" src="${scriptUri}"></script>`;
	}

	protected async handleMessage(message: any): Promise<void> {
		switch (message.type) {
			case 'openStateInspector':
				vscode.commands.executeCommand('enzyme.openStateInspector');
				break;

			case 'openPerformance':
				vscode.commands.executeCommand('enzyme.openPerformance');
				break;

			case 'openRoutes':
				vscode.commands.executeCommand('enzyme.openRouteVisualizer');
				break;

			case 'openFeatures':
				vscode.commands.executeCommand('enzyme.openFeatureDashboard');
				break;

			case 'openAPI':
				vscode.commands.executeCommand('enzyme.openAPIExplorer');
				break;

			case 'openGenerator':
				vscode.commands.executeCommand('enzyme.openGenerator');
				break;

			case 'createProject':
				await this.createNewProject();
				break;

			case 'configure':
				await this.openSettings();
				break;

			case 'saveConfig':
				await this.saveConfiguration(message.payload);
				break;

			case 'toggleShowOnStartup':
				await this.toggleShowOnStartup(message.payload);
				break;
		}
	}

	private async createNewProject(): Promise<void> {
		const projectName = await vscode.window.showInputBox({
			prompt: 'Enter project name',
			placeHolder: 'my-enzyme-app',
			validateInput: (value) => {
				if (!value || value.trim().length === 0) {
					return 'Project name is required';
				}
				if (!/^[a-z0-9-]+$/.test(value)) {
					return 'Project name can only contain lowercase letters, numbers, and hyphens';
				}
				return null;
			}
		});

		if (projectName) {
			const terminal = vscode.window.createTerminal('Enzyme');
			terminal.show();
			terminal.sendText(`npx create-enzyme-app ${projectName}`);
		}
	}

	private async openSettings(): Promise<void> {
		await vscode.commands.executeCommand('workbench.action.openSettings', 'enzyme');
	}

	private async saveConfiguration(config: Record<string, boolean>): Promise<void> {
		const configuration = vscode.workspace.getConfiguration('enzyme');

		for (const [key, value] of Object.entries(config)) {
			await configuration.update(key, value, vscode.ConfigurationTarget.Global);
		}

		vscode.window.showInformationMessage('Configuration saved successfully');
	}

	private async toggleShowOnStartup(show: boolean): Promise<void> {
		this.showOnStartup = show;
		await this.persistState('showOnStartup', show, true);
	}

	private loadPreferences(): void {
		this.showOnStartup = this.getPersistedState<boolean>('showOnStartup', true, true);
	}

	public override dispose(): void {
		super.dispose();
		WelcomePanel.instance = undefined;
	}
}
