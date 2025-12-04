# Enzyme CLI - Configuration & Validation Guide

Complete guide to Enzyme CLI's configuration management and validation systems.

## Table of Contents

1. [Configuration Management](#configuration-management)
2. [Project Analysis](#project-analysis)
3. [Migration System](#migration-system)
4. [Validation Engine](#validation-engine)
5. [Feature Management](#feature-management)
6. [Upgrade System](#upgrade-system)
7. [Health Checks](#health-checks)
8. [API Reference](#api-reference)

## Configuration Management

### Multi-Source Configuration Loading

Enzyme CLI loads configuration from multiple sources with the following precedence (highest to lowest):

1. **CLI arguments** - Passed directly to commands
2. **Environment variables** - Prefixed with `ENZYME_`
3. **Configuration files** - `.enzymerc.json`, `.enzymerc.yaml`, `enzyme.config.js`
4. **package.json** - Under "enzyme" field
5. **Default values** - Built-in defaults

### Configuration Schema

```typescript
{
  // Project metadata
  projectName: string;        // Required
  version: string;            // Default: "1.0.0"
  description?: string;

  // Paths
  srcDir: string;             // Default: "src"
  outDir: string;             // Default: "dist"
  publicDir: string;          // Default: "public"

  // Feature flags
  features: {
    auth: boolean;            // Default: false
    state: boolean;           // Default: true
    routing: boolean;         // Default: true
    realtime: boolean;        // Default: false
    monitoring: boolean;      // Default: false
    theme: boolean;           // Default: false
  };

  // Generator settings
  generators: {
    componentPath: string;    // Default: "src/components"
    routePath: string;        // Default: "src/routes"
    hookPath: string;         // Default: "src/hooks"
    testSuffix: '.test' | '.spec';  // Default: ".test"
    storyPath: string;        // Default: "src/stories"
  };

  // Code style
  style: {
    quotes: 'single' | 'double';           // Default: "single"
    semicolons: boolean;                    // Default: true
    tabWidth: number;                       // Default: 2
    useTabs: boolean;                       // Default: false
    trailingComma: 'none' | 'es5' | 'all'; // Default: "es5"
    arrowParens: 'avoid' | 'always';       // Default: "always"
  };

  // TypeScript
  typescript?: {
    strict: boolean;                        // Default: true
    skipLibCheck: boolean;                  // Default: true
    exactOptionalPropertyTypes: boolean;    // Default: true
  };

  // Build
  build?: {
    target: string;           // Default: "es2020"
    minify: boolean;          // Default: true
    sourcemap: boolean;       // Default: true
    analyze: boolean;         // Default: false
  };

  // Testing
  testing?: {
    framework: 'vitest' | 'jest';  // Default: "vitest"
    coverage: boolean;              // Default: true
    coverageThreshold: {
      statements: number;           // Default: 80
      branches: number;             // Default: 80
      functions: number;            // Default: 80
      lines: number;                // Default: 80
    };
  };

  // Linting
  linting?: {
    enabled: boolean;         // Default: true
    autoFix: boolean;         // Default: false
    rules: Record<string, any>;
  };

  // Plugins
  plugins: string[];          // Default: []

  // Custom metadata
  metadata?: Record<string, any>;
}
```

### Environment Variables

Configure via environment variables using the `ENZYME_` prefix:

```bash
# Project settings
export ENZYME_PROJECT_NAME="my-app"
export ENZYME_SRC_DIR="src"
export ENZYME_OUT_DIR="dist"

# Features (JSON format)
export ENZYME_FEATURES='{"auth":true,"state":true,"routing":true}'

# Style settings
export ENZYME_STYLE_QUOTES="single"
export ENZYME_STYLE_SEMICOLONS=true
export ENZYME_STYLE_TAB_WIDTH=2

# Build settings
export ENZYME_BUILD_MINIFY=true
export ENZYME_BUILD_SOURCEMAP=true
```

### Configuration Commands

#### Initialize Configuration

```bash
# Interactive setup (recommended)
enzyme config init

# Specific format
enzyme config init --format json
enzyme config init --format yaml
enzyme config init --format js

# Non-interactive with defaults
enzyme config init --no-interactive

# Force overwrite existing
enzyme config init --force
```

#### Get Configuration Values

```bash
# Get single value
enzyme config get projectName

# Get nested value
enzyme config get features.auth

# Get as JSON
enzyme config get features --format json
```

#### Set Configuration Values

```bash
# Set simple value
enzyme config set projectName "my-app"

# Set nested value
enzyme config set features.auth true

# Set complex value (JSON)
enzyme config set style '{"quotes":"single","semicolons":true}'

# Create config if not exists
enzyme config set projectName "my-app" --create
```

#### List Configuration

```bash
# Tree view (default)
enzyme config list

# Table view
enzyme config list --format table

# JSON output
enzyme config list --format json

# Without source information
enzyme config list --no-source
```

#### Validate Configuration

```bash
# Validate current config
enzyme config validate

# Validate and auto-fix
enzyme config validate --fix
```

## Project Analysis

Analyze your Enzyme project to detect features, find issues, and get optimization suggestions.

### Running Analysis

```bash
# Standard analysis
enzyme analyze

# Verbose output
enzyme analyze --verbose

# Include test files
enzyme analyze --include-tests

# JSON output
enzyme analyze --format json
```

### Analysis Results

#### Features
- Detects which Enzyme features are actually used
- Identifies configured but unused features
- Finds features in use but not configured

#### Imports
- Maps all package imports to files
- Detects unused dependencies
- Identifies deprecated imports

#### Deprecations
- Finds deprecated patterns and APIs
- Suggests modern replacements
- Shows affected files

#### Performance
- Identifies heavy dependencies
- Suggests code splitting opportunities
- Recommends memoization improvements

#### Statistics
- Total files, components, routes, hooks
- Test coverage
- Lines of code

### Example Output

```
=== Enzyme Project Analysis ===

📊 Project Statistics:
  Files: 45
  Components: 12
  Routes: 5
  Hooks: 8
  Tests: 15
  Lines of Code: 2,340

🔧 Features:
  Detected: auth, state, routing
  ⚠️  Unused: monitoring
  ⚠️  Missing config: realtime

⚠️  Issues:
  ⚠️  No Enzyme configuration file found
     💡 Run "enzyme config init" to create one

💡 Suggestions:
  • Remove unused features
    Features configured but not used: monitoring
    Impact: medium | Effort: low

  • Performance improvement
    Consider using React.lazy for code splitting
    Impact: medium | Effort: medium
```

## Migration System

Automated migrations for Enzyme version upgrades.

### Running Migrations

```bash
# Migrate to specific version
enzyme migrate --to 2.0.0

# Dry run (preview changes)
enzyme migrate --to 2.0.0 --dry-run

# Skip backup
enzyme migrate --to 2.0.0 --no-backup
```

### Migration Features

- **Automatic version detection** - Reads current version from package.json
- **Backup creation** - Creates timestamped backups before migration
- **Codemod transformations** - Automatically updates code
- **Rollback support** - Can revert changes if migration fails
- **Breaking change warnings** - Alerts about breaking changes

### Codemod Utilities

The migration system includes utilities for code transformations:

```typescript
// Replace imports
CodemodUtils.replaceImport(content, 'old-package', 'new-package');

// Replace identifiers
CodemodUtils.replaceIdentifier(content, 'OldName', 'NewName');

// Add imports
CodemodUtils.addImport(content, "import { New } from 'package';");

// Remove imports
CodemodUtils.removeImport(content, 'deprecated-package');

// Wrap with provider
CodemodUtils.wrapWithProvider(content, 'Provider', '@enzyme/provider');
```

## Validation Engine

Validates generated code against Enzyme standards and best practices.

### Running Validation

```bash
# Validate specific files
enzyme validate src/components/MyComponent.tsx

# Validate multiple files
enzyme validate src/**/*.tsx

# Auto-fix issues
enzyme validate src/**/*.tsx --fix

# Specific rules only
enzyme validate src/**/*.tsx --rules component-naming,typescript-types
```

### Validation Rules

#### Component Naming
- Components must use PascalCase
- Files should match component name
- **Severity**: Error

#### Hook Naming
- Hooks must start with "use"
- Must be camelCase after "use"
- **Severity**: Error

#### Required Exports
- Components must have default export
- **Severity**: Error

#### TypeScript Types
- Components should define prop types
- Use interface or type for props
- **Severity**: Warning

#### Import Organization
- Imports should be grouped together
- No gaps between import statements
- **Severity**: Info

#### React Hooks Rules
- Hooks cannot be called conditionally
- Hooks cannot be called in loops
- **Severity**: Error

#### Test Coverage
- Components should have test files
- Test files should match component name
- **Severity**: Warning

#### Enzyme Imports
- Prefer Enzyme framework imports
- Use framework wrappers over direct dependencies
- **Severity**: Info

#### Component Complexity
- Components should not exceed 300 lines
- Consider splitting large components
- **Severity**: Warning

#### Accessibility
- Images must have alt text
- Buttons must have accessible labels
- **Severity**: Warning

### Pre-commit Hook

Install validation as a pre-commit hook:

```bash
# Create hook
enzyme validate --install-hook

# Manual hook creation
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
FILES=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(tsx?|jsx?)$')
if [ -z "$FILES" ]; then exit 0; fi
npx enzyme validate $FILES
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Validation failed. Fix issues before committing."
  echo "   Run 'enzyme validate --fix' to auto-fix some issues."
  exit 1
fi
exit 0
EOF
chmod +x .git/hooks/pre-commit
```

## Feature Management

Add or remove features from existing projects.

### Adding Features

```bash
# Add authentication
enzyme add auth

# Add with preview
enzyme add auth --dry-run

# Skip dependency installation
enzyme add auth --skip-install

# Skip configuration update
enzyme add auth --skip-config

# List available features
enzyme add:list
```

### Available Features

#### Authentication (`auth`)
- Authentication and authorization
- RBAC support
- Session management
- **Files**: `src/lib/auth.ts`, `src/components/AuthGuard.tsx`

#### State (`state`)
- Zustand state management
- Global store setup
- **Dependencies**: zustand
- **Files**: `src/store/index.ts`

#### Routing (`routing`)
- React Router integration
- Route configuration
- Page components
- **Dependencies**: react-router-dom
- **Files**: `src/routes/`, route pages

#### Real-time (`realtime`)
- WebSocket support
- Real-time subscriptions
- Auto-reconnect
- **Files**: `src/lib/realtime.ts`, subscription hooks

#### Monitoring (`monitoring`)
- Performance monitoring
- Web Vitals tracking
- Error tracking
- **Dependencies**: web-vitals
- **Files**: `src/lib/monitoring.ts`

#### Theme (`theme`)
- Dark mode support
- Theme switching
- Custom themes
- **Files**: `src/theme/`, `src/components/ThemeProvider.tsx`

#### Flags (`flags`)
- Feature flags
- A/B testing
- Gradual rollouts
- **Files**: `src/lib/flags.ts`

### Removing Features

```bash
# Remove feature
enzyme remove auth

# Preview removal
enzyme remove auth --dry-run

# Force removal without confirmation
enzyme remove auth --force

# Keep generated files
enzyme remove auth --keep-files

# Skip dependency uninstallation
enzyme remove auth --skip-uninstall

# Check what will be removed
enzyme remove auth --dry-run --verbose
```

## Upgrade System

Upgrade Enzyme with compatibility checks and automatic migrations.

### Checking for Upgrades

```bash
# Check for available upgrades
enzyme upgrade:check
```

### Upgrading

```bash
# Upgrade to latest
enzyme upgrade

# Upgrade to specific version
enzyme upgrade --to 2.0.0

# Preview upgrade
enzyme upgrade --dry-run

# Force upgrade despite warnings
enzyme upgrade --force

# Skip migrations
enzyme upgrade --skip-migrations

# Skip tests after upgrade
enzyme upgrade --skip-tests
```

### Compatibility Checks

The upgrade system checks:
- Node.js version compatibility
- React version compatibility
- TypeScript version compatibility
- Breaking changes between versions
- Peer dependency versions

## Health Checks

Comprehensive project health diagnostics.

### Running Health Check

```bash
# Standard health check
enzyme doctor

# Auto-fix issues
enzyme doctor --fix

# Verbose output
enzyme doctor --verbose
```

### Health Check Categories

#### Environment
- Node.js version (>= 20.0.0 required)
- npm version (>= 10.0.0 recommended)
- Git installation

#### Dependencies
- Dependencies installed (node_modules exists)
- Enzyme framework present
- React version (>= 18.0.0 required)
- TypeScript setup
- No circular dependencies

#### Configuration
- Enzyme configuration exists and is valid
- TypeScript configuration exists
- Strict mode enabled (recommended)

#### Code Quality
- ESLint configured
- Prettier configured
- TypeScript compiles without errors

#### Performance
- Build output exists
- Bundle size analysis

### Example Output

```
🔍 Enzyme Health Check

Environment:
  ✓ Node.js 20.10.0 ✓
  ✓ npm 10.2.0 ✓
  ✓ Git is installed ✓

Dependencies:
  ✓ node_modules exists ✓
  ✓ @missionfabric-js/enzyme ^1.0.0 ✓
  ✓ React 18.2.0 ✓
  ✓ TypeScript ^5.0.0 ✓

Configuration:
  ✓ Configuration file found ✓
  ✓ Configuration is valid ✓
  ✓ TypeScript strict mode enabled ✓

Code Quality:
  ✓ ESLint configured ✓
  ✓ Prettier configured ✓
  ✓ TypeScript compiles without errors ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Summary:
  ✓ Passed: 12

🎉 Your Enzyme project is healthy!
```

## API Reference

All functionality is available programmatically:

```typescript
import {
  // Configuration
  ConfigManager,
  loadConfig,
  validateConfig,
  mergeConfigs,
  EnzymeConfig,

  // Analysis
  ProjectAnalyzer,
  analyzeProject,
  formatAnalysisResult,

  // Migration
  MigrationManager,
  CodemodUtils,
  migrate,

  // Validation
  ValidationEngine,
  validateFile,
  validateFiles,
  formatValidationResults,

  // Commands
  addFeature,
  removeFeature,
  upgrade,
  doctor,
} from '@missionfabric-js/enzyme-cli';

// Example: Load configuration
const { config, sources, warnings } = await loadConfig();
console.log('Project:', config.projectName);
console.log('Features:', config.features);

// Example: Analyze project
const analysis = await analyzeProject({ verbose: true });
console.log(formatAnalysisResult(analysis));

// Example: Validate files
const results = validateFiles(['src/**/*.tsx']);
console.log(formatValidationResults(results));

// Example: Add feature
await addFeature('auth', { dryRun: false });

// Example: Health check
const health = await doctor({ fix: true, verbose: true });
if (!health.healthy) {
  console.error('Health check failed');
  process.exit(1);
}
```

## Best Practices

1. **Always run `enzyme doctor`** before starting development
2. **Use configuration files** for consistency across team
3. **Enable pre-commit hooks** to catch issues early
4. **Run `enzyme analyze`** periodically for optimization opportunities
5. **Use `--dry-run`** before destructive operations
6. **Keep Enzyme updated** with regular `enzyme upgrade:check`
7. **Validate generated code** with `enzyme validate`
8. **Document custom configurations** in your project README

## Troubleshooting

### Configuration not loading

```bash
# Verify configuration file exists
enzyme config list

# Check configuration validity
enzyme config validate

# View configuration sources
enzyme config list --verbose
```

### Validation errors

```bash
# See all validation issues
enzyme validate src/**/*.tsx --verbose

# Auto-fix where possible
enzyme validate src/**/*.tsx --fix

# Check specific rules
enzyme validate src/**/*.tsx --rules component-naming
```

### Migration failures

```bash
# Preview migration
enzyme migrate --to 2.0.0 --dry-run

# Check compatibility
enzyme upgrade:check

# Use backup to rollback
# Backups are in .enzyme-backup-{timestamp}
```

### Health check failures

```bash
# Run with verbose output
enzyme doctor --verbose

# Auto-fix issues
enzyme doctor --fix

# Address specific categories
# Environment, Dependencies, Configuration, Code, Performance
```

## License

MIT © MissionFabric
