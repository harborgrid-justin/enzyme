// =============================================================================
// Route Segment Types
// =============================================================================

/**
 * Route segment types for file-system convention
 *
 * - static: `about.tsx` -> `/about`
 * - dynamic: `[id].tsx` -> `/:id`
 * - catchAll: `[[...slug]].tsx` -> `/*`
 * - optional: `[[id]].tsx` -> `/:id?`
 * - group: `(auth)/login.tsx` -> `/login` (group ignored in path)
 * - layout: `_layout.tsx` -> layout wrapper
 * - index: `index.tsx` -> `/`
 */
export type RouteSegmentType =
  | 'static'
  | 'dynamic'
  | 'catchAll'
  | 'optional'
  | 'group'
  | 'layout'
  | 'index';

/**
 * Parsed route segment from filename
 */
export interface ParsedRouteSegment {
  /** Type of segment */
  readonly type: RouteSegmentType;
  /** Segment name for URL path */
  readonly name: string;
  /** Parameter name for dynamic segments */
  readonly paramName?: string;
  /** Whether this segment is optional */
  readonly isOptional: boolean;
  /** Original filename before parsing */
  readonly originalFilename: string;
}
