# Enzyme VS Code Extension - Debug Module

## Overview
Complete state visualization and debugging tools for the Enzyme React Framework VS Code extension.

## Statistics
- **Total Files**: 18 TypeScript files
- **Total Lines**: ~7,591 lines of code
- **Structure**: Organized into 6 logical modules

## Module Structure

### 1. Core Debugging (`/debug/`)
- **state-debugger.ts** (330 lines) - Main StateDebugger class with DevTools integration, time-travel, snapshots
- **state-bridge.ts** (384 lines) - WebSocket bridge for connecting to running apps
- **action-recorder.ts** (409 lines) - Record and replay dispatched actions with filtering
- **state-diff.ts** (491 lines) - Deep state diff computation with visual representation

### 2. Breakpoints (`/debug/breakpoints/`)
- **state-breakpoint-provider.ts** (334 lines) - Conditional breakpoints on state changes
- **route-breakpoint-provider.ts** (303 lines) - Breakpoints on route navigation and lifecycle

### 3. Watch (`/debug/watch/`)
- **state-watch-provider.ts** (326 lines) - Watch expressions for state paths with real-time updates

### 4. Performance Monitoring (`/debug/`)
- **render-tracker.ts** (490 lines) - Track component renders, detect unnecessary renders
- **performance-profiler.ts** (407 lines) - Profile renders, state updates, API calls with flame graphs
- **network-inspector.ts** (556 lines) - Intercept and mock API requests, timing analysis

### 5. Debug Adapters (`/debug/debug-adapter/`)
- **enzyme-debug-adapter.ts** (343 lines) - Custom debug adapter for Enzyme
- **enzyme-debug-session.ts** (203 lines) - Debug session management
- **descriptors.ts** (175 lines) - Debug adapter descriptor factory

### 6. Visualizations (`/debug/visualizations/`)
- **state-tree-view.ts** (524 lines) - Interactive state tree with expand/collapse, edit, search
- **action-timeline.ts** (393 lines) - Visual timeline of actions with zoom, pan, filtering
- **dependency-graph.ts** (671 lines) - Store dependency graph with circular detection, force-directed layout

### 7. Snapshots (`/debug/snapshots/`)
- **snapshot-manager.ts** (424 lines) - Save, restore, compare state snapshots with tagging

### 8. Main Export (`/debug/`)
- **index.ts** (428 lines) - Central export hub with `registerDebugFeatures()` function

## Key Features

### State Management
- ✅ Zustand DevTools integration
- ✅ State snapshot capture and restore
- ✅ State diff computation with visualization
- ✅ Time-travel debugging
- ✅ Action history and replay
- ✅ Multi-tab sync support

### Breakpoints
- ✅ Conditional state breakpoints (equals, changed, contains, etc.)
- ✅ Route navigation breakpoints
- ✅ Guard and loader execution breakpoints
- ✅ Custom hit conditions

### Performance
- ✅ Component render tracking
- ✅ Unnecessary render detection
- ✅ Performance profiling with flame graphs
- ✅ Network request interception
- ✅ Request mocking and error simulation
- ✅ Bottleneck detection

### Visualizations
- ✅ State tree view with edit capabilities
- ✅ Action timeline with zoom/pan
- ✅ Dependency graph with layout algorithms
- ✅ Circular dependency detection

### Developer Experience
- ✅ TypeScript-first with full type safety
- ✅ Production-ready error handling
- ✅ Global singleton instances
- ✅ Export/import capabilities
- ✅ Comprehensive filtering and search

## Usage Example

```typescript
import { registerDebugFeatures } from './debug';

// Initialize all debug features
const debugFeatures = await registerDebugFeatures({
  enableStateDebug: true,
  enableActionRecording: true,
  enableRenderTracking: true,
  enableProfiling: true,
  enableNetworkInspection: true,
  enableBreakpoints: true,
  enableWatch: true,
  enableSnapshots: true,
  bridge: {
    url: 'ws://localhost:3001',
    autoConnect: true,
  },
  autoStart: true,
});

// Access individual tools
const debugger = debugFeatures.getDebugger();
const recorder = debugFeatures.getRecorder();
const tracker = debugFeatures.getRenderTracker();
const profiler = debugFeatures.getProfiler();
const inspector = debugFeatures.getNetworkInspector();
```

## Integration Points

### Enzyme State Management
- Works seamlessly with `createAppStore()` and `createSlice()`
- Automatic Immer compatibility
- DevTools action naming support

### VS Code Debug Protocol
- Custom debug adapter for Enzyme
- Variable scopes for state inspection
- Stack frame enhancement
- Expression evaluation in state context

### WebSocket Bridge
- Real-time state sync with running apps
- Bidirectional communication
- Heartbeat and auto-reconnect
- Multiple session support

## Architecture Highlights

### Design Patterns
- **Singleton Pattern**: Global instances for easy access
- **Factory Pattern**: Debug adapter descriptors
- **Observer Pattern**: Callbacks for breakpoints, watches
- **Strategy Pattern**: Pluggable layouts for dependency graph

### Data Structures
- Efficient Map/Set usage for O(1) lookups
- Tree structures for state visualization
- Graph structures for dependencies
- Time-series data for timelines

### Performance Optimizations
- Lazy loading of child nodes in tree view
- Sampling support in profiler
- Diff computation with max depth limits
- Circular reference detection

## Future Enhancements
- [ ] Redux DevTools Extension protocol support
- [ ] React DevTools integration
- [ ] Chrome DevTools Protocol bridge
- [ ] State mutation tracking
- [ ] Memory leak detection
- [ ] Bundle size analyzer
- [ ] Code coverage integration

## License
Same as Enzyme framework
