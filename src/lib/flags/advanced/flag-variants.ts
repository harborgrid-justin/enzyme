/**
 * @fileoverview Multi-variate flag management and variant selection.
 *
 * Provides comprehensive variant management including:
 * - Variant definition and validation
 * - Variant value type coercion
 * - Variant weighting for experiments
 * - Variant payload management
 *
 * @module flags/advanced/flag-variants
 *
 * @example
 * ```typescript
 * const manager = new VariantManager();
 *
 * const variants = [
 *   manager.createVariant('control', { value: false, isControl: true }),
 *   manager.createVariant('variant-a', { value: { buttonColor: 'blue' } }),
 *   manager.createVariant('variant-b', { value: { buttonColor: 'green' } }),
 * ];
 *
 * const selected = manager.selectVariant(variants, bucket, allocations);
 * ```
 */

import type {
  Variant,
  VariantId,
  VariantValueType,
  JsonValue,
  VariantAllocation,
} from './types';
// import type { Mutable } from '../../utils/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for creating a variant.
 */
export interface CreateVariantOptions<T = JsonValue> {
  /** Variant value */
  readonly value: T;
  /** Human-readable name */
  readonly name?: string;
  /** Description */
  readonly description?: string;
  /** Whether this is the control variant */
  readonly isControl?: boolean;
  /** Additional payload data */
  readonly payload?: Record<string, JsonValue>;
  /** File/config attachments */
  readonly attachments?: string[];
}

/**
 * Variant with weight for traffic allocation.
 */
export interface WeightedVariant<T = JsonValue> extends Variant<T> {
  /** Weight for traffic allocation (0-100) */
  readonly weight: number;
}

/**
 * Variant statistics for experiments.
 */
export interface VariantStats {
  /** Variant ID */
  readonly variantId: VariantId;
  /** Number of users assigned */
  readonly userCount: number;
  /** Number of conversions */
  readonly conversions: number;
  /** Conversion rate */
  readonly conversionRate: number;
  /** Average value (for numeric metrics) */
  readonly averageValue?: number;
  /** Standard deviation */
  readonly standardDeviation?: number;
  /** Confidence interval */
  readonly confidenceInterval?: [number, number];
}

/**
 * Variant comparison result.
 */
export interface VariantComparison {
  /** Control variant stats */
  readonly control: VariantStats;
  /** Treatment variant stats */
  readonly treatment: VariantStats;
  /** Relative lift (treatment vs control) */
  readonly relativeLift: number;
  /** Statistical significance (p-value) */
  readonly pValue: number;
  /** Whether result is statistically significant */
  readonly isSignificant: boolean;
  /** Confidence level used */
  readonly confidenceLevel: number;
}

// ============================================================================
// Variant Manager
// ============================================================================

/**
 * Manager for creating and working with flag variants.
 */
export class VariantManager {
  /**
   * Create a new variant.
   */
  createVariant<T extends JsonValue>(
    id: VariantId,
    options: CreateVariantOptions<T>
  ): Variant<T> {
    const valueType = this.inferValueType(options.value);

    return {
      id,
      name: options.name ?? id,
      description: options.description,
      value: options.value,
      valueType,
      isControl: options.isControl ?? false,
      payload: options.payload,
      attachments: options.attachments,
    };
  }

  /**
   * Create a boolean variant.
   */
  createBooleanVariant(
    id: VariantId,
    value: boolean,
    options?: Omit<CreateVariantOptions<boolean>, 'value'>
  ): Variant<boolean> {
    return {
      id,
      name: options?.name ?? id,
      description: options?.description,
      value,
      valueType: 'boolean',
      isControl: options?.isControl ?? false,
      payload: options?.payload,
      attachments: options?.attachments,
    };
  }

  /**
   * Create a string variant.
   */
  createStringVariant(
    id: VariantId,
    value: string,
    options?: Omit<CreateVariantOptions<string>, 'value'>
  ): Variant<string> {
    return {
      id,
      name: options?.name ?? id,
      description: options?.description,
      value,
      valueType: 'string',
      isControl: options?.isControl ?? false,
      payload: options?.payload,
      attachments: options?.attachments,
    };
  }

  /**
   * Create a number variant.
   */
  createNumberVariant(
    id: VariantId,
    value: number,
    options?: Omit<CreateVariantOptions<number>, 'value'>
  ): Variant<number> {
    return {
      id,
      name: options?.name ?? id,
      description: options?.description,
      value,
      valueType: 'number',
      isControl: options?.isControl ?? false,
      payload: options?.payload,
      attachments: options?.attachments,
    };
  }

  /**
   * Create a JSON variant.
   */
  createJsonVariant<T extends JsonValue>(
    id: VariantId,
    value: T,
    options?: Omit<CreateVariantOptions<T>, 'value'>
  ): Variant<T> {
    return {
      id,
      name: options?.name ?? id,
      description: options?.description,
      value,
      valueType: 'json',
      isControl: options?.isControl ?? false,
      payload: options?.payload,
      attachments: options?.attachments,
    };
  }

  /**
   * Infer the value type from a value.
   */
  inferValueType(value: JsonValue): VariantValueType {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    return 'json';
  }

  /**
   * Validate a variant value against its declared type.
   */
  validateVariant(variant: Variant): boolean {
    switch (variant.valueType) {
      case 'boolean':
        return typeof variant.value === 'boolean';
      case 'string':
        return typeof variant.value === 'string';
      case 'number':
        return typeof variant.value === 'number';
      case 'json':
        return variant.value !== undefined;
      default:
        return false;
    }
  }

  /**
   * Coerce a value to the expected type.
   */
  coerceValue<T extends JsonValue>(
    value: unknown,
    targetType: VariantValueType
  ): T | null {
    try {
      switch (targetType) {
        case 'boolean':
          if (typeof value === 'boolean') return value as T;
          if (typeof value === 'string') {
            if (value === 'true') return true as T;
            if (value === 'false') return false as T;
          }
          if (typeof value === 'number') return (value !== 0) as T;
          return null;

        case 'string':
          if (typeof value === 'string') return value as T;
          if (value === null || value === undefined) return null;
          if (typeof value === 'object') return JSON.stringify(value) as T;
          if (typeof value === 'boolean' || typeof value === 'number') return String(value) as T;
          return null;

        case 'number':
          if (typeof value === 'number') return value as T;
          if (typeof value === 'string') {
            const parsed = parseFloat(value);
            return isNaN(parsed) ? null : (parsed as T);
          }
          return null;

        case 'json':
          if (typeof value === 'string') {
            try {
              return JSON.parse(value) as T;
            } catch {
              return null;
            }
          }
          return value as T;

        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * Select a variant based on a bucket value and allocations.
   */
  selectVariant<T extends JsonValue>(
    variants: readonly Variant<T>[],
    bucket: number,
    allocations?: readonly VariantAllocation[]
  ): Variant<T> | null {
    if (variants.length === 0) {
      return null;
    }

    // If allocations are provided, use weighted selection
    if (allocations && allocations.length > 0) {
      let cumulative = 0;
      for (const allocation of allocations) {
        cumulative += allocation.percentage;
        if (bucket < cumulative) {
          const variant = variants.find((v) => v.id === allocation.variantId);
          if (variant) return variant;
        }
      }
    }

    // Equal weight selection
    const index = Math.floor((bucket / 100) * variants.length);
    return variants[Math.min(index, variants.length - 1)] ?? null;
  }

  /**
   * Get the control variant from a list.
   */
  getControlVariant<T extends JsonValue>(
    variants: readonly Variant<T>[]
  ): Variant<T> | null {
    return variants.find((v) => v.isControl === true) ?? null;
  }

  /**
   * Get all treatment (non-control) variants.
   */
  getTreatmentVariants<T extends JsonValue>(
    variants: readonly Variant<T>[]
  ): Variant<T>[] {
    return variants.filter((v) => v.isControl !== true);
  }

  /**
   * Create equal allocations for variants.
   */
  createEqualAllocations(
    variants: readonly Variant[]
  ): VariantAllocation[] {
    const percentage = 100 / variants.length;
    return variants.map((v) => ({
      variantId: v.id,
      percentage,
    }));
  }

  /**
   * Create weighted allocations with control getting most traffic.
   */
  createControlHeavyAllocations(
    variants: readonly Variant[],
    controlPercentage: number = 50
  ): VariantAllocation[] {
    const control = variants.find((v) => v.isControl === true);
    const treatments = variants.filter((v) => v.isControl !== true);

    if (!control || treatments.length === 0) {
      return this.createEqualAllocations(variants);
    }

    const treatmentPercentage = (100 - controlPercentage) / treatments.length;

    return [
      { variantId: control.id, percentage: controlPercentage },
      ...treatments.map((v) => ({
        variantId: v.id,
        percentage: treatmentPercentage,
      })),
    ];
  }
}

// ============================================================================
// Variant Builder
// ============================================================================

/**
 * Mutable variant type for builder.
 */
type MutableVariant<T extends JsonValue = JsonValue> = {
  -readonly [K in keyof Variant<T>]: Variant<T>[K];
};

/**
 * Fluent builder for creating variants.
 */
export class VariantBuilder<T extends JsonValue = JsonValue> {
  private variant: Partial<MutableVariant<T>> = {};

  /**
   * Set the variant ID.
   */
  id(id: VariantId): this {
    this.variant.id = id;
    return this;
  }

  /**
   * Set the variant name.
   */
  name(name: string): this {
    this.variant.name = name;
    return this;
  }

  /**
   * Set the variant description.
   */
  description(description: string): this {
    this.variant.description = description;
    return this;
  }

  /**
   * Set the variant value.
   */
  value(value: T): this {
    this.variant.value = value;
    this.variant.valueType = new VariantManager().inferValueType(value);
    return this;
  }

  /**
   * Mark as control variant.
   */
  asControl(): this {
    this.variant.isControl = true;
    return this;
  }

  /**
   * Add payload data.
   */
  payload(data: Record<string, JsonValue>): this {
    this.variant.payload = data;
    return this;
  }

  /**
   * Add attachments.
   */
  attachments(...files: string[]): this {
    this.variant.attachments = files;
    return this;
  }

  /**
   * Build the variant.
   */
  build(): Variant<T> {
    if (this.variant.id == null || this.variant.id === '') {
      throw new Error('Variant ID is required');
    }
    if (this.variant.value === undefined) {
      throw new Error('Variant value is required');
    }

    return {
      id: this.variant.id,
      name: this.variant.name ?? this.variant.id,
      description: this.variant.description,
      value: this.variant.value,
      valueType: this.variant.valueType ?? 'json',
      isControl: this.variant.isControl ?? false,
      payload: this.variant.payload,
      attachments: this.variant.attachments,
    };
  }
}

/**
 * Create a new variant builder.
 */
export function createVariant<T extends JsonValue = JsonValue>(): VariantBuilder<T> {
  return new VariantBuilder<T>();
}

// ============================================================================
// Predefined Variant Sets
// ============================================================================

/**
 * Common variant patterns.
 */
export const VariantSets = {
  /**
   * Simple on/off boolean variants.
   */
  boolean(): [Variant<boolean>, Variant<boolean>] {
    const manager = new VariantManager();
    return [
      manager.createBooleanVariant('off', false, { isControl: true, name: 'Off' }),
      manager.createBooleanVariant('on', true, { name: 'On' }),
    ];
  },

  /**
   * A/B test variants (control + treatment).
   */
  abTest<T extends JsonValue>(
    controlValue: T,
    treatmentValue: T
  ): [Variant<T>, Variant<T>] {
    const manager = new VariantManager();
    return [
      manager.createVariant('control', {
        value: controlValue,
        name: 'Control',
        isControl: true,
      }),
      manager.createVariant('treatment', {
        value: treatmentValue,
        name: 'Treatment',
      }),
    ];
  },

  /**
   * A/B/C test variants.
   */
  abcTest<T extends JsonValue>(
    controlValue: T,
    treatmentAValue: T,
    treatmentBValue: T
  ): [Variant<T>, Variant<T>, Variant<T>] {
    const manager = new VariantManager();
    return [
      manager.createVariant('control', {
        value: controlValue,
        name: 'Control',
        isControl: true,
      }),
      manager.createVariant('treatment-a', {
        value: treatmentAValue,
        name: 'Treatment A',
      }),
      manager.createVariant('treatment-b', {
        value: treatmentBValue,
        name: 'Treatment B',
      }),
    ];
  },

  /**
   * Multi-value variants from a map.
   */
  fromMap<T extends JsonValue>(
    values: Record<string, T>,
    controlId?: string
  ): Variant<T>[] {
    const manager = new VariantManager();
    return Object.entries(values).map(([id, value]) =>
      manager.createVariant(id, {
        value,
        isControl: id === controlId,
      })
    );
  },

  /**
   * Color variants for UI experiments.
   */
  colors(
    colors: Record<string, string>,
    controlColor?: string
  ): Variant<string>[] {
    const manager = new VariantManager();
    return Object.entries(colors).map(([name, value]) =>
      manager.createStringVariant(name, value, {
        name: `Color: ${name}`,
        isControl: value === controlColor,
      })
    );
  },

  /**
   * Size variants (e.g., for button sizes).
   */
  sizes(): Variant<string>[] {
    return VariantSets.fromMap(
      {
        small: 'small',
        medium: 'medium',
        large: 'large',
      },
      'medium'
    );
  },
};

// ============================================================================
// Statistical Utilities
// ============================================================================

/**
 * Calculate basic statistics for a variant.
 */
export function calculateVariantStats(
  variantId: VariantId,
  values: number[],
  conversions: number
): VariantStats {
  const n = values.length;
  if (n === 0) {
    return {
      variantId,
      userCount: 0,
      conversions: 0,
      conversionRate: 0,
    };
  }

  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // 95% confidence interval
  const z = 1.96;
  const margin = z * (stdDev / Math.sqrt(n));

  return {
    variantId,
    userCount: n,
    conversions,
    conversionRate: conversions / n,
    averageValue: mean,
    standardDeviation: stdDev,
    confidenceInterval: [mean - margin, mean + margin],
  };
}

/**
 * Compare two variants using a z-test.
 */
export function compareVariants(
  control: VariantStats,
  treatment: VariantStats,
  confidenceLevel: number = 0.95
): VariantComparison {
  const relativeLift =
    control.conversionRate > 0
      ? (treatment.conversionRate - control.conversionRate) /
        control.conversionRate
      : 0;

  // Two-proportion z-test
  const p1 = control.conversionRate;
  const p2 = treatment.conversionRate;
  const n1 = control.userCount;
  const n2 = treatment.userCount;

  if (n1 === 0 || n2 === 0) {
    return {
      control,
      treatment,
      relativeLift,
      pValue: 1,
      isSignificant: false,
      confidenceLevel,
    };
  }

  const pooledP = (control.conversions + treatment.conversions) / (n1 + n2);
  const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

  const z = se > 0 ? (p2 - p1) / se : 0;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));

  return {
    control,
    treatment,
    relativeLift,
    pValue,
    isSignificant: pValue < 1 - confidenceLevel,
    confidenceLevel,
  };
}

/**
 * Standard normal cumulative distribution function.
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: VariantManager | null = null;

/**
 * Get the singleton variant manager instance.
 */
export function getVariantManager(): VariantManager {
  instance ??= new VariantManager();
  return instance;
}
