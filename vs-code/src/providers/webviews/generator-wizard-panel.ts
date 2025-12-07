import * as vscode from 'vscode';
import { getMessageValidator } from '../../core/message-validator';
import { sanitizePath } from '../../core/security-utils';
import { BaseWebViewPanel } from './base-webview-panel';

/**
 *
 */
interface GeneratorTemplate {
	id: string;
	name: string;
	description: string;
	category: 'component' | 'page' | 'hook' | 'store' | 'service' | 'util' | 'test';
	icon: string;
	options: GeneratorOption[];
	preview?: string;
}

/**
 *
 */
interface GeneratorOption {
	name: string;
	label: string;
	type: 'text' | 'boolean' | 'select' | 'multiselect';
	default?: any;
	required?: boolean;
	options?: string[];
	description?: string;
}

/**
 *
 */
interface GenerationResult {
	success: boolean;
	files: Array<{
		path: string;
		content: string;
		created: boolean;
	}>;
	errors?: string[];
}

/**
 * WebView panel for generating code using Enzyme CLI templates.
 * Provides a step-by-step wizard interface for code generation.
 */
export class GeneratorWizardPanel extends BaseWebViewPanel {
	private static instance: GeneratorWizardPanel | undefined;
	private templates: GeneratorTemplate[] = [];
	private currentStep = 0;
	private selectedTemplate: GeneratorTemplate | null = null;
	private wizardData: Record<string, any> = {};

	/**
	 *
	 * @param context
	 */
	private constructor(context: vscode.ExtensionContext) {
		super(context, 'enzyme.generatorWizard', 'Enzyme Generator');
		this.loadTemplates();
	}

	/**
	 * Get or create the singleton instance
	 * @param context
	 */
	public static getInstance(context: vscode.ExtensionContext): GeneratorWizardPanel {
		if (!GeneratorWizardPanel.instance) {
			GeneratorWizardPanel.instance = new GeneratorWizardPanel(context);
		}
		return GeneratorWizardPanel.instance;
	}

	/**
	 * Show the generator wizard panel
	 * @param context
	 * @param templateId
	 */
	public static show(context: vscode.ExtensionContext, templateId?: string): void {
		const panel = GeneratorWizardPanel.getInstance(context);
		if (templateId) {
			panel.selectTemplate(templateId);
		}
		panel.show();
	}

	/**
	 *
	 */
	protected override getIconPath(): vscode.Uri | { light: vscode.Uri; dark: vscode.Uri } | undefined {
		return {
			light: vscode.Uri.file(this.context.asAbsolutePath('resources/icons/generator-light.svg')),
			dark: vscode.Uri.file(this.context.asAbsolutePath('resources/icons/generator-dark.svg'))
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
						Code Generator
					</h1>
					<div class="header-actions">
						<button id="resetWizard" class="btn btn-secondary">
							<span class="codicon codicon-debug-restart"></span>
							Reset
						</button>
					</div>
				</div>

				<div class="wizard-container">
					<div class="wizard-steps">
						<div class="step" data-step="0">
							<div class="step-number">1</div>
							<div class="step-label">Select Template</div>
						</div>
						<div class="step-divider"></div>
						<div class="step" data-step="1">
							<div class="step-number">2</div>
							<div class="step-label">Configure</div>
						</div>
						<div class="step-divider"></div>
						<div class="step" data-step="2">
							<div class="step-number">3</div>
							<div class="step-label">Preview</div>
						</div>
						<div class="step-divider"></div>
						<div class="step" data-step="3">
							<div class="step-number">4</div>
							<div class="step-label">Generate</div>
						</div>
					</div>

					<div class="wizard-content">
						<!-- Step 0: Template Selection -->
						<div id="step0" class="wizard-step active">
							<h2>Choose a Template</h2>
							<p class="step-description">Select what you want to generate</p>

							<div class="template-categories">
								<button class="category-filter active" data-category="all">All</button>
								<button class="category-filter" data-category="component">Components</button>
								<button class="category-filter" data-category="page">Pages</button>
								<button class="category-filter" data-category="hook">Hooks</button>
								<button class="category-filter" data-category="store">Stores</button>
								<button class="category-filter" data-category="service">Services</button>
							</div>

							<div id="templatesGrid" class="templates-grid">
								<!-- Templates will be rendered here -->
							</div>
						</div>

						<!-- Step 1: Configuration -->
						<div id="step1" class="wizard-step">
							<h2>Configure Options</h2>
							<p class="step-description">Customize your generated code</p>

							<div id="configForm" class="config-form">
								<!-- Options will be rendered dynamically -->
							</div>
						</div>

						<!-- Step 2: Preview -->
						<div id="step2" class="wizard-step">
							<h2>Preview Generated Files</h2>
							<p class="step-description">Review the files that will be created</p>

							<div id="filePreview" class="file-preview">
								<div class="file-list">
									<div class="file-list-header">
										<h3>Files to be created</h3>
										<span id="fileCount" class="badge">0 files</span>
									</div>
									<div id="fileListContent" class="file-list-content">
										<!-- File list will be rendered here -->
									</div>
								</div>
								<div class="file-content">
									<div class="file-content-header">
										<span id="selectedFileName">Select a file to preview</span>
									</div>
									<pre id="fileContentPreview" class="code-preview"></pre>
								</div>
							</div>
						</div>

						<!-- Step 3: Generate -->
						<div id="step3" class="wizard-step">
							<h2>Generation Complete!</h2>

							<div id="generationResult" class="generation-result">
								<div class="result-pending">
									<div class="spinner"></div>
									<p>Generating files...</p>
								</div>
							</div>
						</div>
					</div>

					<div class="wizard-footer">
						<div class="footer-left">
							<span id="stepIndicator">Step 1 of 4</span>
						</div>
						<div class="footer-right">
							<button id="prevStep" class="btn btn-secondary" disabled>
								<span class="codicon codicon-arrow-left"></span>
								Previous
							</button>
							<button id="nextStep" class="btn btn-primary" disabled>
								Next
								<span class="codicon codicon-arrow-right"></span>
							</button>
							<button id="generateCode" class="btn btn-primary" style="display: none;">
								<span class="codicon codicon-wand"></span>
								Generate
							</button>
							<button id="openFiles" class="btn btn-primary" style="display: none;">
								<span class="codicon codicon-folder-opened"></span>
								Open Files
							</button>
						</div>
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
		const scriptUri = this.getWebviewUri(webview, ['src', 'webview-ui', 'generator-wizard', 'main.js']);
		return `<script nonce="${nonce}" src="${scriptUri}"></script>`;
	}

	/**
	 * SECURITY: Handle messages from webview with validation
	 * All messages are validated before processing to prevent injection attacks
	 * @param message
	 */
	protected async handleMessage(message: any): Promise<void> {
		// SECURITY: Validate base message structure
		const validator = getMessageValidator();
		const baseValidation = validator.validateBaseMessage(message);

		if (!baseValidation.valid) {
			vscode.window.showErrorMessage('Invalid message received from webview');
			return;
		}

		// SECURITY: Validate message type is expected
		const validTypes = ['getTemplates', 'selectTemplate', 'updateWizardData', 'previewFiles', 'generate', 'reset', 'openFile'];
		if (!validTypes.includes(message.type)) {
			vscode.window.showErrorMessage(`Unknown message type: ${message.type}`);
			return;
		}

		switch (message.type) {
			case 'getTemplates':
				this.sendTemplatesUpdate();
				break;

			case 'selectTemplate':
				// SECURITY: Validate template ID
				if (typeof message.payload?.id !== 'string' || !message.payload.id.match(/^[\w\-]+$/)) {
					vscode.window.showErrorMessage('Invalid template ID');
					return;
				}
				this.selectTemplate(message.payload.id);
				break;

			case 'updateWizardData':
				// SECURITY: Validate and sanitize wizard data before merging
				if (typeof message.payload !== 'object' || message.payload === null) {
					vscode.window.showErrorMessage('Invalid wizard data');
					return;
				}
				const sanitizedData = this.sanitizeWizardData(message.payload);
				this.wizardData = { ...this.wizardData, ...sanitizedData };
				break;

			case 'previewFiles':
				// SECURITY: Validate payload is an object
				if (typeof message.payload !== 'object' || message.payload === null) {
					vscode.window.showErrorMessage('Invalid preview data');
					return;
				}
				await this.previewFiles(this.sanitizeWizardData(message.payload));
				break;

			case 'generate':
				// SECURITY: Validate payload is an object
				if (typeof message.payload !== 'object' || message.payload === null) {
					vscode.window.showErrorMessage('Invalid generation data');
					return;
				}
				await this.generateCode(this.sanitizeWizardData(message.payload));
				break;

			case 'reset':
				this.resetWizard();
				break;

			case 'openFile':
				// SECURITY: Validate file path
				if (typeof message.payload !== 'string') {
					vscode.window.showErrorMessage('Invalid file path');
					return;
				}
				// SECURITY: Sanitize path to prevent traversal attacks
				const workspaceRoot = this.getWorkspaceRoot();
				if (!workspaceRoot) {
					vscode.window.showErrorMessage('No workspace folder open');
					return;
				}
				const sanitized = sanitizePath(message.payload, workspaceRoot);
				if (!sanitized) {
					vscode.window.showErrorMessage('Invalid or unsafe file path');
					return;
				}
				await this.openGeneratedFile(sanitized);
				break;
		}
	}

	/**
	 * SECURITY: Sanitize wizard data to prevent injection attacks
	 * Validates and sanitizes all user input from webview
	 *
	 * @param data - Raw data from webview
	 * @returns Sanitized data safe for use
	 */
	private sanitizeWizardData(data: Record<string, any>): Record<string, any> {
		const sanitized: Record<string, any> = {};

		for (const [key, value] of Object.entries(data)) {
			// SECURITY: Only allow alphanumeric keys
			if (!/^[A-Za-z]\w*$/.test(key)) {
				continue; // Skip invalid keys
			}

			// SECURITY: Sanitize based on value type
			if (typeof value === 'string') {
				// SECURITY: For 'name' field, ensure it's a valid identifier
				if (key === 'name') {
					if (/^[A-Za-z]\w*$/.test(value) && value.length <= 100) {
						sanitized[key] = value;
					}
				}
				// SECURITY: For 'path' field, sanitize to prevent path traversal
				else if (key === 'path') {
					const workspaceRoot = this.getWorkspaceRoot();
					if (workspaceRoot) {
						const sanitizedPath = sanitizePath(value, workspaceRoot);
						if (sanitizedPath) {
							sanitized[key] = sanitizedPath;
						}
					}
				}
				// SECURITY: For other string fields, limit length and remove control chars
				else {
					const trimmed = value.trim().slice(0, 500);
					// Remove control characters except newlines and tabs
					sanitized[key] = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
				}
			}
			else if (typeof value === 'boolean') {
				sanitized[key] = value;
			}
			else if (typeof value === 'number' && !isNaN(value)) {
				sanitized[key] = value;
			}
			// SECURITY: Reject other types (objects, arrays, etc.) to prevent prototype pollution
		}

		return sanitized;
	}

	/**
	 * Get workspace root path
	 */
	private getWorkspaceRoot(): string | null {
		const folders = vscode.workspace.workspaceFolders;
		return folders && folders.length > 0 ? folders[0]!.uri.fsPath : null;
	}

	/**
	 *
	 */
	protected override onPanelCreated(): void {
		this.sendTemplatesUpdate();
	}

	/**
	 *
	 */
	protected override onPanelVisible(): void {
		this.sendTemplatesUpdate();
	}

	/**
	 *
	 */
	private loadTemplates(): void {
		// Define available templates
		this.templates = [
			{
				id: 'component',
				name: 'React Component',
				description: 'Create a new React component with TypeScript',
				category: 'component',
				icon: 'symbol-class',
				options: [
					{
						name: 'name',
						label: 'Component Name',
						type: 'text',
						required: true,
						description: 'Name of the component (PascalCase)'
					},
					{
						name: 'path',
						label: 'Path',
						type: 'text',
						default: 'src/components',
						required: true
					},
					{
						name: 'withProps',
						label: 'Include Props Interface',
						type: 'boolean',
						default: true
					},
					{
						name: 'withStyles',
						label: 'Include Styles',
						type: 'boolean',
						default: true
					},
					{
						name: 'withTests',
						label: 'Include Tests',
						type: 'boolean',
						default: true
					},
					{
						name: 'withStorybook',
						label: 'Include Storybook Story',
						type: 'boolean',
						default: false
					}
				]
			},
			{
				id: 'page',
				name: 'Page Component',
				description: 'Create a new page component with routing',
				category: 'page',
				icon: 'browser',
				options: [
					{
						name: 'name',
						label: 'Page Name',
						type: 'text',
						required: true
					},
					{
						name: 'path',
						label: 'Path',
						type: 'text',
						default: 'src/pages',
						required: true
					},
					{
						name: 'route',
						label: 'Route Path',
						type: 'text',
						required: true,
						description: 'URL path for this page (e.g., /about)'
					},
					{
						name: 'withLayout',
						label: 'Use Layout',
						type: 'boolean',
						default: true
					},
					{
						name: 'protected',
						label: 'Protected Route',
						type: 'boolean',
						default: false
					}
				]
			},
			{
				id: 'hook',
				name: 'Custom Hook',
				description: 'Create a custom React hook',
				category: 'hook',
				icon: 'symbol-method',
				options: [
					{
						name: 'name',
						label: 'Hook Name',
						type: 'text',
						required: true,
						description: 'Name of the hook (e.g., useMyHook)'
					},
					{
						name: 'path',
						label: 'Path',
						type: 'text',
						default: 'src/hooks',
						required: true
					},
					{
						name: 'withTests',
						label: 'Include Tests',
						type: 'boolean',
						default: true
					}
				]
			},
			{
				id: 'store',
				name: 'Zustand Store',
				description: 'Create a Zustand state store',
				category: 'store',
				icon: 'database',
				options: [
					{
						name: 'name',
						label: 'Store Name',
						type: 'text',
						required: true
					},
					{
						name: 'path',
						label: 'Path',
						type: 'text',
						default: 'src/stores',
						required: true
					},
					{
						name: 'withPersist',
						label: 'Enable Persistence',
						type: 'boolean',
						default: false
					},
					{
						name: 'withDevtools',
						label: 'Enable DevTools',
						type: 'boolean',
						default: true
					}
				]
			},
			{
				id: 'service',
				name: 'API Service',
				description: 'Create an API service with type-safe methods',
				category: 'service',
				icon: 'cloud',
				options: [
					{
						name: 'name',
						label: 'Service Name',
						type: 'text',
						required: true
					},
					{
						name: 'path',
						label: 'Path',
						type: 'text',
						default: 'src/services',
						required: true
					},
					{
						name: 'baseUrl',
						label: 'Base URL',
						type: 'text',
						default: '/api'
					},
					{
						name: 'withMocks',
						label: 'Include Mock Data',
						type: 'boolean',
						default: false
					}
				]
			}
		];
	}

	/**
	 *
	 * @param templateId
	 */
	private selectTemplate(templateId: string): void {
		const template = this.templates.find(t => t.id === templateId);
		if (template) {
			this.selectedTemplate = template;
			this.wizardData = {};
			this.currentStep = 1;
			this.sendWizardUpdate();
		}
	}

	/**
	 *
	 * @param data
	 */
	private async previewFiles(data: Record<string, any>): Promise<void> {
		if (!this.selectedTemplate) {
			return;
		}

		const files = this.generateFileList(this.selectedTemplate, data);

		this.postMessage({
			type: 'filesPreview',
			payload: { files }
		});
	}

	/**
	 *
	 * @param data
	 */
	private async generateCode(data: Record<string, any>): Promise<void> {
		if (!this.selectedTemplate) {
			return;
		}

		try {
			const files = this.generateFileList(this.selectedTemplate, data);
			const result: GenerationResult = {
				success: true,
				files: []
			};

			// Create files
			for (const file of files) {
				try {
					const uri = vscode.Uri.file(file.path);
					await vscode.workspace.fs.writeFile(uri, Buffer.from(file.content, 'utf8'));
					result.files.push({
						...file,
						created: true
					});
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					result.files.push({
						...file,
						created: false
					});
					if (!result.errors) {
						result.errors = [];
					}
					result.errors.push(`Failed to create ${file.path}: ${errorMessage}`);
				}
			}

			this.postMessage({
				type: 'generationComplete',
				payload: result
			});

			if (result.success && result.files.length > 0) {
				vscode.window.showInformationMessage(
					`Successfully generated ${result.files.length} file(s)`
				);
			}

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.postMessage({
				type: 'generationError',
				payload: { error: errorMessage }
			});

			vscode.window.showErrorMessage(`Generation failed: ${errorMessage}`);
		}
	}

	/**
	 * SECURITY: Generate file list with path validation
	 * Sanitizes all file paths to prevent path traversal attacks
	 *
	 * @param template - Generator template
	 * @param data - Sanitized generation data
	 * @returns Array of files to generate with validated paths
	 */
	private generateFileList(template: GeneratorTemplate, data: Record<string, any>): Array<{ path: string; content: string }> {
		const files: Array<{ path: string; content: string }> = [];

		// SECURITY: Validate name (already sanitized by sanitizeWizardData, but double-check)
		const name = data['name'] || 'MyComponent';
		if (!/^[A-Za-z]\w*$/.test(name)) {
			throw new Error('Invalid component name');
		}

		// SECURITY: Validate path (already sanitized by sanitizeWizardData, but double-check)
		const basePath = data['path'] || 'src';
		const workspaceRoot = this.getWorkspaceRoot();
		if (!workspaceRoot) {
			throw new Error('No workspace folder open');
		}

		// SECURITY: Sanitize base path to prevent traversal
		const sanitizedBasePath = sanitizePath(basePath, workspaceRoot);
		if (!sanitizedBasePath) {
			throw new Error('Invalid or unsafe base path');
		}

		switch (template.id) {
			case 'component':
				files.push({
					path: `${sanitizedBasePath}/${name}/${name}.tsx`,
					content: this.generateComponentContent(name, data)
				});

				if (data['withStyles']) {
					files.push({
						path: `${sanitizedBasePath}/${name}/${name}.module.css`,
						content: this.generateStylesContent()
					});
				}

				if (data['withTests']) {
					files.push({
						path: `${sanitizedBasePath}/${name}/${name}.test.tsx`,
						content: this.generateTestContent(name)
					});
				}

				files.push({
					path: `${sanitizedBasePath}/${name}/index.ts`,
					content: `export { ${name} } from './${name}';\n`
				});
				break;

			case 'hook':
				files.push({
					path: `${sanitizedBasePath}/${name}.ts`,
					content: this.generateHookContent(name)
				});

				if (data['withTests']) {
					files.push({
						path: `${sanitizedBasePath}/${name}.test.ts`,
						content: this.generateHookTestContent(name)
					});
				}
				break;

			case 'store':
				files.push({
					path: `${sanitizedBasePath}/${name}.ts`,
					content: this.generateStoreContent(name, data)
				});
				break;

			// Add more template types as needed
		}

		return files;
	}

	/**
	 *
	 * @param name
	 * @param data
	 */
	private generateComponentContent(name: string, data: Record<string, any>): string {
		const hasProps = data['withProps'];
		const hasStyles = data['withStyles'];

		return `import React from 'react';
${hasStyles ? `import styles from './${name}.module.css';` : ''}

${hasProps ? `interface ${name}Props {
  // Add your props here
}

` : ''}export const ${name}: React.FC${hasProps ? `<${name}Props>` : ''} = (${hasProps ? 'props' : ''}) => {
  return (
    <div${hasStyles ? ` className={styles.container}` : ''}>
      <h1>${name}</h1>
    </div>
  );
};
`;
	}

	/**
	 *
	 */
	private generateStylesContent(): string {
		return `.container {
  /* Add your styles here */
}
`;
	}

	/**
	 *
	 * @param name
	 */
	private generateTestContent(name: string): string {
		return `import { render, screen } from '@testing-library/react';
import { ${name} } from './${name}';

describe('${name}', () => {
  it('should render successfully', () => {
    render(<${name} />);
    expect(screen.getByText('${name}')).toBeInTheDocument();
  });
});
`;
	}

	/**
	 *
	 * @param name
	 */
	private generateHookContent(name: string): string {
		return `import { useState, useEffect } from 'react';

export const ${name} = () => {
  const [value, setValue] = useState<any>(null);

  useEffect(() => {
    // Add your effect logic here
  }, []);

  return { value, setValue };
};
`;
	}

	/**
	 *
	 * @param name
	 */
	private generateHookTestContent(name: string): string {
		return `import { renderHook } from '@testing-library/react';
import { ${name} } from './${name}';

describe('${name}', () => {
  it('should initialize correctly', () => {
    const { result } = renderHook(() => ${name}());
    expect(result.current).toBeDefined();
  });
});
`;
	}

	/**
	 *
	 * @param name
	 * @param data
	 */
	private generateStoreContent(name: string, data: Record<string, any>): string {
		const withPersist = data['withPersist'];
		const withDevtools = data['withDevtools'];

		return `import { create } from 'zustand';
${withDevtools ? `import { devtools } from 'zustand/middleware';` : ''}
${withPersist ? `import { persist } from 'zustand/middleware';` : ''}

interface ${name}State {
  // Add your state properties here
}

export const use${name} = create${withDevtools || withPersist ? '(' : '<'}${name}State${withDevtools || withPersist ? '>' : ''}(${withDevtools ? '\n  devtools(' : ''}${withPersist ? '\n    persist(' : ''}
  (set) => ({
    // Add your state and actions here
  })${withPersist ? `,\n      { name: '${name.toLowerCase()}-storage' }\n    )` : ''}${withDevtools ? ',\n    { name: \'${name}\' }\n  )' : ''}
);
`;
	}

	/**
	 *
	 */
	private resetWizard(): void {
		this.currentStep = 0;
		this.selectedTemplate = null;
		this.wizardData = {};
		this.sendWizardUpdate();
	}

	/**
	 *
	 * @param filePath
	 */
	private async openGeneratedFile(filePath: string): Promise<void> {
		try {
			const uri = vscode.Uri.file(filePath);
			const document = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(document);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Failed to open file: ${errorMessage}`);
		}
	}

	/**
	 *
	 */
	private sendTemplatesUpdate(): void {
		this.postMessage({
			type: 'templatesUpdate',
			payload: {
				templates: this.templates
			}
		});
	}

	/**
	 *
	 */
	private sendWizardUpdate(): void {
		this.postMessage({
			type: 'wizardUpdate',
			payload: {
				step: this.currentStep,
				template: this.selectedTemplate,
				data: this.wizardData
			}
		});
	}

	/**
	 *
	 */
	public override dispose(): void {
		super.dispose();
		GeneratorWizardPanel.instance = undefined;
	}
}
