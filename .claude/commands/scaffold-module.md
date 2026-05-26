---
description: Scaffold a new src/lib feature module to enzyme conventions
argument-hint: "<module-name>"
allowed-tools: Read, Edit, Write, Grep, Glob, Bash(npm run verify), Bash(npm run typecheck)
model: inherit
---

Scaffold a new feature module `src/lib/$1` for `@missionfabric-js/enzyme`.

Delegate to the **module-builder** subagent. It must:
- Read an existing module (e.g. `src/lib/state`) first to mirror structure.
- Create `src/lib/$1/` with a single public `index.ts`, using `@/`/`@/lib/`
  aliases and no barrel re-export chains.
- Add a colocated `*.test.ts` for the public behavior.
- Add a `./$1` entry to `package.json#exports` (types + import + require) only if
  the module is part of the published surface — confirm intent first.
- Run `npm run verify` and report files added, public exports, and any
  `package.json` change.

Keep the surface minimal; implement only what `$ARGUMENTS` describes.
