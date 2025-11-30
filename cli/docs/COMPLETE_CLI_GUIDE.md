# Enzyme CLI - Complete Guide

> The most powerful and easy-to-use CLI for scaffolding and building React applications with the Enzyme framework.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation](#installation)
3. [Commands Reference](#commands-reference)
4. [Project Templates](#project-templates)
5. [Code Generators](#code-generators)
6. [Documentation Generation](#documentation-generation)
7. [Configuration](#configuration)
8. [Feature Management](#feature-management)
9. [Project Analysis](#project-analysis)
10. [Migrations & Upgrades](#migrations--upgrades)
11. [Plugins](#plugins)
12. [Best Practices](#best-practices)

---

## Quick Start

```bash
# Install globally
npm install -g @missionfabric-js/enzyme-cli

# Create a new project (interactive)
enzyme new my-app

# Or with all options
enzyme new my-app --template enterprise --features auth,state,routing,monitoring

# Navigate and start
cd my-app
npm run dev
```

**That's it!** You have a production-ready React application with:
- TypeScript + Vite
- File-system routing
- State management (Zustand + React Query)
- Authentication & RBAC
- Performance monitoring
- Dark mode theme
- ESLint + Prettier

---

## Installation

### Global Installation (Recommended)

```bash
# npm
npm install -g @missionfabric-js/enzyme-cli

# yarn
yarn global add @missionfabric-js/enzyme-cli

# pnpm
pnpm add -g @missionfabric-js/enzyme-cli

# bun
bun add -g @missionfabric-js/enzyme-cli
```

### Local Installation

```bash
npm install -D @missionfabric-js/enzyme-cli
npx enzyme --help
```

### Verify Installation

```bash
enzyme --version
enzyme info
```

---

## Commands Reference

### Overview

| Command | Alias | Description |
|---------|-------|-------------|
| `enzyme new` | `create` | Create a new Enzyme project |
| `enzyme generate` | `g` | Generate code artifacts |
| `enzyme add` | - | Add features to existing project |
| `enzyme remove` | - | Remove features from project |
| `enzyme config` | - | Manage configuration |
| `enzyme docs` | - | Generate documentation |
| `enzyme analyze` | - | Analyze project structure |
| `enzyme validate` | - | Validate code against standards |
| `enzyme migrate` | - | Run version migrations |
| `enzyme upgrade` | - | Upgrade Enzyme version |
| `enzyme doctor` | - | Check project health |
| `enzyme info` | - | Display environment info |

### Global Options

All commands support these options:

```bash
--verbose       # Enable verbose logging
--dry-run       # Preview changes without applying
--force         # Skip confirmation prompts
--no-color      # Disable colored output
--config <path> # Use custom config file
--help          # Show help
--version       # Show version
```

---

## Project Templates

### enzyme new

Create a new Enzyme project with zero configuration.

```bash
enzyme new <project-name> [options]
```

#### Options

| Option | Alias | Default | Description |
|--------|-------|---------|-------------|
| `--template` | `-t` | `standard` | Template: minimal, standard, enterprise, full |
| `--package-manager` | `-pm` | auto-detect | npm, yarn, pnpm, bun |
| `--features` | `-f` | varies | Comma-separated features |
| `--output` | `-o` | `.` | Output directory |
| `--git` | - | `true` | Initialize git repository |
| `--install` | - | `true` | Install dependencies |

#### Templates Comparison

| Feature | Minimal | Standard | Enterprise | Full |
|---------|---------|----------|------------|------|
| Basic routing | ✅ | ✅ | ✅ | ✅ |
| Theme system | ✅ | ✅ | ✅ | ✅ |
| State management | - | ✅ | ✅ | ✅ |
| React Query | - | ✅ | ✅ | ✅ |
| Error boundaries | - | ✅ | ✅ | ✅ |
| Authentication | - | - | ✅ | ✅ |
| RBAC | - | - | ✅ | ✅ |
| Feature flags | - | - | ✅ | ✅ |
| Performance monitoring | - | - | ✅ | ✅ |
| Real-time (WebSocket) | - | - | ✅ | ✅ |
| Demo pages | - | - | - | ✅ |
| Documentation | - | - | - | ✅ |

#### Examples

```bash
# Interactive mode - guided setup
enzyme new my-app

# Quick start with defaults
enzyme new my-app --no-install

# Enterprise application
enzyme new dashboard --template enterprise --pm pnpm

# Full demo with all features
enzyme new learn-enzyme --template full

# Custom feature selection
enzyme new my-app --template minimal --features auth,state,theme
```

---

## Code Generators

### enzyme generate

Generate components, pages, hooks, services, modules, and more.

```bash
enzyme generate <type> <name> [options]
enzyme g <type> <name> [options]
```

### Component Generator

```bash
enzyme g component <name> [options]
enzyme g c <name>
```

#### Options

| Option | Description |
|--------|-------------|
| `--type <ui\|feature\|shared>` | Component category |
| `--path <dir>` | Custom output path |
| `--with-styles` | Include styled component |
| `--with-story` | Include Storybook story |
| `--with-test` | Include test file |
| `--memo` | Wrap with React.memo |
| `--forward-ref` | Use forwardRef |

#### Examples

```bash
# Basic component
enzyme g component Button

# UI component with tests and story
enzyme g component Card --type ui --with-test --with-story

# Memoized component with forwardRef
enzyme g component Input --memo --forward-ref

# Feature component
enzyme g component UserProfile --type feature --path src/features/user
```

### Page Generator

```bash
enzyme g page <name> [options]
enzyme g p <name>
```

#### Options

| Option | Description |
|--------|-------------|
| `--route <path>` | Associated route path |
| `--layout <name>` | Layout to use |
| `--with-state` | Add local state management |
| `--with-query` | Add React Query integration |
| `--with-form` | Add form handling |

#### Examples

```bash
# Basic page
enzyme g page Dashboard

# Page with data fetching
enzyme g page Users --with-query --route /users

# Page with form
enzyme g page Settings --with-form --layout MainLayout
```

### Route Generator

```bash
enzyme g route <path> [options]
enzyme g r <path>
```

#### Options

| Option | Description |
|--------|-------------|
| `--layout <name>` | Use specific layout |
| `--guard <name>` | Add route guard |
| `--loader` | Add data loader |
| `--action` | Add form action |
| `--lazy` | Make lazy-loaded |
| `--meta <title>` | Page title/meta |

#### Examples

```bash
# Basic route
enzyme g route /about

# Protected route with loader
enzyme g route /dashboard --guard auth --loader

# Lazy-loaded route with layout
enzyme g route /settings --lazy --layout DashboardLayout
```

### Hook Generator

```bash
enzyme g hook <name> [options]
enzyme g h <name>
```

#### Options

| Option | Description |
|--------|-------------|
| `--type <query\|mutation\|state\|effect\|callback\|custom>` | Hook type |
| `--with-test` | Add test file |

#### Examples

```bash
# Custom hook
enzyme g hook useWindowSize

# Query hook with React Query
enzyme g hook useUsers --type query

# Mutation hook
enzyme g hook useCreateUser --type mutation
```

### Service Generator

```bash
enzyme g service <name> [options]
enzyme g s <name>
```

#### Options

| Option | Description |
|--------|-------------|
| `--with-crud` | Add CRUD operations |
| `--with-cache` | Add caching |
| `--with-optimistic` | Add optimistic updates |

#### Examples

```bash
# Basic service
enzyme g service UserService

# Full CRUD service
enzyme g service ProductService --with-crud --with-cache
```

### Module Generator

```bash
enzyme g module <name> [options]
enzyme g m <name>
```

#### Options

| Option | Description |
|--------|-------------|
| `--with-routes` | Include routes |
| `--with-state` | Include state slice |
| `--with-api` | Include API service |
| `--with-components` | Include component folder |
| `--with-hooks` | Include hooks folder |
| `--full` | All of the above |

#### Examples

```bash
# Full feature module
enzyme g module orders --full

# Module with routes and state
enzyme g module products --with-routes --with-state --with-api
```

### Slice Generator (Zustand Store)

```bash
enzyme g slice <name> [options]
```

#### Examples

```bash
# Basic slice
enzyme g slice cart

# CRUD slice with persistence
enzyme g slice products --with-crud --persist
```

---

## Documentation Generation

### enzyme docs

Generate comprehensive documentation from your code.

```bash
enzyme docs <command> [options]
```

### Commands

| Command | Description |
|---------|-------------|
| `generate` | Generate all documentation |
| `api` | Generate API documentation |
| `components` | Generate component docs |
| `hooks` | Generate hooks reference |
| `routes` | Generate route documentation |
| `serve` | Start documentation server |

### Examples

```bash
# Generate all docs
enzyme docs generate

# Generate with HTML output
enzyme docs generate --format html --output ./documentation

# Generate specific docs
enzyme docs api
enzyme docs components
enzyme docs hooks
enzyme docs routes

# Serve docs locally with hot reload
enzyme docs serve --port 3001

# Incremental generation (faster)
enzyme docs generate --incremental
```

### Output Formats

- **Markdown** (default) - GitHub-compatible
- **HTML** - Interactive, searchable
- **JSON** - Machine-readable

---

## Configuration

### enzyme config

Manage Enzyme CLI configuration.

### Configuration File Formats

The CLI looks for configuration in this order:
1. CLI arguments
2. Environment variables (`ENZYME_*`)
3. `enzyme.config.js` / `.mjs` / `.cjs`
4. `.enzymerc.json` / `.yaml` / `.yml`
5. `package.json` `"enzyme"` field
6. Default values

### Commands

```bash
# Initialize configuration interactively
enzyme config init

# Initialize with specific format
enzyme config init --format yaml

# Get a config value
enzyme config get features.auth

# Set a config value
enzyme config set generators.componentPath src/components

# List all config
enzyme config list
enzyme config list --format tree  # tree view
enzyme config list --format json  # JSON output

# Validate configuration
enzyme config validate
enzyme config validate --fix  # auto-fix issues
```

### Configuration Schema

```typescript
interface EnzymeConfig {
  // Project metadata
  projectName: string;
  version: string;
  description?: string;

  // Paths
  srcDir: string;      // default: 'src'
  outDir: string;      // default: 'dist'
  publicDir: string;   // default: 'public'

  // Features
  features: {
    auth: boolean;       // Authentication/RBAC
    state: boolean;      // State management
    routing: boolean;    // File-system routing
    realtime: boolean;   // WebSocket/SSE
    monitoring: boolean; // Performance monitoring
    theme: boolean;      // Theme system
  };

  // Generator settings
  generators: {
    componentPath: string;  // default: 'src/components'
    routePath: string;      // default: 'src/routes'
    hookPath: string;       // default: 'src/hooks'
    testSuffix: '.test' | '.spec';
    storyPath: string;
  };

  // Code style
  style: {
    quotes: 'single' | 'double';
    semicolons: boolean;
    tabWidth: number;
    useTabs: boolean;
    trailingComma: 'none' | 'es5' | 'all';
    arrowParens: 'avoid' | 'always';
  };

  // Plugins
  plugins: string[];
}
```

### Environment Variables

```bash
ENZYME_PROJECT_NAME=my-app
ENZYME_FEATURES_AUTH=true
ENZYME_GENERATORS_COMPONENT_PATH=src/ui
ENZYME_STYLE_QUOTES=double
```

---

## Feature Management

### enzyme add

Add features to an existing project.

```bash
enzyme add <feature> [options]
```

### Available Features

| Feature | Description | Dependencies Added |
|---------|-------------|-------------------|
| `auth` | Authentication + RBAC | JWT decoder, AuthContext |
| `state` | Zustand store | zustand, immer |
| `routing` | React Router | react-router-dom |
| `realtime` | WebSocket client | WebSocket utilities |
| `monitoring` | Web Vitals | web-vitals |
| `theme` | Dark mode | ThemeProvider |
| `flags` | Feature flags | FeatureFlagProvider |

### Examples

```bash
# Add authentication
enzyme add auth

# Preview changes first
enzyme add monitoring --dry-run

# Add without installing deps
enzyme add realtime --skip-install

# List available features
enzyme add:list
```

### enzyme remove

Remove features from project.

```bash
enzyme remove <feature> [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview changes |
| `--force` | Skip confirmation |
| `--skip-uninstall` | Keep dependencies |
| `--keep-files` | Keep generated files |

### Examples

```bash
# Remove with confirmation
enzyme remove monitoring

# Force remove
enzyme remove auth --force

# Preview removal
enzyme remove realtime --dry-run
```

---

## Project Analysis

### enzyme analyze

Analyze project structure, find issues, and get recommendations.

```bash
enzyme analyze [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--verbose` | Detailed output |
| `--json` | JSON output |
| `--include-tests` | Include test files |

### What It Analyzes

- **Feature detection** - Which Enzyme features are used
- **Unused imports** - Dead code detection
- **Deprecated patterns** - Old API usage
- **Performance issues** - Missing memoization, large bundles
- **Code quality** - Complexity, naming conventions
- **Statistics** - Files, components, routes, hooks, LOC

### Example Output

```
📊 Project Analysis: my-app

Features Detected:
  ✅ Authentication (auth)
  ✅ State Management (state)
  ✅ Routing (routing)
  ⚪ Real-time (not used)
  ✅ Monitoring (monitoring)
  ✅ Theme (theme)

Statistics:
  Files: 47
  Components: 23
  Routes: 8
  Hooks: 12
  Tests: 18
  Lines of Code: 4,521

Issues Found: 3
  ⚠️ Unused import in src/components/Header.tsx
  ⚠️ Missing memo() in src/components/ExpensiveList.tsx
  ℹ️ Consider code-splitting for src/routes/Dashboard.tsx

Recommendations:
  • Add React.memo to ExpensiveList for better performance
  • Enable lazy loading for Dashboard route
  • Remove unused imports to reduce bundle size
```

### enzyme validate

Validate code against Enzyme standards.

```bash
enzyme validate [files...] [options]
```

### Examples

```bash
# Validate all files
enzyme validate

# Validate specific files
enzyme validate src/components/**/*.tsx

# Auto-fix issues
enzyme validate --fix

# Check specific rules
enzyme validate --rules component-naming,hook-naming
```

### enzyme doctor

Comprehensive health check for your project.

```bash
enzyme doctor [options]
```

### What It Checks

- **Environment** - Node.js, npm, Git versions
- **Dependencies** - Installation, versions, peer deps
- **Configuration** - Valid config, TypeScript setup
- **Code Quality** - ESLint, Prettier, TypeScript compilation
- **Performance** - Build output, bundle size

### Example Output

```
🏥 Project Health Check

Environment:
  ✅ Node.js v20.10.0 (>= 18.0.0 required)
  ✅ npm 10.2.0
  ✅ Git 2.43.0

Dependencies:
  ✅ All dependencies installed
  ✅ @missionfabric-js/enzyme@2.0.0
  ✅ No circular dependencies

Configuration:
  ✅ enzyme.config.js valid
  ✅ TypeScript strict mode enabled
  ✅ ESLint configured

Code Quality:
  ✅ No ESLint errors
  ✅ TypeScript compiles successfully
  ⚠️ 3 Prettier warnings

Overall: Healthy ✅
```

---

## Migrations & Upgrades

### enzyme migrate

Run migrations when upgrading Enzyme versions.

```bash
enzyme migrate [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--to <version>` | Target version |
| `--dry-run` | Preview changes |
| `--no-backup` | Skip backup |

### Examples

```bash
# Migrate to latest
enzyme migrate

# Migrate to specific version
enzyme migrate --to 2.0.0

# Preview migration
enzyme migrate --dry-run

# List available migrations
enzyme migrate list

# Check migration status
enzyme migrate status
```

### enzyme upgrade

Upgrade Enzyme to the latest version.

```bash
enzyme upgrade [options]
enzyme upgrade:check  # Check for updates
```

### Options

| Option | Description |
|--------|-------------|
| `--to <version>` | Target version |
| `--dry-run` | Preview changes |
| `--force` | Ignore compatibility |
| `--skip-migrations` | Don't run migrations |
| `--skip-tests` | Don't run tests |

### Examples

```bash
# Check for updates
enzyme upgrade:check

# Upgrade with safety checks
enzyme upgrade

# Upgrade to specific version
enzyme upgrade --to 2.1.0

# Force upgrade
enzyme upgrade --force
```

---

## Plugins

### Creating Plugins

Plugins extend the CLI with custom functionality.

```javascript
// my-plugin.js
export default {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My custom plugin',
  hooks: {
    beforeGenerate: async (context) => {
      console.log('Before generating:', context.name);
    },
    afterGenerate: async (context, result) => {
      console.log('Files created:', result.filesCreated);
    },
    validate: (context) => {
      // Custom validation
      return { valid: true, errors: [], warnings: [] };
    },
  },
};
```

### Using Plugins

```json
// .enzymerc.json
{
  "enzyme": {
    "plugins": [
      "./plugins/my-plugin.js",
      "@company/enzyme-plugin-custom"
    ]
  }
}
```

### Built-in Plugins

| Plugin | Description |
|--------|-------------|
| `templates` | Template resolution and management |
| `validation` | Parameter validation |
| `git` | Git integration (auto-commit, staging) |

---

## Best Practices

### Project Structure

```
my-app/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # Base UI (Button, Input, etc.)
│   │   └── shared/       # Shared components
│   ├── features/         # Feature modules
│   │   ├── auth/
│   │   ├── dashboard/
│   │   └── settings/
│   ├── routes/           # Route components
│   ├── hooks/            # Custom hooks
│   ├── services/         # API services
│   ├── store/            # Zustand store
│   ├── config/           # Configuration
│   ├── providers/        # Provider orchestration
│   ├── lib/              # Utilities
│   ├── App.tsx
│   └── main.tsx
├── public/
├── docs/                 # Generated documentation
└── tests/                # E2E tests
```

### Generator Workflow

1. **Plan** - Decide component type and location
2. **Generate** - Use appropriate generator
3. **Customize** - Modify generated code
4. **Test** - Write/run tests
5. **Document** - Generate docs

```bash
# Example workflow
enzyme g module user --full
enzyme g page UserProfile --route /users/:id
enzyme g component UserAvatar --type ui --with-test
enzyme docs generate
```

### Configuration Tips

1. **Start with defaults** - Override only what you need
2. **Use environment variables** - For CI/CD
3. **Validate often** - `enzyme config validate`
4. **Version your config** - Commit `.enzymerc.json`

### Performance Tips

1. **Lazy load routes** - Use `--lazy` flag
2. **Generate with memo** - Use `--memo` flag
3. **Run analysis** - `enzyme analyze`
4. **Monitor bundle** - `enzyme doctor`

---

## Troubleshooting

### Common Issues

#### "Command not found: enzyme"

```bash
# Ensure global install
npm install -g @missionfabric-js/enzyme-cli

# Or use npx
npx enzyme --help
```

#### "Configuration validation failed"

```bash
# Check and fix config
enzyme config validate --fix
```

#### "Dependencies not installed"

```bash
# Run doctor
enzyme doctor --fix
```

#### "Migration failed"

```bash
# Preview first
enzyme migrate --dry-run

# Check status
enzyme migrate status
```

---

## Support

- **Documentation**: https://enzyme.dev/docs
- **Issues**: https://github.com/harborgrid-justin/enzyme/issues
- **Discussions**: https://github.com/harborgrid-justin/enzyme/discussions

---

## License

MIT © MissionFabric
