import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';
import { readdirSync, statSync, existsSync } from 'fs';

// Function to get all lib subdirectories that have index files
const getLibSubdirectories = () => {
  const libPath = resolve(__dirname, 'src/lib');
  try {
    return readdirSync(libPath).filter(item => {
      const itemPath = resolve(libPath, item);
      if (!statSync(itemPath).isDirectory()) return false;
      
      // Check if index.ts or index.tsx exists
      const indexTs = resolve(itemPath, 'index.ts');
      const indexTsx = resolve(itemPath, 'index.tsx');
      return existsSync(indexTs) || existsSync(indexTsx);
    });
  } catch {
    return [];
  }
};

// Create entry points for main index and all lib subdirectories
const createEntryPoints = () => {
  const entries: Record<string, string> = {
    index: resolve(__dirname, 'src/index.ts'),
  };
  
  // Add lib subdirectories as entry points
  const libDirs = getLibSubdirectories();
  libDirs.forEach(dir => {
    const dirPath = resolve(__dirname, `src/lib/${dir}`);
    const indexTs = resolve(dirPath, 'index.ts');
    const indexTsx = resolve(dirPath, 'index.tsx');
    
    // Use the file that exists
    const entryFile = existsSync(indexTs) ? indexTs : indexTsx;
    entries[`lib/${dir}/index`] = entryFile;
  });
  
  return entries;
};

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
      entry: createEntryPoints(),
      name: 'DefendrEnzyme',
      fileName: (format, entryName) => {
        const ext = format === 'es' ? 'mjs' : 'js';
        return `${entryName}.${ext}`;
      },
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
        // Node.js built-in modules (for build-time/SSR usage)
        'fs',
        'path',
        'node:fs',
        'node:path',
        'node:module',
      ],
      output: {
        exports: 'named',
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
