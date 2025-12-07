import * as vscode from 'vscode';
import { BaseWebViewPanel } from './base-webview-panel';

interface StateSnapshot {
	timestamp: number;
	state: any;
	action?: string;
	diff?: any;
}

interface StateInspectorMessage {
	type: 'getState' | 'setState' | 'exportState' | 'importState' | 'timeTravel' | 'filterState' | 'clearHistory';
	payload?: any;
}

/**
 * WebView panel for inspecting and debugging Zustand state stores.
 * Provides real-time state visualization, time-travel debugging, and state manipulation.
 */
export class StateInspectorPanel extends BaseWebViewPanel {
	private static instance: StateInspectorPanel | undefined;
	private stateHistory: StateSnapshot[] = [];
	private currentStateIndex: number = -1;
	private maxHistorySize: number = 100;
	private updateThrottle: NodeJS.Timeout | undefined;

	private constructor(context: vscode.ExtensionContext) {
		super(context, 'enzyme.stateInspector', 'Enzyme State Inspector');
		this.loadPersistedHistory();
	}

	/**
	 * Get or create the singleton instance
	 */
	public static getInstance(context: vscode.ExtensionContext): StateInspectorPanel {
		if (!StateInspectorPanel.instance) {
			StateInspectorPanel.instance = new StateInspectorPanel(context);
		}
		return StateInspectorPanel.instance;
	}

	/**
	 * Show the state inspector panel
	 */
	public static show(context: vscode.ExtensionContext): void {
		const panel = StateInspectorPanel.getInstance(context);
		panel.show();
	}

	protected getIconPath(): vscode.Uri | { light: vscode.Uri; dark: vscode.Uri } | undefined {
		return {
			light: vscode.Uri.file(this.context.asAbsolutePath('resources/icons/state-light.svg')),
			dark: vscode.Uri.file(this.context.asAbsolutePath('resources/icons/state-dark.svg'))
		};
	}

	protected getStyles(webview: vscode.Webview, nonce: string): string {
		const sharedStylesUri = this.getWebviewUri(webview, ['src', 'webview-ui', 'shared', 'styles.css']);
		const stateStylesUri = this.getWebviewUri(webview, ['src', 'webview-ui', 'state-inspector', 'styles.css']);
		return `
			<link nonce="${nonce}" rel="stylesheet" href="${sharedStylesUri}">
			<link nonce="${nonce}" rel="stylesheet" href="${stateStylesUri}">
		`;
	}

	protected getBodyContent(webview: vscode.Webview): string {
		return `
			<div class="container">
				<div class="header">
					<h1>
						<span class="codicon codicon-inspect"></span>
						State Inspector
					</h1>
					<div class="header-actions">
						<button id="clearHistory" class="btn btn-secondary" title="Clear History" aria-label="Clear state history">
							<span class="codicon codicon-clear-all"></span>
						</button>
						<button id="exportState" class="btn btn-secondary" title="Export State" aria-label="Export current state to file">
							<span class="codicon codicon-export"></span>
						</button>
						<button id="importState" class="btn btn-secondary" title="Import State" aria-label="Import state from file">
							<span class="codicon codicon-import"></span>
						</button>
						<button id="refreshState" class="btn btn-primary" title="Refresh State" aria-label="Refresh state data">
							<span class="codicon codicon-refresh"></span>
						</button>
					</div>
				</div>

				<div class="toolbar">
					<div class="search-box">
						<label for="stateFilter" class="visually-hidden">Search state keys</label>
						<span class="codicon codicon-search" aria-hidden="true"></span>
						<input
							type="text"
							id="stateFilter"
							placeholder="Search state keys..."
							class="search-input"
							aria-label="Search state keys"
						/>
					</div>
					<div class="time-travel-controls" role="group" aria-label="Time travel navigation">
						<button id="timeTravelFirst" class="btn btn-icon" title="First State" aria-label="Go to first state" disabled>
							<span class="codicon codicon-debug-step-back" aria-hidden="true"></span>
						</button>
						<button id="timeTravelPrev" class="btn btn-icon" title="Previous State" aria-label="Go to previous state" disabled>
							<span class="codicon codicon-chevron-left" aria-hidden="true"></span>
						</button>
						<span id="statePosition" class="state-position" aria-live="polite" aria-atomic="true">0 / 0</span>
						<button id="timeTravelNext" class="btn btn-icon" title="Next State" aria-label="Go to next state" disabled>
							<span class="codicon codicon-chevron-right" aria-hidden="true"></span>
						</button>
						<button id="timeTravelLast" class="btn btn-icon" title="Latest State" aria-label="Go to latest state" disabled>
							<span class="codicon codicon-debug-step-over" aria-hidden="true"></span>
						</button>
					</div>
				</div>

				<div class="content">
					<div class="panel state-panel">
						<div class="panel-header">
							<h2>Current State</h2>
							<div class="panel-actions" role="group" aria-label="State tree actions">
								<button id="expandAll" class="btn btn-icon" title="Expand All" aria-label="Expand all state nodes">
									<span class="codicon codicon-expand-all" aria-hidden="true"></span>
								</button>
								<button id="collapseAll" class="btn btn-icon" title="Collapse All" aria-label="Collapse all state nodes">
									<span class="codicon codicon-collapse-all" aria-hidden="true"></span>
								</button>
							</div>
						</div>
						<div id="stateTree" class="state-tree" role="tree" aria-label="State tree view">
							<div class="empty-state" role="status">
								<span class="codicon codicon-info" aria-hidden="true"></span>
								<p>No state available. Start your application to see state.</p>
							</div>
						</div>
					</div>

					<div class="panel history-panel">
						<div class="panel-header">
							<h2>Action History</h2>
							<span id="historyCount" class="badge">0</span>
						</div>
						<div id="actionHistory" class="action-history">
							<div class="empty-state">
								<span class="codicon codicon-history"></span>
								<p>No actions recorded yet.</p>
							</div>
						</div>
					</div>

					<div class="panel diff-panel">
						<div class="panel-header">
							<h2>State Diff</h2>
						</div>
						<div id="stateDiff" class="state-diff">
							<div class="empty-state">
								<span class="codicon codicon-diff"></span>
								<p>Select an action to see state changes.</p>
							</div>
						</div>
					</div>
				</div>

				<div class="footer">
					<div class="footer-item">
						<span class="codicon codicon-database"></span>
						<span id="storeCount">0 stores</span>
					</div>
					<div class="footer-item">
						<span class="codicon codicon-pulse"></span>
						<span id="lastUpdate">Never</span>
					</div>
				</div>
			</div>
		`;
	}

	protected getScripts(webview: vscode.Webview, nonce: string): string {
		const scriptUri = this.getWebviewUri(webview, ['src', 'webview-ui', 'state-inspector', 'main.js']);
		return `<script nonce="${nonce}" src="${scriptUri}"></script>`;
	}

	protected async handleMessage(message: StateInspectorMessage): Promise<void> {
		switch (message.type) {
			case 'getState':
				await this.handleGetState();
				break;

			case 'setState':
				await this.handleSetState(message.payload);
				break;

			case 'exportState':
				await this.handleExportState();
				break;

			case 'importState':
				await this.handleImportState();
				break;

			case 'timeTravel':
				await this.handleTimeTravel(message.payload);
				break;

			case 'filterState':
				await this.handleFilterState(message.payload);
				break;

			case 'clearHistory':
				await this.handleClearHistory();
				break;
		}
	}

	protected onPanelCreated(): void {
		// Send initial state to the webview
		this.sendStateUpdate();
	}

	protected onPanelVisible(): void {
		// Refresh state when panel becomes visible
		this.sendStateUpdate();
	}

	/**
	 * Handle state update from the application
	 */
	public updateState(state: any, action?: string): void {
		// Throttle updates to prevent overwhelming the UI
		if (this.updateThrottle) {
			clearTimeout(this.updateThrottle);
		}

		this.updateThrottle = setTimeout(() => {
			const snapshot: StateSnapshot = {
				timestamp: Date.now(),
				state: this.deepClone(state),
				action
			};

			// Calculate diff from previous state
			if (this.stateHistory.length > 0) {
				const previousState = this.stateHistory[this.stateHistory.length - 1].state;
				snapshot.diff = this.calculateDiff(previousState, state);
			}

			// Add to history
			this.stateHistory.push(snapshot);
			this.currentStateIndex = this.stateHistory.length - 1;

			// Limit history size
			if (this.stateHistory.length > this.maxHistorySize) {
				this.stateHistory.shift();
				this.currentStateIndex--;
			}

			// Send update to webview
			this.sendStateUpdate();

			// Persist history
			this.persistHistory();
		}, 100);
	}

	private async handleGetState(): Promise<void> {
		this.sendStateUpdate();
	}

	private async handleSetState(payload: any): Promise<void> {
		// In a real implementation, this would send the state update to the application
		// For now, we'll just update our local state
		this.updateState(payload, 'Manual Update');
		vscode.window.showInformationMessage('State updated successfully');
	}

	private async handleExportState(): Promise<void> {
		const currentState = this.getCurrentState();
		if (!currentState) {
			vscode.window.showWarningMessage('No state to export');
			return;
		}

		const uri = await vscode.window.showSaveDialog({
			filters: {
				'JSON Files': ['json']
			},
			defaultUri: vscode.Uri.file('enzyme-state.json')
		});

		if (uri) {
			const content = JSON.stringify(currentState, null, 2);
			await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
			vscode.window.showInformationMessage('State exported successfully');
		}
	}

	private async handleImportState(): Promise<void> {
		const uris = await vscode.window.showOpenDialog({
			canSelectMany: false,
			filters: {
				'JSON Files': ['json']
			}
		});

		if (uris && uris.length > 0) {
			try {
				const content = await vscode.workspace.fs.readFile(uris[0]);
				const state = JSON.parse(content.toString());
				this.updateState(state, 'Imported State');
				vscode.window.showInformationMessage('State imported successfully');
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to import state: ${error}`);
			}
		}
	}

	private async handleTimeTravel(index: number): Promise<void> {
		if (index >= 0 && index < this.stateHistory.length) {
			this.currentStateIndex = index;
			this.sendStateUpdate();
		}
	}

	private async handleFilterState(filter: string): Promise<void> {
		// Filter will be applied on the client side
		// This is just for logging purposes
		console.log(`Filtering state with: ${filter}`);
	}

	private async handleClearHistory(): Promise<void> {
		const answer = await vscode.window.showWarningMessage(
			'Are you sure you want to clear the state history?',
			'Yes',
			'No'
		);

		if (answer === 'Yes') {
			this.stateHistory = [];
			this.currentStateIndex = -1;
			this.sendStateUpdate();
			await this.persistState('history', []);
			vscode.window.showInformationMessage('State history cleared');
		}
	}

	private sendStateUpdate(): void {
		const currentState = this.getCurrentState();
		const currentSnapshot = this.getCurrentSnapshot();

		this.postMessage({
			type: 'stateUpdate',
			payload: {
				state: currentState,
				snapshot: currentSnapshot,
				history: this.stateHistory.map(s => ({
					timestamp: s.timestamp,
					action: s.action,
					hasChanges: !!s.diff
				})),
				currentIndex: this.currentStateIndex,
				totalStates: this.stateHistory.length
			}
		});
	}

	private getCurrentState(): any {
		if (this.currentStateIndex >= 0 && this.currentStateIndex < this.stateHistory.length) {
			return this.stateHistory[this.currentStateIndex].state;
		}
		return null;
	}

	private getCurrentSnapshot(): StateSnapshot | null {
		if (this.currentStateIndex >= 0 && this.currentStateIndex < this.stateHistory.length) {
			return this.stateHistory[this.currentStateIndex];
		}
		return null;
	}

	private calculateDiff(oldState: any, newState: any): any {
		const diff: any = {};

		// Simple diff calculation
		for (const key in newState) {
			if (oldState[key] !== newState[key]) {
				diff[key] = {
					old: oldState[key],
					new: newState[key]
				};
			}
		}

		for (const key in oldState) {
			if (!(key in newState)) {
				diff[key] = {
					old: oldState[key],
					new: undefined
				};
			}
		}

		return Object.keys(diff).length > 0 ? diff : null;
	}

	private deepClone(obj: any): any {
		try {
			return JSON.parse(JSON.stringify(obj));
		} catch (error) {
			return obj;
		}
	}

	private async persistHistory(): Promise<void> {
		// Persist only the last 50 states to avoid storage limits
		const statesToPersist = this.stateHistory.slice(-50);
		await this.persistState('history', statesToPersist);
	}

	private loadPersistedHistory(): void {
		const history = this.getPersistedState<StateSnapshot[]>('history', []);
		this.stateHistory = history;
		this.currentStateIndex = history.length - 1;
	}

	public dispose(): void {
		if (this.updateThrottle) {
			clearTimeout(this.updateThrottle);
		}
		super.dispose();
		StateInspectorPanel.instance = undefined;
	}
}
