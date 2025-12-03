/**
 * @file Dry Run Extension Tests
 * @description Comprehensive test suite for the dry run extension
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DryRunStateManager,
  dryRunExtension,
  type OperationChange,
  type DryRunConfig,
} from '../dry-run';

describe('DryRunExtension', () => {
  let manager: DryRunStateManager;

  beforeEach(() => {
    manager = new DryRunStateManager();
  });

  afterEach(() => {
    manager.clearChanges();
  });

  // ==========================================================================
  // Core State Management Tests
  // ==========================================================================

  describe('State Management', () => {
    it('should start disabled', () => {
      expect(manager.isEnabled()).toBe(false);
    });

    it('should enable dry run mode', () => {
      manager.enable();
      expect(manager.isEnabled()).toBe(true);
    });

    it('should disable dry run mode', () => {
      manager.enable();
      manager.disable();
      expect(manager.isEnabled()).toBe(false);
    });

    it('should update configuration', () => {
      manager.updateConfig({ requireApproval: true });
      expect(manager.getConfig().requireApproval).toBe(true);
    });

    it('should merge configuration updates', () => {
      const initialConfig = manager.getConfig();
      manager.updateConfig({ requireApproval: true });
      const updatedConfig = manager.getConfig();

      expect(updatedConfig.requireApproval).toBe(true);
      expect(updatedConfig.autoDetectConflicts).toBe(initialConfig.autoDetectConflicts);
    });
  });

  // ==========================================================================
  // Change Tracking Tests
  // ==========================================================================

  describe('Change Tracking', () => {
    beforeEach(() => {
      manager.enable();
    });

    it('should add a change', () => {
      const id = manager.addChange({
        type: 'create',
        resource: 'user',
        action: 'create_user',
        after: { name: 'John' },
      });

      expect(id).toBeDefined();
      expect(manager.getAllChanges()).toHaveLength(1);
    });

    it('should throw error when adding change while disabled', () => {
      manager.disable();

      expect(() =>
        manager.addChange({
          type: 'create',
          resource: 'user',
          action: 'create_user',
        })
      ).toThrow('Dry run mode is not enabled');
    });

    it('should get a change by id', () => {
      const id = manager.addChange({
        type: 'update',
        resource: 'user:1',
        action: 'update_user',
        after: { name: 'Jane' },
      });

      const change = manager.getChange(id);
      expect(change).toBeDefined();
      expect(change?.id).toBe(id);
      expect(change?.type).toBe('update');
    });

    it('should get all changes', () => {
      manager.addChange({ type: 'create', resource: 'user:1', action: 'create' });
      manager.addChange({ type: 'update', resource: 'user:2', action: 'update' });
      manager.addChange({ type: 'delete', resource: 'user:3', action: 'delete' });

      expect(manager.getAllChanges()).toHaveLength(3);
    });

    it('should get pending changes only', () => {
      const id1 = manager.addChange({ type: 'create', resource: 'user:1', action: 'create' });
      const id2 = manager.addChange({ type: 'create', resource: 'user:2', action: 'create' });

      manager.approveChange(id1, 'admin');

      const pending = manager.getPendingChanges();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(id2);
    });

    it('should remove a change', () => {
      const id = manager.addChange({ type: 'create', resource: 'user', action: 'create' });

      expect(manager.removeChange(id)).toBe(true);
      expect(manager.getAllChanges()).toHaveLength(0);
    });

    it('should clear all changes', () => {
      manager.addChange({ type: 'create', resource: 'user:1', action: 'create' });
      manager.addChange({ type: 'create', resource: 'user:2', action: 'create' });

      manager.clearChanges();
      expect(manager.getAllChanges()).toHaveLength(0);
    });

    it('should enforce max pending changes limit', () => {
      manager.updateConfig({ maxPendingChanges: 2 });

      manager.addChange({ type: 'create', resource: 'user:1', action: 'create' });
      manager.addChange({ type: 'create', resource: 'user:2', action: 'create' });

      expect(() =>
        manager.addChange({ type: 'create', resource: 'user:3', action: 'create' })
      ).toThrow('Maximum pending changes');
    });

    it('should respect allowed operations', () => {
      manager.updateConfig({ allowedOperations: ['create', 'update'] });

      expect(() =>
        manager.addChange({ type: 'delete', resource: 'user', action: 'delete' })
      ).toThrow('Operation type "delete" is not allowed');
    });

    it('should respect blocked operations', () => {
      manager.updateConfig({ blockedOperations: ['delete'] });

      expect(() =>
        manager.addChange({ type: 'delete', resource: 'user', action: 'delete' })
      ).toThrow('Operation type "delete" is blocked');
    });
  });

  // ==========================================================================
  // State Simulation Tests
  // ==========================================================================

  describe('State Simulation', () => {
    beforeEach(() => {
      manager.enable();
    });

    it('should simulate state changes', () => {
      const currentState = { count: 0 };

      manager.addChange({
        type: 'state_change',
        resource: 'counter',
        action: 'increment',
        before: { count: 0 },
        after: { count: 1 },
      });

      const simulated = manager.simulateState(currentState, manager.getPendingChanges());
      expect(simulated).toEqual({ count: 1 });
    });

    it('should not modify original state', () => {
      const currentState = { count: 0 };
      const original = { ...currentState };

      manager.addChange({
        type: 'state_change',
        resource: 'counter',
        action: 'increment',
        after: { count: 1 },
      });

      manager.simulateState(currentState, manager.getPendingChanges());
      expect(currentState).toEqual(original);
    });
  });

  // ==========================================================================
  // Diff Visualization Tests
  // ==========================================================================

  describe('Diff Visualization', () => {
    it('should detect added fields', () => {
      const before = { name: 'John' };
      const after = { name: 'John', age: 30 };

      const diff = manager.getDiff(before, after);

      expect(diff.added).toHaveLength(1);
      expect(diff.added[0]).toEqual({ path: 'age', value: 30 });
    });

    it('should detect removed fields', () => {
      const before = { name: 'John', age: 30 };
      const after = { name: 'John' };

      const diff = manager.getDiff(before, after);

      expect(diff.removed).toHaveLength(1);
      expect(diff.removed[0]).toEqual({ path: 'age', value: 30 });
    });

    it('should detect modified fields', () => {
      const before = { name: 'John', age: 30 };
      const after = { name: 'Jane', age: 30 };

      const diff = manager.getDiff(before, after);

      expect(diff.modified).toHaveLength(1);
      expect(diff.modified[0]).toEqual({ path: 'name', before: 'John', after: 'Jane' });
    });

    it('should handle nested objects', () => {
      const before = { user: { name: 'John', age: 30 } };
      const after = { user: { name: 'John', age: 31 } };

      const diff = manager.getDiff(before, after);

      expect(diff.modified).toHaveLength(1);
      expect(diff.modified[0].path).toBe('user.age');
    });

    it('should return empty diff for identical objects', () => {
      const obj = { name: 'John', age: 30 };

      const diff = manager.getDiff(obj, obj);

      expect(diff.added).toHaveLength(0);
      expect(diff.removed).toHaveLength(0);
      expect(diff.modified).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Conflict Detection Tests
  // ==========================================================================

  describe('Conflict Detection', () => {
    beforeEach(() => {
      manager.enable();
    });

    it('should detect concurrent modifications', () => {
      manager.addChange({
        type: 'update',
        resource: 'user:123',
        action: 'update_name',
        after: { name: 'John' },
      });

      const id2 = manager.addChange({
        type: 'update',
        resource: 'user:123',
        action: 'update_email',
        after: { email: 'john@example.com' },
      });

      const change2 = manager.getChange(id2);
      const concurrentConflicts = change2?.conflicts?.filter(
        c => c.type === 'concurrent_modification'
      );

      expect(concurrentConflicts).toHaveLength(1);
    });

    it('should detect missing dependencies', () => {
      const id = manager.addChange({
        type: 'update',
        resource: 'post:1',
        action: 'update_post',
        dependencies: ['user:123'],
        after: { title: 'Updated' },
      });

      const change = manager.getChange(id);
      const dependencyConflicts = change?.conflicts?.filter(
        c => c.type === 'dependency_missing'
      );

      expect(dependencyConflicts).toBeDefined();
      expect(dependencyConflicts!.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Impact Analysis Tests
  // ==========================================================================

  describe('Impact Analysis', () => {
    beforeEach(() => {
      manager.enable();
      manager.updateConfig({ enableImpactAnalysis: true });
    });

    it('should mark delete operations as high impact', () => {
      const id = manager.addChange({
        type: 'delete',
        resource: 'user:123',
        action: 'delete_user',
      });

      const change = manager.getChange(id);
      expect(change?.impact?.severity).toBe('high');
      expect(change?.impact?.reversible).toBe(false);
    });

    it('should mark create operations as low impact', () => {
      const id = manager.addChange({
        type: 'create',
        resource: 'user',
        action: 'create_user',
        after: { name: 'John' },
      });

      const change = manager.getChange(id);
      expect(change?.impact?.severity).toBe('low');
    });

    it('should include risks and recommendations', () => {
      const id = manager.addChange({
        type: 'database_delete',
        resource: 'table:users',
        action: 'drop_table',
      });

      const change = manager.getChange(id);
      expect(change?.impact?.risks.length).toBeGreaterThan(0);
      expect(change?.impact?.recommendations.length).toBeGreaterThan(0);
    });

    it('should escalate severity for dependent changes', () => {
      const id1 = manager.addChange({
        type: 'create',
        resource: 'dependency',
        action: 'create',
      });

      const id2 = manager.addChange({
        type: 'create',
        resource: 'main',
        action: 'create',
        dependencies: ['dependency'],
      });

      const change = manager.getChange(id2);
      // Severity should be escalated due to dependencies
      expect(change?.impact).toBeDefined();
    });
  });

  // ==========================================================================
  // Approval Workflow Tests
  // ==========================================================================

  describe('Approval Workflow', () => {
    beforeEach(() => {
      manager.enable();
      manager.updateConfig({ requireApproval: true });
    });

    it('should approve a change', () => {
      const id = manager.addChange({
        type: 'update',
        resource: 'config',
        action: 'update_config',
      });

      const result = manager.approveChange(id, 'admin@example.com');

      expect(result).toBe(true);
      const change = manager.getChange(id);
      expect(change?.status).toBe('approved');
      expect(change?.approvedBy).toBe('admin@example.com');
      expect(change?.approvedAt).toBeInstanceOf(Date);
    });

    it('should reject a change', () => {
      const id = manager.addChange({
        type: 'delete',
        resource: 'user',
        action: 'delete_user',
      });

      const result = manager.rejectChange(id, 'admin@example.com', 'Too risky');

      expect(result).toBe(true);
      const change = manager.getChange(id);
      expect(change?.status).toBe('rejected');
      expect(change?.rejectedBy).toBe('admin@example.com');
      expect(change?.rejectionReason).toBe('Too risky');
    });

    it('should not approve non-pending changes', () => {
      const id = manager.addChange({
        type: 'create',
        resource: 'user',
        action: 'create',
      });

      manager.approveChange(id, 'admin');

      expect(() => manager.approveChange(id, 'admin')).toThrow(
        'Cannot approve change with status: approved'
      );
    });

    it('should enforce approver list', () => {
      manager.updateConfig({ approvers: ['admin@example.com'] });

      const id = manager.addChange({
        type: 'update',
        resource: 'config',
        action: 'update',
      });

      expect(() => manager.approveChange(id, 'user@example.com')).toThrow(
        'not authorized to approve'
      );
    });
  });

  // ==========================================================================
  // Batch Operations Tests
  // ==========================================================================

  describe('Batch Operations', () => {
    beforeEach(() => {
      manager.enable();
    });

    it('should start a batch', () => {
      const batchId = manager.startBatch('Test Batch');

      expect(batchId).toBeDefined();
      const batch = manager.getBatch(batchId);
      expect(batch?.name).toBe('Test Batch');
    });

    it('should add operations to active batch', () => {
      const batchId = manager.startBatch('Test Batch');

      manager.addChange({ type: 'create', resource: 'user:1', action: 'create' });
      manager.addChange({ type: 'create', resource: 'user:2', action: 'create' });

      const batch = manager.getBatch(batchId);
      expect(batch?.operations).toHaveLength(2);
    });

    it('should end a batch', () => {
      manager.startBatch('Test Batch');
      manager.addChange({ type: 'create', resource: 'user', action: 'create' });

      const batch = manager.endBatch();

      expect(batch).toBeDefined();
      expect(batch?.operations).toHaveLength(1);
    });

    it('should analyze batch impact', () => {
      manager.startBatch('Mixed Operations');

      manager.addChange({ type: 'create', resource: 'user:1', action: 'create' });
      manager.addChange({ type: 'delete', resource: 'user:2', action: 'delete' });

      const batch = manager.endBatch();

      expect(batch?.totalImpact).toBeDefined();
      expect(batch?.totalImpact.severity).toBeDefined();
    });

    it('should detect batch conflicts', () => {
      manager.startBatch('Conflicting Operations');

      manager.addChange({ type: 'update', resource: 'user:1', action: 'update_name' });
      manager.addChange({ type: 'update', resource: 'user:1', action: 'update_email' });
      manager.addChange({ type: 'delete', resource: 'user:1', action: 'delete' });

      const batch = manager.endBatch();

      expect(batch?.conflicts.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Execution Tests
  // ==========================================================================

  describe('Change Execution', () => {
    beforeEach(() => {
      manager.enable();
    });

    it('should commit approved changes', async () => {
      const id = manager.addChange({
        type: 'create',
        resource: 'user',
        action: 'create',
      });

      manager.updateConfig({ requireApproval: false });

      const result = await manager.commitChanges();

      expect(result.succeeded).toContain(id);
      expect(result.failed).toHaveLength(0);
    });

    it('should not commit unapproved changes when approval required', async () => {
      manager.updateConfig({ requireApproval: true });

      manager.addChange({
        type: 'create',
        resource: 'user',
        action: 'create',
      });

      const result = await manager.commitChanges();

      expect(result.succeeded).toHaveLength(0);
    });

    it('should commit with filter', async () => {
      manager.updateConfig({ requireApproval: false });

      const id1 = manager.addChange({
        type: 'create',
        resource: 'user:1',
        action: 'create',
      });

      manager.addChange({
        type: 'delete',
        resource: 'user:2',
        action: 'delete',
      });

      const result = await manager.commitChanges(
        (change) => change.type === 'create'
      );

      expect(result.succeeded).toContain(id1);
      expect(result.succeeded).toHaveLength(1);
    });

    it('should rollback reversible changes', async () => {
      const id = manager.addChange({
        type: 'update',
        resource: 'user',
        action: 'update',
      });

      const result = await manager.rollbackChange(id);

      expect(result).toBe(true);
      const change = manager.getChange(id);
      expect(change?.status).toBe('rolled_back');
    });

    it('should not rollback irreversible changes', async () => {
      const id = manager.addChange({
        type: 'delete',
        resource: 'user',
        action: 'delete',
      });

      await expect(manager.rollbackChange(id)).rejects.toThrow(
        'This change cannot be rolled back'
      );
    });
  });

  // ==========================================================================
  // Statistics Tests
  // ==========================================================================

  describe('Statistics', () => {
    beforeEach(() => {
      manager.enable();
    });

    it('should track total operations', () => {
      manager.addChange({ type: 'create', resource: 'user:1', action: 'create' });
      manager.addChange({ type: 'create', resource: 'user:2', action: 'create' });

      const stats = manager.getStats();
      expect(stats.totalOperations).toBe(2);
    });

    it('should track pending operations', () => {
      const id1 = manager.addChange({ type: 'create', resource: 'user:1', action: 'create' });
      manager.addChange({ type: 'create', resource: 'user:2', action: 'create' });

      manager.approveChange(id1, 'admin');

      const stats = manager.getStats();
      expect(stats.pendingOperations).toBe(1);
      expect(stats.approvedOperations).toBe(1);
    });

    it('should track high impact operations', () => {
      manager.updateConfig({ enableImpactAnalysis: true });

      manager.addChange({ type: 'create', resource: 'user', action: 'create' });
      manager.addChange({ type: 'delete', resource: 'user', action: 'delete' });

      const stats = manager.getStats();
      expect(stats.highImpactOperations).toBeGreaterThan(0);
    });

    it('should track conflicts', () => {
      manager.updateConfig({ autoDetectConflicts: true });

      manager.addChange({ type: 'update', resource: 'user:1', action: 'update1' });
      manager.addChange({ type: 'update', resource: 'user:1', action: 'update2' });

      const stats = manager.getStats();
      expect(stats.totalConflicts).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Client Extension API Tests
  // ==========================================================================

  describe('Client Extension API', () => {
    it('should enable dry run via client API', () => {
      dryRunExtension.client.$enableDryRun();
      expect(dryRunExtension.client.$isDryRunEnabled()).toBe(true);
    });

    it('should disable dry run via client API', () => {
      dryRunExtension.client.$enableDryRun();
      dryRunExtension.client.$disableDryRun();
      expect(dryRunExtension.client.$isDryRunEnabled()).toBe(false);
    });

    it('should preview operation via client API', () => {
      dryRunExtension.client.$enableDryRun();

      const id = dryRunExtension.client.$previewOperation({
        type: 'create',
        resource: 'user',
        action: 'create_user',
        after: { name: 'Test' },
      });

      expect(id).toBeDefined();

      const pending = dryRunExtension.client.$getPendingChanges();
      expect(pending).toHaveLength(1);

      dryRunExtension.client.$disableDryRun();
    });

    it('should get stats via client API', () => {
      dryRunExtension.client.$enableDryRun();

      dryRunExtension.client.$previewOperation({
        type: 'create',
        resource: 'user',
        action: 'create',
      });

      const stats = dryRunExtension.client.$getStats();
      expect(stats.totalOperations).toBe(1);

      dryRunExtension.client.$disableDryRun();
    });
  });

  // ==========================================================================
  // Event Listener Tests
  // ==========================================================================

  describe('Event Listeners', () => {
    beforeEach(() => {
      manager.enable();
    });

    it('should notify listeners on change', () => {
      const listener = vi.fn();
      manager.subscribe(listener);

      manager.addChange({ type: 'create', resource: 'user', action: 'create' });

      expect(listener).toHaveBeenCalled();
    });

    it('should unsubscribe listener', () => {
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);

      manager.addChange({ type: 'create', resource: 'user:1', action: 'create' });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      listener.mockClear();

      manager.addChange({ type: 'create', resource: 'user:2', action: 'create' });
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
