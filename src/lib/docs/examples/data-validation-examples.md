# Data Validation Examples

> **Module**: `@/lib/data`
> **Key Exports**: `useNormalizedData`, `SchemaValidator`, `normalizeAndMerge`

This guide provides comprehensive examples for data validation, normalization, and integrity checking.

---

## Table of Contents

- [Basic Validation](#basic-validation)
- [Schema Validation](#schema-validation)
- [Normalized Data](#normalized-data)
- [Custom Validators](#custom-validators)
- [Form Validation](#form-validation)
- [API Response Validation](#api-response-validation)
- [Type Guards](#type-guards)

---

## Basic Validation

### Using Type Guards

```tsx
import { isDefined, isString, isNumber, isEmail, isUrl } from '@/lib/shared/type-utils';

function validateUserInput(input: unknown) {
  if (!isDefined(input)) {
    return { valid: false, error: 'Input is required' };
  }

  if (!isString(input)) {
    return { valid: false, error: 'Input must be a string' };
  }

  return { valid: true, value: input };
}
```

### Validating Email

```tsx
import { isEmail } from '@/lib/shared/type-utils';

function EmailInput({ onValidEmail }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    if (newValue && !isEmail(newValue)) {
      setError('Please enter a valid email address');
    } else {
      setError(null);
      if (newValue) onValidEmail(newValue);
    }
  };

  return (
    <div>
      <input type="email" value={value} onChange={handleChange} />
      {error && <span className="error">{error}</span>}
    </div>
  );
}
```

### Validating URLs

```tsx
import { isUrl } from '@/lib/shared/type-utils';

function validateWebsite(url: unknown): Result<string, Error> {
  if (!isString(url)) {
    return err(new Error('URL must be a string'));
  }

  if (!isUrl(url)) {
    return err(new Error('Invalid URL format'));
  }

  return ok(url);
}
```

---

## Schema Validation

### Using Schema Validator

```tsx
import { SchemaValidator } from '@/lib/data/validation/schema-validator';

// Define a schema
const userSchema = {
  type: 'object',
  required: ['name', 'email'],
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' },
    age: { type: 'number', minimum: 0 },
    role: { type: 'string', enum: ['admin', 'user', 'guest'] },
  },
};

const validator = new SchemaValidator(userSchema);

function validateUser(data: unknown) {
  const result = validator.validate(data);

  if (!result.valid) {
    console.error('Validation errors:', result.errors);
    return null;
  }

  return result.data;
}
```

### Nested Object Validation

```tsx
const orderSchema = {
  type: 'object',
  required: ['items', 'customer'],
  properties: {
    items: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['productId', 'quantity'],
        properties: {
          productId: { type: 'string' },
          quantity: { type: 'number', minimum: 1 },
          price: { type: 'number', minimum: 0 },
        },
      },
    },
    customer: {
      type: 'object',
      required: ['email'],
      properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
            zip: { type: 'string' },
          },
        },
      },
    },
  },
};
```

---

## Normalized Data

### Using useNormalizedData Hook

```tsx
import { useNormalizedData } from '@/lib/data/hooks/useNormalizedData';

interface User {
  id: string;
  name: string;
  email: string;
}

function UserList() {
  const {
    items,
    getById,
    create,
    update,
    remove,
    upsert,
    upsertMany,
  } = useNormalizedData<User>({
    entityType: 'user',
    idField: 'id',
  });

  // Get all users as array
  const users = items;

  // Get single user by ID
  const user = getById('user-123');

  // Create new user
  const handleCreate = () => {
    create({
      id: 'user-456',
      name: 'John Doe',
      email: 'john@example.com',
    });
  };

  // Update existing user
  const handleUpdate = () => {
    update('user-123', { name: 'Jane Doe' });
  };

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>
          {user.name} - {user.email}
          <button onClick={() => remove(user.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}
```

### With Validation

```tsx
import { useNormalizedData } from '@/lib/data/hooks/useNormalizedData';

const validateUser = (user: User): string[] => {
  const errors: string[] = [];

  if (!user.name || user.name.length < 2) {
    errors.push('Name must be at least 2 characters');
  }

  if (!user.email || !isEmail(user.email)) {
    errors.push('Valid email is required');
  }

  return errors;
};

function ValidatedUserList() {
  const store = useNormalizedData<User>({
    entityType: 'user',
    idField: 'id',
    validate: validateUser,
    throwOnValidationError: true, // Throws if validation fails
  });

  const handleCreate = async (userData: User) => {
    try {
      store.create(userData);
    } catch (error) {
      if (error instanceof ValidationError) {
        console.error('Validation failed:', error.errors);
      }
    }
  };

  return <div>{/* ... */}</div>;
}
```

### Batch Operations

```tsx
function BulkImport() {
  const { upsertMany } = useNormalizedData<Product>({
    entityType: 'product',
    idField: 'sku',
  });

  const handleImport = async (file: File) => {
    const data = await parseCSV(file);

    // Validate all items first
    const validItems = data.filter((item) => {
      const errors = validateProduct(item);
      return errors.length === 0;
    });

    // Batch upsert valid items
    upsertMany(validItems);
  };

  return <input type="file" onChange={(e) => handleImport(e.target.files[0])} />;
}
```

---

## Custom Validators

### Creating Custom Validation Functions

```tsx
import { ValidationFunction } from '@/lib/data/hooks/useNormalizedData';

// Custom validator for products
const validateProduct: ValidationFunction<Product> = (product) => {
  const errors: string[] = [];

  // Required fields
  if (!product.name) {
    errors.push('Product name is required');
  }

  // Price validation
  if (product.price < 0) {
    errors.push('Price cannot be negative');
  }

  // SKU format validation
  if (!/^[A-Z]{3}-\d{4}$/.test(product.sku)) {
    errors.push('SKU must be in format XXX-0000');
  }

  // Stock validation
  if (product.stock < 0) {
    errors.push('Stock cannot be negative');
  }

  // Category validation
  const validCategories = ['electronics', 'clothing', 'food', 'other'];
  if (!validCategories.includes(product.category)) {
    errors.push(`Category must be one of: ${validCategories.join(', ')}`);
  }

  return errors;
};
```

### Async Validation

```tsx
async function validateUsername(username: string): Promise<string[]> {
  const errors: string[] = [];

  // Local validation
  if (username.length < 3) {
    errors.push('Username must be at least 3 characters');
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }

  // Server-side uniqueness check
  if (errors.length === 0) {
    const response = await fetch(`/api/users/check-username?username=${username}`);
    const { available } = await response.json();

    if (!available) {
      errors.push('Username is already taken');
    }
  }

  return errors;
}
```

### Composing Validators

```tsx
function composeValidators<T>(
  ...validators: ValidationFunction<T>[]
): ValidationFunction<T> {
  return (data: T) => {
    const allErrors: string[] = [];

    for (const validator of validators) {
      const errors = validator(data);
      allErrors.push(...errors);
    }

    return allErrors;
  };
}

// Usage
const validateOrder = composeValidators(
  validateOrderItems,
  validateShippingAddress,
  validatePaymentInfo
);
```

---

## Form Validation

### Real-time Field Validation

```tsx
function useFieldValidation<T>(
  value: T,
  validators: ((value: T) => string | null)[]
) {
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!touched) return;

    for (const validate of validators) {
      const result = validate(value);
      if (result) {
        setError(result);
        return;
      }
    }
    setError(null);
  }, [value, touched, validators]);

  return {
    error,
    touched,
    onBlur: () => setTouched(true),
    isValid: !error && touched,
  };
}

// Usage
function EmailField() {
  const [email, setEmail] = useState('');
  const validation = useFieldValidation(email, [
    (v) => (!v ? 'Email is required' : null),
    (v) => (!isEmail(v) ? 'Invalid email format' : null),
  ]);

  return (
    <div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={validation.onBlur}
      />
      {validation.error && <span className="error">{validation.error}</span>}
    </div>
  );
}
```

### Form-level Validation

```tsx
interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

function validateForm(data: FormData): Record<keyof FormData, string | null> {
  return {
    name: !data.name ? 'Name is required' : null,
    email: !isEmail(data.email) ? 'Invalid email' : null,
    password: data.password.length < 8 ? 'Password must be 8+ characters' : null,
    confirmPassword:
      data.password !== data.confirmPassword ? 'Passwords do not match' : null,
  };
}

function RegistrationForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);

    const hasErrors = Object.values(validationErrors).some((e) => e !== null);
    if (!hasErrors) {
      // Submit form
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields with errors[field] display */}
    </form>
  );
}
```

---

## API Response Validation

### Validating API Responses

```tsx
import { safeJsonParse } from '@/lib/shared/type-utils';
import { isApiError, isPaginatedResponse } from '@/lib/api/types';

async function fetchUsers(): Promise<Result<User[], Error>> {
  try {
    const response = await fetch('/api/users');
    const data = await response.json();

    // Validate response structure
    if (isApiError(data)) {
      return err(new Error(data.message));
    }

    if (!isPaginatedResponse(data)) {
      return err(new Error('Invalid response format'));
    }

    // Validate individual items
    const validUsers = data.items.filter(isUser);

    return ok(validUsers);
  } catch (error) {
    return err(error as Error);
  }
}
```

### Type-Safe JSON Parsing

```tsx
import { safeJsonParse, createShapeGuard } from '@/lib/shared/type-utils';

const isUser = createShapeGuard<User>({
  id: isString,
  name: isString,
  email: isEmail,
});

function parseUserFromStorage(): User | null {
  const json = localStorage.getItem('user');
  if (!json) return null;

  return safeJsonParse(json, isUser) ?? null;
}
```

---

## Type Guards

### Creating Custom Type Guards

```tsx
import { createShapeGuard, isString, isNumber, isArray } from '@/lib/shared/type-utils';

// Simple type guard
interface Product {
  id: string;
  name: string;
  price: number;
  tags: string[];
}

const isProduct = createShapeGuard<Product>({
  id: isString,
  name: isString,
  price: isNumber,
  tags: (value): value is string[] => isArray(value) && value.every(isString),
});

// Usage
function processProducts(data: unknown[]): Product[] {
  return data.filter(isProduct);
}
```

### Union Type Guards

```tsx
import { createUnionGuard } from '@/lib/shared/type-utils';

type Status = 'pending' | 'active' | 'completed' | 'cancelled';

const isStatus = (value: unknown): value is Status => {
  return isString(value) && ['pending', 'active', 'completed', 'cancelled'].includes(value);
};

// Or using isOneOf
import { isOneOf } from '@/lib/shared/type-utils';

const isValidStatus = (value: unknown): value is Status => {
  return isOneOf(value, ['pending', 'active', 'completed', 'cancelled'] as const);
};
```

### Narrowing with Type Guards

```tsx
import { narrow, narrowOr } from '@/lib/shared/type-utils';

function processApiResponse(response: unknown) {
  // Returns undefined if not a string
  const message = narrow(response, isString);

  // Returns default if not a number
  const count = narrowOr(response, isNumber, 0);

  // With assertion
  import { assert } from '@/lib/shared/type-utils';

  assert(response, isObject, 'Response must be an object');
  // response is now narrowed to Record<string, unknown>
}
```

---

## See Also

- [API Client Examples](./api-client-examples.md)
- [State Management Examples](./state-examples.md)
- [Form Examples](./form-examples.md)
