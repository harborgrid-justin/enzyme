# Testing Guide for Enzyme VS Code Extension

## Overview

This document provides comprehensive guidance on testing practices for the Enzyme VS Code Extension. The testing strategy includes unit tests, integration tests, and end-to-end tests with a focus on quality and maintainability.

## Table of Contents

- [Testing Stack](#testing-stack)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Testing Stack

### Core Testing Tools

- **Vitest**: Modern, fast unit test framework
- **VS Code Test API**: For integration testing with VS Code
- **@vscode/test-electron**: VS Code extension testing utilities

### Test Configuration

- **Unit Tests**: `/home/user/enzyme/vs-code/vitest.config.ts`
- **Integration Tests**: `/home/user/enzyme/vs-code/test/suite/`
- **TypeScript Config**: Strict mode enabled for better type safety

### Coverage Thresholds

Current coverage requirements:
- Lines: 75%
- Functions: 75%
- Branches: 70%
- Statements: 75%

## Test Structure

```
vs-code/
├── src/
│   ├── __mocks__/           # Module mocks (e.g., vscode.ts)
│   ├── test/
│   │   ├── helpers/         # Test utilities and helpers
│   │   │   ├── vscode-mock.ts
│   │   │   └── test-utils.ts
│   │   └── unit/            # Unit tests
│   │       ├── core/        # Core functionality tests
│   │       │   ├── logger.test.ts
│   │       │   ├── context.test.ts
│   │       │   └── security-utils.test.ts
│   │       └── commands/    # Command tests
│   └── ...
├── test/
│   └── suite/               # Integration tests
│       ├── extension.test.ts
│       ├── commands/
│       ├── language/
│       └── webviews/
└── vitest.config.ts
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run tests in watch mode
npm run test:unit -- --watch

# Run tests with coverage
npm run test:unit -- --coverage

# Run specific test file
npm run test:unit -- src/test/unit/core/logger.test.ts

# Run tests matching a pattern
npm run test:unit -- --grep "Logger"
```

### Integration Tests

```bash
# Run all tests (including integration)
npm test

# Run only integration tests
npm run test:integration
```

### Linting and Type Checking

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Check TypeScript types
npx tsc --noEmit

# Run all pre-commit checks
npm run pre-commit
```

## Writing Tests

### Unit Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock external dependencies
vi.mock('vscode');

import { YourModule } from '../path/to/module';

describe('YourModule', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
    vi.clearAllMocks();
  });

  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = YourModule.methodName(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle edge cases', () => {
      expect(() => YourModule.methodName(null)).toThrow();
    });
  });
});
```

### Mocking VS Code APIs

The VS Code API is mocked using the `__mocks__/vscode.ts` file:

```typescript
// In your test file
vi.mock('vscode');

import * as vscode from 'vscode';

describe('My Test', () => {
  it('should use VS Code API', () => {
    const mockVscode = require('vscode');
    mockVscode.window.showInformationMessage.mockResolvedValue('OK');

    // Your test code
  });
});
```

### Using Test Utilities

```typescript
import {
  wait,
  waitFor,
  createMock,
  createDeferred,
  createMockTimer,
} from '../../helpers/test-utils';

describe('Async Operations', () => {
  it('should wait for condition', async () => {
    let ready = false;
    setTimeout(() => { ready = true; }, 100);

    await waitFor(() => ready, { timeout: 1000 });
    expect(ready).toBe(true);
  });

  it('should work with timers', () => {
    const timer = createMockTimer();
    const callback = vi.fn();

    setTimeout(callback, 1000);
    timer.tick(1000);

    expect(callback).toHaveBeenCalled();
    timer.restore();
  });
});
```

### Testing Error Handling

```typescript
import { expectError } from '../../helpers/test-utils';

describe('Error Handling', () => {
  it('should throw specific error', async () => {
    const error = await expectError(
      () => functionThatThrows(),
      'Expected error message'
    );

    expect(error.name).toBe('ValidationError');
  });

  it('should handle async errors', async () => {
    await expect(asyncFunction()).rejects.toThrow('Error message');
  });
});
```

## Test Coverage

### Generating Coverage Reports

```bash
# Generate coverage report
npm run test:unit -- --coverage

# View HTML coverage report
open coverage/index.html
```

### Coverage Reports

Coverage is generated in multiple formats:
- **Text**: Console output during test run
- **HTML**: Detailed browsable report in `coverage/` directory
- **LCOV**: For CI/CD integration
- **JSON**: Machine-readable format

### Improving Coverage

1. **Identify uncovered code**:
   ```bash
   npm run test:unit -- --coverage --reporter=verbose
   ```

2. **Focus on critical paths**:
   - Core business logic
   - Security-sensitive code
   - Error handling
   - Edge cases

3. **Use coverage tools**:
   - Check HTML report for red (uncovered) lines
   - Add tests for uncovered branches

## Best Practices

### General Principles

1. **Test Behavior, Not Implementation**
   - Focus on what the code does, not how it does it
   - Avoid testing private methods directly
   - Test public APIs and contracts

2. **Keep Tests Simple**
   - One assertion per test when possible
   - Clear test names that describe the scenario
   - Follow Arrange-Act-Assert pattern

3. **Isolate Tests**
   - Each test should be independent
   - No shared state between tests
   - Use beforeEach/afterEach for setup/cleanup

4. **Use Meaningful Test Names**
   ```typescript
   // Good
   it('should return null when input is empty')
   it('should throw ValidationError for invalid email')

   // Bad
   it('test1')
   it('should work')
   ```

### TypeScript in Tests

1. **Use Strict Type Checking**
   - Tests benefit from TypeScript's type safety
   - Catch errors at compile time

2. **Type Your Mocks**
   ```typescript
   const mockFn = vi.fn<[string], boolean>();
   mockFn.mockReturnValue(true);
   ```

3. **Avoid `any` Type**
   - Use specific types or `unknown`
   - Better type safety and autocompletion

### Performance

1. **Parallel Execution**
   - Vitest runs tests in parallel by default
   - Ensure tests don't share state

2. **Mock External Dependencies**
   - Don't make real API calls
   - Mock file system operations
   - Mock VS Code APIs

3. **Use Setup Files Wisely**
   - Only include global setup that's needed
   - Avoid heavy initialization

### Security Testing

1. **Test Input Validation**
   ```typescript
   it('should sanitize user input', () => {
     const malicious = '<script>alert("XSS")</script>';
     const safe = sanitizeInput(malicious);
     expect(safe).not.toContain('<script>');
   });
   ```

2. **Test Path Traversal Prevention**
   ```typescript
   it('should prevent path traversal', () => {
     expect(sanitizePath('../../../etc/passwd')).toBeNull();
   });
   ```

3. **Test CSP Configuration**
   ```typescript
   it('should not allow unsafe-inline', () => {
     const csp = buildCsp(source, nonce);
     expect(csp).not.toContain('unsafe-inline');
   });
   ```

## Troubleshooting

### Common Issues

#### Tests fail with "Cannot find module 'vscode'"

**Solution**: Ensure `vi.mock('vscode')` is called before importing modules that use vscode:

```typescript
vi.mock('vscode'); // Must be before imports

import { MyModule } from '../path/to/module';
```

#### Mock not working

**Solution**: Check that:
1. Mock is defined in `__mocks__` directory or using `vi.mock()`
2. Mock is called before the module import
3. Clear mocks between tests with `vi.clearAllMocks()`

#### Coverage not updating

**Solution**:
1. Delete coverage directory: `rm -rf coverage`
2. Rerun tests with coverage: `npm run test:unit -- --coverage`

#### Type errors in tests

**Solution**:
1. Ensure test files are included in tsconfig.json
2. Use proper types for mocks
3. Check that VS Code types are installed: `@types/vscode`

### Debug Tests

1. **Use console.log**:
   ```typescript
   it('debug test', () => {
     console.log('Debug info:', variable);
     expect(variable).toBeDefined();
   });
   ```

2. **Run single test**:
   ```bash
   npm run test:unit -- src/test/unit/core/logger.test.ts
   ```

3. **Use VS Code debugger**:
   - Set breakpoints in test files
   - Use VS Code's built-in debugger
   - Configure launch.json for test debugging

## Continuous Integration

### GitHub Actions

Tests run automatically on:
- Pull requests
- Pushes to main branch
- Release tags

### Pre-commit Hooks

Run before each commit:
```bash
npm run pre-commit
```

This runs:
1. ESLint with auto-fix
2. Prettier formatting
3. TypeScript type checking
4. Unit tests

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [TypeScript Testing Best Practices](https://typescript-eslint.io/docs/)

## Contributing

When adding new features:

1. Write tests first (TDD approach recommended)
2. Ensure tests pass locally
3. Maintain or improve coverage
4. Follow existing test patterns
5. Document complex test scenarios

## License

MIT
