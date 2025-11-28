/**
 * @file useConfigValue Hook
 * @description Hook for accessing a specific configuration value with type safety.
 *
 * @module config/hooks/useConfigValue
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import type { ConfigNamespace, ConfigValue, ConfigChangeEvent } from '../types';
import { useConfigContext } from '../ConfigProvider';

/**
 * Options for useConfigValue hook
 */
export interface UseConfigValueOptions<T> {
  /** Default value if config is not found */
  defaultValue?: T;
  /** Whether to subscribe to changes (default: true) */
  subscribe?: boolean;
  /** Transform function to apply to the value */
  transform?: (value: T | undefined) => T;
}

/**
 * Return type for useConfigValue hook
 */
export interface UseConfigValueResult<T> {
  /** Current value */
  value: T;
  /** Whether the value exists */
  exists: boolean;
  /** Whether config is loading */
  isLoading: boolean;
  /** Set a new value (if writable) */
  setValue: (newValue: T) => void;
}

/**
 * Hook for accessing a specific configuration value
 *
 * Provides reactive access to a single configuration value
 * with automatic subscription to changes.
 *
 * @param namespace - Configuration namespace
 * @param key - Configuration key
 * @param options - Hook options
 * @returns Configuration value result
 *
 * @example
 * ```tsx
 * function BufferSizeInput() {
 *   const { value, setValue, isLoading } = useConfigValue<number>(
 *     CONFIG_NAMESPACES.STREAMING,
 *     'bufferSize',
 *     { defaultValue: 65536 }
 *   );
 *
 *   if (isLoading) return <LoadingSpinner />;
 *
 *   return (
 *     <input
 *       type="number"
 *       value={value}
 *       onChange={(e) => setValue(Number(e.target.value))}
 *     />
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With transform
 * function FormattedBufferSize() {
 *   const { value } = useConfigValue<string>(
 *     CONFIG_NAMESPACES.STREAMING,
 *     'bufferSize',
 *     {
 *       transform: (v) => `${(Number(v) / 1024).toFixed(1)} KB`,
 *     }
 *   );
 *
 *   return <span>{value}</span>;
 * }
 * ```
 */
export function useConfigValue<T extends ConfigValue = ConfigValue>(
  namespace: ConfigNamespace,
  key: string,
  options: UseConfigValueOptions<T> = {}
): UseConfigValueResult<T> {
  const { defaultValue, subscribe: shouldSubscribe = true, transform } = options;
  const { get, has, subscribe, isInitialized, registry } = useConfigContext();

  // Track if value has been set at least once
  const hasValueRef = useRef(false);

  // Get current value
  const getValue = useCallback((): T => {
    const rawValue = get<T>(namespace, key);
    const finalValue = rawValue !== undefined ? rawValue : (defaultValue as T);

    if (transform && finalValue !== undefined) {
      return transform(finalValue);
    }

    return finalValue as T;
  }, [get, namespace, key, defaultValue, transform]);

  const [value, setValueState] = useState<T>(getValue);
  const [exists, setExists] = useState(() => has(namespace, key));

  // Subscribe to changes
  useEffect(() => {
    if (!shouldSubscribe) {
      return;
    }

    const handleChange = (event: ConfigChangeEvent) => {
      // Only react to changes for this specific key
      if (event.key === key || event.key === '*') {
        setValueState(getValue());
        setExists(has(namespace, key));
        hasValueRef.current = true;
      }
    };

    // Subscribe to changes for this specific key
    const unsubscribe = subscribe(namespace, key, handleChange);

    return unsubscribe;
  }, [namespace, key, subscribe, shouldSubscribe, getValue, has]);

  // Sync with context when initialized
  useEffect(() => {
    if (isInitialized && !hasValueRef.current) {
      setValueState(getValue());
      setExists(has(namespace, key));
      hasValueRef.current = true;
    }
  }, [isInitialized, getValue, has, namespace, key]);

  // Set value function
  const setValue = useCallback(
    (newValue: T) => {
      registry.set(namespace, key, newValue, { source: 'runtime' });
    },
    [registry, namespace, key]
  );

  return {
    value,
    exists,
    isLoading: !isInitialized,
    setValue,
  };
}

/**
 * Hook for accessing a boolean configuration value
 *
 * @param namespace - Configuration namespace
 * @param key - Configuration key
 * @param defaultValue - Default value (default: false)
 * @returns Boolean value and toggle function
 *
 * @example
 * ```tsx
 * function StreamingToggle() {
 *   const { value, toggle } = useConfigBoolean(
 *     CONFIG_NAMESPACES.STREAMING,
 *     'enabled',
 *     true
 *   );
 *
 *   return (
 *     <Switch checked={value} onChange={toggle} label="Enable Streaming" />
 *   );
 * }
 * ```
 */
export function useConfigBoolean(
  namespace: ConfigNamespace,
  key: string,
  defaultValue: boolean = false
): {
  value: boolean;
  setValue: (value: boolean) => void;
  toggle: () => void;
  isLoading: boolean;
} {
  const { value, setValue, isLoading } = useConfigValue<boolean>(namespace, key, {
    defaultValue,
  });

  const toggle = useCallback(() => {
    setValue(!value);
  }, [value, setValue]);

  return {
    value: Boolean(value),
    setValue,
    toggle,
    isLoading,
  };
}

/**
 * Hook for accessing a numeric configuration value
 *
 * @param namespace - Configuration namespace
 * @param key - Configuration key
 * @param options - Numeric value options
 * @returns Numeric value and adjustment functions
 *
 * @example
 * ```tsx
 * function BufferSizeSlider() {
 *   const { value, increment, decrement } = useConfigNumber(
 *     CONFIG_NAMESPACES.STREAMING,
 *     'bufferSize',
 *     { defaultValue: 65536, min: 1024, max: 1048576, step: 1024 }
 *   );
 *
 *   return (
 *     <div>
 *       <button onClick={decrement}>-</button>
 *       <span>{value}</span>
 *       <button onClick={increment}>+</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useConfigNumber(
  namespace: ConfigNamespace,
  key: string,
  options: {
    defaultValue?: number;
    min?: number;
    max?: number;
    step?: number;
  } = {}
): {
  value: number;
  setValue: (value: number) => void;
  increment: () => void;
  decrement: () => void;
  isLoading: boolean;
} {
  const { defaultValue = 0, min, max, step = 1 } = options;
  const { value, setValue: setRawValue, isLoading } = useConfigValue<number>(namespace, key, {
    defaultValue,
  });

  const setValue = useCallback(
    (newValue: number) => {
      let clampedValue = newValue;
      if (min !== undefined) clampedValue = Math.max(min, clampedValue);
      if (max !== undefined) clampedValue = Math.min(max, clampedValue);
      setRawValue(clampedValue);
    },
    [setRawValue, min, max]
  );

  const increment = useCallback(() => {
    setValue((value ?? defaultValue) + step);
  }, [value, defaultValue, step, setValue]);

  const decrement = useCallback(() => {
    setValue((value ?? defaultValue) - step);
  }, [value, defaultValue, step, setValue]);

  return {
    value: value ?? defaultValue,
    setValue,
    increment,
    decrement,
    isLoading,
  };
}

/**
 * Hook for accessing a string configuration value
 *
 * @param namespace - Configuration namespace
 * @param key - Configuration key
 * @param defaultValue - Default value (default: '')
 * @returns String value and setter
 *
 * @example
 * ```tsx
 * function ApiUrlInput() {
 *   const { value, setValue } = useConfigString(
 *     CONFIG_NAMESPACES.API,
 *     'baseUrl',
 *     'http://localhost:3001'
 *   );
 *
 *   return (
 *     <input
 *       type="text"
 *       value={value}
 *       onChange={(e) => setValue(e.target.value)}
 *     />
 *   );
 * }
 * ```
 */
export function useConfigString(
  namespace: ConfigNamespace,
  key: string,
  defaultValue: string = ''
): {
  value: string;
  setValue: (value: string) => void;
  clear: () => void;
  isLoading: boolean;
} {
  const { value, setValue, isLoading } = useConfigValue<string>(namespace, key, {
    defaultValue,
  });

  const clear = useCallback(() => {
    setValue('');
  }, [setValue]);

  return {
    value: value ?? defaultValue,
    setValue,
    clear,
    isLoading,
  };
}

/**
 * Hook for accessing an enum/select configuration value
 *
 * @param namespace - Configuration namespace
 * @param key - Configuration key
 * @param allowedValues - Array of allowed values
 * @param defaultValue - Default value
 * @returns Enum value and setter
 *
 * @example
 * ```tsx
 * function PrioritySelect() {
 *   const { value, setValue, options } = useConfigEnum(
 *     CONFIG_NAMESPACES.STREAMING,
 *     'priority',
 *     ['low', 'normal', 'high', 'critical'] as const,
 *     'normal'
 *   );
 *
 *   return (
 *     <select value={value} onChange={(e) => setValue(e.target.value)}>
 *       {options.map((opt) => (
 *         <option key={opt} value={opt}>{opt}</option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */
export function useConfigEnum<T extends string>(
  namespace: ConfigNamespace,
  key: string,
  allowedValues: readonly T[],
  defaultValue: T
): {
  value: T;
  setValue: (value: T) => void;
  options: readonly T[];
  isLoading: boolean;
} {
  const { value, setValue: setRawValue, isLoading } = useConfigValue<T>(namespace, key, {
    defaultValue,
  });

  const setValue = useCallback(
    (newValue: T) => {
      if (allowedValues.includes(newValue)) {
        setRawValue(newValue);
      }
    },
    [setRawValue, allowedValues]
  );

  // Ensure current value is valid
  const validValue = allowedValues.includes(value as T) ? (value as T) : defaultValue;

  return {
    value: validValue,
    setValue,
    options: allowedValues,
    isLoading,
  };
}

export default useConfigValue;
