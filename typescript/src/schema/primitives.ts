/**
 * Enhanced primitive schemas with common validation patterns
 * @module @missionfabric-js/enzyme-typescript/schema/primitives
 *
 * @example
 * ```typescript
 * import { email, url, uuid, phone } from '@missionfabric-js/enzyme-typescript/schema/primitives';
 *
 * const userSchema = z.object({
 *   email: email(),
 *   website: url(),
 *   id: uuid(),
 *   phone: phone(),
 * });
 * ```
 */

import { z } from 'zod';

/**
 * Email validation schema with comprehensive RFC-compliant pattern
 *
 * @param options - Validation options
 * @returns Zod string schema for email
 *
 * @example
 * ```typescript
 * const emailSchema = email();
 * emailSchema.parse('user@example.com'); // ✓
 * emailSchema.parse('invalid'); // ✗
 *
 * // With custom message
 * const customEmail = email({ message: 'Please enter a valid email' });
 * ```
 */
export function email(options?: { message?: string }): z.ZodString {
  return z.string().email(options?.message || 'Invalid email address');
}

/**
 * URL validation schema with protocol requirement
 *
 * @param options - Validation options
 * @returns Zod string schema for URL
 *
 * @example
 * ```typescript
 * const urlSchema = url();
 * urlSchema.parse('https://example.com'); // ✓
 * urlSchema.parse('example.com'); // ✗
 *
 * // Optional protocol
 * const flexibleUrl = url({ requireProtocol: false });
 * ```
 */
export function url(options?: { message?: string; requireProtocol?: boolean }): z.ZodString {
  const requireProtocol = options?.requireProtocol ?? true;

  if (requireProtocol) {
    return z.string().url(options?.message || 'Invalid URL');
  }

  return z.string().regex(
    /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
    options?.message || 'Invalid URL'
  );
}

/**
 * UUID validation schema (v4 by default)
 *
 * @param options - Validation options
 * @returns Zod string schema for UUID
 *
 * @example
 * ```typescript
 * const uuidSchema = uuid();
 * uuidSchema.parse('550e8400-e29b-41d4-a716-446655440000'); // ✓
 * uuidSchema.parse('invalid-uuid'); // ✗
 *
 * // Custom version
 * const uuid4 = uuid({ version: 4 });
 * ```
 */
export function uuid(options?: { version?: 1 | 4 | 5; message?: string }): z.ZodString {
  const version = options?.version || 4;
  const patterns = {
    1: /^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    4: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    5: /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  };

  return z.string().regex(
    patterns[version],
    options?.message || `Invalid UUID v${version}`
  );
}

/**
 * Phone number validation schema with international support
 *
 * @param options - Validation options
 * @returns Zod string schema for phone number
 *
 * @example
 * ```typescript
 * const phoneSchema = phone();
 * phoneSchema.parse('+1-555-123-4567'); // ✓
 * phoneSchema.parse('+44 20 7123 4567'); // ✓
 *
 * // US only
 * const usPhone = phone({ country: 'US' });
 * ```
 */
export function phone(options?: { country?: 'US' | 'international'; message?: string }): z.ZodString {
  const country = options?.country || 'international';

  const patterns = {
    US: /^(\+1)?[-.\s]?(\(?\d{3}\)?)?[-.\s]?\d{3}[-.\s]?\d{4}$/,
    international: /^\+?[1-9]\d{1,14}$/,
  };

  return z.string().regex(
    patterns[country],
    options?.message || 'Invalid phone number'
  );
}

/**
 * Date string validation schema (ISO 8601 format)
 *
 * @param options - Validation options
 * @returns Zod string schema for date string
 *
 * @example
 * ```typescript
 * const dateSchema = dateString();
 * dateSchema.parse('2024-03-15'); // ✓
 * dateSchema.parse('2024-03-15T10:30:00Z'); // ✓
 * dateSchema.parse('invalid'); // ✗
 *
 * // With transformation to Date object
 * const dateWithTransform = dateString({ transform: true });
 * const result = dateWithTransform.parse('2024-03-15'); // Date object
 * ```
 */
export function dateString(options?: { transform?: boolean; message?: string }): z.ZodString | z.ZodEffects<z.ZodString, Date, string> {
  const baseSchema = z.string().regex(
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/,
    options?.message || 'Invalid date string (expected ISO 8601 format)'
  );

  if (options?.transform) {
    return baseSchema.transform((val) => new Date(val));
  }

  return baseSchema;
}

/**
 * Slug validation schema (URL-friendly string)
 *
 * @param options - Validation options
 * @returns Zod string schema for slug
 *
 * @example
 * ```typescript
 * const slugSchema = slug();
 * slugSchema.parse('my-blog-post'); // ✓
 * slugSchema.parse('hello_world'); // ✓
 * slugSchema.parse('Invalid Slug!'); // ✗
 *
 * // With length constraints
 * const shortSlug = slug({ minLength: 3, maxLength: 50 });
 * ```
 */
export function slug(options?: { minLength?: number; maxLength?: number; message?: string }): z.ZodString {
  let schema = z.string().regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    options?.message || 'Invalid slug (use lowercase letters, numbers, and hyphens)'
  );

  if (options?.minLength) {
    schema = schema.min(options.minLength);
  }

  if (options?.maxLength) {
    schema = schema.max(options.maxLength);
  }

  return schema;
}

/**
 * Hex color validation schema
 *
 * @param options - Validation options
 * @returns Zod string schema for hex color
 *
 * @example
 * ```typescript
 * const colorSchema = hexColor();
 * colorSchema.parse('#FF5733'); // ✓
 * colorSchema.parse('#F57'); // ✓
 * colorSchema.parse('red'); // ✗
 *
 * // Require alpha channel
 * const colorWithAlpha = hexColor({ alpha: true });
 * colorWithAlpha.parse('#FF5733FF'); // ✓
 * ```
 */
export function hexColor(options?: { alpha?: boolean; message?: string }): z.ZodString {
  const pattern = options?.alpha
    ? /^#([A-Fa-f0-9]{8}|[A-Fa-f0-9]{4})$/
    : /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

  return z.string().regex(
    pattern,
    options?.message || 'Invalid hex color'
  );
}

/**
 * IP address validation schema
 *
 * @param options - Validation options
 * @returns Zod string schema for IP address
 *
 * @example
 * ```typescript
 * const ipSchema = ipAddress();
 * ipSchema.parse('192.168.1.1'); // ✓
 * ipSchema.parse('2001:0db8:85a3::8a2e:0370:7334'); // ✓
 *
 * // IPv4 only
 * const ipv4 = ipAddress({ version: 4 });
 * ```
 */
export function ipAddress(options?: { version?: 4 | 6; message?: string }): z.ZodString {
  const patterns = {
    4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    6: /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/,
  };

  if (options?.version) {
    return z.string().regex(
      patterns[options.version],
      options?.message || `Invalid IPv${options.version} address`
    );
  }

  return z.string().refine(
    (val) => patterns[4].test(val) || patterns[6].test(val),
    options?.message || 'Invalid IP address'
  );
}

/**
 * Credit card number validation schema (Luhn algorithm)
 *
 * @param options - Validation options
 * @returns Zod string schema for credit card
 *
 * @example
 * ```typescript
 * const cardSchema = creditCard();
 * cardSchema.parse('4532015112830366'); // ✓
 * cardSchema.parse('1234567890123456'); // ✗ (fails Luhn check)
 * ```
 */
export function creditCard(options?: { message?: string }): z.ZodString {
  return z.string().refine(
    (val) => {
      // Remove spaces and dashes
      const cleaned = val.replace(/[\s-]/g, '');

      // Check if it's numeric and has valid length
      if (!/^\d{13,19}$/.test(cleaned)) {
        return false;
      }

      // Luhn algorithm
      let sum = 0;
      let isEven = false;

      for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned[i], 10);

        if (isEven) {
          digit *= 2;
          if (digit > 9) {
            digit -= 9;
          }
        }

        sum += digit;
        isEven = !isEven;
      }

      return sum % 10 === 0;
    },
    options?.message || 'Invalid credit card number'
  );
}

/**
 * Postal code validation schema with country support
 *
 * @param options - Validation options
 * @returns Zod string schema for postal code
 *
 * @example
 * ```typescript
 * const usZip = postalCode({ country: 'US' });
 * usZip.parse('12345'); // ✓
 * usZip.parse('12345-6789'); // ✓
 *
 * const ukPostcode = postalCode({ country: 'UK' });
 * ukPostcode.parse('SW1A 1AA'); // ✓
 * ```
 */
export function postalCode(options?: { country?: 'US' | 'UK' | 'CA'; message?: string }): z.ZodString {
  const country = options?.country || 'US';

  const patterns = {
    US: /^\d{5}(-\d{4})?$/,
    UK: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
    CA: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i,
  };

  return z.string().regex(
    patterns[country],
    options?.message || `Invalid ${country} postal code`
  );
}

/**
 * Username validation schema (alphanumeric with underscores)
 *
 * @param options - Validation options
 * @returns Zod string schema for username
 *
 * @example
 * ```typescript
 * const usernameSchema = username();
 * usernameSchema.parse('john_doe123'); // ✓
 * usernameSchema.parse('invalid-user!'); // ✗
 *
 * const shortUsername = username({ minLength: 3, maxLength: 20 });
 * ```
 */
export function username(options?: { minLength?: number; maxLength?: number; message?: string }): z.ZodString {
  const minLength = options?.minLength || 3;
  const maxLength = options?.maxLength || 30;

  return z.string()
    .min(minLength, `Username must be at least ${minLength} characters`)
    .max(maxLength, `Username must be at most ${maxLength} characters`)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      options?.message || 'Username can only contain letters, numbers, and underscores'
    );
}

/**
 * Password validation schema with strength requirements
 *
 * @param options - Validation options
 * @returns Zod string schema for password
 *
 * @example
 * ```typescript
 * const passwordSchema = password();
 * passwordSchema.parse('SecureP@ss123'); // ✓
 * passwordSchema.parse('weak'); // ✗
 *
 * const strongPassword = password({
 *   minLength: 12,
 *   requireUppercase: true,
 *   requireLowercase: true,
 *   requireNumbers: true,
 *   requireSpecial: true,
 * });
 * ```
 */
export function password(options?: {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecial?: boolean;
  message?: string;
}): z.ZodString {
  const minLength = options?.minLength || 8;
  const requireUppercase = options?.requireUppercase ?? true;
  const requireLowercase = options?.requireLowercase ?? true;
  const requireNumbers = options?.requireNumbers ?? true;
  const requireSpecial = options?.requireSpecial ?? false;

  let schema = z.string().min(minLength, `Password must be at least ${minLength} characters`);

  if (requireUppercase) {
    schema = schema.regex(/[A-Z]/, 'Password must contain at least one uppercase letter');
  }

  if (requireLowercase) {
    schema = schema.regex(/[a-z]/, 'Password must contain at least one lowercase letter');
  }

  if (requireNumbers) {
    schema = schema.regex(/\d/, 'Password must contain at least one number');
  }

  if (requireSpecial) {
    schema = schema.regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');
  }

  return schema;
}

/**
 * JSON string validation schema with optional parsing
 *
 * @param options - Validation options
 * @returns Zod string schema for JSON
 *
 * @example
 * ```typescript
 * const jsonSchema = jsonString();
 * jsonSchema.parse('{"key": "value"}'); // ✓
 * jsonSchema.parse('invalid json'); // ✗
 *
 * // With parsing
 * const parsedJson = jsonString({ parse: true });
 * const result = parsedJson.parse('{"key": "value"}'); // { key: 'value' }
 * ```
 */
export function jsonString<T = unknown>(options?: { parse?: boolean; message?: string }): z.ZodString | z.ZodEffects<z.ZodString, T, string> {
  const baseSchema = z.string().refine(
    (val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    },
    options?.message || 'Invalid JSON string'
  );

  if (options?.parse) {
    return baseSchema.transform((val) => JSON.parse(val) as T);
  }

  return baseSchema;
}

/**
 * Semver (Semantic Versioning) validation schema
 *
 * @param options - Validation options
 * @returns Zod string schema for semver
 *
 * @example
 * ```typescript
 * const versionSchema = semver();
 * versionSchema.parse('1.2.3'); // ✓
 * versionSchema.parse('1.0.0-alpha.1'); // ✓
 * versionSchema.parse('1.2'); // ✗
 * ```
 */
export function semver(options?: { message?: string }): z.ZodString {
  return z.string().regex(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/,
    options?.message || 'Invalid semantic version'
  );
}
