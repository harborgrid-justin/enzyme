/**
 * Test File Generator with Common Patterns
 *
 * Generates test files with common testing patterns for unit tests,
 * integration tests, and component tests using Jest, Vitest, or other frameworks.
 *
 * @example
 * ```typescript
 * const generator = new TestGenerator();
 * const testCode = generator.generateComponentTest({
 *   component: 'Button',
 *   testCases: ['renders correctly', 'handles click events']
 * });
 * ```
 *
 * @module generators/test
 */

/**
 * Test framework type
 */
export type TestFramework = 'jest' | 'vitest' | 'mocha' | 'jasmine';

/**
 * Test type
 */
export type TestType = 'unit' | 'integration' | 'e2e' | 'component';

/**
 * Test case definition
 */
export interface TestCase {
  /**
   * Test description
   */
  description: string;

  /**
   * Test body/implementation
   */
  body?: string;

  /**
   * Is async test
   */
  async?: boolean;

  /**
   * Skip this test
   */
  skip?: boolean;

  /**
   * Only run this test
   */
  only?: boolean;

  /**
   * Expected behavior
   */
  expected?: string;

  /**
   * Setup code
   */
  setup?: string;

  /**
   * Teardown code
   */
  teardown?: string;
}

/**
 * Test suite definition
 */
export interface TestSuite {
  /**
   * Suite description
   */
  description: string;

  /**
   * Test cases
   */
  tests: TestCase[];

  /**
   * Before all hook
   */
  beforeAll?: string;

  /**
   * After all hook
   */
  afterAll?: string;

  /**
   * Before each hook
   */
  beforeEach?: string;

  /**
   * After each hook
   */
  afterEach?: string;

  /**
   * Nested suites
   */
  nested?: TestSuite[];
}

/**
 * Component test options
 */
export interface ComponentTestOptions {
  /**
   * Component name
   */
  component: string;

  /**
   * Component import path
   */
  importPath?: string;

  /**
   * Test cases
   */
  testCases?: string[];

  /**
   * Props to test with
   */
  testProps?: Record<string, unknown>;

  /**
   * Include snapshot test
   */
  snapshot?: boolean;

  /**
   * Include accessibility tests
   */
  a11y?: boolean;

  /**
   * Testing library (default: '@testing-library/react')
   */
  testingLibrary?: string;
}

/**
 * Function test options
 */
export interface FunctionTestOptions {
  /**
   * Function name
   */
  functionName: string;

  /**
   * Function import path
   */
  importPath?: string;

  /**
   * Test cases with inputs and expected outputs
   */
  testCases?: Array<{
    description: string;
    input: unknown[];
    expected: unknown;
  }>;

  /**
   * Include edge cases
   */
  edgeCases?: boolean;
}

/**
 * Test generation options
 */
export interface TestGenerationOptions {
  /**
   * Test framework
   */
  framework?: TestFramework;

  /**
   * Test type
   */
  testType?: TestType;

  /**
   * Include mocks
   */
  mocks?: boolean;

  /**
   * Include setup/teardown
   */
  hooks?: boolean;

  /**
   * Coverage comments
   */
  coverage?: boolean;

  /**
   * TypeScript
   */
  typescript?: boolean;
}

/**
 * Test file generator
 *
 * @example
 * ```typescript
 * const generator = new TestGenerator({ framework: 'jest' });
 *
 * // Generate component test
 * const componentTest = generator.generateComponentTest({
 *   component: 'Button',
 *   testCases: ['renders with label', 'handles click'],
 *   snapshot: true
 * });
 *
 * // Generate function test
 * const functionTest = generator.generateFunctionTest({
 *   functionName: 'add',
 *   testCases: [
 *     { description: 'adds two numbers', input: [1, 2], expected: 3 },
 *     { description: 'handles negative numbers', input: [-1, -2], expected: -3 }
 *   ]
 * });
 *
 * // Generate custom test suite
 * const customTest = generator.generateTestSuite({
 *   description: 'UserService',
 *   tests: [
 *     { description: 'creates user', body: 'expect(service.create()).toBeDefined()' },
 *     { description: 'fetches user', body: 'expect(service.get(1)).toBeDefined()' }
 *   ]
 * });
 * ```
 */
export class TestGenerator {
  private framework: TestFramework;
  private options: Required<TestGenerationOptions>;

  constructor(options?: TestGenerationOptions) {
    this.framework = options?.framework || 'jest';
    this.options = {
      framework: this.framework,
      testType: 'unit',
      mocks: false,
      hooks: false,
      coverage: false,
      typescript: true,
      ...options,
    };
  }

  /**
   * Generate a component test file
   *
   * @param options - Component test options
   * @returns Generated test code
   *
   * @example
   * ```typescript
   * const code = generator.generateComponentTest({
   *   component: 'UserCard',
   *   importPath: '@/components/UserCard',
   *   testCases: ['renders user info', 'handles edit button click'],
   *   snapshot: true,
   *   a11y: true
   * });
   * ```
   */
  generateComponentTest(options: ComponentTestOptions): string {
    const {
      component,
      importPath = `./${component}`,
      testCases = [],
      testProps = {},
      snapshot = false,
      a11y = false,
      testingLibrary = '@testing-library/react',
    } = options;

    // Generate imports
    const imports = [
      `import { render, screen${testCases.length > 0 ? ', fireEvent' : ''} } from '${testingLibrary}';`,
      `import { ${component} } from '${importPath}';`,
    ];

    if (snapshot) {
      imports.push(`import { toMatchSnapshot } from 'jest-snapshot';`);
    }

    if (a11y) {
      imports.push(`import { axe, toHaveNoViolations } from 'jest-axe';`);
      imports.push(`expect.extend(toHaveNoViolations);`);
    }

    // Generate default test props
    const propsString = Object.keys(testProps).length > 0
      ? `const defaultProps = ${JSON.stringify(testProps, null, 2)};`
      : '';

    // Generate test cases
    const tests: string[] = [];

    // Render test
    tests.push(`  it('renders without crashing', () => {
    const { container } = render(<${component} ${propsString ? '{...defaultProps}' : ''} />);
    expect(container).toBeInTheDocument();
  });`);

    // Snapshot test
    if (snapshot) {
      tests.push(`
  it('matches snapshot', () => {
    const { container } = render(<${component} ${propsString ? '{...defaultProps}' : ''} />);
    expect(container).toMatchSnapshot();
  });`);
    }

    // A11y test
    if (a11y) {
      tests.push(`
  it('has no accessibility violations', async () => {
    const { container } = render(<${component} ${propsString ? '{...defaultProps}' : ''} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });`);
    }

    // Custom test cases
    testCases.forEach(testCase => {
      tests.push(`
  it('${testCase}', () => {
    render(<${component} ${propsString ? '{...defaultProps}' : ''} />);
    // TODO: Implement test
  });`);
    });

    return `${imports.join('\n')}

${propsString}

describe('${component}', () => {
${tests.join('\n')}
});
`;
  }

  /**
   * Generate a function/unit test file
   *
   * @param options - Function test options
   * @returns Generated test code
   *
   * @example
   * ```typescript
   * const code = generator.generateFunctionTest({
   *   functionName: 'calculateTotal',
   *   importPath: '@/utils/calculations',
   *   testCases: [
   *     { description: 'calculates sum', input: [[1, 2, 3]], expected: 6 },
   *     { description: 'handles empty array', input: [[]], expected: 0 }
   *   ],
   *   edgeCases: true
   * });
   * ```
   */
  generateFunctionTest(options: FunctionTestOptions): string {
    const {
      functionName,
      importPath = `./${functionName}`,
      testCases = [],
      edgeCases = false,
    } = options;

    // Generate imports
    const imports = `import { ${functionName} } from '${importPath}';`;

    // Generate test cases
    const tests: string[] = [];

    testCases.forEach(testCase => {
      const { description, input, expected } = testCase;
      const inputStr = input.map(i => JSON.stringify(i)).join(', ');
      const expectedStr = JSON.stringify(expected);

      tests.push(`  it('${description}', () => {
    const result = ${functionName}(${inputStr});
    expect(result).toEqual(${expectedStr});
  });`);
    });

    // Add edge cases
    if (edgeCases) {
      tests.push(`
  it('handles null/undefined', () => {
    expect(() => ${functionName}(null as any)).not.toThrow();
  });`);

      tests.push(`
  it('handles edge cases', () => {
    // TODO: Add edge case tests
  });`);
    }

    return `${imports}

describe('${functionName}', () => {
${tests.join('\n')}
});
`;
  }

  /**
   * Generate a test suite
   *
   * @param suite - Test suite definition
   * @returns Generated test code
   *
   * @example
   * ```typescript
   * const code = generator.generateTestSuite({
   *   description: 'UserRepository',
   *   beforeEach: 'mockDatabase.clear();',
   *   tests: [
   *     {
   *       description: 'finds user by id',
   *       body: 'const user = await repository.findById(1); expect(user).toBeDefined();',
   *       async: true
   *     }
   *   ]
   * });
   * ```
   */
  generateTestSuite(suite: TestSuite): string {
    const { description, tests, beforeAll, afterAll, beforeEach, afterEach, nested = [] } = suite;

    const hooks: string[] = [];

    if (beforeAll) {
      hooks.push(`  beforeAll(() => {\n    ${beforeAll}\n  });\n`);
    }

    if (afterAll) {
      hooks.push(`  afterAll(() => {\n    ${afterAll}\n  });\n`);
    }

    if (beforeEach) {
      hooks.push(`  beforeEach(() => {\n    ${beforeEach}\n  });\n`);
    }

    if (afterEach) {
      hooks.push(`  afterEach(() => {\n    ${afterEach}\n  });\n`);
    }

    const testCases = tests.map(test => this.generateTestCase(test)).join('\n');

    const nestedSuites = nested.map(s => this.generateTestSuite(s)).join('\n');

    return `describe('${description}', () => {
${hooks.join('\n')}${testCases}
${nestedSuites}
});
`;
  }

  /**
   * Generate a single test case
   */
  private generateTestCase(test: TestCase): string {
    const {
      description,
      body = '// TODO: Implement test',
      async = false,
      skip = false,
      only = false,
      setup,
      teardown,
    } = test;

    const testFunction = skip ? 'it.skip' : only ? 'it.only' : 'it';
    const asyncKeyword = async ? 'async ' : '';

    const setupCode = setup ? `\n    ${setup}\n` : '';
    const teardownCode = teardown ? `\n    ${teardown}\n` : '';

    return `  ${testFunction}('${description}', ${asyncKeyword}() => {${setupCode}
    ${body}${teardownCode}
  });
`;
  }

  /**
   * Generate mock for a module
   *
   * @param modulePath - Path to module to mock
   * @param mockImplementation - Mock implementation
   * @returns Mock code
   *
   * @example
   * ```typescript
   * const mock = generator.generateMock('@/services/api', {
   *   get: 'jest.fn()',
   *   post: 'jest.fn()'
   * });
   * ```
   */
  generateMock(modulePath: string, mockImplementation: Record<string, string>): string {
    if (this.framework === 'jest' || this.framework === 'vitest') {
      const mocks = Object.entries(mockImplementation)
        .map(([key, value]) => `  ${key}: ${value},`)
        .join('\n');

      return `jest.mock('${modulePath}', () => ({
${mocks}
}));
`;
    }

    return `// Mock not supported for ${this.framework}`;
  }

  /**
   * Generate setup/teardown utilities
   *
   * @param options - Setup options
   * @returns Setup code
   */
  generateSetup(options: {
    beforeAll?: string;
    afterAll?: string;
    beforeEach?: string;
    afterEach?: string;
  }): string {
    const { beforeAll, afterAll, beforeEach, afterEach } = options;

    const parts: string[] = [];

    if (beforeAll) {
      parts.push(`beforeAll(() => {\n  ${beforeAll}\n});`);
    }

    if (afterAll) {
      parts.push(`afterAll(() => {\n  ${afterAll}\n});`);
    }

    if (beforeEach) {
      parts.push(`beforeEach(() => {\n  ${beforeEach}\n});`);
    }

    if (afterEach) {
      parts.push(`afterEach(() => {\n  ${afterEach}\n});`);
    }

    return parts.join('\n\n');
  }
}

/**
 * Quick function to generate component test
 *
 * @param component - Component name
 * @param testCases - Test case descriptions
 * @returns Generated test code
 *
 * @example
 * ```typescript
 * const code = generateComponentTest('Button', [
 *   'renders correctly',
 *   'handles click'
 * ]);
 * ```
 */
export function generateComponentTest(
  component: string,
  testCases?: string[]
): string {
  const generator = new TestGenerator();
  return generator.generateComponentTest({ component, testCases });
}

/**
 * Quick function to generate function test
 *
 * @param functionName - Function name
 * @param testCases - Test cases with inputs and expected outputs
 * @returns Generated test code
 *
 * @example
 * ```typescript
 * const code = generateFunctionTest('add', [
 *   { description: 'adds numbers', input: [1, 2], expected: 3 }
 * ]);
 * ```
 */
export function generateFunctionTest(
  functionName: string,
  testCases?: Array<{ description: string; input: unknown[]; expected: unknown }>
): string {
  const generator = new TestGenerator();
  return generator.generateFunctionTest({ functionName, testCases });
}

/**
 * Common test templates
 */
export const testTemplates = {
  /**
   * React hook test template
   */
  hookTest: (hookName: string): string => {
    return `import { renderHook, act } from '@testing-library/react';
import { ${hookName} } from './${hookName}';

describe('${hookName}', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => ${hookName}());
    expect(result.current).toBeDefined();
  });

  it('updates state correctly', () => {
    const { result } = renderHook(() => ${hookName}());

    act(() => {
      // TODO: Trigger state update
    });

    // TODO: Assert state change
  });
});
`;
  },

  /**
   * API service test template
   */
  apiTest: (serviceName: string): string => {
    return `import { ${serviceName} } from './${serviceName}';

describe('${serviceName}', () => {
  let service: ${serviceName};

  beforeEach(() => {
    service = new ${serviceName}();
  });

  it('fetches data successfully', async () => {
    const data = await service.fetch();
    expect(data).toBeDefined();
  });

  it('handles errors', async () => {
    await expect(service.fetch()).rejects.toThrow();
  });
});
`;
  },

  /**
   * Integration test template
   */
  integrationTest: (feature: string): string => {
    return `describe('${feature} Integration', () => {
  beforeAll(async () => {
    // Setup test environment
  });

  afterAll(async () => {
    // Cleanup test environment
  });

  it('completes the full flow', async () => {
    // TODO: Implement integration test
  });
});
`;
  },

  /**
   * Snapshot test template
   */
  snapshotTest: (component: string): string => {
    return `import { render } from '@testing-library/react';
import { ${component} } from './${component}';

describe('${component} Snapshots', () => {
  it('matches snapshot', () => {
    const { container } = render(<${component} />);
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot with props', () => {
    const { container } = render(<${component} prop="value" />);
    expect(container).toMatchSnapshot();
  });
});
`;
  },
};
