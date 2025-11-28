/**
 * @file Fast Refresh Analysis and Refactoring Guide
 * @description Analysis of code that needs to be extracted for Fast Refresh compliance
 */

# Fast Refresh Compliance Analysis

## What is Fast Refresh?

Fast Refresh is React's hot module replacement (HMR) implementation that preserves component state during development. For it to work correctly, modules must follow specific rules:

### Fast Refresh Rules

1. **Component exports must be PascalCase**
   - ✅ `export function MyComponent() { }`
   - ❌ `export function myComponent() { }`

2. **Contexts must be in separate files from components**
   - ✅ Separate files: `MyContext.ts` and `MyProvider.tsx`
   - ❌ Together: `createContext()` and component in same file

3. **No module-level side effects that depend on React state**
   - ✅ Side effects in useEffect
   - ❌ Global event listeners at module level

4. **Custom hooks should be in separate files**
   - ✅ `useMyHook.ts` separate from `MyComponent.tsx`
   - ❌ Hook and component in same file (optional but recommended)

5. **Default exports must export components**
   - ✅ `export default function MyComponent() { }`
   - ❌ `export default myUtilFunction`

## Files Requiring Refactoring

### High Priority - Breaking Fast Refresh

#### 1. Context Definitions Mixed with Components

**File**: `reuse/templates/react/src/lib/ux/progressive-enhancement.ts`
- **Issue**: `ProgressiveEnhancementContext` created and `ProgressiveEnhancementProvider` component in same file
- **Fix**: Extract context to `contexts/ProgressiveEnhancementContext.ts`
- **Lines**: 267 (context), 283-434 (provider)

**File**: `reuse/templates/react/src/lib/ux/loading-states.tsx`
- **Issue**: `LoadingContext` created and `LoadingProvider` component in same file
- **Fix**: Extract context to `contexts/LoadingContext.ts`
- **Lines**: 153 (context), 158-238 (provider)

**File**: `reuse/templates/react/src/lib/theme/ThemeProvider.tsx`
- **Issue**: `ThemeContext` and `ThemeProvider` in same file
- **Fix**: Extract context to `contexts/ThemeContext.ts`

**File**: `reuse/templates/react/src/lib/security/SecurityProvider.tsx`
- **Issue**: `SecurityContext` and `SecurityProvider` in same file
- **Fix**: Extract context to `contexts/SecurityContext.ts`

**File**: `reuse/templates/react/src/lib/streaming/StreamProvider.tsx`
- **Issue**: `StreamContext` and `StreamProvider` in same file
- **Fix**: Extract context to `contexts/StreamContext.ts`

**File**: `reuse/templates/react/src/lib/realtime/RealtimeProvider.tsx`
- **Issue**: `RealtimeContext` and `RealtimeProvider` in same file
- **Fix**: Extract context to `contexts/RealtimeContext.ts`

**File**: `reuse/templates/react/src/lib/performance/PerformanceObservatory.tsx`
- **Issue**: `PerformanceObservatoryContext` and provider in same file
- **Fix**: Extract context

**File**: `reuse/templates/react/src/lib/hydration/HydrationProvider.tsx`
- **Issue**: `HydrationContext` and `HydrationProvider` in same file
- **Fix**: Extract context to `contexts/HydrationContext.ts`

**File**: `reuse/templates/react/src/lib/flags/FeatureFlagProvider.tsx`
- **Issue**: `FeatureFlagContext` and `FeatureFlagProvider` in same file
- **Fix**: Extract context to `contexts/FeatureFlagContext.ts`

**File**: `reuse/templates/react/src/lib/auth/AuthProvider.tsx`
- **Issue**: `AuthContext` and `AuthProvider` in same file
- **Fix**: Extract context to `contexts/AuthContext.ts`

**File**: `reuse/templates/react/src/lib/config/ConfigProvider.tsx`
- **Issue**: `ConfigContext` and `ConfigProvider` in same file
- **Fix**: Extract context to `contexts/ConfigContext.ts`

#### 2. Layout Components with Contexts

**File**: `reuse/templates/react/src/lib/layouts/context-aware/DOMContextProvider.tsx`
- **Issue**: Multiple contexts with provider
- **Fix**: Extract `DOMContextReactContext` and `DOMContextUpdateContext`

**File**: `reuse/templates/react/src/lib/layouts/context-aware/ScrollAwareContainer.tsx`
- **Issue**: `ScrollContainerContext` with component
- **Fix**: Extract context

**File**: `reuse/templates/react/src/lib/layouts/context-aware/PortalBridge.tsx`
- **Issue**: `PortalBridgeContext` with components
- **Fix**: Extract context

**File**: `reuse/templates/react/src/lib/layouts/adaptive/AdaptiveLayout.tsx`
- **Issue**: `AdaptiveLayoutContext` with component
- **Fix**: Extract context

**File**: `reuse/templates/react/src/lib/layouts/adaptive/AdaptiveContainer.tsx`
- **Issue**: `ContainerContext` with component
- **Fix**: Extract context

#### 3. Feature System Components

**File**: `reuse/templates/react/src/lib/feature/featureDI.tsx`
- **Issue**: `DIContext` with components and utilities
- **Fix**: Extract context to `contexts/DIContext.ts`

**File**: `reuse/templates/react/src/lib/coordination/context-bridge.tsx`
- **Issue**: `BridgeManagerContext` with components
- **Fix**: Extract context

**File**: `reuse/templates/react/src/lib/coordination/index.ts`
- **Issue**: `CoordinationContext` with utilities
- **Fix**: Extract context

### Medium Priority - Recommended Improvements

#### 1. Module-Level Constants

**Multiple Files**: Various configuration objects defined at module level
- **Issue**: Could prevent proper tree-shaking and Fast Refresh
- **Fix**: Extract to `utils/fast-refresh-constants.ts`
- **Examples**:
  - Default configurations
  - Constant objects used by multiple components
  - Shared type definitions

#### 2. Utility Functions in Component Files

**File**: `reuse/templates/react/src/lib/ux/progressive-enhancement.ts`
- **Issue**: Helper functions like `detectCapabilities()`, `hasESModules()`, etc.
- **Fix**: Extract to `utils/capability-detection.ts`
- **Lines**: 108-262

**File**: `reuse/templates/react/src/lib/ux/loading-states.tsx`
- **Issue**: Helper function `announceToScreenReader()`
- **Fix**: Extract to `utils/accessibility.ts`

### Low Priority - Optional Improvements

#### 1. Custom Hooks in Component Files

These are technically allowed but separating improves organization:

**File**: `reuse/templates/react/src/lib/config/useConfig.ts`
- **Current**: All hooks in one file
- **Recommendation**: Could split into individual hook files if file grows large
- **Status**: Currently acceptable as no components in file

## Refactoring Strategy

### Phase 1: Extract Contexts (Critical)
1. Create `contexts/` directory structure
2. Extract all `createContext()` calls to individual files
3. Update imports in provider files
4. Update imports in consumer files

### Phase 2: Extract Utility Functions
1. Create `utils/capability-detection.ts`
2. Create `utils/accessibility.ts`
3. Create `utils/fast-refresh-constants.ts`
4. Move helper functions
5. Update imports

### Phase 3: Verify Fast Refresh
1. Start dev server
2. Make changes to components
3. Verify state preservation
4. Check for console warnings

## Implementation Guide

### Step 1: Create Context Files

```typescript
// contexts/MyContext.ts
import { createContext } from 'react';

export interface MyContextValue {
  // ... types
}

export const MyContext = createContext<MyContextValue | null>(null);
```

### Step 2: Update Provider Files

```typescript
// providers/MyProvider.tsx
import React from 'react';
import { MyContext } from '../contexts/MyContext';

export function MyProvider({ children }) {
  // ... provider implementation
  return (
    <MyContext.Provider value={value}>
      {children}
    </MyContext.Provider>
  );
}
```

### Step 3: Update Imports

```typescript
// Before
import { MyContext } from './MyProvider';

// After
import { MyContext } from '../contexts/MyContext';
```

## Files Created

1. ✅ `utils/fast-refresh-constants.ts` - Default configuration values
2. ✅ `contexts/index.ts` - Central context exports
3. ✅ `contexts/LoadingContext.ts` - Loading state context
4. ✅ `contexts/ProgressiveEnhancementContext.ts` - Progressive enhancement context
5. ✅ `contexts/ThemeContext.ts` - Theme context
6. ✅ `contexts/SecurityContext.ts` - Security context
7. 🔄 Additional context files needed (see list above)

## Files to Update

Each provider file needs to:
1. Remove `createContext()` call
2. Import context from `contexts/` directory
3. Keep provider implementation
4. Export provider component

## Testing Checklist

- [ ] All TypeScript errors resolved
- [ ] All imports updated
- [ ] Fast Refresh works in development
- [ ] No console warnings about Fast Refresh
- [ ] State preserved on file changes
- [ ] All providers render correctly
- [ ] Context consumers work correctly
- [ ] No runtime errors

## Benefits

1. **Better Fast Refresh**: Components update without full reload
2. **Improved Organization**: Clear separation of concerns
3. **Better Tree Shaking**: Smaller production bundles
4. **Easier Testing**: Contexts and providers can be tested separately
5. **Better IDE Support**: Clearer dependency graph
6. **Reduced Coupling**: Easier to refactor individual pieces

## Next Steps

1. Complete remaining context extractions
2. Extract utility functions
3. Update all imports across codebase
4. Run type checking: `npm run typecheck`
5. Test Fast Refresh in development
6. Update documentation
