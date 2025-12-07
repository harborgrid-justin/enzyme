# Enzyme VS Code Extension - UI Architecture Guide

## Overview

This guide documents the UI architecture of the Enzyme VS Code Extension, covering all visual components, design patterns, and best practices.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Design System](#design-system)
- [WebView Panels](#webview-panels)
- [TreeView Providers](#treeview-providers)
- [StatusBar Items](#statusbar-items)
- [Best Practices](#best-practices)
- [Accessibility](#accessibility)
- [Performance](#performance)

---

## Architecture Overview

The Enzyme VS Code Extension follows a modular, component-based UI architecture:

```
src/
├── ui/                          # UI-specific modules
│   └── status-bar-manager.ts   # StatusBar management
├── providers/
│   ├── webviews/               # WebView panels
│   │   ├── base-webview-panel.ts
│   │   ├── welcome-panel.ts
│   │   ├── setup-wizard-panel.ts
│   │   ├── state-inspector-panel.ts
│   │   ├── performance-panel.ts
│   │   ├── route-visualizer-panel.ts
│   │   ├── api-explorer-panel.ts
│   │   ├── feature-dashboard-panel.ts
│   │   └── generator-wizard-panel.ts
│   └── treeviews/              # TreeView providers
│       ├── base-tree-provider.ts
│       ├── features-tree-provider.ts
│       ├── routes-tree-provider.ts
│       ├── components-tree-provider.ts
│       ├── state-tree-provider.ts
│       └── api-tree-provider.ts
└── webview-ui/                 # WebView UI assets
    └── shared/
        ├── design-system.ts    # Design tokens
        ├── styles.css          # Shared styles
        └── vscode-api.ts       # VS Code API wrapper
```

### Key Principles

1. **Singleton Pattern**: WebView panels use singletons to prevent duplicate instances
2. **Base Classes**: All providers extend base classes for consistency
3. **Design System**: Centralized design tokens for theming
4. **CSP Compliance**: Strict Content Security Policy for security
5. **Theme Integration**: Full VS Code theming support
6. **Accessibility**: ARIA labels and semantic HTML

---

## Design System

Located at `src/webview-ui/shared/design-system.ts`

### Color System

The design system uses VS Code CSS variables with fallbacks:

```typescript
Colors.primary = 'var(--vscode-button-background, #0078d4)'
Colors.success = 'var(--vscode-terminal-ansiGreen, #4ec9b0)'
Colors.warning = 'var(--vscode-terminal-ansiYellow, #dcdcaa)'
Colors.error = 'var(--vscode-terminal-ansiRed, #f14c4c)'
```

**Brand Colors:**
- Primary: `#6366f1` (Enzyme purple)
- Light: `#818cf8`
- Dark: `#4f46e5`

### Icons

All icons use the [Codicon](https://microsoft.github.io/vscode-codicons/dist/codicon.html) library:

```typescript
Icons.enzyme = 'codicon-beaker'
Icons.feature = 'codicon-extensions'
Icons.route = 'codicon-type-hierarchy'
Icons.component = 'codicon-symbol-class'
Icons.store = 'codicon-database'
Icons.api = 'codicon-globe'
```

### Spacing System (8px base)

```typescript
Spacing.xxs = '2px'
Spacing.xs = '4px'
Spacing.sm = '8px'
Spacing.md = '12px'
Spacing.lg = '16px'
Spacing.xl = '24px'
Spacing.xxl = '32px'
Spacing.xxxl = '48px'
```

### Typography

```typescript
Typography.fontFamily = 'var(--vscode-font-family)'
Typography.fontFamilyMono = 'var(--vscode-editor-font-family)'

// Sizes
Typography.fontSizeXs = '10px'
Typography.fontSizeSm = '11px'
Typography.fontSizeMd = '13px'
Typography.fontSizeLg = '16px'
Typography.fontSizeXl = '20px'
Typography.fontSizeXxl = '24px'
Typography.fontSizeHero = '32px'
```

### Animations

```typescript
Animations.durationFast = '100ms'
Animations.durationNormal = '200ms'
Animations.durationSlow = '300ms'

// Easings
Animations.easeInOut = 'cubic-bezier(0.4, 0, 0.2, 1)'
Animations.spring = 'cubic-bezier(0.34, 1.56, 0.64, 1)'
```

---

## WebView Panels

### Base WebView Panel

All webview panels extend `BaseWebViewPanel`:

```typescript
export class MyPanel extends BaseWebViewPanel {
  constructor(context: vscode.ExtensionContext) {
    super(context, 'my.viewType', 'My Panel Title', {
      retainContextWhenHidden: true,
      enableFindWidget: false,
      enableCommandUris: true,
    });
  }

  protected getBodyContent(webview: vscode.Webview): string {
    return `<div>Panel content</div>`;
  }

  protected getScripts(webview: vscode.Webview, nonce: string): string {
    const scriptUri = this.getWebviewUri(webview, ['path', 'to', 'script.js']);
    return `<script nonce="${nonce}" src="${scriptUri}"></script>`;
  }

  protected async handleMessage(message: any): Promise<void> {
    // Handle messages from webview
  }
}
```

### Available Panels

#### 1. Welcome Panel (`welcome-panel.ts`)
- **Purpose**: First-time user onboarding and quick actions
- **Features**:
  - Quick start actions
  - Key features overview
  - Keyboard shortcuts
  - Configuration wizard
  - Resource links

#### 2. Setup Wizard Panel (`setup-wizard-panel.ts`)
- **Purpose**: Auto-install and auto-setup Enzyme projects
- **Features**:
  - Multi-step wizard (7 steps)
  - Environment detection
  - Dependency management
  - Configuration presets (Basic, Standard, Enterprise)
  - Installation progress tracking
  - Health verification
  - Animated UI with progress indicators

#### 3. State Inspector Panel (`state-inspector-panel.ts`)
- **Purpose**: Debug Zustand state stores
- **Features**:
  - Real-time state visualization
  - Time-travel debugging
  - State export/import
  - State filtering and search
  - History management (max 100 snapshots)

#### 4. Performance Panel (`performance-panel.ts`)
- **Purpose**: Monitor application performance
- **Features**:
  - Core Web Vitals (LCP, FID, CLS, FCP, TTFB, INP)
  - Component render metrics
  - Bundle size analysis
  - Network metrics
  - Memory usage tracking
  - Historical data visualization

#### 5. Route Visualizer Panel (`route-visualizer-panel.ts`)
- **Purpose**: Visualize application routing structure
- **Features**:
  - Interactive route tree
  - Route conflict detection
  - Guard visualization
  - Nested route support
  - Search and filter

#### 6. API Explorer Panel (`api-explorer-panel.ts`)
- **Purpose**: Test and debug API clients
- **Features**:
  - Request builder
  - Response visualization
  - Request history
  - Environment variables
  - Authentication testing

#### 7. Feature Dashboard Panel (`feature-dashboard-panel.ts`)
- **Purpose**: Manage feature flags and modules
- **Features**:
  - Feature flag management
  - Module statistics
  - Dependency visualization
  - Quick navigation to features

#### 8. Generator Wizard Panel (`generator-wizard-panel.ts`)
- **Purpose**: Generate code with templates
- **Features**:
  - Component generator
  - Feature generator
  - Hook generator
  - Store generator
  - API client generator
  - Customizable templates

### WebView Security (CSP)

All panels implement strict Content Security Policy:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none';
               style-src ${cspSource} 'nonce-${nonce}';
               script-src 'nonce-${nonce}';
               font-src ${cspSource};
               img-src ${cspSource} https: data:;
               connect-src https:;">
```

**Key Points:**
- No inline scripts (use nonces)
- No eval() or Function()
- Restrict resource loading to extension URIs
- Allow HTTPS for external resources

### Theming

All panels respect VS Code themes:

```typescript
protected getCurrentTheme(): string {
  const theme = vscode.window.activeColorTheme.kind;
  switch (theme) {
    case vscode.ColorThemeKind.Light:
      return 'light';
    case vscode.ColorThemeKind.HighContrastLight:
      return 'high-contrast-light';
    case vscode.ColorThemeKind.HighContrast:
      return 'high-contrast';
    case vscode.ColorThemeKind.Dark:
    default:
      return 'dark';
  }
}
```

Use in HTML:
```html
<body data-theme="${theme}">
```

Use in CSS:
```css
body {
  color: var(--vscode-foreground);
  background: var(--vscode-editor-background);
}

body[data-theme="light"] .my-element {
  /* Light theme specific styles */
}

body[data-theme="high-contrast"] .my-element {
  /* High contrast specific styles */
}
```

---

## TreeView Providers

### Base TreeView Provider

All tree providers extend `BaseTreeProvider`:

```typescript
export class MyTreeProvider extends BaseTreeProvider<MyTreeItem> {
  constructor(context: vscode.ExtensionContext) {
    super(context, {
      refreshDebounceMs: 300,
      enableCache: true,
      cacheTtlMs: 5000,
      autoRefresh: true,
    });
  }

  protected async getRootItems(): Promise<MyTreeItem[]> {
    return await this.getCachedOrFetch('root', async () => {
      // Fetch root items
      return [];
    });
  }

  protected async getChildItems(element: MyTreeItem): Promise<MyTreeItem[]> {
    // Fetch child items
    return [];
  }

  protected getWatchPatterns(): string[] {
    return ['**/*.tsx', '**/*.ts'];
  }
}
```

### Features

1. **Automatic Caching**: Results cached for 5 seconds (configurable)
2. **Debounced Refresh**: 300ms debounce on refresh operations
3. **File Watching**: Auto-refresh on file changes
4. **Error Handling**: Graceful error handling with user notification
5. **Parent Tracking**: Support for reveal operations

### Available TreeViews

1. **Features Tree** (`features-tree-provider.ts`)
   - Displays all feature modules
   - Shows feature dependencies
   - Quick navigation to feature files

2. **Routes Tree** (`routes-tree-provider.ts`)
   - Displays route hierarchy
   - Shows route guards and middleware
   - Highlights route conflicts

3. **Components Tree** (`components-tree-provider.ts`)
   - Lists all React components
   - Groups by feature/module
   - Shows component usage count

4. **State Stores Tree** (`state-tree-provider.ts`)
   - Lists all Zustand stores
   - Shows store dependencies
   - Quick navigation to store files

5. **API Clients Tree** (`api-tree-provider.ts`)
   - Lists all API clients
   - Shows endpoint definitions
   - Groups by service

6. **Performance Tree** (`register-treeviews.ts`)
   - Performance metrics overview
   - Quick access to performance panel

---

## StatusBar Items

### StatusBar Manager

The `StatusBarManager` class provides centralized management of all status bar items.

#### Usage

```typescript
import { getStatusBarManager, StatusBarItemId, StatusBarState } from './ui/status-bar-manager';

// Get the manager instance
const manager = getStatusBarManager(enzymeContext);

// Initialize default items
manager.initializeDefaultItems('2.0.0', true);

// Create a custom item
manager.createItem({
  id: StatusBarItemId.BUILD_STATUS,
  text: '$(tools) Building...',
  tooltip: 'Build in progress',
  command: 'enzyme.build.show',
  state: StatusBarState.LOADING,
});

// Update state
manager.updateState(StatusBarItemId.BUILD_STATUS, StatusBarState.SUCCESS);
manager.updateText(StatusBarItemId.BUILD_STATUS, '$(check) Build Complete');

// Show temporary message
manager.showTemporaryMessage(
  StatusBarItemId.ENZYME_STATUS,
  '$(check) Tests passed!',
  3000,
  StatusBarState.SUCCESS
);
```

#### Available States

- `IDLE`: Default state (circle outline icon)
- `LOADING`: Loading state (spinning icon)
- `SUCCESS`: Success state (check icon, no background)
- `WARNING`: Warning state (warning icon, yellow background)
- `ERROR`: Error state (error icon, red background)
- `INFO`: Info state (info icon)

#### Default Items

1. **Enzyme Status** (Right, Priority 100)
   - Shows Enzyme logo and status
   - Click to open welcome panel
   - Rich tooltip with quick actions

2. **CLI Version** (Right, Priority 90)
   - Shows installed CLI version
   - Hidden by default
   - Click to show version details

3. **Dev Server** (Right, Priority 80)
   - Shows dev server status
   - Click to start/stop server
   - Color changes based on state

---

## Best Practices

### 1. Component Organization

```typescript
// Good: Single responsibility, clear naming
export class StateInspectorPanel extends BaseWebViewPanel {
  // Panel-specific logic only
}

// Bad: Multiple responsibilities
export class Panel {
  // State + Performance + Routes logic
}
```

### 2. State Management

```typescript
// Good: Use singleton pattern for panels
export class MyPanel extends BaseWebViewPanel {
  private static instance: MyPanel | undefined;

  public static getInstance(context: vscode.ExtensionContext): MyPanel {
    if (!MyPanel.instance) {
      MyPanel.instance = new MyPanel(context);
    }
    return MyPanel.instance;
  }
}

// Good: Clean up on dispose
public override dispose(): void {
  super.dispose();
  MyPanel.instance = undefined;
}
```

### 3. Performance

```typescript
// Good: Use caching for expensive operations
protected async getRootItems(): Promise<Item[]> {
  return await this.getCachedOrFetch('root', async () => {
    return await this.expensiveOperation();
  });
}

// Good: Debounce frequent operations
refresh(debounce: boolean = true): void {
  if (debounce && this.options.refreshDebounceMs > 0) {
    // Debounce logic
  }
}

// Good: Lazy load panels
setImmediate(async () => {
  await initializePanel();
});
```

### 4. Error Handling

```typescript
// Good: Graceful error handling
protected async handleMessage(message: any): Promise<void> {
  try {
    switch (message.type) {
      case 'action':
        await this.performAction();
        break;
    }
  } catch (error) {
    logger.error('Message handling failed', error);
    vscode.window.showErrorMessage(`Failed: ${error.message}`);
  }
}

// Good: Validate inputs
if (!uri || !vscode.workspace.fs.isReadable(uri)) {
  throw new Error('Invalid or unreadable file');
}
```

### 5. Accessibility

```typescript
// Good: Semantic HTML
`<button aria-label="Refresh state data" title="Refresh">
  <span class="codicon codicon-refresh" aria-hidden="true"></span>
  Refresh
</button>`

// Good: ARIA labels
`<input type="text"
        id="stateFilter"
        aria-label="Search state keys"
        placeholder="Search...">`

// Good: Keyboard navigation
`<div role="list">
  <div role="listitem" tabindex="0">Item 1</div>
  <div role="listitem" tabindex="0">Item 2</div>
</div>`
```

### 6. Messaging

```typescript
// Good: Type-safe messages
interface PanelMessage {
  type: 'action1' | 'action2' | 'action3';
  payload?: unknown;
}

protected async handleMessage(message: PanelMessage): Promise<void> {
  switch (message.type) {
    case 'action1':
      // Handle action1
      break;
  }
}

// Good: Post messages to webview
this.postMessage({ type: 'update', data: newData });
```

### 7. JSDoc Documentation

```typescript
/**
 * Create a new status bar item
 *
 * @param config - Configuration for the status bar item
 * @returns The created status bar item
 *
 * @example
 * ```typescript
 * manager.createItem({
 *   id: StatusBarItemId.DEV_SERVER,
 *   text: '$(server) Dev Server',
 *   tooltip: 'Click to start/stop dev server',
 *   command: 'enzyme.devServer.toggle',
 *   state: StatusBarState.IDLE
 * });
 * ```
 */
public createItem(config: StatusBarItemConfiguration): vscode.StatusBarItem {
  // Implementation
}
```

---

## Accessibility

### ARIA Guidelines

1. **Use Semantic HTML**
   ```html
   <button>, <nav>, <main>, <article>, <section>
   ```

2. **Provide Labels**
   ```html
   <label for="input-id">Label Text</label>
   <input id="input-id" type="text">

   <!-- Or use aria-label -->
   <button aria-label="Descriptive label">
     <span class="icon" aria-hidden="true"></span>
   </button>
   ```

3. **Hide Decorative Elements**
   ```html
   <span class="codicon codicon-check" aria-hidden="true"></span>
   ```

4. **Provide Alternative Text**
   ```html
   <img src="logo.png" alt="Enzyme Framework Logo">
   ```

5. **Support Keyboard Navigation**
   ```typescript
   document.addEventListener('keydown', (e) => {
     if (e.key === 'Enter' || e.key === ' ') {
       // Activate button
     }
   });
   ```

### High Contrast Support

```css
/* Automatically use VS Code theme colors */
.my-element {
  color: var(--vscode-foreground);
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
}

/* High contrast specific */
body[data-theme="high-contrast"] .my-element {
  border-width: 2px;
  outline: 1px solid var(--vscode-contrastBorder);
}
```

---

## Performance

### Optimization Strategies

1. **Lazy Loading**
   ```typescript
   // Load panels only when needed
   setImmediate(async () => {
     await initializeHeavyPanel();
   });
   ```

2. **Caching**
   ```typescript
   // Cache expensive computations
   const cached = this.cache.get(key);
   if (cached && !this.isCacheExpired(cached)) {
     return cached.data;
   }
   ```

3. **Debouncing**
   ```typescript
   // Debounce frequent updates
   private updateDebounced = debounce(() => {
     this.actualUpdate();
   }, 300);
   ```

4. **Virtual Scrolling**
   ```typescript
   // For long lists, render only visible items
   // Use libraries like react-window or implement custom solution
   ```

5. **Minimize Re-renders**
   ```typescript
   // Only update when necessary
   if (newState === oldState) {
     return;
   }
   this.panel.webview.html = this.getHtmlContent();
   ```

### Performance Metrics

Target metrics:
- **Activation Time**: < 10ms
- **Panel Creation**: < 100ms
- **TreeView Refresh**: < 200ms
- **Webview Update**: < 50ms

Monitor using:
```typescript
const startTime = Date.now();
await operation();
const duration = Date.now() - startTime;
logger.debug(`Operation took ${duration}ms`);
```

---

## VS Code UX Guidelines Compliance

### Checklist

- [x] Use Codicons for all icons
- [x] Respect user's color theme
- [x] Support high contrast themes
- [x] Provide keyboard shortcuts
- [x] Include ARIA labels
- [x] Use semantic HTML
- [x] Follow naming conventions
- [x] Implement proper error handling
- [x] Show progress indicators
- [x] Provide tooltips
- [x] Use VS Code design tokens
- [x] Implement CSP
- [x] Support workspace trust
- [x] Respect telemetry settings
- [x] Clean up resources on dispose

---

## Resources

- [VS Code Extension Guidelines](https://code.visualstudio.com/api/ux-guidelines/overview)
- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [VS Code TreeView API](https://code.visualstudio.com/api/extension-guides/tree-view)
- [Codicons](https://microsoft.github.io/vscode-codicons/dist/codicon.html)
- [VS Code Theme Colors](https://code.visualstudio.com/api/references/theme-color)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

---

## Changelog

- **2025-12-07**: Initial UI Architecture Guide created
  - Documented all WebView panels
  - Documented TreeView providers
  - Documented StatusBar manager
  - Added best practices and guidelines
  - Added accessibility guidelines
  - Added performance optimization strategies
