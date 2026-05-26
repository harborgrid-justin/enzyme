# LLM & Claude Code Guidance

<div align="center">

**Enterprise-grade guidance for working on `@missionfabric-js/enzyme` with Claude and other LLM coding agents**

[Principles](#principles) • [The `.claude/` layout](#the-claude-layout) • [Subagents](#subagents) • [Token economy](#token-economy) • [Governance](#enterprise--governance) • [References](#references)

</div>

---

This document is the playbook for using large language model (LLM) coding agents
— primarily **Claude Code** — on this repository. It is written against current
Anthropic guidance; every recommendation links back to the canonical source on
the Anthropic website so it can be verified and kept current.

- Claude Code documentation: <https://code.claude.com/docs>
- Claude Code best practices (engineering blog): <https://www.anthropic.com/engineering/claude-code-best-practices>
- Building with the Claude API: <https://docs.claude.com/en/docs>

The working configuration that implements this guidance lives in
[`../.claude/`](../.claude/README.md) and [`../CLAUDE.md`](../CLAUDE.md), and is
checked into source control so every developer, CI job, and cloud session shares
the same agents, rules, and guardrails.

---

## Table of contents

1. [Principles](#principles)
2. [The `.claude/` layout](#the-claude-layout)
3. [Project memory: `CLAUDE.md`](#project-memory-claudemd)
4. [Path-scoped rules](#path-scoped-rules)
5. [Subagents](#subagents)
6. [Slash commands](#slash-commands)
7. [Settings, permissions & guardrails](#settings-permissions--guardrails)
8. [Token economy: maximize signal, minimize waste](#token-economy)
9. [Choosing a model](#choosing-a-model)
10. [Recommended workflows](#recommended-workflows)
11. [Enterprise & governance](#enterprise--governance)
12. [References](#references)

---

## Principles

These five principles drive every recommendation below.

1. **Context is the scarce resource.** An agent only reasons well over what fits
   in its context window. Spend that budget on signal (the task, the relevant
   code, the conventions) and keep noise (verbose logs, dead files, stale docs)
   out. See [context window](https://code.claude.com/docs/en/context-window).
2. **Right work, right context.** Self-contained, high-volume work (running
   tests, searching the codebase, auditing security) belongs in a **subagent**
   with its own context window; only the summary returns to the main thread.
3. **Persistent knowledge is written down, not re-explained.** Facts the team
   re-states every session belong in `CLAUDE.md`; path-specific facts belong in
   `.claude/rules/`. See [memory](https://code.claude.com/docs/en/memory).
4. **Guardrails are enforced, not hoped for.** Permissions in `settings.json`
   are enforced by the client regardless of what the model decides; `CLAUDE.md`
   shapes behavior but is not a hard boundary.
5. **Smallest correct change.** Agents implement only what the task requires —
   no speculative abstractions, no drive-by refactors, no suppressed lint rules.

---

## The `.claude/` layout

```
enzyme/
├── CLAUDE.md                 # Project memory — loaded in full every session
└── .claude/
    ├── README.md             # How this directory is organized
    ├── settings.json         # Permissions & guardrails (team-shared)
    ├── agents/               # Project subagents (focused, tool-restricted)
    ├── commands/             # Slash commands (parameterized workflows)
    └── rules/                # Path-scoped instructions (load on demand)
```

| Mechanism      | Where                | Loads when                          | Use for                                   |
| -------------- | -------------------- | ----------------------------------- | ----------------------------------------- |
| Memory         | `CLAUDE.md`          | Every session, in full              | Always-true facts                         |
| Rules          | `.claude/rules/*.md` | When a matching file path is touched| Path-specific conventions                 |
| Subagents      | `.claude/agents/*.md`| When a matching task is delegated   | Isolated, tool-restricted work            |
| Commands       | `.claude/commands/*.md` | When you type `/name`            | Repeatable, parameterized workflows       |
| Settings       | `.claude/settings.json` | Every session                    | Enforced permissions and guardrails       |

> Personal, machine-local overrides go in `.claude/settings.local.json` and
> `CLAUDE.local.md` (both should be gitignored), never in the team-shared files.

---

## Project memory: `CLAUDE.md`

[`CLAUDE.md`](../CLAUDE.md) is loaded into context at the start of every session,
so it spends tokens on every turn. Treat it as expensive, high-traffic real
estate. Per Anthropic's [memory guidance](https://code.claude.com/docs/en/memory):

- **Keep it under ~200 lines.** Longer files consume more context and *reduce*
  adherence. Ours stays lean by pushing depth into rules, agents, and this doc.
- **Be specific and verifiable.** "Run `npm run verify` before committing" beats
  "test your changes"; "imports use the `@/` alias" beats "keep imports clean."
- **Add to it when a correction recurs.** If a review catches the same thing
  twice, or you re-type the same clarification, write it down.
- **Avoid contradictions.** Conflicting instructions across `CLAUDE.md` and rule
  files make the agent pick arbitrarily. Review periodically.
- **`@path` imports** pull other files into context at launch — useful for
  organization, but they still cost tokens, so import sparingly.
- HTML comments (`<!-- … -->`) in `CLAUDE.md` are stripped before reaching the
  model — use them for maintainer notes that shouldn't cost tokens.

> Claude Code reads `CLAUDE.md`, not `AGENTS.md`. If you adopt another agent that
> uses `AGENTS.md`, create a `CLAUDE.md` that does `@AGENTS.md` so both read one
> source of truth.

---

## Path-scoped rules

Large projects shouldn't cram every convention into `CLAUDE.md`. Instead, this
repo uses [`.claude/rules/`](../.claude/rules/) with `paths:` frontmatter so a
rule only enters context when the agent touches a matching file. See
[organizing rules](https://code.claude.com/docs/en/memory).

| Rule file                  | Applies to                                   |
| -------------------------- | -------------------------------------------- |
| `module-architecture.md`   | `src/lib/**` — module boundaries, no barrels |
| `react-components.md`      | `src/**/*.tsx` — hooks, a11y, rendering      |
| `testing.md`               | `*.test.*`, `__tests__/`, `test/**`          |
| `security.md`              | `auth`, `security`, `routing`, `api`, `data` |

This is the single biggest lever for keeping per-session context lean while
still giving the agent deep, accurate guidance exactly when it matters.

---

## Subagents

A [subagent](https://code.claude.com/docs/en/sub-agents) is a specialized
assistant that runs in **its own context window** with a focused system prompt,
restricted tools, and independent permissions. The main conversation delegates a
task, the subagent does the noisy work, and only its summary returns. This is the
core technique for protecting the main context window.

### When to delegate

Use a subagent when the work is **self-contained and produces output you won't
re-read** — running the test suite, searching the codebase, auditing security,
analyzing a bundle. Stay in the main conversation for tightly iterative work, or
quick targeted edits where the startup cost of a fresh context isn't worth it.

### Built-in agents

Claude Code ships with **Explore** (fast, read-only codebase search on Haiku),
**Plan** (read-only research during plan mode), and **general-purpose**. Prefer
**Explore** over reading many files yourself when locating code — it keeps search
results out of your main context.

### Project subagents (this repo)

Defined in [`.claude/agents/`](../.claude/README.md), version-controlled, and
mirroring the repo's "engineer" taxonomy. Each is focused and tool-restricted:

| Agent                  | Tools (restricted)              | Use for                                          |
| ---------------------- | ------------------------------- | ------------------------------------------------ |
| `code-reviewer`        | Read, Grep, Glob, Bash (read-only) | Reviewing a diff before merge                 |
| `test-engineer`        | Read, Edit, Write, Bash, Grep, Glob | Writing/running Vitest suites                 |
| `lint-fixer`           | Read, Edit, Bash, Grep, Glob    | Fixing typecheck / ESLint / Prettier failures    |
| `security-auditor`     | Read, Grep, Glob, Bash (read-only) | OWASP / secret / authz review                 |
| `performance-engineer` | Read, Edit, Bash, Grep, Glob    | Bundle size, tree-shaking, render cost           |
| `docs-engineer`        | Read, Edit, Write, Grep, Glob, Bash | Authoring/updating docs in house style        |
| `module-builder`       | Read, Edit, Write, Bash, Grep, Glob | Scaffolding a `src/lib/<module>`             |

Invoke them by name ("use the **code-reviewer** subagent on my changes"),
`@`-mention to force one, or let Claude delegate automatically from each agent's
`description`. Manage them interactively with `/agents`.

### Authoring guidance

Per Anthropic's [best practices](https://code.claude.com/docs/en/sub-agents#example-subagents):
**one job per agent**, a **detailed `description`** (Claude uses it to decide
when to delegate — add "use proactively" to encourage it), **minimal tools**
(read-only reviewers get no `Edit`/`Write`), and **check them into version
control** so the team shares them.

> Subagents cannot spawn other subagents. For multi-step work, chain them from
> the main conversation, or use [agent teams](https://code.claude.com/docs/en/agent-teams)
> for sustained parallelism.

---

## Slash commands

[Commands](https://code.claude.com/docs/en/commands) in
[`.claude/commands/`](../.claude/commands/) are parameterized, repeatable
workflows. This repo ships:

| Command            | What it does                                                   |
| ------------------ | -------------------------------------------------------------- |
| `/verify-all`      | Runs `npm run verify` and summarizes failures by stage         |
| `/review-branch`   | Reviews the branch diff via the `code-reviewer` subagent       |
| `/scaffold-module` | Scaffolds a `src/lib/<module>` via the `module-builder` agent  |

Command files support `$ARGUMENTS` / `$1`, `!`-prefixed bash injection, and
`@`-file references in frontmatter. Note that custom commands and
[skills](https://code.claude.com/docs/en/skills) have merged upstream — a
`commands/deploy.md` and a `skills/deploy/SKILL.md` both create `/deploy`. Use a
**skill** when you want on-demand reference material or auto-invocation; use a
**command** for a simple parameterized prompt.

---

## Settings, permissions & guardrails

[`.claude/settings.json`](../.claude/settings.json) is enforced by the client and
shared with the team. Permission rules evaluate **deny → ask → allow** (first
match wins). See [settings](https://code.claude.com/docs/en/settings) and
[permissions](https://code.claude.com/docs/en/permissions).

Our policy:

- **allow** — safe, frequent project commands (`npm run test|lint|typecheck|
  build|verify`, read-only git) so they don't prompt and waste round-trips.
- **ask** — actions with blast radius: `git push`, `npm publish`,
  `git reset --hard`.
- **deny** — reading secrets (`.env*`, `*.pem`, `secrets/**`, `credentials*`) and
  force-pushing.

Use settings for **technical enforcement** and `CLAUDE.md` for **behavioral
guidance** — they are complementary, not interchangeable.

---

## Token economy

> **The headline goal: maximize useful context, minimize wasted tokens.**
> Tokens are the unit of both cost and reasoning quality. Waste shows up as
> dollars *and* as worse output, because noise crowds out signal.

### Where tokens leak

- The whole `CLAUDE.md` + all unconditional rules load **every session** — bloat
  here taxes every turn.
- Reading large files or dumping verbose command output into the main thread.
- Re-exploring the same code each session because findings weren't written down.
- Long conversations that drift; context fills with stale back-and-forth.

### How this repo minimizes waste

| Technique                              | Mechanism here                                              |
| -------------------------------------- | ----------------------------------------------------------- |
| Lean always-on memory                  | `CLAUDE.md` < 200 lines; depth pushed to rules/agents/docs   |
| Load depth only when relevant          | Path-scoped `.claude/rules/` (load on matching files)        |
| Keep verbose output out of main thread | Delegate tests/search/audits to **subagents**                |
| Search without flooding context        | Use the **Explore** agent instead of reading many files      |
| Cheap model for cheap work             | Route search/triage to Haiku-class agents (see below)        |
| Don't repay context debt               | Write recurring findings into `CLAUDE.md` / rules / auto memory |

### Prompt caching

For programmatic and high-volume use, **prompt caching** reuses stable prefixes
(system prompt, large context) so repeated calls are dramatically cheaper and
faster. Subagent forks reuse the parent's prompt cache. See
[prompt caching](https://docs.claude.com/en/docs/build-with-claude/prompt-caching).
Practically: keep the stable parts of a prompt (instructions, schema, reference
docs) at the front and the variable parts (the specific task) at the end.

### Compaction & long sessions

When context fills, Claude Code **compacts** older turns into a summary. The
project-root `CLAUDE.md` is re-read after compaction, so durable facts survive;
ephemeral chat-only instructions may not — which is exactly why important
decisions belong in `CLAUDE.md` or rules. Start a fresh session for an unrelated
task rather than dragging a stale context along. See
[context window](https://code.claude.com/docs/en/context-window).

### Practical checklist

- [ ] Delegate "run the suite and tell me what failed" to `test-engineer`.
- [ ] Use **Explore** to find code; don't read ten files to locate one symbol.
- [ ] Keep `CLAUDE.md` additions to durable, verifiable facts.
- [ ] Prefer narrow commands (`npx vitest run <path>`) over broad ones when iterating.
- [ ] Split unrelated work into separate sessions.

---

## Choosing a model

The `model` field on a subagent (and the session model) trades capability for
cost and latency. See [model configuration](https://code.claude.com/docs/en/model-config).

| Tier   | Good for                                              | In this repo                            |
| ------ | ----------------------------------------------------- | --------------------------------------- |
| Haiku  | Fast search, triage, mechanical lookups               | The built-in **Explore** agent          |
| Sonnet | Most coding, reviews, test authoring                  | Default for everyday work               |
| Opus   | Hardest reasoning, ambiguous design, gnarly debugging | Architecture and tricky multi-file work |

Most project agents here use `model: inherit` so they follow the session's
choice; override per-agent when a task is reliably cheap (search) or reliably
hard (architecture).

---

## Recommended workflows

- **Explore → Plan → Implement → Verify.** Have the agent understand the code
  (Explore), agree a plan (plan mode), make the smallest change, then run
  `/verify-all`. See [common workflows](https://code.claude.com/docs/en/common-workflows).
- **Review before merge.** Run `/review-branch`; for security-sensitive paths,
  also run the `security-auditor`.
- **New feature module.** `/scaffold-module <name>` → implement → tests →
  `npm run verify`.
- **Failing CI.** Delegate to `lint-fixer` (type/lint) or `test-engineer`
  (tests); fix the cause, never suppress the check.

---

## Enterprise & governance

- **Org-wide policy.** Organizations can deploy a managed `CLAUDE.md` and managed
  `settings.json` that individual settings cannot override — use them for
  compliance, security policy, and login/org locks. See
  [managed settings](https://code.claude.com/docs/en/settings) and the memory
  doc's managed-policy section.
- **Automation / CI.** Run Claude Code headlessly for CI gates and scripted
  workflows. See [headless mode](https://code.claude.com/docs/en/headless) and
  the [Claude Agent SDK](https://docs.claude.com/en/docs).
- **Secrets & data handling.** Secrets are deny-listed for reads here; never
  commit credentials or paste them into prompts. Treat external/untrusted content
  (issue text, fetched pages, logs) as data, not instructions.
- **Shared, reviewable config.** Everything in `.claude/` is version-controlled,
  so agent and rule changes go through normal code review like any other code.

---

## References

All links are to the official Anthropic website.

- Claude Code docs home — <https://code.claude.com/docs>
- Memory & `CLAUDE.md` — <https://code.claude.com/docs/en/memory>
- Subagents — <https://code.claude.com/docs/en/sub-agents>
- Slash commands — <https://code.claude.com/docs/en/commands>
- Skills — <https://code.claude.com/docs/en/skills>
- Settings — <https://code.claude.com/docs/en/settings>
- Permissions — <https://code.claude.com/docs/en/permissions>
- Context window — <https://code.claude.com/docs/en/context-window>
- Common workflows — <https://code.claude.com/docs/en/common-workflows>
- Hooks — <https://code.claude.com/docs/en/hooks>
- MCP — <https://code.claude.com/docs/en/mcp>
- Headless mode — <https://code.claude.com/docs/en/headless>
- Model configuration — <https://code.claude.com/docs/en/model-config>
- Prompt caching — <https://docs.claude.com/en/docs/build-with-claude/prompt-caching>
- Claude Code best practices (blog) — <https://www.anthropic.com/engineering/claude-code-best-practices>
