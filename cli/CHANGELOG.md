# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-12-03

### Added

#### Prisma-Inspired Extension System
- **`$extends()` API**: Chain extensions like Prisma Client for composable, type-safe customization
- **Generator Extensions**: Hook into any generator lifecycle (beforeGenerate, afterGenerate, onError, validate)
- **Command Extensions**: Add custom CLI commands via extensions
- **Template Extensions**: Custom Handlebars helpers and filters
- **File Extensions**: Hook into file read/write operations
- **Result Extensions**: Add computed fields to generation results
- **Client Extensions**: Add utility methods to the Enzyme client

#### Built-in Extensions
- `loggingExtension`: Comprehensive logging with timing information
- `performanceExtension`: Performance metrics tracking
- `validationExtension`: Naming convention enforcement
- `formattingExtension`: Auto-formatting with Prettier integration
- `resultExtension`: Computed metadata for generated artifacts
- `gitExtension`: Automatic git staging of generated files
- `dryRunExtension`: Preview changes without writing files

#### Enhanced Error System
- Structured error codes following `DOMAIN_CATEGORY_NUMBER` pattern
- Rich error context with suggestions and documentation links
- Levenshtein distance-based command suggestions for typos
- Colored terminal output with proper formatting
- Error registry for programmatic error handling

#### Configuration Validation
- Zod-based schema validation for all configuration
- Deep merge strategies for config composition
- Environment-specific configuration support
- Helpful validation error messages
- Configuration field validation utilities

#### Branded Types for Type Safety
- `PluginId`, `ExtensionId`, `GeneratorId` branded types
- Type-safe ID constructors with validation
- Prevents mixing of semantically different values

#### NPM Package Improvements
- Modular exports: `./extensions`, `./errors`, `./config`, `./testing`
- TypeScript declaration files for all exports
- Optional peer dependency on Prettier
- Provenance for npm publishing
- Platform-specific builds (darwin, linux, win32)
- CPU architecture support (x64, arm64)

#### Testing Utilities
- `createMockLogger()`: Mock logger for testing
- `createMockConfig()`: Mock configuration factory
- `createMockCommandContext()`: Mock command context
- `createMockGeneratorContext()`: Mock generator hooks
- `createMockFileSystem()`: In-memory file system for tests
- `createTestClient()`: Test client with extensions
- `validateExtensionStructure()`: Extension validation
- Snapshot utilities for consistent testing

### Changed

- **Version**: Bumped to 2.0.0 for major architectural changes
- **Plugin System**: Legacy plugins now wrapped via extension adapter
- **Error Handling**: Enhanced with suggestions and documentation links
- **Configuration**: Now validated with Zod schemas
- **Package Exports**: Restructured for better tree-shaking

### Patterns Implemented

Based on comprehensive research of industry-leading libraries:

#### From axios
- Interceptor chain pattern for hooks
- Configuration merging strategies
- Request/response transform pipelines
- Rich error context preservation

#### From lodash
- Composable function pipelines
- Method chaining patterns
- Lazy evaluation concepts
- Modular export structure

#### From Prisma
- `$extends()` composition API
- Type-safe hook contexts
- Result transformations
- Branded types for safety
- Middleware execution patterns

#### From Socket.io
- Event-driven hook architecture
- Middleware chains with async/await
- Namespace-level configuration
- Error recovery mechanisms

### Migration Guide

#### From 1.x to 2.0

**Plugins to Extensions:**
```typescript
// Before (1.x)
const plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  hooks: {
    beforeGenerate: async (ctx) => { /* ... */ }
  }
};

// After (2.0)
import { defineExtension } from '@missionfabric-js/enzyme-cli/extensions';

const extension = defineExtension({
  name: 'my-extension',
  version: '1.0.0',
  generator: {
    $allGenerators: {
      async beforeGenerate(ctx) { /* ... */ }
    }
  }
});

// Use with $extends
const enzyme = new EnzymeClient().$extends(extension);
```

**Error Handling:**
```typescript
// Before (1.x)
try {
  await enzyme.generate.component('MyComponent');
} catch (error) {
  console.error(error.message);
}

// After (2.0)
import { isEnzymeError } from '@missionfabric-js/enzyme-cli/errors';

try {
  await enzyme.generate.component('MyComponent');
} catch (error) {
  if (isEnzymeError(error)) {
    console.error(error.format()); // Rich formatted output
    console.log(error.suggestions); // Helpful suggestions
    console.log(error.helpUrl);     // Documentation link
  }
}
```

**Configuration Validation:**
```typescript
// Before (1.x)
const config = { projectName: 'my-project' };
// No validation

// After (2.0)
import { validateConfigOrThrow } from '@missionfabric-js/enzyme-cli/config';

const config = validateConfigOrThrow({
  projectName: 'my-project',
  typescript: true,
});
// Throws EnzymeError with suggestions if invalid
```

## [1.1.0] - 2025-11-15

### Added
- TypeScript error fixes
- Lint fixes
- Version update

## [1.0.0] - 2025-11-01

### Added
- Initial release
- Core generators (component, page, hook, service, slice, module, route)
- Plugin system
- Configuration management
- Project scaffolding
- Feature management
- Documentation generation
- Migration system

---

## Research Credits

The 2.0 architecture was informed by extensive research of:
- [axios](https://github.com/axios/axios) - HTTP client patterns
- [lodash](https://github.com/lodash/lodash) - Modular utility patterns
- [Prisma](https://github.com/prisma/prisma) - Extension system architecture
- [Socket.io](https://github.com/socketio/socket.io) - Event-driven patterns

See `/AXIOS_PATTERNS_RESEARCH.md`, `/LODASH_PATTERNS_ANALYSIS.md`,
`/PRISMA_HOOK_PATTERNS_RESEARCH.md`, and `/SOCKETIO_HOOK_PATTERNS_ANALYSIS.md`
for detailed research documentation.
