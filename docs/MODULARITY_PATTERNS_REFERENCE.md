# NPM Modularity Patterns - Quick Reference
## Based on Lodash Analysis for Enzyme

---

## Pattern 1: Multiple Build Variants

**What**: Provide different package sizes for different use cases

**Lodash Example**:
- Full: `lodash.js` (544 kB) - All 300+ methods
- Core: `core.js` (116 kB) - 130 most common methods
- Categories: `array.js`, `object.js` - Grouped by type
- Methods: `map.js`, `filter.js` - Individual functions

**Enzyme Implementation**:
```typescript
// Create src/core.ts
export { EnzymeProvider, createRoute, createStore, useAuth };
// ~30 kB - Essential features only

// Full build (existing)
export * from './lib';
// ~120 kB - All features
```

**Benefits**:
- Users choose bundle size vs features
- Faster load times for simple apps
- Progressive enhancement path

---

## Pattern 2: Dual Format Distribution (ESM + CJS)

**What**: Publish both ES modules and CommonJS

**Lodash Example**:
- `lodash` package → CommonJS (module.exports)
- `lodash-es` package → ES modules (export/import)

**Enzyme Implementation** (✅ Already done):
```json
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",  // ESM
      "require": "./dist/index.js"   // CJS
    }
  }
}
```

**Benefits**:
- Works in Node.js and browsers
- Enables tree-shaking (ESM)
- Universal compatibility

---

## Pattern 3: Category-Based Exports

**What**: Group related functions for easier imports

**Lodash Example**:
```javascript
var array = require('lodash/array');    // All array methods
var object = require('lodash/object');  // All object methods
```

**Enzyme Implementation** (✅ Already done):
```typescript
import { useAuth } from '@missionfabric-js/enzyme/auth';
import { createRoute } from '@missionfabric-js/enzyme/routing';
```

**Benefits**:
- Better code organization
- Smaller bundles than full import
- Clearer dependencies

---

## Pattern 4: sideEffects: false

**What**: Tell bundlers package is pure (no side effects)

**Lodash Example**:
```json
{
  "sideEffects": false
}
```

**Enzyme Implementation** (✅ Already done):
```json
{
  "sideEffects": false
}
```

**Benefits**:
- Aggressive tree-shaking
- Bundlers can safely remove unused code
- Smaller production bundles

---

## Pattern 5: Functional Programming Variant

**What**: Provide alternative API style for different paradigms

**Lodash Example**:
```javascript
// Standard
_.map(array, fn);

// Functional Programming
import map from 'lodash/fp/map';
const mapFn = map(fn);  // Auto-curried
mapFn(array);
```

**Enzyme Implementation** (Future consideration):
```typescript
// Standard imperative
const navigate = useNavigate();
navigate('/home');

// FP-style (if created)
import { navigate } from '@missionfabric-js/enzyme/fp';
const goHome = navigate('/home');
goHome();  // Curried
```

**Benefits**:
- Supports different coding styles
- Composition-friendly
- Immutable by default

---

## Pattern 6: Bundled TypeScript Types

**What**: Include .d.ts files in package (not @types)

**Lodash Example**: ❌ Uses @types/lodash (legacy approach)

**Enzyme Implementation** (✅ Modern approach - better):
```json
{
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs"
    }
  }
}
```

**Benefits**:
- Types always match code
- No version mismatches
- Better DX

---

## Pattern 7: preserveModules for Tree-shaking

**What**: Keep module structure instead of bundling into one file

**Lodash Example**:
```
lodash/
├── map.js
├── filter.js
├── reduce.js
└── ... (600+ individual files)
```

**Enzyme Implementation** (✅ Already done):
```javascript
// vite.config.ts
rollupOptions: {
  preserveModules: true,
  preserveModulesRoot: 'src'
}
```

**Benefits**:
- Better tree-shaking
- Granular imports
- Smaller production bundles

---

## Pattern 8: Conditional Exports

**What**: Serve different files based on environment

**Lodash Example**: ❌ Not used (legacy)

**Enzyme Enhancement** (Recommended):
```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "node": {
        "development": "./dist/index.dev.mjs",
        "production": "./dist/index.prod.mjs"
      },
      "browser": "./dist/index.browser.mjs",
      "default": "./dist/index.mjs"
    }
  }
}
```

**Benefits**:
- Optimized for each environment
- Development builds with debug info
- Production builds minified

---

## Pattern 9: Documentation from Source

**What**: Auto-generate docs from code comments

**Lodash Example**:
- Uses `docdown` to extract JSDoc
- Generates markdown from source
- Keeps docs in sync with code

**Enzyme Implementation**:
```bash
npm install -D typedoc

# Add to package.json
{
  "scripts": {
    "docs": "typedoc"
  }
}
```

**Benefits**:
- Docs never out of date
- Less manual work
- Consistent format

---

## Pattern 10: Bundle Size Monitoring

**What**: Track and enforce bundle size limits

**Lodash Approach**:
- Published sizes clearly documented
- Full build: 24 kB gzipped
- Core build: 4 kB gzipped

**Enzyme Implementation**:
```bash
npm install -D size-limit @size-limit/preset-small-lib

# .size-limit.json
[
  {
    "path": "dist/index.mjs",
    "limit": "50 kB"
  }
]
```

**Benefits**:
- Prevent bundle bloat
- CI fails if size increases
- Performance awareness

---

## Pattern 11: Method-Level Exports (Advanced)

**What**: Export individual functions/hooks

**Lodash Example**:
```javascript
// Direct import
import map from 'lodash/map';
import filter from 'lodash/filter';
```

**Enzyme Implementation**:
```json
{
  "exports": {
    "./hooks/useAuth": "./dist/lib/hooks/useAuth.mjs",
    "./hooks/useRouter": "./dist/lib/hooks/useRouter.mjs"
  }
}
```

**Benefits**:
- Ultra-optimized imports
- Maximum tree-shaking
- Explicit dependencies

---

## Pattern 12: Multi-Package Strategy

**What**: Publish related packages for different use cases

**Lodash Example**:
- `lodash` - Main package
- `lodash-es` - ES modules variant
- `lodash.map`, `lodash.filter` - Per-method (deprecated)

**Enzyme Implementation** (Future):
```
@missionfabric-js/enzyme        # Full framework
@missionfabric-js/enzyme-lite   # Core only
@missionfabric-js/enzyme-server # SSR utilities
```

**Benefits**:
- Specialized for use cases
- Smaller install sizes
- Clear separation

---

## Anti-Patterns to Avoid

### ❌ Per-Method Packages (Deprecated by Lodash)

**Problem**: Each package bundles its own dependencies

```bash
# lodash.map includes copy of _baseMap
# lodash.filter includes copy of _baseMap
# = duplication and larger total bundle
```

**Solution**: Use direct imports instead

```javascript
// ✅ Good
import map from 'lodash/map';

// ❌ Bad
import map from 'lodash.map';  // Separate package
```

### ❌ Barrel Exports Without preserveModules

**Problem**: Bundler can't tree-shake

```typescript
// src/index.ts - barrel file
export * from './auth';
export * from './routing';
// ... everything bundled into one file
```

**Solution**: Use preserveModules

```javascript
rollupOptions: {
  preserveModules: true  // ✅ Keeps individual files
}
```

### ❌ Missing sideEffects Declaration

**Problem**: Bundlers assume code has side effects

```json
{
  // Missing: "sideEffects": false
}
```

**Solution**: Declare if package is pure

```json
{
  "sideEffects": false
}
```

---

## Implementation Priority

### Phase 1: Foundation (Week 1)
1. ✅ Already done: ESM/CJS dual format
2. ✅ Already done: Category exports
3. ✅ Already done: sideEffects: false
4. Add: Bundle size analysis
5. Add: TypeDoc documentation

### Phase 2: Optimization (Week 2-3)
1. Create: Core build variant
2. Add: Conditional exports (node/browser)
3. Add: Bundle size limits
4. Document: Tree-shaking patterns

### Phase 3: Advanced (Week 4+)
1. Consider: Multi-package strategy
2. Consider: Method-level exports
3. Add: Performance budgets
4. Add: Automated README generation

---

## Quick Command Reference

```bash
# Bundle analysis
npm install -D rollup-plugin-visualizer
npm run build && open dist/stats.html

# Size tracking
npm install -D size-limit @size-limit/preset-small-lib
npm run size

# Documentation
npm install -D typedoc typedoc-plugin-markdown
npm run docs

# Validation
npm install -D @arethetypeswrong/cli publint
npm run validate

# Monorepo (if needed)
npm install -D @changesets/cli
npx changeset init
```

---

## Comparison Matrix

| Feature | Lodash | Enzyme Current | Enzyme Target |
|---------|--------|----------------|---------------|
| ESM/CJS | ✅ Separate packages | ✅ Dual build | ✅ Keep |
| Category exports | ✅ Via files | ✅ Via exports | ✅ Keep |
| Core build | ✅ core.js | ❌ Missing | ✅ Add |
| Bundled types | ❌ @types | ✅ Bundled | ✅ Keep |
| sideEffects | ✅ false | ✅ false | ✅ Keep |
| preserveModules | ✅ Individual files | ✅ Enabled | ✅ Keep |
| Exports field | ❌ Legacy | ✅ Modern | ✅ Enhance |
| Documentation | ✅ docdown | ⚠️ Manual | ✅ TypeDoc |
| Size limits | ⚠️ Documented | ❌ Missing | ✅ Add |
| Multi-package | ✅ 2 packages | ❌ Single | ⚠️ Consider |

**Legend**: ✅ Implemented | ⚠️ Partial | ❌ Missing

---

## Key Takeaways

1. **Enzyme is already modern** - Better than lodash in several areas (exports field, bundled types, Vite build)

2. **Add granularity** - Core build and bundle analysis are quick wins

3. **Document optimization** - Users need to know how to optimize imports

4. **Monitor bundle size** - Add size-limit to prevent bloat

5. **Generate documentation** - TypeDoc keeps docs in sync

6. **Consider multi-package later** - Only if clear user demand

---

## Resources

- [Lodash GitHub](https://github.com/lodash/lodash)
- [Package.json Exports](https://nodejs.org/api/packages.html#exports)
- [Are The Types Wrong](https://github.com/arethetypeswrong/arethetypeswrong.github.io)
- [size-limit](https://github.com/ai/size-limit)
- [TypeDoc](https://typedoc.org/)

---

**Last Updated**: December 3, 2025
**Status**: Ready for implementation
**Priority**: Phase 1 items for immediate impact
