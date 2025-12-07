/**
 * @file Keyboard Shortcuts Reference
 * @description Centralized keyboard shortcut definitions following VS Code conventions
 *
 * This module provides:
 * - Shortcut definitions for all Enzyme commands
 * - Consistency with VS Code keyboard shortcut patterns
 * - Platform-specific key bindings (Windows/Linux vs Mac)
 * - Shortcut conflict detection
 * - Help text generation for UI
 */

import * as vscode from 'vscode';

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  /** Command identifier */
  command: string;

  /** Human-readable command name */
  name: string;

  /** Shortcut for Windows/Linux */
  windows: string;

  /** Shortcut for Mac */
  mac: string;

  /** When clause - when this shortcut is active */
  when?: string;

  /** Category for grouping */
  category: 'Generation' | 'Analysis' | 'Refactoring' | 'Navigation' | 'Panels' | 'Utility';

  /** Description of what the command does */
  description: string;
}

/**
 * All keyboard shortcuts following VS Code conventions
 *
 * Conventions followed:
 * - Primary prefix: Ctrl+Alt+E (Windows/Linux) / Cmd+Alt+E (Mac) for Enzyme commands
 * - Secondary keys use common VS Code patterns:
 *   - C = Component, F = Feature, R = Route, S = Store/State, H = Hook
 *   - P = Performance, A = Analysis
 *   - Single letters for most common operations
 * - Panel shortcuts use Ctrl/Cmd+Shift+E prefix for consistency
 * - Avoid conflicts with VS Code built-ins and popular extensions
 */
export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // Generation Commands
  {
    command: 'enzyme.generate.component',
    name: 'Generate Component',
    windows: 'Ctrl+Alt+E C',
    mac: 'Cmd+Alt+E C',
    when: 'editorTextFocus && enzyme:isEnzymeProject',
    category: 'Generation',
    description: 'Generate a new React component with TypeScript and tests'
  },
  {
    command: 'enzyme.generate.feature',
    name: 'Generate Feature',
    windows: 'Ctrl+Alt+E F',
    mac: 'Cmd+Alt+E F',
    when: 'enzyme:isEnzymeProject',
    category: 'Generation',
    description: 'Generate a new feature module with full scaffolding'
  },
  {
    command: 'enzyme.generate.route',
    name: 'Generate Route',
    windows: 'Ctrl+Alt+E R',
    mac: 'Cmd+Alt+E R',
    when: 'enzyme:isEnzymeProject',
    category: 'Generation',
    description: 'Generate a new route with page component'
  },
  {
    command: 'enzyme.generate.store',
    name: 'Generate Store',
    windows: 'Ctrl+Alt+E S',
    mac: 'Cmd+Alt+E S',
    when: 'enzyme:isEnzymeProject',
    category: 'Generation',
    description: 'Generate a Zustand store with TypeScript types'
  },
  {
    command: 'enzyme.generate.hook',
    name: 'Generate Hook',
    windows: 'Ctrl+Alt+E H',
    mac: 'Cmd+Alt+E H',
    when: 'enzyme:isEnzymeProject',
    category: 'Generation',
    description: 'Generate a custom React hook'
  },
  {
    command: 'enzyme.generate.apiClient',
    name: 'Generate API Client',
    windows: 'Ctrl+Alt+E A',
    mac: 'Cmd+Alt+E A',
    when: 'enzyme:isEnzymeProject',
    category: 'Generation',
    description: 'Generate an API client with type-safe methods'
  },

  // Analysis Commands
  {
    command: 'enzyme.analyze.performance',
    name: 'Analyze Performance',
    windows: 'Ctrl+Alt+E P',
    mac: 'Cmd+Alt+E P',
    when: 'editorTextFocus && enzyme:isEnzymeProject',
    category: 'Analysis',
    description: 'Run performance analysis on current file or project'
  },
  {
    command: 'enzyme.analyze.dependencies',
    name: 'Analyze Dependencies',
    windows: 'Ctrl+Alt+E D',
    mac: 'Cmd+Alt+E D',
    when: 'enzyme:isEnzymeProject',
    category: 'Analysis',
    description: 'Analyze project dependencies and detect issues'
  },

  // Panel Commands (using Ctrl/Cmd+Shift+E prefix for consistency)
  {
    command: 'enzyme.panel.showStateInspector',
    name: 'Open State Inspector',
    windows: 'Ctrl+Shift+E S',
    mac: 'Cmd+Shift+E S',
    when: 'enzyme:isEnzymeProject',
    category: 'Panels',
    description: 'Open the Zustand state inspector for debugging'
  },
  {
    command: 'enzyme.panel.showPerformance',
    name: 'Open Performance Monitor',
    windows: 'Ctrl+Shift+E P',
    mac: 'Cmd+Shift+E P',
    when: 'enzyme:isEnzymeProject',
    category: 'Panels',
    description: 'Open the performance monitoring dashboard'
  },
  {
    command: 'enzyme.panel.showRouteVisualizer',
    name: 'Open Route Visualizer',
    windows: 'Ctrl+Shift+E R',
    mac: 'Cmd+Shift+E R',
    when: 'enzyme:isEnzymeProject',
    category: 'Panels',
    description: 'Open the interactive route visualization panel'
  },
  {
    command: 'enzyme.panel.showAPIExplorer',
    name: 'Open API Explorer',
    windows: 'Ctrl+Shift+E A',
    mac: 'Cmd+Shift+E A',
    when: 'enzyme:isEnzymeProject',
    category: 'Panels',
    description: 'Open the API testing and exploration panel'
  },
  {
    command: 'enzyme.panel.showGeneratorWizard',
    name: 'Open Generator Wizard',
    windows: 'Ctrl+Shift+E G',
    mac: 'Cmd+Shift+E G',
    when: 'enzyme:isEnzymeProject',
    category: 'Panels',
    description: 'Open the visual code generator wizard'
  },
  {
    command: 'enzyme.panel.showSetupWizard',
    name: 'Open Setup Wizard',
    windows: 'Ctrl+Shift+E W',
    mac: 'Cmd+Shift+E W',
    category: 'Panels',
    description: 'Open the project setup and configuration wizard'
  },

  // Refactoring Commands
  {
    command: 'enzyme.refactor.convertToEnzyme',
    name: 'Convert to Enzyme Pattern',
    windows: 'Ctrl+Alt+E Ctrl+C',
    mac: 'Cmd+Alt+E Cmd+C',
    when: 'editorHasSelection',
    category: 'Refactoring',
    description: 'Convert selected code to Enzyme framework patterns'
  },
  {
    command: 'enzyme.extractComponent',
    name: 'Extract to Component',
    windows: 'Ctrl+Alt+E Ctrl+X',
    mac: 'Cmd+Alt+E Cmd+X',
    when: 'editorHasSelection && enzyme:isEnzymeProject',
    category: 'Refactoring',
    description: 'Extract selected JSX to a new component'
  },

  // Navigation Commands
  {
    command: 'enzyme.explorer.refresh',
    name: 'Refresh Explorer',
    windows: 'Ctrl+Alt+E Ctrl+R',
    mac: 'Cmd+Alt+E Cmd+R',
    when: 'enzyme:isEnzymeProject',
    category: 'Navigation',
    description: 'Refresh the Enzyme project explorer'
  },

  // Utility Commands
  {
    command: 'enzyme.docs.open',
    name: 'Open Documentation',
    windows: 'Ctrl+Alt+E ?',
    mac: 'Cmd+Alt+E ?',
    category: 'Utility',
    description: 'Open Enzyme framework documentation'
  },
  {
    command: 'enzyme.debug.showLogs',
    name: 'Show Extension Logs',
    windows: 'Ctrl+Alt+E L',
    mac: 'Cmd+Alt+E L',
    category: 'Utility',
    description: 'Show Enzyme extension output logs'
  }
];

/**
 * Get keyboard shortcut for current platform
 *
 * @param command - Command identifier
 * @returns Platform-appropriate keyboard shortcut or undefined
 */
export function getShortcutForCommand(command: string): string | undefined {
  const shortcut = KEYBOARD_SHORTCUTS.find(s => s.command === command);
  if (!shortcut) {
    return undefined;
  }

  const isMac = process.platform === 'darwin';
  return isMac ? shortcut.mac : shortcut.windows;
}

/**
 * Get all shortcuts for a category
 *
 * @param category - Shortcut category
 * @returns All shortcuts in the category
 */
export function getShortcutsByCategory(
  category: KeyboardShortcut['category']
): KeyboardShortcut[] {
  return KEYBOARD_SHORTCUTS.filter(s => s.category === category);
}

/**
 * Format shortcut for display in UI
 *
 * Converts keyboard shortcut notation to user-friendly display format.
 *
 * @param shortcut - Raw shortcut string (e.g., "Ctrl+Alt+E C")
 * @returns Formatted shortcut for display (e.g., "Ctrl+Alt+E, C")
 *
 * @example
 * ```typescript
 * formatShortcutForDisplay("Ctrl+Alt+E C")
 * // Returns: "Ctrl+Alt+E, C" (easier to read)
 * ```
 */
export function formatShortcutForDisplay(shortcut: string): string {
  // Replace space with comma for better readability
  return shortcut.replace(/\s+/g, ', ');
}

/**
 * Generate keyboard shortcuts help content
 *
 * Creates markdown-formatted help text showing all keyboard shortcuts
 * organized by category.
 *
 * @returns Markdown string with shortcuts reference
 */
export function generateShortcutsHelp(): string {
  const isMac = process.platform === 'darwin';
  const categories = [...new Set(KEYBOARD_SHORTCUTS.map(s => s.category))];

  let markdown = '# Enzyme Keyboard Shortcuts\n\n';

  categories.forEach(category => {
    markdown += `## ${category}\n\n`;

    const shortcuts = getShortcutsByCategory(category);
    shortcuts.forEach(shortcut => {
      const key = isMac ? shortcut.mac : shortcut.windows;
      markdown += `- **${formatShortcutForDisplay(key)}** - ${shortcut.name}\n`;
      markdown += `  ${shortcut.description}\n\n`;
    });
  });

  markdown += '\n---\n\n';
  markdown += '*Tip: Press `?` while holding Ctrl+Alt+E (Cmd+Alt+E on Mac) to view this help anytime.*\n';

  return markdown;
}

/**
 * Show keyboard shortcuts quick reference
 *
 * Displays a quickpick with all keyboard shortcuts for easy reference.
 * Users can select a shortcut to execute the corresponding command.
 */
export async function showShortcutsQuickPick(): Promise<void> {
  const isMac = process.platform === 'darwin';

  // Build quick pick items
  const items: vscode.QuickPickItem[] = KEYBOARD_SHORTCUTS.map(shortcut => ({
    label: shortcut.name,
    description: formatShortcutForDisplay(isMac ? shortcut.mac : shortcut.windows),
    detail: shortcut.description,
    // Store command in buttons (hack to pass data)
    buttons: [{ iconPath: new vscode.ThemeIcon('run'), tooltip: 'Execute' }] as any
  }));

  // Group by category
  const categorizedItems: vscode.QuickPickItem[] = [];
  const categories = [...new Set(KEYBOARD_SHORTCUTS.map(s => s.category))];

  categories.forEach(category => {
    // Add category separator
    categorizedItems.push({
      label: category,
      kind: vscode.QuickPickItemKind.Separator
    });

    // Add category items
    const categoryShortcuts = KEYBOARD_SHORTCUTS.filter(s => s.category === category);
    categoryShortcuts.forEach(shortcut => {
      categorizedItems.push({
        label: `$(${getCategoryIcon(shortcut.category)}) ${shortcut.name}`,
        description: formatShortcutForDisplay(isMac ? shortcut.mac : shortcut.windows),
        detail: shortcut.description,
        alwaysShow: true,
        // Store command for execution
        picked: false,
        _command: shortcut.command // Private property to store command
      } as any);
    });
  });

  const selected = await vscode.window.showQuickPick(categorizedItems, {
    placeHolder: 'Search keyboard shortcuts...',
    matchOnDescription: true,
    matchOnDetail: true
  });

  if (selected && (selected as any)._command) {
    await vscode.commands.executeCommand((selected as any)._command);
  }
}

/**
 * Get icon for shortcut category
 */
function getCategoryIcon(category: KeyboardShortcut['category']): string {
  const icons: Record<KeyboardShortcut['category'], string> = {
    'Generation': 'wand',
    'Analysis': 'graph',
    'Refactoring': 'symbol-method',
    'Navigation': 'compass',
    'Panels': 'layout',
    'Utility': 'tools'
  };
  return icons[category] || 'symbol-misc';
}

/**
 * Register keyboard shortcuts command
 *
 * Registers the command to show keyboard shortcuts reference.
 * Should be called during extension activation.
 *
 * @param context - Extension context
 * @returns Disposable for cleanup
 */
export function registerKeyboardShortcutsCommand(
  context: vscode.ExtensionContext
): vscode.Disposable {
  return vscode.commands.registerCommand('enzyme.showKeyboardShortcuts', async () => {
    await showShortcutsQuickPick();
  });
}
