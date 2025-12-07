/**
 * Publish Engineer Agent
 * Handles npm publishing for all packages
 */

import { BaseAgent, createAgentConfig, icons, colors } from '../base-agent.js';
import type { BuildConfig, PublishResult, PublishedPackage } from '../types.js';
import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

export class PublishEngineer extends BaseAgent<PublishResult> {
  constructor(buildConfig: BuildConfig) {
    super(
      createAgentConfig(
        'publish-engineer',
        'Publish Engineer',
        'Publishes packages to npm registry',
        {
          dependencies: [
            { agentId: 'build-engineer', required: true },
            { agentId: 'test-engineer', required: true },
            { agentId: 'security-engineer', required: false },
          ],
          timeout: 600000, // 10 minutes
          priority: 1, // Lowest priority - runs last
          parallel: false,
        }
      ),
      buildConfig
    );
  }

  protected async executeTask(): Promise<PublishResult> {
    this.log('info', `${icons.publish} Starting npm publish process...`);
    this.reportProgress(5, 'Validating publish configuration');

    if (!this.buildConfig.publishToNpm) {
      this.log('info', 'Publish to npm is disabled. Skipping...');
      return {
        packages: [],
        registry: 'https://registry.npmjs.org',
        timestamp: new Date(),
      };
    }

    if (!this.buildConfig.npmToken) {
      throw new Error('NPM token is required for publishing');
    }

    const packages: PublishedPackage[] = [];

    // Validate dist directories exist
    this.reportProgress(10, 'Validating build artifacts');
    this.validateBuildArtifacts();

    // Configure npm authentication
    this.reportProgress(15, 'Configuring npm authentication');
    await this.configureNpmAuth();

    // Publish main package
    this.reportProgress(25, 'Publishing main enzyme package');
    const mainPackage = await this.publishPackage(process.cwd(), '@missionfabric-js/enzyme');
    if (mainPackage) {
      packages.push(mainPackage);
    }

    // Publish TypeScript package
    this.reportProgress(60, 'Publishing TypeScript utilities package');
    const tsPackage = await this.publishPackage(
      join(process.cwd(), 'typescript'),
      '@missionfabric-js/enzyme-typescript'
    );
    if (tsPackage) {
      packages.push(tsPackage);
    }

    this.reportProgress(100, 'Publishing complete');

    // Log summary
    this.log('success', `${icons.success} Successfully published ${packages.length} package(s)`);
    packages.forEach((pkg) => {
      this.log('info', `  ${colors.cyan}${pkg.name}@${pkg.version}${colors.reset}`);
      this.log('info', `    Size: ${(pkg.size / 1024).toFixed(2)} KB`);
      this.log('info', `    SHA: ${pkg.shasum.slice(0, 12)}...`);
    });

    return {
      packages,
      registry: 'https://registry.npmjs.org',
      timestamp: new Date(),
    };
  }

  private validateBuildArtifacts(): void {
    const mainDist = join(process.cwd(), 'dist');
    const tsDist = join(process.cwd(), 'typescript', 'dist');

    if (!existsSync(mainDist)) {
      throw new Error('Main package dist directory not found. Build failed?');
    }

    // TypeScript package dist is optional
    if (!existsSync(tsDist)) {
      this.log('warn', 'TypeScript package dist not found. Will skip publishing.');
    }
  }

  private async configureNpmAuth(): Promise<void> {
    // Set npm token via environment variable for the publish command
    this.log('info', 'Configuring npm registry authentication...');

    // Write .npmrc temporarily with auth token
    const { exitCode, stderr } = await this.runCommand(
      'npm',
      ['config', 'set', `//registry.npmjs.org/:_authToken=${this.buildConfig.npmToken}`],
      { silent: true }
    );

    if (exitCode !== 0) {
      this.log('warn', `npm config warning: ${stderr}`);
    }
  }

  private async publishPackage(cwd: string, name: string): Promise<PublishedPackage | null> {
    const packageJsonPath = join(cwd, 'package.json');
    const distPath = join(cwd, 'dist');

    if (!existsSync(packageJsonPath)) {
      this.log('warn', `Package.json not found at ${cwd}`);
      return null;
    }

    if (!existsSync(distPath)) {
      this.log('warn', `Dist directory not found for ${name}`);
      return null;
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const version = packageJson.version;

    this.log('info', `Publishing ${name}@${version}...`);

    if (this.buildConfig.dryRun) {
      this.log('info', `[DRY RUN] Would publish ${name}@${version}`);
      return {
        name,
        version,
        tarball: `${name}-${version}.tgz`,
        size: this.estimatePackageSize(cwd),
        shasum: this.generateShasum(cwd),
      };
    }

    // Run npm publish
    const { exitCode, stdout, stderr } = await this.runCommand(
      'npm',
      ['publish', '--access', 'public'],
      {
        cwd,
        silent: true,
        env: {
          NPM_TOKEN: this.buildConfig.npmToken || '',
        },
      }
    );

    if (exitCode !== 0) {
      // Check if it's because version already exists
      if (stderr.includes('cannot publish over the previously published versions') ||
          stderr.includes('You cannot publish over the previously published versions')) {
        this.log('warn', `${name}@${version} already published. Skipping...`);
        return null;
      }

      this.log('error', `Failed to publish ${name}: ${stderr}`);
      throw new Error(`Failed to publish ${name}: ${stderr}`);
    }

    this.log('success', `${icons.success} Published ${name}@${version}`);

    // Parse publish output for tarball info
    const tarball = `${name.replace('@', '').replace('/', '-')}-${version}.tgz`;

    return {
      name,
      version,
      tarball,
      size: this.estimatePackageSize(cwd),
      shasum: this.generateShasum(cwd),
    };
  }

  private estimatePackageSize(cwd: string): number {
    const distPath = join(cwd, 'dist');
    let totalSize = 0;

    const walkDir = (dir: string): void => {
      try {
        const items = require('fs').readdirSync(dir);
        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            walkDir(fullPath);
          } else {
            totalSize += stat.size;
          }
        }
      } catch {
        // Ignore errors
      }
    };

    if (existsSync(distPath)) {
      walkDir(distPath);
    }

    return totalSize;
  }

  private generateShasum(cwd: string): string {
    const packageJsonPath = join(cwd, 'package.json');
    const content = existsSync(packageJsonPath)
      ? readFileSync(packageJsonPath, 'utf-8')
      : Date.now().toString();

    return createHash('sha1').update(content).digest('hex');
  }
}
