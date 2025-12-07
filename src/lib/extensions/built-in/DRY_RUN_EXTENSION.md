# Enterprise Dry Run Extension

## Overview

The Dry Run Extension is a comprehensive preview and simulation system for the Enzyme library that allows you to preview, analyze, and validate operations before they execute. This is critical for sensitive operations and production environments.

**Version**: 2.0.0
**Status**: Production Ready
**Location**: `/home/user/enzyme/src/lib/extensions/built-in/dry-run.ts`

## Features

### 1. Operation Preview
Preview what operations will do before executing them. Every operation is tracked with detailed metadata.

```typescript
const changeId = dryRunExtension.client.$previewOperation({
  type: 'create',
  resource: 'user',
  action: 'create_user',
  after: { name: 'John Doe', email: 'john@example.com' },
  metadata: { source: 'user_form' }
});
```

### 2. State Simulation
Simulate state changes without committing them. See what your application state will look like after changes.

```typescript
const currentState = { users: [], count: 0 };
const simulatedState = dryRunExtension.client.$simulateState(currentState);
// Preview the state after all pending changes
```

### 3. API Request Preview
Preview API calls without sending them. Perfect for testing and debugging.

```typescript
if (dryRunEnabled) {
  // Preview the API call
  addChange({
    type: 'api_request',
    resource: '/api/users',
    action: 'POST',
    after: userData,
    metadata: { method: 'POST', headers: { ... } }
  });
} else {
  // Actually make the call
  await fetch('/api/users', { ... });
}
```

### 4. Change Summary
Get a comprehensive summary of all pending changes with statistics.

```typescript
const stats = dryRunExtension.client.$getStats();
console.log(`
  Total Operations: ${stats.totalOperations}
  Pending: ${stats.pendingOperations}
  High Impact: ${stats.highImpactOperations}
  Conflicts: ${stats.totalConflicts}
`);
```

### 5. Rollback Support
Revert simulated changes that haven't been committed yet.

```typescript
await dryRunExtension.client.$rollbackChange(changeId);
```

### 6. Diff Visualization
Show before/after diffs of changes with detailed comparison.

```typescript
const diff = dryRunExtension.client.$getChangeDiff(beforeState, afterState);

// diff.added - fields that were added
// diff.removed - fields that were removed
// diff.modified - fields that were changed
```

### 7. Conflict Detection
Automatically detect potential conflicts between operations.

```typescript
const change = {
  type: 'update',
  resource: 'user:123',
  action: 'update_user',
  // ... other properties
};

// Conflicts are automatically detected
// - concurrent_modification: Multiple operations on same resource
// - dependency_missing: Required dependencies not available
// - resource_exists: Resource already exists
// - permission_denied: Insufficient permissions
// - validation_failed: Validation errors
```

### 8. Impact Analysis
Analyze the impact of operations before executing them.

```typescript
const change = addChange({
  type: 'database_delete',
  resource: 'users_table',
  action: 'drop_table'
});

// Automatically includes impact analysis:
// - severity: 'low' | 'medium' | 'high' | 'critical'
// - affectedResources: string[]
// - risks: string[]
// - recommendations: string[]
// - reversible: boolean
```

### 9. Approval Workflow
Require approval for sensitive operations before execution.

```typescript
// Configure approval requirement
updateConfig({
  requireApproval: true,
  approvers: ['admin@example.com', 'manager@example.com']
});

// Approve a change
approveChange(changeId, 'admin@example.com');

// Reject a change
rejectChange(changeId, 'admin@example.com', 'Too risky for production');
```

### 10. Batch Preview
Preview multiple operations together as a batch.

```typescript
// Start a batch
const batchId = startBatch('User Migration');

// Add operations to the batch
addChange({ ... });
addChange({ ... });
addChange({ ... });

// End the batch and get analysis
const batch = endBatch();

console.log(`
  Batch: ${batch.name}
  Operations: ${batch.operations.length}
  Overall Impact: ${batch.totalImpact.severity}
  Conflicts: ${batch.conflicts.length}
  Can Execute: ${batch.canExecute}
`);
```

## Installation & Setup

### React Integration

```tsx
import { DryRunProvider, DryRunBanner, useDryRun } from '@enzyme/extensions/built-in';

function App() {
  return (
    <DryRunProvider
      config={{
        requireApproval: false,
        autoDetectConflicts: true,
        enableImpactAnalysis: true,
        enableDiffVisualization: true,
        maxPendingChanges: 100
      }}
    >
      <DryRunBanner showStats showActions />
      <YourApplication />
    </DryRunProvider>
  );
}

function YourComponent() {
  const {
    enabled,
    enableDryRun,
    addChange,
    getPendingChanges,
    commitChanges
  } = useDryRun();

  // Use the dry run functionality
}
```

### Programmatic Usage (Non-React)

```typescript
import { dryRunExtension } from '@enzyme/extensions/built-in';

// Enable dry run mode
dryRunExtension.client.$enableDryRun();

// Preview operations
const changeId = dryRunExtension.client.$previewOperation({
  type: 'create',
  resource: 'user',
  action: 'create_user',
  after: { name: 'Jane Doe' }
});

// Get pending changes
const pending = dryRunExtension.client.$getPendingChanges();

// Commit changes
const result = await dryRunExtension.client.$commitChanges();
console.log(`Succeeded: ${result.succeeded.length}, Failed: ${result.failed.length}`);

// Disable dry run
dryRunExtension.client.$disableDryRun();
```

## Configuration Options

```typescript
interface DryRunConfig {
  // Enable/disable dry run mode
  enabled: boolean;

  // Require approval before committing changes
  requireApproval: boolean;

  // Automatically detect conflicts
  autoDetectConflicts: boolean;

  // Enable impact analysis for all operations
  enableImpactAnalysis: boolean;

  // Enable diff visualization
  enableDiffVisualization: boolean;

  // Maximum number of pending changes allowed
  maxPendingChanges: number;

  // Operations that are allowed in dry run mode
  allowedOperations?: OperationType[];

  // Operations that are blocked in dry run mode
  blockedOperations?: OperationType[];

  // List of users who can approve changes
  approvers?: string[];

  // URL to send notifications for approval requests
  notificationUrl?: string;
}
```

## Operation Types

```typescript
type OperationType =
  | 'create'           // Create a new resource
  | 'update'           // Update an existing resource
  | 'delete'           // Delete a resource (high impact)
  | 'api_request'      // External API call
  | 'state_change'     // Application state change
  | 'file_write'       // Write to filesystem
  | 'file_delete'      // Delete from filesystem
  | 'database_write'   // Database write operation
  | 'database_delete'; // Database delete operation (high impact)
```

## API Reference

### Client Methods

#### State Management
- `$enableDryRun()` - Enable dry run mode
- `$disableDryRun()` - Disable dry run mode
- `$isDryRunEnabled()` - Check if dry run is enabled
- `$updateConfig(config)` - Update configuration
- `$getConfig()` - Get current configuration

#### Change Management
- `$previewOperation(operation)` - Preview a single operation
- `$getPendingChanges()` - Get all pending changes
- `$discardChanges()` - Discard all pending changes
- `$getStats()` - Get statistics about tracked operations

#### State Simulation
- `$simulateState(currentState, changes?)` - Simulate state changes

#### Diff Operations
- `$getChangeDiff(before, after)` - Get diff between two states

#### Approval Workflow
- `$approveChange(id, approver)` - Approve a change
- `$rejectChange(id, rejector, reason)` - Reject a change

#### Batch Operations
- `$startBatch(name)` - Start a batch operation
- `$endBatch()` - End current batch
- `$getBatch(id)` - Get batch by ID
- `$getAllBatches()` - Get all batches

#### Execution
- `$commitChanges(filter?)` - Execute approved changes
- `$rollbackChange(id)` - Rollback a specific change

### React Hook API

The `useDryRun()` hook provides the same methods as the client API, plus:

```typescript
const {
  enabled,          // Current enabled state
  config,           // Current configuration
  changes,          // Array of all changes
  stats,            // Current statistics

  // All client methods are also available
  enableDryRun,
  disableDryRun,
  addChange,
  getPendingChanges,
  // ... etc
} = useDryRun();
```

## Visual Components

### DryRunBanner

A visual banner that shows when dry run mode is active.

```tsx
<DryRunBanner
  showStats={true}        // Show statistics
  showActions={true}      // Show action buttons
  onCommit={() => {}}     // Callback after commit
  onDiscard={() => {}}    // Callback after discard
  className="custom-class"
  style={{ ... }}
/>
```

## Best Practices

### 1. Use for Sensitive Operations

Always enable dry run mode for operations that:
- Modify production data
- Delete resources
- Make external API calls
- Change critical configuration

### 2. Enable Impact Analysis

```typescript
updateConfig({
  enableImpactAnalysis: true,
  autoDetectConflicts: true
});
```

### 3. Require Approval for High-Impact Changes

```typescript
updateConfig({
  requireApproval: true,
  approvers: ['admin@company.com']
});
```

### 4. Use Batches for Multiple Related Operations

```typescript
startBatch('Database Migration');
// Add all migration operations
addChange({ ... });
addChange({ ... });
const batch = endBatch();

if (batch.canExecute) {
  await commitChanges();
}
```

### 5. Check Impact Before Committing

```typescript
const pending = getPendingChanges();
const highImpact = pending.filter(c =>
  c.impact?.severity === 'high' || c.impact?.severity === 'critical'
);

if (highImpact.length > 0) {
  console.warn('High impact operations detected. Review carefully.');
}
```

## Examples

See comprehensive examples in `/home/user/enzyme/src/lib/extensions/built-in/dry-run.example.tsx`:

1. **BasicExample** - Simple dry run setup
2. **StateSimulationExample** - State simulation
3. **ApiPreviewExample** - API request preview
4. **DiffVisualizationExample** - Before/after diffs
5. **ConflictDetectionExample** - Conflict detection
6. **ImpactAnalysisExample** - Impact analysis
7. **ApprovalWorkflowExample** - Approval workflow
8. **BatchPreviewExample** - Batch operations
9. **ProgrammaticUsage** - Non-React usage
10. **DryRunDashboard** - Complete dashboard UI

## Architecture

### State Management

The extension uses a centralized `DryRunStateManager` class that:
- Tracks all operation changes
- Performs impact analysis
- Detects conflicts
- Manages approval workflow
- Handles batch operations

### React Integration

- **Context**: `DryRunContext` provides state to components
- **Provider**: `DryRunProvider` wraps your app
- **Hook**: `useDryRun()` accesses the state
- **Components**: Pre-built UI components

### Programmatic Access

The `dryRunExtension.client` provides all methods for non-React usage.

## Performance Considerations

- Changes are stored in memory (Map structures)
- Maximum of 100 pending changes by default (configurable)
- Impact analysis is lazy (only computed when needed)
- Conflict detection is O(n) where n = number of changes
- State simulation uses JSON deep clone (may be slow for large states)

## Security Considerations

1. **Approval Workflow**: Implement proper authentication for approvers
2. **Sensitive Data**: Be careful logging sensitive data in dry run mode
3. **Notification URL**: Secure the notification endpoint
4. **State Simulation**: Ensure simulated state doesn't leak to production

## Troubleshooting

### "Maximum pending changes reached"

Increase the limit:
```typescript
updateConfig({ maxPendingChanges: 200 });
```

### "Operation type not allowed"

Check your configuration:
```typescript
updateConfig({
  allowedOperations: ['create', 'update', 'delete']
});
```

### "User not authorized to approve"

Add the user to approvers:
```typescript
updateConfig({
  approvers: ['user@example.com']
});
```

## Future Enhancements

- [ ] Persistent storage for changes (IndexedDB)
- [ ] Time-travel debugging
- [ ] Change replay functionality
- [ ] Integration with Redux DevTools
- [ ] WebSocket notifications for approvals
- [ ] Advanced conflict resolution strategies
- [ ] Machine learning for impact prediction
- [ ] Export/import change sets
- [ ] Collaborative review features
- [ ] Integration with external approval systems

## Support

For issues, questions, or contributions:
- GitHub Issues: [enzyme/issues](https://github.com/yourusername/enzyme/issues)
- Documentation: [enzyme.dev/docs/extensions/dry-run](https://enzyme.dev/docs/extensions/dry-run)
- Examples: `/home/user/enzyme/src/lib/extensions/built-in/dry-run.example.tsx`

## License

Same as Enzyme library license.

---

**Built with ❤️ for Enterprise Applications**
