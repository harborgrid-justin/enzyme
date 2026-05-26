# Enzyme — Claude Code Project Guide

`@missionfabric-js/enzyme` is an enterprise React framework (advanced routing,
state management, performance optimizations, plug-and-play architecture).
This file is the project memory Claude Code loads at the start of every session.
Keep it concise — see `docs/LLM_GUIDANCE.md` for the full LLM playbook.

<!-- Maintainers: keep this file under ~200 lines. Depth lives in .claude/rules/, -->
<!-- .claude/agents/, and docs/LLM_GUIDANCE.md so it loads only when needed. -->

## Commands

| Task          | Command              | Notes                                  |
| ------------- | -------------------- | -------------------------------------- |
| Dev server    | `npm run dev`        | Vite                                   |
| Build         | `npm run build`      | Dual ESM + CJS output to `dist/`       |
| Type check    | `npm run typecheck`  | `tsc --noEmit`, strict                 |
| Lint          | `npm run lint`       | ESLint, `--max-warnings 0`             |
| Lint + fix    | `npm run lint:fix`   |                                        |
| Format        | `npm run format`     | Prettier                               |
| Test          | `npm run test`       | Vitest (run once)                      |
| Test + watch  | `npm run test:watch` |                                        |
| Coverage      | `npm run test:coverage` |                                     |
| **Verify all**| `npm run verify`     | typecheck + lint + test — run before commit |

Always run `npm run verify` before committing. Treat lint warnings as errors.

## Architecture

- `src/lib/` — modular feature library. Each feature (`api`, `auth`, `routing`,
  `state`, `performance`, `security`, `streaming`, `vdom`, …) is a self-contained
  module with its own `index.ts` public surface.
- `src/index.ts` — root package entry. `src/config/`, `src/types/`, `src/styles/`.
- `.development/` — dev-only CLI and demo apps (ignored by lint/build).
- `scripts/build-agents/` — the **build orchestration** system (10 "engineer"
  build tasks). These are NOT Claude subagents — see `.claude/agents/` for those.
- `docs/` — documentation hub (`docs/README.md` is the index).
- `test/` — shared test config and utilities.

Subpath exports are declared in `package.json#exports` (e.g. `@missionfabric-js/enzyme/auth`).

## Conventions

- **Imports**: use the `@/` alias for `src/` and `@/lib/` for `src/lib/`
  (e.g. `import { useAuth } from '@/lib/auth'`). Configured in `tsconfig.json`
  and `vite.config.ts`.
- **No barrel imports**: import from a module's `index.ts`, not deep internals,
  and avoid re-export chains that defeat tree-shaking. Enforced by the custom
  `no-barrel-imports` ESLint rule. `"sideEffects": false` must stay true.
- **TypeScript strict**: no `any` escapes, no unused vars/directives.
- **React 18/19**: function components + hooks; follow `react-hooks` rules.
- **Formatting**: Prettier owns formatting (2-space, tailwind plugin). Don't
  hand-format; run `npm run format`.
- **Tests**: colocate as `*.test.ts(x)` or under `__tests__/`; Vitest + Testing
  Library + MSW. New behavior needs a test.
- Node >= 20, npm >= 10.

Path-scoped depth lives in `.claude/rules/` and loads automatically when you
touch matching files (components, tests, modules, security-sensitive code).

## Working in this repo

- Prefer editing existing modules over adding new top-level surfaces. A new
  `src/lib/<module>` needs an `index.ts`, tests, and a `package.json#exports` entry.
- Don't commit secrets. `.env*` and credential files are deny-listed for reads
  in `.claude/settings.json`.
- Don't bypass hooks, lint, or type checks to "make it pass" — fix the cause.
- `git push` asks for confirmation (see `.claude/settings.json`); never force-push
  shared branches.

## Delegate to subagents (save context)

Route verbose or self-contained work to a project subagent in `.claude/agents/`
so its output stays out of the main conversation. Available agents:

- **code-reviewer** — read-only review of a diff (quality, security, perf).
- **test-engineer** — write/run Vitest suites and report only failures.
- **lint-fixer** — resolve `typecheck` + ESLint + Prettier findings.
- **security-auditor** — read-only OWASP/secret/authz review.
- **performance-engineer** — bundle size, tree-shaking, render-cost analysis.
- **docs-engineer** — author/update docs in repo style.
- **module-builder** — scaffold/implement a `src/lib/<module>` to convention.

Use the built-in **Explore** agent for codebase search before reading files
yourself. See `docs/LLM_GUIDANCE.md` for the full token-economy playbook.

## References

- Claude Code memory: https://code.claude.com/docs/en/memory
- Subagents: https://code.claude.com/docs/en/sub-agents
- Settings & permissions: https://code.claude.com/docs/en/settings
- Best practices: https://www.anthropic.com/engineering/claude-code-best-practices
