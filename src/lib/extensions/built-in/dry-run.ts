/**
 * @file Enterprise Dry Run Extension
 * @description Comprehensive dry run/preview system for the enzyme library
 *
 * Features:
 * 1. Operation Preview - preview what operations will do
 * 2. State Simulation - simulate state changes without committing
 * 3. API Request Preview - preview API calls without sending
 * 4. Change Summary - summarize all pending changes
 * 5. Rollback Support - revert simulated changes
 * 6. Diff Visualization - show before/after diffs
 * 7. Conflict Detection - detect potential conflicts
 * 8. Impact Analysis - analyze operation impact
 * 9. Approval Workflow - require approval before execution
 * 10. Batch Preview - preview multiple operations together
 *
 * @module extensions/built-in/dry-run
 * @version 2.0.0
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Operation types that can be tracked in dry run mode
 */
export type OperationType =
  | 'create'
  | 'update'
  | 'delete'
  | 'api_request'
  | 'state_change'
  | 'file_write'
  | 'file_delete'
  | 'database_write'
  | 'database_delete';

/**
 * Severity levels for impact analysis
 */
export type ImpactSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Conflict types
 */
export type ConflictType =
  | 'resource_exists'
  | 'concurrent_modification'
  | 'dependency_missing'
  | 'permission_denied'
  | 'validation_failed';

/**
 * Change status
 */
export type ChangeStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'committed'
  | 'rolled_back'
  | 'failed';

/**
 * Represents a single operation change
 */
export interface OperationChange {
  id: string;
  timestamp: Date;
  type: OperationType;
  resource: string;
  action: string;
  status: ChangeStatus;

  // Change details
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;

  // Impact analysis
  impact?: ImpactAnalysis;
  conflicts?: ConflictDetection[];
  dependencies?: string[];

  // Approval workflow
  requiresApproval?: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
}

/**
 * Impact analysis result
 */
export interface ImpactAnalysis {
  severity: ImpactSeverity;
  affectedResources: string[];
  estimatedDuration?: number;
  risks: string[];
  recommendations: string[];
  reversible: boolean;
}

/**
 * Conflict detection result
 */
export interface ConflictDetection {
  type: ConflictType;
  resource: string;
  message: string;
  canResolve: boolean;
  resolution?: string;
}

/**
 * Diff between before and after states
 */
export interface DiffResult {
  added: Array<{ path: string; value: unknown }>;
  removed: Array<{ path: string; value: unknown }>;
  modified: Array<{ path: string; before: unknown; after: unknown }>;
}

/**
 * Batch operation preview
 */
export interface BatchPreview {
  id: string;
  name: string;
  operations: OperationChange[];
  totalImpact: ImpactAnalysis;
  conflicts: ConflictDetection[];
  canExecute: boolean;
}

/**
 * Dry run statistics
 */
export interface DryRunStats {
  totalOperations: number;
  pendingOperations: number;
  approvedOperations: number;
  rejectedOperations: number;
  committedOperations: number;
  rolledBackOperations: number;
  failedOperations: number;
  totalConflicts: number;
  highImpactOperations: number;
}

/**
 * Dry run configuration
 */
export interface DryRunConfig {
  enabled: boolean;
  requireApproval: boolean;
  autoDetectConflicts: boolean;
  enableImpactAnalysis: boolean;
  enableDiffVisualization: boolean;
  maxPendingChanges: number;
  allowedOperations?: OperationType[];
  blockedOperations?: OperationType[];
  approvers?: string[];
  notificationUrl?: string;
}

// ============================================================================
// Dry Run State Manager
// ============================================================================

/**
 * Manages dry run state and operations
 */
class DryRunStateManager {
  private enabled: boolean = false;
  private config: DryRunConfig;
  private changes: Map<string, OperationChange> = new Map();
  private batches: Map<string, BatchPreview> = new Map();
  private listeners: Set<(changes: OperationChange[]) => void> = new Set();
  private currentBatchId: string | null = null;

  constructor(config: Partial<DryRunConfig> = {}) {
    this.config = {
      enabled: false,
      requireApproval: false,
      autoDetectConflicts: true,
      enableImpactAnalysis: true,
      enableDiffVisualization: true,
      maxPendingChanges: 100,
      ...config,
    };
  }

  // ==========================================================================
  // Core State Management
  // ==========================================================================

  isEnabled(): boolean {
    return this.enabled;
  }

  enable(): void {
    this.enabled = true;
    this.notifyListeners();
  }

  disable(): void {
    this.enabled = false;
    this.notifyListeners();
  }

  getConfig(): DryRunConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<DryRunConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // ==========================================================================
  // Change Tracking
  // ==========================================================================

  addChange(change: Omit<OperationChange, 'id' | 'timestamp' | 'status'>): string {
    if (!this.enabled) {
      throw new Error('Dry run mode is not enabled');
    }

    if (this.changes.size >= this.config.maxPendingChanges) {
      throw new Error(`Maximum pending changes (${this.config.maxPendingChanges}) reached`);
    }

    // Check if operation is allowed
    if (this.config.allowedOperations && !this.config.allowedOperations.includes(change.type)) {
      throw new Error(`Operation type "${change.type}" is not allowed`);
    }

    if (this.config.blockedOperations?.includes(change.type)) {
      throw new Error(`Operation type "${change.type}" is blocked`);
    }

    const id = this.generateId();
    const fullChange: OperationChange = {
      ...change,
      id,
      timestamp: new Date(),
      status: 'pending',
      requiresApproval: this.config.requireApproval,
    };

    // Perform impact analysis if enabled
    if (this.config.enableImpactAnalysis) {
      fullChange.impact = this.analyzeImpact(fullChange);
    }

    // Detect conflicts if enabled
    if (this.config.autoDetectConflicts) {
      fullChange.conflicts = this.detectConflicts(fullChange);
    }

    this.changes.set(id, fullChange);

    // Add to current batch if one is active
    if (this.currentBatchId) {
      const batch = this.batches.get(this.currentBatchId);
      if (batch) {
        batch.operations.push(fullChange);
      }
    }

    this.notifyListeners();
    return id;
  }

  getChange(id: string): OperationChange | undefined {
    return this.changes.get(id);
  }

  getAllChanges(): OperationChange[] {
    return Array.from(this.changes.values());
  }

  getPendingChanges(): OperationChange[] {
    return this.getAllChanges().filter(c => c.status === 'pending');
  }

  removeChange(id: string): boolean {
    const removed = this.changes.delete(id);
    if (removed) {
      this.notifyListeners();
    }
    return removed;
  }

  clearChanges(): void {
    this.changes.clear();
    this.batches.clear();
    this.currentBatchId = null;
    this.notifyListeners();
  }

  // ==========================================================================
  // State Simulation
  // ==========================================================================

  simulateState<T>(currentState: T, changes: OperationChange[]): T {
    let simulatedState = JSON.parse(JSON.stringify(currentState));

    for (const change of changes) {
      if (change.status !== 'pending' && change.status !== 'approved') {
        continue;
      }

      try {
        simulatedState = this.applyChange(simulatedState, change);
      } catch (error) {
        console.error(`Failed to simulate change ${change.id}:`, error);
      }
    }

    return simulatedState;
  }

  private applyChange<T>(state: T, change: OperationChange): T {
    // Simple state application - can be extended for complex scenarios
    if (change.after !== undefined) {
      return change.after as T;
    }
    return state;
  }

  // ==========================================================================
  // Diff Visualization
  // ==========================================================================

  getDiff(before: unknown, after: unknown): DiffResult {
    const added: Array<{ path: string; value: unknown }> = [];
    const removed: Array<{ path: string; value: unknown }> = [];
    const modified: Array<{ path: string; before: unknown; after: unknown }> = [];

    this.compareDiff('', before, after, added, removed, modified);

    return { added, removed, modified };
  }

  private compareDiff(
    path: string,
    before: unknown,
    after: unknown,
    added: Array<{ path: string; value: unknown }>,
    removed: Array<{ path: string; value: unknown }>,
    modified: Array<{ path: string; before: unknown; after: unknown }>
  ): void {
    if (before === after) return;

    if (before === undefined) {
      added.push({ path, value: after });
      return;
    }

    if (after === undefined) {
      removed.push({ path, value: before });
      return;
    }

    if (typeof before !== 'object' || typeof after !== 'object' ||
        before === null || after === null ||
        Array.isArray(before) !== Array.isArray(after)) {
      modified.push({ path, before, after });
      return;
    }

    const beforeObj = before as Record<string, unknown>;
    const afterObj = after as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);

    for (const key of allKeys) {
      const newPath = path ? `${path}.${key}` : key;
      this.compareDiff(newPath, beforeObj[key], afterObj[key], added, removed, modified);
    }
  }

  // ==========================================================================
  // Conflict Detection
  // ==========================================================================

  detectConflicts(change: OperationChange): ConflictDetection[] {
    const conflicts: ConflictDetection[] = [];

    // Check for concurrent modifications
    const existingChanges = this.getAllChanges().filter(
      c => c.resource === change.resource && c.id !== change.id && c.status === 'pending'
    );

    if (existingChanges.length > 0) {
      conflicts.push({
        type: 'concurrent_modification',
        resource: change.resource,
        message: `Resource "${change.resource}" has ${existingChanges.length} pending modification(s)`,
        canResolve: true,
        resolution: 'Wait for pending changes to complete or merge changes',
      });
    }

    // Check for missing dependencies
    if (change.dependencies) {
      for (const dep of change.dependencies) {
        const depExists = this.getAllChanges().some(
          c => c.resource === dep && (c.status === 'committed' || c.status === 'approved')
        );
        if (!depExists) {
          conflicts.push({
            type: 'dependency_missing',
            resource: dep,
            message: `Required dependency "${dep}" is not available`,
            canResolve: true,
            resolution: `Ensure "${dep}" is created or exists before proceeding`,
          });
        }
      }
    }

    return conflicts;
  }

  // ==========================================================================
  // Impact Analysis
  // ==========================================================================

  analyzeImpact(change: OperationChange): ImpactAnalysis {
    const affectedResources = [change.resource];
    const risks: string[] = [];
    const recommendations: string[] = [];
    let severity: ImpactSeverity = 'low';
    let reversible = true;

    // Analyze based on operation type
    switch (change.type) {
      case 'delete':
      case 'file_delete':
      case 'database_delete':
        severity = 'high';
        reversible = false;
        risks.push('Permanent data loss');
        recommendations.push('Ensure backup exists before proceeding');
        break;

      case 'update':
      case 'database_write':
        severity = 'medium';
        risks.push('Data modification');
        recommendations.push('Review changes carefully');
        break;

      case 'api_request':
        severity = 'medium';
        reversible = false;
        risks.push('External system interaction');
        recommendations.push('Ensure API endpoint is correct');
        break;

      case 'create':
      case 'file_write':
        severity = 'low';
        recommendations.push('Verify resource naming and location');
        break;
    }

    // Check for cascading effects
    const dependentChanges = this.getAllChanges().filter(
      c => c.dependencies?.includes(change.resource)
    );

    if (dependentChanges.length > 0) {
      severity = this.escalateSeverity(severity);
      affectedResources.push(...dependentChanges.map(c => c.resource));
      risks.push(`${dependentChanges.length} dependent operation(s) will be affected`);
    }

    return {
      severity,
      affectedResources,
      risks,
      recommendations,
      reversible,
    };
  }

  private escalateSeverity(current: ImpactSeverity): ImpactSeverity {
    const levels: ImpactSeverity[] = ['low', 'medium', 'high', 'critical'];
    const index = levels.indexOf(current);
    return levels[Math.min(index + 1, levels.length - 1)];
  }

  // ==========================================================================
  // Approval Workflow
  // ==========================================================================

  approveChange(id: string, approver: string): boolean {
    const change = this.changes.get(id);
    if (!change) return false;

    if (change.status !== 'pending') {
      throw new Error(`Cannot approve change with status: ${change.status}`);
    }

    if (this.config.approvers && !this.config.approvers.includes(approver)) {
      throw new Error(`User "${approver}" is not authorized to approve changes`);
    }

    change.status = 'approved';
    change.approvedBy = approver;
    change.approvedAt = new Date();

    this.notifyListeners();
    return true;
  }

  rejectChange(id: string, rejector: string, reason: string): boolean {
    const change = this.changes.get(id);
    if (!change) return false;

    if (change.status !== 'pending') {
      throw new Error(`Cannot reject change with status: ${change.status}`);
    }

    change.status = 'rejected';
    change.rejectedBy = rejector;
    change.rejectedAt = new Date();
    change.rejectionReason = reason;

    this.notifyListeners();
    return true;
  }

  // ==========================================================================
  // Batch Operations
  // ==========================================================================

  startBatch(name: string): string {
    const id = this.generateId();
    const batch: BatchPreview = {
      id,
      name,
      operations: [],
      totalImpact: {
        severity: 'low',
        affectedResources: [],
        risks: [],
        recommendations: [],
        reversible: true,
      },
      conflicts: [],
      canExecute: true,
    };

    this.batches.set(id, batch);
    this.currentBatchId = id;
    return id;
  }

  endBatch(): BatchPreview | null {
    if (!this.currentBatchId) return null;

    const batch = this.batches.get(this.currentBatchId);
    if (batch) {
      // Analyze batch
      batch.totalImpact = this.analyzeBatchImpact(batch.operations);
      batch.conflicts = this.detectBatchConflicts(batch.operations);
      batch.canExecute = batch.conflicts.length === 0 &&
        batch.operations.every(op => op.conflicts?.length === 0);
    }

    this.currentBatchId = null;
    return batch || null;
  }

  getBatch(id: string): BatchPreview | undefined {
    return this.batches.get(id);
  }

  getAllBatches(): BatchPreview[] {
    return Array.from(this.batches.values());
  }

  private analyzeBatchImpact(operations: OperationChange[]): ImpactAnalysis {
    const allRisks = new Set<string>();
    const allRecommendations = new Set<string>();
    const allAffectedResources = new Set<string>();
    let highestSeverity: ImpactSeverity = 'low';
    let allReversible = true;

    for (const op of operations) {
      if (op.impact) {
        op.impact.risks.forEach(r => allRisks.add(r));
        op.impact.recommendations.forEach(r => allRecommendations.add(r));
        op.impact.affectedResources.forEach(r => allAffectedResources.add(r));

        if (this.compareSeverity(op.impact.severity, highestSeverity) > 0) {
          highestSeverity = op.impact.severity;
        }

        if (!op.impact.reversible) {
          allReversible = false;
        }
      }
    }

    return {
      severity: highestSeverity,
      affectedResources: Array.from(allAffectedResources),
      risks: Array.from(allRisks),
      recommendations: Array.from(allRecommendations),
      reversible: allReversible,
    };
  }

  private detectBatchConflicts(operations: OperationChange[]): ConflictDetection[] {
    const conflicts: ConflictDetection[] = [];
    const resourceMap = new Map<string, OperationChange[]>();

    // Group by resource
    for (const op of operations) {
      const existing = resourceMap.get(op.resource) || [];
      existing.push(op);
      resourceMap.set(op.resource, existing);
    }

    // Check for conflicts within batch
    for (const [resource, ops] of resourceMap) {
      if (ops.length > 1) {
        conflicts.push({
          type: 'concurrent_modification',
          resource,
          message: `Multiple operations (${ops.length}) target the same resource "${resource}"`,
          canResolve: true,
          resolution: 'Review operation order or merge operations',
        });
      }
    }

    return conflicts;
  }

  private compareSeverity(a: ImpactSeverity, b: ImpactSeverity): number {
    const levels: ImpactSeverity[] = ['low', 'medium', 'high', 'critical'];
    return levels.indexOf(a) - levels.indexOf(b);
  }

  // ==========================================================================
  // Change Execution & Rollback
  // ==========================================================================

  async commitChanges(filter?: (change: OperationChange) => boolean): Promise<{
    succeeded: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const changesToCommit = filter
      ? this.getAllChanges().filter(filter)
      : this.getAllChanges().filter(c => c.status === 'approved' || !c.requiresApproval);

    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const change of changesToCommit) {
      try {
        // In a real implementation, this would execute the actual operation
        // For now, we just mark it as committed
        change.status = 'committed';
        succeeded.push(change.id);
      } catch (error) {
        change.status = 'failed';
        failed.push({
          id: change.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Remove committed changes
    for (const id of succeeded) {
      this.changes.delete(id);
    }

    this.notifyListeners();
    return { succeeded, failed };
  }

  async rollbackChange(id: string): Promise<boolean> {
    const change = this.changes.get(id);
    if (!change) return false;

    if (!change.impact?.reversible) {
      throw new Error('This change cannot be rolled back');
    }

    // In a real implementation, this would reverse the operation
    change.status = 'rolled_back';
    this.notifyListeners();
    return true;
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  getStats(): DryRunStats {
    const changes = this.getAllChanges();

    return {
      totalOperations: changes.length,
      pendingOperations: changes.filter(c => c.status === 'pending').length,
      approvedOperations: changes.filter(c => c.status === 'approved').length,
      rejectedOperations: changes.filter(c => c.status === 'rejected').length,
      committedOperations: changes.filter(c => c.status === 'committed').length,
      rolledBackOperations: changes.filter(c => c.status === 'rolled_back').length,
      failedOperations: changes.filter(c => c.status === 'failed').length,
      totalConflicts: changes.reduce((sum, c) => sum + (c.conflicts?.length || 0), 0),
      highImpactOperations: changes.filter(
        c => c.impact?.severity === 'high' || c.impact?.severity === 'critical'
      ).length,
    };
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private notifyListeners(): void {
    const changes = this.getAllChanges();
    this.listeners.forEach(listener => listener(changes));
  }

  subscribe(listener: (changes: OperationChange[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

// ============================================================================
// Global Instance
// ============================================================================

const globalDryRunManager = new DryRunStateManager();

// ============================================================================
// React Context
// ============================================================================

interface DryRunContextValue {
  enabled: boolean;
  config: DryRunConfig;
  changes: OperationChange[];
  stats: DryRunStats;

  // State management
  enableDryRun: () => void;
  disableDryRun: () => void;
  updateConfig: (config: Partial<DryRunConfig>) => void;

  // Change management
  addChange: (change: Omit<OperationChange, 'id' | 'timestamp' | 'status'>) => string;
  getChange: (id: string) => OperationChange | undefined;
  removeChange: (id: string) => boolean;
  clearChanges: () => void;

  // Preview operations
  getPendingChanges: () => OperationChange[];
  simulateState: <T>(currentState: T, changes?: OperationChange[]) => T;
  getDiff: (before: unknown, after: unknown) => DiffResult;

  // Approval workflow
  approveChange: (id: string, approver: string) => boolean;
  rejectChange: (id: string, rejector: string, reason: string) => boolean;

  // Batch operations
  startBatch: (name: string) => string;
  endBatch: () => BatchPreview | null;
  getBatch: (id: string) => BatchPreview | undefined;
  getAllBatches: () => BatchPreview[];

  // Execution
  commitChanges: (filter?: (change: OperationChange) => boolean) => Promise<{
    succeeded: string[];
    failed: Array<{ id: string; error: string }>;
  }>;
  rollbackChange: (id: string) => Promise<boolean>;
}

const DryRunContext = createContext<DryRunContextValue | null>(null);

// ============================================================================
// React Provider
// ============================================================================

export interface DryRunProviderProps {
  children: ReactNode;
  config?: Partial<DryRunConfig>;
  manager?: DryRunStateManager;
}

export function DryRunProvider({
  children,
  config,
  manager = globalDryRunManager,
}: DryRunProviderProps) {
  const [changes, setChanges] = useState<OperationChange[]>([]);
  const [enabled, setEnabled] = useState(manager.isEnabled());
  const [currentConfig, setCurrentConfig] = useState(manager.getConfig());

  // Subscribe to manager changes
  useEffect(() => {
    if (config) {
      manager.updateConfig(config);
      setCurrentConfig(manager.getConfig());
    }

    const unsubscribe = manager.subscribe((newChanges) => {
      setChanges([...newChanges]);
      setEnabled(manager.isEnabled());
      setCurrentConfig(manager.getConfig());
    });

    return unsubscribe;
  }, [manager, config]);

  const contextValue: DryRunContextValue = useMemo(() => ({
    enabled,
    config: currentConfig,
    changes,
    stats: manager.getStats(),

    enableDryRun: () => {
      manager.enable();
      setEnabled(true);
    },

    disableDryRun: () => {
      manager.disable();
      setEnabled(false);
    },

    updateConfig: (updates: Partial<DryRunConfig>) => {
      manager.updateConfig(updates);
      setCurrentConfig(manager.getConfig());
    },

    addChange: (change) => manager.addChange(change),
    getChange: (id) => manager.getChange(id),
    removeChange: (id) => manager.removeChange(id),
    clearChanges: () => manager.clearChanges(),

    getPendingChanges: () => manager.getPendingChanges(),
    simulateState: (currentState, changeList) =>
      manager.simulateState(currentState, changeList || changes),
    getDiff: (before, after) => manager.getDiff(before, after),

    approveChange: (id, approver) => manager.approveChange(id, approver),
    rejectChange: (id, rejector, reason) => manager.rejectChange(id, rejector, reason),

    startBatch: (name) => manager.startBatch(name),
    endBatch: () => manager.endBatch(),
    getBatch: (id) => manager.getBatch(id),
    getAllBatches: () => manager.getAllBatches(),

    commitChanges: (filter) => manager.commitChanges(filter),
    rollbackChange: (id) => manager.rollbackChange(id),
  }), [enabled, currentConfig, changes, manager]);

  return (
    <DryRunContext.Provider value={contextValue}>
      {children}
    </DryRunContext.Provider>
  );
}

// ============================================================================
// React Hook
// ============================================================================

export function useDryRun(): DryRunContextValue {
  const context = useContext(DryRunContext);
  if (!context) {
    throw new Error('useDryRun must be used within a DryRunProvider');
  }
  return context;
}

// ============================================================================
// React Components
// ============================================================================

export interface DryRunBannerProps {
  className?: string;
  style?: React.CSSProperties;
  showStats?: boolean;
  showActions?: boolean;
  onCommit?: () => void;
  onDiscard?: () => void;
}

export function DryRunBanner({
  className = '',
  style,
  showStats = true,
  showActions = true,
  onCommit,
  onDiscard,
}: DryRunBannerProps) {
  const { enabled, stats, changes, disableDryRun, clearChanges, commitChanges } = useDryRun();

  const handleCommit = useCallback(async () => {
    await commitChanges();
    onCommit?.();
  }, [commitChanges, onCommit]);

  const handleDiscard = useCallback(() => {
    clearChanges();
    onDiscard?.();
  }, [clearChanges, onDiscard]);

  if (!enabled) {
    return null;
  }

  return (
    <div
      className={`dry-run-banner ${className}`}
      style={{
        padding: '16px',
        backgroundColor: '#fff3cd',
        borderBottom: '2px solid #ffc107',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ fontWeight: 'bold', color: '#856404' }}>
          🔍 DRY RUN MODE ACTIVE
        </div>

        {showStats && (
          <div style={{ fontSize: '14px', color: '#856404' }}>
            {stats.totalOperations} operation(s) tracked
            {stats.highImpactOperations > 0 && (
              <span style={{ marginLeft: '8px', color: '#dc3545' }}>
                ⚠️ {stats.highImpactOperations} high impact
              </span>
            )}
          </div>
        )}
      </div>

      {showActions && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleCommit}
            disabled={changes.length === 0}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: changes.length === 0 ? 'not-allowed' : 'pointer',
              opacity: changes.length === 0 ? 0.5 : 1,
            }}
          >
            Commit {changes.length} Change(s)
          </button>

          <button
            onClick={handleDiscard}
            disabled={changes.length === 0}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: changes.length === 0 ? 'not-allowed' : 'pointer',
              opacity: changes.length === 0 ? 0.5 : 1,
            }}
          >
            Discard
          </button>

          <button
            onClick={disableDryRun}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Exit Dry Run
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Extension Export (for CLI integration)
// ============================================================================

/**
 * Enzyme Extension Definition
 * This follows the CLI extension pattern but provides state management
 * that can be used in both CLI and React contexts
 */
export const dryRunExtension = {
  name: 'enzyme:dry-run',
  version: '2.0.0',
  description: 'Enterprise dry run/preview extension with comprehensive change tracking',

  // Client methods for programmatic access
  client: {
    $enableDryRun(): void {
      globalDryRunManager.enable();
    },

    $disableDryRun(): void {
      globalDryRunManager.disable();
    },

    $isDryRunEnabled(): boolean {
      return globalDryRunManager.isEnabled();
    },

    $getPendingChanges(): OperationChange[] {
      return globalDryRunManager.getPendingChanges();
    },

    $previewOperation(operation: Omit<OperationChange, 'id' | 'timestamp' | 'status'>): string {
      return globalDryRunManager.addChange(operation);
    },

    $simulateState<T>(currentState: T, changes?: OperationChange[]): T {
      const changesToApply = changes || globalDryRunManager.getPendingChanges();
      return globalDryRunManager.simulateState(currentState, changesToApply);
    },

    $commitChanges(filter?: (change: OperationChange) => boolean): Promise<{
      succeeded: string[];
      failed: Array<{ id: string; error: string }>;
    }> {
      return globalDryRunManager.commitChanges(filter);
    },

    $discardChanges(): void {
      globalDryRunManager.clearChanges();
    },

    $getChangeDiff(before: unknown, after: unknown): DiffResult {
      return globalDryRunManager.getDiff(before, after);
    },

    $getStats(): DryRunStats {
      return globalDryRunManager.getStats();
    },

    $updateConfig(config: Partial<DryRunConfig>): void {
      globalDryRunManager.updateConfig(config);
    },

    $getConfig(): DryRunConfig {
      return globalDryRunManager.getConfig();
    },

    $approveChange(id: string, approver: string): boolean {
      return globalDryRunManager.approveChange(id, approver);
    },

    $rejectChange(id: string, rejector: string, reason: string): boolean {
      return globalDryRunManager.rejectChange(id, rejector, reason);
    },

    $startBatch(name: string): string {
      return globalDryRunManager.startBatch(name);
    },

    $endBatch(): BatchPreview | null {
      return globalDryRunManager.endBatch();
    },

    $getBatch(id: string): BatchPreview | undefined {
      return globalDryRunManager.getBatch(id);
    },

    $getAllBatches(): BatchPreview[] {
      return globalDryRunManager.getAllBatches();
    },

    $rollbackChange(id: string): Promise<boolean> {
      return globalDryRunManager.rollbackChange(id);
    },
  },
};

// ============================================================================
// Exports
// ============================================================================

export { globalDryRunManager, DryRunStateManager };
export type {
  DryRunConfig,
  OperationChange,
  ImpactAnalysis,
  ConflictDetection,
  DiffResult,
  BatchPreview,
  DryRunStats,
  OperationType,
  ImpactSeverity,
  ConflictType,
  ChangeStatus,
};
