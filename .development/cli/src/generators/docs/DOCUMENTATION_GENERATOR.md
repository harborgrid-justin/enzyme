# Documentation Generator - Complete Guide

## Overview

The enzyme documentation generator is a comprehensive tool that automatically generates documentation from TypeScript source code. It extracts JSDoc comments, type information, and code structure to create beautiful, searchable documentation in multiple formats.

## Architecture

### Component Overview

```
docs/
├── index.ts              # Main entry point and CLI commands
├── parser.ts             # TypeScript compiler API parser
├── utils.ts              # Markdown and utility functions
├── api-docs.ts          # API documentation generator
├── component-docs.ts    # Component documentation generator
├── hooks-docs.ts        # Hooks reference generator
├── route-docs.ts        # Route documentation generator
├── interactive.ts       # Search and interactive features
├── server.ts            # Live documentation server
├── types.ts             # TypeScript type definitions
├── README.md            # User documentation
└── templates/           # Handlebars templates
    ├── api-reference.md.hbs
    ├── component.md.hbs
    ├── hook.md.hbs
    ├── module.md.hbs
    └── index.md.hbs
```

## Features

### 1. TypeScript Parser

**File**: `parser.ts`

The parser uses the TypeScript Compiler API to extract metadata from source files:

- **Function Declarations**: Extracts signatures, parameters, return types, and JSDoc
- **Interface Declarations**: Extracts properties, extends clauses, and documentation
- **React Components**: Identifies components and extracts props interfaces
- **Custom Hooks**: Detects hooks (functions starting with "use") and their dependencies
- **Generic Types**: Handles type parameters and complex generic types
- **JSDoc Comments**: Parses all JSDoc tags including examples, deprecation notices, etc.

**Key Classes**:
- `TypeScriptParser`: Main parser class
- `ParsedSymbol`: Base interface for parsed symbols
- `ParsedFunction`: Function-specific metadata
- `ParsedInterface`: Interface-specific metadata
- `ParsedComponent`: Component-specific metadata
- `ParsedHook`: Hook-specific metadata

### 2. Documentation Generators

#### API Documentation (`api-docs.ts`)

Generates comprehensive API documentation for all exported functions and interfaces.

**Features**:
- Groups APIs by module/category
- Generates function signatures with type parameters
- Creates parameter tables with types and descriptions
- Includes usage examples from JSDoc
- Links related documentation
- Supports multiple output formats

**Output Structure**:
```
docs/api/
├── index.md
├── auth/
│   ├── authenticate.md
│   └── authorize.md
├── state/
│   ├── createStore.md
│   └── useStore.md
└── ...
```

#### Component Documentation (`component-docs.ts`)

Generates documentation for React components with props, examples, and usage tips.

**Features**:
- Extracts component props with types
- Generates props tables
- Lists hooks used by component
- Shows related components
- Includes accessibility guidelines
- Provides usage examples

**Output Structure**:
```
docs/components/
├── index.md
├── ui/
│   ├── Button.md
│   ├── Card.md
│   └── Modal.md
└── ...
```

#### Hooks Documentation (`hooks-docs.ts`)

Creates comprehensive reference for custom React hooks.

**Features**:
- Documents hook signatures and parameters
- Shows hook dependencies
- Provides usage examples
- Includes troubleshooting tips
- Lists common patterns
- Cross-references related hooks

**Output Structure**:
```
docs/hooks/
├── index.md
├── state/
│   ├── useGlobalStore.md
│   └── useLocalState.md
├── data/
│   └── useQuery.md
└── ...
```

#### Route Documentation (`route-docs.ts`)

Generates documentation for application routes with auth, guards, and structure.

**Features**:
- Visual route tree with ASCII art
- Documents auth requirements
- Shows role-based access control
- Lists route guards
- Documents loaders and actions
- Creates route reference tables

**Output Structure**:
```
docs/routes/
├── index.md
├── route-tree.md
├── route-reference.md
└── auth-guards.md
```

### 3. Interactive Features

#### Search (`interactive.ts`)

Provides full-text search capabilities for documentation.

**Features**:
- Builds inverted index of all documentation
- Tokenizes content for fast searching
- Ranks results by relevance
- Client-side search for static sites
- JSON export for custom implementations

**Implementation**:
```typescript
// Build search index
const searchIndex = await buildSearchIndex('./docs');

// Search
const results = search('authentication', searchIndex);

// Generate search page
await generateSearchPage('./docs');
```

#### Navigation

Generates navigation sidebars, breadcrumbs, and cross-links.

**Features**:
- Automatic sidebar generation
- Breadcrumb navigation
- Cross-reference links
- Category organization
- Responsive design

### 4. Live Documentation Server

**File**: `server.ts`

A development server for viewing and testing documentation locally.

**Features**:
- HTTP server with markdown rendering
- Hot reload on file changes
- Search API endpoint
- Static asset serving
- Custom styling support
- Auto-rebuild on changes

**Usage**:
```bash
enzyme docs serve -p 3000
```

**Endpoints**:
- `GET /` - Index page
- `GET /:path.md` - Render markdown file
- `GET /search-index.json` - Search index
- `GET /styles.css` - Custom styles
- `GET /app.js` - Client-side JavaScript

### 5. Utilities

**File**: `utils.ts`

Comprehensive utility functions for documentation generation.

**Markdown Generation**:
- `heading()` - Generate headings
- `paragraph()` - Create paragraphs
- `codeBlock()` - Format code blocks
- `table()` - Generate tables
- `list()` - Create lists
- `link()` - Format links

**Documentation Helpers**:
- `parametersTable()` - Generate parameter tables
- `propertiesTable()` - Generate property tables
- `generateTOC()` - Create table of contents
- `formatExample()` - Format code examples
- `crossReference()` - Create cross-reference links

**File Operations**:
- `writeDocFile()` - Write documentation files
- `readFile()` - Read file content
- `findFiles()` - Search for files
- `isNewer()` - Check file modification times

**Utilities**:
- `slugify()` - Convert text to URL-safe slugs
- `escapeMarkdown()` - Escape special characters
- `formatType()` - Format TypeScript types
- `groupBy()` - Group items by key

### 6. Templates

**Directory**: `templates/`

Handlebars templates for consistent documentation formatting.

**Available Templates**:

1. **api-reference.md.hbs**
   - API function and interface documentation
   - Includes signatures, parameters, examples

2. **component.md.hbs**
   - React component documentation
   - Props tables, examples, related components

3. **hook.md.hbs**
   - Custom hook documentation
   - Parameters, dependencies, usage tips

4. **module.md.hbs**
   - Module overview documentation
   - Exports list, usage examples

5. **index.md.hbs**
   - Documentation index page
   - Navigation, statistics, quick start

**Custom Helpers**:
- `slug` - Convert to URL slug
- `join` - Join array with separator
- `add` - Add numbers
- `capitalize` - Capitalize text

## Usage Examples

### Basic Documentation Generation

```bash
# Generate all documentation
enzyme docs generate

# Generate to custom output directory
enzyme docs generate -o ./my-docs

# Generate in JSON format
enzyme docs generate -f json

# Incremental generation
enzyme docs generate -i
```

### Specific Documentation Types

```bash
# API documentation only
enzyme docs api

# Component documentation
enzyme docs components

# Hooks reference
enzyme docs hooks

# Route documentation
enzyme docs routes
```

### Local Development Server

```bash
# Start server (default port 3000)
enzyme docs serve

# Custom port
enzyme docs serve -p 8080

# Custom directory
enzyme docs serve -d ./my-docs

# Disable watch mode
enzyme docs serve --no-watch
```

### Programmatic Usage

```typescript
import { generateAllDocs } from './generators/docs/api-docs';
import { generateComponentDocs } from './generators/docs/component-docs';

// Generate API docs
await generateAllDocs({
  projectRoot: process.cwd(),
  srcDir: './src',
  outputDir: './docs/api',
  format: 'markdown',
  incremental: false,
});

// Generate component docs
await generateComponentDocs({
  projectRoot: process.cwd(),
  srcDir: './src',
  outputDir: './docs/components',
  format: 'markdown',
  incremental: false,
});
```

## Writing Documentation-Friendly Code

### Functions

```typescript
/**
 * Authenticates a user with the given credentials
 *
 * This function validates the credentials and returns a JWT token
 * if authentication is successful.
 *
 * @param credentials - User login credentials
 * @param options - Optional authentication options
 * @returns Promise resolving to authentication result
 * @throws {AuthenticationError} When credentials are invalid
 * @throws {NetworkError} When network request fails
 *
 * @example
 * ```typescript
 * const result = await authenticate({
 *   email: 'user@example.com',
 *   password: 'secure-password'
 * });
 *
 * if (result.success) {
 *   console.log('Authenticated:', result.user);
 * }
 * ```
 *
 * @since 1.0.0
 * @see authorize
 */
export async function authenticate(
  credentials: LoginCredentials,
  options?: AuthOptions
): Promise<AuthResult> {
  // Implementation
}
```

### Interfaces

```typescript
/**
 * User authentication credentials
 *
 * Contains the information required to authenticate a user
 *
 * @example
 * ```typescript
 * const credentials: LoginCredentials = {
 *   email: 'user@example.com',
 *   password: 'secure-password',
 *   rememberMe: true
 * };
 * ```
 */
export interface LoginCredentials {
  /** User's email address */
  email: string;

  /** User's password (will be hashed) */
  password: string;

  /** Keep user logged in for extended period */
  rememberMe?: boolean;
}
```

### React Components

```typescript
/**
 * A customizable button component
 *
 * Provides a consistent button interface with multiple variants,
 * sizes, and states.
 *
 * @example
 * ```tsx
 * <Button
 *   variant="primary"
 *   size="large"
 *   onClick={handleClick}
 *   disabled={isLoading}
 * >
 *   Click Me
 * </Button>
 * ```
 *
 * @related Link, IconButton
 * @since 1.0.0
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'default',
  size = 'medium',
  disabled = false,
  onClick,
  ...props
}) => {
  // Component implementation
};

/**
 * Props for the Button component
 */
export interface ButtonProps {
  /** Button content */
  children: React.ReactNode;

  /** Visual style variant */
  variant?: 'default' | 'primary' | 'secondary' | 'danger';

  /** Button size */
  size?: 'small' | 'medium' | 'large';

  /** Disable button interaction */
  disabled?: boolean;

  /** Click event handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}
```

### Custom Hooks

```typescript
/**
 * Manages local storage state with React
 *
 * Synchronizes component state with localStorage, automatically
 * saving and loading values.
 *
 * @param key - localStorage key
 * @param initialValue - Default value if key doesn't exist
 * @returns Tuple of [value, setValue] similar to useState
 *
 * @example
 * ```tsx
 * function UserPreferences() {
 *   const [theme, setTheme] = useLocalStorage('theme', 'light');
 *
 *   return (
 *     <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
 *       Toggle Theme (current: {theme})
 *     </button>
 *   );
 * }
 * ```
 *
 * @since 1.0.0
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  // Hook implementation
}
```

## Output Formats

### Markdown

Default format, compatible with GitHub and documentation sites.

**Advantages**:
- Version control friendly
- Easy to read and edit
- Wide tool support
- GitHub rendering

**Example**:
```markdown
# authenticate

![async](https://img.shields.io/badge/async-true-blue)
![exported](https://img.shields.io/badge/exported-true-green)

Authenticates a user with credentials

## Signature

```typescript
async function authenticate(credentials: LoginCredentials): Promise<User>
```
```

### HTML

Fully styled documentation with interactive features.

**Advantages**:
- Searchable
- Syntax highlighting
- Interactive navigation
- Copy code buttons

**Features**:
- Responsive design
- Dark/light theme support
- Search functionality
- Code highlighting

### JSON

Machine-readable format for custom rendering.

**Advantages**:
- Programmatic access
- Custom rendering
- API integration
- Data analysis

**Example**:
```json
{
  "name": "authenticate",
  "kind": "function",
  "filePath": "src/lib/auth/authenticate.ts",
  "documentation": "Authenticates a user with credentials",
  "parameters": [
    {
      "name": "credentials",
      "type": "LoginCredentials",
      "optional": false
    }
  ],
  "returnType": "Promise<User>",
  "isAsync": true,
  "isExported": true,
  "examples": ["..."]
}
```

## Best Practices

### 1. Write Comprehensive JSDoc

- Document all public APIs
- Include examples for complex functions
- Describe parameters and return values
- Mark deprecated APIs
- Use `@since` for version tracking

### 2. Organize Code Logically

- Group related functions in modules
- Use consistent naming conventions
- Export only public APIs
- Keep components focused

### 3. Provide Examples

- Show real-world usage
- Include edge cases
- Demonstrate best practices
- Test examples in code

### 4. Keep Documentation Updated

- Regenerate docs after changes
- Review generated docs in PRs
- Run generation in CI/CD
- Version documentation

### 5. Customize When Needed

- Use custom templates for branding
- Add custom CSS for styling
- Create category-specific templates
- Add custom helper functions

## Advanced Features

### Incremental Generation

Only regenerate files that have changed:

```typescript
const config: DocsConfig = {
  projectRoot: process.cwd(),
  srcDir: './src',
  outputDir: './docs',
  format: 'markdown',
  incremental: true, // Enable incremental mode
};
```

### Custom Templates

Create custom Handlebars templates:

```handlebars
{{! custom-template.md.hbs }}
---
title: {{title}}
---

# {{title}}

{{#if isDeprecated}}
⚠️ DEPRECATED
{{/if}}

{{documentation}}

## API Reference

{{#each methods}}
- **{{name}}**: {{description}}
{{/each}}
```

### Plugin System

Extend the generator with plugins:

```typescript
const plugin: Plugin = {
  name: 'custom-plugin',
  version: '1.0.0',
  init: (api) => {
    api.registerGenerator('custom', customGenerator);
    api.registerHelper('customHelper', customHelperFn);
    api.onAfterGenerate((result) => {
      console.log('Generated:', result.filesGenerated);
    });
  },
};
```

## Troubleshooting

### Common Issues

**Parser errors**:
- Ensure TypeScript code compiles
- Check JSDoc syntax
- Verify file paths

**Missing documentation**:
- Check export statements
- Verify file patterns
- Review JSDoc comments

**Search not working**:
- Rebuild search index
- Check server is running
- Verify JSON file exists

**Slow generation**:
- Use incremental mode
- Exclude unnecessary files
- Optimize file patterns

## Performance

### Optimization Tips

1. **Use Incremental Mode**: Only regenerate changed files
2. **Exclude Test Files**: Skip .test.ts and .spec.ts files
3. **Limit Depth**: Don't follow all imports
4. **Cache Results**: Use build cache in CI
5. **Parallel Processing**: Generate different types in parallel

### Benchmarks

Typical performance on medium-sized project:
- Parse 100 files: ~2 seconds
- Generate API docs: ~5 seconds
- Build search index: ~1 second
- Total: ~8 seconds

## Future Enhancements

- Visual component playground
- Interactive API explorer
- Version comparison
- Changelog generation
- Dependency graphs
- Coverage reports
- Performance metrics
- Accessibility audits

## Contributing

We welcome contributions to improve the documentation generator!

Areas for contribution:
- Additional output formats
- Template improvements
- Parser enhancements
- Performance optimizations
- Bug fixes
- Documentation

## License

MIT License - see LICENSE file for details
