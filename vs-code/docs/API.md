# Enzyme VS Code Extension - API Documentation

Complete API reference for the Enzyme VS Code extension. This documentation is for extension developers and contributors.

## Table of Contents

- [Core APIs](#core-apis)
- [Extension Context](#extension-context)
- [Logger](#logger)
- [Workspace Utilities](#workspace-utilities)
- [Provider APIs](#provider-apis)
- [Command Registration](#command-registration)

## Core APIs

### EnzymeExtensionContext

Singleton class managing extension state and resources.

#### Methods

##### `static initialize(context: vscode.ExtensionContext): EnzymeExtensionContext`

Initialize the singleton instance. Must be called once during extension activation.

```typescript
const enzymeContext = EnzymeExtensionContext.initialize(context);
```

**Parameters:**
- `context`: VS Code extension context

**Returns:** EnzymeExtensionContext instance

**Throws:** Error if already initialized

---

##### `static getInstance(): EnzymeExtensionContext`

Get the singleton instance.

```typescript
const enzymeContext = EnzymeExtensionContext.getInstance();
```

**Returns:** EnzymeExtensionContext instance

**Throws:** Error if not initialized

---

##### `getContext(): vscode.ExtensionContext`

Get the VS Code ExtensionContext.

```typescript
const vscodeContext = enzymeContext.getContext();
```

---

##### `getLogger(): Logger`

Get the logger instance.

```typescript
const logger = enzymeContext.getLogger();
logger.info('Operation completed');
```

---

##### `getWorkspace(): EnzymeWorkspace | null`

Get the current Enzyme workspace information.

```typescript
const workspace = enzymeContext.getWorkspace();
if (workspace?.isEnzymeProject) {
  console.log(`Found ${workspace.features.length} features`);
}
```

**Returns:** EnzymeWorkspace object or null if not an Enzyme project

---

##### `setWorkspace(workspace: EnzymeWorkspace): void`

Set the Enzyme workspace and update context values.

```typescript
enzymeContext.setWorkspace({
  rootPath: '/path/to/project',
  isEnzymeProject: true,
  features: [],
  routes: [],
  components: [],
  stores: [],
  apiClients: []
});
```

---

##### `registerDisposable(disposable: vscode.Disposable): void`

Register a disposable to be cleaned up on extension deactivation.

```typescript
const subscription = vscode.workspace.onDidChangeTextDocument(handler);
enzymeContext.registerDisposable(subscription);
```

---

##### `showInfo(message: string, ...items: string[]): Promise<string | undefined>`

Show an information message.

```typescript
const selection = await enzymeContext.showInfo(
  'Operation completed',
  'View Results',
  'Dismiss'
);
```

---

##### `showWarning(message: string, ...items: string[]): Promise<string | undefined>`

Show a warning message.

```typescript
await enzymeContext.showWarning('Configuration may be invalid');
```

---

##### `showError(message: string, ...items: string[]): Promise<string | undefined>`

Show an error message.

```typescript
await enzymeContext.showError('Failed to generate component');
```

---

##### `withProgress<R>(title: string, task: ProgressTask): Promise<R>`

Execute a task with a progress indicator.

```typescript
await enzymeContext.withProgress('Analyzing project...', async (progress) => {
  progress.report({ message: 'Scanning files...', increment: 25 });
  // perform work
  progress.report({ message: 'Complete', increment: 100 });
});
```

---

##### `getStatusBarItem(id: string, config?: StatusBarItemConfig): vscode.StatusBarItem`

Get or create a status bar item.

```typescript
const statusItem = enzymeContext.getStatusBarItem('enzyme-status', {
  text: '$(beaker) Enzyme',
  tooltip: 'Enzyme Framework',
  command: 'enzyme.docs.open'
});
statusItem.show();
```

---

##### `setDiagnostics(uri: vscode.Uri, diagnostics: vscode.Diagnostic[]): void`

Set diagnostics for a file.

```typescript
const diagnostic = new vscode.Diagnostic(
  range,
  'Invalid route configuration',
  vscode.DiagnosticSeverity.Error
);
enzymeContext.setDiagnostics(fileUri, [diagnostic]);
```

---

## Logger

Enterprise logging utility with structured output.

### Logger Methods

##### `debug(message: string, data?: unknown): void`

Log a debug message.

```typescript
logger.debug('Analyzing component', { componentPath: '/path/to/component.tsx' });
```

---

##### `info(message: string, data?: unknown): void`

Log an info message.

```typescript
logger.info('Extension activated successfully');
```

---

##### `warn(message: string, data?: unknown): void`

Log a warning message.

```typescript
logger.warn('Configuration file not found', { path: configPath });
```

---

##### `error(message: string, error?: Error | unknown): void`

Log an error message.

```typescript
logger.error('Failed to parse config', error);
```

---

##### `success(message: string, data?: unknown): void`

Log a success message (info level with checkmark).

```typescript
logger.success('Component generated successfully', { path: outputPath });
```

---

##### `startOperation(operationName: string, context?: unknown): void`

Log the start of an operation.

```typescript
logger.startOperation('Generating component', { name: 'UserCard' });
```

---

##### `endOperation(operationName: string, startTime: number, result?: unknown): void`

Log the end of an operation with elapsed time.

```typescript
const start = Date.now();
// ... do work
logger.endOperation('Generating component', start, { filesCreated: 3 });
```

---

##### `async logOperation<T>(operationName: string, operation: () => Promise<T>, context?: unknown): Promise<T>`

Execute and log an operation with automatic timing.

```typescript
const result = await logger.logOperation(
  'Analyzing project',
  async () => {
    // perform analysis
    return analysisResult;
  },
  { projectPath }
);
```

---

##### `show(preserveFocus?: boolean): void`

Show the output channel.

```typescript
logger.show();
```

---

##### `header(title: string): void`

Log a header with dividers.

```typescript
logger.header('Starting Analysis');
```

---

## Workspace Utilities

Utilities for detecting and analyzing Enzyme projects.

### Functions

##### `async detectEnzymeProject(): Promise<boolean>`

Detect if the workspace contains an Enzyme project.

```typescript
const isEnzyme = await detectEnzymeProject();
if (isEnzyme) {
  // Initialize Enzyme features
}
```

**Returns:** `true` if Enzyme project detected, `false` otherwise

---

##### `async getProjectStructure(): Promise<EnzymeWorkspace>`

Analyze project structure and return workspace information.

```typescript
const workspace = await getProjectStructure();
console.log(`Features: ${workspace.features.length}`);
console.log(`Routes: ${workspace.routes.length}`);
console.log(`Components: ${workspace.components.length}`);
```

**Returns:** EnzymeWorkspace object with complete project information

---

##### `async invalidateWorkspaceCache(): Promise<void>`

Invalidate the workspace cache to force rescan on next access.

```typescript
await invalidateWorkspaceCache();
const freshWorkspace = await getProjectStructure(); // Forces rescan
```

---

##### `async getEnzymeVersion(rootPath: string): Promise<string | undefined>`

Get the Enzyme version from package.json.

```typescript
const version = await getEnzymeVersion('/path/to/project');
console.log(`Enzyme version: ${version}`);
```

---

##### `async findEnzymeConfig(rootPath: string): Promise<EnzymeConfig | undefined>`

Find and parse the Enzyme configuration file.

```typescript
const config = await findEnzymeConfig('/path/to/project');
if (config) {
  console.log(`Features: ${config.features?.length || 0}`);
}
```

---

### FileWatcher Class

Monitor file system changes with debouncing.

```typescript
const watcher = new FileWatcher('**/enzyme.config.{ts,js}', 500);

watcher.onEvent(async (event) => {
  if (event.type === 'changed') {
    // Handle config change
    await refreshWorkspace();
  }
});

watcher.start();

// Later...
watcher.dispose();
```

#### Constructor

```typescript
constructor(pattern: string, debounceDelay?: number)
```

**Parameters:**
- `pattern`: Glob pattern to watch
- `debounceDelay`: Debounce delay in milliseconds (default: 500)

#### Methods

##### `start(): void`

Start watching files.

##### `stop(): void`

Stop watching files.

##### `onEvent(listener: (event: FileWatcherEvent) => void): vscode.Disposable`

Subscribe to file events.

##### `dispose(): void`

Dispose the file watcher.

---

## Provider APIs

### Hover Provider

Provide hover documentation for Enzyme APIs.

```typescript
import { EnzymeHoverProvider, registerEnzymeHoverProvider } from './providers/language/enzyme-hover-provider';

// Register the provider
const disposable = registerEnzymeHoverProvider();
context.subscriptions.push(disposable);
```

---

### TreeView Providers

TreeView providers for displaying project structure.

#### Features TreeView

```typescript
import { FeaturesTreeProvider } from './providers/treeviews/features-tree-provider';

const featuresProvider = new FeaturesTreeProvider(enzymeContext);
const treeView = vscode.window.createTreeView('enzyme.views.features', {
  treeDataProvider: featuresProvider
});
```

#### Methods

##### `refresh(): void`

Refresh the tree view.

```typescript
featuresProvider.refresh();
```

---

## Command Registration

Register commands with consistent error handling.

### Helper Function

##### `wrapCommandHandler(commandId: string, handler: CommandHandler): CommandHandler`

Wrap a command handler with error handling and logging.

```typescript
const wrappedHandler = wrapCommandHandler(
  'enzyme.generate.component',
  async () => {
    // Command implementation
    await generateComponent();
  }
);

context.subscriptions.push(
  vscode.commands.registerCommand('enzyme.generate.component', wrappedHandler)
);
```

---

## Type Definitions

### EnzymeWorkspace

```typescript
interface EnzymeWorkspace {
  rootPath: string;
  packageJson?: PackageJson;
  enzymeConfig?: EnzymeConfig;
  isEnzymeProject: boolean;
  enzymeVersion?: string;
  features: EnzymeFeature[];
  routes: EnzymeRoute[];
  components: EnzymeComponent[];
  stores: EnzymeStore[];
  apiClients: EnzymeApiClient[];
}
```

---

### EnzymeFeature

```typescript
interface EnzymeFeature {
  id: string;
  name: string;
  path: string;
  version: string;
  enabled: boolean;
  routes: EnzymeRoute[];
  components: EnzymeComponent[];
  description?: string;
  icon?: string;
}
```

---

### EnzymeRoute

```typescript
interface EnzymeRoute {
  path: string;
  filePath: string;
  component?: string;
  loader?: boolean;
  action?: boolean;
  children: EnzymeRoute[];
  protected: boolean;
  permissions: string[];
  meta?: EnzymeRouteMeta;
}
```

---

### FileWatcherEvent

```typescript
interface FileWatcherEvent {
  type: 'created' | 'changed' | 'deleted';
  uri: vscode.Uri;
  timestamp: number;
}
```

---

### StatusBarItemConfig

```typescript
interface StatusBarItemConfig {
  text: string;
  tooltip?: string;
  command?: string;
  priority?: number;
  alignment?: vscode.StatusBarAlignment;
}
```

---

## Constants

### Commands

```typescript
import { COMMANDS } from './core/constants';

// Usage
vscode.commands.executeCommand(COMMANDS.GENERATE_COMPONENT);
```

Available commands:
- `COMMANDS.INIT`
- `COMMANDS.GENERATE_COMPONENT`
- `COMMANDS.GENERATE_FEATURE`
- `COMMANDS.GENERATE_ROUTE`
- `COMMANDS.GENERATE_STORE`
- `COMMANDS.GENERATE_HOOK`
- `COMMANDS.GENERATE_API_CLIENT`
- `COMMANDS.GENERATE_TEST`
- `COMMANDS.ANALYZE_PERFORMANCE`
- `COMMANDS.ANALYZE_SECURITY`
- `COMMANDS.ANALYZE_DEPENDENCIES`
- And more...

### Configuration Keys

```typescript
import { CONFIG_KEYS } from './core/constants';

const level = enzymeContext.getConfig(CONFIG_KEYS.LOGGING_LEVEL, 'info');
```

### File Patterns

```typescript
import { FILE_PATTERNS } from './core/constants';

const files = await vscode.workspace.findFiles(FILE_PATTERNS.ENZYME_CONFIG);
```

---

## Extension Lifecycle

### Activation

```typescript
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // 1. Initialize extension context
  const enzymeContext = EnzymeExtensionContext.initialize(context);

  // 2. Register commands
  registerCommands(enzymeContext);

  // 3. Register providers
  registerTreeViewProviders(enzymeContext);
  registerWebViewProviders(enzymeContext);

  // 4. Initialize workspace (deferred)
  setImmediate(async () => {
    await initializeEnzymeWorkspace(enzymeContext, context);
  });
}
```

### Deactivation

```typescript
export async function deactivate(): Promise<void> {
  // Dispose extension context
  const enzymeContext = EnzymeExtensionContext.getInstance();
  await enzymeContext.dispose();
}
```

---

## Testing

### Unit Testing

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Logger } from '../core/logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = Logger.createLogger('Test');
  });

  it('should log debug messages', () => {
    logger.debug('Test message');
    // Assert output
  });
});
```

---

## Contributing

When adding new APIs:

1. **Add JSDoc comments** with description, parameters, returns, and examples
2. **Add TypeScript types** for all parameters and return values
3. **Add unit tests** with > 80% coverage
4. **Update this documentation** with the new API
5. **Add examples** showing real-world usage

---

## Support

- [GitHub Issues](https://github.com/harborgrid/enzyme/issues)
- [Documentation](https://enzyme-framework.dev)
- [Discord Community](https://discord.gg/enzyme)
