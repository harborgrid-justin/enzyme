/**
 * @file Custom TreeItem Classes
 * @description Specialized TreeItem classes for different Enzyme entities
 */

import * as vscode from 'vscode';
import { getIconForType } from './icons';

/**
 * Base interface for all Enzyme tree items
 */
export interface EnzymeTreeItemData {
  filePath?: string;
  line?: number;
  description?: string;
}

/**
 * Feature tree item
 */
export class EnzymeFeatureItem extends vscode.TreeItem {
  constructor(
    public readonly featureName: string,
    public readonly filePath: string,
    public readonly metadata?: {
      description?: string;
      version?: string;
      enabled?: boolean;
      routes?: number;
      components?: number;
      stores?: number;
    },
    public override readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed
  ) {
    super(featureName, collapsibleState);

    this.tooltip = this.buildTooltip();
    this.description = metadata?.description || '';
    this.iconPath = getIconForType(metadata?.enabled ? 'feature-enabled' : 'feature-disabled');
    this.contextValue = 'enzyme.feature';

    // Add command to open feature file
    this.command = {
      command: 'enzyme.explorer.openFile',
      title: 'Open Feature',
      arguments: [vscode.Uri.file(filePath)]
    };
  }

  private buildTooltip(): string {
    const parts = [`Feature: ${this.featureName}`];

    if (this.metadata?.description) {
      parts.push(`Description: ${this.metadata.description}`);
    }
    if (this.metadata?.version) {
      parts.push(`Version: ${this.metadata.version}`);
    }
    if (this.metadata?.enabled !== undefined) {
      parts.push(`Status: ${this.metadata.enabled ? 'Enabled' : 'Disabled'}`);
    }
    parts.push(`\nPath: ${this.filePath}`);

    return parts.join('\n');
  }
}

/**
 * Route tree item
 */
export class EnzymeRouteItem extends vscode.TreeItem {
  constructor(
    public readonly routePath: string,
    public readonly filePath: string,
    public readonly metadata?: {
      isProtected?: boolean;
      hasLoader?: boolean;
      hasAction?: boolean;
      hasGuard?: boolean;
      isLazy?: boolean;
      hasConflict?: boolean;
      feature?: string;
      params?: string[];
    },
    public override readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
  ) {
    super(routePath, collapsibleState);

    this.tooltip = this.buildTooltip();
    this.description = this.buildDescription();
    this.iconPath = this.getIcon();
    this.contextValue = 'enzyme.route';

    // Highlight conflicts in red
    if (metadata?.hasConflict) {
      this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('errorForeground'));
    }

    this.command = {
      command: 'enzyme.explorer.openFile',
      title: 'Open Route',
      arguments: [vscode.Uri.file(filePath)]
    };
  }

  private getIcon(): vscode.ThemeIcon {
    if (this.metadata?.hasConflict) {
      return new vscode.ThemeIcon('warning', new vscode.ThemeColor('errorForeground'));
    }
    if (this.metadata?.isProtected) {
      return new vscode.ThemeIcon('lock');
    }
    if (this.metadata?.isLazy) {
      return new vscode.ThemeIcon('symbol-event');
    }
    return new vscode.ThemeIcon('symbol-file');
  }

  private buildDescription(): string {
    const badges: string[] = [];

    if (this.metadata?.isProtected) badges.push('[Protected]');
    if (this.metadata?.hasLoader) badges.push('[Loader]');
    if (this.metadata?.hasAction) badges.push('[Action]');
    if (this.metadata?.isLazy) badges.push('[Lazy]');
    if (this.metadata?.feature) badges.push(`[${this.metadata.feature}]`);

    return badges.join(' ');
  }

  private buildTooltip(): string {
    const parts = [`Route: ${this.routePath}`];

    if (this.metadata?.params?.length) {
      parts.push(`Parameters: ${this.metadata.params.join(', ')}`);
    }
    if (this.metadata?.isProtected) {
      parts.push('Protected: Yes');
    }
    if (this.metadata?.hasGuard) {
      parts.push('Guard: Active');
    }
    if (this.metadata?.hasLoader) {
      parts.push('Loader: Yes');
    }
    if (this.metadata?.hasAction) {
      parts.push('Action: Yes');
    }
    if (this.metadata?.isLazy) {
      parts.push('Lazy Loaded: Yes');
    }
    if (this.metadata?.feature) {
      parts.push(`Feature: ${this.metadata.feature}`);
    }
    parts.push(`\nPath: ${this.filePath}`);

    return parts.join('\n');
  }
}

/**
 * Component tree item
 */
export class EnzymeComponentItem extends vscode.TreeItem {
  constructor(
    public readonly componentName: string,
    public readonly filePath: string,
    public readonly metadata?: {
      category?: string;
      isUIComponent?: boolean;
      isFeatureComponent?: boolean;
      usageCount?: number;
      hasProps?: boolean;
      hasStory?: boolean;
      hasTests?: boolean;
    },
    public override readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
  ) {
    super(componentName, collapsibleState);

    this.tooltip = this.buildTooltip();
    this.description = this.buildDescription();
    this.iconPath = getIconForType('component');
    this.contextValue = 'enzyme.component';

    this.command = {
      command: 'enzyme.explorer.openFile',
      title: 'Open Component',
      arguments: [vscode.Uri.file(filePath)]
    };
  }

  private buildDescription(): string {
    const parts: string[] = [];

    if (this.metadata?.category) {
      parts.push(`[${this.metadata.category}]`);
    }
    if (this.metadata?.usageCount !== undefined && this.metadata.usageCount > 0) {
      parts.push(`${this.metadata.usageCount} uses`);
    }

    return parts.join(' ');
  }

  private buildTooltip(): string {
    const parts = [`Component: ${this.componentName}`];

    if (this.metadata?.category) {
      parts.push(`Category: ${this.metadata.category}`);
    }
    if (this.metadata?.isUIComponent) {
      parts.push('Type: UI Component');
    } else if (this.metadata?.isFeatureComponent) {
      parts.push('Type: Feature Component');
    }
    if (this.metadata?.usageCount !== undefined) {
      parts.push(`Usage Count: ${this.metadata.usageCount}`);
    }
    if (this.metadata?.hasProps) {
      parts.push('Has Props Interface: Yes');
    }
    if (this.metadata?.hasStory) {
      parts.push('Storybook Story: Yes');
    }
    if (this.metadata?.hasTests) {
      parts.push('Tests: Yes');
    }
    parts.push(`\nPath: ${this.filePath}`);

    return parts.join('\n');
  }
}

/**
 * State store tree item
 */
export class EnzymeStoreItem extends vscode.TreeItem {
  constructor(
    public readonly storeName: string,
    public readonly filePath: string,
    public readonly metadata?: {
      slices?: string[];
      isPersisted?: boolean;
      hasDevTools?: boolean;
      hasMiddleware?: boolean;
      stateShape?: Record<string, string>;
    },
    public override readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
  ) {
    super(storeName, collapsibleState);

    this.tooltip = this.buildTooltip();
    this.description = this.buildDescription();
    this.iconPath = getIconForType('store');
    this.contextValue = 'enzyme.store';

    this.command = {
      command: 'enzyme.explorer.openFile',
      title: 'Open Store',
      arguments: [vscode.Uri.file(filePath)]
    };
  }

  private buildDescription(): string {
    const badges: string[] = [];

    if (this.metadata?.isPersisted) badges.push('[Persisted]');
    if (this.metadata?.hasDevTools) badges.push('[DevTools]');
    if (this.metadata?.slices?.length) badges.push(`${this.metadata.slices.length} slices`);

    return badges.join(' ');
  }

  private buildTooltip(): string {
    const parts = [`Store: ${this.storeName}`];

    if (this.metadata?.slices?.length) {
      parts.push(`Slices: ${this.metadata.slices.join(', ')}`);
    }
    if (this.metadata?.isPersisted) {
      parts.push('Persisted: Yes');
    }
    if (this.metadata?.hasDevTools) {
      parts.push('DevTools: Enabled');
    }
    if (this.metadata?.hasMiddleware) {
      parts.push('Middleware: Yes');
    }
    if (this.metadata?.stateShape) {
      parts.push('\nState Shape:');
      Object.entries(this.metadata.stateShape).forEach(([key, type]) => {
        parts.push(`  ${key}: ${type}`);
      });
    }
    parts.push(`\nPath: ${this.filePath}`);

    return parts.join('\n');
  }
}

/**
 * Hook tree item
 */
export class EnzymeHookItem extends vscode.TreeItem {
  constructor(
    public readonly hookName: string,
    public readonly filePath: string,
    public readonly metadata?: {
      category?: string;
      parameters?: string[];
      returnType?: string;
      dependencies?: string[];
      isAsync?: boolean;
    },
    public override readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
  ) {
    super(hookName, collapsibleState);

    this.tooltip = this.buildTooltip();
    this.description = this.metadata?.category ? `[${this.metadata.category}]` : '';
    this.iconPath = getIconForType('hook');
    this.contextValue = 'enzyme.hook';

    this.command = {
      command: 'enzyme.explorer.openFile',
      title: 'Open Hook',
      arguments: [vscode.Uri.file(filePath)]
    };
  }

  private buildTooltip(): string {
    const parts = [`Hook: ${this.hookName}`];

    if (this.metadata?.category) {
      parts.push(`Category: ${this.metadata.category}`);
    }
    if (this.metadata?.parameters?.length) {
      parts.push(`Parameters: ${this.metadata.parameters.join(', ')}`);
    }
    if (this.metadata?.returnType) {
      parts.push(`Returns: ${this.metadata.returnType}`);
    }
    if (this.metadata?.dependencies?.length) {
      parts.push(`Dependencies: ${this.metadata.dependencies.join(', ')}`);
    }
    if (this.metadata?.isAsync) {
      parts.push('Async: Yes');
    }
    parts.push(`\nPath: ${this.filePath}`);

    return parts.join('\n');
  }
}

/**
 * API endpoint tree item
 */
export class EnzymeAPIItem extends vscode.TreeItem {
  constructor(
    public readonly endpointName: string,
    public readonly filePath: string,
    public readonly metadata?: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      path?: string;
      resource?: string;
      requestType?: string;
      responseType?: string;
      isMocked?: boolean;
      hasAuth?: boolean;
    },
    public override readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
  ) {
    super(endpointName, collapsibleState);

    this.tooltip = this.buildTooltip();
    this.description = this.buildDescription();
    this.iconPath = this.getIcon();
    this.contextValue = 'enzyme.api';

    this.command = {
      command: 'enzyme.explorer.openFile',
      title: 'Open API',
      arguments: [vscode.Uri.file(filePath)]
    };
  }

  private getIcon(): vscode.ThemeIcon {
    const method = this.metadata?.method;
    if (!method) return new vscode.ThemeIcon('globe');

    const colorMap: Record<string, string> = {
      GET: 'terminal.ansiGreen',
      POST: 'terminal.ansiBlue',
      PUT: 'terminal.ansiYellow',
      PATCH: 'terminal.ansiMagenta',
      DELETE: 'terminal.ansiRed',
    };

    return new vscode.ThemeIcon('globe', new vscode.ThemeColor(colorMap[method] || 'foreground'));
  }

  private buildDescription(): string {
    const parts: string[] = [];

    if (this.metadata?.method) {
      parts.push(`[${this.metadata.method}]`);
    }
    if (this.metadata?.isMocked) {
      parts.push('[Mock]');
    }
    if (this.metadata?.hasAuth) {
      parts.push('[Auth]');
    }

    return parts.join(' ');
  }

  private buildTooltip(): string {
    const parts = [`Endpoint: ${this.endpointName}`];

    if (this.metadata?.method && this.metadata?.path) {
      parts.push(`${this.metadata.method} ${this.metadata.path}`);
    }
    if (this.metadata?.resource) {
      parts.push(`Resource: ${this.metadata.resource}`);
    }
    if (this.metadata?.requestType) {
      parts.push(`Request: ${this.metadata.requestType}`);
    }
    if (this.metadata?.responseType) {
      parts.push(`Response: ${this.metadata.responseType}`);
    }
    if (this.metadata?.isMocked) {
      parts.push('Mocked: Yes');
    }
    if (this.metadata?.hasAuth) {
      parts.push('Authentication: Required');
    }
    parts.push(`\nPath: ${this.filePath}`);

    return parts.join('\n');
  }
}

/**
 * Category/Group tree item for organizing other items
 */
export class EnzymeCategoryItem extends vscode.TreeItem {
  constructor(
    public readonly categoryName: string,
    public readonly itemCount: number = 0,
    public override readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Expanded
  ) {
    super(categoryName, collapsibleState);

    this.description = `${itemCount} item${itemCount !== 1 ? 's' : ''}`;
    this.iconPath = new vscode.ThemeIcon('folder');
    this.contextValue = 'enzyme.category';
  }
}
