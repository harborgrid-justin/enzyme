import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { BaseCommand } from '../base-command';
import type { CommandContext, CommandMetadata } from '../base-command';

/**
 *
 */
interface FeatureInfo {
  name: string;
  path: string;
  description?: string;
  hasRoutes: boolean;
  hasStore: boolean;
  hasAPI: boolean;
}

/**
 * Go To Feature Command
 * Navigate to feature module index
 * Keybinding: Ctrl+Shift+F
 */
export class GoToFeatureCommand extends BaseCommand {
  /**
   *
   */
  getMetadata(): CommandMetadata {
    return {
      id: 'enzyme.navigation.goToFeature',
      title: 'Enzyme: Go to Feature',
      category: 'Enzyme Navigation',
      icon: '$(package)',
      keybinding: {
        key: 'ctrl+shift+f',
        mac: 'cmd+shift+f',
      },
    };
  }

  /**
   *
   * @param _context
   */
  protected async executeCommand(_context: CommandContext): Promise<void> {
    const workspaceFolder = await this.ensureWorkspaceFolder();

    // Find all features
    const features = await this.withProgress(
      'Scanning features...',
      async (progress) => {
        progress.report({ message: 'Finding feature modules...' });
        return this.findFeatures(workspaceFolder);
      }
    );

    if (features.length === 0) {
      await this.showWarning(
        'No features found. Features should be in src/features/'
      );
      return;
    }

    // Show quick pick
    const selected = await this.showQuickPick(
      features.map((feature) => ({
        label: `$(package) ${feature.name}`,
        description: this.getFeatureBadges(feature),
        detail: feature.description || feature.path,
        feature,
      })),
      {
        title: 'Go to Feature',
        placeHolder: 'Search for a feature module...',
        matchOnDescription: true,
        matchOnDetail: true,
      }
    );

    if (!selected) {
      return;
    }

    // Open the feature index file
    const indexFile = path.join(selected.feature.path, 'index.ts');
    const uri = vscode.Uri.file(indexFile);

    try {
      await this.openFile(uri);
    } catch (error) {
      // If index.ts doesn't exist, try index.tsx
      const indexTsxFile = path.join(selected.feature.path, 'index.tsx');
      const tsxUri = vscode.Uri.file(indexTsxFile);

      try {
        await this.openFile(tsxUri);
      } catch {
        await this.showError(
          'Failed to open feature index file',
          error
        );
      }
    }
  }

  /**
   *
   * @param workspaceFolder
   */
  private async findFeatures(
    workspaceFolder: vscode.WorkspaceFolder
  ): Promise<FeatureInfo[]> {
    const features: FeatureInfo[] = [];
    const sourcePath = path.join(workspaceFolder.uri.fsPath, 'src');
    const featuresPath = path.join(sourcePath, 'features');

    try {
      // Check if features directory exists
      const stat = await fs.stat(featuresPath);
      if (!stat.isDirectory()) {
        return [];
      }

      // Read feature directories
      const entries = await fs.readdir(featuresPath, { withFileTypes: true });
      const featureDirectories = entries.filter((entry) => entry.isDirectory());

      // Analyze each feature
      for (const dir of featureDirectories) {
        const featurePath = path.join(featuresPath, dir.name);
        const feature = await this.analyzeFeature(dir.name, featurePath);
        features.push(feature);
      }

      // Sort by name
      features.sort((a, b) => a.name.localeCompare(b.name));

      return features;
    } catch (error) {
      this.log('error', 'Failed to find features', error);
      return [];
    }
  }

  /**
   *
   * @param name
   * @param featurePath
   */
  private async analyzeFeature(
    name: string,
    featurePath: string
  ): Promise<FeatureInfo> {
    const feature: FeatureInfo = {
      name,
      path: featurePath,
      hasRoutes: false,
      hasStore: false,
      hasAPI: false,
    };

    try {
      const entries = await fs.readdir(featurePath, { withFileTypes: true });

      // Check for routes
      feature.hasRoutes = entries.some(
        (entry) => entry.isDirectory() && entry.name === 'routes'
      );

      // Check for store
      feature.hasStore = entries.some(
        (entry) => entry.isDirectory() && entry.name === 'store'
      );

      // Check for API
      feature.hasAPI = entries.some(
        (entry) => entry.isDirectory() && entry.name === 'api'
      );

      // Try to read description from README
      const readmePath = path.join(featurePath, 'README.md');
      try {
        const readmeContent = await fs.readFile(readmePath, 'utf-8');
        // Extract first paragraph after title
        const match = /^#\s+.+?\n\n(.+?)(?:\n\n|$)/m.exec(readmeContent);
        const description = match?.[1];
        if (description) {
          feature.description = description.trim();
        }
      } catch {
        // README doesn't exist
      }
    } catch (error) {
      this.log('warn', `Failed to analyze feature ${name}`, error);
    }

    return feature;
  }

  /**
   *
   * @param feature
   */
  private getFeatureBadges(feature: FeatureInfo): string {
    const badges: string[] = [];

    if (feature.hasRoutes) {
      badges.push('Routes');
    }
    if (feature.hasStore) {
      badges.push('Store');
    }
    if (feature.hasAPI) {
      badges.push('API');
    }

    return badges.join(' • ') || 'Basic';
  }
}
