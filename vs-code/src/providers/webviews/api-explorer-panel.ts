import * as vscode from 'vscode';
import { BaseWebViewPanel } from './base-webview-panel';

interface APIEndpoint {
	id: string;
	name: string;
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
	url: string;
	description?: string;
	headers?: Record<string, string>;
	body?: string;
	params?: Record<string, string>;
	collection?: string;
}

interface APIRequest {
	id: string;
	endpoint: APIEndpoint;
	timestamp: number;
	response?: {
		status: number;
		statusText: string;
		headers: Record<string, string>;
		body: any;
		time: number;
	};
	error?: string;
}

interface Environment {
	name: string;
	variables: Record<string, string>;
}

/**
 * WebView panel for exploring and testing APIs.
 * Provides Postman-like functionality for API testing within VS Code.
 */
export class APIExplorerPanel extends BaseWebViewPanel {
	private static instance: APIExplorerPanel | undefined;
	private endpoints: APIEndpoint[] = [];
	private requestHistory: APIRequest[] = [];
	private environments: Environment[] = [];
	private activeEnvironment: string | null = null;
	private readonly maxHistorySize = 50;

	private constructor(context: vscode.ExtensionContext) {
		super(context, 'enzyme.apiExplorer', 'Enzyme API Explorer');
		this.loadData();
	}

	/**
	 * Get or create the singleton instance
	 */
	public static getInstance(context: vscode.ExtensionContext): APIExplorerPanel {
		if (!APIExplorerPanel.instance) {
			APIExplorerPanel.instance = new APIExplorerPanel(context);
		}
		return APIExplorerPanel.instance;
	}

	/**
	 * Show the API explorer panel
	 */
	public static show(context: vscode.ExtensionContext): void {
		const panel = APIExplorerPanel.getInstance(context);
		panel.show();
	}

	protected getIconPath(): vscode.Uri | { light: vscode.Uri; dark: vscode.Uri } | undefined {
		return {
			light: vscode.Uri.file(this.context.asAbsolutePath('resources/icons/api-light.svg')),
			dark: vscode.Uri.file(this.context.asAbsolutePath('resources/icons/api-dark.svg'))
		};
	}

	protected getBodyContent(webview: vscode.Webview): string {
		return `
			<div class="container">
				<div class="header">
					<h1>
						<span class="codicon codicon-globe"></span>
						API Explorer
					</h1>
					<div class="header-actions">
						<label for="environmentSelect" class="visually-hidden">Select environment</label>
						<select id="environmentSelect" class="select" aria-label="Select environment">
							<option value="">No Environment</option>
						</select>
						<button id="manageEnvironments" class="btn btn-secondary" title="Manage Environments" aria-label="Manage API environments">
							<span class="codicon codicon-settings-gear" aria-hidden="true"></span>
						</button>
						<button id="importCollection" class="btn btn-secondary" title="Import Collection" aria-label="Import API collection from file">
							<span class="codicon codicon-import" aria-hidden="true"></span>
						</button>
					</div>
				</div>

				<div class="content">
					<nav class="sidebar" aria-label="API collections and history">
						<div class="sidebar-header">
							<h2>Collections</h2>
							<button id="newCollection" class="btn btn-icon" title="New Collection" aria-label="Create new API collection">
								<span class="codicon codicon-new-folder" aria-hidden="true"></span>
							</button>
						</div>
						<div id="collectionsTree" class="collections-tree" role="tree" aria-label="API collections">
							<div class="empty-state-small" role="status">
								<p>No collections yet. Create one to get started.</p>
							</div>
						</div>

						<div class="sidebar-header">
							<h2>History</h2>
							<button id="clearHistory" class="btn btn-icon" title="Clear History" aria-label="Clear request history">
								<span class="codicon codicon-clear-all" aria-hidden="true"></span>
							</button>
						</div>
						<div id="historyList" class="history-list" role="list" aria-label="Request history">
							<div class="empty-state-small" role="status">
								<p>No requests yet. Send a request to see history.</p>
							</div>
						</div>
					</nav>

					<main class="main-panel" role="main">
						<div class="request-builder">
							<div class="request-line" role="group" aria-label="API request configuration">
								<label for="requestMethod" class="visually-hidden">HTTP method</label>
								<select id="requestMethod" class="select method-select" aria-label="Select HTTP method">
									<option value="GET">GET</option>
									<option value="POST">POST</option>
									<option value="PUT">PUT</option>
									<option value="DELETE">DELETE</option>
									<option value="PATCH">PATCH</option>
								</select>
								<label for="requestUrl" class="visually-hidden">Request URL</label>
								<input
									type="text"
									id="requestUrl"
									class="input url-input"
									placeholder="Enter request URL..."
									aria-label="Enter request URL"
								/>
								<button id="sendRequest" class="btn btn-primary" aria-label="Send API request">
									<span class="codicon codicon-play" aria-hidden="true"></span>
									Send
								</button>
								<button id="saveRequest" class="btn btn-secondary" title="Save Request" aria-label="Save request to collection">
									<span class="codicon codicon-save" aria-hidden="true"></span>
								</button>
							</div>

							<div class="request-tabs">
								<button class="tab-button active" data-tab="params">Params</button>
								<button class="tab-button" data-tab="headers">Headers</button>
								<button class="tab-button" data-tab="body">Body</button>
								<button class="tab-button" data-tab="auth">Auth</button>
							</div>

							<div class="tab-content">
								<div id="paramsTab" class="tab-pane active">
									<div class="key-value-editor">
										<div class="kv-header">
											<span>Key</span>
											<span>Value</span>
											<span>Actions</span>
										</div>
										<div id="paramsEditor" class="kv-rows">
											<div class="kv-row">
												<input type="text" class="input kv-key" placeholder="Key" />
												<input type="text" class="input kv-value" placeholder="Value" />
												<button class="btn btn-icon kv-delete">
													<span class="codicon codicon-trash"></span>
												</button>
											</div>
										</div>
										<button id="addParam" class="btn btn-secondary btn-sm">
											<span class="codicon codicon-add"></span>
											Add Parameter
										</button>
									</div>
								</div>

								<div id="headersTab" class="tab-pane">
									<div class="key-value-editor">
										<div class="kv-header">
											<span>Key</span>
											<span>Value</span>
											<span>Actions</span>
										</div>
										<div id="headersEditor" class="kv-rows">
											<div class="kv-row">
												<input type="text" class="input kv-key" placeholder="Content-Type" />
												<input type="text" class="input kv-value" placeholder="application/json" />
												<button class="btn btn-icon kv-delete">
													<span class="codicon codicon-trash"></span>
												</button>
											</div>
										</div>
										<button id="addHeader" class="btn btn-secondary btn-sm">
											<span class="codicon codicon-add"></span>
											Add Header
										</button>
									</div>
								</div>

								<div id="bodyTab" class="tab-pane">
									<div class="body-type-selector">
										<select id="bodyType" class="select">
											<option value="none">None</option>
											<option value="json">JSON</option>
											<option value="text">Text</option>
											<option value="form-data">Form Data</option>
										</select>
									</div>
									<div id="bodyEditor" class="body-editor">
										<textarea
											id="bodyContent"
											class="textarea code-textarea"
											rows="10"
											placeholder="Request body..."
										></textarea>
									</div>
								</div>

								<div id="authTab" class="tab-pane">
									<div class="form-group">
										<label>Authentication Type</label>
										<select id="authType" class="select">
											<option value="none">No Auth</option>
											<option value="bearer">Bearer Token</option>
											<option value="basic">Basic Auth</option>
											<option value="api-key">API Key</option>
										</select>
									</div>
									<div id="authFields" class="auth-fields">
										<!-- Auth fields will be rendered dynamically -->
									</div>
								</div>
							</div>
						</div>

						<div class="response-panel">
							<div class="response-header">
								<h3>Response</h3>
								<div class="response-info" id="responseInfo" style="display: none;">
									<span class="status-badge" id="statusBadge">200 OK</span>
									<span class="response-time" id="responseTime">0ms</span>
									<span class="response-size" id="responseSize">0 B</span>
								</div>
							</div>

							<div id="responseContent" class="response-content">
								<div class="empty-state">
									<span class="codicon codicon-info"></span>
									<p>Send a request to see the response</p>
								</div>
							</div>

							<div class="response-tabs" id="responseTabs" style="display: none;">
								<button class="tab-button active" data-tab="response-body">Body</button>
								<button class="tab-button" data-tab="response-headers">Headers</button>
								<button class="tab-button" data-tab="response-cookies">Cookies</button>
							</div>

							<div class="response-tab-content" id="responseTabContent">
								<div id="responseBodyTab" class="tab-pane active">
									<div class="response-actions">
										<button id="prettyPrint" class="btn btn-icon" title="Pretty Print">
											<span class="codicon codicon-symbol-key"></span>
										</button>
										<button id="copyResponse" class="btn btn-icon" title="Copy Response">
											<span class="codicon codicon-copy"></span>
										</button>
									</div>
									<pre id="responseBody" class="response-body"></pre>
								</div>

								<div id="responseHeadersTab" class="tab-pane">
									<div id="responseHeaders" class="response-headers-list"></div>
								</div>

								<div id="responseCookiesTab" class="tab-pane">
									<div id="responseCookies" class="response-cookies-list"></div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div class="footer">
					<div class="footer-item">
						<span class="codicon codicon-history"></span>
						<span id="historyCount">0 requests</span>
					</div>
					<div class="footer-item">
						<span class="codicon codicon-folder"></span>
						<span id="endpointsCount">0 endpoints</span>
					</div>
				</div>
			</div>
		`;
	}

	protected getScripts(webview: vscode.Webview, nonce: string): string {
		const scriptUri = this.getWebviewUri(webview, ['src', 'webview-ui', 'api-explorer', 'main.js']);
		return `<script nonce="${nonce}" src="${scriptUri}"></script>`;
	}

	protected async handleMessage(message: any): Promise<void> {
		switch (message.type) {
			case 'sendRequest':
				await this.sendRequest(message.payload);
				break;

			case 'saveEndpoint':
				await this.saveEndpoint(message.payload);
				break;

			case 'deleteEndpoint':
				await this.deleteEndpoint(message.payload);
				break;

			case 'clearHistory':
				await this.clearHistory();
				break;

			case 'saveEnvironment':
				await this.saveEnvironment(message.payload);
				break;

			case 'deleteEnvironment':
				await this.deleteEnvironment(message.payload);
				break;

			case 'setActiveEnvironment':
				this.setActiveEnvironment(message.payload);
				break;

			case 'importCollection':
				await this.importCollection();
				break;

			case 'exportCollection':
				await this.exportCollection(message.payload);
				break;
		}
	}

	protected onPanelCreated(): void {
		this.sendDataUpdate();
	}

	protected onPanelVisible(): void {
		this.sendDataUpdate();
	}

	private async sendRequest(payload: {
		method: string;
		url: string;
		headers?: Record<string, string>;
		body?: string;
		params?: Record<string, string>;
	}): Promise<void> {
		const startTime = Date.now();

		try {
			// Replace environment variables in URL
			const processedUrl = this.replaceEnvironmentVariables(payload.url);

			// In a real implementation, this would make an actual HTTP request
			// For now, we'll simulate a response
			const simulatedResponse = {
				status: 200,
				statusText: 'OK',
				headers: {
					'content-type': 'application/json',
					'date': new Date().toUTCString()
				},
				body: {
					message: 'This is a simulated response',
					timestamp: Date.now(),
					request: {
						method: payload.method,
						url: processedUrl
					}
				},
				time: Math.random() * 1000 + 100
			};

			const request: APIRequest = {
				id: this.generateId(),
				endpoint: {
					id: this.generateId(),
					name: `${payload.method} ${payload.url}`,
					method: payload.method as any,
					url: payload.url,
					headers: payload.headers,
					body: payload.body,
					params: payload.params
				},
				timestamp: startTime,
				response: simulatedResponse
			};

			this.addToHistory(request);

			this.postMessage({
				type: 'requestComplete',
				payload: request
			});

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			const request: APIRequest = {
				id: this.generateId(),
				endpoint: {
					id: this.generateId(),
					name: `${payload.method} ${payload.url}`,
					method: payload.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
					url: payload.url
				},
				timestamp: startTime,
				error: errorMessage
			};

			this.addToHistory(request);

			this.postMessage({
				type: 'requestError',
				payload: request
			});

			vscode.window.showErrorMessage(`Request failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private async saveEndpoint(payload: APIEndpoint): Promise<void> {
		const existing = this.endpoints.find(e => e.id === payload.id);
		if (existing) {
			Object.assign(existing, payload);
		} else {
			this.endpoints.push(payload);
		}

		await this.persistData();
		this.sendDataUpdate();
		vscode.window.showInformationMessage('Endpoint saved');
	}

	private async deleteEndpoint(payload: { id: string }): Promise<void> {
		this.endpoints = this.endpoints.filter(e => e.id !== payload.id);
		await this.persistData();
		this.sendDataUpdate();
		vscode.window.showInformationMessage('Endpoint deleted');
	}

	private async clearHistory(): Promise<void> {
		const answer = await vscode.window.showWarningMessage(
			'Are you sure you want to clear the request history?',
			'Clear',
			'Cancel'
		);

		if (answer === 'Clear') {
			this.requestHistory = [];
			await this.persistData();
			this.sendDataUpdate();
			vscode.window.showInformationMessage('Request history cleared');
		}
	}

	private async saveEnvironment(payload: Environment): Promise<void> {
		const existing = this.environments.find(e => e.name === payload.name);
		if (existing) {
			Object.assign(existing, payload);
		} else {
			this.environments.push(payload);
		}

		await this.persistData();
		this.sendDataUpdate();
		vscode.window.showInformationMessage(`Environment "${payload.name}" saved`);
	}

	private async deleteEnvironment(payload: { name: string }): Promise<void> {
		this.environments = this.environments.filter(e => e.name !== payload.name);
		if (this.activeEnvironment === payload.name) {
			this.activeEnvironment = null;
		}
		await this.persistData();
		this.sendDataUpdate();
		vscode.window.showInformationMessage(`Environment "${payload.name}" deleted`);
	}

	private setActiveEnvironment(name: string | null): void {
		this.activeEnvironment = name;
		this.sendDataUpdate();
	}

	private async importCollection(): Promise<void> {
		const uris = await vscode.window.showOpenDialog({
			canSelectMany: false,
			filters: {
				'JSON Files': ['json']
			}
		});

		if (uris && uris.length > 0) {
			try {
				const content = await vscode.workspace.fs.readFile(uris[0]);
				const collection = JSON.parse(content.toString());

				if (Array.isArray(collection.endpoints)) {
					this.endpoints.push(...collection.endpoints);
					await this.persistData();
					this.sendDataUpdate();
					vscode.window.showInformationMessage('Collection imported successfully');
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				vscode.window.showErrorMessage(`Failed to import collection: ${errorMessage}`);
			}
		}
	}

	private async exportCollection(payload: { collectionName?: string }): Promise<void> {
		const uri = await vscode.window.showSaveDialog({
			filters: {
				'JSON Files': ['json']
			},
			defaultUri: vscode.Uri.file(`${payload.collectionName || 'api-collection'}.json`)
		});

		if (uri) {
			const collection = {
				name: payload.collectionName || 'API Collection',
				endpoints: this.endpoints,
				environments: this.environments
			};

			const content = JSON.stringify(collection, null, 2);
			await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
			vscode.window.showInformationMessage('Collection exported successfully');
		}
	}

	private replaceEnvironmentVariables(text: string): string {
		if (!this.activeEnvironment) {
			return text;
		}

		const env = this.environments.find(e => e.name === this.activeEnvironment);
		if (!env) {
			return text;
		}

		let result = text;
		for (const [key, value] of Object.entries(env.variables)) {
			result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
		}

		return result;
	}

	private addToHistory(request: APIRequest): void {
		this.requestHistory.unshift(request);
		if (this.requestHistory.length > this.maxHistorySize) {
			this.requestHistory = this.requestHistory.slice(0, this.maxHistorySize);
		}
		this.persistData();
	}

	private sendDataUpdate(): void {
		this.postMessage({
			type: 'dataUpdate',
			payload: {
				endpoints: this.endpoints,
				history: this.requestHistory.slice(0, 20), // Send only recent history
				environments: this.environments,
				activeEnvironment: this.activeEnvironment,
				timestamp: Date.now()
			}
		});
	}

	private async loadData(): Promise<void> {
		this.endpoints = this.getPersistedState<APIEndpoint[]>('endpoints', []);
		this.requestHistory = this.getPersistedState<APIRequest[]>('history', []);
		this.environments = this.getPersistedState<Environment[]>('environments', []);
		this.activeEnvironment = this.getPersistedState<string | null>('activeEnvironment', null);
	}

	private async persistData(): Promise<void> {
		await this.persistState('endpoints', this.endpoints);
		await this.persistState('history', this.requestHistory.slice(0, 50));
		await this.persistState('environments', this.environments);
		await this.persistState('activeEnvironment', this.activeEnvironment);
	}

	private generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	public dispose(): void {
		super.dispose();
		APIExplorerPanel.instance = undefined;
	}
}
