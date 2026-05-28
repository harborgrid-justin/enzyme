import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// The framework is consumed directly from local source (../../src) via aliases,
// so this example runs from a fresh clone with no publish/build step. The `@/`
// and `@/lib/` aliases mirror the framework's own internal import aliases so its
// source resolves correctly when pulled in through `@missionfabric-js/enzyme`.
const repoRoot = resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Curated barrel (see src/enzyme.ts) — avoids pulling the framework's
      // `ui` module, which has a react-window v2 incompatibility.
      '@missionfabric-js/enzyme': resolve(__dirname, 'src/enzyme.ts'),
      '@/lib': resolve(repoRoot, 'src/lib'),
      '@': resolve(repoRoot, 'src'),
    },
    // Ensure a single instance of these is shared between the example and the
    // framework source pulled in via the alias above.
    dedupe: ['react', 'react-dom', '@tanstack/react-query', 'zustand'],
  },
  server: {
    port: 3003,
    open: true,
    // Allow Vite to serve the framework source that lives outside this folder.
    fs: { allow: [repoRoot] },
  },
});
