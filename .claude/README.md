# `.claude/` — Claude Code configuration

This directory is the version-controlled, team-shared configuration that Claude
Code (and compatible agents) loads when working in this repository. It is the
practical implementation of the guidance in
[`docs/LLM_GUIDANCE.md`](../docs/LLM_GUIDANCE.md).

Everything here is checked into source control so the whole team — and every CI
or cloud session — gets the same agents, rules, and guardrails.

## Layout

```
.claude/
├── settings.json     # Permissions + guardrails (team-shared)
├── agents/           # Project subagents (focused, tool-restricted workers)
│   ├── code-reviewer.md
│   ├── test-engineer.md
│   ├── lint-fixer.md
│   ├── security-auditor.md
│   ├── performance-engineer.md
│   ├── docs-engineer.md
│   └── module-builder.md
├── commands/         # Slash commands (/verify-all, /review-branch, /scaffold-module)
└── rules/            # Path-scoped instructions, loaded only when matching files are touched
    ├── module-architecture.md   # src/lib/**
    ├── react-components.md      # src/**/*.tsx
    ├── testing.md               # *.test.* and test/**
    └── security.md              # auth / security / routing / api / data
```

The project memory file, [`../CLAUDE.md`](../CLAUDE.md), lives at the repo root
(loaded in full at session start). Keep it lean — push depth into `rules/`,
`agents/`, and `docs/LLM_GUIDANCE.md` so it loads on demand.

## What each piece does

| Piece          | Loaded when                              | Purpose                                                        |
| -------------- | ---------------------------------------- | -------------------------------------------------------------- |
| `CLAUDE.md`    | Every session (full)                     | Always-true facts: commands, architecture, conventions        |
| `rules/*.md`   | When a matching file path is touched     | Path-scoped depth without bloating every session's context    |
| `agents/*.md`  | When Claude delegates a matching task    | Isolate verbose work in a fresh context; restrict tools        |
| `commands/*.md`| When you type the `/command`             | Repeatable, parameterized workflows                            |
| `settings.json`| Every session                            | Hard guardrails: allow safe commands, ask on push, deny secrets|

## Conventions for editing this directory

- **Agents** must stay focused (one job each), carry a clear `description` so
  Claude knows when to delegate, and restrict `tools` to the minimum needed.
- **Rules** should be path-scoped via `paths:` frontmatter unless they truly
  apply everywhere. Keep each rule file to one topic.
- **settings.json** is team-shared; put personal overrides in
  `settings.local.json` (gitignored), not here.
- After editing an agent or rule file on disk, restart the session (or use
  `/agents`) so it reloads.

See the upstream docs:
[subagents](https://code.claude.com/docs/en/sub-agents) ·
[memory & rules](https://code.claude.com/docs/en/memory) ·
[settings](https://code.claude.com/docs/en/settings) ·
[commands](https://code.claude.com/docs/en/commands).
