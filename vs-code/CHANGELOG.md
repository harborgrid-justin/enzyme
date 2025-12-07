# Changelog

All notable changes to the "Enzyme Framework" VS Code extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-07

### Added
- Initial release of Enzyme Framework VS Code extension
- Enterprise-grade extension with TypeScript, dependency injection, and singleton patterns
- Automatic Enzyme project detection via config files and dependencies
- Real-time workspace analysis and monitoring
- Code generation commands for components, features, routes, stores, hooks, and API clients
- IntelliSense features including route path autocompletion and API hover documentation
- Diagnostics and validation for route conflicts, performance issues, and security vulnerabilities
- TreeView explorers for features, routes, components, and state stores
- State Inspector with real-time visualization and time-travel debugging
- Performance monitoring and analysis capabilities
- Security vulnerability scanning
- 24 commands covering generation, analysis, refactoring, and validation
- Custom Enzyme language support with syntax highlighting
- Code snippets for TypeScript and React
- JSON schema validation for Enzyme configuration files
- Custom task definitions for Enzyme CLI integration
- Problem matchers for Enzyme diagnostics
- Keyboard shortcuts for common operations
- Configurable extension settings (30+ configuration options)
- File watchers with debouncing for optimal performance
- Comprehensive test suite with unit and integration tests
- CI/CD pipeline with GitHub Actions
- Multi-platform support (Linux, Windows, macOS)

### Features by Category

#### Code Generation
- Generate components with customizable styles (function/arrow)
- Generate complete feature modules
- Generate routes with optional loaders/actions
- Generate Zustand state stores
- Generate custom React hooks
- Generate type-safe API clients
- Generate test files with Vitest or Jest

#### Language Features
- Route path autocompletion
- Enzyme API hover documentation
- Import path suggestions
- Type-aware completions
- CodeLens information
- Inlay hints for types and parameters
- Go-to-definition for routes, features, and stores

#### Diagnostics & Validation
- Route conflict detection
- Performance issue warnings
- Security vulnerability scanning
- Missing dependency detection
- Configuration validation
- Feature structure validation

#### UI & Visualization
- Enzyme sidebar with activity bar icon
- Features TreeView browser
- Routes hierarchy viewer
- Components catalog
- State stores inspector
- Performance metrics dashboard
- API explorer panel
- Route visualizer
- State inspector with diff tracking

#### Developer Experience
- Automatic project detection
- File system watchers with smart debouncing
- Extension logging with multiple levels
- Opt-in telemetry (respects VS Code global setting)
- Context-aware command palette
- Editor context menus
- Welcome messages for first-time users

### Technical Implementation
- Built with TypeScript 5.3
- Targets VS Code 1.85.0 and above
- Uses modern VS Code Extension API
- Implements proper CSP for WebViews
- Singleton pattern for extension context
- Event-driven architecture
- Comprehensive error handling
- Resource disposal management
- Performance-optimized caching

### Configuration
- 30+ configurable settings
- Scoped settings (application, workspace, resource)
- Sensible defaults for all options
- Support for multiple test frameworks (Vitest, Jest)
- Support for multiple CSS frameworks (Tailwind, CSS Modules, Styled Components, Emotion)

### Documentation
- Comprehensive README with feature documentation
- Inline code documentation with TSDoc
- Command reference guide
- Keyboard shortcuts reference
- Architecture overview
- Testing infrastructure documentation
- Debug module overview

### Development & Testing
- ESLint configuration with TypeScript support
- Prettier code formatting
- Vitest for unit tests
- Mocha for integration tests
- 70%+ code coverage target
- GitHub Actions CI/CD pipeline
- Automated VSIX packaging
- Multi-version VS Code testing

## [Unreleased]

### Planned Features
- Enhanced IntelliSense with more completion providers
- Additional refactoring commands
- Migration tools for CRA and Next.js projects
- Enhanced visualizations and dashboards
- Real-time collaboration features
- AI-powered code suggestions
- Advanced debugging capabilities
- Performance profiling tools

---

[1.0.0]: https://github.com/harborgrid/enzyme/releases/tag/v1.0.0
