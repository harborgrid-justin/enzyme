/**
 * @file Git integration plugin
 * @module plugins/built-in/git
 */

import { execa } from 'execa';
import { Plugin, GenerationContext, GenerationResult } from '../../types/index.js';
import { exists } from '../../utils/fs.js';
import { resolve } from 'path';

/**
 * Git plugin
 */
export const gitPlugin: Plugin = {
  name: 'git',
  version: '1.0.0',
  description: 'Git integration for automatic commits',

  hooks: {
    async init(context) {
      // Check if git is available
      try {
        await execa('git', ['--version']);
        context.logger.debug('Git is available');
      } catch {
        context.logger.warn('Git is not available. Git integration will be disabled.');
      }
    },

    async afterGenerate(context: GenerationContext, result: GenerationResult): Promise<void> {
      // Skip if git is not enabled in config
      if (!context.context.config.git?.enabled) {
        return;
      }

      // Skip if generation failed
      if (!result.success) {
        return;
      }

      // Skip if no files were created or modified
      if (result.filesCreated.length === 0 && result.filesModified.length === 0) {
        return;
      }

      // Check if git repository exists
      const gitDir = resolve(context.context.cwd, '.git');
      if (!(await exists(gitDir))) {
        context.context.logger.debug('Not a git repository. Skipping git operations.');
        return;
      }

      try {
        // Check if auto-commit is enabled
        if (context.context.config.git?.autoCommit) {
          await autoCommitChanges(context, result);
        } else {
          // Just stage the files
          await stageFiles(context, result);
        }
      } catch (error) {
        context.context.logger.warn(
          `Git operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
  },

  config: {
    autoCommit: false,
    commitMessage: 'chore: generate files via enzyme-cli',
  },
};

/**
 * Stage generated files
 */
async function stageFiles(context: GenerationContext, result: GenerationResult): Promise<void> {
  const files = [...result.filesCreated, ...result.filesModified];

  if (files.length === 0) {
    return;
  }

  context.context.logger.debug(`Staging ${files.length} files...`);

  try {
    await execa('git', ['add', ...files], {
      cwd: context.context.cwd,
    });

    context.context.logger.success(`Staged ${files.length} files`);
  } catch (error) {
    throw new Error(`Failed to stage files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Auto-commit changes
 */
async function autoCommitChanges(context: GenerationContext, result: GenerationResult): Promise<void> {
  const files = [...result.filesCreated, ...result.filesModified];

  if (files.length === 0) {
    return;
  }

  context.context.logger.debug(`Committing ${files.length} files...`);

  try {
    // Stage files
    await execa('git', ['add', ...files], {
      cwd: context.context.cwd,
    });

    // Create commit message
    const commitMessage =
      context.context.config.git?.commitMessage ||
      `chore: generate ${context.type} ${context.name} via enzyme-cli`;

    // Commit
    await execa('git', ['commit', '-m', commitMessage], {
      cwd: context.context.cwd,
    });

    context.context.logger.success(`Committed ${files.length} files`);
  } catch (error) {
    throw new Error(`Failed to commit files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if git is available
 */
export async function isGitAvailable(): Promise<boolean> {
  try {
    await execa('git', ['--version']);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if directory is a git repository
 */
export async function isGitRepository(cwd: string = process.cwd()): Promise<boolean> {
  const gitDir = resolve(cwd, '.git');
  return await exists(gitDir);
}

/**
 * Initialize git repository
 */
export async function initGitRepository(cwd: string = process.cwd()): Promise<void> {
  try {
    await execa('git', ['init'], { cwd });
  } catch (error) {
    throw new Error(`Failed to initialize git repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get git status
 */
export async function getGitStatus(cwd: string = process.cwd()): Promise<string> {
  try {
    const { stdout } = await execa('git', ['status', '--porcelain'], { cwd });
    return stdout;
  } catch (error) {
    throw new Error(`Failed to get git status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get current branch
 */
export async function getCurrentBranch(cwd: string = process.cwd()): Promise<string> {
  try {
    const { stdout } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
    return stdout.trim();
  } catch (error) {
    throw new Error(`Failed to get current branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if working directory is clean
 */
export async function isWorkingDirectoryClean(cwd: string = process.cwd()): Promise<boolean> {
  const status = await getGitStatus(cwd);
  return status.trim().length === 0;
}

/**
 * Add files to git
 */
export async function addFiles(files: string[], cwd: string = process.cwd()): Promise<void> {
  try {
    await execa('git', ['add', ...files], { cwd });
  } catch (error) {
    throw new Error(`Failed to add files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Commit changes
 */
export async function commit(message: string, cwd: string = process.cwd()): Promise<void> {
  try {
    await execa('git', ['commit', '-m', message], { cwd });
  } catch (error) {
    throw new Error(`Failed to commit: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create git tag
 */
export async function createTag(tag: string, message?: string, cwd: string = process.cwd()): Promise<void> {
  try {
    const args = ['tag'];
    if (message) {
      args.push('-a', tag, '-m', message);
    } else {
      args.push(tag);
    }
    await execa('git', args, { cwd });
  } catch (error) {
    throw new Error(`Failed to create tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
