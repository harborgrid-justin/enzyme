# Dry Run Extension - Quick Start Guide

Get started with the Enterprise Dry Run Extension in 5 minutes!

## 🚀 Installation

```bash
# The extension is already included in the enzyme library
# No additional installation needed
```

## 📦 Import

```typescript
// React usage
import {
  DryRunProvider,
  DryRunBanner,
  useDryRun
} from '@enzyme/extensions/built-in';

// Non-React usage
import { dryRunExtension } from '@enzyme/extensions/built-in';
```

## 🎯 Quick Start (React)

### Step 1: Wrap Your App

```tsx
import { DryRunProvider, DryRunBanner } from '@enzyme/extensions/built-in';

function App() {
  return (
    <DryRunProvider>
      <DryRunBanner showStats showActions />
      <YourApp />
    </DryRunProvider>
  );
}
```

### Step 2: Use the Hook

```tsx
import { useDryRun } from '@enzyme/extensions/built-in';

function MyComponent() {
  const { enabled, enableDryRun, addChange, commitChanges } = useDryRun();

  const handleCreate = () => {
    if (enabled) {
      // Preview the operation
      addChange({
        type: 'create',
        resource: 'user',
        action: 'create_user',
        after: { name: 'John Doe', email: 'john@example.com' }
      });
    } else {
      // Actually create
      createUser({ name: 'John Doe', email: 'john@example.com' });
    }
  };

  return (
    <div>
      <button onClick={enableDryRun}>Enable Preview</button>
      <button onClick={handleCreate}>Create User</button>
      <button onClick={commitChanges}>Commit Changes</button>
    </div>
  );
}
```

## 🔧 Quick Start (Non-React)

```typescript
import { dryRunExtension } from '@enzyme/extensions/built-in';

// Enable dry run mode
dryRunExtension.client.$enableDryRun();

// Preview an operation
const changeId = dryRunExtension.client.$previewOperation({
  type: 'create',
  resource: 'user',
  action: 'create_user',
  after: { name: 'Jane Doe', email: 'jane@example.com' }
});

// Get pending changes
const pending = dryRunExtension.client.$getPendingChanges();
console.log(`${pending.length} pending changes`);

// Check statistics
const stats = dryRunExtension.client.$getStats();
console.log('Stats:', stats);

// Commit all changes
const result = await dryRunExtension.client.$commitChanges();
console.log(`Success: ${result.succeeded.length}, Failed: ${result.failed.length}`);

// Disable dry run mode
dryRunExtension.client.$disableDryRun();
```

## 🎨 Common Patterns

### Pattern 1: Simple Preview

```typescript
const { enabled, enableDryRun, addChange, commitChanges } = useDryRun();

// Enable preview mode
enableDryRun();

// Add operations
addChange({ type: 'create', resource: 'item', action: 'create' });

// Commit when ready
await commitChanges();
```

### Pattern 2: With Approval

```typescript
const { addChange, approveChange, commitChanges } = useDryRun();

// Configure
updateConfig({ requireApproval: true });

// Add operation
const id = addChange({ type: 'delete', resource: 'data', action: 'delete' });

// Approve it
approveChange(id, 'admin@company.com');

// Commit
await commitChanges();
```

### Pattern 3: Batch Operations

```typescript
const { startBatch, addChange, endBatch, commitChanges } = useDryRun();

// Start a batch
startBatch('Database Migration');

// Add multiple operations
addChange({ ... });
addChange({ ... });
addChange({ ... });

// End batch and review
const batch = endBatch();
console.log('Can execute:', batch.canExecute);

// Commit if safe
if (batch.canExecute) {
  await commitChanges();
}
```

### Pattern 4: Impact Analysis

```typescript
const { addChange, changes } = useDryRun();

// Add a high-impact operation
const id = addChange({
  type: 'database_delete',
  resource: 'production_db',
  action: 'drop_table'
});

// Check impact
const change = changes.find(c => c.id === id);
if (change.impact?.severity === 'critical') {
  console.warn('CRITICAL OPERATION!');
  console.log('Risks:', change.impact.risks);
  console.log('Recommendations:', change.impact.recommendations);
}
```

### Pattern 5: State Simulation

```typescript
const { simulateState, addChange } = useDryRun();

const currentState = {
  users: [{ id: 1, name: 'Alice' }],
  count: 1
};

// Preview what state will look like after changes
addChange({
  type: 'state_change',
  resource: 'users',
  action: 'add_user',
  before: currentState,
  after: {
    users: [...currentState.users, { id: 2, name: 'Bob' }],
    count: 2
  }
});

const simulatedState = simulateState(currentState);
console.log('State after changes:', simulatedState);
```

## 🔍 Checking Results

### Get Statistics

```typescript
const stats = dryRunExtension.client.$getStats();

console.log(`
  Total Operations: ${stats.totalOperations}
  Pending: ${stats.pendingOperations}
  Approved: ${stats.approvedOperations}
  High Impact: ${stats.highImpactOperations}
  Conflicts: ${stats.totalConflicts}
`);
```

### Get Pending Changes

```typescript
const pending = dryRunExtension.client.$getPendingChanges();

pending.forEach(change => {
  console.log(`${change.action} on ${change.resource}`);
  if (change.impact) {
    console.log(`  Severity: ${change.impact.severity}`);
  }
  if (change.conflicts?.length > 0) {
    console.log(`  ⚠️ ${change.conflicts.length} conflicts`);
  }
});
```

### View Diffs

```typescript
const before = { name: 'John', age: 30 };
const after = { name: 'Jane', age: 30 };

const diff = dryRunExtension.client.$getChangeDiff(before, after);

console.log('Added:', diff.added);
console.log('Removed:', diff.removed);
console.log('Modified:', diff.modified);
```

## ⚙️ Configuration

### Basic Configuration

```tsx
<DryRunProvider
  config={{
    requireApproval: false,
    autoDetectConflicts: true,
    enableImpactAnalysis: true,
    maxPendingChanges: 100
  }}
>
  {/* Your app */}
</DryRunProvider>
```

### Production Configuration

```tsx
<DryRunProvider
  config={{
    requireApproval: true,
    approvers: ['admin@company.com', 'manager@company.com'],
    autoDetectConflicts: true,
    enableImpactAnalysis: true,
    blockedOperations: ['database_delete'],
    maxPendingChanges: 50,
    notificationUrl: 'https://api.company.com/approvals'
  }}
>
  {/* Your app */}
</DryRunProvider>
```

## 🎨 UI Components

### DryRunBanner

```tsx
<DryRunBanner
  showStats={true}
  showActions={true}
  onCommit={handleCommit}
  onDiscard={handleDiscard}
  className="my-custom-banner"
/>
```

### Custom Dashboard

```tsx
function MyDashboard() {
  const { enabled, stats, changes, commitChanges } = useDryRun();

  return (
    <div>
      <h2>Preview Mode {enabled ? 'ON' : 'OFF'}</h2>
      <div>Total: {stats.totalOperations}</div>
      <div>High Impact: {stats.highImpactOperations}</div>

      <ul>
        {changes.map(change => (
          <li key={change.id}>
            {change.action} - {change.status}
          </li>
        ))}
      </ul>

      <button onClick={commitChanges}>Commit All</button>
    </div>
  );
}
```

## 📚 Operation Types

```typescript
type OperationType =
  | 'create'           // Create new resource (low impact)
  | 'update'           // Update existing (medium impact)
  | 'delete'           // Delete resource (high impact)
  | 'api_request'      // External API call (medium impact)
  | 'state_change'     // State modification (low-medium)
  | 'file_write'       // File system write (low-medium)
  | 'file_delete'      // File deletion (high impact)
  | 'database_write'   // DB write (medium impact)
  | 'database_delete'; // DB delete (high-critical impact)
```

## 🚨 Common Pitfalls

### ❌ Forgetting to Enable

```typescript
// BAD: Dry run not enabled
addChange({ ... }); // Throws error!

// GOOD: Enable first
enableDryRun();
addChange({ ... }); // Works!
```

### ❌ Not Checking Approval Status

```typescript
// BAD: Trying to commit without approval
updateConfig({ requireApproval: true });
addChange({ ... });
await commitChanges(); // Nothing happens!

// GOOD: Approve first
const id = addChange({ ... });
approveChange(id, 'admin@company.com');
await commitChanges(); // Now it works!
```

### ❌ Exceeding Max Changes

```typescript
// BAD: Adding too many changes
updateConfig({ maxPendingChanges: 2 });
addChange({ ... }); // OK
addChange({ ... }); // OK
addChange({ ... }); // Error!

// GOOD: Clear or commit regularly
commitChanges(); // Clear pending
addChange({ ... }); // Now it works!
```

## 💡 Pro Tips

### Tip 1: Use Batches for Related Operations

```typescript
startBatch('User Onboarding');
addChange({ type: 'create', resource: 'user', ... });
addChange({ type: 'create', resource: 'profile', ... });
addChange({ type: 'api_request', resource: '/send-welcome', ... });
const batch = endBatch();
```

### Tip 2: Check Impact Before Committing

```typescript
const highImpact = changes.filter(
  c => c.impact?.severity === 'high' || c.impact?.severity === 'critical'
);

if (highImpact.length > 0) {
  console.warn('High impact operations detected!');
  // Maybe require additional approval
}
```

### Tip 3: Use Filters When Committing

```typescript
// Only commit low-risk changes
await commitChanges(change =>
  change.impact?.severity === 'low'
);
```

### Tip 4: Subscribe to Changes

```typescript
const unsubscribe = manager.subscribe(changes => {
  console.log('Changes updated:', changes.length);
});

// Later...
unsubscribe();
```

## 📖 Next Steps

1. **Read Full Documentation**: `DRY_RUN_EXTENSION.md`
2. **View Examples**: `dry-run.example.tsx`
3. **Run Tests**: `npm test dry-run.test.ts`
4. **Check Implementation**: `dry-run.ts`

## 🆘 Need Help?

- **Documentation**: See `DRY_RUN_EXTENSION.md` for complete reference
- **Examples**: See `dry-run.example.tsx` for 10 detailed examples
- **Tests**: See `__tests__/dry-run.test.ts` for usage patterns
- **Issues**: Open an issue on GitHub

## ✨ Happy Previewing!

Remember: With great power comes great responsibility. Use dry run mode for all sensitive operations!

---

**Quick Reference Card**

```typescript
// Enable/Disable
$enableDryRun()
$disableDryRun()
$isDryRunEnabled()

// Preview
$previewOperation({ type, resource, action, after })
$getPendingChanges()
$simulateState(currentState)
$getChangeDiff(before, after)

// Approval
$approveChange(id, approver)
$rejectChange(id, rejector, reason)

// Batch
$startBatch(name)
$endBatch()
$getBatch(id)

// Execute
$commitChanges(filter?)
$rollbackChange(id)
$discardChanges()

// Stats
$getStats()
$updateConfig(config)
```
