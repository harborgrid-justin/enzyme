/**
 * Active Directory User Attribute Mapping
 *
 * Maps AD/Graph API user attributes to application user properties.
 * Supports custom attribute mapping, transformation, and validation.
 *
 * @module auth/active-directory/ad-attributes
 */

import type { ADUserAttributes, ADUser } from './types';
import type { User } from '@/lib';

// =============================================================================
// Types
// =============================================================================

/**
 * Attribute transformation function type.
 */
export type AttributeTransformer<TIn = unknown, TOut = unknown> = (
  value: TIn,
  source: ADUserAttributes
) => TOut;

/**
 * Attribute validation function type.
 */
export type AttributeValidator<T = unknown> = (
  value: T,
  attributeName: string
) => { valid: boolean; error?: string };

/**
 * Single attribute mapping configuration.
 */
export interface AttributeMapping<TIn = unknown, TOut = unknown> {
  /** Source attribute name in AD */
  source: keyof ADUserAttributes | string;
  /** Target attribute name in application user */
  target: string;
  /** Optional transformation function */
  transform?: AttributeTransformer<TIn, TOut>;
  /** Optional validation function */
  validate?: AttributeValidator<TIn>;
  /** Default value if source is undefined */
  defaultValue?: TOut;
  /** Whether this attribute is required */
  required?: boolean;
  /** Custom extraction function for complex mappings */
  extract?: (source: ADUserAttributes) => TIn;
}

/**
 * Complete attribute mapping configuration.
 */
export interface AttributeMappingConfig {
  /** Individual attribute mappings */
  mappings: AttributeMapping[];
  /** Whether to include unmapped attributes in metadata */
  includeUnmapped?: boolean;
  /** Prefix for unmapped attributes in metadata */
  unmappedPrefix?: string;
  /** Custom extension attribute mappings */
  extensionMappings?: Record<string, string>;
  /** Attributes to explicitly exclude */
  excludeAttributes?: string[];
}

/**
 * Result of attribute mapping operation.
 */
export interface AttributeMappingResult {
  /** Mapped attributes */
  attributes: Record<string, unknown>;
  /** Validation errors encountered */
  errors: Array<{ attribute: string; error: string }>;
  /** Unmapped attributes (if includeUnmapped is true) */
  unmapped?: Record<string, unknown>;
  /** Whether mapping was successful (no required attribute errors) */
  success: boolean;
}

// =============================================================================
// Default Mappings
// =============================================================================

/**
 * Default attribute mappings from AD to application User.
 */
export const DEFAULT_ATTRIBUTE_MAPPINGS: AttributeMapping[] = [
  {
    source: 'objectId',
    target: 'id',
    required: true,
  },
  {
    source: 'email',
    target: 'email',
    required: true,
    extract: (source) =>
      source.email != null && source.email !== '' ? source.email : (source.upn ?? undefined),
  },
  {
    source: 'givenName',
    target: 'firstName',
    defaultValue: '',
  },
  {
    source: 'surname',
    target: 'lastName',
    defaultValue: '',
  },
  {
    source: 'displayName',
    target: 'displayName',
    required: true,
  },
  {
    source: 'createdDateTime',
    target: 'createdAt',
    transform: (value) => (value != null && value !== '' ? value : new Date().toISOString()),
  },
];

/**
 * Extended attribute mappings for additional user properties.
 */
export const EXTENDED_ATTRIBUTE_MAPPINGS: AttributeMapping[] = [
  {
    source: 'jobTitle',
    target: 'jobTitle',
  },
  {
    source: 'department',
    target: 'department',
  },
  {
    source: 'officeLocation',
    target: 'officeLocation',
  },
  {
    source: 'mobilePhone',
    target: 'phone',
  },
  {
    source: 'employeeId',
    target: 'employeeId',
  },
  {
    source: 'companyName',
    target: 'company',
  },
  {
    source: 'manager',
    target: 'manager',
  },
];

/**
 * Healthcare-specific attribute mappings for HIPAA compliance.
 */
export const HEALTHCARE_ATTRIBUTE_MAPPINGS: AttributeMapping[] = [
  {
    source: 'employeeId',
    target: 'providerId',
    required: false,
  },
  {
    source: 'department',
    target: 'medicalDepartment',
  },
  {
    source: 'jobTitle',
    target: 'clinicalRole',
  },
  // Custom extension attribute for NPI (National Provider Identifier)
  {
    source: 'extensionAttributes',
    target: 'npi',
    extract: (source) => source.extensionAttributes?.['extension_npi'],
    validate: (value) => ({
      valid:
        value == null || /^\d{10}$/.test(typeof value === 'string' ? value : JSON.stringify(value)),
      error: 'NPI must be a 10-digit number',
    }),
  },
  // DEA number for prescribing authority
  {
    source: 'extensionAttributes',
    target: 'deaNumber',
    extract: (source) => source.extensionAttributes?.['extension_deaNumber'],
    validate: (value) => ({
      valid:
        value == null ||
        /^[A-Z]{2}\d{7}$/.test(typeof value === 'string' ? value : JSON.stringify(value)),
      error: 'DEA number must be 2 letters followed by 7 digits',
    }),
  },
];

// =============================================================================
// Attribute Mapper Class
// =============================================================================

/**
 * AD Attribute Mapper for user property transformation.
 *
 * Maps AD user attributes to application user properties using
 * configurable mapping rules with support for transformation,
 * validation, and custom extraction logic.
 *
 * @example
 * ```typescript
 * const mapper = new ADAttributeMapper({
 *   mappings: DEFAULT_ATTRIBUTE_MAPPINGS,
 *   includeUnmapped: true,
 *   unmappedPrefix: 'ad_',
 * });
 *
 * const result = mapper.mapAttributes(adUserAttributes);
 * if (result.success) {
 *   console.log('Mapped attributes:', result.attributes);
 * } else {
 *   console.error('Mapping errors:', result.errors);
 * }
 * ```
 */
export class ADAttributeMapper {
  private readonly config: AttributeMappingConfig;

  /**
   * Create a new attribute mapper.
   *
   * @param config - Attribute mapping configuration
   */
  constructor(config: Partial<AttributeMappingConfig> = {}) {
    this.config = {
      mappings: config.mappings ?? DEFAULT_ATTRIBUTE_MAPPINGS,
      includeUnmapped: config.includeUnmapped ?? false,
      unmappedPrefix: config.unmappedPrefix ?? 'ad_',
      extensionMappings: config.extensionMappings ?? {},
      excludeAttributes: config.excludeAttributes ?? [],
    };
  }

  /**
   * Map AD user attributes to application user properties.
   *
   * @param source - Source AD user attributes
   * @returns Mapping result with attributes and any errors
   */
  mapAttributes(source: ADUserAttributes): AttributeMappingResult {
    const attributes: Record<string, unknown> = {};
    const errors: Array<{ attribute: string; error: string }> = [];
    const processedKeys = new Set<string>();

    // Process each mapping
    for (const mapping of this.config.mappings) {
      const sourceKey = mapping.source;
      processedKeys.add(sourceKey);

      try {
        // Extract value using custom extractor or direct access
        let value: unknown;
        if (mapping.extract) {
          value = mapping.extract(source);
        } else {
          value = this.getNestedValue(source as unknown as Record<string, unknown>, sourceKey);
        }

        // Apply validation if present
        if (
          mapping.validate !== undefined &&
          mapping.validate !== null &&
          value !== undefined &&
          value !== null
        ) {
          const validation = mapping.validate(value, sourceKey);
          if (!validation.valid) {
            errors.push({
              attribute: sourceKey,
              error: validation.error ?? `Validation failed for ${sourceKey}`,
            });

            if (mapping.required === true) {
              continue; // Skip required attributes that fail validation
            }
          }
        }

        // Check for required attributes
        if (mapping.required === true && (value === undefined || value === null)) {
          errors.push({
            attribute: sourceKey,
            error: `Required attribute '${sourceKey}' is missing`,
          });
          continue;
        }

        // Apply transformation if present
        if (mapping.transform !== undefined && mapping.transform !== null && value !== undefined) {
          value = mapping.transform(value, source);
        }

        // Use default value if needed
        if (
          (value === undefined || value === null) &&
          mapping.defaultValue !== undefined &&
          mapping.defaultValue !== null
        ) {
          value = mapping.defaultValue;
        }

        // Set the target attribute
        if (value !== undefined && value !== null) {
          attributes[mapping.target] = value;
        }
      } catch (error) {
        errors.push({
          attribute: sourceKey,
          error: `Error mapping '${sourceKey}': ${(error as Error).message}`,
        });
      }
    }

    // Process extension attribute mappings
    if (
      this.config.extensionMappings !== undefined &&
      this.config.extensionMappings !== null &&
      source.extensionAttributes !== undefined &&
      source.extensionAttributes !== null
    ) {
      for (const [extAttr, targetAttr] of Object.entries(this.config.extensionMappings)) {
        const value = source.extensionAttributes[extAttr];
        if (value !== undefined && value !== null) {
          attributes[targetAttr] = value;
        }
      }
    }

    // Collect unmapped attributes if requested
    let unmapped: Record<string, unknown> | undefined;
    if (this.config.includeUnmapped === true) {
      unmapped = {};
      const excludeSet = new Set(this.config.excludeAttributes);

      for (const [key, value] of Object.entries(source)) {
        if (
          !processedKeys.has(key) &&
          !excludeSet.has(key) &&
          value !== undefined &&
          value !== null
        ) {
          unmapped[`${this.config.unmappedPrefix}${key}`] = value;
        }
      }
    }

    // Determine success based on required attribute errors
    const hasRequiredErrors = errors.some((error) =>
      this.config.mappings.some((m) => m.source === error.attribute && m.required === true)
    );

    return {
      attributes,
      errors,
      unmapped,
      success: !hasRequiredErrors,
    };
  }

  /**
   * Map AD user to application User type.
   *
   * @param adUser - Source AD user
   * @returns Mapped application User
   */
  mapToUser(adUser: ADUser): User {
    const result = this.mapAttributes(adUser.adAttributes);

    return {
      id: (result.attributes['id'] as string) || adUser.adAttributes.objectId,
      email: (result.attributes['email'] as string) || adUser.email,
      firstName: (result.attributes['firstName'] as string) || adUser.firstName,
      lastName: (result.attributes['lastName'] as string) || adUser.lastName,
      displayName: (result.attributes['displayName'] as string) || adUser.displayName,
      avatarUrl: adUser.avatarUrl,
      roles: adUser.roles,
      permissions: adUser.permissions,
      metadata: {
        ...result.unmapped,
        ...adUser.metadata,
        adObjectId: adUser.adAttributes.objectId,
        adProvider: adUser.adProvider,
      },
      createdAt: (result.attributes['createdAt'] as string) || adUser.createdAt,
      updatedAt: adUser.updatedAt,
    };
  }

  /**
   * Add a mapping at runtime.
   *
   * @param mapping - Mapping to add
   */
  addMapping(mapping: AttributeMapping): void {
    this.config.mappings.push(mapping);
  }

  /**
   * Remove a mapping by source attribute.
   *
   * @param source - Source attribute name to remove
   */
  removeMapping(source: string): void {
    this.config.mappings = this.config.mappings.filter((m) => m.source !== source);
  }

  /**
   * Get the current configuration.
   */
  getConfig(): AttributeMappingConfig {
    return { ...this.config };
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Get a nested value from an object using dot notation.
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }

    return current;
  }
}

// =============================================================================
// Common Transformers
// =============================================================================

/**
 * Pre-built attribute transformers for common use cases.
 */
export const attributeTransformers = {
  /**
   * Normalize email to lowercase.
   */
  normalizeEmail: (value: string | undefined): string | undefined => value?.toLowerCase().trim(),

  /**
   * Format display name (proper case).
   */
  formatDisplayName: (value: string | undefined): string | undefined => {
    if (value === undefined || value === null || value === '') return value;
    return value
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },

  /**
   * Parse phone number to E.164 format.
   */
  normalizePhone: (value: string | undefined): string | undefined => {
    if (value === undefined || value === null || value === '') return value;
    // Remove all non-numeric characters except leading +
    const cleaned = value.replace(/[^\d+]/g, '');
    // Ensure US numbers start with +1
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  },

  /**
   * Convert ISO date string to timestamp.
   */
  dateToTimestamp: (value: string | undefined): number | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date.getTime();
  },

  /**
   * Parse boolean from string.
   */
  parseBoolean: (value: unknown): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    return Boolean(value);
  },

  /**
   * Parse array from comma-separated string.
   */
  parseArray: (value: string | string[] | undefined): string[] => {
    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) return value;
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  },

  /**
   * Mask sensitive data (show last 4 characters).
   */
  maskSensitive: (value: string | undefined): string | undefined => {
    if (value === undefined || value === null) return value;
    if (value === '' || value.length <= 4) return '****';
    return '*'.repeat(value.length - 4) + value.slice(-4);
  },
} as const;

// =============================================================================
// Common Validators
// =============================================================================

/**
 * Pre-built attribute validators for common use cases.
 */
export const attributeValidators = {
  /**
   * Validate email format.
   */
  email: (value: string | undefined, attr: string): { valid: boolean; error?: string } => {
    if (value === undefined || value === null || value === '') return { valid: true };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
      valid: emailRegex.test(value),
      error: `${attr} must be a valid email address`,
    };
  },

  /**
   * Validate UPN format.
   */
  upn: (value: string | undefined, attr: string): { valid: boolean; error?: string } => {
    if (value === undefined || value === null || value === '') return { valid: true };
    const upnRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+$/;
    return {
      valid: upnRegex.test(value),
      error: `${attr} must be a valid User Principal Name`,
    };
  },

  /**
   * Validate GUID format.
   */
  guid: (value: string | undefined, attr: string): { valid: boolean; error?: string } => {
    if (value === undefined || value === null || value === '') return { valid: true };
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return {
      valid: guidRegex.test(value),
      error: `${attr} must be a valid GUID`,
    };
  },

  /**
   * Validate string length.
   */
  maxLength:
    (max: number) =>
    (value: string | undefined, attr: string): { valid: boolean; error?: string } => {
      if (value === undefined || value === null || value === '') return { valid: true };
      return {
        valid: value.length <= max,
        error: `${attr} must be at most ${max} characters`,
      };
    },

  /**
   * Validate required field.
   */
  required: (value: unknown, attr: string): { valid: boolean; error?: string } => ({
    valid: value !== undefined && value !== null && value !== '',
    error: `${attr} is required`,
  }),

  /**
   * Validate against regex pattern.
   */
  pattern:
    (regex: RegExp, message: string) =>
    (value: string | undefined, attr: string): { valid: boolean; error?: string } => {
      if (value === undefined || value === null || value === '') return { valid: true };
      return {
        valid: regex.test(value),
        error:
          message !== undefined && message !== null && message !== ''
            ? message
            : `${attr} does not match required pattern`,
      };
    },
} as const;

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create an attribute mapper with default configuration.
 *
 * @param options - Configuration options
 * @returns Configured ADAttributeMapper
 */
export function createAttributeMapper(
  options: {
    includeExtended?: boolean;
    includeHealthcare?: boolean;
    customMappings?: AttributeMapping[];
    includeUnmapped?: boolean;
    extensionMappings?: Record<string, string>;
  } = {}
): ADAttributeMapper {
  const mappings = [...DEFAULT_ATTRIBUTE_MAPPINGS];

  if (options.includeExtended === true) {
    mappings.push(...EXTENDED_ATTRIBUTE_MAPPINGS);
  }

  if (options.includeHealthcare === true) {
    mappings.push(...HEALTHCARE_ATTRIBUTE_MAPPINGS);
  }

  if (options.customMappings) {
    mappings.push(...options.customMappings);
  }

  return new ADAttributeMapper({
    mappings,
    includeUnmapped: options.includeUnmapped ?? false,
    extensionMappings: options.extensionMappings,
  });
}

/**
 * Create a mapping for a custom extension attribute.
 *
 * @param extensionName - Name of the extension attribute
 * @param targetName - Target property name
 * @param options - Additional mapping options
 * @returns AttributeMapping for the extension
 */
export function createExtensionMapping<T>(
  extensionName: string,
  targetName: string,
  options?: {
    transform?: AttributeTransformer<T>;
    validate?: AttributeValidator<T>;
    required?: boolean;
    defaultValue?: T;
  }
): AttributeMapping<T> {
  return {
    source: 'extensionAttributes',
    target: targetName,
    extract: (source) => source.extensionAttributes?.[extensionName] as T,
    transform: options?.transform,
    validate: options?.validate,
    required: options?.required,
    defaultValue: options?.defaultValue,
  };
}
