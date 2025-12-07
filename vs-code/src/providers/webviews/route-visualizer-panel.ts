import * as vscode from 'vscode';
import { BaseWebViewPanel } from './base-webview-panel';

interface RouteNode {
	path: string;
	name?: string;
	component?: string;
	guards?: string[];
	children?: RouteNode[];
	lazy?: boolean;
	meta?: Record<string, any>;
	params?: string[];
	hasConflict?: boolean;
}

interface RouteVisualizerMessage {
	type: 'getRoutes' | 'navigateTo' | 'editRoute' | 'exportDiagram' | 'refreshRoutes' | 'simulateNavigation';
	payload?: any;
}

/**
 * WebView panel for visualizing and managing application routes.
 * Provides interactive route tree, flow diagrams, and navigation simulation.
 */
export class RouteVisualizerPanel extends BaseWebViewPanel {
	private static instance: RouteVisualizerPanel | undefined;
	private routes: RouteNode[] = [];
	private selectedRoute: RouteNode | null = null;

	private constructor(context: vscode.ExtensionContext) {
		super(context, 'enzyme.routeVisualizer', 'Enzyme Route Visualizer');
		this.loadRoutes();
	}

	/**
	 * Get or create the singleton instance
	 */
	public static getInstance(context: vscode.ExtensionContext): RouteVisualizerPanel {
		if (!RouteVisualizerPanel.instance) {
			RouteVisualizerPanel.instance = new RouteVisualizerPanel(context);
		}
		return RouteVisualizerPanel.instance;
	}

	/**
	 * Show the route visualizer panel
	 */
	public static show(context: vscode.ExtensionContext): void {
		const panel = RouteVisualizerPanel.getInstance(context);
		panel.show();
	}

	protected override getIconPath(): vscode.Uri | { light: vscode.Uri; dark: vscode.Uri } | undefined {
		return {
			light: vscode.Uri.file(this.context.asAbsolutePath('resources/icons/route-light.svg')),
			dark: vscode.Uri.file(this.context.asAbsolutePath('resources/icons/route-dark.svg'))
		};
	}

	protected getBodyContent(_webview: vscode.Webview): string {
		return `
			<div class="container">
				<div class="header">
					<h1>
						<span class="icon">🗺️</span>
						Route Visualizer
					</h1>
					<div class="header-actions">
						<select id="viewMode" class="select">
							<option value="tree">Tree View</option>
							<option value="graph">Graph View</option>
							<option value="flow">Flow Diagram</option>
						</select>
						<button id="exportDiagram" class="btn btn-secondary" title="Export Diagram">
							<span class="codicon codicon-export"></span>
							Export
						</button>
						<button id="refreshRoutes" class="btn btn-primary" title="Refresh Routes">
							<span class="codicon codicon-refresh"></span>
							Refresh
						</button>
					</div>
				</div>

				<div class="toolbar">
					<div class="search-box">
						<span class="codicon codicon-search"></span>
						<input
							type="text"
							id="routeSearch"
							placeholder="Search routes..."
							class="search-input"
						/>
					</div>
					<div class="toolbar-actions">
						<button id="expandAll" class="btn btn-icon" title="Expand All">
							<span class="codicon codicon-expand-all"></span>
						</button>
						<button id="collapseAll" class="btn btn-icon" title="Collapse All">
							<span class="codicon codicon-collapse-all"></span>
						</button>
						<button id="detectConflicts" class="btn btn-icon" title="Detect Conflicts">
							<span class="codicon codicon-warning"></span>
						</button>
					</div>
				</div>

				<div class="content">
					<div class="panel routes-panel">
						<div class="panel-header">
							<h2>Route Tree</h2>
							<div class="route-stats">
								<span class="stat-badge">
									<span class="codicon codicon-symbol-namespace"></span>
									<span id="totalRoutes">0</span> routes
								</span>
								<span class="stat-badge stat-badge-warning" id="conflictBadge" style="display: none;">
									<span class="codicon codicon-warning"></span>
									<span id="conflictCount">0</span> conflicts
								</span>
							</div>
						</div>
						<div id="routeTree" class="route-tree">
							<div class="empty-state">
								<span class="codicon codicon-file-directory"></span>
								<p>No routes found. Configure your routes to visualize them here.</p>
							</div>
						</div>
					</div>

					<div class="panel visualization-panel">
						<div class="panel-header">
							<h2>Route Visualization</h2>
							<div class="panel-actions">
								<button id="zoomIn" class="btn btn-icon" title="Zoom In">
									<span class="codicon codicon-zoom-in"></span>
								</button>
								<button id="zoomOut" class="btn btn-icon" title="Zoom Out">
									<span class="codicon codicon-zoom-out"></span>
								</button>
								<button id="fitToScreen" class="btn btn-icon" title="Fit to Screen">
									<span class="codicon codicon-screen-normal"></span>
								</button>
							</div>
						</div>
						<div id="routeVisualization" class="route-visualization">
							<svg id="routeSvg" width="100%" height="100%">
								<!-- Route diagram will be rendered here -->
							</svg>
						</div>
					</div>

					<div class="panel details-panel">
						<div class="panel-header">
							<h2>Route Details</h2>
						</div>
						<div id="routeDetails" class="route-details">
							<div class="empty-state">
								<span class="codicon codicon-info"></span>
								<p>Select a route to view details.</p>
							</div>
						</div>
					</div>

					<div class="panel simulator-panel">
						<div class="panel-header">
							<h2>Navigation Simulator</h2>
						</div>
						<div class="simulator-content">
							<div class="form-group">
								<label for="simulatorPath">Path:</label>
								<input
									type="text"
									id="simulatorPath"
									class="input"
									placeholder="/example/path"
								/>
							</div>
							<div class="form-group">
								<label for="simulatorParams">Parameters (JSON):</label>
								<textarea
									id="simulatorParams"
									class="textarea"
									rows="3"
									placeholder='{"id": "123"}'
								></textarea>
							</div>
							<div class="form-actions">
								<button id="simulateNav" class="btn btn-primary">
									<span class="codicon codicon-play"></span>
									Simulate Navigation
								</button>
							</div>
							<div id="simulatorResult" class="simulator-result" style="display: none;">
								<!-- Simulation results will be shown here -->
							</div>
						</div>
					</div>

					<div class="panel guards-panel">
						<div class="panel-header">
							<h2>Guard Chains</h2>
						</div>
						<div id="guardChains" class="guard-chains">
							<div class="empty-state">
								<span class="codicon codicon-shield"></span>
								<p>No guards configured.</p>
							</div>
						</div>
					</div>

					<div class="panel lazy-panel">
						<div class="panel-header">
							<h2>Lazy Loading Boundaries</h2>
						</div>
						<div id="lazyBoundaries" class="lazy-boundaries">
							<div class="empty-state">
								<span class="codicon codicon-rocket"></span>
								<p>No lazy-loaded routes found.</p>
							</div>
						</div>
					</div>
				</div>

				<div class="footer">
					<div class="footer-item">
						<span class="codicon codicon-pulse"></span>
						<span id="lastUpdate">Never</span>
					</div>
					<div class="footer-item" id="selectedRouteInfo" style="display: none;">
						<span class="codicon codicon-location"></span>
						<span id="selectedRoutePath">No route selected</span>
					</div>
				</div>
			</div>
		`;
	}

	protected getScripts(webview: vscode.Webview, nonce: string): string {
		const scriptUri = this.getWebviewUri(webview, ['src', 'webview-ui', 'route-visualizer', 'main.js']);
		return `<script nonce="${nonce}" src="${scriptUri}"></script>`;
	}

	protected async handleMessage(message: RouteVisualizerMessage): Promise<void> {
		switch (message.type) {
			case 'getRoutes':
				this.sendRoutesUpdate();
				break;

			case 'navigateTo':
				await this.handleNavigateTo(message.payload);
				break;

			case 'editRoute':
				await this.handleEditRoute(message.payload);
				break;

			case 'exportDiagram':
				await this.handleExportDiagram(message.payload);
				break;

			case 'refreshRoutes':
				await this.loadRoutes();
				this.sendRoutesUpdate();
				break;

			case 'simulateNavigation':
				await this.handleSimulateNavigation(message.payload);
				break;
		}
	}

	protected override onPanelCreated(): void {
		this.sendRoutesUpdate();
	}

	protected override onPanelVisible(): void {
		this.sendRoutesUpdate();
	}

	/**
	 * Update routes from the application
	 */
	public updateRoutes(routes: RouteNode[]): void {
		this.routes = routes;
		this.detectConflicts();
		this.sendRoutesUpdate();
		this.persistRoutes();
	}

	private async loadRoutes(): Promise<void> {
		// In a real implementation, this would parse route files
		// For now, load from persisted state
		this.routes = this.getPersistedState<RouteNode[]>('routes', []);
		this.detectConflicts();
	}

	private detectConflicts(): void {
		const paths = new Set<string>();
		const conflicts: string[] = [];

		const checkNode = (node: RouteNode, parentPath: string = '') => {
			const fullPath = this.normalizePath(parentPath + node.path);

			if (paths.has(fullPath)) {
				conflicts.push(fullPath);
				node.hasConflict = true;
			} else {
				paths.add(fullPath);
				node.hasConflict = false;
			}

			if (node.children) {
				for (const child of node.children) {
					checkNode(child, fullPath);
				}
			}
		};

		for (const route of this.routes) {
			checkNode(route);
		}

		if (conflicts.length > 0) {
			vscode.window.showWarningMessage(
				`Found ${conflicts.length} route conflict(s): ${conflicts.join(', ')}`
			);
		}
	}

	private normalizePath(path: string): string {
		return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
	}

	private async handleNavigateTo(payload: any): Promise<void> {
		const route = this.findRoute(payload.path);
		if (route) {
			this.selectedRoute = route;
			this.sendRoutesUpdate();

			// Open the component file if it exists
			if (route.component) {
				const componentPath = await this.findComponentFile(route.component);
				if (componentPath) {
					const document = await vscode.workspace.openTextDocument(componentPath);
					await vscode.window.showTextDocument(document);
				}
			}
		}
	}

	private async handleEditRoute(payload: any): Promise<void> {
		// In a real implementation, this would open the route configuration file
		vscode.window.showInformationMessage(`Editing route: ${payload.path}`);
	}

	private async handleExportDiagram(payload: any): Promise<void> {
		const format = payload?.format || 'svg';
		const uri = await vscode.window.showSaveDialog({
			filters: {
				'SVG Image': ['svg'],
				'PNG Image': ['png']
			},
			defaultUri: vscode.Uri.file(`enzyme-routes.${format}`)
		});

		if (uri) {
			// In a real implementation, this would generate and save the diagram
			vscode.window.showInformationMessage('Route diagram export feature coming soon!');
		}
	}

	private async handleSimulateNavigation(payload: any): Promise<void> {
		const { path, params } = payload;
		const route = this.findRoute(path);

		const result = {
			success: !!route,
			route: route || null,
			guards: route?.guards || [],
			params: params || {},
			errors: [] as string[]
		};

		if (!route) {
			result.errors.push(`Route not found: ${path}`);
		}

		// Simulate guard execution
		if (route?.guards && route.guards.length > 0) {
			for (const guard of route.guards) {
				// In a real implementation, this would actually execute guards
				result.errors.push(`Guard "${guard}" would be executed`);
			}
		}

		this.postMessage({
			type: 'simulationResult',
			payload: result
		});
	}

	private findRoute(path: string, routes: RouteNode[] = this.routes): RouteNode | null {
		for (const route of routes) {
			const fullPath = this.normalizePath(route.path);
			if (fullPath === this.normalizePath(path)) {
				return route;
			}

			if (route.children) {
				const found = this.findRoute(path, route.children);
				if (found) {
					return found;
				}
			}
		}
		return null;
	}

	private async findComponentFile(componentName: string): Promise<vscode.Uri | null> {
		// Search for component files in the workspace
		const files = await vscode.workspace.findFiles(
			`**/${componentName}.{tsx,ts,jsx,js}`,
			'**/node_modules/**',
			1
		);
		return files.length > 0 ? files[0]! : null;
	}

	private sendRoutesUpdate(): void {
		const stats = this.calculateRouteStats();

		this.postMessage({
			type: 'routesUpdate',
			payload: {
				routes: this.routes,
				selectedRoute: this.selectedRoute,
				stats,
				timestamp: Date.now()
			}
		});
	}

	private calculateRouteStats() {
		let totalRoutes = 0;
		let lazyRoutes = 0;
		let guardedRoutes = 0;
		let conflicts = 0;

		const countNode = (node: RouteNode) => {
			totalRoutes++;
			if (node.lazy) {
				lazyRoutes++;
			}
			if (node.guards && node.guards.length > 0) {
				guardedRoutes++;
			}
			if (node.hasConflict) {
				conflicts++;
			}
			if (node.children) {
				for (const child of node.children) {
					countNode(child);
				}
			}
		};

		for (const route of this.routes) {
			countNode(route);
		}

		return {
			totalRoutes,
			lazyRoutes,
			guardedRoutes,
			conflicts
		};
	}

	private async persistRoutes(): Promise<void> {
		await this.persistState('routes', this.routes);
	}

	public override dispose(): void {
		super.dispose();
		RouteVisualizerPanel.instance = undefined;
	}
}
