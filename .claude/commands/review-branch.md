---
description: Review the current branch diff against master using the code-reviewer subagent
argument-hint: "[base-branch, default master]"
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git log:*), Bash(git status)
model: inherit
---

Review the changes on the current branch relative to `$1` (default `master`).

Delegate the review to the **code-reviewer** subagent so the diff and file reads
stay out of this conversation. Ask it to report Critical / Warning / Suggestion
findings with `file:line` and concrete fixes, then relay a concise summary here.

Current branch status:
!`git status -sb`
