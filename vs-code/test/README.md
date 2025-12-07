# Enzyme VS Code Extension Test Suite

This directory contains the complete testing infrastructure for the Enzyme VS Code extension.

## Test Structure

```
test/
├── suite/                      # Integration tests (run in VS Code)
│   ├── extension.test.ts      # Extension activation tests
│   ├── treeviews/             # TreeView tests
│   │   ├── features-tree.test.ts
│   │   └── routes-tree.test.ts
│   ├── commands/              # Command tests
│   │   └── generate.test.ts
│   ├── language/              # Language feature tests
│   │   ├── completion.test.ts
│   │   └── hover.test.ts
│   ├── diagnostics/           # Diagnostic tests
│   │   └── diagnostics.test.ts
│   ├── webviews/              # Webview tests
│   │   └── state-inspector.test.ts
│   └── config/                # Configuration tests
│       └── config.test.ts
├── helpers/                   # Test utilities
│   ├── test-utils.ts         # Helper functions
│   └── mock-providers.ts     # Mock implementations
└── fixtures/                  # Test fixtures
    └── sample-project/       # Sample Enzyme project

src/test/unit/                 # Unit tests (run with Vitest)
├── parser.test.ts            # AST parser tests
└── diff.test.ts              # State diff tests
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### Watch Mode (Unit Tests)
```bash
npm run test:unit -- --watch
```

### With Coverage
```bash
npm run test:unit -- --coverage
```

## Writing Tests

### Integration Tests

Integration tests run in the VS Code extension host and have access to the full VS Code API.

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateExtension } from '../helpers/test-utils';

suite('My Feature Test Suite', () => {
  suiteSetup(async function() {
    this.timeout(30000);
    await activateExtension();
  });

  test('Should do something', async function() {
    this.timeout(10000);
    // Test implementation
    assert.ok(true);
  });
});
```

### Unit Tests

Unit tests run with Vitest and don't have access to VS Code API.

```typescript
import { describe, it, expect } from 'vitest';

describe('My Module', () => {
  it('should do something', () => {
    // Test implementation
    expect(true).toBe(true);
  });
});
```

## Test Helpers

### `test-utils.ts`

- `createMockContext()` - Create mock extension context
- `createMockDocument()` - Create mock text document
- `createMockWorkspace()` - Create mock workspace folder
- `waitForCondition()` - Wait for async condition
- `activateExtension()` - Activate extension for testing
- `createTempFile()` - Create temporary test file
- `executeCommand()` - Execute VS Code command
- `getDiagnostics()` - Get diagnostics for document

### `mock-providers.ts`

- `MockTreeDataProvider` - Mock tree view provider
- `MockWebviewPanel` - Mock webview panel
- `MockDiagnosticCollection` - Mock diagnostic collection
- `MockOutputChannel` - Mock output channel
- `MockTerminal` - Mock terminal

## Test Fixtures

The `fixtures/sample-project` directory contains a sample Enzyme project used for integration testing:

- `package.json` - Project configuration
- `src/features/dashboard/` - Sample feature
- `src/routes.ts` - Sample routes
- `src/stores/app-store.ts` - Sample Zustand store

## CI/CD

Tests run automatically on:

- Every push to `main` or `develop`
- Every pull request
- Multiple OS (Ubuntu, Windows, macOS)
- Multiple Node versions (18, 20)
- Multiple VS Code versions (stable, insiders)

See `.github/workflows/ci.yml` for details.

## Coverage Goals

- Lines: 70%
- Functions: 70%
- Branches: 70%
- Statements: 70%

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Cleanup**: Clean up resources in `teardown`/`suiteTeardown`
3. **Timeouts**: Set appropriate timeouts for async tests
4. **Assertions**: Use meaningful assertion messages
5. **Mocking**: Use mocks for external dependencies
6. **Fixtures**: Use test fixtures for consistent test data

## Debugging Tests

### VS Code Integration Tests

1. Open the extension project in VS Code
2. Set breakpoints in test files
3. Press F5 to launch Extension Development Host
4. Tests will run with debugger attached

### Unit Tests

```bash
npm run test:unit -- --inspect-brk
```

Then attach your debugger to the Node process.

## Common Issues

### Tests Timing Out

Increase timeout in test:
```typescript
test('My test', async function() {
  this.timeout(30000); // 30 seconds
  // ...
});
```

### Extension Not Activating

Ensure workspace has Enzyme project:
```typescript
const workspaceFolders = vscode.workspace.workspaceFolders;
assert.ok(workspaceFolders && workspaceFolders.length > 0);
```

### Mock Data Issues

Use test fixtures:
```typescript
const uri = vscode.Uri.file(path.join(__dirname, '../fixtures/sample-project'));
```

## Resources

- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Mocha Documentation](https://mochajs.org/)
- [Vitest Documentation](https://vitest.dev/)
- [Enzyme Framework Docs](https://enzyme-framework.dev)
