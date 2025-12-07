/**
 * @file Icon Management
 * @description Centralized icon management for TreeView items
 */

import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Icon type for Enzyme entities
 */
export type EnzymeIconType =
  | 'feature-enabled'
  | 'feature-disabled'
  | 'route'
  | 'route-protected'
  | 'route-lazy'
  | 'route-conflict'
  | 'component'
  | 'component-ui'
  | 'component-feature'
  | 'store'
  | 'store-persisted'
  | 'hook'
  | 'hook-async'
  | 'api'
  | 'api-get'
  | 'api-post'
  | 'api-put'
  | 'api-patch'
  | 'api-delete'
  | 'folder'
  | 'category';

/**
 * Icon mapping using VS Code's built-in ThemeIcons
 */
const THEME_ICON_MAP: Record<EnzymeIconType, string> = {
  'feature-enabled': 'package',
  'feature-disabled': 'package',
  'route': 'symbol-file',
  'route-protected': 'lock',
  'route-lazy': 'symbol-event',
  'route-conflict': 'warning',
  'component': 'symbol-class',
  'component-ui': 'symbol-interface',
  'component-feature': 'symbol-module',
  'store': 'database',
  'store-persisted': 'database',
  'hook': 'symbol-method',
  'hook-async': 'sync',
  'api': 'globe',
  'api-get': 'cloud-download',
  'api-post': 'cloud-upload',
  'api-put': 'cloud-upload',
  'api-patch': 'edit',
  'api-delete': 'trash',
  'folder': 'folder',
  'category': 'folder-opened',
};

/**
 * Icon color mapping
 */
const ICON_COLOR_MAP: Partial<Record<EnzymeIconType, string>> = {
  'feature-enabled': 'terminal.ansiGreen',
  'feature-disabled': 'terminal.ansiRed',
  'route-conflict': 'errorForeground',
  'route-protected': 'terminal.ansiYellow',
  'api-get': 'terminal.ansiGreen',
  'api-post': 'terminal.ansiBlue',
  'api-put': 'terminal.ansiYellow',
  'api-patch': 'terminal.ansiMagenta',
  'api-delete': 'terminal.ansiRed',
};

/**
 * Get icon for a specific type
 */
export function getIconForType(type: EnzymeIconType): vscode.ThemeIcon {
  const iconId = THEME_ICON_MAP[type];
  const color = ICON_COLOR_MAP[type];

  if (color) {
    return new vscode.ThemeIcon(iconId, new vscode.ThemeColor(color));
  }

  return new vscode.ThemeIcon(iconId);
}

/**
 * Get icon for HTTP method
 */
export function getIconForHttpMethod(method: string): vscode.ThemeIcon {
  const normalizedMethod = method.toUpperCase();
  const type = `api-${normalizedMethod.toLowerCase()}` as EnzymeIconType;

  if (type in THEME_ICON_MAP) {
    return getIconForType(type);
  }

  return getIconForType('api');
}

/**
 * Get icon for file type based on extension
 */
export function getIconForFileType(filePath: string): vscode.ThemeIcon {
  const ext = path.extname(filePath).toLowerCase();

  const fileTypeMap: Record<string, string> = {
    '.tsx': 'symbol-class',
    '.ts': 'symbol-file',
    '.jsx': 'symbol-class',
    '.js': 'symbol-file',
    '.json': 'json',
    '.css': 'symbol-color',
    '.scss': 'symbol-color',
    '.md': 'markdown',
  };

  const iconId = fileTypeMap[ext] || 'file';
  return new vscode.ThemeIcon(iconId);
}

/**
 * Get custom icon path (for extension-specific icons)
 */
export function getCustomIconPath(
  context: vscode.ExtensionContext,
  iconName: string,
  theme: 'light' | 'dark' = 'dark'
): vscode.Uri {
  return vscode.Uri.file(
    path.join(context.extensionPath, 'resources', 'icons', theme, `${iconName}.svg`)
  );
}

/**
 * Get icon for feature status
 */
export function getIconForFeatureStatus(enabled: boolean): vscode.ThemeIcon {
  return getIconForType(enabled ? 'feature-enabled' : 'feature-disabled');
}

/**
 * Get icon for route type
 */
export function getIconForRoute(options: {
  isProtected?: boolean;
  isLazy?: boolean;
  hasConflict?: boolean;
}): vscode.ThemeIcon {
  if (options.hasConflict) {
    return getIconForType('route-conflict');
  }
  if (options.isProtected) {
    return getIconForType('route-protected');
  }
  if (options.isLazy) {
    return getIconForType('route-lazy');
  }
  return getIconForType('route');
}

/**
 * Get icon for component type
 */
export function getIconForComponent(options: {
  isUI?: boolean;
  isFeature?: boolean;
}): vscode.ThemeIcon {
  if (options.isUI) {
    return getIconForType('component-ui');
  }
  if (options.isFeature) {
    return getIconForType('component-feature');
  }
  return getIconForType('component');
}

/**
 * Get icon for store
 */
export function getIconForStore(isPersisted?: boolean): vscode.ThemeIcon {
  return getIconForType(isPersisted ? 'store-persisted' : 'store');
}

/**
 * Get icon for hook
 */
export function getIconForHook(isAsync?: boolean): vscode.ThemeIcon {
  return getIconForType(isAsync ? 'hook-async' : 'hook');
}

/**
 * Create a badge icon with text
 */
export function createBadgeIcon(text: string, color?: string): vscode.ThemeIcon {
  return new vscode.ThemeIcon(
    'circle-filled',
    color ? new vscode.ThemeColor(color) : undefined
  );
}

/**
 * Get status icon
 */
export function getStatusIcon(status: 'success' | 'warning' | 'error' | 'info'): vscode.ThemeIcon {
  const iconMap = {
    success: new vscode.ThemeIcon('check', new vscode.ThemeColor('terminal.ansiGreen')),
    warning: new vscode.ThemeIcon('warning', new vscode.ThemeColor('terminal.ansiYellow')),
    error: new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground')),
    info: new vscode.ThemeIcon('info', new vscode.ThemeColor('terminal.ansiBlue')),
  };

  return iconMap[status];
}
