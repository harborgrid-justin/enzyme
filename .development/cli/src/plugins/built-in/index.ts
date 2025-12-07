/**
 * @file Built-in plugins export
 * @module plugins/built-in
 */

export { templatesPlugin, registerTemplate, getTemplatePath, listTemplates, hasTemplate } from './templates.js';
export { validationPlugin, validateNamingConvention, validateFileName, validateDirectoryPath } from './validation.js';
export {
  gitPlugin,
  isGitAvailable,
  isGitRepository,
  initGitRepository,
  getGitStatus,
  getCurrentBranch,
  isWorkingDirectoryClean,
  addFiles,
  commit,
  createTag,
} from './git.js';

import { templatesPlugin } from './templates.js';
import { validationPlugin } from './validation.js';
import { gitPlugin } from './git.js';
import { Plugin } from '../../types/index.js';

/**
 * Get all built-in plugins
 */
export function getBuiltInPlugins(): Plugin[] {
  return [templatesPlugin, validationPlugin, gitPlugin];
}
