/**
 * @file Data Integrity Checker
 * @description Comprehensive data integrity validation for frontend state
 * with referential integrity, constraint validation, and anomaly detection.
 *
 * Features:
 * - Referential integrity checking
 * - Custom constraint validation
 * - Data anomaly detection
 * - Integrity reports with repair suggestions
 * - Batch integrity validation
 *
 * @example
 * ```typescript
 * import { createIntegrityChecker } from '@/lib/data/integrity';
 *
 * const checker = createIntegrityChecker({
 *   entities: ['users', 'posts', 'comments'],
 *   relations: [
 *     { from: 'posts', field: 'authorId', to: 'users' },
 *     { from: 'comments', field: 'postId', to: 'posts' },
 *   ],
 * });
 *
 * const report = checker.check(state.entities);
 * if (!report.valid) {
 *   const repaired = checker.repair(state.entities, report);
 * }
 * ```
 */

import type { NormalizedEntities, Entity } from '../normalization/normalizer';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Relation definition for integrity checking
 */
export interface RelationDefinition {
  /** Source entity type */
  from: string;
  /** Field containing the reference */
  field: string;
  /** Target entity type */
  to: string;
  /** Whether the relation is required */
  required?: boolean;
  /** Whether it's an array relation */
  isArray?: boolean;
  /** Cascade delete behavior */
  onDelete?: 'cascade' | 'set-null' | 'restrict' | 'no-action';
}

/**
 * Custom constraint definition
 */
export interface ConstraintDefinition {
  /** Constraint name */
  name: string;
  /** Entity type to apply constraint to */
  entity: string;
  /** Validation function */
  validate: (entity: Entity, allEntities: NormalizedEntities) => boolean;
  /** Error message */
  message: string | ((entity: Entity) => string);
  /** Severity level */
  severity?: 'error' | 'warning' | 'info';
  /** Repair function */
  repair?: (entity: Entity, allEntities: NormalizedEntities) => Entity;
}

/**
 * Anomaly detection rule
 */
export interface AnomalyRule {
  /** Rule name */
  name: string;
  /** Entity type to check */
  entity?: string;
  /** Detection function */
  detect: (entities: NormalizedEntities) => AnomalyResult[];
  /** Severity level */
  severity?: 'error' | 'warning' | 'info';
}

/**
 * Anomaly detection result
 */
export interface AnomalyResult {
  /** Entity type */
  entityType: string;
  /** Entity ID (if applicable) */
  entityId?: string;
  /** Anomaly description */
  description: string;
  /** Suggested fix */
  suggestion?: string;
  /** Additional data */
  data?: unknown;
}

/**
 * Integrity violation
 */
export interface IntegrityViolation {
  /** Violation type */
  type: 'referential' | 'constraint' | 'anomaly' | 'orphan';
  /** Severity */
  severity: 'error' | 'warning' | 'info';
  /** Entity type */
  entityType: string;
  /** Entity ID */
  entityId: string;
  /** Violation message */
  message: string;
  /** Field involved (for referential) */
  field?: string;
  /** Related entity info */
  related?: {
    entityType: string;
    entityId: string;
  };
  /** Repair suggestion */
  repair?: {
    action: 'delete' | 'update' | 'create' | 'nullify';
    data?: unknown;
  };
}

/**
 * Integrity check report
 */
export interface IntegrityReport {
  /** Overall validity */
  valid: boolean;
  /** Timestamp */
  timestamp: number;
  /** Duration in milliseconds */
  duration: number;
  /** Entity counts */
  entityCounts: Record<string, number>;
  /** Violations by type */
  violations: IntegrityViolation[];
  /** Summary statistics */
  stats: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
  };
}

/**
 * Integrity checker configuration
 */
export interface IntegrityCheckerConfig {
  /** Entity types to check */
  entities: string[];
  /** Relation definitions */
  relations?: RelationDefinition[];
  /** Custom constraints */
  constraints?: ConstraintDefinition[];
  /** Anomaly detection rules */
  anomalyRules?: AnomalyRule[];
  /** ID field name */
  idField?: string;
  /** Enable orphan detection */
  detectOrphans?: boolean;
  /** Stop on first error */
  failFast?: boolean;
}

/**
 * Repair options
 */
export interface RepairOptions {
  /** Only fix errors (not warnings) */
  errorsOnly?: boolean;
  /** Dry run (return changes without applying) */
  dryRun?: boolean;
  /** Custom repair handlers */
  handlers?: Record<string, (violation: IntegrityViolation, entities: NormalizedEntities) => NormalizedEntities>;
}

/**
 * Repair result
 */
export interface RepairResult {
  /** Repaired entities */
  entities: NormalizedEntities;
  /** Applied repairs */
  repairs: Array<{
    violation: IntegrityViolation;
    action: string;
    success: boolean;
  }>;
  /** Remaining violations */
  remaining: IntegrityViolation[];
}

/**
 * Integrity checker interface
 */
export interface IntegrityChecker {
  /** Run integrity check */
  check: (entities: NormalizedEntities) => IntegrityReport;
  /** Check specific entity */
  checkEntity: (entityType: string, entityId: string, entities: NormalizedEntities) => IntegrityViolation[];
  /** Repair violations */
  repair: (entities: NormalizedEntities, report: IntegrityReport, options?: RepairOptions) => RepairResult;
  /** Add constraint */
  addConstraint: (constraint: ConstraintDefinition) => void;
  /** Add relation */
  addRelation: (relation: RelationDefinition) => void;
  /** Add anomaly rule */
  addAnomalyRule: (rule: AnomalyRule) => void;
  /** Get configuration */
  getConfig: () => IntegrityCheckerConfig;
}

// =============================================================================
// INTEGRITY CHECKER FACTORY
// =============================================================================

/**
 * Create an integrity checker
 *
 * @param config - Checker configuration
 * @returns Integrity checker instance
 *
 * @example
 * ```typescript
 * const checker = createIntegrityChecker({
 *   entities: ['users', 'posts', 'comments'],
 *   relations: [
 *     { from: 'posts', field: 'authorId', to: 'users', required: true },
 *     { from: 'comments', field: 'postId', to: 'posts', required: true },
 *     { from: 'comments', field: 'userId', to: 'users' },
 *   ],
 *   constraints: [
 *     {
 *       name: 'non-empty-title',
 *       entity: 'posts',
 *       validate: (post) => typeof post.title === 'string' && post.title.length > 0,
 *       message: 'Post must have a non-empty title',
 *       severity: 'error',
 *     },
 *   ],
 * });
 *
 * const report = checker.check(normalizedState);
 * console.log(report.violations);
 * ```
 */
export function createIntegrityChecker(config: IntegrityCheckerConfig): IntegrityChecker {
  const relations = [...(config.relations || [])];
  const constraints = [...(config.constraints || [])];
  const anomalyRules = [...(config.anomalyRules || [])];
  const idField = config.idField || 'id';

  /**
   * Check referential integrity for an entity
   */
  function checkReferentialIntegrity(
    entityType: string,
    entity: Entity,
    entities: NormalizedEntities
  ): IntegrityViolation[] {
    const violations: IntegrityViolation[] = [];
    const entityRelations = relations.filter((r) => r.from === entityType);

    for (const relation of entityRelations) {
      const value = entity[relation.field];

      if (relation.isArray) {
        // Array relation
        if (Array.isArray(value)) {
          for (const refId of value) {
            if (refId && !entities[relation.to]?.[String(refId)]) {
              violations.push({
                type: 'referential',
                severity: relation.required ? 'error' : 'warning',
                entityType,
                entityId: String(entity[idField]),
                message: `Missing referenced ${relation.to} with ID "${refId}"`,
                field: relation.field,
                related: {
                  entityType: relation.to,
                  entityId: String(refId),
                },
                repair: {
                  action: relation.onDelete === 'cascade' ? 'delete' : 'update',
                  data: relation.onDelete === 'set-null'
                    ? { [relation.field]: value.filter((id: string) => id !== refId) }
                    : undefined,
                },
              });
            }
          }
        }
      } else {
        // Single relation
        if (value !== null && value !== undefined) {
          if (!entities[relation.to]?.[String(value)]) {
            violations.push({
              type: 'referential',
              severity: relation.required ? 'error' : 'warning',
              entityType,
              entityId: String(entity[idField]),
              message: `Missing referenced ${relation.to} with ID "${value}"`,
              field: relation.field,
              related: {
                entityType: relation.to,
                entityId: String(value),
              },
              repair: {
                action: relation.onDelete === 'cascade' ? 'delete' : 'update',
                data: relation.onDelete === 'set-null' ? { [relation.field]: null } : undefined,
              },
            });
          }
        } else if (relation.required) {
          violations.push({
            type: 'referential',
            severity: 'error',
            entityType,
            entityId: String(entity[idField]),
            message: `Required relation "${relation.field}" is missing`,
            field: relation.field,
            repair: {
              action: 'delete',
            },
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check custom constraints for an entity
   */
  function checkConstraints(
    entityType: string,
    entity: Entity,
    entities: NormalizedEntities
  ): IntegrityViolation[] {
    const violations: IntegrityViolation[] = [];
    const entityConstraints = constraints.filter((c) => c.entity === entityType);

    for (const constraint of entityConstraints) {
      if (!constraint.validate(entity, entities)) {
        const message =
          typeof constraint.message === 'function'
            ? constraint.message(entity)
            : constraint.message;

        violations.push({
          type: 'constraint',
          severity: constraint.severity || 'error',
          entityType,
          entityId: String(entity[idField]),
          message: `[${constraint.name}] ${message}`,
          repair: constraint.repair
            ? {
                action: 'update',
                data: constraint.repair(entity, entities),
              }
            : undefined,
        });
      }
    }

    return violations;
  }

  /**
   * Detect orphaned entities
   */
  function detectOrphans(entities: NormalizedEntities): IntegrityViolation[] {
    if (!config.detectOrphans) {
      return [];
    }

    const violations: IntegrityViolation[] = [];
    const referencedIds = new Map<string, Set<string>>();

    // Collect all referenced IDs
    for (const entityType of config.entities) {
      referencedIds.set(entityType, new Set());
    }

    for (const entityType of config.entities) {
      const entityMap = entities[entityType];
      if (!entityMap) continue;

      const entityRelations = relations.filter((r) => r.from === entityType);

      for (const entity of Object.values(entityMap)) {
        for (const relation of entityRelations) {
          const value = entity[relation.field];

          if (relation.isArray && Array.isArray(value)) {
            for (const refId of value) {
              referencedIds.get(relation.to)?.add(String(refId));
            }
          } else if (value !== null && value !== undefined) {
            referencedIds.get(relation.to)?.add(String(value));
          }
        }
      }
    }

    // Find entities not referenced by any relation
    for (const entityType of config.entities) {
      // Skip root entities (entities that don't have incoming relations)
      const hasIncomingRelation = relations.some((r) => r.to === entityType);
      if (!hasIncomingRelation) continue;

      const entityMap = entities[entityType];
      if (!entityMap) continue;

      const referenced = referencedIds.get(entityType) || new Set();

      for (const [entityId] of Object.entries(entityMap)) {
        if (!referenced.has(entityId)) {
          violations.push({
            type: 'orphan',
            severity: 'warning',
            entityType,
            entityId,
            message: `Orphaned ${entityType} entity not referenced by any relation`,
            repair: {
              action: 'delete',
            },
          });
        }
      }
    }

    return violations;
  }

  /**
   * Run anomaly detection
   */
  function runAnomalyDetection(entities: NormalizedEntities): IntegrityViolation[] {
    const violations: IntegrityViolation[] = [];

    for (const rule of anomalyRules) {
      const results = rule.detect(entities);

      for (const result of results) {
        violations.push({
          type: 'anomaly',
          severity: rule.severity || 'warning',
          entityType: result.entityType,
          entityId: result.entityId || '',
          message: `[${rule.name}] ${result.description}`,
          repair: result.suggestion
            ? {
                action: 'update',
                data: { suggestion: result.suggestion },
              }
            : undefined,
        });
      }
    }

    return violations;
  }

  /**
   * Run integrity check
   */
  function check(entities: NormalizedEntities): IntegrityReport {
    const startTime = performance.now();
    const violations: IntegrityViolation[] = [];
    const entityCounts: Record<string, number> = {};

    // Check each entity type
    for (const entityType of config.entities) {
      const entityMap = entities[entityType];
      if (!entityMap) {
        entityCounts[entityType] = 0;
        continue;
      }

      entityCounts[entityType] = Object.keys(entityMap).length;

      for (const entity of Object.values(entityMap)) {
        // Referential integrity
        violations.push(...checkReferentialIntegrity(entityType, entity, entities));

        // Custom constraints
        violations.push(...checkConstraints(entityType, entity, entities));

        // Early exit if fail fast and has errors
        if (config.failFast && violations.some((v) => v.severity === 'error')) {
          break;
        }
      }

      if (config.failFast && violations.some((v) => v.severity === 'error')) {
        break;
      }
    }

    // Orphan detection
    if (!config.failFast || !violations.some((v) => v.severity === 'error')) {
      violations.push(...detectOrphans(entities));
    }

    // Anomaly detection
    if (!config.failFast || !violations.some((v) => v.severity === 'error')) {
      violations.push(...runAnomalyDetection(entities));
    }

    const duration = performance.now() - startTime;

    return {
      valid: !violations.some((v) => v.severity === 'error'),
      timestamp: Date.now(),
      duration,
      entityCounts,
      violations,
      stats: {
        total: violations.length,
        errors: violations.filter((v) => v.severity === 'error').length,
        warnings: violations.filter((v) => v.severity === 'warning').length,
        info: violations.filter((v) => v.severity === 'info').length,
      },
    };
  }

  /**
   * Check specific entity
   */
  function checkEntity(
    entityType: string,
    entityId: string,
    entities: NormalizedEntities
  ): IntegrityViolation[] {
    const entity = entities[entityType]?.[entityId];
    if (!entity) {
      return [
        {
          type: 'referential',
          severity: 'error',
          entityType,
          entityId,
          message: `Entity not found`,
        },
      ];
    }

    const violations: IntegrityViolation[] = [];
    violations.push(...checkReferentialIntegrity(entityType, entity, entities));
    violations.push(...checkConstraints(entityType, entity, entities));

    return violations;
  }

  /**
   * Repair violations
   */
  function repair(
    entities: NormalizedEntities,
    report: IntegrityReport,
    options: RepairOptions = {}
  ): RepairResult {
    let repairedEntities: NormalizedEntities = JSON.parse(JSON.stringify(entities));
    const repairs: RepairResult['repairs'] = [];
    const remaining: IntegrityViolation[] = [];

    const violationsToFix = options.errorsOnly
      ? report.violations.filter((v) => v.severity === 'error')
      : report.violations;

    for (const violation of violationsToFix) {
      // Check for custom handler
      if (options.handlers?.[violation.type]) {
        if (!options.dryRun) {
          const handler = options.handlers[violation.type];
          if (handler) {
            repairedEntities = handler(violation, repairedEntities);
          }
        }
        repairs.push({ violation, action: 'custom-handler', success: true });
        continue;
      }

      // Default repair logic
      if (!violation.repair) {
        remaining.push(violation);
        continue;
      }

      try {
        if (!options.dryRun) {
          const entityTypeMap = repairedEntities[violation.entityType];
          switch (violation.repair.action) {
            case 'delete':
              if (entityTypeMap?.[violation.entityId]) {
                delete entityTypeMap[violation.entityId];
              }
              break;

            case 'update':
              if (entityTypeMap && violation.repair.data) {
                const existing = entityTypeMap[violation.entityId];
                entityTypeMap[violation.entityId] = {
                  ...existing,
                  ...(violation.repair.data as Record<string, unknown>),
                } as Entity;
              }
              break;

            case 'nullify':
              if (entityTypeMap && violation.field) {
                const entity = entityTypeMap[violation.entityId];
                if (entity) {
                  entity[violation.field] = null;
                }
              }
              break;

            case 'create':
              // Creating entities requires more context, skip for now
              remaining.push(violation);
              continue;
          }
        }

        repairs.push({ violation, action: violation.repair.action, success: true });
      } catch (error) {
        repairs.push({ violation, action: violation.repair.action, success: false });
        remaining.push(violation);
      }
    }

    return {
      entities: repairedEntities,
      repairs,
      remaining,
    };
  }

  /**
   * Add constraint
   */
  function addConstraint(constraint: ConstraintDefinition): void {
    constraints.push(constraint);
  }

  /**
   * Add relation
   */
  function addRelation(relation: RelationDefinition): void {
    relations.push(relation);
  }

  /**
   * Add anomaly rule
   */
  function addAnomalyRule(rule: AnomalyRule): void {
    anomalyRules.push(rule);
  }

  /**
   * Get configuration
   */
  function getConfig(): IntegrityCheckerConfig {
    return {
      ...config,
      relations: [...relations],
      constraints: [...constraints],
      anomalyRules: [...anomalyRules],
    };
  }

  return {
    check,
    checkEntity,
    repair,
    addConstraint,
    addRelation,
    addAnomalyRule,
    getConfig,
  };
}

// =============================================================================
// BUILT-IN ANOMALY RULES
// =============================================================================

/**
 * Create duplicate detection rule
 */
export function createDuplicateDetectionRule(
  entityType: string,
  fields: string[]
): AnomalyRule {
  return {
    name: `duplicate-${entityType}`,
    entity: entityType,
    severity: 'warning',
    detect: (entities) => {
      const results: AnomalyResult[] = [];
      const entityMap = entities[entityType];
      if (!entityMap) return results;

      const seen = new Map<string, string>();

      for (const [id, entity] of Object.entries(entityMap)) {
        const key = fields.map((f) => String(entity[f] ?? '')).join('|');
        const existing = seen.get(key);

        if (existing) {
          results.push({
            entityType,
            entityId: id,
            description: `Duplicate detected: same values as entity "${existing}" for fields [${fields.join(', ')}]`,
            suggestion: `Consider merging or removing duplicate entity`,
            data: { duplicateOf: existing, fields },
          });
        } else {
          seen.set(key, id);
        }
      }

      return results;
    },
  };
}

/**
 * Create stale data detection rule
 */
export function createStaleDataRule(
  entityType: string,
  timestampField: string,
  maxAgeMs: number
): AnomalyRule {
  return {
    name: `stale-${entityType}`,
    entity: entityType,
    severity: 'info',
    detect: (entities) => {
      const results: AnomalyResult[] = [];
      const entityMap = entities[entityType];
      if (!entityMap) return results;

      const now = Date.now();

      for (const [id, entity] of Object.entries(entityMap)) {
        const timestamp = entity[timestampField];
        if (typeof timestamp === 'number' || typeof timestamp === 'string') {
          const age = now - new Date(timestamp).getTime();
          if (age > maxAgeMs) {
            results.push({
              entityType,
              entityId: id,
              description: `Stale data: last updated ${Math.round(age / 1000 / 60)} minutes ago`,
              suggestion: `Consider refreshing this entity from the server`,
              data: { timestamp, age },
            });
          }
        }
      }

      return results;
    },
  };
}

/**
 * Create missing required fields rule
 */
export function createRequiredFieldsRule(
  entityType: string,
  requiredFields: string[]
): AnomalyRule {
  return {
    name: `required-fields-${entityType}`,
    entity: entityType,
    severity: 'error',
    detect: (entities) => {
      const results: AnomalyResult[] = [];
      const entityMap = entities[entityType];
      if (!entityMap) return results;

      for (const [id, entity] of Object.entries(entityMap)) {
        const missingFields = requiredFields.filter(
          (field) => entity[field] === null || entity[field] === undefined
        );

        if (missingFields.length > 0) {
          results.push({
            entityType,
            entityId: id,
            description: `Missing required fields: ${missingFields.join(', ')}`,
            suggestion: `Populate missing fields or remove the entity`,
            data: { missingFields },
          });
        }
      }

      return results;
    },
  };
}

/**
 * Create data consistency rule (cross-entity validation)
 */
export function createConsistencyRule(
  name: string,
  check: (entities: NormalizedEntities) => AnomalyResult[]
): AnomalyRule {
  return {
    name,
    severity: 'warning',
    detect: check,
  };
}

// =============================================================================
// BUILT-IN CONSTRAINTS
// =============================================================================

/**
 * Create unique field constraint
 */
export function createUniqueConstraint(
  entityType: string,
  field: string
): ConstraintDefinition {
  const seenValues = new Map<string, string>();

  return {
    name: `unique-${entityType}-${field}`,
    entity: entityType,
    validate: (entity, entities) => {
      const value = String(entity[field] ?? '');
      const entityId = String(entity.id);

      // Rebuild seen values each check for consistency
      seenValues.clear();
      const entityMap = entities[entityType];
      if (entityMap) {
        for (const [id, e] of Object.entries(entityMap)) {
          if (id === entityId) continue;
          seenValues.set(String(e[field] ?? ''), id);
        }
      }

      return !seenValues.has(value);
    },
    message: (entity) =>
      `Field "${field}" must be unique. Value "${entity[field]}" already exists.`,
    severity: 'error',
  };
}

/**
 * Create range constraint
 */
export function createRangeConstraint(
  entityType: string,
  field: string,
  min?: number,
  max?: number
): ConstraintDefinition {
  return {
    name: `range-${entityType}-${field}`,
    entity: entityType,
    validate: (entity) => {
      const value = entity[field];
      if (typeof value !== 'number') return true;
      if (min !== undefined && value < min) return false;
      if (max !== undefined && value > max) return false;
      return true;
    },
    message: (entity) => {
      const bounds = [];
      if (min !== undefined) bounds.push(`>= ${min}`);
      if (max !== undefined) bounds.push(`<= ${max}`);
      return `Field "${field}" must be ${bounds.join(' and ')}. Got ${entity[field]}.`;
    },
    severity: 'error',
  };
}

/**
 * Create pattern constraint
 */
export function createPatternConstraint(
  entityType: string,
  field: string,
  pattern: RegExp,
  description: string
): ConstraintDefinition {
  return {
    name: `pattern-${entityType}-${field}`,
    entity: entityType,
    validate: (entity) => {
      const value = entity[field];
      if (typeof value !== 'string') return true;
      return pattern.test(value);
    },
    message: `Field "${field}" must match ${description}`,
    severity: 'error',
  };
}

/**
 * Create enum constraint
 */
export function createEnumConstraint(
  entityType: string,
  field: string,
  allowedValues: readonly unknown[]
): ConstraintDefinition {
  return {
    name: `enum-${entityType}-${field}`,
    entity: entityType,
    validate: (entity) => {
      const value = entity[field];
      return allowedValues.includes(value);
    },
    message: (entity) =>
      `Field "${field}" must be one of [${allowedValues.join(', ')}]. Got "${entity[field]}".`,
    severity: 'error',
  };
}
