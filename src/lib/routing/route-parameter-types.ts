// =============================================================================
// Route Parameter Extraction Types (Template Literal Types)
// =============================================================================

/**
 * Extract required parameter names from route path at type level
 *
 * @example
 * ExtractRequiredParams<'/users/:id/posts/:postId'> = { id: string; postId: string }
 * ExtractRequiredParams<'/users'> = Record<string, never>
 */
export type ExtractRequiredParams<TPath extends string> =
  TPath extends `${infer _Start}:${infer _Param}?/${infer Rest}`
    ? ExtractRequiredParams<`/${Rest}`>
    : TPath extends `${infer _Start}:${infer Param}/${infer Rest}`
      ? { [K in Param]: string } & ExtractRequiredParams<`/${Rest}`>
      : TPath extends `${infer _Start}:${infer _Param}?`
        ? Record<string, never>
        : TPath extends `${infer _Start}:${infer Param}`
          ? { [K in Param]: string }
          : Record<string, never>;

/**
 * Extract optional parameter names from route path
 *
 * @example
 * ExtractOptionalParams<'/search/:query?'> = { query?: string }
 */
export type ExtractOptionalParams<TPath extends string> =
  TPath extends `${infer _Start}:${infer Param}?/${infer Rest}`
    ? { [K in Param]?: string } & ExtractOptionalParams<`/${Rest}`>
    : TPath extends `${infer _Start}:${infer Param}?`
      ? { [K in Param]?: string }
      : Record<string, never>;

/**
 * Combined parameter type for a route - merges required and optional params
 *
 * @example
 * RouteParams<'/users/:id/posts/:postId?'> = { id: string; postId?: string }
 */
export type RouteParams<TPath extends string> = ExtractRequiredParams<TPath> &
  ExtractOptionalParams<TPath>;

/**
 * Check if a path has any parameters
 */
export type HasParams<TPath extends string> = keyof RouteParams<TPath> extends never ? false : true;

/**
 * Get the params type for a given path, with proper handling for parameterless routes
 */
export type ParamsFor<TPath extends string> = keyof RouteParams<TPath> extends never
  ? undefined
  : RouteParams<TPath>;
