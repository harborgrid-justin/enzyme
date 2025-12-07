import * as vscode from 'vscode';
import { BaseWebViewPanel } from './base-webview-panel';

/**
 *
 */
interface Feature {
	id: string;
	name: string;
	description: string;
	enabled: boolean;
	type: 'feature-flag' | 'ab-test' | 'rollout';
	status: 'active' | 'inactive' | 'archived';
	rolloutPercentage?: number;
	dependencies?: string[];
	tags?: string[];
	createdAt: string;
	updatedAt: string;
	variants?: Array<{
		name: string;
		weight: number;
	}>;
	analytics?: {
		impressions: number;
		conversions: number;
		conversionRate: number;
	};
}

/**
 *
 */
interface FeatureDashboardMessage {
	type: 'getFeatures' | 'toggleFeature' | 'createFeature' | 'updateFeature' | 'deleteFeature' | 'refreshFeatures';
	payload?: any;
}

/**
 * WebView panel for managing feature flags and A/B tests.
 * Provides feature overview, toggles, analytics, and creation wizard.
 */
export class FeatureDashboardPanel extends BaseWebViewPanel {
	private static instance: FeatureDashboardPanel | undefined;
	private features: Feature[] = [];

	/**
	 *
	 * @param context
	 */
	private constructor(context: vscode.ExtensionContext) {
		super(context, 'enzyme.featureDashboard', 'Enzyme Feature Dashboard');
		this.loadFeatures();
	}

	/**
	 * Get or create the singleton instance
	 * @param context
	 */
	public static getInstance(context: vscode.ExtensionContext): FeatureDashboardPanel {
		if (!FeatureDashboardPanel.instance) {
			FeatureDashboardPanel.instance = new FeatureDashboardPanel(context);
		}
		return FeatureDashboardPanel.instance;
	}

	/**
	 * Show the feature dashboard panel
	 * @param context
	 */
	public static show(context: vscode.ExtensionContext): void {
		const panel = FeatureDashboardPanel.getInstance(context);
		panel.show();
	}

	/**
	 *
	 */
	protected override getIconPath(): vscode.Uri | { light: vscode.Uri; dark: vscode.Uri } | undefined {
		return {
			light: vscode.Uri.file(this.context.asAbsolutePath('resources/icons/feature-light.svg')),
			dark: vscode.Uri.file(this.context.asAbsolutePath('resources/icons/feature-dark.svg'))
		};
	}

	/**
	 *
	 * @param _webview
	 */
	protected getBodyContent(_webview: vscode.Webview): string {
		return `
			<div class="container">
				<div class="header">
					<h1>
						<span class="icon">🎛️</span>
						Feature Dashboard
					</h1>
					<div class="header-actions">
						<button id="createFeature" class="btn btn-primary">
							<span class="codicon codicon-add"></span>
							New Feature
						</button>
						<button id="refreshFeatures" class="btn btn-secondary" title="Refresh Features">
							<span class="codicon codicon-refresh"></span>
						</button>
					</div>
				</div>

				<div class="toolbar">
					<div class="search-box">
						<span class="codicon codicon-search"></span>
						<input
							type="text"
							id="featureSearch"
							placeholder="Search features..."
							class="search-input"
						/>
					</div>
					<div class="filter-group">
						<select id="statusFilter" class="select">
							<option value="all">All Status</option>
							<option value="active">Active</option>
							<option value="inactive">Inactive</option>
							<option value="archived">Archived</option>
						</select>
						<select id="typeFilter" class="select">
							<option value="all">All Types</option>
							<option value="feature-flag">Feature Flags</option>
							<option value="ab-test">A/B Tests</option>
							<option value="rollout">Rollouts</option>
						</select>
					</div>
				</div>

				<div class="stats-overview">
					<div class="stat-card">
						<span class="stat-icon codicon codicon-check-all"></span>
						<div class="stat-content">
							<span class="stat-value" id="totalFeatures">0</span>
							<span class="stat-label">Total Features</span>
						</div>
					</div>
					<div class="stat-card">
						<span class="stat-icon codicon codicon-pass"></span>
						<div class="stat-content">
							<span class="stat-value" id="activeFeatures">0</span>
							<span class="stat-label">Active</span>
						</div>
					</div>
					<div class="stat-card">
						<span class="stat-icon codicon codicon-beaker"></span>
						<div class="stat-content">
							<span class="stat-value" id="abTests">0</span>
							<span class="stat-label">A/B Tests</span>
						</div>
					</div>
					<div class="stat-card">
						<span class="stat-icon codicon codicon-rocket"></span>
						<div class="stat-content">
							<span class="stat-value" id="rollouts">0</span>
							<span class="stat-label">Rollouts</span>
						</div>
					</div>
				</div>

				<div class="content">
					<div class="panel features-panel">
						<div class="panel-header">
							<h2>Features</h2>
							<div class="view-toggles">
								<button class="view-toggle active" data-view="cards">
									<span class="codicon codicon-layout"></span>
								</button>
								<button class="view-toggle" data-view="list">
									<span class="codicon codicon-list-tree"></span>
								</button>
							</div>
						</div>
						<div id="featuresContainer" class="features-grid">
							<div class="empty-state">
								<span class="codicon codicon-lightbulb"></span>
								<p>No features found. Create your first feature to get started.</p>
								<button id="createFirstFeature" class="btn btn-primary">
									<span class="codicon codicon-add"></span>
									Create Feature
								</button>
							</div>
						</div>
					</div>

					<div class="panel dependencies-panel">
						<div class="panel-header">
							<h2>Feature Dependencies</h2>
						</div>
						<div id="dependencyGraph" class="dependency-graph">
							<svg id="dependencySvg" width="100%" height="400">
								<!-- Dependency graph will be rendered here -->
							</svg>
						</div>
					</div>

					<div class="panel analytics-panel">
						<div class="panel-header">
							<h2>Feature Analytics</h2>
							<select id="analyticsTimeRange" class="select">
								<option value="7d">Last 7 Days</option>
								<option value="30d" selected>Last 30 Days</option>
								<option value="90d">Last 90 Days</option>
							</select>
						</div>
						<div id="analyticsContent" class="analytics-content">
							<div class="empty-state">
								<span class="codicon codicon-graph"></span>
								<p>Select a feature to view analytics.</p>
							</div>
						</div>
					</div>
				</div>

				<div class="footer">
					<div class="footer-item">
						<span class="codicon codicon-pulse"></span>
						<span id="lastUpdate">Never</span>
					</div>
				</div>
			</div>

			<!-- Feature Creation Modal -->
			<div id="featureModal" class="modal" style="display: none;">
				<div class="modal-content">
					<div class="modal-header">
						<h2 id="modalTitle">Create New Feature</h2>
						<button id="closeModal" class="btn btn-icon">
							<span class="codicon codicon-close"></span>
						</button>
					</div>
					<div class="modal-body">
						<div class="form-group">
							<label for="featureName">Feature Name *</label>
							<input type="text" id="featureName" class="input" placeholder="my-awesome-feature" required />
						</div>
						<div class="form-group">
							<label for="featureDescription">Description</label>
							<textarea id="featureDescription" class="textarea" rows="3" placeholder="Describe this feature..."></textarea>
						</div>
						<div class="form-group">
							<label for="featureType">Type *</label>
							<select id="featureType" class="select" required>
								<option value="feature-flag">Feature Flag</option>
								<option value="ab-test">A/B Test</option>
								<option value="rollout">Gradual Rollout</option>
							</select>
						</div>
						<div class="form-group" id="rolloutGroup" style="display: none;">
							<label for="rolloutPercentage">Rollout Percentage</label>
							<input type="range" id="rolloutPercentage" min="0" max="100" value="0" class="slider" />
							<span id="rolloutValue">0%</span>
						</div>
						<div class="form-group" id="variantsGroup" style="display: none;">
							<label>Variants</label>
							<div id="variantsContainer">
								<!-- Variants will be added dynamically -->
							</div>
							<button id="addVariant" class="btn btn-secondary btn-sm">
								<span class="codicon codicon-add"></span>
								Add Variant
							</button>
						</div>
						<div class="form-group">
							<label for="featureTags">Tags (comma-separated)</label>
							<input type="text" id="featureTags" class="input" placeholder="experimental, ui, backend" />
						</div>
						<div class="form-group">
							<label>
								<input type="checkbox" id="featureEnabled" />
								Enable immediately
							</label>
						</div>
					</div>
					<div class="modal-footer">
						<button id="cancelFeature" class="btn btn-secondary">Cancel</button>
						<button id="saveFeature" class="btn btn-primary">Create Feature</button>
					</div>
				</div>
			</div>
		`;
	}

	/**
	 *
	 * @param webview
	 * @param nonce
	 */
	protected getScripts(webview: vscode.Webview, nonce: string): string {
		const scriptUri = this.getWebviewUri(webview, ['src', 'webview-ui', 'feature-dashboard', 'main.js']);
		return `<script nonce="${nonce}" src="${scriptUri}"></script>`;
	}

	/**
	 *
	 * @param message
	 */
	protected async handleMessage(message: FeatureDashboardMessage): Promise<void> {
		switch (message.type) {
			case 'getFeatures':
				this.sendFeaturesUpdate();
				break;

			case 'toggleFeature':
				await this.toggleFeature(message.payload);
				break;

			case 'createFeature':
				await this.createFeature(message.payload);
				break;

			case 'updateFeature':
				await this.updateFeature(message.payload);
				break;

			case 'deleteFeature':
				await this.deleteFeature(message.payload);
				break;

			case 'refreshFeatures':
				await this.loadFeatures();
				this.sendFeaturesUpdate();
				break;
		}
	}

	/**
	 *
	 */
	protected override onPanelCreated(): void {
		this.sendFeaturesUpdate();
	}

	/**
	 *
	 */
	protected override onPanelVisible(): void {
		this.sendFeaturesUpdate();
	}

	/**
	 * Update features from external source
	 * @param features
	 */
	public updateFeatures(features: Feature[]): void {
		this.features = features;
		this.sendFeaturesUpdate();
		this.persistFeatures();
	}

	/**
	 *
	 */
	private async loadFeatures(): Promise<void> {
		// Load from persisted state
		this.features = this.getPersistedState<Feature[]>('features', []);

		// In a real implementation, this would also load from feature flag service
	}

	/**
	 *
	 * @param payload
	 * @param payload.id
	 */
	private async toggleFeature(payload: { id: string }): Promise<void> {
		const feature = this.features.find(f => f.id === payload.id);
		if (feature) {
			feature.enabled = !feature.enabled;
			feature.updatedAt = new Date().toISOString();
			this.sendFeaturesUpdate();
			this.persistFeatures();

			vscode.window.showInformationMessage(
				`Feature "${feature.name}" ${feature.enabled ? 'enabled' : 'disabled'}`
			);
		}
	}

	/**
	 *
	 * @param payload
	 */
	private async createFeature(payload: Partial<Feature>): Promise<void> {
		const newFeature: Feature = {
			id: payload.id || this.generateId(),
			name: payload.name || 'Untitled Feature',
			description: payload.description || '',
			enabled: payload.enabled || false,
			type: payload.type || 'feature-flag',
			status: 'active',
			...(payload.rolloutPercentage !== undefined && { rolloutPercentage: payload.rolloutPercentage }),
			dependencies: payload.dependencies || [],
			tags: payload.tags || [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			...(payload.variants && { variants: payload.variants }),
			analytics: {
				impressions: 0,
				conversions: 0,
				conversionRate: 0
			}
		};

		this.features.push(newFeature);
		this.sendFeaturesUpdate();
		this.persistFeatures();

		vscode.window.showInformationMessage(`Feature "${newFeature.name}" created successfully`);
	}

	/**
	 *
	 * @param payload
	 */
	private async updateFeature(payload: Partial<Feature> & { id: string }): Promise<void> {
		const index = this.features.findIndex(f => f.id === payload.id);
		if (index !== -1) {
			const feature = this.features[index]!;
			this.features[index] = {
				...feature,
				...Object.fromEntries(
					Object.entries(payload).filter(([_, value]) => value !== undefined)
				) as Partial<Feature>,
				updatedAt: new Date().toISOString()
			};
			this.sendFeaturesUpdate();
			this.persistFeatures();

			vscode.window.showInformationMessage(`Feature "${this.features[index]!.name}" updated`);
		}
	}

	/**
	 *
	 * @param payload
	 * @param payload.id
	 */
	private async deleteFeature(payload: { id: string }): Promise<void> {
		const feature = this.features.find(f => f.id === payload.id);
		if (!feature) {
			return;
		}

		const answer = await vscode.window.showWarningMessage(
			`Are you sure you want to delete feature "${feature.name}"?`,
			'Delete',
			'Cancel'
		);

		if (answer === 'Delete') {
			this.features = this.features.filter(f => f.id !== payload.id);
			this.sendFeaturesUpdate();
			this.persistFeatures();

			vscode.window.showInformationMessage(`Feature "${feature.name}" deleted`);
		}
	}

	/**
	 *
	 */
	private sendFeaturesUpdate(): void {
		const stats = this.calculateStats();

		this.postMessage({
			type: 'featuresUpdate',
			payload: {
				features: this.features,
				stats,
				timestamp: Date.now()
			}
		});
	}

	/**
	 *
	 */
	private calculateStats() {
		return {
			total: this.features.length,
			active: this.features.filter(f => f.status === 'active').length,
			enabled: this.features.filter(f => f.enabled).length,
			abTests: this.features.filter(f => f.type === 'ab-test').length,
			rollouts: this.features.filter(f => f.type === 'rollout').length
		};
	}

	/**
	 *
	 */
	private generateId(): string {
		return `feature-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
	}

	/**
	 *
	 */
	private async persistFeatures(): Promise<void> {
		await this.persistState('features', this.features);
	}

	/**
	 *
	 */
	public override dispose(): void {
		super.dispose();
		FeatureDashboardPanel.instance = undefined;
	}
}
