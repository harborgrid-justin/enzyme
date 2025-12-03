/**
 * @file Error Handling Examples
 * @description Comprehensive examples demonstrating the enzyme error handling system
 */

import {
  EnzymeError,
  AuthError,
  ApiError,
  ValidationError,
  AggregateError,
  isEnzymeError,
  isRetryableError,
  formatError,
  serializeError,
  retryWithBackoff,
  executeWithRecovery,
  registerTranslations,
  createLocalizedError,
  errorsExtension,
  type ErrorContext,
  type RetryConfig,
} from './errors.js';

// ============================================================================
// Example 1: Basic Error Creation
// ============================================================================

export function example1_BasicErrorCreation() {
  console.log('=== Example 1: Basic Error Creation ===\n');

  // Create error using error code
  const error1 = new EnzymeError('AUTH_TOKEN_001');
  console.log('Error 1:', error1.toString());
  console.log('Code:', error1.code);
  console.log('Domain:', error1.domain);
  console.log('Category:', error1.category);
  console.log('Retryable:', error1.retryable);
  console.log();

  // Create error with context
  const error2 = new EnzymeError('AUTH_TOKEN_001', {
    userId: 'user123',
    component: 'LoginForm',
    requestId: 'req-abc-123',
  });
  console.log('Error 2:', error2.toString());
  console.log('Context:', error2.context);
  console.log();

  // Create error using specialized class
  const error3 = new AuthError('AUTH_PERMISSION_001', {
    metadata: { requiredRole: 'admin', userRole: 'user' },
  });
  console.log('Error 3:', error3.toString());
  console.log();
}

// ============================================================================
// Example 2: Fuzzy Matching for Typos
// ============================================================================

export function example2_FuzzyMatching() {
  console.log('=== Example 2: Fuzzy Matching ===\n');

  try {
    // Intentional typo in error code
    new EnzymeError('AUTH_TOKE_001');
  } catch (error) {
    if (error instanceof Error) {
      console.log('Caught error:', error.message);
      console.log('Notice the suggestion for the correct code!\n');
    }
  }

  try {
    // Another typo
    new EnzymeError('API_NETWRK_001');
  } catch (error) {
    if (error instanceof Error) {
      console.log('Caught error:', error.message);
      console.log();
    }
  }
}

// ============================================================================
// Example 3: Error Serialization
// ============================================================================

export function example3_Serialization() {
  console.log('=== Example 3: Error Serialization ===\n');

  const error = new ApiError('API_NETWORK_001', {
    component: 'UserService',
    requestId: 'req-xyz-789',
    metadata: {
      url: 'https://api.example.com/users',
      method: 'GET',
      statusCode: 500,
    },
  });

  // Serialize to JSON
  const serialized = error.toJSON();
  console.log('Serialized error:', JSON.stringify(serialized, null, 2));
  console.log();

  // Using utility function
  const serialized2 = serializeError(error);
  console.log('Using serializeError:', JSON.stringify(serialized2, null, 2));
  console.log();
}

// ============================================================================
// Example 4: Error Recovery with Retry
// ============================================================================

export async function example4_RetryWithBackoff() {
  console.log('=== Example 4: Retry with Backoff ===\n');

  let attempts = 0;
  const unstableOperation = async () => {
    attempts++;
    console.log(`Attempt ${attempts}...`);

    if (attempts < 3) {
      throw new ApiError('API_NETWORK_001', {
        metadata: { attempt: attempts },
      });
    }

    return { success: true, data: 'Operation succeeded!' };
  };

  try {
    const config: RetryConfig = {
      maxAttempts: 3,
      initialDelay: 100, // Short delay for demo
      maxDelay: 1000,
      backoffMultiplier: 2,
      exponentialBackoff: true,
    };

    const result = await retryWithBackoff(unstableOperation, config);
    console.log('Result:', result);
    console.log();
  } catch (error) {
    console.error('Failed after retries:', formatError(error));
    console.log();
  }
}

// ============================================================================
// Example 5: Recovery Strategies
// ============================================================================

export async function example5_RecoveryStrategies() {
  console.log('=== Example 5: Recovery Strategies ===\n');

  const failingOperation = async () => {
    throw new ApiError('API_NETWORK_001');
  };

  // Fallback strategy
  const result1 = await executeWithRecovery(failingOperation, {
    type: 'fallback',
    value: { data: 'default data' },
  });
  console.log('Result with fallback:', result1);
  console.log();

  // Ignore strategy
  const result2 = await executeWithRecovery(failingOperation, {
    type: 'ignore',
  });
  console.log('Result with ignore:', result2); // undefined
  console.log();

  // Retry strategy
  let retryAttempts = 0;
  const eventuallySucceedsOperation = async () => {
    retryAttempts++;
    if (retryAttempts < 2) {
      throw new ApiError('API_TIMEOUT_001');
    }
    return { data: 'success' };
  };

  const result3 = await executeWithRecovery(eventuallySucceedsOperation, {
    type: 'retry',
    config: {
      maxAttempts: 3,
      initialDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2,
      exponentialBackoff: true,
    },
  });
  console.log('Result with retry:', result3);
  console.log();
}

// ============================================================================
// Example 6: Error Aggregation
// ============================================================================

export function example6_ErrorAggregation() {
  console.log('=== Example 6: Error Aggregation ===\n');

  // Simulate form validation
  const errors: ValidationError[] = [];

  const formData = {
    email: 'invalid-email',
    password: 'short',
    age: 150,
  };

  // Collect validation errors
  if (!formData.email.includes('@')) {
    errors.push(
      new ValidationError('VALID_FORMAT_001', {
        metadata: { field: 'email', value: formData.email },
      })
    );
  }

  if (formData.password.length < 8) {
    errors.push(
      new ValidationError('VALID_RANGE_001', {
        metadata: { field: 'password', minLength: 8 },
      })
    );
  }

  if (formData.age > 120) {
    errors.push(
      new ValidationError('VALID_RANGE_001', {
        metadata: { field: 'age', maxValue: 120 },
      })
    );
  }

  // Create aggregate error
  if (errors.length > 0) {
    const aggregateError = new AggregateError(errors, 'Form validation failed');

    console.log('Aggregate error:', aggregateError.toString());
    console.log('\nError codes:', aggregateError.getCodes());
    console.log('Errors by domain:', aggregateError.getByDomain('VALID'));
    console.log();
  }
}

// ============================================================================
// Example 7: Type Guards and Utilities
// ============================================================================

export function example7_TypeGuardsAndUtilities() {
  console.log('=== Example 7: Type Guards and Utilities ===\n');

  const enzymeErr = new ApiError('API_NETWORK_001');
  const regularErr = new Error('Regular error');

  console.log('Is EnzymeError?', isEnzymeError(enzymeErr)); // true
  console.log('Is EnzymeError?', isEnzymeError(regularErr)); // false
  console.log();

  console.log('Is retryable?', isRetryableError(enzymeErr)); // true

  const nonRetryableErr = new AuthError('AUTH_TOKEN_001');
  console.log('Is retryable?', isRetryableError(nonRetryableErr)); // false
  console.log();

  // Format errors for display
  console.log('Formatted EnzymeError:');
  console.log(formatError(enzymeErr));
  console.log('\nFormatted regular Error:');
  console.log(formatError(regularErr));
  console.log();
}

// ============================================================================
// Example 8: i18n Support
// ============================================================================

export function example8_Internationalization() {
  console.log('=== Example 8: Internationalization ===\n');

  // Register Spanish translations
  registerTranslations('es', {
    AUTH_TOKEN_001: 'El token de autenticación falta o es inválido',
    AUTH_TOKEN_002: 'El token de autenticación ha expirado',
    API_NETWORK_001: 'La solicitud de red ha fallado',
  });

  // Register French translations
  registerTranslations('fr', {
    AUTH_TOKEN_001: "Le jeton d'authentification est manquant ou invalide",
    AUTH_TOKEN_002: "Le jeton d'authentification a expiré",
    API_NETWORK_001: 'La requête réseau a échoué',
  });

  // Create localized errors
  const spanishError = createLocalizedError('AUTH_TOKEN_001', 'es', {
    component: 'LoginForm',
  });
  console.log('Spanish error:', spanishError.message);

  const frenchError = createLocalizedError('API_NETWORK_001', 'fr', {
    component: 'ApiClient',
  });
  console.log('French error:', frenchError.message);

  // English (default)
  const englishError = new EnzymeError('AUTH_TOKEN_002');
  console.log('English error:', englishError.message);
  console.log();
}

// ============================================================================
// Example 9: Using Extension Client Methods
// ============================================================================

export function example9_ExtensionClientMethods() {
  console.log('=== Example 9: Extension Client Methods ===\n');

  // Simulate enzyme client with extension
  const client = {
    ...errorsExtension.client,
  };

  if (!client) {
    console.log('Extension client not available');
    return;
  }

  // Get all error codes
  const allCodes = client.$getAllErrorCodes?.();
  console.log(`Total error codes: ${allCodes?.length}`);
  console.log('Sample codes:', allCodes?.slice(0, 5));
  console.log();

  // Get error codes by domain
  const authCodes = client.$getErrorCodesByDomain?.('AUTH');
  console.log('AUTH domain codes:', authCodes);
  console.log();

  // Get error definition
  const definition = client.$getErrorDefinition?.('AUTH_TOKEN_001');
  console.log('Error definition:', definition);
  console.log();

  // Get error suggestions
  const suggestions = client.$getErrorSuggestions?.('API_NETWRK_001', 3);
  console.log('Suggestions for typo "API_NETWRK_001":', suggestions);
  console.log();
}

// ============================================================================
// Example 10: Real-World Scenario
// ============================================================================

export async function example10_RealWorldScenario() {
  console.log('=== Example 10: Real-World Scenario ===\n');

  // Simulate API call with error handling
  async function fetchUserData(userId: string): Promise<unknown> {
    const context: ErrorContext = {
      timestamp: new Date(),
      component: 'UserService',
      userId,
      requestId: `req-${Date.now()}`,
      metadata: {
        endpoint: `/api/users/${userId}`,
        method: 'GET',
      },
    };

    try {
      // Simulate network request
      const shouldFail = Math.random() > 0.7;

      if (shouldFail) {
        throw new ApiError('API_NETWORK_001', context);
      }

      return {
        id: userId,
        name: 'John Doe',
        email: 'john@example.com',
      };
    } catch (error) {
      if (isEnzymeError(error) && isRetryableError(error)) {
        console.log(`Retryable error detected: ${error.code}`);
        console.log('Attempting retry with backoff...');

        return await retryWithBackoff(
          () => fetchUserData(userId),
          {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 5000,
            backoffMultiplier: 2,
            exponentialBackoff: true,
          }
        );
      }

      // Log error for monitoring
      console.error('Error occurred:', serializeError(error));
      throw error;
    }
  }

  try {
    const userData = await fetchUserData('user123');
    console.log('User data fetched successfully:', userData);
    console.log();
  } catch (error) {
    console.error('Failed to fetch user data:', formatError(error));
    console.log();
  }
}

// ============================================================================
// Run All Examples
// ============================================================================

export async function runAllExamples() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   Enzyme Error Handling System - Examples            ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  example1_BasicErrorCreation();
  example2_FuzzyMatching();
  example3_Serialization();
  await example4_RetryWithBackoff();
  await example5_RecoveryStrategies();
  example6_ErrorAggregation();
  example7_TypeGuardsAndUtilities();
  example8_Internationalization();
  example9_ExtensionClientMethods();
  await example10_RealWorldScenario();

  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   All examples completed successfully!                ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
}

// Uncomment to run examples
// runAllExamples().catch(console.error);
