/**
 * @file Docs command for documentation management
 * @module commands/docs
 */

import { Command } from 'commander';
import { CommandContext } from '../types/index.js';
import { writeFile, ensureDir, readFile } from '../utils/fs.js';
import { resolve, join } from 'path';
import { renderTemplate } from '../utils/template.js';

/**
 * Create docs command
 */
export function createDocsCommand(context: CommandContext): Command {
  const docs = new Command('docs')
    .description('Generate and manage project documentation')
    .option('--output <dir>', 'Output directory', 'docs')
    .action(async (options) => {
      await generateDocs(context, options);
    });

  docs
    .command('init')
    .description('Initialize documentation structure')
    .option('--template <template>', 'Documentation template (basic, comprehensive)', 'basic')
    .action(async (options) => {
      await initDocs(context, options);
    });

  docs
    .command('component <name>')
    .description('Generate component documentation')
    .action(async (name) => {
      await generateComponentDoc(context, name);
    });

  docs
    .command('api')
    .description('Generate API documentation')
    .action(async () => {
      await generateApiDocs(context);
    });

  return docs;
}

/**
 * Generate documentation
 */
async function generateDocs(context: CommandContext, options: { output?: string }): Promise<void> {
  context.logger.header('Generate Documentation');
  context.logger.startSpinner('Generating documentation...');

  try {
    const outputDir = resolve(context.cwd, options.output || 'docs');
    await ensureDir(outputDir);

    // Generate README
    await generateReadme(context, outputDir);

    // Generate Getting Started
    await generateGettingStarted(context, outputDir);

    // Generate Architecture docs
    await generateArchitectureDocs(context, outputDir);

    context.logger.succeedSpinner('Documentation generated');
    context.logger.newLine();
    context.logger.success('Documentation files created:');
    context.logger.info(`  ${outputDir}/README.md`);
    context.logger.info(`  ${outputDir}/getting-started.md`);
    context.logger.info(`  ${outputDir}/architecture.md`);
  } catch (error) {
    context.logger.failSpinner('Failed to generate documentation');
    context.logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Initialize docs structure
 */
async function initDocs(context: CommandContext, options: { template?: string }): Promise<void> {
  context.logger.header('Initialize Documentation');

  const docsDir = resolve(context.cwd, 'docs');
  await ensureDir(docsDir);

  const template = options.template || 'basic';

  if (template === 'basic') {
    await generateBasicDocs(context, docsDir);
  } else {
    await generateComprehensiveDocs(context, docsDir);
  }

  context.logger.success('Documentation structure initialized');
}

/**
 * Generate README
 */
async function generateReadme(context: CommandContext, outputDir: string): Promise<void> {
  const content = `# ${context.config.projectName || 'Project'} Documentation

Welcome to the ${context.config.projectName || 'project'} documentation.

## Overview

This project is built with the Enzyme React framework.

## Quick Start

See [Getting Started](./getting-started.md) for setup instructions.

## Architecture

See [Architecture](./architecture.md) for system design details.

## Features

${Object.entries(context.config.features || {})
  .filter(([_, enabled]) => enabled)
  .map(([feature]) => `- ${feature.charAt(0).toUpperCase() + feature.slice(1)}`)
  .join('\n')}

## Documentation

- [Getting Started](./getting-started.md)
- [Architecture](./architecture.md)
- [Components](./components/)
- [API Reference](./api/)

## Development

### Prerequisites

- Node.js ${context.config.build?.target || 'es2020'} or higher
- ${context.config.typescript ? 'TypeScript' : 'JavaScript'}
- Package Manager: npm, yarn, or pnpm

### Installation

\`\`\`bash
npm install
\`\`\`

### Development Server

\`\`\`bash
npm run dev
\`\`\`

### Build

\`\`\`bash
npm run build
\`\`\`

### Testing

\`\`\`bash
npm test
\`\`\`

## License

MIT
`;

  await writeFile(join(outputDir, 'README.md'), content, { recursive: true, overwrite: true });
}

/**
 * Generate Getting Started guide
 */
async function generateGettingStarted(context: CommandContext, outputDir: string): Promise<void> {
  const content = `# Getting Started

## Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd ${context.config.projectName || 'project'}
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Start development server:
\`\`\`bash
npm run dev
\`\`\`

## Project Structure

\`\`\`
${context.config.srcDir || 'src'}/
├── components/     # Reusable UI components
├── pages/          # Page components
├── hooks/          # Custom React hooks
├── services/       # API and business logic services
├── store/          # State management
├── routes/         # Application routes
└── lib/            # Utility libraries
\`\`\`

## Configuration

The project is configured via \`enzyme.config.js\` or \`.enzymerc.json\`.

### Key Configuration Options

- **features**: Enabled framework features
- **generators**: Paths for generated code
- **style**: Code style preferences
- **testing**: Testing framework configuration
- **linting**: Linting and formatting rules

## Development Workflow

1. Create a feature branch
2. Make changes
3. Run tests: \`npm test\`
4. Commit changes
5. Push and create pull request

## Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm test\` - Run tests
- \`npm run lint\` - Lint code
- \`npm run format\` - Format code

## Next Steps

- Read the [Architecture](./architecture.md) documentation
- Explore the [Component Library](./components/)
- Check out [API Documentation](./api/)
`;

  await writeFile(join(outputDir, 'getting-started.md'), content, { recursive: true, overwrite: true });
}

/**
 * Generate Architecture documentation
 */
async function generateArchitectureDocs(context: CommandContext, outputDir: string): Promise<void> {
  const content = `# Architecture

## Overview

This project follows a modular architecture built on the Enzyme framework.

## Core Principles

1. **Component-Based**: UI is built from reusable components
2. **Type-Safe**: Full TypeScript support for type safety
3. **Feature-Driven**: Organized by features, not file types
4. **Testable**: Built with testing in mind

## Technology Stack

### Frontend
- **Framework**: React with Enzyme
- **Language**: ${context.config.typescript ? 'TypeScript' : 'JavaScript'}
- **Styling**: ${context.config.style ? 'Configured' : 'CSS'}
- **State Management**: ${context.config.features?.state ? 'Zustand' : 'React Context'}
- **Routing**: ${context.config.features?.routing ? 'React Router' : 'Built-in'}

### Development
- **Build Tool**: Vite
- **Testing**: ${context.config.testing?.framework || 'Jest/Vitest'}
- **Linting**: ${context.config.linting?.enabled ? 'ESLint + Prettier' : 'None'}

## Directory Structure

\`\`\`
${context.config.projectName || 'project'}/
├── src/
│   ├── components/          # Shared UI components
│   ├── pages/               # Page components
│   ├── hooks/               # Custom hooks
│   ├── services/            # Business logic
│   ├── store/               # Global state
│   ├── routes/              # Route configuration
│   ├── lib/                 # Utilities
│   └── types/               # TypeScript types
├── public/                  # Static assets
├── tests/                   # Test suites
└── docs/                    # Documentation
\`\`\`

## Data Flow

1. **User Action** → Component
2. **Component** → Service/API
3. **Service** → State Update
4. **State** → Component Re-render

## State Management

${
  context.config.features?.state
    ? `
Uses Zustand for global state management:
- **Store**: Centralized state container
- **Selectors**: Optimized state selection
- **Actions**: State modification methods
`
    : 'Uses React Context for state management'
}

## Routing

${
  context.config.features?.routing
    ? `
Uses React Router for navigation:
- **Routes**: Declarative route configuration
- **Lazy Loading**: Code splitting for pages
- **Protected Routes**: Authentication guards
`
    : 'Uses basic routing'
}

## API Integration

Services handle all API communication:
- RESTful API clients
- Type-safe API calls
- Error handling
- Request/response interceptors

## Testing Strategy

${
  context.config.testing?.coverage
    ? `
- **Unit Tests**: Component and function testing
- **Integration Tests**: Feature testing
- **Coverage Target**: ${context.config.testing.coverageThreshold?.statements || 80}%
- **Framework**: ${context.config.testing.framework || 'Jest'}
`
    : 'Testing not configured'
}

## Build Process

1. TypeScript compilation
2. Asset optimization
3. Code splitting
4. Minification
5. Source maps generation

## Deployment

The build output is optimized for production:
- Minified bundles
- Tree-shaking
- Asset optimization
- Service worker (if configured)
`;

  await writeFile(join(outputDir, 'architecture.md'), content, { recursive: true, overwrite: true });
}

/**
 * Generate basic docs
 */
async function generateBasicDocs(context: CommandContext, docsDir: string): Promise<void> {
  context.logger.info('Creating basic documentation structure...');

  await ensureDir(join(docsDir, 'components'));
  await ensureDir(join(docsDir, 'api'));
  await ensureDir(join(docsDir, 'guides'));

  // Create index
  const index = `# Documentation Index

- [Getting Started](./getting-started.md)
- [Architecture](./architecture.md)
- [Components](./components/)
- [API](./api/)
- [Guides](./guides/)
`;

  await writeFile(join(docsDir, 'index.md'), index, { recursive: true, overwrite: true });
}

/**
 * Generate comprehensive docs
 */
async function generateComprehensiveDocs(context: CommandContext, docsDir: string): Promise<void> {
  context.logger.info('Creating comprehensive documentation structure...');

  // Create all directories
  const dirs = ['components', 'api', 'guides', 'examples', 'reference', 'troubleshooting'];

  for (const dir of dirs) {
    await ensureDir(join(docsDir, dir));
  }

  // Create comprehensive index
  const index = `# Comprehensive Documentation

## Getting Started
- [Installation](./getting-started.md)
- [Quick Start Guide](./guides/quick-start.md)
- [Configuration](./guides/configuration.md)

## Architecture
- [Overview](./architecture.md)
- [Design Patterns](./architecture/patterns.md)
- [Data Flow](./architecture/data-flow.md)

## Components
- [Component Library](./components/)
- [Component API](./components/api.md)
- [Best Practices](./components/best-practices.md)

## API Reference
- [Hooks](./api/hooks.md)
- [Services](./api/services.md)
- [Utilities](./api/utilities.md)

## Guides
- [Creating Components](./guides/creating-components.md)
- [State Management](./guides/state-management.md)
- [Routing](./guides/routing.md)
- [Testing](./guides/testing.md)

## Examples
- [Common Patterns](./examples/patterns.md)
- [Code Snippets](./examples/snippets.md)

## Troubleshooting
- [Common Issues](./troubleshooting/common-issues.md)
- [FAQ](./troubleshooting/faq.md)
`;

  await writeFile(join(docsDir, 'index.md'), index, { recursive: true, overwrite: true });
}

/**
 * Generate component documentation
 */
async function generateComponentDoc(context: CommandContext, name: string): Promise<void> {
  context.logger.info(`Generating documentation for ${name}...`);

  const docsDir = resolve(context.cwd, 'docs/components');
  await ensureDir(docsDir);

  const content = `# ${name}

## Overview

Description of ${name} component.

## Usage

\`\`\`tsx
import { ${name} } from './components/${name}';

function Example() {
  return (
    <${name} />
  );
}
\`\`\`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| - | - | - | - |

## Examples

### Basic Example

\`\`\`tsx
<${name} />
\`\`\`

### Advanced Example

\`\`\`tsx
<${name} />
\`\`\`

## API Reference

### Methods

None

### Events

None

## Accessibility

- Follows WAI-ARIA guidelines
- Keyboard navigation support
- Screen reader friendly

## Related Components

-

## Changelog

### v1.0.0
- Initial release
`;

  const filePath = join(docsDir, `${name}.md`);
  await writeFile(filePath, content, { recursive: true, overwrite: context.options.force });

  context.logger.success(`Documentation created: ${filePath}`);
}

/**
 * Generate API documentation
 */
async function generateApiDocs(context: CommandContext): Promise<void> {
  context.logger.info('Generating API documentation...');

  const docsDir = resolve(context.cwd, 'docs/api');
  await ensureDir(docsDir);

  // Generate hooks documentation
  const hooksDoc = `# Hooks API

## Core Hooks

### useAppStore

Access global application state.

\`\`\`tsx
const { user, setUser } = useAppStore();
\`\`\`

${
  context.config.features?.auth
    ? `
### useAuth

Authentication hook.

\`\`\`tsx
const { user, login, logout } = useAuth();
\`\`\`
`
    : ''
}

${
  context.config.features?.theme
    ? `
### useTheme

Theme management hook.

\`\`\`tsx
const { theme, setTheme } = useTheme();
\`\`\`
`
    : ''
}

${
  context.config.features?.routing
    ? `
### useRouter

Router navigation hook.

\`\`\`tsx
const { navigate, params } = useRouter();
\`\`\`
`
    : ''
}
`;

  await writeFile(join(docsDir, 'hooks.md'), hooksDoc, { recursive: true, overwrite: true });

  context.logger.success('API documentation generated');
}
