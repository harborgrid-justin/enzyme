# Enzyme CLI Generators

This directory contains all code generators for the Enzyme CLI scaffolding tool.

## Overview

The Enzyme CLI provides powerful generators to scaffold common patterns and boilerplate code following enzyme framework conventions.

## Available Generators

### 1. Component Generator

Generate React components with enzyme patterns (memo, forwardRef, etc.)

```bash
enzyme generate component Button --type ui --with-test --with-story --memo --forward-ref
# or short form
enzyme g component Button -t ui
```

**Options:**
- `--type <ui|feature|shared|layout>` - Component category
- `--path <dir>` - Custom path
- `--with-styles` - Add styled component file
- `--with-story` - Add Storybook story
- `--with-test` - Add test file
- `--memo` - Wrap with React.memo (default: true)
- `--forward-ref` - Use forwardRef

### 2. Hook Generator

Generate custom React hooks with proper TypeScript types

```bash
enzyme generate hook useData --type query --with-test
# or
enzyme g hook useData -t query
```

**Options:**
- `--type <query|mutation|state|effect|callback|custom>` - Hook type
- `--with-test` - Add test file

### 3. Page Generator

Generate page components with enzyme Page layout

```bash
enzyme generate page Dashboard --with-query --with-state
# or
enzyme g page Dashboard
```

**Options:**
- `--route <path>` - Associated route
- `--layout <name>` - Layout to use
- `--with-state` - Add local state management
- `--with-query` - Add React Query integration
- `--with-form` - Add form handling

### 4. Route Generator

Generate route files following file-system routing conventions

```bash
enzyme generate route /users/:id --layout MainLayout --loader --action
# or
enzyme g route /users/:id
```

**Options:**
- `--layout <name>` - Use specific layout
- `--guard <name>` - Add route guard
- `--loader` - Add data loader
- `--action` - Add form action
- `--lazy` - Make lazy-loaded
- `--meta <title>` - Page title/meta

### 5. Module Generator

Generate complete feature modules with routes, state, API, and components

```bash
enzyme generate module Users --full
# or
enzyme g module Users --with-routes --with-state --with-api
```

**Options:**
- `--with-routes` - Include routes
- `--with-state` - Include state slice
- `--with-api` - Include API service
- `--with-components` - Include component folder
- `--with-hooks` - Include hooks folder
- `--full` - Include everything

### 6. Slice Generator

Generate Zustand store slices following enzyme patterns

```bash
enzyme generate slice users --with-crud --with-selectors
# or
enzyme g slice users
```

**Options:**
- `--with-crud` - Include CRUD operations
- `--with-selectors` - Generate memoized selectors
- `--with-persistence` - Add persistence middleware

### 7. Service Generator

Generate API services with React Query integration

```bash
enzyme generate service users --with-crud --with-cache --with-optimistic
# or
enzyme g service users
```

**Options:**
- `--with-crud` - Full CRUD endpoints
- `--with-cache` - Query caching
- `--with-optimistic` - Optimistic updates
- `--base-url <url>` - Custom base URL

## Architecture

### Base Generator

All generators extend the `BaseGenerator` class which provides:

- Template rendering with Handlebars
- File system operations
- Validation utilities
- Lifecycle hooks (beforeGenerate, afterGenerate, onError)
- Common helpers (logging, path resolution, etc.)

### Generator Structure

```
generators/
├── base.ts                  # Base generator class
├── types.ts                 # Shared TypeScript types
├── utils.ts                 # Utility functions
├── index.ts                 # Main exports
├── component/
│   └── index.ts            # Component generator
├── hook/
│   └── index.ts            # Hook generator
├── page/
│   └── index.ts            # Page generator
├── route/
│   └── index.ts            # Route generator
├── module/
│   └── index.ts            # Module generator
├── slice/
│   └── index.ts            # Slice generator
└── service/
    └── index.ts            # Service generator
```

## Creating a New Generator

1. Create a new directory: `generators/my-generator/`
2. Extend `BaseGenerator`:

```typescript
import { BaseGenerator, type GeneratorOptions, type GeneratedFile } from '../base';

export interface MyGeneratorOptions extends GeneratorOptions {
  // Your options here
}

export class MyGenerator extends BaseGenerator<MyGeneratorOptions> {
  protected getName(): string {
    return 'MyGenerator';
  }

  protected validate(): void {
    // Validate options
  }

  protected async generate(): Promise<GeneratedFile[]> {
    // Generate files
    return [];
  }
}
```

3. Add exports to `index.ts`

## Best Practices

1. **Validation**: Always validate options in the `validate()` method
2. **TypeScript**: Use strong typing for all options and generated code
3. **Templates**: Use Handlebars helpers for case conversions
4. **Testing**: Include test file generation options
5. **Documentation**: Generate comprehensive JSDoc comments
6. **Enzyme Patterns**: Follow enzyme conventions (memo, forwardRef, etc.)

## Template Helpers

Available Handlebars helpers:

- `{{pascalCase name}}` - PascalCase conversion
- `{{camelCase name}}` - camelCase conversion
- `{{kebabCase name}}` - kebab-case conversion
- `{{snakeCase name}}` - snake_case conversion
- `{{upperCase name}}` - UPPER_CASE conversion
- `{{if_eq a b}}` - Conditional equality
- `{{if_neq a b}}` - Conditional inequality
- `{{if_includes arr item}}` - Array includes check

## Contributing

When adding new generators:

1. Follow the existing generator structure
2. Extend `BaseGenerator`
3. Add comprehensive options
4. Generate production-ready code
5. Include proper documentation
6. Add examples to this README
