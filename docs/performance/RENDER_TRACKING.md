# Render Performance Tracking

> Comprehensive React component render performance tracking for identifying bottlenecks and optimizing render efficiency.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Identifying Bottlenecks](#identifying-bottlenecks)
- [Optimization Patterns](#optimization-patterns)
- [Waterfall Visualization](#waterfall-visualization)
- [Best Practices](#best-practices)

## Overview

The Render Tracker provides deep insights into React rendering performance, helping identify components that may need optimization through re-render detection, render time tracking, and wasted render analysis.

### What It Tracks

- **Component Render Time** - How long each component takes to render
- **Re-render Count** - How many times components re-render
- **Wasted Renders** - Re-renders that don't produce visible changes
- **Render Waterfall** - Hierarchical render timeline visualization
- **Render Reason** - Why a component re-rendered
- **Interaction Timing** - Total time from user action to render complete

## Features

- **Automatic Tracking** - Minimal instrumentation required
- **Production Safe** - Disabled by default in production (configurable)
- **Sampling** - Configurable sample rate for production monitoring
- **Hierarchical Analysis** - Parent-child render relationships
- **Statistical Analysis** - P50, P95 render times, averages
- **Export Capabilities** - JSON export for external tools
- **Zero Runtime Cost** - When disabled, no performance impact

## Quick Start

### Initialize Tracker

```typescript
import { getRenderTracker } from '@/lib/performance';

// Initialize with configuration
const tracker = getRenderTracker({
  debug: import.meta.env.DEV,
  slowThreshold: 16,        // Components slower than 16ms
  wastedThreshold: 2,       // Renders faster than 2ms considered wasted
  enableInProduction: false,
  sampleRate: 0.1,          // 10% sampling in production
});
```

### Track Component Renders

**Option 1: Manual Tracking**

```typescript
import { trackRender } from '@/lib/performance';

function MyComponent({ userId }) {
  const stopTracking = trackRender('MyComponent', {
    props: { userId },
  });

  useEffect(() => {
    return stopTracking;
  }, []);

  return <div>Content</div>;
}
```

**Option 2: HOC**

```typescript
import { withRenderTracking } from '@/lib/performance';

const MyComponent = withRenderTracking(
  function MyComponent({ userId }) {
    return <div>Content</div>;
  },
  'MyComponent'
);
```

**Option 3: React Profiler (Recommended)**

```typescript
import { useRenderMetrics } from '@/lib/performance';

function MyComponent() {
  useRenderMetrics('MyComponent');

  return <div>Content</div>;
}
```

### Generate Reports

```typescript
const tracker = getRenderTracker();

// Generate text report
console.log(tracker.generateReport());

// Get slow components
const slowComponents = tracker.getSlowComponents();

// Get wasted render components
const wastedComponents = tracker.getWastedRenderComponents();

// Get specific component stats
const stats = tracker.getComponentStats('MyComponent');
```

## API Reference

### RenderTracker

Main class for tracking render performance.

```typescript
class RenderTracker {
  // Initialization
  static getInstance(config?: RenderTrackerConfig): RenderTracker;
  static resetInstance(): void;

  // Render tracking
  startRender(
    componentName: string,
    options?: {
      componentId?: string;
      phase?: RenderPhase;
      isInitial?: boolean;
      props?: Record<string, unknown>;
      state?: Record<string, unknown>;
    }
  ): () => RenderEntry | null;

  // Interaction tracking
  startInteraction(name: string): () => RenderInteraction | null;

  // Statistics
  getComponentStats(componentName: string): ComponentRenderStats | null;
  getAllComponentStats(): ComponentRenderStats[];
  getSlowComponents(): ComponentRenderStats[];
  getWastedRenderComponents(): ComponentRenderStats[];

  // Waterfall
  buildWaterfall(options?: {
    interactionId?: string;
    startTime?: number;
    endTime?: number;
  }): RenderWaterfallEntry[];

  exportWaterfallJson(options?: WaterfallOptions): string;

  // History
  getHistory(): RenderEntry[];
  getRecentRenders(count?: number): RenderEntry[];
  getInteractions(): RenderInteraction[];

  // Management
  clear(): void;
  enable(): void;
  disable(): void;
  isTrackingEnabled(): boolean;

  // Reporting
  generateReport(): string;
}
```

### Configuration

```typescript
interface RenderTrackerConfig {
  maxHistorySize?: number;           // Max render entries to store
  slowThreshold?: number;            // Slow component threshold (ms)
  wastedThreshold?: number;          // Wasted render threshold (ms)
  enableInProduction?: boolean;      // Enable in production
  sampleRate?: number;               // Sample rate (0-1)
  onSlowRender?: (entry: RenderEntry) => void;
  onWastedRender?: (entry: RenderEntry) => void;
  debug?: boolean;                   // Debug logging
}
```

### Types

```typescript
type RenderPhase = 'render' | 'commit' | 'layout-effect' | 'effect';

type RenderReason =
  | 'initial'
  | 'props-change'
  | 'state-change'
  | 'context-change'
  | 'parent-render'
  | 'hooks-change'
  | 'force-update'
  | 'unknown';

interface RenderEntry {
  id: string;
  componentName: string;
  componentId: string;
  phase: RenderPhase;
  duration: number;
  startTime: number;
  endTime: number;
  isInitial: boolean;
  reason: RenderReason;
  propsChanged?: string[];
  stateChanged?: string[];
  isWasted: boolean;
  parentId?: string;
  depth: number;
  timestamp: number;
}

interface ComponentRenderStats {
  componentName: string;
  totalRenders: number;
  initialRenders: number;
  reRenders: number;
  wastedRenders: number;
  wastedRenderRate: number;
  totalRenderTime: number;
  averageRenderTime: number;
  minRenderTime: number;
  maxRenderTime: number;
  p50RenderTime: number;
  p95RenderTime: number;
  isSlowComponent: boolean;
  lastRenderTime: number;
  rendersByReason: Record<RenderReason, number>;
}
```

## Identifying Bottlenecks

### Find Slow Components

```typescript
import { getRenderTracker } from '@/lib/performance';

const tracker = getRenderTracker();

// Get all slow components (> slowThreshold)
const slowComponents = tracker.getSlowComponents();

slowComponents.forEach(comp => {
  console.warn(`
    Component: ${comp.componentName}
    Average: ${comp.averageRenderTime.toFixed(2)}ms
    P95: ${comp.p95RenderTime.toFixed(2)}ms
    Total renders: ${comp.totalRenders}
    Total time: ${comp.totalRenderTime.toFixed(2)}ms
  `);
});
```

### Find Wasted Renders

```typescript
// Get components with high wasted render rates
const wastedComponents = tracker.getWastedRenderComponents();

wastedComponents.forEach(comp => {
  if (comp.wastedRenderRate > 30) {
    console.warn(`
      ${comp.componentName} has ${comp.wastedRenderRate.toFixed(1)}% wasted renders
      Wasted: ${comp.wastedRenders}/${comp.totalRenders}
      Consider using React.memo() or useMemo()
    `);
  }
});
```

### Analyze Render Reasons

```typescript
const stats = tracker.getComponentStats('MyComponent');

if (stats) {
  console.log('Render breakdown:');
  Object.entries(stats.rendersByReason).forEach(([reason, count]) => {
    if (count > 0) {
      const percentage = (count / stats.totalRenders) * 100;
      console.log(`  ${reason}: ${count} (${percentage.toFixed(1)}%)`);
    }
  });

  // If mostly 'parent-render', component may need React.memo
  if (stats.rendersByReason['parent-render'] > stats.totalRenders * 0.7) {
    console.warn('Consider wrapping with React.memo()');
  }
}
```

### Track Interaction Performance

```typescript
function handleClick() {
  const tracker = getRenderTracker();
  const endInteraction = tracker.startInteraction('button-click');

  // ... interaction code ...

  setTimeout(() => {
    const interaction = endInteraction();

    if (interaction) {
      console.log(`
        Interaction: ${interaction.name}
        Duration: ${interaction.duration.toFixed(2)}ms
        Renders: ${interaction.renderCount}
        Components: ${interaction.componentCount}
        Wasted: ${interaction.wastedRenderCount}
      `);

      // Warn if too slow
      if (interaction.duration > 100) {
        console.warn('Interaction slower than 100ms!');
      }
    }
  }, 0);
}
```

## Optimization Patterns

### Before Optimization

```typescript
// Problem: Unnecessary re-renders
function UserList({ users, selectedId, onSelect }) {
  return (
    <div>
      {users.map(user => (
        <UserCard
          key={user.id}
          user={user}
          selected={selectedId === user.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

// Tracking shows:
// - UserCard renders 100+ times on each parent update
// - 90% wasted render rate
// - Average render time: 8ms each
// - Total wasted time: 720ms per interaction
```

**After Optimization:**

```typescript
// Solution: Memoize child component
const UserCard = React.memo(function UserCard({ user, selected, onSelect }) {
  return (
    <div onClick={() => onSelect(user.id)}>
      {user.name} {selected && '✓'}
    </div>
  );
});

// Tracking shows:
// - UserCard only renders when selected changes
// - 5% wasted render rate
// - Total wasted time: 40ms per interaction
// - 94% improvement!
```

### Memoization Pattern

```typescript
// Problem: Expensive computations on every render
function Dashboard({ data }) {
  // Recalculates on every render, even if data unchanged
  const processedData = processExpensiveData(data);

  return <Chart data={processedData} />;
}

// Tracking shows:
// - Average render: 45ms
// - Reason: parent-render (90%)
// - Wasted renders: 85%
```

**After Optimization:**

```typescript
// Solution: Use useMemo
function Dashboard({ data }) {
  const processedData = useMemo(
    () => processExpensiveData(data),
    [data]
  );

  return <Chart data={processedData} />;
}

// Tracking shows:
// - Average render: 3ms (93% improvement)
// - Wasted renders: 10%
```

### Callback Optimization

```typescript
// Problem: New function on every render
function Parent() {
  const handleClick = () => {
    doSomething();
  };

  // Child re-renders even though functionality same
  return <Child onClick={handleClick} />;
}

// Tracking shows:
// - Child renders on every Parent render
// - Reason: props-change (onClick reference changes)
// - Wasted renders: 95%
```

**After Optimization:**

```typescript
// Solution: Use useCallback
function Parent() {
  const handleClick = useCallback(() => {
    doSomething();
  }, []);

  return <Child onClick={handleClick} />;
}

// Tracking shows:
// - Child only renders when actually needed
// - Wasted renders: 5%
```

### Context Optimization

```typescript
// Problem: All context consumers re-render on any change
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [user, setUser] = useState(null);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, user, setUser }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Tracking shows:
// - All consumers re-render when user changes
// - Even components only using theme
```

**After Optimization:**

```typescript
// Solution: Split contexts
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const themeValue = useMemo(() => ({ theme, setTheme }), [theme]);

  return (
    <ThemeContext.Provider value={themeValue}>
      {children}
    </ThemeContext.Provider>
  );
}

function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const userValue = useMemo(() => ({ user, setUser }), [user]);

  return (
    <UserContext.Provider value={userValue}>
      {children}
    </UserContext.Provider>
  );
}

// Tracking shows:
// - Consumers only re-render for their specific context
// - Wasted renders reduced by 80%
```

## Waterfall Visualization

### Generate Waterfall Data

```typescript
const tracker = getRenderTracker();

// Build waterfall for an interaction
const waterfall = tracker.buildWaterfall({
  interactionId: 'button-click-123',
});

// Or for a time range
const waterfall = tracker.buildWaterfall({
  startTime: performance.now() - 1000,
  endTime: performance.now(),
});

// Export as JSON for visualization tools
const json = tracker.exportWaterfallJson();
console.log(json);
```

### Waterfall Structure

```typescript
interface RenderWaterfallEntry {
  id: string;
  componentName: string;
  startOffset: number;  // ms from start
  duration: number;     // ms
  depth: number;        // Nesting level
  phase: RenderPhase;
  isWasted: boolean;
  children: RenderWaterfallEntry[];
}
```

**Example Waterfall:**

```
Time (ms)  Component         Duration  Wasted
0          App               45ms
├─ 2       Header            3ms
├─ 5       Content           38ms
│  ├─ 7    Sidebar           8ms
│  └─ 15   MainArea          25ms
│     ├─ 17  List            20ms
│     │  └─ 19 ListItem      1ms       ✓ (wasted)
│     └─ 37  Footer          3ms
└─ 43      StatusBar         2ms       ✓ (wasted)
```

### Visualize in Browser

```tsx
function RenderWaterfall({ interactionId }) {
  const tracker = getRenderTracker();
  const waterfall = tracker.buildWaterfall({ interactionId });

  return (
    <div className="waterfall">
      {waterfall.map(entry => (
        <WaterfallEntry key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

function WaterfallEntry({ entry, depth = 0 }) {
  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div
        className={entry.isWasted ? 'wasted' : ''}
        style={{ width: entry.duration * 10 }}
      >
        {entry.componentName} ({entry.duration.toFixed(1)}ms)
      </div>
      {entry.children.map(child => (
        <WaterfallEntry key={child.id} entry={child} depth={depth + 1} />
      ))}
    </div>
  );
}
```

## Best Practices

### 1. Track Critical Paths

```typescript
// Track user interactions
function handleSubmit() {
  const tracker = getRenderTracker();
  const end = tracker.startInteraction('form-submit');

  // ... submit logic ...

  setTimeout(() => {
    const interaction = end();
    if (interaction && interaction.duration > 200) {
      // Log slow interactions
      analytics.track('slow-interaction', {
        name: interaction.name,
        duration: interaction.duration,
        renders: interaction.renderCount,
      });
    }
  }, 0);
}
```

### 2. Set Realistic Thresholds

```typescript
// Different thresholds for different component types
const tracker = getRenderTracker({
  slowThreshold: 16,  // 60fps budget
  wastedThreshold: 2,

  onSlowRender: (entry) => {
    // Alert only for critical components
    if (entry.componentName.includes('Critical')) {
      console.error('Critical component slow!', entry);
    }
  },
});
```

### 3. Sample in Production

```typescript
const tracker = getRenderTracker({
  enableInProduction: true,
  sampleRate: 0.1,  // 10% of users
  onSlowRender: (entry) => {
    // Send to analytics
    analytics.track('slow-render', {
      component: entry.componentName,
      duration: entry.duration,
      reason: entry.reason,
    });
  },
});
```

### 4. Regular Audits

```typescript
// Development script to audit renders
function auditRenders() {
  const tracker = getRenderTracker();

  // Wait for renders to accumulate
  setTimeout(() => {
    const allStats = tracker.getAllComponentStats();

    console.log('\n=== RENDER AUDIT ===\n');

    // Check for slow components
    const slow = allStats.filter(s => s.isSlowComponent);
    if (slow.length > 0) {
      console.warn(`⚠️  ${slow.length} slow components found`);
      slow.forEach(s => console.log(`  - ${s.componentName}`));
    }

    // Check for wasted renders
    const wasted = allStats.filter(s => s.wastedRenderRate > 50);
    if (wasted.length > 0) {
      console.warn(`⚠️  ${wasted.length} components with >50% wasted renders`);
      wasted.forEach(s =>
        console.log(`  - ${s.componentName} (${s.wastedRenderRate.toFixed(1)}%)`)
      );
    }

    // Generate full report
    console.log(tracker.generateReport());
  }, 30000); // After 30 seconds
}
```

### 5. Use with React DevTools

```typescript
// Enable production profiling
const tracker = getRenderTracker({
  enableInProduction: true,
  sampleRate: 1.0,
});

// In React DevTools Profiler:
// 1. Start recording
// 2. Perform interaction
// 3. Stop recording
// 4. Compare with tracker data
const stats = tracker.getRecentRenders(100);
```

### 6. Clear History Regularly

```typescript
// Clear on route change to prevent memory growth
useEffect(() => {
  return () => {
    const tracker = getRenderTracker();
    if (tracker.getHistory().length > 1000) {
      tracker.clear();
    }
  };
}, [location]);
```

### 7. Export for Analysis

```typescript
// Export data for offline analysis
function exportRenderData() {
  const tracker = getRenderTracker();

  const data = {
    stats: tracker.getAllComponentStats(),
    history: tracker.getHistory(),
    interactions: tracker.getInteractions(),
    waterfall: tracker.buildWaterfall(),
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `render-data-${Date.now()}.json`;
  a.click();
}
```

## Performance Impact

The render tracker itself has minimal performance impact:

```typescript
const overhead = {
  perRender: 0.1,      // 0.1ms overhead per tracked render
  memory: 50,          // ~50 KB for 1000 entries
  production: 0,       // Zero when disabled
};

// With sampling in production
const sampledOverhead = {
  perRender: 0.01,     // 0.01ms average (10% sample rate)
  memory: 5,           // ~5 KB average
};
```

## Related Documentation

- [Performance Observatory](./OBSERVATORY.md)
- [Optimization Strategies](./README.md#optimization-strategies)
- [Configuration Reference](./CONFIG.md)
