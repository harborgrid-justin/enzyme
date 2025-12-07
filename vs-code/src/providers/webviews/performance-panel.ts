import * as vscode from 'vscode';
import { BaseWebViewPanel } from './base-webview-panel';

/**
 *
 */
interface WebVitalMetric {
	name: string;
	value: number;
	rating: 'good' | 'needs-improvement' | 'poor';
	timestamp: number;
}

/**
 *
 */
interface PerformanceMetrics {
	webVitals: {
		LCP?: WebVitalMetric; // Largest Contentful Paint
		FID?: WebVitalMetric; // First Input Delay
		CLS?: WebVitalMetric; // Cumulative Layout Shift
		FCP?: WebVitalMetric; // First Contentful Paint
		TTFB?: WebVitalMetric; // Time to First Byte
		INP?: WebVitalMetric; // Interaction to Next Paint
	};
	componentMetrics: Array<{
		name: string;
		renderTime: number;
		renderCount: number;
	}>;
	bundleSize: {
		total: number;
		chunks: Array<{ name: string; size: number }>;
	};
	networkMetrics: {
		requests: number;
		totalSize: number;
		totalTime: number;
	};
	memoryUsage: Array<{
		used: number;
		limit: number;
		timestamp: number;
	}>;
}

/**
 * WebView panel for monitoring and analyzing application performance.
 * Displays Web Vitals, component render times, bundle analysis, and more.
 */
export class PerformancePanel extends BaseWebViewPanel {
	private static instance: PerformancePanel | undefined;
	private metrics: PerformanceMetrics;
	private metricsHistory: PerformanceMetrics[] = [];
	private readonly maxHistorySize = 100;

	/**
	 *
	 * @param context
	 */
	private constructor(context: vscode.ExtensionContext) {
		super(context, 'enzyme.performance', 'Enzyme Performance Monitor');
		this.metrics = this.getEmptyMetrics();
		this.loadPersistedMetrics();
	}

	/**
	 * Get or create the singleton instance
	 * @param context
	 */
	public static getInstance(context: vscode.ExtensionContext): PerformancePanel {
		if (!PerformancePanel.instance) {
			PerformancePanel.instance = new PerformancePanel(context);
		}
		return PerformancePanel.instance;
	}

	/**
	 * Show the performance panel
	 * @param context
	 */
	public static show(context: vscode.ExtensionContext): void {
		const panel = PerformancePanel.getInstance(context);
		panel.show();
	}

	/**
	 *
	 */
	protected override getIconPath(): vscode.Uri | { light: vscode.Uri; dark: vscode.Uri } | undefined {
		return {
			light: vscode.Uri.file(this.context.asAbsolutePath('resources/icons/performance-light.svg')),
			dark: vscode.Uri.file(this.context.asAbsolutePath('resources/icons/performance-dark.svg'))
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
						<span class="icon">⚡</span>
						Performance Monitor
					</h1>
					<div class="header-actions">
						<button id="exportReport" class="btn btn-secondary" title="Export Report">
							<span class="codicon codicon-export"></span>
							Export
						</button>
						<button id="clearMetrics" class="btn btn-secondary" title="Clear Metrics">
							<span class="codicon codicon-clear-all"></span>
							Clear
						</button>
						<button id="refreshMetrics" class="btn btn-primary" title="Refresh Metrics">
							<span class="codicon codicon-refresh"></span>
							Refresh
						</button>
					</div>
				</div>

				<div class="metrics-overview">
					<div class="performance-score-card">
						<div class="score-circle" id="performanceScore">
							<svg viewBox="0 0 100 100">
								<circle class="score-bg" cx="50" cy="50" r="40"></circle>
								<circle class="score-progress" cx="50" cy="50" r="40" id="scoreProgress"></circle>
							</svg>
							<div class="score-value" id="scoreValue">--</div>
						</div>
						<div class="score-label">Performance Score</div>
					</div>
				</div>

				<div class="content">
					<div class="panel web-vitals-panel">
						<div class="panel-header">
							<h2>Core Web Vitals</h2>
							<span class="info-icon" title="Google's Core Web Vitals">
								<span class="codicon codicon-info"></span>
							</span>
						</div>
						<div class="web-vitals-grid">
							<div class="metric-card" data-metric="LCP">
								<div class="metric-header">
									<span class="metric-name">LCP</span>
									<span class="metric-badge" id="lcpRating">--</span>
								</div>
								<div class="metric-value" id="lcpValue">--</div>
								<div class="metric-description">Largest Contentful Paint</div>
								<div class="metric-threshold">Good: &lt; 2.5s</div>
							</div>

							<div class="metric-card" data-metric="FID">
								<div class="metric-header">
									<span class="metric-name">FID</span>
									<span class="metric-badge" id="fidRating">--</span>
								</div>
								<div class="metric-value" id="fidValue">--</div>
								<div class="metric-description">First Input Delay</div>
								<div class="metric-threshold">Good: &lt; 100ms</div>
							</div>

							<div class="metric-card" data-metric="CLS">
								<div class="metric-header">
									<span class="metric-name">CLS</span>
									<span class="metric-badge" id="clsRating">--</span>
								</div>
								<div class="metric-value" id="clsValue">--</div>
								<div class="metric-description">Cumulative Layout Shift</div>
								<div class="metric-threshold">Good: &lt; 0.1</div>
							</div>

							<div class="metric-card" data-metric="FCP">
								<div class="metric-header">
									<span class="metric-name">FCP</span>
									<span class="metric-badge" id="fcpRating">--</span>
								</div>
								<div class="metric-value" id="fcpValue">--</div>
								<div class="metric-description">First Contentful Paint</div>
								<div class="metric-threshold">Good: &lt; 1.8s</div>
							</div>

							<div class="metric-card" data-metric="TTFB">
								<div class="metric-header">
									<span class="metric-name">TTFB</span>
									<span class="metric-badge" id="ttfbRating">--</span>
								</div>
								<div class="metric-value" id="ttfbValue">--</div>
								<div class="metric-description">Time to First Byte</div>
								<div class="metric-threshold">Good: &lt; 800ms</div>
							</div>

							<div class="metric-card" data-metric="INP">
								<div class="metric-header">
									<span class="metric-name">INP</span>
									<span class="metric-badge" id="inpRating">--</span>
								</div>
								<div class="metric-value" id="inpValue">--</div>
								<div class="metric-description">Interaction to Next Paint</div>
								<div class="metric-threshold">Good: &lt; 200ms</div>
							</div>
						</div>
					</div>

					<div class="panel timeline-panel">
						<div class="panel-header">
							<h2>Performance Timeline</h2>
							<div class="timeline-controls">
								<select id="timelineRange" class="select">
									<option value="1h">Last Hour</option>
									<option value="6h">Last 6 Hours</option>
									<option value="24h" selected>Last 24 Hours</option>
									<option value="7d">Last 7 Days</option>
								</select>
							</div>
						</div>
						<div id="performanceChart" class="chart-container">
							<canvas id="chartCanvas"></canvas>
						</div>
					</div>

					<div class="panel components-panel">
						<div class="panel-header">
							<h2>Component Performance</h2>
							<div class="panel-actions">
								<button id="sortByRenderTime" class="btn btn-icon" title="Sort by Render Time">
									<span class="codicon codicon-arrow-down"></span>
								</button>
							</div>
						</div>
						<div id="componentMetrics" class="component-list">
							<div class="empty-state">
								<span class="codicon codicon-dashboard"></span>
								<p>No component metrics available.</p>
							</div>
						</div>
					</div>

					<div class="panel bundle-panel">
						<div class="panel-header">
							<h2>Bundle Analysis</h2>
						</div>
						<div class="bundle-stats">
							<div class="stat-item">
								<span class="stat-label">Total Bundle Size</span>
								<span class="stat-value" id="totalBundleSize">--</span>
							</div>
							<div class="stat-item">
								<span class="stat-label">Chunks</span>
								<span class="stat-value" id="chunkCount">--</span>
							</div>
						</div>
						<div id="bundleBreakdown" class="bundle-breakdown">
							<!-- Bundle chunks will be rendered here -->
						</div>
					</div>

					<div class="panel memory-panel">
						<div class="panel-header">
							<h2>Memory Usage</h2>
						</div>
						<div id="memoryChart" class="chart-container">
							<canvas id="memoryChartCanvas"></canvas>
						</div>
						<div class="memory-stats">
							<div class="stat-item">
								<span class="stat-label">Current Usage</span>
								<span class="stat-value" id="currentMemory">--</span>
							</div>
							<div class="stat-item">
								<span class="stat-label">Peak Usage</span>
								<span class="stat-value" id="peakMemory">--</span>
							</div>
						</div>
					</div>

					<div class="panel network-panel">
						<div class="panel-header">
							<h2>Network Performance</h2>
						</div>
						<div class="network-stats">
							<div class="stat-card">
								<span class="stat-icon codicon codicon-cloud-download"></span>
								<div class="stat-content">
									<span class="stat-value" id="networkRequests">--</span>
									<span class="stat-label">Requests</span>
								</div>
							</div>
							<div class="stat-card">
								<span class="stat-icon codicon codicon-database"></span>
								<div class="stat-content">
									<span class="stat-value" id="networkSize">--</span>
									<span class="stat-label">Total Size</span>
								</div>
							</div>
							<div class="stat-card">
								<span class="stat-icon codicon codicon-watch"></span>
								<div class="stat-content">
									<span class="stat-value" id="networkTime">--</span>
									<span class="stat-label">Total Time</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div class="footer">
					<div class="footer-item">
						<span class="codicon codicon-pulse"></span>
						<span id="lastUpdate">Never</span>
					</div>
					<div class="footer-item">
						<span class="codicon codicon-history"></span>
						<span id="metricsCount">0 snapshots</span>
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
		const scriptUri = this.getWebviewUri(webview, ['src', 'webview-ui', 'performance', 'main.js']);
		return `<script nonce="${nonce}" src="${scriptUri}"></script>`;
	}

	/**
	 *
	 * @param message
	 */
	protected async handleMessage(message: any): Promise<void> {
		switch (message.type) {
			case 'getMetrics':
				this.sendMetricsUpdate();
				break;

			case 'exportReport':
				await this.exportReport();
				break;

			case 'clearMetrics':
				await this.clearMetrics();
				break;

			case 'refreshMetrics':
				// In a real implementation, this would fetch metrics from the application
				this.sendMetricsUpdate();
				break;
		}
	}

	/**
	 *
	 */
	protected override onPanelCreated(): void {
		this.sendMetricsUpdate();
	}

	/**
	 *
	 */
	protected override onPanelVisible(): void {
		this.sendMetricsUpdate();
	}

	/**
	 * Update metrics from the application
	 * @param metrics
	 */
	public updateMetrics(metrics: Partial<PerformanceMetrics>): void {
		this.metrics = {
			...this.metrics,
			...metrics
		};

		// Add to history
		this.metricsHistory.push({ ...this.metrics });
		if (this.metricsHistory.length > this.maxHistorySize) {
			this.metricsHistory.shift();
		}

		this.sendMetricsUpdate();
		this.persistMetrics();
	}

	/**
	 * Update a specific Web Vital metric
	 * @param name
	 * @param value
	 */
	public updateWebVital(name: keyof PerformanceMetrics['webVitals'], value: number): void {
		const rating = this.getMetricRating(name, value);
		this.metrics.webVitals[name] = {
			name: name as string,
			value,
			rating,
			timestamp: Date.now()
		};

		this.sendMetricsUpdate();
		this.persistMetrics();
	}

	/**
	 *
	 * @param metric
	 * @param value
	 */
	private getMetricRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
		const thresholds: Record<string, { good: number; poor: number }> = {
			LCP: { good: 2500, poor: 4000 },
			FID: { good: 100, poor: 300 },
			CLS: { good: 0.1, poor: 0.25 },
			FCP: { good: 1800, poor: 3000 },
			TTFB: { good: 800, poor: 1800 },
			INP: { good: 200, poor: 500 }
		};

		const threshold = thresholds[metric];
		if (!threshold) {
			return 'good';
		}

		if (value <= threshold.good) {
			return 'good';
		} else if (value <= threshold.poor) {
			return 'needs-improvement';
		} 
			return 'poor';
		
	}

	/**
	 *
	 */
	private calculatePerformanceScore(): number {
		const vitals = this.metrics.webVitals;
		let score = 0;
		let count = 0;

		const scoreMap = {
			good: 100,
			'needs-improvement': 50,
			poor: 0
		};

		for (const metric of Object.values(vitals)) {
			if (metric) {
				score += scoreMap[metric.rating];
				count++;
			}
		}

		return count > 0 ? Math.round(score / count) : 0;
	}

	/**
	 *
	 */
	private sendMetricsUpdate(): void {
		const performanceScore = this.calculatePerformanceScore();

		this.postMessage({
			type: 'metricsUpdate',
			payload: {
				metrics: this.metrics,
				history: this.metricsHistory,
				performanceScore,
				timestamp: Date.now()
			}
		});
	}

	/**
	 *
	 */
	private async exportReport(): Promise<void> {
		const uri = await vscode.window.showSaveDialog({
			filters: {
				'JSON Files': ['json'],
				'HTML Report': ['html']
			},
			defaultUri: vscode.Uri.file('enzyme-performance-report.json')
		});

		if (uri) {
			const report = {
				timestamp: new Date().toISOString(),
				performanceScore: this.calculatePerformanceScore(),
				metrics: this.metrics,
				history: this.metricsHistory
			};

			const content = JSON.stringify(report, null, 2);
			await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
			vscode.window.showInformationMessage('Performance report exported successfully');
		}
	}

	/**
	 *
	 */
	private async clearMetrics(): Promise<void> {
		const answer = await vscode.window.showWarningMessage(
			'Are you sure you want to clear all performance metrics?',
			'Yes',
			'No'
		);

		if (answer === 'Yes') {
			this.metrics = this.getEmptyMetrics();
			this.metricsHistory = [];
			this.sendMetricsUpdate();
			await this.persistState('metrics', null);
			vscode.window.showInformationMessage('Performance metrics cleared');
		}
	}

	/**
	 *
	 */
	private getEmptyMetrics(): PerformanceMetrics {
		return {
			webVitals: {},
			componentMetrics: [],
			bundleSize: {
				total: 0,
				chunks: []
			},
			networkMetrics: {
				requests: 0,
				totalSize: 0,
				totalTime: 0
			},
			memoryUsage: []
		};
	}

	/**
	 *
	 */
	private async persistMetrics(): Promise<void> {
		await this.persistState('metrics', this.metrics);
		await this.persistState('metricsHistory', this.metricsHistory.slice(-20));
	}

	/**
	 *
	 */
	private loadPersistedMetrics(): void {
		const metrics = this.getPersistedState<PerformanceMetrics>('metrics', this.getEmptyMetrics());
		const history = this.getPersistedState<PerformanceMetrics[]>('metricsHistory', []);

		this.metrics = metrics;
		this.metricsHistory = history;
	}

	/**
	 *
	 */
	public override dispose(): void {
		super.dispose();
		PerformancePanel.instance = undefined;
	}
}
