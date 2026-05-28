import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// The framework is consumed directly from local source (../../src) via aliases,
// so this example runs from a fresh clone with no publish/build step.
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
    dedupe: ['react', 'react-dom', '@tanstack/react-query', 'zustand'],
  },
  server: {
    port: 3004,
    open: true,
    fs: { allow: [repoRoot] },
  },
});
