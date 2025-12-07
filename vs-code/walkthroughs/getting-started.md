# Get Started with Enzyme Framework

Welcome to the Enzyme Framework VS Code Extension! This walkthrough will guide you through the key features and help you get started quickly.

## Quick Start

Follow these steps to start building with Enzyme:

### 1. Verify Your Project

First, make sure you're working in an Enzyme project. The extension automatically detects Enzyme projects by looking for:
- `enzyme.config.ts` or `enzyme.config.js`
- `@missionfabric-js/enzyme` in package.json dependencies
- A `.enzyme/` directory

[Check if this is an Enzyme project](command:enzyme.workspace.detect)

### 2. Initialize Enzyme (New Projects)

If you're starting a new project, initialize Enzyme configuration:

[Initialize Enzyme Project](command:enzyme.init)

This will create the necessary configuration files and project structure.

### 3. Generate Your First Component

Create a new React component with Enzyme's code generator:

[Generate Component](command:enzyme.generate.component)

Components are generated with:
- TypeScript type safety
- Proper imports and exports
- Styling framework integration
- Optional test files

### 4. Create a Feature Module

Organize your application with feature-based architecture:

[Generate Feature](command:enzyme.generate.feature)

Features include:
- Self-contained components
- Routes and navigation
- State management
- API clients
- Tests

### 5. Explore the Enzyme Explorer

The Enzyme Explorer shows your project structure at a glance:
- Features
- Routes
- Components
- State Stores
- API Clients
- Performance Metrics

Click the Enzyme icon in the Activity Bar to open the Explorer.

### 6. Use Code Snippets

Accelerate development with built-in code snippets. Type one of these prefixes in a TypeScript/React file:

- `enzyme-component` - Create a component
- `enzyme-hook` - Create a custom hook
- `enzyme-store` - Create a Zustand store
- `enzyme-api` - Create an API client
- `enzyme-route` - Create a route configuration

### 7. Validate Your Code

Enzyme provides real-time validation:

[Validate Configuration](command:enzyme.validate.config)
[Validate Routes](command:enzyme.validate.routes)

### 8. Analyze Performance

Monitor and optimize your application:

[Analyze Performance](command:enzyme.analyze.performance)

### 9. View Documentation

Access comprehensive documentation:

[Open Enzyme Documentation](command:enzyme.docs.open)

## Keyboard Shortcuts

Speed up your workflow with these shortcuts:

| Action | Windows/Linux | macOS |
|--------|--------------|--------|
| Generate Component | `Ctrl+Alt+E C` | `Cmd+Alt+E C` |
| Generate Feature | `Ctrl+Alt+E F` | `Cmd+Alt+E F` |
| Generate Route | `Ctrl+Alt+E R` | `Cmd+Alt+E R` |
| Analyze Performance | `Ctrl+Alt+E P` | `Cmd+Alt+E P` |

## Next Steps

- [Configure Extension Settings](command:enzyme.openSettings)
- [View Extension Logs](command:enzyme.debug.showLogs)
- [Browse Code Snippets](command:enzyme.snippets.show)
- [Open Welcome Page](command:enzyme.panel.showWelcome)

Happy coding with Enzyme! 🧪
