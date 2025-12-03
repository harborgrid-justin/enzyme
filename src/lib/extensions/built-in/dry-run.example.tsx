/**
 * @file Dry Run Extension Usage Examples
 * @description Comprehensive examples for using the dry run extension
 */

import React, { useState } from 'react';
import {
  DryRunProvider,
  useDryRun,
  DryRunBanner,
  dryRunExtension,
  type OperationChange,
  type BatchPreview,
} from './dry-run';

// ============================================================================
// Example 1: Basic Usage with React
// ============================================================================

function BasicExample() {
  return (
    <DryRunProvider
      config={{
        requireApproval: false,
        autoDetectConflicts: true,
        enableImpactAnalysis: true,
      }}
    >
      <DryRunBanner showStats showActions />
      <MyApplication />
    </DryRunProvider>
  );
}

function MyApplication() {
  const { enabled, enableDryRun, addChange, getPendingChanges } = useDryRun();

  const handleCreateUser = () => {
    if (enabled) {
      // Preview the operation
      addChange({
        type: 'create',
        resource: 'user',
        action: 'create_user',
        after: { name: 'John Doe', email: 'john@example.com' },
        metadata: { source: 'user_form' },
      });
    } else {
      // Actually create the user
      createUser({ name: 'John Doe', email: 'john@example.com' });
    }
  };

  return (
    <div>
      <button onClick={enableDryRun}>Enable Preview Mode</button>
      <button onClick={handleCreateUser}>Create User</button>
      <div>Pending changes: {getPendingChanges().length}</div>
    </div>
  );
}

// Mock function
function createUser(data: any) {
  console.log('Creating user:', data);
}

// ============================================================================
// Example 2: State Simulation
// ============================================================================

function StateSimulationExample() {
  const { simulateState, addChange, getPendingChanges } = useDryRun();

  interface AppState {
    users: Array<{ id: string; name: string }>;
    count: number;
  }

  const [currentState] = useState<AppState>({
    users: [{ id: '1', name: 'Alice' }],
    count: 1,
  });

  const previewAddUser = () => {
    addChange({
      type: 'state_change',
      resource: 'app_state',
      action: 'add_user',
      before: currentState,
      after: {
        ...currentState,
        users: [...currentState.users, { id: '2', name: 'Bob' }],
        count: currentState.count + 1,
      },
    });
  };

  const simulatedState = simulateState(currentState);

  return (
    <div>
      <h3>Current State</h3>
      <pre>{JSON.stringify(currentState, null, 2)}</pre>

      <h3>Simulated State (After Changes)</h3>
      <pre>{JSON.stringify(simulatedState, null, 2)}</pre>

      <button onClick={previewAddUser}>Preview Add User</button>
      <div>Pending: {getPendingChanges().length}</div>
    </div>
  );
}

// ============================================================================
// Example 3: API Request Preview
// ============================================================================

function ApiPreviewExample() {
  const { enabled, addChange } = useDryRun();

  const handleApiCall = async (endpoint: string, data: any) => {
    if (enabled) {
      // Preview the API call
      addChange({
        type: 'api_request',
        resource: endpoint,
        action: 'POST',
        after: data,
        metadata: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
      });
      console.log('API call previewed (not sent)');
    } else {
      // Actually make the API call
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }
  };

  return (
    <div>
      <button
        onClick={() =>
          handleApiCall('/api/users', { name: 'Jane', email: 'jane@example.com' })
        }
      >
        Create User via API
      </button>
    </div>
  );
}

// ============================================================================
// Example 4: Diff Visualization
// ============================================================================

function DiffVisualizationExample() {
  const { getDiff } = useDryRun();

  const before = {
    name: 'John Doe',
    age: 30,
    email: 'john@old.com',
    address: {
      city: 'New York',
      country: 'USA',
    },
  };

  const after = {
    name: 'John Doe',
    age: 31,
    email: 'john@new.com',
    address: {
      city: 'Los Angeles',
      country: 'USA',
    },
    phone: '+1234567890',
  };

  const diff = getDiff(before, after);

  return (
    <div>
      <h3>Change Diff</h3>

      <div style={{ color: 'green' }}>
        <h4>Added:</h4>
        {diff.added.map((item, i) => (
          <div key={i}>
            + {item.path}: {JSON.stringify(item.value)}
          </div>
        ))}
      </div>

      <div style={{ color: 'red' }}>
        <h4>Removed:</h4>
        {diff.removed.map((item, i) => (
          <div key={i}>
            - {item.path}: {JSON.stringify(item.value)}
          </div>
        ))}
      </div>

      <div style={{ color: 'orange' }}>
        <h4>Modified:</h4>
        {diff.modified.map((item, i) => (
          <div key={i}>
            ~ {item.path}: {JSON.stringify(item.before)} → {JSON.stringify(item.after)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Example 5: Conflict Detection
// ============================================================================

function ConflictDetectionExample() {
  const { addChange, changes } = useDryRun();

  const createConflictingChanges = () => {
    // Create multiple changes to the same resource
    addChange({
      type: 'update',
      resource: 'user:123',
      action: 'update_name',
      after: { name: 'Alice' },
    });

    addChange({
      type: 'update',
      resource: 'user:123',
      action: 'update_email',
      after: { email: 'alice@example.com' },
    });

    addChange({
      type: 'delete',
      resource: 'user:123',
      action: 'delete_user',
    });
  };

  return (
    <div>
      <button onClick={createConflictingChanges}>Create Conflicting Changes</button>

      <h3>Detected Conflicts:</h3>
      {changes.map((change) =>
        change.conflicts?.map((conflict, i) => (
          <div
            key={i}
            style={{
              padding: '8px',
              margin: '8px 0',
              backgroundColor: '#ffebee',
              borderLeft: '4px solid #f44336',
            }}
          >
            <strong>{conflict.type}</strong>: {conflict.message}
            {conflict.canResolve && (
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                Resolution: {conflict.resolution}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ============================================================================
// Example 6: Impact Analysis
// ============================================================================

function ImpactAnalysisExample() {
  const { addChange, changes } = useDryRun();

  const createHighImpactChange = () => {
    addChange({
      type: 'database_delete',
      resource: 'database:production',
      action: 'drop_table',
      metadata: { table: 'users' },
    });
  };

  return (
    <div>
      <button onClick={createHighImpactChange}>Preview High Impact Change</button>

      <h3>Impact Analysis:</h3>
      {changes.map((change) =>
        change.impact ? (
          <div
            key={change.id}
            style={{
              padding: '16px',
              margin: '8px 0',
              backgroundColor:
                change.impact.severity === 'critical'
                  ? '#ffebee'
                  : change.impact.severity === 'high'
                    ? '#fff3e0'
                    : '#e8f5e9',
              borderLeft: `4px solid ${
                change.impact.severity === 'critical'
                  ? '#f44336'
                  : change.impact.severity === 'high'
                    ? '#ff9800'
                    : '#4caf50'
              }`,
            }}
          >
            <div>
              <strong>Severity:</strong> {change.impact.severity.toUpperCase()}
            </div>
            <div>
              <strong>Affected Resources:</strong>{' '}
              {change.impact.affectedResources.join(', ')}
            </div>
            <div>
              <strong>Reversible:</strong> {change.impact.reversible ? 'Yes' : 'No'}
            </div>

            <div style={{ marginTop: '8px' }}>
              <strong>Risks:</strong>
              <ul>
                {change.impact.risks.map((risk, i) => (
                  <li key={i}>{risk}</li>
                ))}
              </ul>
            </div>

            <div>
              <strong>Recommendations:</strong>
              <ul>
                {change.impact.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}

// ============================================================================
// Example 7: Approval Workflow
// ============================================================================

function ApprovalWorkflowExample() {
  const { addChange, changes, approveChange, rejectChange } = useDryRun();
  const [currentUser] = useState('admin@example.com');

  const createChangeRequiringApproval = () => {
    addChange({
      type: 'database_write',
      resource: 'config:production',
      action: 'update_config',
      after: { maxConnections: 1000 },
      requiresApproval: true,
    });
  };

  return (
    <div>
      <button onClick={createChangeRequiringApproval}>
        Create Change Requiring Approval
      </button>

      <h3>Pending Approvals:</h3>
      {changes
        .filter((c) => c.requiresApproval && c.status === 'pending')
        .map((change) => (
          <div
            key={change.id}
            style={{
              padding: '16px',
              margin: '8px 0',
              backgroundColor: '#fff3e0',
              borderLeft: '4px solid #ff9800',
            }}
          >
            <div>
              <strong>{change.action}</strong> on {change.resource}
            </div>
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
              <button
                onClick={() => approveChange(change.id, currentUser)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                }}
              >
                Approve
              </button>
              <button
                onClick={() =>
                  rejectChange(change.id, currentUser, 'Too risky for production')
                }
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                }}
              >
                Reject
              </button>
            </div>
          </div>
        ))}

      <h3>Approved Changes:</h3>
      {changes
        .filter((c) => c.status === 'approved')
        .map((change) => (
          <div key={change.id} style={{ color: 'green' }}>
            ✓ {change.action} approved by {change.approvedBy}
          </div>
        ))}

      <h3>Rejected Changes:</h3>
      {changes
        .filter((c) => c.status === 'rejected')
        .map((change) => (
          <div key={change.id} style={{ color: 'red' }}>
            ✗ {change.action} rejected by {change.rejectedBy}: {change.rejectionReason}
          </div>
        ))}
    </div>
  );
}

// ============================================================================
// Example 8: Batch Preview
// ============================================================================

function BatchPreviewExample() {
  const { startBatch, endBatch, addChange, getAllBatches } = useDryRun();
  const [currentBatch, setCurrentBatch] = useState<BatchPreview | null>(null);

  const createBatchOperation = () => {
    // Start a batch
    const batchId = startBatch('User Migration Batch');

    // Add multiple operations
    addChange({
      type: 'create',
      resource: 'user:1',
      action: 'create_user',
      after: { name: 'Alice', role: 'admin' },
    });

    addChange({
      type: 'create',
      resource: 'user:2',
      action: 'create_user',
      after: { name: 'Bob', role: 'user' },
    });

    addChange({
      type: 'update',
      resource: 'config:users',
      action: 'update_user_count',
      before: { count: 0 },
      after: { count: 2 },
    });

    // End the batch
    const batch = endBatch();
    setCurrentBatch(batch);
  };

  return (
    <div>
      <button onClick={createBatchOperation}>Create Batch Operation</button>

      {currentBatch && (
        <div
          style={{
            padding: '16px',
            margin: '16px 0',
            backgroundColor: '#e3f2fd',
            borderRadius: '4px',
          }}
        >
          <h3>{currentBatch.name}</h3>

          <div>
            <strong>Operations:</strong> {currentBatch.operations.length}
          </div>

          <div>
            <strong>Overall Impact:</strong> {currentBatch.totalImpact.severity}
          </div>

          <div>
            <strong>Conflicts:</strong> {currentBatch.conflicts.length}
          </div>

          <div>
            <strong>Can Execute:</strong>{' '}
            {currentBatch.canExecute ? (
              <span style={{ color: 'green' }}>Yes</span>
            ) : (
              <span style={{ color: 'red' }}>No</span>
            )}
          </div>

          <h4>Operations in Batch:</h4>
          <ul>
            {currentBatch.operations.map((op) => (
              <li key={op.id}>
                {op.action} on {op.resource}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3>All Batches:</h3>
      {getAllBatches().map((batch) => (
        <div key={batch.id} style={{ padding: '8px', backgroundColor: '#f5f5f5' }}>
          {batch.name} - {batch.operations.length} operations
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Example 9: Programmatic Usage (without React)
// ============================================================================

function programmaticUsage() {
  // Enable dry run mode
  dryRunExtension.client.$enableDryRun();

  // Check if enabled
  console.log('Dry run enabled:', dryRunExtension.client.$isDryRunEnabled());

  // Preview an operation
  const changeId = dryRunExtension.client.$previewOperation({
    type: 'create',
    resource: 'user',
    action: 'create_user',
    after: { name: 'Charlie', email: 'charlie@example.com' },
  });

  console.log('Change ID:', changeId);

  // Get pending changes
  const pending = dryRunExtension.client.$getPendingChanges();
  console.log('Pending changes:', pending.length);

  // Get statistics
  const stats = dryRunExtension.client.$getStats();
  console.log('Stats:', stats);

  // Simulate state
  const currentState = { users: [] };
  const simulated = dryRunExtension.client.$simulateState(currentState);
  console.log('Simulated state:', simulated);

  // Get diff
  const diff = dryRunExtension.client.$getChangeDiff({ count: 0 }, { count: 5 });
  console.log('Diff:', diff);

  // Commit changes
  dryRunExtension.client.$commitChanges().then(({ succeeded, failed }) => {
    console.log('Succeeded:', succeeded.length);
    console.log('Failed:', failed.length);
  });

  // Disable dry run
  dryRunExtension.client.$disableDryRun();
}

// ============================================================================
// Example 10: Complete Dashboard
// ============================================================================

function DryRunDashboard() {
  const {
    enabled,
    stats,
    changes,
    enableDryRun,
    disableDryRun,
    commitChanges,
    clearChanges,
  } = useDryRun();

  const handleCommit = async () => {
    const result = await commitChanges();
    console.log('Commit result:', result);
  };

  if (!enabled) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <h2>Dry Run Mode Disabled</h2>
        <button
          onClick={enableDryRun}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Enable Preview Mode
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <DryRunBanner showStats showActions onCommit={handleCommit} onDiscard={clearChanges} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginTop: '24px',
        }}
      >
        <StatCard title="Total Operations" value={stats.totalOperations} color="#2196f3" />
        <StatCard title="Pending" value={stats.pendingOperations} color="#ff9800" />
        <StatCard title="High Impact" value={stats.highImpactOperations} color="#f44336" />
        <StatCard title="Conflicts" value={stats.totalConflicts} color="#9c27b0" />
      </div>

      <div style={{ marginTop: '24px' }}>
        <h3>Pending Changes</h3>
        {changes.length === 0 ? (
          <p style={{ color: '#999' }}>No pending changes</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {changes.map((change) => (
              <ChangeCard key={change.id} change={change} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>{title}</div>
      <div style={{ fontSize: '32px', fontWeight: 'bold', color }}>{value}</div>
    </div>
  );
}

function ChangeCard({ change }: { change: OperationChange }) {
  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{change.action}</div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            {change.type} • {change.resource}
          </div>
        </div>
        <span
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            backgroundColor:
              change.status === 'pending'
                ? '#fff3cd'
                : change.status === 'approved'
                  ? '#d4edda'
                  : '#f8d7da',
            color:
              change.status === 'pending'
                ? '#856404'
                : change.status === 'approved'
                  ? '#155724'
                  : '#721c24',
          }}
        >
          {change.status}
        </span>
      </div>

      {change.impact && (
        <div style={{ marginTop: '12px', fontSize: '14px' }}>
          <strong>Impact:</strong> {change.impact.severity} |{' '}
          <strong>Reversible:</strong> {change.impact.reversible ? 'Yes' : 'No'}
        </div>
      )}

      {change.conflicts && change.conflicts.length > 0 && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: '#ffebee',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          ⚠️ {change.conflicts.length} conflict(s) detected
        </div>
      )}
    </div>
  );
}

// Export all examples
export {
  BasicExample,
  StateSimulationExample,
  ApiPreviewExample,
  DiffVisualizationExample,
  ConflictDetectionExample,
  ImpactAnalysisExample,
  ApprovalWorkflowExample,
  BatchPreviewExample,
  DryRunDashboard,
  programmaticUsage,
};
