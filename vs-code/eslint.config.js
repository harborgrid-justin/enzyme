// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import promisePlugin from 'eslint-plugin-promise';
import sonarjs from 'eslint-plugin-sonarjs';
import security from 'eslint-plugin-security';
import jsdoc from 'eslint-plugin-jsdoc';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';

export default tseslint.config(
  // Base configurations
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Global ignores
  {
    ignores: [
      '**/out/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/*.d.ts',
      '.vscode-test/**',
      'coverage/**',
      'test/**',
      'src/test/**',
      'src/webview-ui/**',
      'src/__mocks__/**',
      'vitest.config.ts',
      '**/*.js' // Ignore JS files except this config
    ]
  },

  // Main configuration for TypeScript files
  {
    files: ['src/**/*.ts'],
    
    plugins: {
      import: importPlugin,
      promise: promisePlugin,
      sonarjs: sonarjs,
      security: security,
      jsdoc: jsdoc,
      unicorn: unicorn
    },

    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 2022,
        sourceType: 'module'
      },
      globals: {
        ...globals.node,
        ...globals.es2022
      }
    },

    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json'
        },
        node: true
      }
    },

    rules: {
      // ============================================================
      // TypeScript ESLint Rules - Enterprise Standards
      // ============================================================
      
      // Naming conventions
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow' // Allow trailing underscores to avoid reserved words
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow'
        },
        {
          selector: 'function',
          format: null, // Allow any format for functions (example functions may use underscores)
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow'
        },
        {
          selector: 'parameter',
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow' // Allow for avoiding reserved words
        },
        {
          selector: 'typeLike',
          format: ['PascalCase', 'UPPER_CASE'] // Allow UPPER_CASE for enum names
        },
        {
          selector: 'enumMember',
          format: ['PascalCase', 'UPPER_CASE']
        },
        {
          selector: 'classProperty',
          format: ['camelCase', 'UPPER_CASE'], // Allow UPPER_CASE for class constants
          leadingUnderscore: 'allow'
        },
        {
          selector: 'objectLiteralProperty',
          format: null, // Allow any format for object literal properties (VS Code config keys, etc.)
          leadingUnderscore: 'allow'
        },
        {
          selector: 'objectLiteralMethod',
          format: null, // Allow any format for object literal methods (VS Code config, etc.)
          leadingUnderscore: 'allow'
        },
        {
          selector: 'typeProperty',
          format: null, // Allow any format for type properties (VS Code config interface, etc.)
          leadingUnderscore: 'allow'
        },
        {
          selector: 'import',
          format: ['camelCase', 'PascalCase']
        }
      ],

      // Type safety
      '@typescript-eslint/explicit-function-return-type': 'off', // TypeScript inference is sufficient
      '@typescript-eslint/explicit-module-boundary-types': 'off', // TypeScript inference is sufficient
      '@typescript-eslint/no-explicit-any': 'off', // Allow any for flexibility in VS Code extensions
      '@typescript-eslint/no-unsafe-assignment': 'off', // Too many false positives with VS Code API
      '@typescript-eslint/no-unsafe-member-access': 'off', // Too many false positives with VS Code API
      '@typescript-eslint/no-unsafe-call': 'off', // Too many false positives with VS Code API
      '@typescript-eslint/no-unsafe-return': 'off', // Too many false positives with VS Code API
      '@typescript-eslint/no-unsafe-argument': 'off', // Too many false positives with VS Code API

      // Best practices
      '@typescript-eslint/no-unused-vars': [
        'warn', // Warn instead of error for existing codebase
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/no-floating-promises': 'off', // Allow floating promises for fire-and-forget patterns
      '@typescript-eslint/no-misused-promises': 'off', // Allow flexibility with promise handling
      '@typescript-eslint/await-thenable': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/unbound-method': 'warn',
      '@typescript-eslint/no-unsafe-enum-comparison': 'warn',
      '@typescript-eslint/only-throw-error': 'off', // Allow throwing strings for simplicity
      '@typescript-eslint/prefer-nullish-coalescing': 'off', // Allow || operator
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/strict-boolean-expressions': 'off', // Too strict for VS Code extension
      '@typescript-eslint/no-non-null-assertion': 'off', // Allow non-null assertions when developer knows better
      '@typescript-eslint/restrict-template-expressions': 'off', // Allow flexible template expressions
      '@typescript-eslint/no-base-to-string': 'off', // Allow default stringification
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/prefer-promise-reject-errors': 'warn',
      '@typescript-eslint/no-this-alias': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports'
        }
      ],
      '@typescript-eslint/consistent-type-exports': 'warn',
      '@typescript-eslint/array-type': ['warn', { default: 'array-simple' }],
      '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],

      // Promise handling
      '@typescript-eslint/promise-function-async': 'off', // Allow flexibility with async functions
      '@typescript-eslint/require-await': 'off', // Allow async functions without await for interface compliance
      '@typescript-eslint/no-unnecessary-condition': 'off', // Too many false positives

      // Code quality
      '@typescript-eslint/prefer-readonly': 'warn',
      '@typescript-eslint/prefer-string-starts-ends-with': 'warn',
      '@typescript-eslint/prefer-includes': 'warn',
      '@typescript-eslint/prefer-for-of': 'warn',
      '@typescript-eslint/prefer-reduce-type-parameter': 'warn',
      '@typescript-eslint/no-redundant-type-constituents': 'warn',

      // ============================================================
      // Import Plugin Rules - Dependency Management
      // ============================================================
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type'
          ],
          'newlines-between': 'never',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true
          }
        }
      ],
      'import/no-duplicates': 'error',
      'import/no-cycle': 'error',
      'import/no-self-import': 'error',
      'import/no-useless-path-segments': 'warn',
      'import/first': 'warn',
      'import/newline-after-import': 'warn',
      'import/no-default-export': 'off', // VS Code extensions often need default exports

      // ============================================================
      // Promise Plugin Rules - Async Best Practices
      // ============================================================
      'promise/catch-or-return': 'warn', // Warn for existing code
      'promise/no-return-wrap': 'error',
      'promise/param-names': 'error',
      'promise/no-new-statics': 'error',
      'promise/no-return-in-finally': 'warn',
      'promise/valid-params': 'warn',

      // ============================================================
      // SonarJS Rules - Code Quality & Bug Detection
      // ============================================================
      'sonarjs/no-all-duplicated-branches': 'warn',
      'sonarjs/no-element-overwrite': 'error',
      'sonarjs/no-identical-conditions': 'error',
      'sonarjs/no-identical-expressions': 'error',
      'sonarjs/no-one-iteration-loop': 'error',
      'sonarjs/no-use-of-empty-return-value': 'error',
      'sonarjs/no-collection-size-mischeck': 'error',
      'sonarjs/no-redundant-boolean': 'warn',
      'sonarjs/no-unused-collection': 'warn',
      'sonarjs/prefer-immediate-return': 'warn',
      'sonarjs/prefer-object-literal': 'warn',
      'sonarjs/prefer-single-boolean-return': 'warn',
      'sonarjs/cognitive-complexity': ['warn', 30],
      'sonarjs/no-duplicate-string': ['warn', { threshold: 10 }],
      'sonarjs/no-inverted-boolean-check': 'warn',

      // ============================================================
      // Security Plugin Rules - Security Best Practices
      // ============================================================
      'security/detect-object-injection': 'off', // Too many false positives
      'security/detect-non-literal-regexp': 'off', // Allow dynamic regex in VS Code extensions
      'security/detect-unsafe-regex': 'off', // Too many false positives
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'warn',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'warn',

      // ============================================================
      // JSDoc Plugin Rules - Documentation Standards
      // ============================================================
      'jsdoc/check-alignment': 'warn',
      'jsdoc/check-param-names': 'off', // Allow flexibility with param names
      'jsdoc/check-tag-names': 'warn',
      'jsdoc/check-types': 'warn',
      'jsdoc/require-jsdoc': [
        'warn',
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true
          },
          contexts: [
            'TSInterfaceDeclaration',
            'TSTypeAliasDeclaration'
          ]
        }
      ],
      'jsdoc/require-param': 'warn',
      'jsdoc/require-param-description': 'off', // Too verbose for existing codebase
      'jsdoc/require-param-type': 'off', // TypeScript provides types
      'jsdoc/require-returns': 'off', // TypeScript return types are sufficient
      'jsdoc/require-returns-description': 'off', // Too verbose for existing codebase
      'jsdoc/require-returns-type': 'off', // TypeScript provides types

      // ============================================================
      // Unicorn Plugin Rules - Modern JavaScript Best Practices
      // ============================================================
      'unicorn/better-regex': 'warn',
      'unicorn/catch-error-name': 'warn',
      'unicorn/consistent-destructuring': 'off', // Can be too strict
      'unicorn/consistent-function-scoping': 'warn',
      'unicorn/custom-error-definition': 'error',
      'unicorn/error-message': 'warn', // Warn for existing code
      'unicorn/escape-case': 'warn',
      'unicorn/expiring-todo-comments': 'warn',
      'unicorn/explicit-length-check': 'warn',
      'unicorn/filename-case': 'off', // Allow various filename conventions
      'unicorn/new-for-builtins': 'error',
      'unicorn/no-array-callback-reference': 'off', // Sometimes useful
      'unicorn/no-array-for-each': 'off', // forEach is readable
      'unicorn/no-null': 'off', // VS Code API uses null
      'unicorn/prefer-code-point': 'warn',
      'unicorn/prefer-default-parameters': 'warn',
      'unicorn/prefer-includes': 'warn',
      'unicorn/prefer-modern-math-apis': 'warn',
      'unicorn/prefer-negative-index': 'warn',
      'unicorn/prefer-node-protocol': 'warn',
      'unicorn/prefer-number-properties': 'warn',
      'unicorn/prefer-optional-catch-binding': 'warn',
      'unicorn/prefer-spread': 'warn',
      'unicorn/prefer-string-slice': 'warn',
      'unicorn/prefer-ternary': 'warn',
      'unicorn/prefer-type-error': 'warn',
      'unicorn/prevent-abbreviations': [
        'warn',
        {
          allowList: {
            args: true,
            Args: true,
            props: true,
            Props: true,
            param: true,
            Param: true,
            params: true,
            Params: true,
            i: true,
            j: true,
            k: true,
            e: true,
            err: true,
            ctx: true,
            fn: true,
            Fn: true,
            dir: true,
            Dir: true,
            targetDir: true,
            vscodeDir: true,
            docs: true,
            Docs: true,
            db: true,
            env: true,
            Env: true,
            ref: true,
            Ref: true,
            btn: true,
            src: true,
            dest: true,
            utils: true,
            dev: true,
            devServer: true,
            DevServer: true,
            devServerConfigSchema: true
          },
          checkFilenames: false
        }
      ],
      'unicorn/throw-new-error': 'error',

      // ============================================================
      // Core ESLint Rules - JavaScript Best Practices
      // ============================================================
      'curly': ['warn', 'all'],
      'eqeqeq': ['error', 'always'],
      'no-throw-literal': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'prefer-const': 'warn',
      'no-var': 'error',
      'no-empty': 'warn',
      'no-useless-escape': 'warn',
      'no-case-declarations': 'warn',
      'no-control-regex': 'warn',
      'no-async-promise-executor': 'warn',
      'no-constant-binary-expression': 'warn',
      'prefer-arrow-callback': 'warn',
      'prefer-template': 'warn',
      'object-shorthand': 'warn',
      'no-nested-ternary': 'off', // Allow nested ternaries for concise conditional logic
      'no-unneeded-ternary': 'warn',
      'no-else-return': 'warn',
      'prefer-destructuring': [
        'warn',
        {
          array: false,
          object: true
        }
      ],
      'no-lonely-if': 'warn',
      'no-useless-return': 'warn',
      'no-useless-concat': 'warn',
      'prefer-object-spread': 'warn',
      'yoda': 'warn',
      'max-depth': ['warn', 5],
      'max-lines-per-function': 'off', // Disabled due to ESLint bug with TypeScript
      'max-params': ['warn', 6],
      'complexity': ['warn', 20]
    }
  }
);
