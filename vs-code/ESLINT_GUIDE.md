# Enterprise-Grade ESLint Configuration

This project uses a comprehensive ESLint setup with multiple plugins for enterprise-level code quality.

## Installed Plugins

### Core
- **ESLint 9.x** - Latest ESLint with flat config format
- **TypeScript ESLint 8.x** - Full TypeScript support with type-aware linting

### Code Quality
- **eslint-plugin-sonarjs** - Detects bugs and code smells
- **eslint-plugin-unicorn** - Modern JavaScript/TypeScript best practices
- **eslint-plugin-import** - ES6+ import/export validation
- **eslint-plugin-promise** - Promise best practices and error handling

### Security & Documentation
- **eslint-plugin-security** - Security vulnerability detection
- **eslint-plugin-jsdoc** - JSDoc comment validation

## Key Features

### 1. Type Safety
- Strict TypeScript rules with type-aware linting
- Explicit function return types
- No unsafe any usage
- Consistent type imports/exports

### 2. Code Quality
- Cognitive complexity limits (max 20)
- Function length limits (max 150 lines)
- Max parameters limit (5 params)
- Duplicate code detection
- Dead code elimination

### 3. Security
- Unsafe regex detection
- Child process security checks
- Timing attack prevention
- Buffer security validation

### 4. Best Practices
- Modern JavaScript patterns (ES2022+)
- Consistent naming conventions
- Import ordering and organization
- Promise handling enforcement
- Prefer nullish coalescing and optional chaining

### 5. Documentation
- Required JSDoc for public APIs
- Parameter and return documentation
- Type alias documentation

## Usage

### Lint the codebase
```bash
npm run lint
```

### Auto-fix issues
```bash
npm run lint:fix
```

### Generate JSON report
```bash
npm run lint:report
```

### CI/CD integration (zero warnings)
```bash
npm run lint:check
```

### Full CI pipeline
```bash
npm run ci
```

## Configuration Levels

- **Error**: Blocks build/commit - must be fixed
- **Warn**: Should be fixed but doesn't block
- **Off**: Disabled for this project

## Customization

Edit `eslint.config.js` to adjust rules for your needs:

```javascript
rules: {
  // Change rule severity
  'sonarjs/cognitive-complexity': ['warn', 30], // Increase from 20
  
  // Disable a rule
  'unicorn/filename-case': 'off',
  
  // Add custom configuration
  '@typescript-eslint/naming-convention': [...]
}
```

## VS Code Integration

Install the ESLint extension for real-time feedback:
- Extension ID: `dbaeumer.vscode-eslint`

Recommended settings.json:
```json
{
  "eslint.validate": ["typescript"],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.format.enable": true
}
```

## Pre-commit Hook

Consider adding a pre-commit hook using husky:

```bash
npm install --save-dev husky lint-staged
npx husky init
```

`.husky/pre-commit`:
```bash
#!/bin/sh
npm run pre-commit
```

## Metrics

The configuration enforces:
- Maximum cognitive complexity: 20
- Maximum function length: 150 lines
- Maximum parameters: 5
- Maximum nesting depth: 4
- Minimum duplicate string threshold: 5

## Disabled Rules

Some rules are intentionally disabled for VS Code extension development:
- `unicorn/no-null` - VS Code API uses null extensively
- `import/no-default-export` - VS Code requires default exports
- `security/detect-object-injection` - Too many false positives

## Resources

- [ESLint Documentation](https://eslint.org/docs/latest/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [SonarJS Rules](https://github.com/SonarSource/eslint-plugin-sonarjs)
- [Unicorn Rules](https://github.com/sindresorhus/eslint-plugin-unicorn)
