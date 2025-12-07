# Enzyme VS Code Extension - Configuration Guide

Complete guide to configuring the Enzyme VS Code extension for optimal development experience.

## Table of Contents

- [Quick Start](#quick-start)
- [Telemetry & Privacy](#telemetry--privacy)
- [Logging & Debugging](#logging--debugging)
- [Code Generation](#code-generation)
- [Validation](#validation)
- [Analysis & Monitoring](#analysis--monitoring)
- [Language Features](#language-features)
- [Development Server](#development-server)
- [Performance Optimization](#performance-optimization)
- [Complete Configuration Reference](#complete-configuration-reference)

## Quick Start

Access extension settings:
- **UI**: `File > Preferences > Settings` → Search for "Enzyme"
- **JSON**: Edit `.vscode/settings.json` in your workspace
- **Command**: `Enzyme: Open Extension Settings`

### Recommended Settings

```json
{
  "enzyme.telemetry.enabled": false,
  "enzyme.logging.level": "info",
  "enzyme.generator.componentStyle": "function",
  "enzyme.generator.testFramework": "vitest",
  "enzyme.generator.cssFramework": "tailwind",
  "enzyme.validation.onSave": true,
  "enzyme.performance.monitoring.enabled": true,
  "enzyme.imports.autoOptimize": true,
  "enzyme.explorer.autoRefresh": true
}
```

## Telemetry & Privacy

### `enzyme.telemetry.enabled`
- **Type**: `boolean`
- **Default**: `false`
- **Scope**: Application

Enable anonymous telemetry to help improve the extension.

```json
{
  "enzyme.telemetry.enabled": false
}
```

**Note**: Telemetry respects VS Code's global telemetry setting. Even if enabled here, telemetry won't be sent if VS Code telemetry is disabled.

## Logging & Debugging

### `enzyme.logging.level`
- **Type**: `"debug" | "info" | "warn" | "error"`
- **Default**: `"info"`
- **Scope**: Application

Control the verbosity of extension logs.

```json
{
  "enzyme.logging.level": "debug"
}
```

- **debug**: Detailed information for troubleshooting
- **info**: General operational information
- **warn**: Warning messages only
- **error**: Error messages only

**View Logs**: Use command `Enzyme: Show Extension Logs` or check the "Enzyme" output channel.

## Code Generation

### Component Style

#### `enzyme.generator.componentStyle`
- **Type**: `"function" | "arrow"`
- **Default**: `"function"`
- **Scope**: Resource (workspace)

Choose between function declarations and arrow functions for generated components.

**Function Style:**
```typescript
export function UserCard({ name }: Props) {
  return <div>{name}</div>;
}
```

**Arrow Style:**
```typescript
export const UserCard = ({ name }: Props) => {
  return <div>{name}</div>;
};
```

### Test Framework

#### `enzyme.generator.testFramework`
- **Type**: `"vitest" | "jest"`
- **Default**: `"vitest"`
- **Scope**: Resource

Choose the test framework for generated test files.

```json
{
  "enzyme.generator.testFramework": "vitest"
}
```

### CSS Framework

#### `enzyme.generator.cssFramework`
- **Type**: `"tailwind" | "css-modules" | "styled-components" | "emotion"`
- **Default**: `"tailwind"`
- **Scope**: Resource

Select the CSS framework for styling generated components.

```json
{
  "enzyme.generator.cssFramework": "tailwind"
}
```

## Validation

### On-Save Validation

#### `enzyme.validation.onSave`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Automatically validate Enzyme configuration and routes when files are saved.

```json
{
  "enzyme.validation.onSave": true
}
```

### Strict Validation

#### `enzyme.validation.strict`
- **Type**: `boolean`
- **Default**: `false`
- **Scope**: Resource

Enable strict validation mode with additional rules:
- No `any` types allowed
- 100% TypeScript coverage required
- Complete JSDoc comments mandatory
- Full test coverage required

```json
{
  "enzyme.validation.strict": true
}
```

**Warning**: Strict mode can be overwhelming for new projects. Enable it once your codebase is mature.

## Analysis & Monitoring

### Auto Analysis

#### `enzyme.analysis.autoRun`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Automatically run analysis when files change.

```json
{
  "enzyme.analysis.autoRun": true
}
```

#### `enzyme.analysis.onSave`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Run analysis when files are saved.

#### `enzyme.analysis.debounceMs`
- **Type**: `number`
- **Default**: `300`
- **Range**: `0-5000`
- **Scope**: Resource

Delay (in milliseconds) before running analysis after changes.

```json
{
  "enzyme.analysis.debounceMs": 500
}
```

### Performance Monitoring

#### `enzyme.performance.monitoring.enabled`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Enable performance monitoring features.

#### `enzyme.performance.caching`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Cache analysis results for better performance.

#### `enzyme.performance.maxCacheSize`
- **Type**: `number`
- **Default**: `100`
- **Range**: `1-1000`
- **Scope**: Resource

Maximum number of cached items.

```json
{
  "enzyme.performance.monitoring.enabled": true,
  "enzyme.performance.caching": true,
  "enzyme.performance.maxCacheSize": 150
}
```

### Security Scanning

#### `enzyme.security.scanning.enabled`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Enable security vulnerability scanning.

```json
{
  "enzyme.security.scanning.enabled": true
}
```

## Language Features

### Diagnostics

#### `enzyme.diagnostics.enabled`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Show diagnostics in the Problems panel.

#### `enzyme.diagnostics.severity`
- **Type**: `"error" | "warning" | "info" | "hint"`
- **Default**: `"warning"`
- **Scope**: Resource

Default severity level for diagnostics.

#### `enzyme.diagnostics.showInline`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Show diagnostics inline in the editor.

```json
{
  "enzyme.diagnostics.enabled": true,
  "enzyme.diagnostics.severity": "warning",
  "enzyme.diagnostics.showInline": true
}
```

### CodeLens

#### `enzyme.codeLens.enabled`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Enable CodeLens information in the editor.

#### `enzyme.codeLens.showReferences`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Show reference counts in CodeLens.

#### `enzyme.codeLens.showImplementations`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Show implementation counts in CodeLens.

### Inlay Hints

#### `enzyme.inlayHints.enabled`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Show inlay hints in the editor.

#### `enzyme.inlayHints.showTypes`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Show type inlay hints.

#### `enzyme.inlayHints.showParameters`
- **Type**: `boolean`
- **Default**: `false`
- **Scope**: Resource

Show parameter name hints.

### Formatting

#### `enzyme.formatting.enabled`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Enable Enzyme formatter.

#### `enzyme.formatting.onSave`
- **Type**: `boolean`
- **Default**: `false`
- **Scope**: Resource

Automatically format files on save.

#### `enzyme.formatting.prettier`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Use Prettier for formatting.

```json
{
  "enzyme.formatting.enabled": true,
  "enzyme.formatting.onSave": true,
  "enzyme.formatting.prettier": true
}
```

### Completion

#### `enzyme.completion.enabled`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Enable IntelliSense completions.

#### `enzyme.completion.autoImport`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Automatically add imports on completion.

#### `enzyme.completion.snippets`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Enable code snippets.

### Import Optimization

#### `enzyme.imports.autoOptimize`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Automatically optimize Enzyme imports on save.

```json
{
  "enzyme.imports.autoOptimize": true
}
```

## Development Server

### Server Configuration

#### `enzyme.devServer.port`
- **Type**: `number`
- **Default**: `3000`
- **Range**: `1024-65535`
- **Scope**: Resource

Development server port.

#### `enzyme.devServer.host`
- **Type**: `string`
- **Default**: `"localhost"`
- **Scope**: Resource

Development server host.

#### `enzyme.devServer.autoStart`
- **Type**: `boolean`
- **Default**: `false`
- **Scope**: Resource

Start dev server automatically when opening an Enzyme project.

```json
{
  "enzyme.devServer.port": 3000,
  "enzyme.devServer.host": "localhost",
  "enzyme.devServer.autoStart": false
}
```

## Debug Configuration

### Debug Settings

#### `enzyme.debug.enabled`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Enable debugging features.

#### `enzyme.debug.connectAutomatically`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Automatically connect debugger.

#### `enzyme.debug.port`
- **Type**: `number`
- **Default**: `9229`
- **Range**: `1024-65535`
- **Scope**: Resource

Port for debugger connection.

```json
{
  "enzyme.debug.enabled": true,
  "enzyme.debug.connectAutomatically": true,
  "enzyme.debug.port": 9229
}
```

## Explorer & UI

#### `enzyme.explorer.autoRefresh`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Window

Automatically refresh explorer views on file changes.

#### `enzyme.format.onSave`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Format Enzyme configuration files on save.

```json
{
  "enzyme.explorer.autoRefresh": true,
  "enzyme.format.onSave": true
}
```

## Advanced Features

### Code Actions

#### `enzyme.codeActions.enabled`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Enable Enzyme code actions and quick fixes.

### Snippets

#### `enzyme.snippets.enabled`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Resource

Enable Enzyme code snippets.

### Experimental Features

#### `enzyme.experimental.features`
- **Type**: `array`
- **Default**: `[]`
- **Scope**: Resource

Enable experimental features by adding feature IDs.

```json
{
  "enzyme.experimental.features": [
    "ai-assisted-generation",
    "advanced-refactoring",
    "real-time-collaboration"
  ]
}
```

## CLI Integration

#### `enzyme.cli.path`
- **Type**: `string`
- **Default**: `"enzyme"`
- **Scope**: Application

Path to Enzyme CLI executable. Use full path if not in PATH.

#### `enzyme.cli.autoInstall`
- **Type**: `boolean`
- **Default**: `true`
- **Scope**: Application

Automatically install Enzyme CLI if not found.

```json
{
  "enzyme.cli.path": "/usr/local/bin/enzyme",
  "enzyme.cli.autoInstall": true
}
```

## Complete Configuration Reference

Here's a complete configuration with all available options:

```json
{
  // Telemetry & Privacy
  "enzyme.telemetry.enabled": false,

  // Logging
  "enzyme.logging.level": "info",

  // CLI
  "enzyme.cli.path": "enzyme",
  "enzyme.cli.autoInstall": true,

  // Code Generation
  "enzyme.generator.componentStyle": "function",
  "enzyme.generator.testFramework": "vitest",
  "enzyme.generator.cssFramework": "tailwind",

  // Validation
  "enzyme.validation.onSave": true,
  "enzyme.validation.strict": false,

  // Analysis
  "enzyme.analysis.autoRun": true,
  "enzyme.analysis.onSave": true,
  "enzyme.analysis.debounceMs": 300,

  // Diagnostics
  "enzyme.diagnostics.enabled": true,
  "enzyme.diagnostics.severity": "warning",
  "enzyme.diagnostics.showInline": true,

  // CodeLens
  "enzyme.codeLens.enabled": true,
  "enzyme.codeLens.showReferences": true,
  "enzyme.codeLens.showImplementations": true,

  // Inlay Hints
  "enzyme.inlayHints.enabled": true,
  "enzyme.inlayHints.showTypes": true,
  "enzyme.inlayHints.showParameters": false,

  // Formatting
  "enzyme.formatting.enabled": true,
  "enzyme.formatting.onSave": false,
  "enzyme.formatting.prettier": true,

  // Completion
  "enzyme.completion.enabled": true,
  "enzyme.completion.autoImport": true,
  "enzyme.completion.snippets": true,

  // Dev Server
  "enzyme.devServer.port": 3000,
  "enzyme.devServer.host": "localhost",
  "enzyme.devServer.autoStart": false,

  // Debug
  "enzyme.debug.enabled": true,
  "enzyme.debug.connectAutomatically": true,
  "enzyme.debug.port": 9229,

  // Performance
  "enzyme.performance.monitoring.enabled": true,
  "enzyme.performance.caching": true,
  "enzyme.performance.maxCacheSize": 100,

  // Security
  "enzyme.security.scanning.enabled": true,

  // Imports
  "enzyme.imports.autoOptimize": true,

  // Snippets & Code Actions
  "enzyme.snippets.enabled": true,
  "enzyme.codeActions.enabled": true,

  // Explorer
  "enzyme.explorer.autoRefresh": true,
  "enzyme.format.onSave": true,

  // Experimental
  "enzyme.experimental.features": []
}
```

## Workspace vs User Settings

### User Settings
Stored in your global VS Code settings. Applies to all workspaces.

**Location**:
- Windows: `%APPDATA%\Code\User\settings.json`
- macOS: `~/Library/Application Support/Code/User/settings.json`
- Linux: `~/.config/Code/User/settings.json`

### Workspace Settings
Stored in `.vscode/settings.json` in your project. Only applies to that project.

```json
// .vscode/settings.json
{
  "enzyme.generator.componentStyle": "arrow",
  "enzyme.generator.cssFramework": "styled-components"
}
```

### Settings Precedence

1. Workspace settings (highest priority)
2. User settings
3. Default values (lowest priority)

## Troubleshooting

### Reset to Defaults

To reset all Enzyme settings to defaults:
1. Open Settings UI
2. Search for "Enzyme"
3. Click the gear icon next to each setting
4. Select "Reset Setting"

### Common Issues

#### Extension Not Activating
- Ensure you have an `enzyme.config.ts` file or Enzyme in dependencies
- Check Output panel (Enzyme channel) for errors
- Try reloading the window

#### Performance Issues
- Reduce `enzyme.performance.maxCacheSize`
- Increase `enzyme.analysis.debounceMs`
- Disable `enzyme.analysis.autoRun` temporarily

#### Validation Errors
- Check `enzyme.validation.strict` is set appropriately
- Review diagnostics in Problems panel
- Use `Enzyme: Validate Config` command for details

## Getting Help

- [Documentation](https://enzyme-framework.dev)
- [GitHub Issues](https://github.com/harborgrid/enzyme/issues)
- [Discord Community](https://discord.gg/enzyme)
- Command: `Enzyme: Show Extension Logs`
