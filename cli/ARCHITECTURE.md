# Enzyme CLI Architecture

Technical documentation for the Enzyme CLI project generator.

## Overview

The Enzyme CLI is a sophisticated code generator that creates production-ready React applications using the Enzyme framework. It follows a modular architecture with clear separation of concerns.

## Directory Structure

```
cli/
├── src/
│   ├── commands/           # Command handlers
│   │   ├── new.ts         # 'enzyme new' command
│   │   └── generate.ts    # 'enzyme generate' command (future)
│   ├── generators/        # Code generators
│   │   └── project/       # Project generator
│   │       ├── templates/ # Template generators
│   │       │   ├── package-json.ts
│   │       │   ├── tsconfig.ts
│   │       │   ├── vite-config.ts
│   │       │   ├── tailwind-config.ts
│   │       │   ├── eslint-config.ts
│   │       │   ├── prettier-config.ts
│   │       │   ├── env-example.ts
│   │       │   ├── main-tsx.ts
│   │       │   ├── app-tsx.ts
│   │       │   ├── config.ts
│   │       │   ├── providers.ts
│   │       │   ├── routes.ts
│   │       │   └── readme.ts
│   │       ├── index.ts   # Main generator logic
│   │       └── utils.ts   # Utilities
│   ├── types.ts           # TypeScript definitions
│   └── index.ts           # CLI entry point
├── USAGE.md               # User guide
├── ARCHITECTURE.md        # This file
├── README.md              # Package documentation
├── package.json
└── tsconfig.json
```

## Core Components

### 1. CLI Entry Point (`src/index.ts`)

The main entry point that:
- Defines CLI commands using Commander.js
- Parses command-line arguments
- Routes to appropriate command handlers

**Key Features:**
- Command registration
- Option parsing
- Version management
- Help text generation

### 2. Command Handlers (`src/commands/`)

#### new.ts
Handles the `enzyme new` command:
- Validates user inputs
- Parses options and features
- Calls the project generator
- Handles errors gracefully

**Responsibilities:**
- Input validation
- Option normalization
- Error handling
- User feedback

### 3. Project Generator (`src/generators/project/`)

Core generator logic that orchestrates project creation.

#### index.ts
Main generator that:
- Validates project name
- Resolves features based on template
- Creates directory structure
- Generates all files
- Initializes git (optional)
- Installs dependencies (optional)

**Key Functions:**
- `generateProject()` - Main entry point
- `validateProjectName()` - Name validation
- `detectPackageManager()` - Auto-detect PM
- `resolveFeatures()` - Merge template + user features
- `createDirectoryStructure()` - Create folders
- `generateConfigFiles()` - Generate config
- `generateSourceFiles()` - Generate source
- `generateTemplateFiles()` - Generate routes

#### utils.ts
Utility functions for:
- Template rendering (Handlebars-like)
- Dependency resolution
- File operations
- Path manipulation
- String transformations

**Key Functions:**
- `renderTemplate()` - Template interpolation
- `resolveDependencies()` - Dependency calculation
- `writeFile()` - Safe file writing
- `readFile()` - File reading
- `copyTemplate()` - Template copying
- `sortPackageJson()` - Package.json ordering

### 4. Template Generators (`src/generators/project/templates/`)

Each file exports a function that generates specific file content:

#### Configuration Files
- **package-json.ts**: Generates package.json with correct dependencies
- **tsconfig.ts**: TypeScript configuration
- **vite-config.ts**: Vite build configuration
- **tailwind-config.ts**: Tailwind CSS theme
- **eslint-config.ts**: ESLint rules
- **prettier-config.ts**: Prettier formatting
- **env-example.ts**: Environment variables template

#### Source Files
- **main-tsx.ts**: Application entry point
- **app-tsx.ts**: Root component with providers
- **config.ts**: App configuration and router
- **providers.ts**: Provider orchestration
- **routes.ts**: Route components by template
- **readme.ts**: Project-specific README

## Design Patterns

### 1. Factory Pattern

Template generators use the factory pattern:

```typescript
export function generatePackageJson(context: TemplateContext): Record<string, any> {
  // Generate package.json based on context
}
```

### 2. Strategy Pattern

Different templates implement different generation strategies:

```typescript
function generateRoutes(template: TemplateType, context: TemplateContext) {
  switch (template) {
    case 'minimal': return generateMinimalRoutes(context);
    case 'standard': return generateStandardRoutes(context);
    case 'enterprise': return generateEnterpriseRoutes(context);
    case 'full': return generateFullRoutes(context);
  }
}
```

### 3. Template Method Pattern

The main generator defines the algorithm structure:

```typescript
async function generateProject(options: ProjectGeneratorOptions) {
  // 1. Validate
  validateProjectName(projectName);

  // 2. Resolve features
  const features = resolveFeatures(template, userFeatures);

  // 3. Create structure
  await createDirectoryStructure(projectDir, features);

  // 4. Generate files
  await generateConfigFiles(projectDir, context);
  await generateSourceFiles(projectDir, context);

  // 5. Post-generation
  if (git) await initGitRepo(projectDir);
  if (install) await runInstall(projectDir, packageManager);
}
```

## Data Flow

```
User Input
    ↓
Command Parser (Commander)
    ↓
Command Handler (new.ts)
    ↓
Input Validation
    ↓
Project Generator
    ↓
Feature Resolution
    ↓
Directory Creation
    ↓
Template Generators → File Generation
    ↓
Post-Processing (git, install)
    ↓
Success Message
```

## Template System

### Context Object

Every template receives a context object:

```typescript
interface TemplateContext {
  projectName: string;
  template: TemplateType;
  features: Feature[];
  hasAuth: boolean;
  hasState: boolean;
  hasRouting: boolean;
  hasRealtime: boolean;
  hasMonitoring: boolean;
  hasTheme: boolean;
  packageManager: string;
}
```

### Template Rendering

Simple Handlebars-like syntax:

```typescript
// Variable interpolation
{{projectName}}

// Conditionals
{{#if hasAuth}}
  <AuthProvider>
    {children}
  </AuthProvider>
{{/if}}

// Negation
{{#unless hasAuth}}
  {children}
{{/unless}}

// Iteration
{{#each features}}
  - {{this}}
{{/each}}
```

## Feature System

### Feature Definition

```typescript
type Feature = 'auth' | 'state' | 'routing' | 'realtime' | 'monitoring' | 'theme';
```

### Template Features

Each template includes default features:

```typescript
const TEMPLATE_FEATURES: Record<TemplateType, Feature[]> = {
  minimal: ['theme'],
  standard: ['routing', 'state', 'theme'],
  enterprise: ['auth', 'routing', 'state', 'theme', 'monitoring', 'realtime'],
  full: ['auth', 'routing', 'state', 'theme', 'monitoring', 'realtime'],
};
```

### Feature Resolution

Features are merged:
1. Template default features
2. User-specified features (via `--features`)
3. Deduplicated

```typescript
function resolveFeatures(template: TemplateType, userFeatures: Feature[]): Feature[] {
  const templateFeatures = TEMPLATE_FEATURES[template];
  const allFeatures = new Set([...templateFeatures, ...userFeatures]);
  return Array.from(allFeatures);
}
```

### Dependency Resolution

Features map to dependencies:

```typescript
const FEATURE_DEPENDENCIES: Record<string, { dependencies?: string[]; devDependencies?: string[] }> = {
  auth: {
    dependencies: ['@missionfabric-js/enzyme/auth'],
  },
  state: {
    dependencies: ['zustand', '@tanstack/react-query'],
  },
  routing: {
    dependencies: ['react-router-dom'],
  },
  // ...
};
```

## File Generation

### Process

1. **Create directory structure**
   ```typescript
   await mkdir(join(projectDir, 'src'), { recursive: true });
   ```

2. **Generate each file**
   ```typescript
   const content = generatePackageJson(context);
   await writeFile(path, content);
   ```

3. **Apply formatting**
   - JSON files are formatted with 2-space indentation
   - Source files follow Prettier rules

### Conflict Detection

Before writing files:
- Check if project directory exists
- Validate no naming conflicts
- Provide clear error messages

## Error Handling

### Validation Errors

```typescript
if (!validation.valid) {
  throw new Error(validation.error);
}
```

### File System Errors

```typescript
try {
  await writeFile(path, content);
} catch (error) {
  console.error(`Failed to write ${path}:`, error);
  throw error;
}
```

### User Feedback

- Progress indicators for long operations
- Clear error messages
- Success confirmation with next steps

## Package Manager Integration

### Auto-Detection

```typescript
function detectPackageManager(): PackageManager {
  if (existsSync('bun.lockb')) return 'bun';
  if (existsSync('pnpm-lock.yaml')) return 'pnpm';
  if (existsSync('yarn.lock')) return 'yarn';
  return 'npm';
}
```

### Command Generation

```typescript
function getInstallCommand(pm: PackageManager): string {
  return {
    npm: 'npm install',
    yarn: 'yarn',
    pnpm: 'pnpm install',
    bun: 'bun install',
  }[pm];
}
```

## Git Integration

### Initialization

```typescript
async function initGitRepo(projectDir: string): Promise<void> {
  execSync('git init', { cwd: projectDir });
  execSync('git add -A', { cwd: projectDir });
  execSync('git commit -m "Initial commit"', { cwd: projectDir });
}
```

### Gitignore

Generated automatically with sensible defaults:
- node_modules
- dist
- .env files
- Editor configs
- Build artifacts

## Testing Strategy

### Unit Tests (Future)

- Template generators
- Utility functions
- Validation logic

### Integration Tests (Future)

- Full project generation
- Different template combinations
- Feature combinations

### E2E Tests (Future)

- CLI command execution
- Generated project builds
- Generated project runs

## Performance Considerations

### Lazy Loading

Templates are only generated when needed:
```typescript
{ path: '/', importFn: () => import('../routes/Home') }
```

### Parallel Operations

Independent operations run in parallel:
```typescript
await Promise.all([
  generateConfigFiles(projectDir, context),
  generateSourceFiles(projectDir, context),
]);
```

### Efficient File Operations

- Batch file writes
- Reuse file handles
- Stream large files (if needed)

## Extensibility

### Adding New Templates

1. Add to `TemplateType`:
   ```typescript
   export type TemplateType = 'minimal' | 'standard' | 'enterprise' | 'full' | 'new-template';
   ```

2. Add to `TEMPLATE_FEATURES`:
   ```typescript
   const TEMPLATE_FEATURES = {
     // ...
     'new-template': ['routing', 'state'],
   };
   ```

3. Add route generator:
   ```typescript
   function generateNewTemplateRoutes(context: TemplateContext) {
     // ...
   }
   ```

### Adding New Features

1. Add to `Feature` type:
   ```typescript
   export type Feature = '...' | 'new-feature';
   ```

2. Add dependencies:
   ```typescript
   const FEATURE_DEPENDENCIES = {
     // ...
     'new-feature': {
       dependencies: ['some-package'],
     },
   };
   ```

3. Update templates to use new feature:
   ```typescript
   if (context.hasNewFeature) {
     // Generate new feature code
   }
   ```

### Adding New Generators

1. Create generator file:
   ```typescript
   // src/commands/my-generator.ts
   export async function myGenerator() {
     // ...
   }
   ```

2. Register command:
   ```typescript
   program
     .command('my-command')
     .action(myGenerator);
   ```

## Security Considerations

### Input Validation

- Project names validated against npm rules
- File paths sanitized
- No arbitrary code execution

### Safe File Operations

- Check paths before writing
- No overwriting without confirmation
- Proper error handling

### Dependency Security

- Use specific version ranges
- Audit dependencies regularly
- Follow security best practices

## Future Enhancements

### Planned Features

1. **Interactive Mode**
   - Prompt for template selection
   - Feature checklist
   - Configuration wizard

2. **Component Generator**
   - Generate React components
   - Generate routes
   - Generate stores
   - Generate services

3. **Migration Tools**
   - Upgrade existing projects
   - Add features to projects
   - Update dependencies

4. **Custom Templates**
   - User-defined templates
   - Template marketplace
   - Template inheritance

5. **Project Analysis**
   - Bundle size analysis
   - Performance recommendations
   - Security audit

## Maintenance

### Version Updates

- Keep dependency versions current
- Test with new Node.js versions
- Update templates with best practices

### Documentation

- Keep USAGE.md synchronized
- Update examples
- Maintain ARCHITECTURE.md

### Community

- Review issues and PRs
- Gather feedback
- Implement requested features

---

Last Updated: 2025-11-30
Version: 1.0.0
