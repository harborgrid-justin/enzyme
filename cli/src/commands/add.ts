/**
 * Add Command
 *
 * Add features to existing Enzyme projects.
 * Handles dependency installation, configuration updates, and file generation.
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { ConfigManager } from '../config/manager.js';
import { EnzymeConfig } from '../config/schema.js';

export type FeatureType =
  | 'auth'
  | 'state'
  | 'routing'
  | 'realtime'
  | 'monitoring'
  | 'theme'
  | 'flags';

export interface AddOptions {
  cwd?: string;
  dryRun?: boolean;
  skipInstall?: boolean;
  skipConfig?: boolean;
}

export interface FeatureDefinition {
  name: FeatureType;
  description: string;
  dependencies: string[];
  devDependencies?: string[];
  files: FeatureFile[];
  configUpdates: Partial<EnzymeConfig>;
  postInstall?: (cwd: string) => Promise<void>;
}

export interface FeatureFile {
  path: string;
  content: string;
  overwrite?: boolean;
}

/**
 * Feature definitions
 */
const FEATURES: Record<FeatureType, FeatureDefinition> = {
  auth: {
    name: 'auth',
    description: 'Authentication and authorization',
    dependencies: [],
    files: [
      {
        path: 'src/lib/auth.ts',
        content: `/**
 * Authentication configuration
 */

import { AuthConfig } from '@missionfabric-js/enzyme/auth';

export const authConfig: AuthConfig = {
  providers: ['email', 'oauth'],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    authorized: async ({ auth, request }) => {
      return !!auth?.user;
    },
  },
};
`,
      },
      {
        path: 'src/components/AuthGuard.tsx',
        content: `/**
 * Authentication Guard Component
 */

import { useAuth } from '@missionfabric-js/enzyme/auth';
import { Navigate } from '@missionfabric-js/enzyme/routing';

export interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: string;
}

export default function AuthGuard({ children, fallback = '/login' }: AuthGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
`,
      },
    ],
    configUpdates: {
      features: { auth: true },
    },
  },

  state: {
    name: 'state',
    description: 'State management with Zustand',
    dependencies: ['zustand'],
    files: [
      {
        path: 'src/store/index.ts',
        content: `/**
 * Global state store
 */

import { createStore } from '@missionfabric-js/enzyme/state';

export interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  setUser: (user: User | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export const useAppStore = createStore<AppState>((set) => ({
  user: null,
  theme: 'light',
  setUser: (user) => set({ user }),
  setTheme: (theme) => set({ theme }),
}));
`,
      },
    ],
    configUpdates: {
      features: { state: true },
    },
  },

  routing: {
    name: 'routing',
    description: 'Advanced routing with React Router',
    dependencies: ['react-router-dom'],
    files: [
      {
        path: 'src/routes/index.tsx',
        content: `/**
 * Application routes
 */

import { RouteConfig } from '@missionfabric-js/enzyme/routing';
import { lazy } from 'react';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));

export const routes: RouteConfig[] = [
  {
    path: '/',
    element: <Home />,
    meta: {
      title: 'Home',
    },
  },
  {
    path: '/about',
    element: <About />,
    meta: {
      title: 'About',
    },
  },
];
`,
      },
      {
        path: 'src/routes/pages/Home.tsx',
        content: `/**
 * Home page
 */

export default function Home() {
  return (
    <div>
      <h1>Home</h1>
      <p>Welcome to your Enzyme app!</p>
    </div>
  );
}
`,
      },
      {
        path: 'src/routes/pages/About.tsx',
        content: `/**
 * About page
 */

export default function About() {
  return (
    <div>
      <h1>About</h1>
      <p>Built with Enzyme framework</p>
    </div>
  );
}
`,
      },
    ],
    configUpdates: {
      features: { routing: true },
    },
  },

  realtime: {
    name: 'realtime',
    description: 'Real-time subscriptions and WebSocket support',
    dependencies: [],
    files: [
      {
        path: 'src/lib/realtime.ts',
        content: `/**
 * Real-time configuration
 */

import { RealtimeConfig } from '@missionfabric-js/enzyme/realtime';

export const realtimeConfig: RealtimeConfig = {
  url: process.env.VITE_WS_URL || 'ws://localhost:3001',
  reconnect: {
    enabled: true,
    maxAttempts: 5,
    delay: 1000,
  },
};
`,
      },
      {
        path: 'src/hooks/useRealtimeSubscription.ts',
        content: `/**
 * Real-time subscription hook
 */

import { useRealtime } from '@missionfabric-js/enzyme/realtime';
import { useEffect } from 'react';

export function useRealtimeSubscription<T>(
  channel: string,
  callback: (data: T) => void
) {
  const { subscribe, unsubscribe } = useRealtime();

  useEffect(() => {
    const unsubscribeFn = subscribe<T>(channel, callback);

    return () => {
      unsubscribeFn();
    };
  }, [channel, callback, subscribe]);
}
`,
      },
    ],
    configUpdates: {
      features: { realtime: true },
    },
  },

  monitoring: {
    name: 'monitoring',
    description: 'Performance monitoring and observability',
    dependencies: ['web-vitals'],
    files: [
      {
        path: 'src/lib/monitoring.ts',
        content: `/**
 * Monitoring configuration
 */

import { MonitoringConfig } from '@missionfabric-js/enzyme/monitoring';

export const monitoringConfig: MonitoringConfig = {
  enabled: process.env.NODE_ENV === 'production',
  reportWebVitals: true,
  errorTracking: true,
  performanceTracking: true,
  endpoints: {
    errors: '/api/errors',
    metrics: '/api/metrics',
  },
};
`,
      },
    ],
    configUpdates: {
      features: { monitoring: true },
    },
  },

  theme: {
    name: 'theme',
    description: 'Theming and dark mode support',
    dependencies: [],
    files: [
      {
        path: 'src/theme/index.ts',
        content: `/**
 * Theme configuration
 */

import { ThemeConfig } from '@missionfabric-js/enzyme/theme';

export const themeConfig: ThemeConfig = {
  defaultTheme: 'light',
  themes: {
    light: {
      colors: {
        primary: '#007bff',
        secondary: '#6c757d',
        success: '#28a745',
        danger: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8',
        background: '#ffffff',
        text: '#212529',
      },
    },
    dark: {
      colors: {
        primary: '#0d6efd',
        secondary: '#6c757d',
        success: '#198754',
        danger: '#dc3545',
        warning: '#ffc107',
        info: '#0dcaf0',
        background: '#212529',
        text: '#f8f9fa',
      },
    },
  },
};
`,
      },
      {
        path: 'src/components/ThemeProvider.tsx',
        content: `/**
 * Theme Provider Component
 */

import { ThemeProvider as EnzymeThemeProvider } from '@missionfabric-js/enzyme/theme';
import { themeConfig } from '../theme';

export interface ThemeProviderProps {
  children: React.ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <EnzymeThemeProvider config={themeConfig}>
      {children}
    </EnzymeThemeProvider>
  );
}
`,
      },
    ],
    configUpdates: {
      features: { theme: true },
    },
  },

  flags: {
    name: 'flags',
    description: 'Feature flags for A/B testing and gradual rollouts',
    dependencies: [],
    files: [
      {
        path: 'src/lib/flags.ts',
        content: `/**
 * Feature flags configuration
 */

import { FlagsConfig } from '@missionfabric-js/enzyme/flags';

export const flagsConfig: FlagsConfig = {
  flags: {
    newFeature: {
      enabled: false,
      description: 'New feature flag',
    },
    betaFeatures: {
      enabled: false,
      description: 'Beta features',
      rollout: {
        percentage: 10,
      },
    },
  },
};
`,
      },
    ],
    configUpdates: {
      features: {} as any, // flags is not in features, but we can add to metadata
      metadata: {
        flags: true,
      },
    },
  },
};

/**
 * Add feature to project
 */
export async function addFeature(
  feature: FeatureType,
  options: AddOptions = {}
): Promise<void> {
  const cwd = options.cwd || process.cwd();
  const dryRun = options.dryRun || false;

  const featureDef = FEATURES[feature];

  if (!featureDef) {
    throw new Error(`Unknown feature: ${feature}`);
  }

  console.log(`Adding feature: ${featureDef.description}\n`);

  // Load current config
  const manager = new ConfigManager(cwd);
  const { config } = await manager.load();

  // Check if feature is already enabled
  if (config.features?.[feature]) {
    console.log(`⚠️  Feature "${feature}" is already enabled`);
    return;
  }

  // 1. Install dependencies
  if (!options.skipInstall && featureDef.dependencies.length > 0) {
    console.log('Installing dependencies...');
    const deps = featureDef.dependencies.join(' ');

    if (dryRun) {
      console.log(`[DRY RUN] npm install ${deps}`);
    } else {
      try {
        execSync(`npm install ${deps}`, {
          cwd,
          stdio: 'inherit',
        });
      } catch (error) {
        throw new Error('Failed to install dependencies');
      }
    }
  }

  if (!options.skipInstall && featureDef.devDependencies?.length) {
    console.log('Installing dev dependencies...');
    const devDeps = featureDef.devDependencies.join(' ');

    if (dryRun) {
      console.log(`[DRY RUN] npm install -D ${devDeps}`);
    } else {
      try {
        execSync(`npm install -D ${devDeps}`, {
          cwd,
          stdio: 'inherit',
        });
      } catch (error) {
        throw new Error('Failed to install dev dependencies');
      }
    }
  }

  // 2. Create files
  console.log('\nCreating files...');
  for (const file of featureDef.files) {
    const filePath = resolve(cwd, file.path);

    // Check if file exists
    if (existsSync(filePath) && !file.overwrite) {
      console.log(`⚠️  Skipping ${file.path} (already exists)`);
      continue;
    }

    if (dryRun) {
      console.log(`[DRY RUN] Create ${file.path}`);
      continue;
    }

    // Create directory if needed
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Write file
    writeFileSync(filePath, file.content, 'utf-8');
    console.log(`✓ Created ${file.path}`);
  }

  // 3. Update configuration
  if (!options.skipConfig) {
    console.log('\nUpdating configuration...');

    manager.update(featureDef.configUpdates);

    if (dryRun) {
      console.log('[DRY RUN] Update configuration');
    } else {
      await manager.save();
      console.log('✓ Configuration updated');
    }
  }

  // 4. Update providers if needed
  if (!dryRun) {
    await updateProviders(cwd, feature, featureDef);
  }

  // 5. Run post-install hook
  if (featureDef.postInstall && !dryRun) {
    console.log('\nRunning post-install tasks...');
    await featureDef.postInstall(cwd);
  }

  console.log(`\n✅ Feature "${feature}" added successfully!`);

  // Print next steps
  printNextSteps(feature, featureDef);
}

/**
 * Update providers in App component
 */
async function updateProviders(
  cwd: string,
  feature: FeatureType,
  featureDef: FeatureDefinition
): Promise<void> {
  const appFilePath = resolve(cwd, 'src/App.tsx');

  if (!existsSync(appFilePath)) {
    console.log('⚠️  App.tsx not found, skipping provider update');
    return;
  }

  let content = readFileSync(appFilePath, 'utf-8');

  // Add import based on feature
  let importStatement = '';
  let providerWrap = '';

  switch (feature) {
    case 'auth':
      importStatement = "import { AuthProvider } from '@missionfabric-js/enzyme/auth';";
      providerWrap = 'AuthProvider';
      break;
    case 'theme':
      importStatement = "import ThemeProvider from './components/ThemeProvider';";
      providerWrap = 'ThemeProvider';
      break;
    case 'realtime':
      importStatement = "import { RealtimeProvider } from '@missionfabric-js/enzyme/realtime';";
      providerWrap = 'RealtimeProvider';
      break;
    default:
      return; // No provider needed
  }

  // Add import if not exists
  if (!content.includes(importStatement)) {
    const importRegex = /^import\s+.*?;\s*$/gm;
    const imports = content.match(importRegex);

    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      content = content.replace(lastImport, `${lastImport}\n${importStatement}`);
    } else {
      content = `${importStatement}\n${content}`;
    }
  }

  // Wrap children with provider (simplified)
  const appComponentRegex = /function App\(\) \{[\s\S]*?return \(([\s\S]*?)\);/;
  const match = appComponentRegex.exec(content);

  if (match) {
    const jsx = match[1];
    const wrappedJsx = `\n    <${providerWrap}>${jsx}    </${providerWrap}>`;
    content = content.replace(jsx, wrappedJsx);

    writeFileSync(appFilePath, content, 'utf-8');
    console.log('✓ Updated App.tsx with provider');
  }
}

/**
 * Print next steps
 */
function printNextSteps(feature: FeatureType, featureDef: FeatureDefinition): void {
  console.log('\nNext steps:');

  switch (feature) {
    case 'auth':
      console.log('  1. Configure authentication providers in src/lib/auth.ts');
      console.log('  2. Wrap protected routes with <AuthGuard>');
      console.log('  3. Use useAuth() hook in components');
      break;

    case 'state':
      console.log('  1. Define your state shape in src/store/index.ts');
      console.log('  2. Use useAppStore() hook in components');
      console.log('  3. Create additional stores for different domains');
      break;

    case 'routing':
      console.log('  1. Define your routes in src/routes/index.tsx');
      console.log('  2. Create page components in src/routes/pages/');
      console.log('  3. Use routing hooks: useRouter(), useParams(), etc.');
      break;

    case 'realtime':
      console.log('  1. Configure WebSocket URL in src/lib/realtime.ts');
      console.log('  2. Use useRealtimeSubscription() in components');
      console.log('  3. Set up server-side WebSocket handler');
      break;

    case 'monitoring':
      console.log('  1. Configure monitoring endpoints in src/lib/monitoring.ts');
      console.log('  2. Set up error and metrics collection backend');
      console.log('  3. Review performance metrics in production');
      break;

    case 'theme':
      console.log('  1. Customize theme colors in src/theme/index.ts');
      console.log('  2. Use useTheme() hook in components');
      console.log('  3. Add theme toggle component');
      break;

    case 'flags':
      console.log('  1. Define feature flags in src/lib/flags.ts');
      console.log('  2. Use useFlag() hook to check flags');
      console.log('  3. Configure rollout strategies');
      break;
  }
}

/**
 * List available features
 */
export function listFeatures(): void {
  console.log('Available features:\n');

  for (const [key, feature] of Object.entries(FEATURES)) {
    console.log(`  ${key.padEnd(12)} - ${feature.description}`);
    if (feature.dependencies.length > 0) {
      console.log(`               Dependencies: ${feature.dependencies.join(', ')}`);
    }
  }
}
