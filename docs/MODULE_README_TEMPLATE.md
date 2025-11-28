# Module README Template

> **Use this template** when creating README.md files for new modules, features, or library components.

---

## Copy-Paste Template

```markdown
# [Module Name]

> **Brief one-line description** of what this module does and why it exists.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Configuration](#configuration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Overview

### What is [Module Name]?

[2-3 paragraphs explaining what the module is, what problem it solves, and when to use it.]

### Key Features

- **Feature 1** - Brief description
- **Feature 2** - Brief description
- **Feature 3** - Brief description
- **Feature 4** - Brief description

### When to Use

Use this module when you need to:
- ✅ Use case 1
- ✅ Use case 2
- ✅ Use case 3

Don't use this module when:
- ❌ Anti-pattern 1
- ❌ Anti-pattern 2

---

## Features

### Core Features

#### Feature 1: [Name]

[Description of the feature and its benefits]

\`\`\`typescript
// Example code showing the feature
import { featureFunction } from '@/lib/module';

const result = featureFunction(params);
\`\`\`

#### Feature 2: [Name]

[Description of the feature and its benefits]

\`\`\`typescript
// Example code
\`\`\`

### Advanced Features

- **Advanced Feature 1** - Description
- **Advanced Feature 2** - Description

---

## Installation

### Prerequisites

- Node.js 20+
- [Other dependencies]
- [Required setup]

### Setup

1. **Install dependencies** (if standalone module)

\`\`\`bash
npm install [module-name]
\`\`\`

2. **Import the module**

\`\`\`typescript
import { MainExport } from '@/lib/[module-name]';
\`\`\`

3. **Configure** (if needed)

\`\`\`typescript
const config = {
  option1: value1,
  option2: value2,
};
\`\`\`

---

## Quick Start

### Basic Usage

\`\`\`typescript
import { useModule } from '@/lib/[module-name]';

function MyComponent() {
  const { data, isLoading, error } = useModule();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{data}</div>;
}
\`\`\`

### Common Patterns

#### Pattern 1: [Name]

\`\`\`typescript
// Code example
\`\`\`

#### Pattern 2: [Name]

\`\`\`typescript
// Code example
\`\`\`

---

## API Reference

### Main Exports

#### \`useModuleHook(options)\`

**Description**: Brief description of what this hook does.

**Parameters**:
- \`options\` (object, optional) - Configuration options
  - \`option1\` (string, required) - Description
  - \`option2\` (number, optional) - Description (default: 100)

**Returns**: \`ModuleResult\`
- \`data\` (T | null) - The data returned
- \`isLoading\` (boolean) - Loading state
- \`error\` (Error | null) - Error if occurred

**Example**:

\`\`\`typescript
const { data, isLoading, error } = useModuleHook({
  option1: 'value',
  option2: 200,
});
\`\`\`

#### \`ModuleComponent\`

**Description**: Component description.

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`prop1\` | \`string\` | - | Required prop description |
| \`prop2\` | \`number\` | \`100\` | Optional prop description |
| \`prop3\` | \`boolean\` | \`false\` | Optional prop description |

**Example**:

\`\`\`tsx
<ModuleComponent
  prop1="value"
  prop2={200}
  prop3={true}
/>
\`\`\`

### Types

\`\`\`typescript
// Main types exported by this module

interface ModuleOptions {
  option1: string;
  option2?: number;
}

interface ModuleResult {
  data: any;
  isLoading: boolean;
  error: Error | null;
}

type ModuleStatus = 'idle' | 'loading' | 'success' | 'error';
\`\`\`

---

## Examples

### Example 1: Basic Usage

**What**: [What this example demonstrates]

**When**: [When to use this pattern]

\`\`\`typescript
import { useModule } from '@/lib/[module-name]';

function BasicExample() {
  const { data } = useModule();

  return <div>{data}</div>;
}
\`\`\`

### Example 2: Advanced Usage

**What**: [What this example demonstrates]

**When**: [When to use this pattern]

\`\`\`typescript
// More complex example
\`\`\`

### Example 3: Integration

**What**: [How to integrate with other systems]

\`\`\`typescript
// Integration example
\`\`\`

### More Examples

See [Examples Directory](./examples/[module]-examples.md) for 20+ practical examples.

---

## Configuration

### Default Configuration

\`\`\`typescript
const defaultConfig = {
  timeout: 5000,
  retries: 3,
  cacheEnabled: true,
};
\`\`\`

### Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| \`VITE_MODULE_ENABLED\` | boolean | \`true\` | Enable/disable module |
| \`VITE_MODULE_TIMEOUT\` | number | \`5000\` | Request timeout in ms |

### Runtime Configuration

\`\`\`typescript
import { configureModule } from '@/lib/[module-name]';

configureModule({
  timeout: 10000,
  retries: 5,
});
\`\`\`

---

## Best Practices

### Do's ✅

1. **Do this** - Explanation of why
   \`\`\`typescript
   // Good example
   \`\`\`

2. **Do that** - Explanation of why
   \`\`\`typescript
   // Good example
   \`\`\`

3. **Do something else** - Explanation of why

### Don'ts ❌

1. **Don't do this** - Explanation of why not
   \`\`\`typescript
   // Bad example (don't do this)
   \`\`\`

2. **Don't do that** - Explanation of why not
   \`\`\`typescript
   // Bad example (don't do this)
   \`\`\`

### Performance Tips

- **Tip 1** - How to optimize
- **Tip 2** - How to optimize
- **Tip 3** - How to optimize

### Security Considerations

- **Consideration 1** - Security concern and how to address
- **Consideration 2** - Security concern and how to address

---

## Troubleshooting

### Common Issues

#### Issue 1: [Error message or problem]

**Symptoms**: What you see

**Cause**: Why it happens

**Solution**:
\`\`\`typescript
// How to fix it
\`\`\`

#### Issue 2: [Error message or problem]

**Symptoms**: What you see

**Cause**: Why it happens

**Solution**:
\`\`\`typescript
// How to fix it
\`\`\`

### Debugging

Enable debug mode:

\`\`\`typescript
import { enableDebug } from '@/lib/[module-name]';

enableDebug(true);
\`\`\`

### Getting Help

- **Check the FAQ**: [FAQ](../FAQ.md)
- **Search issues**: [GitHub Issues](https://github.com/repo/issues)
- **Ask a question**: [Discussions](https://github.com/repo/discussions)

---

## Architecture

### Design Decisions

- **Decision 1**: Why we chose this approach
- **Decision 2**: Trade-offs considered
- **Decision 3**: Alternatives rejected

### Dependencies

- \`dependency-1\` - What it's used for
- \`dependency-2\` - What it's used for

### Internal Structure

\`\`\`
[module-name]/
├── index.ts          # Public exports
├── types.ts          # TypeScript types
├── hooks/            # React hooks
│   └── useModule.ts
├── components/       # Components
│   └── Component.tsx
├── utils/            # Utility functions
│   └── helpers.ts
└── __tests__/        # Tests
    └── module.test.ts
\`\`\`

---

## Testing

### Running Tests

\`\`\`bash
npm test [module-name]
\`\`\`

### Writing Tests

\`\`\`typescript
import { renderHook } from '@testing-library/react';
import { useModule } from './useModule';

describe('useModule', () => {
  it('returns data correctly', () => {
    const { result } = renderHook(() => useModule());
    expect(result.current.data).toBeDefined();
  });
});
\`\`\`

### Test Coverage

- Target: 80%+ coverage
- Critical paths: 100% coverage
- Edge cases: Documented and tested

---

## Contributing

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: \`git checkout -b feature/my-feature\`
3. **Make your changes**
4. **Add tests**
5. **Update documentation**
6. **Submit a pull request**

### Development Setup

\`\`\`bash
# Clone the repo
git clone [repo-url]

# Install dependencies
npm install

# Run tests
npm test

# Start dev server
npm run dev
\`\`\`

### Code Style

Follow the [Contributing Guide](../src/lib/CONTRIBUTING.md) for:
- TypeScript conventions
- Naming patterns
- Testing requirements
- Documentation standards

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

---

## License

MIT License - see [LICENSE](../LICENSE) for details.

---

## See Also

### Related Modules

- [Related Module 1](../module-1/README.md) - Description
- [Related Module 2](../module-2/README.md) - Description

### Documentation

- [Architecture Overview](../docs/ARCHITECTURE.md) - System architecture
- [API Documentation](../docs/API.md) - API patterns
- [Examples](./examples/) - Code examples

### External Resources

- [Library Documentation](https://example.com) - External docs
- [Tutorial](https://example.com/tutorial) - Tutorial link

---

<p align="center">
  <strong>[Module Name]</strong><br>
  Brief tagline
</p>
```

---

## Template Instructions

### 1. File Location

Create your README.md in:
- Feature modules: `src/features/[feature-name]/README.md`
- Library modules: `src/lib/[module-name]/README.md`
- Standalone packages: `packages/[package-name]/README.md`

### 2. Customize Sections

#### Required Sections (Always Include)

- **Overview** - What, why, when
- **Quick Start** - Get started in < 5 minutes
- **API Reference** - All public exports
- **Examples** - At least 3 examples

#### Optional Sections (Include if Relevant)

- **Installation** - For standalone packages
- **Configuration** - If configurable
- **Best Practices** - Recommended patterns
- **Troubleshooting** - Common issues
- **Architecture** - For complex modules
- **Testing** - For library code

### 3. Fill in Placeholders

Replace all placeholders:
- `[Module Name]` → Actual module name
- `[module-name]` → kebab-case name
- `@/lib/[module-name]` → Actual import path
- `[Description]` → Actual descriptions
- Code examples → Real, working code

### 4. Add Real Examples

- **Use actual code** - Not pseudo-code
- **Make it runnable** - Users should be able to copy-paste
- **Show best practices** - Demonstrate recommended patterns
- **Cover common use cases** - Address real needs

### 5. Keep It Updated

- Update when APIs change
- Add examples as patterns emerge
- Document breaking changes
- Maintain version history

---

## Checklist

Before publishing your README:

### Content
- [ ] Overview clearly explains what and why
- [ ] Quick start is under 5 minutes
- [ ] API reference is complete
- [ ] At least 3 examples included
- [ ] All code examples work
- [ ] TypeScript types are documented

### Formatting
- [ ] Table of contents matches sections
- [ ] Code blocks have language specified
- [ ] Links are working
- [ ] Images (if any) load correctly
- [ ] Consistent heading levels

### Quality
- [ ] No spelling errors
- [ ] Grammar is correct
- [ ] Technical accuracy verified
- [ ] Examples follow best practices
- [ ] Security considerations addressed

---

## Good README Examples

### Example 1: Authentication Module

```markdown
# Authentication Module

> Secure authentication and authorization for Harbor React applications.

## Quick Start

\`\`\`tsx
import { AuthProvider, useAuth, RequireAuth } from '@/lib/auth';

<AuthProvider>
  <RequireAuth>
    <Dashboard />
  </RequireAuth>
</AuthProvider>
\`\`\`

## Features

- **JWT Authentication** - Secure token-based auth
- **SSO Integration** - SAML, OAuth2, OIDC support
- **RBAC** - Role-based access control
- **MFA** - Multi-factor authentication
```

### Example 2: Hooks Module

```markdown
# Custom Hooks

> Collection of reusable React hooks for common patterns.

## Available Hooks

### useDebounce

Debounce any value with configurable delay.

\`\`\`typescript
const debouncedValue = useDebounce(value, 300);
\`\`\`

### useLocalStorage

Persist state to localStorage with automatic sync.

\`\`\`typescript
const [value, setValue] = useLocalStorage('key', defaultValue);
\`\`\`
```

---

## Tips for Great READMEs

### 1. Start with the "Why"

Don't just say what it does - explain why it exists and what problem it solves.

❌ Bad:
> "This is a hook for managing state."

✅ Good:
> "State management hook that automatically persists to localStorage and syncs across tabs, perfect for user preferences and settings."

### 2. Show, Don't Tell

Use code examples liberally.

❌ Bad:
> "The hook accepts an options object with various configuration parameters."

✅ Good:
> ```typescript
> const { data } = useModule({
>   timeout: 5000,
>   retries: 3,
>   onError: handleError
> });
> ```

### 3. Progressive Disclosure

Start simple, add complexity gradually.

1. Simple example (2 lines)
2. Common pattern (10 lines)
3. Advanced usage (20+ lines)

### 4. Address Pain Points

Document the things that confused you when building it.

### 5. Link Generously

Connect to related docs, examples, and external resources.

---

## See Also

- [Documentation Best Practices](../src/lib/docs/BEST_PRACTICES.md)
- [Contributing Guide](../src/lib/CONTRIBUTING.md)
- [Footer Template](./_FOOTER_TEMPLATE.md)
- [Examples Directory](../src/lib/docs/examples/)

---

<p align="center">
  <strong>Module README Template</strong><br>
  Create comprehensive module documentation
</p>
