# Enzyme Framework - VS Code Extension

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/missionfabric.enzyme-vscode)](https://marketplace.visualstudio.com/items?itemName=missionfabric.enzyme-vscode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

Enterprise-grade VS Code extension for the **Enzyme React Framework**. Provides intelligent tooling, code generation, diagnostics, performance monitoring, and an enhanced developer experience for building modern React applications at scale.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Commands Reference](#commands-reference)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Development](#development)
- [Architecture](#architecture)
- [Testing](#testing)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

## Features

### 🎯 Core Capabilities

- **Automatic Enzyme Detection**: Instantly recognizes Enzyme projects via config files, dependencies, or project structure
- **Enterprise-Grade Architecture**: Built with TypeScript, dependency injection, and singleton patterns for maximum reliability
- **Real-time Workspace Analysis**: Continuously monitors and analyzes your project structure
- **Performance Optimized**: Debounced file watchers and efficient caching for smooth IDE experience

### Code Generation
- Generate components, pages, hooks, and features
- TypeScript-first with full type safety
- Customizable templates
- Automatic imports and file structure

### IntelliSense & Language Features
- Route path autocompletion
- Enzyme API hover documentation
- Import path suggestions
- Type-aware completions

### Diagnostics & Validation
- Route conflict detection
- Performance issue warnings
- Security vulnerability scanning
- Missing dependency detection

### TreeView Explorers
- Features browser with metadata
- Routes hierarchy viewer
- Components catalog
- State stores inspector

### State Inspector
- Real-time state visualization
- State diff tracking
- Time-travel debugging
- Export state snapshots

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Enzyme Framework"
4. Click Install

### From VSIX
```bash
code --install-extension enzyme-vscode-*.vsix
```

### From Source
```bash
cd vs-code
npm install
npm run compile
```

## Quick Start

1. Open an Enzyme project in VS Code
2. The extension activates automatically when it detects:
   - `enzyme.config.ts` or `enzyme.config.js`
   - `@missionfabric-js/enzyme` in dependencies
   - `.enzyme/` directory

3. Access Enzyme commands via Command Palette (Ctrl+Shift+P):
   - `Enzyme: Generate Component`
   - `Enzyme: Generate Feature`
   - `Enzyme: Generate Route`
   - And more...

## Configuration

Configure the extension in VS Code settings:

```json
{
  "enzyme.telemetry.enabled": false,
  "enzyme.logging.level": "info",
  "enzyme.generator.componentStyle": "function",
  "enzyme.generator.testFramework": "vitest",
  "enzyme.generator.cssFramework": "tailwind",
  "enzyme.validation.onSave": true,
  "enzyme.performance.monitoring.enabled": true,
  "enzyme.security.scanning.enabled": true
}
```

### Available Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enzyme.telemetry.enabled` | boolean | `false` | Enable anonymous telemetry |
| `enzyme.logging.level` | string | `"info"` | Logging level (debug, info, warn, error) |
| `enzyme.generator.componentStyle` | string | `"function"` | Component style (function, arrow) |
| `enzyme.generator.testFramework` | string | `"vitest"` | Test framework (vitest, jest) |
| `enzyme.generator.cssFramework` | string | `"tailwind"` | CSS framework |
| `enzyme.validation.onSave` | boolean | `true` | Validate on save |
| `enzyme.validation.strict` | boolean | `false` | Enable strict validation |
| `enzyme.performance.monitoring.enabled` | boolean | `true` | Enable performance monitoring |
| `enzyme.security.scanning.enabled` | boolean | `true` | Enable security scanning |
| `enzyme.imports.autoOptimize` | boolean | `true` | Auto-optimize imports |
| `enzyme.snippets.enabled` | boolean | `true` | Enable code snippets |
| `enzyme.codeActions.enabled` | boolean | `true` | Enable code actions |
| `enzyme.explorer.autoRefresh` | boolean | `true` | Auto-refresh explorer |
| `enzyme.format.onSave` | boolean | `true` | Format config files on save |

## Commands Reference

### Generation Commands

- `Enzyme: Initialize Enzyme Project` - Bootstrap a new Enzyme project
- `Enzyme: Generate Component` - Create a new React component
- `Enzyme: Generate Feature` - Create a complete feature module
- `Enzyme: Generate Route` - Create a new route with optional loader/action
- `Enzyme: Generate Zustand Store` - Create a Zustand state store
- `Enzyme: Generate Custom Hook` - Create a custom React hook
- `Enzyme: Generate API Client` - Create a type-safe API client
- `Enzyme: Generate Test File` - Generate test file for current component

### Analysis Commands

- `Enzyme: Analyze Performance` - Analyze app performance metrics
- `Enzyme: Analyze Security` - Scan for security vulnerabilities
- `Enzyme: Analyze Dependencies` - Analyze dependency tree and issues

### Refactoring Commands

- `Enzyme: Convert to Enzyme Pattern` - Convert existing code to Enzyme patterns
- `Enzyme: Optimize Enzyme Imports` - Optimize and clean up imports

### Validation Commands

- `Enzyme: Validate Enzyme Config` - Validate enzyme.config.ts
- `Enzyme: Validate Routes` - Validate route configuration
- `Enzyme: Validate Features` - Validate feature structure

### Utility Commands

- `Enzyme: Refresh Explorer` - Refresh all explorer views
- `Enzyme: Open Documentation` - Open Enzyme documentation
- `Enzyme: Show Code Snippets` - Show available code snippets
- `Enzyme: Analyze Migration from CRA/Next.js` - Analyze migration path
- `Enzyme: Toggle Telemetry` - Enable/disable telemetry
- `Enzyme: Show Extension Logs` - Show extension log output
- `Enzyme: Detect Enzyme Project` - Check if current workspace is Enzyme project

## Keyboard Shortcuts

| Command | Windows/Linux | macOS |
|---------|--------------|--------|
| Generate Component | `Ctrl+Shift+E C` | `Cmd+Shift+E C` |
| Generate Feature | `Ctrl+Shift+E F` | `Cmd+Shift+E F` |
| Generate Route | `Ctrl+Shift+E R` | `Cmd+Shift+E R` |
| Analyze Performance | `Ctrl+Shift+E P` | `Cmd+Shift+E P` |

## Development

### Prerequisites
- Node.js 18+
- VS Code 1.85+
- npm or yarn

### Setup
```bash
npm install
```

### Build
```bash
npm run compile
```

### Watch Mode
```bash
npm run watch
```

### Testing
```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage
npm run test:unit -- --coverage
```

### Packaging
```bash
npm run package
```

### Publishing
```bash
# To VS Code Marketplace
npm run publish

# Manual with VSIX
vsce package
vsce publish
```

## Project Structure

```
vs-code/
├── src/
│   ├── extension.ts          # Extension entry point (activate/deactivate)
│   ├── core/                 # Core infrastructure
│   │   ├── context.ts        # EnzymeExtensionContext singleton
│   │   ├── logger.ts         # Enterprise logging utility
│   │   ├── workspace.ts      # Workspace detection & analysis
│   │   └── constants.ts      # Extension constants & enums
│   ├── types/                # TypeScript type definitions
│   │   └── index.ts          # Core types & interfaces
│   ├── commands/             # Command implementations
│   ├── providers/            # Language feature providers
│   │   ├── completion/       # Completion providers
│   │   ├── hover/            # Hover providers
│   │   ├── diagnostic/       # Diagnostic providers
│   │   └── codeaction/       # Code action providers
│   ├── views/                # TreeView providers
│   │   ├── features/         # Features tree view
│   │   ├── routes/           # Routes tree view
│   │   ├── components/       # Components tree view
│   │   └── stores/           # Stores tree view
│   ├── webviews/             # WebView panels
│   │   ├── state/            # State inspector
│   │   ├── performance/      # Performance dashboard
│   │   └── security/         # Security scanner
│   ├── generators/           # Code generators
│   ├── analyzers/            # Code analyzers
│   └── validators/           # Validators
├── test/
│   ├── suite/                # Integration tests
│   ├── unit/                 # Unit tests
│   └── fixtures/             # Test fixtures
├── resources/                # Icons, images, assets
│   ├── icons/                # Extension icons
│   └── templates/            # Code templates
├── .vscodeignore             # VSIX packaging exclusions
├── .eslintrc.json            # ESLint configuration
├── .prettierrc               # Prettier configuration
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Documentation
```

## Architecture

### Core Infrastructure

The extension is built on enterprise-grade patterns:

- **Singleton Pattern**: `EnzymeExtensionContext` manages global state and resources
- **Dependency Injection**: Services are injected through constructors for testability
- **Event-Driven**: Event emitters for loose coupling between components
- **Factory Pattern**: Specialized loggers for different subsystems
- **Observer Pattern**: File watchers with debouncing for performance

### Extension Activation Flow

1. **Initialize Context**: Create `EnzymeExtensionContext` singleton
2. **Detect Workspace**: Check for Enzyme project indicators
3. **Analyze Structure**: Scan for features, routes, components, stores
4. **Register Commands**: Register all 20+ commands with VS Code
5. **Setup Providers**: Register language providers (coming soon)
6. **Start Watchers**: Monitor config and source file changes
7. **Initialize Telemetry**: Setup opt-in telemetry (if enabled)
8. **Show UI**: Display status bar and welcome messages

### Language Features
- **CompletionProvider**: Route paths, imports, hooks
- **HoverProvider**: Documentation and type info
- **DiagnosticProvider**: Validation and warnings
- **CodeActionProvider**: Quick fixes

### TreeViews
- **FeaturesTreeView**: Browse and manage features
- **RoutesTreeView**: Visualize route hierarchy
- **ComponentsTreeView**: Component catalog
- **StoresTreeView**: State management

### Webviews
- **StateInspector**: Real-time state debugging
- **PerformanceAnalyzer**: Performance metrics
- **SecurityScanner**: Vulnerability reports

## Testing

Comprehensive test suite with:
- 70%+ code coverage
- Unit tests with Vitest
- Integration tests with @vscode/test-electron
- CI/CD with GitHub Actions
- Multi-platform testing (Ubuntu, Windows, macOS)
- Multi-version testing (VS Code stable & insiders)

See [test/README.md](test/README.md) for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run `npm test`
6. Submit a pull request

## CI/CD

### Continuous Integration
- Runs on every push and pull request
- Linting, type checking, and tests
- Multi-platform and multi-version matrix
- Security scanning
- Bundle size analysis

### Release Process
1. Create version tag: `git tag v1.0.0`
2. Push tag: `git push origin v1.0.0`
3. GitHub Actions automatically:
   - Builds VSIX
   - Publishes to VS Code Marketplace
   - Publishes to Open VSX
   - Creates GitHub Release

## Support

- [Documentation](https://enzyme-framework.dev)
- [GitHub Issues](https://github.com/harborgrid/enzyme/issues)
- [Discord Community](https://discord.gg/enzyme)

## License

MIT

## Acknowledgments

Built with:
- [VS Code Extension API](https://code.visualstudio.com/api)
- [TypeScript](https://www.typescriptlang.org/)
- [Vitest](https://vitest.dev/)
- [Mocha](https://mochajs.org/)

Part of the [Enzyme React Framework](https://enzyme-framework.dev) ecosystem.
