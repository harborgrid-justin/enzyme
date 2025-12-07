/**
 * @file Settings HTML Generator
 * @description Generates HTML for settings webview
 */

import type { EnzymeExtensionSettings } from '../extension-config';

// =============================================================================
// Types
// =============================================================================

interface SettingsHTMLOptions {
  settings: Partial<EnzymeExtensionSettings>;
  defaultSettings: EnzymeExtensionSettings;
  nonce: string;
  cspSource: string;
}

// =============================================================================
// Setting Metadata
// =============================================================================

interface SettingMetadata {
  label: string;
  description: string;
  type: 'boolean' | 'string' | 'number' | 'select' | 'array';
  options?: string[];
  min?: number;
  max?: number;
  group: string;
}

const SETTINGS_METADATA: Record<string, SettingMetadata> = {
  // CLI
  'enzyme.cli.path': {
    label: 'CLI Path',
    description: 'Path to the Enzyme CLI executable',
    type: 'string',
    group: 'CLI',
  },
  'enzyme.cli.autoInstall': {
    label: 'Auto-install CLI',
    description: 'Automatically install Enzyme CLI if not found',
    type: 'boolean',
    group: 'CLI',
  },

  // Telemetry
  'enzyme.telemetry.enabled': {
    label: 'Enable Telemetry',
    description: 'Help improve Enzyme by sending anonymous usage data',
    type: 'boolean',
    group: 'Telemetry',
  },

  // Analysis
  'enzyme.analysis.autoRun': {
    label: 'Auto-run Analysis',
    description: 'Automatically run analysis when files change',
    type: 'boolean',
    group: 'Analysis',
  },
  'enzyme.analysis.onSave': {
    label: 'Analyze on Save',
    description: 'Run analysis when files are saved',
    type: 'boolean',
    group: 'Analysis',
  },
  'enzyme.analysis.debounceMs': {
    label: 'Analysis Debounce (ms)',
    description: 'Delay before running analysis after changes',
    type: 'number',
    min: 0,
    max: 5000,
    group: 'Analysis',
  },

  // Diagnostics
  'enzyme.diagnostics.enabled': {
    label: 'Enable Diagnostics',
    description: 'Show diagnostics in the Problems panel',
    type: 'boolean',
    group: 'Diagnostics',
  },
  'enzyme.diagnostics.severity': {
    label: 'Default Severity',
    description: 'Default severity level for diagnostics',
    type: 'select',
    options: ['error', 'warning', 'info', 'hint'],
    group: 'Diagnostics',
  },
  'enzyme.diagnostics.showInline': {
    label: 'Show Inline',
    description: 'Show diagnostics inline in the editor',
    type: 'boolean',
    group: 'Diagnostics',
  },

  // Code Lens
  'enzyme.codeLens.enabled': {
    label: 'Enable CodeLens',
    description: 'Show CodeLens information in the editor',
    type: 'boolean',
    group: 'CodeLens',
  },
  'enzyme.codeLens.showReferences': {
    label: 'Show References',
    description: 'Show reference counts in CodeLens',
    type: 'boolean',
    group: 'CodeLens',
  },
  'enzyme.codeLens.showImplementations': {
    label: 'Show Implementations',
    description: 'Show implementation counts in CodeLens',
    type: 'boolean',
    group: 'CodeLens',
  },

  // Inlay Hints
  'enzyme.inlayHints.enabled': {
    label: 'Enable Inlay Hints',
    description: 'Show inlay hints in the editor',
    type: 'boolean',
    group: 'Inlay Hints',
  },
  'enzyme.inlayHints.showTypes': {
    label: 'Show Types',
    description: 'Show type inlay hints',
    type: 'boolean',
    group: 'Inlay Hints',
  },
  'enzyme.inlayHints.showParameters': {
    label: 'Show Parameters',
    description: 'Show parameter name hints',
    type: 'boolean',
    group: 'Inlay Hints',
  },

  // Formatting
  'enzyme.formatting.enabled': {
    label: 'Enable Formatting',
    description: 'Enable Enzyme formatter',
    type: 'boolean',
    group: 'Formatting',
  },
  'enzyme.formatting.onSave': {
    label: 'Format on Save',
    description: 'Automatically format files on save',
    type: 'boolean',
    group: 'Formatting',
  },
  'enzyme.formatting.prettier': {
    label: 'Use Prettier',
    description: 'Use Prettier for formatting',
    type: 'boolean',
    group: 'Formatting',
  },

  // Completion
  'enzyme.completion.enabled': {
    label: 'Enable Completion',
    description: 'Enable IntelliSense completions',
    type: 'boolean',
    group: 'Completion',
  },
  'enzyme.completion.autoImport': {
    label: 'Auto-import',
    description: 'Automatically add imports on completion',
    type: 'boolean',
    group: 'Completion',
  },
  'enzyme.completion.snippets': {
    label: 'Enable Snippets',
    description: 'Enable code snippets',
    type: 'boolean',
    group: 'Completion',
  },

  // Dev Server
  'enzyme.devServer.port': {
    label: 'Port',
    description: 'Development server port',
    type: 'number',
    min: 1024,
    max: 65535,
    group: 'Dev Server',
  },
  'enzyme.devServer.host': {
    label: 'Host',
    description: 'Development server host',
    type: 'string',
    group: 'Dev Server',
  },
  'enzyme.devServer.autoStart': {
    label: 'Auto-start',
    description: 'Start dev server automatically',
    type: 'boolean',
    group: 'Dev Server',
  },

  // Debug
  'enzyme.debug.enabled': {
    label: 'Enable Debugging',
    description: 'Enable debugging features',
    type: 'boolean',
    group: 'Debug',
  },
  'enzyme.debug.connectAutomatically': {
    label: 'Auto-connect',
    description: 'Automatically connect debugger',
    type: 'boolean',
    group: 'Debug',
  },
  'enzyme.debug.port': {
    label: 'Debug Port',
    description: 'Port for debugger connection',
    type: 'number',
    min: 1024,
    max: 65535,
    group: 'Debug',
  },

  // Performance
  'enzyme.performance.caching': {
    label: 'Enable Caching',
    description: 'Cache analysis results for better performance',
    type: 'boolean',
    group: 'Performance',
  },
  'enzyme.performance.maxCacheSize': {
    label: 'Max Cache Size',
    description: 'Maximum number of cached items',
    type: 'number',
    min: 1,
    max: 1000,
    group: 'Performance',
  },

  // Experimental
  'enzyme.experimental.features': {
    label: 'Experimental Features',
    description: 'Enable experimental features (comma-separated)',
    type: 'array',
    group: 'Experimental',
  },
};

// =============================================================================
// HTML Generation
// =============================================================================

/**
 * Generate settings HTML
 */
export function generateSettingsHTML(options: SettingsHTMLOptions): string {
  const { settings, defaultSettings, nonce, cspSource } = options;

  // Group settings
  const groups = groupSettings(settings, defaultSettings);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>Enzyme Settings</title>
    <style>
        ${getStyles()}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Enzyme Extension Settings</h1>
            <div class="actions">
                <button class="btn btn-secondary" onclick="resetAll()">Reset All</button>
                <button class="btn btn-secondary" onclick="exportSettings()">Export</button>
                <button class="btn btn-secondary" onclick="importSettings()">Import</button>
                <button class="btn btn-primary" onclick="validateSettings()">Validate</button>
            </div>
        </header>

        <div class="search-box">
            <input type="text" id="searchInput" placeholder="Search settings..." onkeyup="filterSettings()">
        </div>

        ${Object.entries(groups).map(([group, groupSettings]) => `
            <section class="settings-group">
                <h2>${group}</h2>
                ${groupSettings.map((setting) => generateSettingHTML(setting, settings, defaultSettings)).join('')}
            </section>
        `).join('')}

        <div id="notification" class="notification" style="display: none;"></div>
    </div>

    <script nonce="${nonce}">
        ${getScript()}
    </script>
</body>
</html>`;
}

/**
 * Group settings by category
 */
function groupSettings(
  settings: Partial<EnzymeExtensionSettings>,
  defaultSettings: EnzymeExtensionSettings
): Record<string, Array<{ key: string; metadata: SettingMetadata }>> {
  const groups: Record<string, Array<{ key: string; metadata: SettingMetadata }>> = {};

  for (const [key, metadata] of Object.entries(SETTINGS_METADATA)) {
    if (!groups[metadata.group]) {
      groups[metadata.group] = [];
    }

    groups[metadata.group].push({ key, metadata });
  }

  return groups;
}

/**
 * Generate HTML for single setting
 */
function generateSettingHTML(
  setting: { key: string; metadata: SettingMetadata },
  currentSettings: Partial<EnzymeExtensionSettings>,
  defaultSettings: EnzymeExtensionSettings
): string {
  const { key, metadata } = setting;
  const value = (currentSettings as any)[key] ?? (defaultSettings as any)[key];
  const isDefault = (currentSettings as any)[key] === undefined;

  return `
    <div class="setting-item" data-key="${key}">
        <div class="setting-header">
            <label for="${key}">${metadata.label}</label>
            ${!isDefault ? '<span class="modified-badge">Modified</span>' : ''}
        </div>
        <div class="setting-description">${metadata.description}</div>
        <div class="setting-control">
            ${generateControl(key, metadata, value)}
            <button class="btn-reset" onclick="resetSetting('${key}')" title="Reset to default">
                ↺
            </button>
        </div>
    </div>
  `;
}

/**
 * Generate control HTML based on type
 */
function generateControl(key: string, metadata: SettingMetadata, value: unknown): string {
  switch (metadata.type) {
    case 'boolean':
      return `<input type="checkbox" id="${key}" ${value ? 'checked' : ''} onchange="updateSetting('${key}', this.checked)">`;

    case 'number':
      return `<input type="number" id="${key}" value="${value}" min="${metadata.min || ''}" max="${metadata.max || ''}" onchange="updateSetting('${key}', parseInt(this.value))">`;

    case 'select':
      return `<select id="${key}" onchange="updateSetting('${key}', this.value)">
        ${metadata.options?.map((opt) => `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`).join('')}
      </select>`;

    case 'array':
      return `<input type="text" id="${key}" value="${Array.isArray(value) ? value.join(', ') : ''}" onchange="updateSetting('${key}', this.value.split(',').map(s => s.trim()).filter(Boolean))">`;

    case 'string':
    default:
      return `<input type="text" id="${key}" value="${value || ''}" onchange="updateSetting('${key}', this.value)">`;
  }
}

/**
 * Get CSS styles
 */
function getStyles(): string {
  return `
    * {
        box-sizing: border-box;
    }

    body {
        font-family: var(--vscode-font-family);
        color: var(--vscode-foreground);
        background-color: var(--vscode-editor-background);
        padding: 0;
        margin: 0;
    }

    .container {
        max-width: 900px;
        margin: 0 auto;
        padding: 20px;
    }

    header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 1px solid var(--vscode-panel-border);
    }

    h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 400;
    }

    h2 {
        font-size: 18px;
        font-weight: 600;
        margin: 0 0 15px 0;
        color: var(--vscode-foreground);
    }

    .actions {
        display: flex;
        gap: 10px;
    }

    .btn {
        padding: 6px 14px;
        border: none;
        border-radius: 2px;
        cursor: pointer;
        font-size: 13px;
        transition: background-color 0.2s;
    }

    .btn-primary {
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
    }

    .btn-primary:hover {
        background-color: var(--vscode-button-hoverBackground);
    }

    .btn-secondary {
        background-color: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
    }

    .btn-secondary:hover {
        background-color: var(--vscode-button-secondaryHoverBackground);
    }

    .search-box {
        margin-bottom: 20px;
    }

    #searchInput {
        width: 100%;
        padding: 8px 12px;
        background-color: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border);
        border-radius: 2px;
        font-size: 13px;
    }

    .settings-group {
        margin-bottom: 30px;
        background-color: var(--vscode-editor-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 4px;
        padding: 20px;
    }

    .setting-item {
        margin-bottom: 20px;
        padding-bottom: 20px;
        border-bottom: 1px solid var(--vscode-panel-border);
    }

    .setting-item:last-child {
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
    }

    .setting-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 5px;
    }

    .setting-header label {
        font-weight: 600;
        font-size: 14px;
    }

    .modified-badge {
        font-size: 11px;
        padding: 2px 6px;
        background-color: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        border-radius: 2px;
    }

    .setting-description {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 8px;
    }

    .setting-control {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .setting-control input,
    .setting-control select {
        flex: 1;
        padding: 4px 8px;
        background-color: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border);
        border-radius: 2px;
        font-size: 13px;
    }

    .setting-control input[type="checkbox"] {
        flex: none;
        width: 18px;
        height: 18px;
    }

    .btn-reset {
        padding: 4px 8px;
        background-color: transparent;
        color: var(--vscode-foreground);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 2px;
        cursor: pointer;
        font-size: 16px;
    }

    .btn-reset:hover {
        background-color: var(--vscode-list-hoverBackground);
    }

    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background-color: var(--vscode-notifications-background);
        color: var(--vscode-notifications-foreground);
        border: 1px solid var(--vscode-notifications-border);
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        z-index: 1000;
    }

    .hidden {
        display: none !important;
    }
  `;
}

/**
 * Get JavaScript code
 */
function getScript(): string {
  return `
    const vscode = acquireVsCodeApi();

    function updateSetting(key, value) {
        vscode.postMessage({ type: 'updateSetting', key, value });
        showNotification('Setting updated: ' + key);
    }

    function resetSetting(key) {
        vscode.postMessage({ type: 'resetSetting', key });
        showNotification('Setting reset: ' + key);
    }

    function resetAll() {
        if (confirm('Reset all settings to defaults?')) {
            vscode.postMessage({ type: 'resetAll' });
        }
    }

    function exportSettings() {
        vscode.postMessage({ type: 'exportSettings' });
    }

    function importSettings() {
        vscode.postMessage({ type: 'importSettings' });
    }

    function validateSettings() {
        vscode.postMessage({ type: 'validateSettings' });
    }

    function filterSettings() {
        const query = document.getElementById('searchInput').value.toLowerCase();
        const items = document.querySelectorAll('.setting-item');

        items.forEach(item => {
            const key = item.dataset.key.toLowerCase();
            const text = item.textContent.toLowerCase();
            const matches = key.includes(query) || text.includes(query);
            item.classList.toggle('hidden', !matches);
        });

        // Hide empty groups
        document.querySelectorAll('.settings-group').forEach(group => {
            const visibleItems = group.querySelectorAll('.setting-item:not(.hidden)');
            group.classList.toggle('hidden', visibleItems.length === 0);
        });
    }

    function showNotification(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.style.display = 'block';

        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    // Listen for messages from extension
    window.addEventListener('message', event => {
        const message = event.data;

        switch (message.type) {
            case 'settingUpdated':
                if (!message.success) {
                    showNotification('Error: ' + message.error);
                }
                break;

            case 'validationResult':
                if (message.valid) {
                    showNotification('All settings are valid');
                } else {
                    showNotification('Validation errors: ' + message.errors.join(', '));
                }
                break;
        }
    });
  `;
}
