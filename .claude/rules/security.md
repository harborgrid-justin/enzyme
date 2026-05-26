---
paths:
  - "src/lib/auth/**"
  - "src/lib/security/**"
  - "src/lib/routing/**"
  - "src/lib/api/**"
  - "src/lib/data/**"
---

# Security rules (auth, security, routing, api, data)

This code handles authentication, authorization, routing guards, and untrusted
input. Treat it as security-sensitive.

- Never trust client-side route guards or RBAC checks as a real security
  boundary — they are UX, the server enforces. Document that assumption where it
  matters; don't expand client-only checks into a false sense of protection.
- No secrets, tokens, or API keys in source or bundled output. Don't log tokens
  or put them in URLs/query strings.
- Sanitize/escape any untrusted value that reaches the DOM. Avoid
  `dangerouslySetInnerHTML`; if unavoidable, sanitize first and justify it.
- Validate external input at the boundary (`zod` is available); never pass
  unvalidated payloads into state or storage.
- Use secure, `httpOnly`/`SameSite` cookies over `localStorage` for tokens where
  the design allows; avoid storing sensitive data in client storage.
- Use crypto-strong randomness for anything security-relevant, not `Math.random`.

When in doubt, delegate a review to the `security-auditor` subagent before merge.
