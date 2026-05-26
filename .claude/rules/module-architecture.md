---
paths:
  - "src/lib/**/*.{ts,tsx}"
  - "src/index.ts"
---

# Module architecture rules (src/lib)

- Each feature module is a directory under `src/lib/` with a single public
  `index.ts`. Import the module's public surface from its `index.ts`; do not
  reach into another module's internal files.
- **No barrel imports / re-export chains.** They defeat tree-shaking and are
  discouraged by the custom `no-barrel-imports` ESLint rule. Keep imports deep
  and specific within a module, and export only what consumers need from `index.ts`.
- Keep module top-level free of side effects — `package.json` declares
  `"sideEffects": false`, and breaking that silently bloats consumer bundles.
- Use the `@/` and `@/lib/` aliases (configured in `tsconfig.json` and
  `vite.config.ts`), never long relative `../../..` paths.
- A module that is part of the published API needs a matching `./<module>`
  entry in `package.json#exports` (types + import + require).
- TypeScript strict: precise types, no `any`, no unused exports.
