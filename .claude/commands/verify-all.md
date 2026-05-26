---
description: Run the full enzyme verification gate (typecheck + lint + test) and summarize failures
allowed-tools: Bash(npm run verify), Bash(npm run typecheck), Bash(npm run lint), Bash(npm run test), Read, Grep, Glob
model: inherit
---

Run `npm run verify` (typecheck + lint + test). If it fails, report each failure
grouped by stage (typecheck / lint / test) with `file:line` and the message, then
propose the smallest fix for each. Do not paste the full output — summarize.
If everything passes, say so in one line.

$ARGUMENTS
