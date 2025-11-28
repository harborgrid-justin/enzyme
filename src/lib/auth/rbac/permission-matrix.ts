/**
 * Permission Matrix
 *
 * Defines and manages permission matrices for role-based access control.
 * Provides builders and utilities for creating complex permission structures.
 *
 * @module auth/rbac/permission-matrix
 */

import type {
  PermissionMatrix,
  PermissionMatrixEntry,
  PermissionAction,
  PermissionScope,
  PermissionCondition,
} from './types';

// =============================================================================
// Constants
// =============================================================================

/**
 * All available permission actions.
 */
export const PERMISSION_ACTIONS: PermissionAction[] = [
  'create',
  'read',
  'update',
  'delete',
  'list',
  'execute',
  'manage',
  'approve',
  'export',
  'import',
  '*',
];

/**
 * CRUD actions subset.
 */
export const CRUD_ACTIONS: PermissionAction[] = [
  'create',
  'read',
  'update',
  'delete',
];

/**
 * Read-only actions.
 */
export const READ_ONLY_ACTIONS: PermissionAction[] = [
  'read',
  'list',
];

/**
 * Full access actions.
 */
export const FULL_ACCESS_ACTIONS: PermissionAction[] = ['*'];

// =============================================================================
// Permission Matrix Builder
// =============================================================================

/**
 * Builder for creating permission matrices.
 *
 * @example
 * ```typescript
 * const matrix = new PermissionMatrixBuilder()
 *   .setDefaultBehavior('deny')
 *   .setConflictResolution('deny-wins')
 *   .addEntry({
 *     roleId: 'admin',
 *     resource: '*',
 *     allowedActions: ['*'],
 *   })
 *   .addEntry({
 *     roleId: 'user',
 *     resource: 'documents',
 *     allowedActions: ['create', 'read', 'update'],
 *     scope: 'own',
 *   })
 *   .addEntry({
 *     roleId: 'user',
 *     resource: 'documents',
 *     allowedActions: ['read'],
 *     scope: 'team',
 *   })
 *   .build();
 * ```
 */
export class PermissionMatrixBuilder {
  private entries: PermissionMatrixEntry[] = [];
  private defaultBehavior: 'deny' | 'allow' = 'deny';
  private conflictResolution: PermissionMatrix['conflictResolution'] = 'deny-wins';
  private version = '1.0.0';

  /**
   * Set the default behavior when no entry matches.
   */
  setDefaultBehavior(behavior: 'deny' | 'allow'): this {
    this.defaultBehavior = behavior;
    return this;
  }

  /**
   * Set the conflict resolution strategy.
   */
  setConflictResolution(strategy: PermissionMatrix['conflictResolution']): this {
    this.conflictResolution = strategy;
    return this;
  }

  /**
   * Set the matrix version.
   */
  setVersion(version: string): this {
    this.version = version;
    return this;
  }

  /**
   * Add a permission matrix entry.
   */
  addEntry(entry: PermissionMatrixEntry): this {
    this.entries.push(entry);
    return this;
  }

  /**
   * Add multiple entries at once.
   */
  addEntries(entries: PermissionMatrixEntry[]): this {
    this.entries.push(...entries);
    return this;
  }

  /**
   * Add full access for a role.
   */
  grantFullAccess(roleId: string): this {
    return this.addEntry({
      roleId,
      resource: '*',
      allowedActions: ['*'],
    });
  }

  /**
   * Add read-only access for a role on a resource.
   */
  grantReadOnly(roleId: string, resource: string, scope?: PermissionScope): this {
    return this.addEntry({
      roleId,
      resource,
      allowedActions: [...READ_ONLY_ACTIONS],
      scope,
    });
  }

  /**
   * Add CRUD access for a role on a resource.
   */
  grantCRUD(roleId: string, resource: string, scope?: PermissionScope): this {
    return this.addEntry({
      roleId,
      resource,
      allowedActions: [...CRUD_ACTIONS, 'list'],
      scope,
    });
  }

  /**
   * Deny specific actions for a role on a resource.
   */
  denyActions(
    roleId: string,
    resource: string,
    actions: PermissionAction[]
  ): this {
    return this.addEntry({
      roleId,
      resource,
      allowedActions: [],
      deniedActions: actions,
    });
  }

  /**
   * Add conditional entry.
   */
  addConditionalEntry(
    entry: Omit<PermissionMatrixEntry, 'conditions'>,
    conditions: PermissionCondition[]
  ): this {
    return this.addEntry({
      ...entry,
      conditions,
    });
  }

  /**
   * Clear all entries.
   */
  clear(): this {
    this.entries = [];
    return this;
  }

  /**
   * Remove entries for a specific role.
   */
  removeRoleEntries(roleId: string): this {
    this.entries = this.entries.filter(e => e.roleId !== roleId);
    return this;
  }

  /**
   * Remove entries for a specific resource.
   */
  removeResourceEntries(resource: string): this {
    this.entries = this.entries.filter(e => e.resource !== resource);
    return this;
  }

  /**
   * Build the permission matrix.
   */
  build(): PermissionMatrix {
    return {
      entries: [...this.entries],
      defaultBehavior: this.defaultBehavior,
      conflictResolution: this.conflictResolution,
      version: this.version,
      updatedAt: new Date().toISOString(),
    };
  }
}

// =============================================================================
// Preset Permission Matrices
// =============================================================================

/**
 * Create a standard permission matrix for common applications.
 *
 * @param options - Configuration options
 * @returns Configured permission matrix
 */
export function createStandardMatrix(options: {
  resources: string[];
  adminRole?: string;
  managerRole?: string;
  userRole?: string;
  guestRole?: string;
}): PermissionMatrix {
  const {
    resources,
    adminRole = 'admin',
    managerRole = 'manager',
    userRole = 'user',
    guestRole = 'guest',
  } = options;

  const builder = new PermissionMatrixBuilder()
    .setDefaultBehavior('deny')
    .setConflictResolution('deny-wins');

  // Admin: full access to everything
  builder.grantFullAccess(adminRole);

  // Manager: full CRUD on all resources, manage team
  for (const resource of resources) {
    builder.addEntry({
      roleId: managerRole,
      resource,
      allowedActions: [...CRUD_ACTIONS, 'list', 'export', 'approve'],
      scope: 'team',
    });
  }

  // User: CRUD on own resources, read team resources
  for (const resource of resources) {
    builder.addEntry({
      roleId: userRole,
      resource,
      allowedActions: [...CRUD_ACTIONS, 'list'],
      scope: 'own',
    });
    builder.addEntry({
      roleId: userRole,
      resource,
      allowedActions: ['read', 'list'],
      scope: 'team',
    });
  }

  // Guest: read-only on public resources
  builder.addEntry({
    roleId: guestRole,
    resource: '*',
    allowedActions: ['read'],
    conditions: [
      { field: 'isPublic', operator: 'equals', value: true },
    ],
  });

  return builder.build();
}

/**
 * Create a healthcare-specific permission matrix.
 *
 * @returns Healthcare permission matrix
 */
export function createHealthcareMatrix(): PermissionMatrix {
  const builder = new PermissionMatrixBuilder()
    .setDefaultBehavior('deny')
    .setConflictResolution('deny-wins')
    .setVersion('hipaa-1.0');

  // System Admin
  builder.grantFullAccess('system_admin');

  // Provider (Doctor/Nurse)
  builder
    .addEntry({
      roleId: 'provider',
      resource: 'patients',
      allowedActions: ['read', 'list'],
      conditions: [
        { field: 'assignedProvider', operator: 'equals', contextKey: 'userId' },
      ],
    })
    .addEntry({
      roleId: 'provider',
      resource: 'medical_records',
      allowedActions: ['create', 'read', 'update'],
      conditions: [
        { field: 'assignedProvider', operator: 'equals', contextKey: 'userId' },
      ],
    })
    .addEntry({
      roleId: 'provider',
      resource: 'prescriptions',
      allowedActions: ['create', 'read', 'update'],
      conditions: [
        { field: 'prescriberId', operator: 'equals', contextKey: 'userId' },
      ],
    })
    .addEntry({
      roleId: 'provider',
      resource: 'lab_results',
      allowedActions: ['read', 'list'],
    })
    .addEntry({
      roleId: 'provider',
      resource: 'appointments',
      allowedActions: ['create', 'read', 'update', 'list'],
    });

  // Nurse
  builder
    .addEntry({
      roleId: 'nurse',
      resource: 'patients',
      allowedActions: ['read', 'list', 'update'],
      conditions: [
        { field: 'unit', operator: 'equals', contextKey: 'assignedUnit' },
      ],
    })
    .addEntry({
      roleId: 'nurse',
      resource: 'medical_records',
      allowedActions: ['read', 'update'],
    })
    .addEntry({
      roleId: 'nurse',
      resource: 'vitals',
      allowedActions: ['create', 'read', 'update', 'list'],
    })
    .addEntry({
      roleId: 'nurse',
      resource: 'medication_administration',
      allowedActions: ['create', 'read', 'update'],
    });

  // Front Desk / Receptionist
  builder
    .addEntry({
      roleId: 'receptionist',
      resource: 'patients',
      allowedActions: ['create', 'read', 'update', 'list'],
    })
    .addEntry({
      roleId: 'receptionist',
      resource: 'appointments',
      allowedActions: ['create', 'read', 'update', 'delete', 'list'],
    })
    .addEntry({
      roleId: 'receptionist',
      resource: 'insurance',
      allowedActions: ['read', 'update'],
    })
    // Deny access to medical records
    .denyActions('receptionist', 'medical_records', ['*']);

  // Billing
  builder
    .addEntry({
      roleId: 'billing',
      resource: 'invoices',
      allowedActions: [...CRUD_ACTIONS, 'list', 'export'],
    })
    .addEntry({
      roleId: 'billing',
      resource: 'insurance_claims',
      allowedActions: [...CRUD_ACTIONS, 'list'],
    })
    .addEntry({
      roleId: 'billing',
      resource: 'patients',
      allowedActions: ['read'],
    })
    // Deny access to detailed medical records
    .denyActions('billing', 'medical_records', ['*'])
    .denyActions('billing', 'prescriptions', ['*']);

  // Patient (self-service portal)
  builder
    .addEntry({
      roleId: 'patient',
      resource: 'appointments',
      allowedActions: ['create', 'read', 'update', 'list'],
      scope: 'own',
    })
    .addEntry({
      roleId: 'patient',
      resource: 'medical_records',
      allowedActions: ['read'],
      scope: 'own',
    })
    .addEntry({
      roleId: 'patient',
      resource: 'prescriptions',
      allowedActions: ['read', 'list'],
      scope: 'own',
    })
    .addEntry({
      roleId: 'patient',
      resource: 'lab_results',
      allowedActions: ['read', 'list'],
      scope: 'own',
    })
    .addEntry({
      roleId: 'patient',
      resource: 'invoices',
      allowedActions: ['read', 'list'],
      scope: 'own',
    });

  return builder.build();
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Merge multiple permission matrices.
 *
 * @param matrices - Matrices to merge
 * @param options - Merge options
 * @returns Merged permission matrix
 */
export function mergePermissionMatrices(
  matrices: PermissionMatrix[],
  options?: {
    defaultBehavior?: 'deny' | 'allow';
    conflictResolution?: PermissionMatrix['conflictResolution'];
  }
): PermissionMatrix {
  const allEntries: PermissionMatrixEntry[] = [];

  for (const matrix of matrices) {
    allEntries.push(...matrix.entries);
  }

  return {
    entries: allEntries,
    defaultBehavior: options?.defaultBehavior ?? 'deny',
    conflictResolution: options?.conflictResolution ?? 'deny-wins',
    version: Date.now().toString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Filter permission matrix entries by role.
 *
 * @param matrix - Permission matrix
 * @param roleIds - Role IDs to filter by
 * @returns Filtered entries
 */
export function filterEntriesByRole(
  matrix: PermissionMatrix,
  roleIds: string[]
): PermissionMatrixEntry[] {
  return matrix.entries.filter(entry => roleIds.includes(entry.roleId));
}

/**
 * Filter permission matrix entries by resource.
 *
 * @param matrix - Permission matrix
 * @param resource - Resource to filter by
 * @returns Filtered entries
 */
export function filterEntriesByResource(
  matrix: PermissionMatrix,
  resource: string
): PermissionMatrixEntry[] {
  return matrix.entries.filter(
    entry => entry.resource === resource || entry.resource === '*'
  );
}

/**
 * Get all resources defined in a permission matrix.
 *
 * @param matrix - Permission matrix
 * @returns Unique resource list
 */
export function getDefinedResources(matrix: PermissionMatrix): string[] {
  const resources = new Set<string>();

  for (const entry of matrix.entries) {
    if (entry.resource !== '*') {
      resources.add(entry.resource);
    }
  }

  return Array.from(resources).sort();
}

/**
 * Get all roles defined in a permission matrix.
 *
 * @param matrix - Permission matrix
 * @returns Unique role list
 */
export function getDefinedRoles(matrix: PermissionMatrix): string[] {
  const roles = new Set<string>();

  for (const entry of matrix.entries) {
    roles.add(entry.roleId);
  }

  return Array.from(roles).sort();
}

/**
 * Validate a permission matrix for consistency.
 *
 * @param matrix - Permission matrix to validate
 * @returns Validation errors if any
 */
export function validatePermissionMatrix(matrix: PermissionMatrix): string[] {
  const errors: string[] = [];

  if (!matrix.entries || !Array.isArray(matrix.entries)) {
    errors.push('Matrix entries must be an array');
    return errors;
  }

  for (const [index, entry] of matrix.entries.entries()) {
    if (!entry.roleId) {
      errors.push(`Entry at index ${index}: roleId is required`);
    }

    if (!entry.resource) {
      errors.push(`Entry at index ${index}: resource is required`);
    }

    if (!entry.allowedActions || !Array.isArray(entry.allowedActions)) {
      errors.push(`Entry at index ${index}: allowedActions must be an array`);
    } else {
      for (const action of entry.allowedActions) {
        if (!PERMISSION_ACTIONS.includes(action)) {
          errors.push(`Entry at index ${index}: invalid action '${action}'`);
        }
      }
    }

    if (entry.deniedActions) {
      for (const action of entry.deniedActions) {
        if (!PERMISSION_ACTIONS.includes(action)) {
          errors.push(`Entry at index ${index}: invalid denied action '${action}'`);
        }
      }
    }

    // Check for conflicting allow/deny
    if (entry.allowedActions && entry.deniedActions) {
      const overlap = entry.allowedActions.filter(a =>
        entry.deniedActions!.includes(a)
      );
      if (overlap.length > 0) {
        errors.push(
          `Entry at index ${index}: conflicting allow/deny for actions: ${overlap.join(', ')}`
        );
      }
    }
  }

  return errors;
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new permission matrix builder.
 *
 * @returns New PermissionMatrixBuilder instance
 */
export function createPermissionMatrixBuilder(): PermissionMatrixBuilder {
  return new PermissionMatrixBuilder();
}
