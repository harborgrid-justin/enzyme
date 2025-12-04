/**
 * Remove Command
 *
 * Remove features from Enzyme projects.
 * Handles dependency removal, configuration updates, and file cleanup.
 */

import { execSync } from 'child_process';
import { unlinkSync, existsSync, readFileSync, writeFileSync, readdirSync, statSync, rmdirSync } from 'fs';
import { resolve, join } from 'path';
import { ConfigManager } from '../config/manager.js';
import { FeatureType } from './add.js';

export interface RemoveOptions {
  cwd?: string;
  dryRun?: boolean;
  force?: boolean;
  skipUninstall?: boolean;
  keepFiles?: boolean;
}

interface FeatureRemovalInfo {
  name: FeatureType;
  dependencies: string[];
  files: string[];
  configKeys: string[];
}

/**
 * Feature removal definitions
 */
const FEATURE_REMOVALS: Record<FeatureType, FeatureRemovalInfo> = {
  auth: {
    name: 'auth',
    dependencies: [],
    files: [
      'src/lib/auth.ts',
      'src/components/AuthGuard.tsx',
    ],
    configKeys: ['features.auth'],
  },
  state: {
    name: 'state',
    dependencies: ['zustand'],
    files: [
      'src/store/index.ts',
    ],
    configKeys: ['features.state'],
  },
  routing: {
    name: 'routing',
    dependencies: ['react-router-dom'],
    files: [
      'src/routes/index.tsx',
      'src/routes/pages',
    ],
    configKeys: ['features.routing'],
  },
  realtime: {
    name: 'realtime',
    dependencies: [],
    files: [
      'src/lib/realtime.ts',
      'src/hooks/useRealtimeSubscription.ts',
    ],
    configKeys: ['features.realtime'],
  },
  monitoring: {
    name: 'monitoring',
    dependencies: ['web-vitals'],
    files: [
      'src/lib/monitoring.ts',
    ],
    configKeys: ['features.monitoring'],
  },
  theme: {
    name: 'theme',
    dependencies: [],
    files: [
      'src/theme/index.ts',
      'src/components/ThemeProvider.tsx',
    ],
    configKeys: ['features.theme'],
  },
  flags: {
    name: 'flags',
    dependencies: [],
    files: [
      'src/lib/flags.ts',
    ],
    configKeys: ['metadata.flags'],
  },
};

/**
 * Remove feature from project
 */
export async function removeFeature(
  feature: FeatureType,
  options: RemoveOptions = {}
): Promise<void> {
  const cwd = options.cwd || process.cwd();
  const dryRun = options.dryRun || false;
  const force = options.force || false;

  const removalInfo = FEATURE_REMOVALS[feature];

  if (!removalInfo) {
    throw new Error(`Unknown feature: ${feature}`);
  }

  console.log(`Removing feature: ${feature}\n`);

  // Load current config
  const manager = new ConfigManager(cwd);
  const { config } = await manager.load();

  // Check if feature is enabled
  if (feature !== 'flags' && !config.features?.[feature as keyof typeof config.features]) {
    console.log(`⚠️  Feature "${feature}" is not enabled`);
    return;
  }

  // Special check for flags in metadata
  if (feature === 'flags' && !config.metadata?.flags) {
    console.log(`⚠️  Feature "${feature}" is not enabled`);
    return;
  }

  // Check for dependencies
  if (!force) {
    const dependentFeatures = await checkDependencies(cwd, feature);

    if (dependentFeatures.length > 0) {
      console.error(
        `❌ Cannot remove "${feature}" because it is required by: ${dependentFeatures.join(', ')}`
      );
      console.error('   Use --force to remove anyway');
      process.exit(1);
    }
  }

  // Warn about potentially breaking changes
  if (!force && !dryRun) {
    console.warn('⚠️  Warning: Removing this feature may break your application');
    console.warn('   Use --dry-run to see what will be removed');
    console.warn('   Use --force to proceed without confirmation\n');

    // In production, would prompt for confirmation here
    const confirmed = true; // await confirm('Continue?', false);

    if (!confirmed) {
      console.log('Cancelled');
      return;
    }
  }

  // 1. Remove files
  if (!options.keepFiles) {
    console.log('Removing files...');
    for (const file of removalInfo.files) {
      const filePath = resolve(cwd, file);

      if (!existsSync(filePath)) {
        console.log(`⚠️  ${file} not found, skipping`);
        continue;
      }

      if (dryRun) {
        console.log(`[DRY RUN] Remove ${file}`);
        continue;
      }

      try {
        const stat = statSync(filePath);

        if (stat.isDirectory()) {
          removeDirectory(filePath);
          console.log(`✓ Removed directory ${file}`);
        } else {
          unlinkSync(filePath);
          console.log(`✓ Removed ${file}`);
        }
      } catch (error) {
        console.error(`Failed to remove ${file}: ${error}`);
      }
    }
  }

  // 2. Update configuration
  console.log('\nUpdating configuration...');

  for (const key of removalInfo.configKeys) {
    const [section, field] = key.split('.');

    if (section === 'features' && field) {
      manager.set(`features.${field}`, false);
    } else if (section === 'metadata' && field) {
      const metadata = manager.get('metadata') || {};
      delete metadata[field];
      manager.set('metadata', metadata);
    }
  }

  if (dryRun) {
    console.log('[DRY RUN] Update configuration');
  } else {
    await manager.save();
    console.log('✓ Configuration updated');
  }

  // 3. Update providers
  if (!dryRun) {
    await removeProviders(cwd, feature);
  }

  // 4. Uninstall dependencies
  if (!options.skipUninstall && removalInfo.dependencies.length > 0) {
    console.log('\nUninstalling dependencies...');
    const deps = removalInfo.dependencies.join(' ');

    if (dryRun) {
      console.log(`[DRY RUN] npm uninstall ${deps}`);
    } else {
      try {
        execSync(`npm uninstall ${deps}`, {
          cwd,
          stdio: 'inherit',
        });
      } catch {
        console.error('⚠️  Failed to uninstall dependencies');
      }
    }
  }

  console.log(`\n✅ Feature "${feature}" removed successfully!`);

  // Print cleanup suggestions
  printCleanupSuggestions(feature);
}

/**
 * Check for dependent features
 */
async function checkDependencies(
  cwd: string,
  feature: FeatureType
): Promise<string[]> {
  const dependent: string[] = [];

  // Define feature dependencies
  const dependencies: Record<string, FeatureType[]> = {
    routing: ['auth'], // auth depends on routing
    state: ['auth'], // auth might use state
  };

  // Check if any enabled features depend on this one
  const manager = new ConfigManager(cwd);
  const { config } = await manager.load();

  for (const [dependsOn, features] of Object.entries(dependencies)) {
    if (dependsOn === feature) {
      for (const feat of features) {
        if (config.features?.[feat as keyof typeof config.features]) {
          dependent.push(feat);
        }
      }
    }
  }

  return dependent;
}

/**
 * Remove providers from App component
 */
async function removeProviders(cwd: string, feature: FeatureType): Promise<void> {
  const appFilePath = resolve(cwd, 'src/App.tsx');

  if (!existsSync(appFilePath)) {
    return;
  }

  let content = readFileSync(appFilePath, 'utf-8');
  let modified = false;

  // Remove import based on feature
  let importPatterns: RegExp[] = [];
  let providerPatterns: RegExp[] = [];

  switch (feature) {
    case 'auth':
      importPatterns = [
        /import\s+\{\s*AuthProvider\s*\}\s+from\s+['"]@missionfabric-js\/enzyme\/auth['"];?\n?/g,
      ];
      providerPatterns = [
        /<AuthProvider>\s*/g,
        /\s*<\/AuthProvider>/g,
      ];
      break;

    case 'theme':
      importPatterns = [
        /import\s+ThemeProvider\s+from\s+['"]\.\/components\/ThemeProvider['"];?\n?/g,
      ];
      providerPatterns = [
        /<ThemeProvider>\s*/g,
        /\s*<\/ThemeProvider>/g,
      ];
      break;

    case 'realtime':
      importPatterns = [
        /import\s+\{\s*RealtimeProvider\s*\}\s+from\s+['"]@missionfabric-js\/enzyme\/realtime['"];?\n?/g,
      ];
      providerPatterns = [
        /<RealtimeProvider>\s*/g,
        /\s*<\/RealtimeProvider>/g,
      ];
      break;

    default:
      return; // No provider to remove
  }

  // Remove imports
  for (const pattern of importPatterns) {
    if (pattern.test(content)) {
      content = content.replace(pattern, '');
      modified = true;
    }
  }

  // Remove provider wrapping
  for (const pattern of providerPatterns) {
    if (pattern.test(content)) {
      content = content.replace(pattern, '');
      modified = true;
    }
  }

  if (modified) {
    writeFileSync(appFilePath, content, 'utf-8');
    console.log('✓ Updated App.tsx (removed provider)');
  }
}

/**
 * Remove directory recursively
 */
function removeDirectory(dir: string): void {
  if (!existsSync(dir)) {
    return;
  }

  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      removeDirectory(fullPath);
    } else {
      unlinkSync(fullPath);
    }
  }

  rmdirSync(dir);
}

/**
 * Print cleanup suggestions
 */
function printCleanupSuggestions(feature: FeatureType): void {
  console.log('\nCleanup suggestions:');

  switch (feature) {
    case 'auth':
      console.log('  1. Remove authentication-related routes');
      console.log('  2. Clean up any auth-protected components');
      console.log('  3. Remove user session storage');
      break;

    case 'state':
      console.log('  1. Replace store usage with local state or context');
      console.log('  2. Update components that used useAppStore()');
      break;

    case 'routing':
      console.log('  1. Replace route components with simple components');
      console.log('  2. Update navigation to use basic links');
      break;

    case 'realtime':
      console.log('  1. Remove WebSocket server configuration');
      console.log('  2. Replace real-time updates with polling or manual refresh');
      break;

    case 'monitoring':
      console.log('  1. Remove monitoring dashboard configuration');
      console.log('  2. Clean up error reporting endpoints');
      break;

    case 'theme':
      console.log('  1. Remove theme-dependent styling');
      console.log('  2. Replace theme hooks with static styles');
      break;

    case 'flags':
      console.log('  1. Remove conditional feature rendering');
      console.log('  2. Decide on final state of flagged features');
      break;
  }
}

/**
 * Check what would be removed (dry run helper)
 */
export async function checkRemoval(
  feature: FeatureType,
  options: RemoveOptions = {}
): Promise<{
  files: string[];
  dependencies: string[];
  dependentFeatures: string[];
}> {
  const cwd = options.cwd || process.cwd();
  const removalInfo = FEATURE_REMOVALS[feature];

  if (!removalInfo) {
    throw new Error(`Unknown feature: ${feature}`);
  }

  const files = removalInfo.files.filter((file) =>
    existsSync(resolve(cwd, file))
  );

  const dependentFeatures = await checkDependencies(cwd, feature);

  return {
    files,
    dependencies: removalInfo.dependencies,
    dependentFeatures,
  };
}
