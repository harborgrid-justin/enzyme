# Contributing to Enzyme CLI

Thank you for your interest in contributing to the Enzyme CLI! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 20.0.0 or higher
- npm 10.0.0 or higher
- Git

### Getting Started

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/your-username/enzyme-cli.git
   cd enzyme-cli
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the CLI:
   ```bash
   npm run build
   ```

4. Link for local testing:
   ```bash
   npm link
   ```

5. Test the CLI:
   ```bash
   enzyme --version
   ```

## Development Workflow

### Building

```bash
# Build once
npm run build

# Build and watch for changes
npm run dev
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Linting and Formatting

```bash
# Check code style
npm run lint
npm run format:check

# Fix code style
npm run lint:fix
npm run format
```

### Type Checking

```bash
npm run typecheck
```

### Running All Checks

```bash
npm run verify
```

## Project Structure

```
src/
├── commands/           # CLI command implementations
├── generators/         # Code generators (components, projects, etc.)
├── config/            # Configuration management
├── utils/             # Shared utilities
├── types/             # TypeScript type definitions
├── prompts/           # Interactive prompts
├── migrate/           # Migration tools
├── plugins/           # Plugin system
├── validation/        # Code validation
└── index.ts          # CLI entry point
```

## Adding New Commands

1. Create a new file in `src/commands/`
2. Implement the command following the existing pattern
3. Register the command in `src/index.ts`
4. Add tests for the command
5. Update documentation

Example command structure:

```typescript
// src/commands/my-command.ts
import { Command } from 'commander';
import { logger } from '../utils/logger.js';

export function createMyCommand(): Command {
  const cmd = new Command('my-command')
    .description('Description of my command')
    .argument('<arg>', 'Argument description')
    .option('-o, --option <value>', 'Option description')
    .action(async (arg, options) => {
      try {
        logger.info(`Executing my-command with arg: ${arg}`);
        // Implementation here
      } catch (error) {
        logger.error('Command failed:', error);
        process.exit(1);
      }
    });

  return cmd;
}
```

## Adding New Generators

1. Create a new directory in `src/generators/`
2. Implement the generator following existing patterns
3. Add templates if needed
4. Register in `src/generators/index.ts`
5. Add tests and documentation

Example generator structure:

```typescript
// src/generators/my-feature/index.ts
import { BaseGenerator } from '../base.js';
import { GeneratorOptions } from '../types.js';

export class MyFeatureGenerator extends BaseGenerator {
  constructor(options: GeneratorOptions) {
    super(options);
  }

  async generate(): Promise<void> {
    // Implementation here
  }
}
```

## Testing

### Unit Tests

Write tests for utilities and core logic:

```typescript
// src/utils/__tests__/my-util.test.ts
import { describe, it, expect } from 'jest';
import { myUtil } from '../my-util.js';

describe('myUtil', () => {
  it('should do something', () => {
    expect(myUtil('input')).toBe('expected');
  });
});
```

### Integration Tests

Test CLI commands end-to-end:

```typescript
// src/commands/__tests__/my-command.test.ts
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';

describe('my-command', () => {
  it('should create expected files', () => {
    const testDir = join(tmpdir(), 'test-project');
    execSync(`enzyme my-command test-arg --option value`, {
      cwd: testDir,
    });
    // Assertions here
  });
});
```

## Documentation

### Code Documentation

- Use JSDoc comments for public APIs
- Include examples in documentation
- Keep README.md updated with new features

### Commit Messages

Follow conventional commits:

```
feat: add new generator for components
fix: resolve template rendering issue
docs: update installation instructions
test: add integration tests for new command
```

## Pull Request Process

1. Create a feature branch:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make changes with proper tests and documentation

3. Run all checks:
   ```bash
   npm run verify
   ```

4. Commit changes:
   ```bash
   git add .
   git commit -m "feat: add my feature"
   ```

5. Push and create pull request:
   ```bash
   git push origin feature/my-feature
   ```

6. Fill out the PR template completely

7. Address review feedback

## Release Process

Releases are automated but follow this process:

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create release commit
4. Tag the release
5. Push to trigger CI/CD

## Code Style

### TypeScript

- Use strict TypeScript settings
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Use enums for constants

### Import/Export

- Use ES modules (`import`/`export`)
- Group imports: Node.js built-ins, third-party, local
- Use default exports for main module exports
- Use named exports for utilities

### Error Handling

- Use custom error types when appropriate
- Provide helpful error messages
- Include context in error logs
- Graceful degradation where possible

### CLI Design

- Follow CLI best practices
- Provide helpful help text
- Support both interactive and non-interactive modes
- Include progress indicators for long operations

## Getting Help

- Check existing issues and discussions
- Join our Discord community
- Ask questions in pull requests
- Contact maintainers directly for complex issues

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). Please read and follow it.

## License

By contributing to Enzyme CLI, you agree that your contributions will be licensed under the MIT License.