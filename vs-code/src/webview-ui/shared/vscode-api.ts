/**
 * VS Code API wrapper for webviews
 *
 * This module provides a type-safe wrapper around the VS Code webview API.
 * It handles message passing between the webview and the extension host.
 */

// VS Code API is available globally in webviews
declare function acquireVsCodeApi(): VSCodeAPI;

interface VSCodeAPI<T = unknown> {
	postMessage(message: T): void;
	setState(state: T): void;
	getState(): T | undefined;
}

class VSCodeAPIWrapper<TState = Record<string, unknown>> {
	private readonly api: VSCodeAPI;
	private state: TState;

	constructor() {
		this.api = acquireVsCodeApi();
		this.state = (this.api.getState() || {}) as TState;
	}

	/**
	 * Post a message to the extension host
	 * @param message - The message to send to the extension host
	 */
	public postMessage<T = unknown>(message: T): void {
		this.api.postMessage(message);
	}

	/**
	 * Get the current state
	 * @returns The current webview state
	 */
	public getState(): TState {
		return this.state;
	}

	/**
	 * Set the current state
	 * @param state - The new state to set
	 */
	public setState(state: TState): void {
		this.state = state;
		this.api.setState(state);
	}

	/**
	 * Update a portion of the state
	 * @param updates - Partial state updates to apply
	 */
	public updateState(updates: Partial<TState>): void {
		this.state = {
			...this.state,
			...updates
		};
		this.api.setState(this.state);
	}

	/**
	 * Listen for messages from the extension host
	 * @param handler - Callback function to handle incoming messages
	 * @returns Function to unsubscribe from messages
	 */
	public onMessage<T = unknown>(handler: (message: T) => void): () => void {
		const listener = (event: MessageEvent) => {
			handler(event.data);
		};

		window.addEventListener('message', listener);

		// Return unsubscribe function
		return () => {
			window.removeEventListener('message', listener);
		};
	}
}

// Export singleton instance
export const vscode = new VSCodeAPIWrapper();

/**
 * Helper function to create a message sender
 * @param type - The message type identifier
 * @returns A function that sends messages of the specified type
 */
export function createMessageSender<T = unknown>(type: string) {
	return (payload?: T) => {
		vscode.postMessage({ type, payload });
	};
}

/**
 * Helper function to create a message handler
 * @param type - The message type to handle
 * @param handler - Callback function to process the message payload
 * @returns Function to unsubscribe from the message handler
 */
export function createMessageHandler<T = unknown>(
	type: string,
	handler: (payload: T) => void
): () => void {
	return vscode.onMessage<{ type: string; payload: T }>((message) => {
		if (message.type === type) {
			handler(message.payload);
		}
	});
}

/**
 * Utilities for working with the webview
 */
export const webviewUtils = {
	/**
	 * Format bytes to human-readable size
	 */
	formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
	},

	/**
	 * Format milliseconds to human-readable time
	 */
	formatTime(ms: number): string {
		if (ms < 1000) {
			return `${Math.round(ms)}ms`;
		} else if (ms < 60000) {
			return `${(ms / 1000).toFixed(2)}s`;
		} else {
			const minutes = Math.floor(ms / 60000);
			const seconds = ((ms % 60000) / 1000).toFixed(0);
			return `${minutes}m ${seconds}s`;
		}
	},

	/**
	 * Format timestamp to human-readable date
	 */
	formatDate(timestamp: number): string {
		const date = new Date(timestamp);
		return date.toLocaleString();
	},

	/**
	 * Format relative time (e.g., "2 minutes ago")
	 */
	formatRelativeTime(timestamp: number): string {
		const seconds = Math.floor((Date.now() - timestamp) / 1000);

		if (seconds < 60) {
			return 'just now';
		}

		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) {
			return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
		}

		const hours = Math.floor(minutes / 60);
		if (hours < 24) {
			return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
		}

		const days = Math.floor(hours / 24);
		return `${days} day${days !== 1 ? 's' : ''} ago`;
	},

	/**
	 * Debounce function
	 */
	debounce<T extends (...args: any[]) => any>(
		func: T,
		wait: number
	): (...args: Parameters<T>) => void {
		let timeout: NodeJS.Timeout | null = null;

		return (...args: Parameters<T>) => {
			if (timeout) {
				clearTimeout(timeout);
			}

			timeout = setTimeout(() => {
				func(...args);
			}, wait);
		};
	},

	/**
	 * Throttle function
	 */
	throttle<T extends (...args: any[]) => any>(
		func: T,
		limit: number
	): (...args: Parameters<T>) => void {
		let inThrottle: boolean = false;

		return (...args: Parameters<T>) => {
			if (!inThrottle) {
				func(...args);
				inThrottle = true;
				setTimeout(() => {
					inThrottle = false;
				}, limit);
			}
		};
	},

	/**
	 * Copy text to clipboard
	 */
	async copyToClipboard(text: string): Promise<boolean> {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch (error) {
			console.error('Failed to copy to clipboard:', error);
			return false;
		}
	},

	/**
	 * Escape HTML to prevent XSS
	 */
	escapeHtml(text: string): string {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	},

	/**
	 * Syntax highlight JSON
	 * @param json - JSON object or string to highlight
	 * @returns HTML string with syntax highlighting
	 */
	syntaxHighlightJSON(json: unknown): string {
		if (typeof json !== 'string') {
			json = JSON.stringify(json, null, 2);
		}

		json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

		return json.replace(
			/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
			(match) => {
				let cls = 'json-number';
				if (/^"/.test(match)) {
					if (/:$/.test(match)) {
						cls = 'json-key';
					} else {
						cls = 'json-string';
					}
				} else if (/true|false/.test(match)) {
					cls = 'json-boolean';
				} else if (/null/.test(match)) {
					cls = 'json-null';
				}
				return '<span class="' + cls + '">' + match + '</span>';
			}
		);
	}
};
