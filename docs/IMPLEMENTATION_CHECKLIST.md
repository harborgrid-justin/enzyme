# Enzyme Enterprise NPM Setup - Implementation Checklist

Based on the comprehensive Axios Enterprise Patterns Analysis, this checklist provides actionable steps to make Enzyme enterprise-ready.

## Quick Wins (30 minutes) ⚡

### 1. Fix Runtime Dependencies (5 min)
```bash
# Move tsc from dependencies to devDependencies
npm uninstall tsc
# It's already in devDependencies as typescript, so we're good
```

### 2. Update package.json Fields (5 min)
```json
{
  "typings": "./dist/index.d.ts",
  "funding": {
    "type": "github",
    "url": "https://github.com/sponsors/harborgrid-justin"
  }
}
```

### 3. Add Missing Scripts (10 min)
```json
{
  "scripts": {
    "preversion": "npm run verify",
    "version": "npm run build && git add -A dist",
    "postversion": "git push && git push --tags",
    "prepublishOnly": "npm run build",
    "release:patch": "npm version patch -m 'chore(release): %s'",
    "release:minor": "npm version minor -m 'chore(release): %s'",
    "release:major": "npm version major -m 'chore(release): %s'"
  }
}
```

### 4. Create .github Directory (5 min)
```bash
mkdir -p .github/{workflows,ISSUE_TEMPLATE}
touch .github/{PULL_REQUEST_TEMPLATE.md,FUNDING.yml}
```

### 5. Install Size Monitoring (5 min)
```bash
npm install --save-dev @size-limit/preset-small-lib size-limit
```

Add to package.json:
```json
{
  "size-limit": [
    {
      "path": "dist/index.mjs",
      "limit": "50 KB"
    }
  ],
  "scripts": {
    "size": "size-limit"
  }
}
```

---

## Priority 1: Critical (Day 1) 🔴

### 6. GitHub Actions CI (2-3 hours)

Create `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20.x, 22.x]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test:ci
      - run: npm run build
      - run: npm run size
```

**Test it:**
```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow"
git push
# Check Actions tab on GitHub
```

### 7. Create CHANGELOG.md (1 hour)

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-12-03

### Added
- Advanced routing with file-system discovery
- Enterprise configuration hub
- Predictive prefetching
- Real-time state sync
- 25+ modular exports

### Fixed
- TypeScript strict mode compliance
- Lint errors

## [1.0.0] - 2025-11-15

### Added
- Initial release
```

**Set up automated changelog:**
```bash
npm install --save-dev conventional-changelog-cli @commitlint/cli @commitlint/config-conventional

# Create commitlint.config.js
cat > commitlint.config.js << 'EOF'
module.exports = { extends: ['@commitlint/config-conventional'] };
EOF

# Add husky hook
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit ${1}'

# Add script
npm pkg set scripts.changelog="conventional-changelog -p angular -i CHANGELOG.md -s"
```

### 8. Create Community Files (2 hours)

**CONTRIBUTING.md** - Copy from main report Section 10

**SECURITY.md** - Copy from main report Section 10

**CODE_OF_CONDUCT.md** - Copy from main report Section 10

**Commit them:**
```bash
git add CONTRIBUTING.md SECURITY.md CODE_OF_CONDUCT.md
git commit -m "docs: add community health files"
git push
```

### 9. Create GitHub Templates (1 hour)

**`.github/PULL_REQUEST_TEMPLATE.md`:**
```markdown
## Description
<!-- Describe your changes -->

## Type of Change
- [ ] 🐛 Bug fix
- [ ] ✨ New feature
- [ ] 💥 Breaking change
- [ ] 📝 Documentation

## Checklist
- [ ] Tests pass
- [ ] Lint passes
- [ ] Documentation updated
```

**`.github/ISSUE_TEMPLATE/bug_report.yml`:**
See detailed template in main report Section 8.

**`.github/ISSUE_TEMPLATE/feature_request.yml`:**
See detailed template in main report Section 8.

---

## Priority 2: Important (Week 1) 🟡

### 10. Optimize Dependencies (1 hour)

Update package.json:
```json
{
  "dependencies": {
    "clsx": "^2.1.1",
    "immer": "^11.0.1",
    "react-window": "^2.2.3",
    "web-vitals": "^5.1.0",
    "zod": "^4.1.13",
    "zustand": "^5.0.8"
  },
  "peerDependencies": {
    "react": "^18.3.1 || ^19.0.0",
    "react-dom": "^18.3.1 || ^19.0.0",
    "react-router-dom": "^6.26.2 || ^7.0.0",
    "@tanstack/react-query": "^5.0.0",
    "lucide-react": "^0.400.0"
  },
  "peerDependenciesMeta": {
    "@tanstack/react-query": {
      "optional": true
    },
    "lucide-react": {
      "optional": true
    }
  }
}
```

**Test:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
npm test
```

### 11. Add Publishing Safety (2 hours)

Create `scripts/prepack-check.js`:
```javascript
#!/usr/bin/env node
const { existsSync } = require('fs');
const { resolve } = require('path');

console.log('🔍 Running pre-pack validation...');

const essentialFiles = [
  'dist/index.js',
  'dist/index.mjs',
  'dist/index.d.ts',
  'README.md',
  'LICENSE'
];

for (const file of essentialFiles) {
  if (!existsSync(resolve(__dirname, '..', file))) {
    console.error(`❌ Missing: ${file}`);
    process.exit(1);
  }
}

console.log('✅ Pre-pack validation passed');
```

Add to package.json:
```json
{
  "scripts": {
    "prepack": "node scripts/prepack-check.js",
    "prepublishOnly": "npm run build && npm run test:ci"
  }
}
```

**Test:**
```bash
npm pack --dry-run
```

### 12. Add Release Workflow (2 hours)

Create `.github/workflows/release.yml`:
```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      packages: write

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          registry-url: 'https://registry.npmjs.org'

      - run: npm ci
      - run: npm run verify
      - run: npm run build

      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
```

**Setup:**
1. Create npm token: https://www.npmjs.com/settings/tokens
2. Add to GitHub secrets: Settings → Secrets → NPM_TOKEN

### 13. Add Dependabot (15 min)

Create `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
```

---

## Priority 3: Enhancements (Week 2) 🟢

### 14. Add Bundle Optimization (3 hours)

Install dependencies:
```bash
npm install --save-dev vite-plugin-compression rollup-plugin-visualizer
```

Update `vite.config.ts`:
```typescript
import compression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    dts({ /* existing config */ }),
    compression({ algorithm: 'gzip' }),
    compression({ algorithm: 'brotliCompress', ext: '.br' }),
    visualizer({
      filename: './dist/stats.html',
      gzipSize: true,
      brotliSize: true
    })
  ],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        passes: 2,
        drop_console: true,
        drop_debugger: true
      }
    }
  }
});
```

Add scripts:
```json
{
  "scripts": {
    "analyze": "npm run build && open dist/stats.html"
  }
}
```

### 15. Add CommonJS Type Definitions (2 hours)

Create `scripts/generate-cjs-types.js`:
```javascript
const { copyFileSync } = require('fs');
const { resolve } = require('path');

const src = resolve(__dirname, '../dist/index.d.ts');
const dest = resolve(__dirname, '../dist/index.d.cts');

copyFileSync(src, dest);
console.log('✓ Generated CommonJS type definitions');
```

Update package.json:
```json
{
  "scripts": {
    "build:types": "tsc && node scripts/generate-cjs-types.js"
  },
  "exports": {
    ".": {
      "types": {
        "require": "./dist/index.d.cts",
        "import": "./dist/index.d.ts"
      },
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  }
}
```

### 16. Add UMD Build (3 hours)

Create `vite.config.umd.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'Enzyme',
      fileName: 'enzyme',
      formats: ['umd']
    },
    outDir: 'dist/umd',
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    },
    minify: 'terser',
    sourcemap: true
  }
});
```

Update package.json:
```json
{
  "jsdelivr": "./dist/umd/enzyme.umd.js",
  "unpkg": "./dist/umd/enzyme.umd.js",
  "scripts": {
    "build": "npm run clean && npm run build:lib && npm run build:umd",
    "build:umd": "vite build --config vite.config.umd.ts"
  }
}
```

---

## Verification Checklist

After completing all implementations:

### Local Verification
- [ ] `npm run verify` passes
- [ ] `npm run build` succeeds
- [ ] `npm run size` passes
- [ ] `npm pack --dry-run` works
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No lint errors

### GitHub Verification
- [ ] CI workflow runs on PR
- [ ] All checks pass
- [ ] Issue templates appear
- [ ] PR template appears
- [ ] Dependabot creates PRs

### Package Verification
- [ ] package.json has all required fields
- [ ] All entry points exist
- [ ] Type definitions are correct
- [ ] README is up to date
- [ ] CHANGELOG is current
- [ ] Community files present

### Documentation Verification
- [ ] CONTRIBUTING.md complete
- [ ] SECURITY.md complete
- [ ] CODE_OF_CONDUCT.md present
- [ ] README links work
- [ ] Examples are updated

---

## Release Process

Once everything is set up:

### First Release
```bash
# 1. Ensure everything is committed
git status  # Should be clean

# 2. Update CHANGELOG.md
npm run changelog

# 3. Review changes
git diff CHANGELOG.md

# 4. Create release
npm run release:patch  # or minor/major

# 5. CI will automatically:
#    - Run tests
#    - Build package
#    - Publish to npm
#    - Create GitHub release
```

### Future Releases
```bash
# For patches (bug fixes)
npm run release:patch

# For features
npm run release:minor

# For breaking changes
npm run release:major
```

---

## Monitoring & Maintenance

### Weekly
- [ ] Review Dependabot PRs
- [ ] Check CI status
- [ ] Review open issues
- [ ] Check npm download stats

### Monthly
- [ ] Update dependencies
- [ ] Review bundle size
- [ ] Update documentation
- [ ] Review security advisories

### Quarterly
- [ ] Review TypeScript version
- [ ] Review Node.js support
- [ ] Update examples
- [ ] Plan breaking changes

---

## Resources

- **Main Report**: `AXIOS_ENTERPRISE_PATTERNS_ANALYSIS.md`
- **npm docs**: https://docs.npmjs.com
- **GitHub Actions**: https://docs.github.com/actions
- **Conventional Commits**: https://conventionalcommits.org
- **Keep a Changelog**: https://keepachangelog.com
- **Semantic Versioning**: https://semver.org

---

## Support

Need help implementing these changes?

1. Review the detailed analysis in `AXIOS_ENTERPRISE_PATTERNS_ANALYSIS.md`
2. Check specific sections for code examples
3. Test each change incrementally
4. Open an issue if you encounter problems

---

**Good luck making Enzyme enterprise-ready! 🚀**
