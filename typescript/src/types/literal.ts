/**
 * Literal Type Utilities
 *
 * Advanced utilities for working with literal types and string manipulation
 * at the type level.
 *
 * @module types/literal
 * @category Type Utilities
 */

/**
 * Capitalizes the first letter of a string literal type
 *
 * @template S - The string literal type
 *
 * @example
 * ```typescript
 * type Result = Capitalize<'hello'>; // 'Hello'
 * type Multi = Capitalize<'hello world'>; // 'Hello world'
 * ```
 */
export type Capitalize<S extends string> = S extends `${infer F}${infer R}`
  ? `${Uppercase<F>}${R}`
  : S;

/**
 * Uncapitalizes the first letter of a string literal type
 *
 * @template S - The string literal type
 *
 * @example
 * ```typescript
 * type Result = Uncapitalize<'Hello'>; // 'hello'
 * ```
 */
export type Uncapitalize<S extends string> = S extends `${infer F}${infer R}`
  ? `${Lowercase<F>}${R}`
  : S;

/**
 * Converts a string to camelCase
 *
 * @template S - The string literal type
 *
 * @example
 * ```typescript
 * type Result = CamelCase<'hello-world'>; // 'helloWorld'
 * type Result2 = CamelCase<'hello_world'>; // 'helloWorld'
 * type Result3 = CamelCase<'hello world'>; // 'helloWorld'
 * ```
 */
export type CamelCase<S extends string> = S extends `${infer First}${infer _Sep extends
  '-' | '_' | ' '}${infer Rest}`
  ? `${Lowercase<First>}${CamelCase<Capitalize<Rest>>}`
  : S extends `${infer First}${infer Rest}`
  ? `${Lowercase<First>}${CamelCase<Rest>}`
  : S;

/**
 * Converts a string to PascalCase
 *
 * @template S - The string literal type
 *
 * @example
 * ```typescript
 * type Result = PascalCase<'hello-world'>; // 'HelloWorld'
 * type Result2 = PascalCase<'hello_world'>; // 'HelloWorld'
 * ```
 */
export type PascalCase<S extends string> = Capitalize<CamelCase<S>>;

/**
 * Converts a string to snake_case
 *
 * @template S - The string literal type
 *
 * @example
 * ```typescript
 * type Result = SnakeCase<'helloWorld'>; // 'hello_world'
 * type Result2 = SnakeCase<'HelloWorld'>; // 'hello_world'
 * ```
 */
export type SnakeCase<S extends string> = S extends `${infer First}${infer Rest}`
  ? First extends Uppercase<First>
    ? `_${Lowercase<First>}${SnakeCase<Rest>}`
    : `${First}${SnakeCase<Rest>}`
  : S;

/**
 * Converts a string to kebab-case
 *
 * @template S - The string literal type
 *
 * @example
 * ```typescript
 * type Result = KebabCase<'helloWorld'>; // 'hello-world'
 * type Result2 = KebabCase<'HelloWorld'>; // 'hello-world'
 * ```
 */
export type KebabCase<S extends string> = S extends `${infer First}${infer Rest}`
  ? First extends Uppercase<First>
    ? `-${Lowercase<First>}${KebabCase<Rest>}`
    : `${First}${KebabCase<Rest>}`
  : S;

/**
 * Splits a string by a delimiter
 *
 * @template S - The string literal type
 * @template Delimiter - The delimiter string
 *
 * @example
 * ```typescript
 * type Result = Split<'hello.world.test', '.'>;
 * // ['hello', 'world', 'test']
 * ```
 */
export type Split<
  S extends string,
  Delimiter extends string
> = S extends `${infer First}${Delimiter}${infer Rest}`
  ? [First, ...Split<Rest, Delimiter>]
  : S extends ''
  ? []
  : [S];

/**
 * Joins string tuple with a delimiter
 *
 * @template T - The string tuple
 * @template Delimiter - The delimiter string
 *
 * @example
 * ```typescript
 * type Result = Join<['hello', 'world', 'test'], '-'>;
 * // 'hello-world-test'
 * ```
 */
export type Join<
  T extends readonly string[],
  Delimiter extends string
> = T extends readonly [infer First extends string, ...infer Rest extends string[]]
  ? Rest extends []
    ? First
    : `${First}${Delimiter}${Join<Rest, Delimiter>}`
  : '';

/**
 * Trims whitespace from both ends of a string
 *
 * @template S - The string literal type
 *
 * @example
 * ```typescript
 * type Result = Trim<'  hello  '>; // 'hello'
 * ```
 */
export type Trim<S extends string> = S extends ` ${infer Rest}`
  ? Trim<Rest>
  : S extends `${infer Rest} `
  ? Trim<Rest>
  : S;

/**
 * Trims whitespace from the start of a string
 *
 * @template S - The string literal type
 *
 * @example
 * ```typescript
 * type Result = TrimStart<'  hello'>; // 'hello'
 * ```
 */
export type TrimStart<S extends string> = S extends ` ${infer Rest}`
  ? TrimStart<Rest>
  : S;

/**
 * Trims whitespace from the end of a string
 *
 * @template S - The string literal type
 *
 * @example
 * ```typescript
 * type Result = TrimEnd<'hello  '>; // 'hello'
 * ```
 */
export type TrimEnd<S extends string> = S extends `${infer Rest} `
  ? TrimEnd<Rest>
  : S;

/**
 * Replaces all occurrences of a substring
 *
 * @template S - The string literal type
 * @template From - The substring to replace
 * @template To - The replacement substring
 *
 * @example
 * ```typescript
 * type Result = Replace<'hello-world-test', '-', '_'>;
 * // 'hello_world_test'
 * ```
 */
export type Replace<
  S extends string,
  From extends string,
  To extends string
> = From extends ''
  ? S
  : S extends `${infer Before}${From}${infer After}`
  ? `${Before}${To}${Replace<After, From, To>}`
  : S;

/**
 * Checks if a string starts with a prefix
 *
 * @template S - The string literal type
 * @template Prefix - The prefix to check
 *
 * @example
 * ```typescript
 * type Check1 = StartsWith<'hello', 'he'>; // true
 * type Check2 = StartsWith<'hello', 'wo'>; // false
 * ```
 */
export type StartsWith<S extends string, Prefix extends string> = S extends `${Prefix}${any}`
  ? true
  : false;

/**
 * Checks if a string ends with a suffix
 *
 * @template S - The string literal type
 * @template Suffix - The suffix to check
 *
 * @example
 * ```typescript
 * type Check1 = EndsWith<'hello', 'lo'>; // true
 * type Check2 = EndsWith<'hello', 'he'>; // false
 * ```
 */
export type EndsWith<S extends string, Suffix extends string> = S extends `${any}${Suffix}`
  ? true
  : false;

/**
 * Checks if a string contains a substring
 *
 * @template S - The string literal type
 * @template Search - The substring to search for
 *
 * @example
 * ```typescript
 * type Check1 = Includes<'hello world', 'lo w'>; // true
 * type Check2 = Includes<'hello world', 'xyz'>; // false
 * ```
 */
export type Includes<S extends string, Search extends string> = S extends `${any}${Search}${any}`
  ? true
  : false;

/**
 * Gets the length of a string literal type
 *
 * @template S - The string literal type
 *
 * @example
 * ```typescript
 * type Length = StringLength<'hello'>; // 5
 * ```
 */
export type StringLength<S extends string> = Split<S, ''>['length'];

/**
 * Reverses a string literal type
 *
 * @template S - The string literal type
 *
 * @example
 * ```typescript
 * type Result = Reverse<'hello'>; // 'olleh'
 * ```
 */
export type Reverse<S extends string> = S extends `${infer First}${infer Rest}`
  ? `${Reverse<Rest>}${First}`
  : S;

/**
 * Repeats a string N times
 *
 * @template S - The string literal type
 * @template N - Number of repetitions
 *
 * @example
 * ```typescript
 * type Result = Repeat<'hello', 3>;
 * // 'hellohellohello'
 * ```
 */
export type Repeat<
  S extends string,
  N extends number,
  Acc extends string = ''
> = `${Acc}` extends `${S}${infer _}${S}${infer _}${S}${infer _}${S}${infer _}${S}${infer _}${S}${infer _}${S}${infer _}${S}${infer _}${S}${infer _}${S}`
  ? Acc
  : Repeat<S, N, `${Acc}${S}`>;

/**
 * Pads a string to a specific length
 *
 * @template S - The string literal type
 * @template Length - The target length
 * @template Pad - The padding character
 *
 * @example
 * ```typescript
 * type Result = PadStart<'hello', 10, '0'>;
 * // '00000hello'
 * ```
 */
export type PadStart<
  S extends string,
  Length extends number,
  Pad extends string = ' '
> = S;

/**
 * Extracts substring from start to end
 *
 * @template S - The string literal type
 * @template Start - Start index
 * @template End - End index
 *
 * @example
 * ```typescript
 * type Result = Substring<'hello world', 0, 5>;
 * // 'hello'
 * ```
 */
export type Substring<S extends string, Start extends number, End extends number> = S;

/**
 * Converts a string literal union to a tuple
 *
 * @template U - The string literal union
 *
 * @example
 * ```typescript
 * type Result = StringUnionToTuple<'a' | 'b' | 'c'>;
 * // ['a', 'b', 'c']
 * ```
 */
export type StringUnionToTuple<U extends string> = U extends any ? [U] : never;

/**
 * Template literal helper for creating prefixed types
 *
 * @template Prefix - The prefix string
 * @template S - The string or union to prefix
 *
 * @example
 * ```typescript
 * type Events = 'click' | 'focus' | 'blur';
 * type Handlers = Prefix<'on', Events>;
 * // 'onclick' | 'onfocus' | 'onblur'
 * ```
 */
export type Prefix<Prefix extends string, S extends string> = `${Prefix}${S}`;

/**
 * Template literal helper for creating suffixed types
 *
 * @template S - The string or union to suffix
 * @template Suffix - The suffix string
 *
 * @example
 * ```typescript
 * type Actions = 'create' | 'update' | 'delete';
 * type ActionTypes = Suffix<Actions, 'Action'>;
 * // 'createAction' | 'updateAction' | 'deleteAction'
 * ```
 */
export type Suffix<S extends string, Suffix extends string> = `${S}${Suffix}`;

/**
 * Wraps a string with prefix and suffix
 *
 * @template S - The string to wrap
 * @template Wrapper - The wrapper string
 *
 * @example
 * ```typescript
 * type Result = Wrap<'content', '"'>;
 * // '"content"'
 * ```
 */
export type Wrap<S extends string, Wrapper extends string> = `${Wrapper}${S}${Wrapper}`;

/**
 * Extracts words from a string
 *
 * @template S - The string literal type
 *
 * @example
 * ```typescript
 * type Result = ExtractWords<'helloWorld'>;
 * // ['hello', 'World']
 * ```
 */
export type ExtractWords<S extends string> = S extends `${infer First}${infer Rest}`
  ? First extends Uppercase<First>
    ? [First, ...ExtractWords<Rest>]
    : ExtractWords<Rest>
  : [];

/**
 * Checks if a string is a valid number literal
 *
 * @template S - The string literal type
 *
 * @example
 * ```typescript
 * type Check1 = IsNumberString<'123'>; // true
 * type Check2 = IsNumberString<'abc'>; // false
 * ```
 */
export type IsNumberString<S extends string> = S extends `${number}` ? true : false;

/**
 * Converts string number to numeric literal type
 *
 * @template S - The string literal type
 *
 * @example
 * ```typescript
 * type Result = ToNumber<'42'>; // 42
 * ```
 */
export type ToNumber<S extends string> = S extends `${infer N extends number}`
  ? N
  : never;

/**
 * Converts number to string literal type
 *
 * @template N - The number literal type
 *
 * @example
 * ```typescript
 * type Result = ToString<42>; // '42'
 * ```
 */
export type ToString<N extends number> = `${N}`;

/**
 * Checks if string is empty
 *
 * @template S - The string literal type
 *
 * @example
 * ```typescript
 * type Check1 = IsEmpty<''>; // true
 * type Check2 = IsEmpty<'hello'>; // false
 * ```
 */
export type IsEmpty<S extends string> = S extends '' ? true : false;

/**
 * Gets the first character of a string
 *
 * @template S - The string literal type
 *
 * @example
 * ```typescript
 * type Result = FirstChar<'hello'>; // 'h'
 * ```
 */
export type FirstChar<S extends string> = S extends `${infer First}${any}` ? First : never;

/**
 * Gets the last character of a string
 *
 * @template S - The string literal type
 *
 * @example
 * ```typescript
 * type Result = LastChar<'hello'>; // 'o'
 * ```
 */
export type LastChar<S extends string> = S extends `${infer _}${infer Rest}`
  ? Rest extends ''
    ? S
    : LastChar<Rest>
  : never;

/**
 * Removes the first character from a string
 *
 * @template S - The string literal type
 *
 * @example
 * ```typescript
 * type Result = RemoveFirst<'hello'>; // 'ello'
 * ```
 */
export type RemoveFirst<S extends string> = S extends `${any}${infer Rest}` ? Rest : S;

/**
 * Removes the last character from a string
 *
 * @template S - The string literal type
 *
 * @example
 * ```typescript
 * type Result = RemoveLast<'hello'>; // 'hell'
 * ```
 */
export type RemoveLast<S extends string> = S extends `${infer Rest}${any}`
  ? Rest extends ''
    ? ''
    : Rest
  : S;
