/**
 * @file Enhanced Tooltip Provider
 * @description Provides contextual tooltips and help throughout the extension UI
 *
 * This module enhances user experience by providing:
 * - Context-sensitive tooltips for commands
 * - Helpful hints for common operations
 * - Quick tips based on user behavior
 * - Links to relevant documentation
 */

import * as vscode from 'vscode';
import { getShortcutForCommand, formatShortcutForDisplay } from './keyboard-shortcuts';
import { URLS } from './constants';

/**
 * Tooltip context - additional information for generating tooltips
 */
export interface TooltipContext {
  /** Show keyboard shortcut if available */
  showShortcut?: boolean;

  /** Show documentation link */
  showDocLink?: boolean;

  /** Additional contextual information */
  context?: string;

  /** Severity level for styling */
  severity?: 'info' | 'warning' | 'error' | 'success';
}

/**
 * Enhanced tooltip provider for Enzyme extension
 *
 * Generates rich, context-aware tooltips that help users understand
 * features and discover keyboard shortcuts.
 *
 * @example
 * ```typescript
 * const tooltipProvider = new TooltipProvider();
 *
 * // Get tooltip for command
 * const tooltip = tooltipProvider.getTooltipForCommand(
 *   'enzyme.generate.component',
 *   { showShortcut: true }
 * );
 *
 * statusBarItem.tooltip = tooltip;
 * ```
 */
export class TooltipProvider {
  private commandDescriptions: Map<string, string> = new Map([
    // Generation Commands
    ['enzyme.generate.component', 'Generate a new React component with TypeScript, tests, and styles'],
    ['enzyme.generate.feature', 'Scaffold a complete feature module with routes, components, and state'],
    ['enzyme.generate.route', 'Create a new route with page component and route configuration'],
    ['enzyme.generate.store', 'Generate a Zustand store with TypeScript types and actions'],
    ['enzyme.generate.hook', 'Create a custom React hook following Enzyme patterns'],
    ['enzyme.generate.apiClient', 'Generate a type-safe API client with request/response types'],
    ['enzyme.generate.test', 'Generate test file for the current component or module'],

    // Analysis Commands
    ['enzyme.analyze.performance', 'Analyze component performance and identify optimization opportunities'],
    ['enzyme.analyze.security', 'Scan for security vulnerabilities and best practice violations'],
    ['enzyme.analyze.dependencies', 'Analyze project dependencies for outdated or unused packages'],

    // Panel Commands
    ['enzyme.panel.showStateInspector', 'Open real-time Zustand state inspector with time-travel debugging'],
    ['enzyme.panel.showPerformance', 'Open performance monitoring dashboard with Core Web Vitals'],
    ['enzyme.panel.showRouteVisualizer', 'Visualize route tree and navigation flows interactively'],
    ['enzyme.panel.showAPIExplorer', 'Test and debug API endpoints directly from VS Code'],
    ['enzyme.panel.showGeneratorWizard', 'Launch the visual code generator with step-by-step guidance'],
    ['enzyme.panel.showSetupWizard', 'Configure your Enzyme project with the interactive setup wizard'],
    ['enzyme.panel.showWelcome', 'View the welcome page with quick start guide and tutorials'],

    // Refactoring Commands
    ['enzyme.refactor.convertToEnzyme', 'Convert selected code to use Enzyme framework patterns'],
    ['enzyme.refactor.optimizeImports', 'Optimize Enzyme imports and remove unused dependencies'],
    ['enzyme.extractComponent', 'Extract selected JSX to a new component file'],
    ['enzyme.extractHook', 'Extract logic to a custom hook'],
    ['enzyme.extractFeature', 'Extract selection to a feature module'],

    // Validation Commands
    ['enzyme.validate.config', 'Validate Enzyme configuration file for errors'],
    ['enzyme.validate.routes', 'Validate route configuration and check for conflicts'],
    ['enzyme.validate.features', 'Validate feature modules and check for missing dependencies'],

    // Utility Commands
    ['enzyme.docs.open', 'Open Enzyme framework documentation in browser'],
    ['enzyme.debug.showLogs', 'Show Enzyme extension output logs for debugging'],
    ['enzyme.workspace.detect', 'Detect if current workspace is an Enzyme project'],
    ['enzyme.explorer.refresh', 'Refresh the Enzyme project explorer view']
  ]);

  /**
   * Get tooltip for a command
   *
   * Generates a rich tooltip with description, keyboard shortcut,
   * and optional documentation link.
   *
   * @param command - Command identifier
   * @param context - Additional tooltip context
   * @returns Markdown string for tooltip
   */
  public getTooltipForCommand(
    command: string,
    context: TooltipContext = {}
  ): vscode.MarkdownString {
    const {
      showShortcut = true,
      showDocLink = false,
      context: additionalContext,
      severity = 'info'
    } = context;

    const tooltip = new vscode.MarkdownString();
    tooltip.isTrusted = true;
    tooltip.supportHtml = true;

    // Add severity icon
    const icons = {
      info: '$(info)',
      warning: '$(warning)',
      error: '$(error)',
      success: '$(pass)'
    };
    tooltip.appendMarkdown(`${icons[severity]} `);

    // Add description
    const description = this.commandDescriptions.get(command) || 'Execute command';
    tooltip.appendMarkdown(`**${description}**\n\n`);

    // Add keyboard shortcut if available
    if (showShortcut) {
      const shortcut = getShortcutForCommand(command);
      if (shortcut) {
        tooltip.appendMarkdown(`⌨️ *${formatShortcutForDisplay(shortcut)}*\n\n`);
      }
    }

    // Add additional context
    if (additionalContext) {
      tooltip.appendMarkdown(`\n${additionalContext}\n\n`);
    }

    // Add documentation link
    if (showDocLink) {
      const commandSlug = command.replace('enzyme.', '').replace(/\./g, '/');
      tooltip.appendMarkdown(
        `\n[📚 View Documentation](${URLS.DOCUMENTATION}/commands/${commandSlug})`
      );
    }

    return tooltip;
  }

  /**
   * Get tooltip for status bar item
   *
   * Creates a tooltip for status bar items with contextual information.
   *
   * @param text - Main status text
   * @param details - Additional details
   * @param command - Associated command (optional)
   * @returns Markdown string for tooltip
   */
  public getStatusBarTooltip(
    text: string,
    details?: string,
    command?: string
  ): vscode.MarkdownString {
    const tooltip = new vscode.MarkdownString();
    tooltip.isTrusted = true;

    tooltip.appendMarkdown(`**${text}**\n\n`);

    if (details) {
      tooltip.appendMarkdown(`${details}\n\n`);
    }

    if (command) {
      const shortcut = getShortcutForCommand(command);
      if (shortcut) {
        tooltip.appendMarkdown(`\n*Click or press ${formatShortcutForDisplay(shortcut)}*\n`);
      } else {
        tooltip.appendMarkdown(`\n*Click to execute*\n`);
      }
    }

    return tooltip;
  }

  /**
   * Get tooltip for tree view item
   *
   * Creates tooltips for items in the Enzyme explorer views.
   *
   * @param itemType - Type of item (feature, component, route, etc.)
   * @param name - Item name
   * @param filePath - File path
   * @param metadata - Additional metadata
   * @returns Markdown string for tooltip
   */
  public getTreeViewItemTooltip(
    itemType: 'feature' | 'component' | 'route' | 'store' | 'api',
    name: string,
    filePath: string,
    metadata?: Record<string, string | number | boolean>
  ): vscode.MarkdownString {
    const tooltip = new vscode.MarkdownString();
    tooltip.isTrusted = true;

    const typeLabels = {
      feature: '🎯 Feature Module',
      component: '🧩 Component',
      route: '🛣️ Route',
      store: '📦 State Store',
      api: '🌐 API Client'
    };

    tooltip.appendMarkdown(`**${typeLabels[itemType]}: ${name}**\n\n`);
    tooltip.appendMarkdown(`\`${filePath}\`\n\n`);

    if (metadata && Object.keys(metadata).length > 0) {
      tooltip.appendMarkdown('---\n\n');
      Object.entries(metadata).forEach(([key, value]) => {
        tooltip.appendMarkdown(`**${key}**: ${value}\n`);
      });
    }

    tooltip.appendMarkdown('\n---\n\n*Click to open file*');

    return tooltip;
  }

  /**
   * Get helpful hint for common scenarios
   *
   * Provides contextual hints based on user's current activity.
   *
   * @param scenario - Current scenario
   * @returns Helpful hint text
   */
  public getHelpfulHint(scenario: string): string {
    const hints: Record<string, string> = {
      'first-component': '💡 Tip: Use Ctrl+Alt+E C to quickly generate components',
      'first-feature': '💡 Tip: Features are self-contained modules with routes, components, and state',
      'empty-workspace': '💡 Tip: Initialize an Enzyme project with Ctrl+Shift+P > Enzyme: Initialize Project',
      'no-routes': '💡 Tip: Generate your first route with Ctrl+Alt+E R',
      'performance-warning': '💡 Tip: Use the Performance Monitor (Ctrl+Shift+E P) to identify bottlenecks',
      'state-debugging': '💡 Tip: Use the State Inspector (Ctrl+Shift+E S) to debug Zustand state',
      'api-testing': '💡 Tip: Test API endpoints directly with the API Explorer (Ctrl+Shift+E A)',
      'route-conflicts': '💡 Tip: Use the Route Visualizer (Ctrl+Shift+E R) to identify conflicting routes'
    };

    return hints[scenario] || '💡 Tip: Press Ctrl+Alt+E ? to view all keyboard shortcuts';
  }

  /**
   * Create inline hint decoration
   *
   * Creates a subtle inline hint decoration for the editor.
   *
   * @param hint - Hint text
   * @param position - Position in editor
   * @returns Decoration options
   */
  public createInlineHint(
    hint: string,
    position: vscode.Position
  ): vscode.DecorationOptions {
    return {
      range: new vscode.Range(position, position),
      hoverMessage: new vscode.MarkdownString(`💡 ${hint}`),
      renderOptions: {
        after: {
          contentText: ` 💡`,
          color: new vscode.ThemeColor('editorCodeLens.foreground'),
          fontStyle: 'italic',
          margin: '0 0 0 1em'
        }
      }
    };
  }
}

/**
 * Singleton tooltip provider instance
 */
export const tooltipProvider = new TooltipProvider();
