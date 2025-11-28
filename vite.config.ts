import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      include: ['src/lib', 'src/types'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', 'src/config/**'],
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DefendrEnzyme',
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [
        'react',
        'react/jsx-runtime',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'zustand',
        'zod',
        'immer',
        'clsx',
        'lucide-react',
        'react-window',
        'web-vitals',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-router-dom': 'ReactRouterDOM',
          '@tanstack/react-query': 'ReactQuery',
          'zustand': 'zustand',
          'zod': 'zod',
          'immer': 'immer',
          'clsx': 'clsx',
          'lucide-react': 'lucideReact',
          'react-window': 'ReactWindow',
          'web-vitals': 'webVitals'
        },
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
