/**
 * Domain types for the enterprise CMS example.
 */

export type ContentType = 'page' | 'post' | 'landing' | 'docs';

export type WorkflowStatus = 'draft' | 'review' | 'scheduled' | 'published' | 'archived';

export interface CmsEntry {
  id: string;
  title: string;
  slug: string;
  type: ContentType;
  status: WorkflowStatus;
  authorId: string;
  authorName: string;
  owner: string;
  channel: string;
  /** ISO timestamp. */
  updatedAt: string;
  /** ISO timestamp; only set when status === 'scheduled'. */
  publishAt?: string;
  views: number;
  conversions: number;
  seoScore: number;
  /** Body may contain user-authored HTML — render through `useSafeText`. */
  body: string;
  tags: string[];
}

export interface UpdateStatusBody {
  status: WorkflowStatus;
  publishAt?: string;
}

export interface UpdateBodyBody {
  body: string;
}

/** Per-CMS permission strings — used both by demo users and by client-side gating. */
export const CMS_PERMISSIONS = {
  READ: 'content:read',
  CREATE: 'content:create',
  UPDATE: 'content:update',
  PUBLISH: 'content:publish',
  ARCHIVE: 'content:archive',
  MANAGE_SETTINGS: 'settings:manage',
} as const;

export type CmsPermission = (typeof CMS_PERMISSIONS)[keyof typeof CMS_PERMISSIONS];
