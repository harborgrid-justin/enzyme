# Enzyme CLI

Official command-line interface for scaffolding [Enzyme](https://github.com/harborgrid-justin/enzyme) React projects.

> **Note:** This is the standalone CLI tool for Enzyme. For the main Enzyme framework, see [enzyme](https://github.com/harborgrid-justin/enzyme).

## Installation

```bash
npm install -g @missionfabric-js/enzyme-cli
```

## Usage

### Create a New Project

```bash
enzyme new <project-name> [options]
```

#### Options

- `-t, --template <name>` - Template to use (minimal, standard, enterprise, full) [default: standard]
- `-pm, --package-manager <manager>` - Package manager (npm, yarn, pnpm, bun) [default: npm]
- `--git` - Initialize git repository [default: true]
- `--no-git` - Skip git initialization
- `--install` - Install dependencies after generation [default: true]
- `--no-install` - Skip dependency installation
- `-f, --features <features>` - Comma-separated list of features
- `-o, --output <dir>` - Output directory [default: current directory]

#### Examples

Create a standard project with npm:
```bash
enzyme new my-app
```

Create an enterprise project with pnpm:
```bash
enzyme new my-app --template enterprise --package-manager pnpm
```

Create a minimal project without git:
```bash
enzyme new my-app --template minimal --no-git
```

Create a project with specific features:
```bash
enzyme new my-app --features auth,state,routing,monitoring
```

## Templates

### Minimal

A lightweight starter with basic enzyme setup.

**Features:**
- Theme support
- Single route
- Minimal dependencies

**Use case:** Small projects, prototypes, learning enzyme

### Standard (Default)

Production-ready setup with essential features.

**Features:**
- File-system routing
- State management (Zustand)
- Server state (React Query)
- Theme system
- Basic error handling

**Use case:** Most projects, SPA applications

### Enterprise

Advanced setup for large-scale applications.

**Features:**
- All standard features plus:
- Authentication with RBAC
- Feature flags
- Performance monitoring
- Real-time data (WebSocket)
- Full error boundaries
- API client setup

**Use case:** Enterprise applications, complex systems

### Full

Complete showcase with all enzyme features and demo pages.

**Features:**
- Everything enzyme offers
- Demo pages for each feature
- Comprehensive documentation
- Best practices examples

**Use case:** Learning, documentation, reference projects

## Features

Available features that can be enabled with `--features`:

- `auth` - Authentication and authorization (RBAC)
- `state` - State management (Zustand + React Query)
- `routing` - File-system routing
- `realtime` - Real-time data synchronization (WebSocket)
- `monitoring` - Performance monitoring (Core Web Vitals)
- `theme` - Theme system with dark mode

## Project Structure

Generated projects follow this structure:

```
my-app/
├── public/              # Static assets
├── src/
│   ├── routes/          # Route components
│   ├── components/      # Reusable components
│   ├── config/          # Configuration files
│   ├── providers/       # Provider orchestration
│   ├── store/           # State management (if enabled)
│   ├── lib/             # Feature-specific code
│   │   ├── auth/        # Auth logic (if enabled)
│   │   ├── monitoring/  # Monitoring (if enabled)
│   │   └── realtime/    # Real-time (if enabled)
│   ├── App.tsx          # Root component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── .env.example         # Environment variables template
├── .gitignore
├── eslint.config.js     # ESLint configuration
├── index.html
├── package.json
├── postcss.config.js
├── prettier.config.json
├── README.md
├── tailwind.config.ts   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

## Commands

### enzyme new

Create a new enzyme project.

```bash
enzyme new <project-name> [options]
```

Alias: `enzyme create`

### enzyme generate

Generate components, routes, and other files.

```bash
enzyme generate <type> <name> [options]
```

Alias: `enzyme g`

**Types:**
- `component` - React component
- `route` - Route component
- `store` - Zustand store
- `service` - Service layer

### enzyme config

Manage Enzyme configuration.

```bash
# Initialize configuration
enzyme config init [--format json|yaml|js] [--force] [--interactive]

# Get configuration value
enzyme config get <key> [--format json|value]

# Set configuration value
enzyme config set <key> <value> [--create]

# List all configuration
enzyme config list [--format json|table|tree] [--no-source]

# Validate configuration
enzyme config validate [--fix]
```

### enzyme add

Add a feature to an existing project.

```bash
enzyme add <feature> [options]

# List available features
enzyme add:list
```

**Options:**
- `--dry-run` - Preview changes without applying
- `--skip-install` - Skip dependency installation
- `--skip-config` - Skip configuration update

**Available features:**
- `auth` - Authentication and authorization
- `state` - State management with Zustand
- `routing` - Advanced routing with React Router
- `realtime` - Real-time subscriptions and WebSocket
- `monitoring` - Performance monitoring and observability
- `theme` - Theming and dark mode support
- `flags` - Feature flags for A/B testing

### enzyme remove

Remove a feature from the project.

```bash
enzyme remove <feature> [options]
```

**Options:**
- `--dry-run` - Preview changes without applying
- `--force` - Force removal without confirmation
- `--skip-uninstall` - Skip dependency uninstallation
- `--keep-files` - Keep generated files

### enzyme analyze

Analyze project for issues and optimizations.

```bash
enzyme analyze [options]
```

**Options:**
- `--verbose` - Verbose output
- `--format <format>` - Output format (json, console)
- `--include-tests` - Include test files in analysis

**Analysis includes:**
- Feature detection and usage
- Unused imports and dependencies
- Deprecated patterns
- Performance suggestions
- Code quality issues
- Project statistics

### enzyme migrate

Migrate project to a newer Enzyme version.

```bash
enzyme migrate [options]
```

**Options:**
- `--to <version>` - Target version
- `--dry-run` - Preview migrations without applying
- `--no-backup` - Skip backup creation

### enzyme upgrade

Upgrade Enzyme to the latest version with compatibility checks.

```bash
# Check for upgrades
enzyme upgrade:check

# Upgrade to latest
enzyme upgrade [options]
```

**Options:**
- `--to <version>` - Target version
- `--dry-run` - Preview without applying
- `--force` - Force upgrade despite compatibility issues
- `--skip-migrations` - Skip running migrations
- `--skip-tests` - Skip running tests after upgrade

### enzyme validate

Validate generated code against Enzyme standards.

```bash
enzyme validate [files...] [options]
```

**Options:**
- `--fix` - Auto-fix issues where possible
- `--rules <rules>` - Comma-separated list of rules to check

**Validation rules:**
- Component naming conventions (PascalCase)
- Hook naming (must start with "use")
- Required exports
- TypeScript types
- Import organization
- React hooks rules
- Test file existence
- Accessibility checks
- Code complexity

### enzyme doctor

Check project health with comprehensive diagnostics.

```bash
enzyme doctor [options]
```

**Options:**
- `--fix` - Auto-fix issues where possible
- `--verbose` - Verbose output

**Health checks:**
- Environment (Node.js, npm, Git)
- Dependencies (installed, versions, compatibility)
- Configuration (valid, TypeScript setup)
- Code quality (ESLint, Prettier, TypeScript compilation)
- Performance (build output, bundle size)

## Generated Files

### Configuration Files

- `package.json` - Dependencies based on selected features
- `tsconfig.json` - Strict TypeScript configuration
- `vite.config.ts` - Vite build configuration
- `tailwind.config.ts` - Tailwind CSS theme
- `eslint.config.js` - ESLint rules
- `.prettierrc` - Code formatting rules
- `postcss.config.js` - PostCSS plugins

### Source Files

- `src/main.tsx` - Application entry point with performance monitoring
- `src/App.tsx` - Root component with provider setup
- `src/index.css` - Global styles and Tailwind directives
- `src/vite-env.d.ts` - Vite type definitions
- `src/config/index.ts` - Application configuration
- `src/providers/index.tsx` - Provider orchestration

### Route Files (Template-specific)

Generated routes vary by template:

**Standard:**
- `src/routes/Home.tsx`
- `src/routes/About.tsx`

**Enterprise/Full (additional routes):**
- `src/routes/Login.tsx`
- `src/routes/Dashboard.tsx`
- `src/routes/Monitoring.tsx`
- `src/routes/Features.tsx` (Full only)

## Package Managers

The CLI supports multiple package managers:

- **npm** (default)
- **yarn**
- **pnpm**
- **bun**

The CLI will auto-detect your package manager from lock files, or you can specify one explicitly:

```bash
enzyme new my-app --package-manager pnpm
```

## Dependencies

### Base Dependencies

All projects include:
- `@missionfabric-js/enzyme` - Core framework
- `react` & `react-dom` - React runtime
- `vite` - Build tool
- `typescript` - Type checking
- `tailwindcss` - Styling
- `eslint` & `prettier` - Code quality

### Feature Dependencies

Additional dependencies based on selected features:

- **routing**: `react-router-dom`
- **state**: `zustand`, `@tanstack/react-query`
- **monitoring**: `web-vitals`

## Next Steps

After generating a project:

1. Navigate to project directory:
   ```bash
   cd my-app
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

4. Preview production build:
   ```bash
   npm run preview
   ```

## Development

To develop the CLI locally:

```bash
# Clone repository
git clone https://github.com/harborgrid-justin/enzyme-cli.git
cd enzyme-cli

# Install dependencies
npm install

# Build CLI
npm run build

# Link globally (for testing)
npm link

# Now you can use `enzyme` command
enzyme new test-app
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details.

## License

MIT © Defendr Team

## Links

- [Enzyme Framework](https://github.com/harborgrid-justin/enzyme)
- [Enzyme Documentation](https://github.com/harborgrid-justin/enzyme/blob/master/README.md)
- [Report Issues](https://github.com/harborgrid-justin/enzyme-cli/issues)
- [NPM Package](https://www.npmjs.com/package/@missionfabric-js/enzyme-cli)
