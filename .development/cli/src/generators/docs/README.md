# Documentation Generator

A powerful documentation generator for the enzyme framework that auto-generates comprehensive documentation from code and templates.

## Features

- **Automatic Code Parsing**: Extracts documentation from TypeScript source files using the TypeScript Compiler API
- **Multiple Documentation Types**: Generates API docs, component docs, hooks reference, and route documentation
- **Interactive Search**: Full-text search with client-side indexing
- **Live Server**: Local development server with hot reload
- **Multiple Output Formats**: Markdown, HTML, and JSON
- **Incremental Generation**: Only regenerates changed files for faster builds
- **Cross-linking**: Automatic links between related documentation

## Usage

### CLI Commands

```bash
# Generate all documentation
enzyme docs generate

# Generate specific documentation types
enzyme docs api          # API documentation
enzyme docs components   # Component documentation
enzyme docs hooks        # Hooks reference
enzyme docs routes       # Route documentation

# Serve documentation locally
enzyme docs serve        # Start server on port 3000
enzyme docs serve -p 8080  # Custom port
```

### Command Options

**Generate Command**

```bash
enzyme docs generate [options]

Options:
  -o, --output <path>      Output directory (default: ./docs)
  -f, --format <format>    Output format: markdown, html, json (default: markdown)
  -i, --incremental        Only regenerate changed files
  -v, --verbose            Verbose logging
```

**Serve Command**

```bash
enzyme docs serve [options]

Options:
  -p, --port <port>        Port to serve on (default: 3000)
  -d, --dir <directory>    Documentation directory (default: ./docs)
  --no-watch               Disable file watching
```

## Architecture

### Core Components

1. **TypeScript Parser** (`parser.ts`)
   - Uses TypeScript Compiler API to parse source files
   - Extracts JSDoc comments, function signatures, types
   - Handles generics and complex types

2. **Documentation Generators**
   - `api-docs.ts` - API documentation
   - `component-docs.ts` - Component documentation
   - `hooks-docs.ts` - Hooks reference
   - `route-docs.ts` - Route documentation

3. **Utilities** (`utils.ts`)
   - Markdown generation helpers
   - Table generators
   - Code block formatters
   - Link generators
   - TOC generation

4. **Interactive Features** (`interactive.ts`)
   - Search index builder
   - Navigation sidebar
   - Code copy buttons
   - Breadcrumb navigation

5. **Live Server** (`server.ts`)
   - HTTP server for local development
   - Hot reload on file changes
   - Markdown rendering
   - Search functionality

6. **Templates** (`templates/`)
   - Handlebars templates for consistent formatting
   - Customizable documentation layouts

## Documentation Structure

Generated documentation follows this structure:

```
docs/
├── index.md              # Main documentation index
├── api/                  # API documentation
│   ├── index.md
│   ├── auth/
│   │   └── *.md
│   ├── state/
│   │   └── *.md
│   └── ...
├── components/           # Component documentation
│   ├── index.md
│   ├── ui/
│   │   └── *.md
│   └── ...
├── hooks/                # Hooks reference
│   ├── index.md
│   ├── state/
│   │   └── *.md
│   └── ...
├── routes/               # Route documentation
│   ├── index.md
│   ├── route-tree.md
│   ├── route-reference.md
│   └── auth-guards.md
└── search-index.json     # Search index
```

## JSDoc Annotations

The documentation generator extracts information from JSDoc comments:

```typescript
/**
 * Authenticates a user with credentials
 *
 * @param credentials - User login credentials
 * @returns Promise resolving to authenticated user
 * @throws {AuthError} When authentication fails
 *
 * @example
 * ```typescript
 * const user = await authenticate({
 *   username: 'john@example.com',
 *   password: 'secret'
 * });
 * ```
 *
 * @since 1.0.0
 * @deprecated Use authenticateWithToken instead
 */
async function authenticate(credentials: Credentials): Promise<User> {
  // ...
}
```

### Supported JSDoc Tags

- `@param` - Parameter description
- `@returns` - Return value description
- `@throws` - Exception documentation
- `@example` - Usage examples
- `@since` - Version introduced
- `@deprecated` - Deprecation notice
- `@see` - Related documentation
- `@related` - Related components/functions

## Component Documentation

For React components, document props with JSDoc:

```typescript
interface ButtonProps {
  /** Button text content */
  children: React.ReactNode;

  /** Button variant style */
  variant?: 'primary' | 'secondary' | 'danger';

  /** Click event handler */
  onClick?: () => void;

  /** Disable button interaction */
  disabled?: boolean;
}

/**
 * A reusable button component
 *
 * @example
 * ```tsx
 * <Button variant="primary" onClick={handleClick}>
 *   Click me
 * </Button>
 * ```
 *
 * @related Link, IconButton
 */
export const Button: React.FC<ButtonProps> = ({ ... }) => {
  // ...
};
```

## Hooks Documentation

Custom hooks are automatically detected and documented:

```typescript
/**
 * Manages authentication state
 *
 * @param options - Hook configuration options
 * @returns Authentication state and methods
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, login, logout } = useAuth();
 *
 *   return (
 *     <div>
 *       {user ? (
 *         <button onClick={logout}>Logout</button>
 *       ) : (
 *         <button onClick={() => login(credentials)}>Login</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuth(options?: AuthOptions) {
  // ...
}
```

## Route Documentation

Routes are extracted from route configuration files:

```typescript
export const routes = [
  {
    path: '/dashboard',
    element: <Dashboard />,
    loader: dashboardLoader,
    guards: [authGuard],
    roles: ['admin', 'user'],
    meta: {
      title: 'Dashboard',
      description: 'Main application dashboard'
    }
  }
];
```

## Output Formats

### Markdown (Default)

Standard markdown files that can be viewed on GitHub or converted to other formats.

### HTML

Includes styling and interactive features:
- Searchable documentation
- Syntax highlighting
- Copy code buttons
- Navigation sidebar

### JSON

Machine-readable format for custom rendering:

```json
{
  "name": "authenticate",
  "kind": "function",
  "parameters": [...],
  "returnType": "Promise<User>",
  "documentation": "...",
  "examples": [...]
}
```

## Incremental Generation

Use the `--incremental` flag to only regenerate changed files:

```bash
enzyme docs generate --incremental
```

The generator compares file modification times and only processes files that have changed since the last generation.

## Search Functionality

The search feature:

1. Builds an inverted index of all documentation
2. Tokenizes content for fast searching
3. Ranks results by relevance
4. Provides instant client-side search

## Live Server

The documentation server provides:

- **Hot Reload**: Automatically reloads when files change
- **Markdown Rendering**: Converts markdown to HTML on-the-fly
- **Search API**: Serves search index for client-side search
- **Static Assets**: Serves CSS and JavaScript files

## Customization

### Custom Templates

Create custom Handlebars templates in `templates/`:

```handlebars
---
title: {{title}}
---

# {{title}}

{{#each sections}}
## {{name}}
{{content}}
{{/each}}
```

### Custom Styling

Add a `styles.css` file to your documentation directory:

```css
.content {
  max-width: 1200px;
  font-family: 'Your Font', sans-serif;
}
```

## Best Practices

1. **Write Good JSDoc Comments**: The quality of generated documentation depends on your JSDoc comments

2. **Provide Examples**: Include `@example` tags with working code snippets

3. **Document Props**: Always document component props with descriptions

4. **Keep It Updated**: Run documentation generation as part of your CI/CD pipeline

5. **Use Semantic Versioning**: Document when features were added with `@since` tags

6. **Mark Deprecations**: Use `@deprecated` to warn about deprecated APIs

## Troubleshooting

### Parser Errors

If the parser fails to extract documentation:

- Ensure your TypeScript code compiles without errors
- Check that JSDoc comments are properly formatted
- Verify that exported symbols are actually exported

### Missing Documentation

If some code isn't documented:

- Make sure the file matches the search patterns
- Check that the code is exported
- Verify JSDoc comments are present

### Search Not Working

If search functionality doesn't work:

- Rebuild the search index: `enzyme docs generate`
- Check that `search-index.json` was generated
- Verify the server is running

## Development

To work on the documentation generator:

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Test
npm test
```

## License

MIT License - see LICENSE file for details
