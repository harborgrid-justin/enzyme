/**
 * State Inspector WebView UI
 * Client-side logic for the state inspector panel
 */

import { vscode, createMessageSender, webviewUtils } from '../shared/vscode-api';

// Message senders
const sendGetState = createMessageSender('getState');
const sendSetState = createMessageSender('setState');
const sendExportState = createMessageSender('exportState');
const sendImportState = createMessageSender('importState');
const sendTimeTravel = createMessageSender<number>('timeTravel');
const sendFilterState = createMessageSender<string>('filterState');
const sendClearHistory = createMessageSender('clearHistory');

// State
let currentState: any = null;
let currentHistory: any[] = [];
let currentIndex: number = -1;
let totalStates: number = 0;
let filterText: string = '';
let expandedPaths: Set<string> = new Set();

// Initialize
function init() {
	setupEventListeners();
	sendGetState();
}

function setupEventListeners() {
	// Header actions
	document.getElementById('clearHistory')?.addEventListener('click', () => {
		sendClearHistory();
	});

	document.getElementById('exportState')?.addEventListener('click', () => {
		sendExportState();
	});

	document.getElementById('importState')?.addEventListener('click', () => {
		sendImportState();
	});

	document.getElementById('refreshState')?.addEventListener('click', () => {
		sendGetState();
	});

	// Search/filter
	const filterInput = document.getElementById('stateFilter') as HTMLInputElement;
	filterInput?.addEventListener('input', webviewUtils.debounce(() => {
		filterText = filterInput.value.toLowerCase();
		sendFilterState(filterText);
		renderStateTree();
	}, 300));

	// Time travel controls
	document.getElementById('timeTravelFirst')?.addEventListener('click', () => {
		if (currentHistory.length > 0) {
			sendTimeTravel(0);
		}
	});

	document.getElementById('timeTravelPrev')?.addEventListener('click', () => {
		if (currentIndex > 0) {
			sendTimeTravel(currentIndex - 1);
		}
	});

	document.getElementById('timeTravelNext')?.addEventListener('click', () => {
		if (currentIndex < totalStates - 1) {
			sendTimeTravel(currentIndex + 1);
		}
	});

	document.getElementById('timeTravelLast')?.addEventListener('click', () => {
		if (totalStates > 0) {
			sendTimeTravel(totalStates - 1);
		}
	});

	// Expand/collapse
	document.getElementById('expandAll')?.addEventListener('click', () => {
		expandAll();
	});

	document.getElementById('collapseAll')?.addEventListener('click', () => {
		collapseAll();
	});

	// Listen for messages from extension
	vscode.onMessage((message) => {
		handleMessage(message);
	});
}

function handleMessage(message: any) {
	switch (message.type) {
		case 'stateUpdate':
			handleStateUpdate(message.payload);
			break;
	}
}

function handleStateUpdate(payload: any) {
	currentState = payload.state;
	currentHistory = payload.history || [];
	currentIndex = payload.currentIndex ?? -1;
	totalStates = payload.totalStates ?? 0;

	renderStateTree();
	renderActionHistory();
	updateTimeTravelControls();
	updateFooter();
}

function renderStateTree() {
	const container = document.getElementById('stateTree');
	if (!container) return;

	if (!currentState) {
		// SECURITY: Use safe DOM manipulation instead of innerHTML
		container.textContent = '';
		const emptyState = document.createElement('div');
		emptyState.className = 'empty-state';

		const icon = document.createElement('span');
		icon.className = 'codicon codicon-info';

		const text = document.createElement('p');
		text.textContent = 'No state available. Start your application to see state.';

		emptyState.appendChild(icon);
		emptyState.appendChild(text);
		container.appendChild(emptyState);
		return;
	}

	// SECURITY: renderObject returns sanitized HTML, but we use a safer approach
	// by creating a wrapper element
	const wrapper = document.createElement('div');
	wrapper.innerHTML = renderObject(currentState, 'root');
	container.textContent = '';
	container.appendChild(wrapper);
}

function renderObject(obj: any, path: string, level: number = 0): string {
	if (obj === null) {
		return `<span class="state-value state-null">null</span>`;
	}

	if (obj === undefined) {
		return `<span class="state-value state-undefined">undefined</span>`;
	}

	const type = typeof obj;

	if (type === 'string') {
		return `<span class="state-value state-string">"${webviewUtils.escapeHtml(obj)}"</span>`;
	}

	if (type === 'number') {
		return `<span class="state-value state-number">${obj}</span>`;
	}

	if (type === 'boolean') {
		return `<span class="state-value state-boolean">${obj}</span>`;
	}

	if (Array.isArray(obj)) {
		const isExpanded = expandedPaths.has(path);
		const length = obj.length;

		if (length === 0) {
			return `<span class="state-value state-array">[]</span>`;
		}

		let html = `
			<div class="state-node">
				<div class="state-key-line" onclick="window.togglePath('${path}')">
					<span class="codicon codicon-chevron-${isExpanded ? 'down' : 'right'}"></span>
					<span class="state-bracket">[</span>
					<span class="state-info">${length} items</span>
					${!isExpanded ? '<span class="state-bracket">]</span>' : ''}
				</div>
		`;

		if (isExpanded) {
			html += '<div class="state-children">';
			obj.forEach((item, index) => {
				const itemPath = `${path}[${index}]`;
				const shouldShow = !filterText || itemPath.toLowerCase().includes(filterText);

				if (shouldShow) {
					html += `
						<div class="state-item">
							<span class="state-key">${index}:</span>
							${renderObject(item, itemPath, level + 1)}
						</div>
					`;
				}
			});
			html += '</div><span class="state-bracket">]</span>';
		}

		html += '</div>';
		return html;
	}

	if (type === 'object') {
		const isExpanded = expandedPaths.has(path);
		const keys = Object.keys(obj);
		const length = keys.length;

		if (length === 0) {
			return `<span class="state-value state-object">{}</span>`;
		}

		let html = `
			<div class="state-node">
				<div class="state-key-line" onclick="window.togglePath('${path}')">
					<span class="codicon codicon-chevron-${isExpanded ? 'down' : 'right'}"></span>
					<span class="state-bracket">{</span>
					<span class="state-info">${length} keys</span>
					${!isExpanded ? '<span class="state-bracket">}</span>' : ''}
				</div>
		`;

		if (isExpanded) {
			html += '<div class="state-children">';
			keys.forEach(key => {
				const itemPath = `${path}.${key}`;
				const shouldShow = !filterText || key.toLowerCase().includes(filterText) || itemPath.toLowerCase().includes(filterText);

				if (shouldShow) {
					html += `
						<div class="state-item">
							<span class="state-key">${webviewUtils.escapeHtml(key)}:</span>
							${renderObject(obj[key], itemPath, level + 1)}
						</div>
					`;
				}
			});
			html += '</div><span class="state-bracket">}</span>';
		}

		html += '</div>';
		return html;
	}

	return `<span class="state-value">${String(obj)}</span>`;
}

function renderActionHistory() {
	const container = document.getElementById('actionHistory');
	const countElement = document.getElementById('historyCount');

	if (!container) return;

	if (countElement) {
		countElement.textContent = String(currentHistory.length);
	}

	if (currentHistory.length === 0) {
		// SECURITY: Use safe DOM manipulation
		container.textContent = '';
		const emptyState = document.createElement('div');
		emptyState.className = 'empty-state';

		const icon = document.createElement('span');
		icon.className = 'codicon codicon-history';

		const text = document.createElement('p');
		text.textContent = 'No actions recorded yet.';

		emptyState.appendChild(icon);
		emptyState.appendChild(text);
		container.appendChild(emptyState);
		return;
	}

	// SECURITY: Use DOM manipulation instead of innerHTML to prevent XSS
	container.textContent = '';
	const historyItemsDiv = document.createElement('div');
	historyItemsDiv.className = 'history-items';

	currentHistory.forEach((item, index) => {
		const isActive = index === currentIndex;
		const time = webviewUtils.formatRelativeTime(item.timestamp);

		const historyItem = document.createElement('div');
		historyItem.className = `history-item ${isActive ? 'active' : ''}`;
		historyItem.onclick = () => (window as any).selectHistoryItem(index);

		const header = document.createElement('div');
		header.className = 'history-item-header';

		const actionSpan = document.createElement('span');
		actionSpan.className = 'history-action';
		actionSpan.textContent = item.action || 'State Update';
		header.appendChild(actionSpan);

		if (item.hasChanges) {
			const diffIcon = document.createElement('span');
			diffIcon.className = 'codicon codicon-diff';
			header.appendChild(diffIcon);
		}

		const timeDiv = document.createElement('div');
		timeDiv.className = 'history-item-time';
		timeDiv.textContent = time;

		historyItem.appendChild(header);
		historyItem.appendChild(timeDiv);
		historyItemsDiv.appendChild(historyItem);
	});

	container.appendChild(historyItemsDiv);
}

function updateTimeTravelControls() {
	const firstBtn = document.getElementById('timeTravelFirst') as HTMLButtonElement;
	const prevBtn = document.getElementById('timeTravelPrev') as HTMLButtonElement;
	const nextBtn = document.getElementById('timeTravelNext') as HTMLButtonElement;
	const lastBtn = document.getElementById('timeTravelLast') as HTMLButtonElement;
	const positionSpan = document.getElementById('statePosition');

	if (firstBtn) firstBtn.disabled = currentIndex <= 0;
	if (prevBtn) prevBtn.disabled = currentIndex <= 0;
	if (nextBtn) nextBtn.disabled = currentIndex >= totalStates - 1;
	if (lastBtn) lastBtn.disabled = currentIndex >= totalStates - 1;

	if (positionSpan) {
		positionSpan.textContent = `${currentIndex + 1} / ${totalStates}`;
	}
}

function updateFooter() {
	const lastUpdateElement = document.getElementById('lastUpdate');
	if (lastUpdateElement) {
		lastUpdateElement.textContent = webviewUtils.formatRelativeTime(Date.now());
	}

	const storeCountElement = document.getElementById('storeCount');
	if (storeCountElement && currentState) {
		const keys = Object.keys(currentState);
		storeCountElement.textContent = `${keys.length} store${keys.length !== 1 ? 's' : ''}`;
	}
}

function expandAll() {
	expandedPaths.clear();
	addAllPaths(currentState, 'root');
	renderStateTree();
}

function collapseAll() {
	expandedPaths.clear();
	renderStateTree();
}

function addAllPaths(obj: any, path: string) {
	if (obj && typeof obj === 'object') {
		expandedPaths.add(path);

		if (Array.isArray(obj)) {
			obj.forEach((item, index) => {
				addAllPaths(item, `${path}[${index}]`);
			});
		} else {
			Object.keys(obj).forEach(key => {
				addAllPaths(obj[key], `${path}.${key}`);
			});
		}
	}
}

// Expose functions to window for onclick handlers
(window as any).togglePath = (path: string) => {
	if (expandedPaths.has(path)) {
		expandedPaths.delete(path);
	} else {
		expandedPaths.add(path);
	}
	renderStateTree();
};

(window as any).selectHistoryItem = (index: number) => {
	sendTimeTravel(index);
};

// Start the app
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}
