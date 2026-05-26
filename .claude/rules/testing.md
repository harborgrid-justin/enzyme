---
paths:
  - "**/*.test.{ts,tsx}"
  - "src/**/__tests__/**"
  - "test/**"
---

# Testing rules

- Stack: Vitest + @testing-library/react + @testing-library/user-event + MSW,
  on happy-dom. Globals are enabled (`vitest/globals`).
- Colocate tests as `*.test.ts(x)` next to the code, or under `__tests__/`.
- Query by role/text/label (Testing Library), not by implementation detail or
  test IDs unless there is no accessible alternative.
- Mock network with MSW request handlers — not ad-hoc `fetch`/`axios` stubs.
- Keep tests isolated and deterministic: no shared mutable state, no real timers
  unless controlled, no network.
- Never use `.only`, and don't `.skip` to dodge a failure. New behavior ships
  with a test; a bug fix ships with a regression test.
- Run `npm run test` (or narrow with `npx vitest run <path>`); use
  `npm run test:coverage` to check gaps.
