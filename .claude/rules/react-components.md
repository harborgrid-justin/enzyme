---
paths:
  - "src/**/*.tsx"
---

# React component rules

- Function components with hooks only. Follow the `react-hooks` rules: complete
  dependency arrays, no conditional hooks, no hooks outside components.
- Derive state where possible instead of syncing it in effects. Reserve
  `useEffect` for genuine external side effects.
- Memoize only proven-expensive subtrees; don't wrap everything in
  `useMemo`/`useCallback` by reflex.
- Virtualize large lists with `react-window` (already a dependency).
- Accessibility: satisfy `jsx-a11y` rules — semantic elements, labels for
  inputs, `alt` text, keyboard-reachable interactive elements.
- Styling uses Tailwind (`clsx` for conditional classes); let the Prettier
  Tailwind plugin order classes — don't hand-sort.
- Components belong to their feature module under `src/lib/<module>/`.
