/**
 * New Project Command
 *
 * Handles the `enzyme new` command
 */

import {
  generateProject,
  detectPackageManager,
  type TemplateType,
  type PackageManager,
  type Feature,
} from '../generators/project';

interface NewCommandOptions {
  template: string;
  packageManager: string;
  git: boolean;
  install: boolean;
  typescript: boolean;
  features?: string;
  output?: string;
}

export async function newCommand(projectName: string, options: NewCommandOptions): Promise<void> {
  try {
    // Validate and parse options
    const template = validateTemplate(options.template);
    const packageManager = options.packageManager
      ? validatePackageManager(options.packageManager)
      : detectPackageManager();
    const features = parseFeatures(options.features);

    console.log('\n🚀 Enzyme Project Generator\n');

    // Generate the project
    await generateProject({
      projectName,
      template,
      packageManager,
      git: options.git,
      install: options.install,
      typescript: true, // Always true for enzyme
      features,
      outputDir: options.output,
    });

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Validates template option
 */
function validateTemplate(template: string): TemplateType {
  const validTemplates: TemplateType[] = ['minimal', 'standard', 'enterprise', 'full'];

  if (!validTemplates.includes(template as TemplateType)) {
    throw new Error(
      `Invalid template: ${template}. Valid options: ${validTemplates.join(', ')}`
    );
  }

  return template as TemplateType;
}

/**
 * Validates package manager option
 */
function validatePackageManager(pm: string): PackageManager {
  const validManagers: PackageManager[] = ['npm', 'yarn', 'pnpm', 'bun'];

  if (!validManagers.includes(pm as PackageManager)) {
    throw new Error(
      `Invalid package manager: ${pm}. Valid options: ${validManagers.join(', ')}`
    );
  }

  return pm as PackageManager;
}

/**
 * Parses features from comma-separated string
 */
function parseFeatures(featuresStr?: string): Feature[] {
  if (!featuresStr) {
    return [];
  }

  const validFeatures: Feature[] = ['auth', 'state', 'routing', 'realtime', 'monitoring', 'theme'];
  const features = featuresStr.split(',').map(f => f.trim() as Feature);

  // Validate each feature
  for (const feature of features) {
    if (!validFeatures.includes(feature)) {
      throw new Error(
        `Invalid feature: ${feature}. Valid options: ${validFeatures.join(', ')}`
      );
    }
  }

  return features;
}
