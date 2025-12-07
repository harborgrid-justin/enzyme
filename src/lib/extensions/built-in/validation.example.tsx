/**
 * @file Validation Extension Usage Examples
 * @description Comprehensive examples demonstrating all features of the validation extension
 *
 * @module extensions/built-in/validation.example
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { z } from 'zod';
import {
  validationExtension,
  useFormValidation,
  useFieldValidation,
  createUniquenessValidator,
  commonSchemas,
} from './validation';

// ============================================================================
// Example 1: Schema Registry
// ============================================================================

// Register a user schema
const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(3).max(20),
  age: z.number().min(18).max(120).optional(),
  role: z.enum(['user', 'admin', 'moderator']),
  profile: z.object({
    firstName: z.string(),
    lastName: z.string(),
    bio: z.string().optional(),
  }),
});

validationExtension.client.$registerSchema('user', userSchema, {
  description: 'User entity validation schema',
  version: '1.0.0',
});

// Validate data against registered schema
async function example1_schemaRegistry() {
  const userData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'user@example.com',
    username: 'john_doe',
    age: 25,
    role: 'user',
    profile: {
      firstName: 'John',
      lastName: 'Doe',
    },
  };

  const result = await validationExtension.client.$validate('user', userData);

  if (result.success) {
    console.log('Valid user:', result.data);
  } else {
    console.error('Validation errors:', result.errors);
  }
}

// ============================================================================
// Example 2: Form Validation with React Hook
// ============================================================================

interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

const loginSchema = z.object({
  email: commonSchemas.email,
  password: commonSchemas.password,
  rememberMe: z.boolean(),
});

function LoginFormExample() {
  const {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    register,
    handleSubmit,
  } = useFormValidation<LoginForm>(loginSchema, {
    mode: 'onBlur',
    revalidateMode: 'onChange',
    shouldFocusError: true,
  });

  const onSubmit = async (data: LoginForm) => {
    console.log('Form submitted:', data);
    // Call API here
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input
          {...register('email')}
          type="email"
          placeholder="Email"
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>

      <div>
        <input
          {...register('password')}
          type="password"
          placeholder="Password"
        />
        {errors.password && <span className="error">{errors.password}</span>}
      </div>

      <div>
        <label>
          <input
            {...register('rememberMe')}
            type="checkbox"
          />
          Remember me
        </label>
      </div>

      <button type="submit" disabled={isSubmitting || !isValid}>
        {isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}

// ============================================================================
// Example 3: Single Field Validation
// ============================================================================

function UsernameFieldExample() {
  const {
    value,
    error,
    touched,
    validating,
    setValue,
    onBlur,
  } = useFieldValidation(
    'username',
    commonSchemas.username,
    {
      validateOn: 'both',
      debounceMs: 500,
    }
  );

  return (
    <div>
      <input
        value={value ?? ''}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onBlur}
        placeholder="Username"
      />
      {validating && <span>Checking...</span>}
      {touched && error && <span className="error">{error}</span>}
    </div>
  );
}

// ============================================================================
// Example 4: API Response Validation
// ============================================================================

interface ApiUser {
  id: string;
  email: string;
  name: string;
}

const apiUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
});

async function example4_apiValidation() {
  const response = await fetch('/api/user/123');
  const data = await response.json();

  // Validate API response
  const result = await validationExtension.client.$validateApiResponse(
    apiUserSchema,
    data,
    { strict: true } // Fail on unknown fields
  );

  if (result.success) {
    const user: ApiUser = result.data;
    console.log('Valid user from API:', user);
  } else {
    console.error('Invalid API response:', result.errors);
  }
}

// ============================================================================
// Example 5: State Validation
// ============================================================================

interface AppState {
  user: {
    id: string;
    email: string;
  } | null;
  isAuthenticated: boolean;
  theme: 'light' | 'dark';
}

const appStateSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
  }).nullable(),
  isAuthenticated: z.boolean(),
  theme: z.enum(['light', 'dark']),
});

function example5_stateValidation() {
  const currentState: AppState = {
    user: null,
    isAuthenticated: false,
    theme: 'light',
  };

  // Validate state change before committing
  const updates = {
    user: {
      id: '123',
      email: 'user@example.com',
    },
    isAuthenticated: true,
  };

  const result = validationExtension.client.$validateStateChange(
    currentState,
    updates,
    appStateSchema
  );

  if (result.success) {
    // Apply the state change
    const newState = result.data;
    console.log('New state:', newState);
  } else {
    console.error('Invalid state change:', result.errors);
  }
}

// ============================================================================
// Example 6: Custom Async Validator
// ============================================================================

// Check if email is unique in the database
const checkEmailUniqueness = createUniquenessValidator(
  async (email: string) => {
    const response = await fetch(`/api/check-email?email=${email}`);
    const { available } = await response.json();
    return available;
  },
  'This email is already registered'
);

// Register custom validator
validationExtension.client.$addCustomValidator('uniqueEmail', checkEmailUniqueness);

// Use in form validation
const signupSchema = z.object({
  email: commonSchemas.email,
  password: commonSchemas.password,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

async function example6_customValidation() {
  const email = 'newuser@example.com';

  // Execute custom validator
  const result = await validationExtension.client.$executeValidator(
    'uniqueEmail',
    email
  );

  if (result.success) {
    console.log('Email is available');
  } else {
    console.error('Email validation failed:', result.errors);
  }
}

// ============================================================================
// Example 7: Error Formatting for UI
// ============================================================================

async function example7_errorFormatting() {
  const invalidData = {
    email: 'not-an-email',
    age: -5,
    username: 'ab', // Too short
  };

  const result = await validationExtension.client.$validate('user', invalidData);

  if (!result.success) {
    // Get all formatted errors
    const errors = validationExtension.client.$getValidationErrors(result);
    console.log('All errors:', errors);

    // Format errors for form display
    const formErrors = validationExtension.client.$formatErrorsForForm(errors);
    console.log('Form errors:', formErrors);

    // Get errors grouped by field
    const { groupErrorsByField } = await import('./validation');
    const grouped = groupErrorsByField(errors);
    console.log('Grouped errors:', grouped);
  }
}

// ============================================================================
// Example 8: Validation Caching
// ============================================================================

async function example8_caching() {
  const userData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'user@example.com',
    username: 'john_doe',
  };

  // First validation (cache miss)
  console.time('First validation');
  await validationExtension.client.$validate('user', userData, { useCache: true });
  console.timeEnd('First validation');

  // Second validation (cache hit - much faster)
  console.time('Second validation');
  await validationExtension.client.$validate('user', userData, { useCache: true });
  console.timeEnd('Second validation');

  // Configure cache settings
  validationExtension.client.$configureCache({
    maxSize: 200, // Increase cache size
    ttl: 10 * 60 * 1000, // 10 minutes TTL
  });

  // Clear cache when needed
  validationExtension.client.$clearCache();
}

// ============================================================================
// Example 9: Common Schema Presets
// ============================================================================

function example9_commonSchemas() {
  const schemas = validationExtension.client.$commonSchemas;

  // Available common schemas:
  // - email: Email validation
  // - password: Password with min 8 chars
  // - url: URL validation
  // - uuid: UUID validation
  // - phone: Phone number validation
  // - zipCode: US ZIP code validation
  // - slug: URL-safe slug validation
  // - username: Username validation
  // - positiveNumber: Positive number validation
  // - percentage: 0-100 percentage validation
  // - dateString: ISO datetime string validation

  const contactSchema = z.object({
    email: schemas.email,
    phone: schemas.phone,
    website: schemas.url.optional(),
  });

  console.log('Contact schema:', contactSchema);
}

// ============================================================================
// Example 10: Complex Form with Multiple Sections
// ============================================================================

interface RegistrationForm {
  // Personal info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  // Account info
  username: string;
  password: string;
  confirmPassword: string;

  // Address
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };

  // Preferences
  newsletter: boolean;
  terms: boolean;
}

const registrationSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: commonSchemas.email,
  phone: commonSchemas.phone,
  username: commonSchemas.username,
  password: commonSchemas.password,
  confirmPassword: z.string(),
  address: z.object({
    street: z.string().min(5),
    city: z.string().min(2),
    state: z.string().length(2),
    zipCode: commonSchemas.zipCode,
  }),
  newsletter: z.boolean(),
  terms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

function RegistrationFormExample() {
  const {
    values,
    errors,
    isSubmitting,
    isValid,
    setValue,
    handleBlur,
    handleSubmit,
  } = useFormValidation<RegistrationForm>(registrationSchema, {
    mode: 'onSubmit',
    revalidateMode: 'onChange',
  });

  const onSubmit = async (data: RegistrationForm) => {
    console.log('Registration data:', data);
    // Submit to API
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Personal Info Section */}
      <section>
        <h2>Personal Information</h2>
        <input
          name="firstName"
          value={values.firstName ?? ''}
          onChange={(e) => setValue('firstName', e.target.value)}
          onBlur={() => handleBlur('firstName')}
          placeholder="First Name"
        />
        {errors.firstName && <span className="error">{errors.firstName}</span>}

        <input
          name="lastName"
          value={values.lastName ?? ''}
          onChange={(e) => setValue('lastName', e.target.value)}
          onBlur={() => handleBlur('lastName')}
          placeholder="Last Name"
        />
        {errors.lastName && <span className="error">{errors.lastName}</span>}
      </section>

      {/* Account Info Section */}
      <section>
        <h2>Account Information</h2>
        <input
          name="username"
          value={values.username ?? ''}
          onChange={(e) => setValue('username', e.target.value)}
          onBlur={() => handleBlur('username')}
          placeholder="Username"
        />
        {errors.username && <span className="error">{errors.username}</span>}

        <input
          name="password"
          type="password"
          value={values.password ?? ''}
          onChange={(e) => setValue('password', e.target.value)}
          onBlur={() => handleBlur('password')}
          placeholder="Password"
        />
        {errors.password && <span className="error">{errors.password}</span>}
      </section>

      {/* Submit Button */}
      <button type="submit" disabled={isSubmitting || !isValid}>
        {isSubmitting ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
}

// ============================================================================
// Example 11: Integration with State Management (Redux/Zustand)
// ============================================================================

// With Redux middleware
function createValidationMiddleware(schema: z.ZodSchema) {
  return (store: any) => (next: any) => (action: any) => {
    if (action.type === 'UPDATE_STATE') {
      const currentState = store.getState();
      const result = validationExtension.client.$validateStateChange(
        currentState,
        action.payload,
        schema
      );

      if (!result.success) {
        console.error('State validation failed:', result.errors);
        return; // Prevent state update
      }
    }

    return next(action);
  };
}

// With Zustand
interface Store {
  user: { email: string; name: string } | null;
  setUser: (user: { email: string; name: string }) => void;
}

const storeSchema = z.object({
  user: z.object({
    email: z.string().email(),
    name: z.string(),
  }).nullable(),
});

// ============================================================================
// Export Examples
// ============================================================================

export {
  example1_schemaRegistry,
  example4_apiValidation,
  example5_stateValidation,
  example6_customValidation,
  example7_errorFormatting,
  example8_caching,
  example9_commonSchemas,
  LoginFormExample,
  UsernameFieldExample,
  RegistrationFormExample,
};
