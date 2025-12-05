/**
 * Function Type Utilities
 *
 * Advanced utilities for working with function types, including parameter
 * manipulation, return type inference, and function composition types.
 *
 * @module types/function
 * @category Type Utilities
 */

/**
 * Makes all function parameters optional
 *
 * @template T - The function type
 *
 * @example
 * ```typescript
 * type Fn = (a: string, b: number, c: boolean) => void;
 * type Optional = OptionalParameters<Fn>;
 * // (a?: string, b?: number, c?: boolean) => void
 * ```
 */
export type OptionalParameters<T extends (...args: any[]) => any> = (
  ...args: Partial<Parameters<T>>
) => ReturnType<T>;

/**
 * Makes all function parameters required
 *
 * @template T - The function type
 *
 * @example
 * ```typescript
 * type Fn = (a?: string, b?: number) => void;
 * type Required = RequiredParameters<Fn>;
 * // (a: string, b: number) => void
 * ```
 */
export type RequiredParameters<T extends (...args: any[]) => any> = (
  ...args: Required<Parameters<T>>
) => ReturnType<T>;

/**
 * Extracts parameter at specific index
 *
 * @template T - The function type
 * @template N - The parameter index
 *
 * @example
 * ```typescript
 * type Fn = (a: string, b: number, c: boolean) => void;
 * type First = ParameterAt<Fn, 0>; // string
 * type Second = ParameterAt<Fn, 1>; // number
 * ```
 */
export type ParameterAt<
  T extends (...args: any[]) => any,
  N extends number
> = Parameters<T>[N];

/**
 * Gets the first parameter type
 *
 * @template T - The function type
 *
 * @example
 * ```typescript
 * type Fn = (a: string, b: number) => void;
 * type First = FirstParameter<Fn>; // string
 * ```
 */
export type FirstParameter<T extends (...args: any[]) => any> = Parameters<T>[0];

/**
 * Gets the last parameter type
 *
 * @template T - The function type
 *
 * @example
 * ```typescript
 * type Fn = (a: string, b: number, c: boolean) => void;
 * type Last = LastParameter<Fn>; // boolean
 * ```
 */
export type LastParameter<T extends (...args: any[]) => any> =
  Parameters<T> extends [...any[], infer L] ? L : never;

/**
 * Omits first N parameters from function
 *
 * @template T - The function type
 * @template N - Number of parameters to omit
 *
 * @example
 * ```typescript
 * type Fn = (a: string, b: number, c: boolean) => void;
 * type Omitted = OmitParameters<Fn, 1>;
 * // (b: number, c: boolean) => void
 * ```
 */
export type OmitParameters<
  T extends (...args: any[]) => any,
  N extends number
> = Parameters<T> extends [...infer Omitted, ...infer Rest]
  ? Omitted['length'] extends N
    ? (...args: Rest) => ReturnType<T>
    : never
  : never;

/**
 * Prepends parameters to a function
 *
 * @template T - The function type
 * @template P - Parameters to prepend
 *
 * @example
 * ```typescript
 * type Fn = (b: number) => string;
 * type Extended = PrependParameters<Fn, [string]>;
 * // (a: string, b: number) => string
 * ```
 */
export type PrependParameters<
  T extends (...args: any[]) => any,
  P extends readonly any[]
> = (...args: [...P, ...Parameters<T>]) => ReturnType<T>;

/**
 * Appends parameters to a function
 *
 * @template T - The function type
 * @template P - Parameters to append
 *
 * @example
 * ```typescript
 * type Fn = (a: string) => number;
 * type Extended = AppendParameters<Fn, [boolean]>;
 * // (a: string, b: boolean) => number
 * ```
 */
export type AppendParameters<
  T extends (...args: any[]) => any,
  P extends readonly any[]
> = (...args: [...Parameters<T>, ...P]) => ReturnType<T>;

/**
 * Changes the return type of a function
 *
 * @template T - The function type
 * @template R - The new return type
 *
 * @example
 * ```typescript
 * type Fn = (a: string) => number;
 * type Changed = ChangeReturnType<Fn, Promise<number>>;
 * // (a: string) => Promise<number>
 * ```
 */
export type ChangeReturnType<
  T extends (...args: any[]) => any,
  R
> = (...args: Parameters<T>) => R;

/**
 * Wraps return type with a container type
 *
 * @template T - The function type
 * @template Wrapper - The wrapper type
 *
 * @example
 * ```typescript
 * type Fn = (a: string) => number;
 * type Wrapped = WrapReturnType<Fn, Promise>;
 * // (a: string) => Promise<number>
 * ```
 */
export type WrapReturnType<
  T extends (...args: any[]) => any,
  Wrapper extends new (x: any) => any
> = (...args: Parameters<T>) => Wrapper extends new (x: ReturnType<T>) => infer R
  ? R
  : never;

/**
 * Makes a function async (wraps return in Promise)
 *
 * @template T - The function type
 *
 * @example
 * ```typescript
 * type Fn = (a: string) => number;
 * type Async = AsyncFunction<Fn>;
 * // (a: string) => Promise<number>
 * ```
 */
export type AsyncFunction<T extends (...args: any[]) => any> = (
  ...args: Parameters<T>
) => Promise<ReturnType<T>>;

/**
 * Unwraps Promise from async function return type
 *
 * @template T - The async function type
 *
 * @example
 * ```typescript
 * type AsyncFn = (a: string) => Promise<number>;
 * type Sync = SyncFunction<AsyncFn>;
 * // (a: string) => number
 * ```
 */
export type SyncFunction<T extends (...args: any[]) => any> = (
  ...args: Parameters<T>
) => ReturnType<T> extends Promise<infer U> ? U : ReturnType<T>;

/**
 * Curries a function type
 *
 * @template T - The function type
 *
 * @example
 * ```typescript
 * type Fn = (a: string, b: number, c: boolean) => void;
 * type Curried = Curry<Fn>;
 * // (a: string) => (b: number) => (c: boolean) => void
 * ```
 */
export type Curry<T extends (...args: any[]) => any> = Parameters<T> extends [
  infer First,
  ...infer Rest
]
  ? Rest extends []
    ? (arg: First) => ReturnType<T>
    : (arg: First) => Curry<(...args: Rest) => ReturnType<T>>
  : never;

/**
 * Uncurries a curried function type
 *
 * @template T - The curried function type
 *
 * @example
 * ```typescript
 * type Curried = (a: string) => (b: number) => boolean;
 * type Uncurried = Uncurry<Curried>;
 * // (a: string, b: number) => boolean
 * ```
 */
export type Uncurry<T extends (...args: any[]) => any> = T extends (
  arg: infer First
) => infer Rest
  ? Rest extends (...args: any[]) => any
    ? (...args: [First, ...Parameters<Uncurry<Rest>>]) => ReturnType<Uncurry<Rest>>
    : (arg: First) => Rest
  : never;

/**
 * Composes two function types
 *
 * @template F - First function type
 * @template G - Second function type
 *
 * @example
 * ```typescript
 * type F = (a: string) => number;
 * type G = (b: number) => boolean;
 * type Composed = Compose<G, F>;
 * // (a: string) => boolean
 * ```
 */
export type Compose<
  F extends (...args: any[]) => any,
  G extends (arg: ReturnType<F>) => any
> = (...args: Parameters<F>) => ReturnType<G>;

/**
 * Pipes multiple function types
 *
 * @template Fns - Tuple of function types
 *
 * @example
 * ```typescript
 * type Fns = [
 *   (a: string) => number,
 *   (b: number) => boolean,
 *   (c: boolean) => string
 * ];
 * type Piped = Pipe<Fns>;
 * // (a: string) => string
 * ```
 */
export type Pipe<Fns extends readonly [(...args: any[]) => any, ...Array<(arg: any) => any>]> =
  Fns extends readonly [
    (...args: infer FirstArgs) => infer FirstReturn,
    ...infer Rest
  ]
    ? Rest extends readonly [(arg: FirstReturn) => any, ...Array<(arg: any) => any>]
      ? (...args: FirstArgs) => ReturnType<Pipe<Rest>>
      : (...args: FirstArgs) => FirstReturn
    : never;

/**
 * Partial application of function parameters
 *
 * @template T - The function type
 * @template Provided - Provided parameter types
 *
 * @example
 * ```typescript
 * type Fn = (a: string, b: number, c: boolean) => void;
 * type Partial = PartialApply<Fn, [string]>;
 * // (b: number, c: boolean) => void
 * ```
 */
export type PartialApply<
  T extends (...args: any[]) => any,
  Provided extends Partial<Parameters<T>>
> = Parameters<T> extends [...Provided, ...infer Rest]
  ? (...args: Rest) => ReturnType<T>
  : never;

/**
 * Creates a callback type from a function
 *
 * @template T - The function type
 *
 * @example
 * ```typescript
 * type Fn = (a: string) => number;
 * type Callback = CallbackFrom<Fn>;
 * // (error: Error | null, result: number | null) => void
 * ```
 */
export type CallbackFrom<T extends (...args: any[]) => any> = (
  error: Error | null,
  result: ReturnType<T> | null
) => void;

/**
 * Extracts callback error type
 *
 * @template T - The callback function type
 *
 * @example
 * ```typescript
 * type Callback = (err: CustomError, data: string) => void;
 * type ErrorType = CallbackError<Callback>; // CustomError
 * ```
 */
export type CallbackError<T extends (error: any, ...args: any[]) => any> =
  Parameters<T>[0];

/**
 * Extracts callback success type
 *
 * @template T - The callback function type
 *
 * @example
 * ```typescript
 * type Callback = (err: Error, data: string) => void;
 * type SuccessType = CallbackSuccess<Callback>; // string
 * ```
 */
export type CallbackSuccess<T extends (error: any, data: infer D, ...args: any[]) => any> = D;

/**
 * Converts callback-style to Promise-returning function
 *
 * @template T - The callback-style function type
 *
 * @example
 * ```typescript
 * type CallbackFn = (
 *   arg: string,
 *   callback: (err: Error | null, result: number | null) => void
 * ) => void;
 *
 * type Promisified = Promisify<CallbackFn>;
 * // (arg: string) => Promise<number>
 * ```
 */
export type Promisify<T extends (...args: any[]) => any> = Parameters<T> extends [
  ...infer Args,
  infer Last
]
  ? Last extends (error: any, result: infer R) => any
    ? (...args: Args) => Promise<R>
    : T
  : T;

/**
 * Checks if a function has no parameters
 *
 * @template T - The function type
 *
 * @example
 * ```typescript
 * type NoArgs = () => void;
 * type HasArgs = (a: string) => void;
 *
 * type Check1 = IsNullary<NoArgs>; // true
 * type Check2 = IsNullary<HasArgs>; // false
 * ```
 */
export type IsNullary<T extends (...args: any[]) => any> = Parameters<T> extends []
  ? true
  : false;

/**
 * Checks if a function has exactly one parameter
 *
 * @template T - The function type
 *
 * @example
 * ```typescript
 * type OneArg = (a: string) => void;
 * type TwoArgs = (a: string, b: number) => void;
 *
 * type Check1 = IsUnary<OneArg>; // true
 * type Check2 = IsUnary<TwoArgs>; // false
 * ```
 */
export type IsUnary<T extends (...args: any[]) => any> = Parameters<T> extends [any]
  ? true
  : false;

/**
 * Checks if a function has exactly two parameters
 *
 * @template T - The function type
 *
 * @example
 * ```typescript
 * type TwoArgs = (a: string, b: number) => void;
 * type Check = IsBinary<TwoArgs>; // true
 * ```
 */
export type IsBinary<T extends (...args: any[]) => any> = Parameters<T> extends [
  any,
  any
]
  ? true
  : false;

/**
 * Checks if a function is variadic (has rest parameters)
 *
 * @template T - The function type
 *
 * @example
 * ```typescript
 * type Variadic = (...args: string[]) => void;
 * type Check = IsVariadic<Variadic>; // implementation-dependent
 * ```
 */
export type IsVariadic<T extends (...args: any[]) => any> = Parameters<T> extends [
  ...any[],
  ...infer Rest
]
  ? Rest extends []
    ? false
    : true
  : false;

/**
 * Gets the arity (parameter count) of a function
 *
 * @template T - The function type
 *
 * @example
 * ```typescript
 * type Fn = (a: string, b: number, c: boolean) => void;
 * type Count = Arity<Fn>; // 3
 * ```
 */
export type Arity<T extends (...args: any[]) => any> = Parameters<T>['length'];

/**
 * Creates a debounced function type
 *
 * @template T - The function type
 * @template Delay - The delay in milliseconds
 *
 * @example
 * ```typescript
 * type Fn = (a: string) => void;
 * type Debounced = Debounced<Fn, 300>;
 * // (a: string) => void (with debouncing)
 * ```
 */
export type Debounced<
  T extends (...args: any[]) => any,
  Delay extends number = number
> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => ReturnType<T> | undefined;
};

/**
 * Creates a throttled function type
 *
 * @template T - The function type
 * @template Interval - The throttle interval
 *
 * @example
 * ```typescript
 * type Fn = (a: string) => void;
 * type Throttled = Throttled<Fn, 100>;
 * ```
 */
export type Throttled<
  T extends (...args: any[]) => any,
  Interval extends number = number
> = {
  (...args: Parameters<T>): ReturnType<T>;
  cancel: () => void;
};

/**
 * Memoized function type
 *
 * @template T - The function type
 *
 * @example
 * ```typescript
 * type Fn = (a: string) => number;
 * type Memoized = Memoized<Fn>;
 * ```
 */
export type Memoized<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): ReturnType<T>;
  cache: Map<string, ReturnType<T>>;
  clear: () => void;
};
