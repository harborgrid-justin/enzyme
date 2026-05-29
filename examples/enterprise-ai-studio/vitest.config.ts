import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

// The Design workspace's pure-logic helpers (src/studio/design/lib/*) carry the
// real capability logic and are unit-tested here. They are dependency-free, so
// the default node environment is enough — no DOM or framework bootstrapping.
const repoRoot = resolve(__dirname, '../..');

export default defineConfig({
  resolve: {
    alias: {
      '@missionfabric-js/enzyme': resolve(__dirname, 'src/enzyme.ts'),
      '@/lib': resolve(repoRoot, 'src/lib'),
      '@': resolve(repoRoot, 'src'),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
