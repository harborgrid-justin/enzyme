/**
 * @file Git Integration Extension
 * @description Comprehensive git integration for development tooling and admin interfaces
 *
 * Features:
 * 1. Repository Status - track git status for UI display
 * 2. Branch Info - current branch, remote tracking
 * 3. Commit History - recent commits for display
 * 4. Changed Files - list of modified files
 * 5. Diff Visualization - file diffs for review
 * 6. Auto-staging - automatic file staging
 * 7. Commit Templates - conventional commit formatting
 * 8. Branch Protection - prevent commits to protected branches
 * 9. Hook Integration - pre-commit, post-commit hooks
 * 10. Conflict Detection - detect merge conflicts
 *
 * @version 2.0.0
 */

import type { EnzymeExtension } from '../types.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Git repository status
 */
export interface GitStatus {
  /** Current branch name */
  branch: string;
  /** Is working directory clean */
  clean: boolean;
  /** Staged files */
  staged: string[];
  /** Modified files */
  modified: string[];
  /** Untracked files */
  untracked: string[];
  /** Deleted files */
  deleted: string[];
  /** Conflicted files */
  conflicted: string[];
  /** Ahead/behind remote */
  ahead: number;
  behind: number;
  /** Remote tracking branch */
  remote?: string;
}

/**
 * Branch information
 */
export interface BranchInfo {
  /** Current branch name */
  current: string;
  /** All local branches */
  local: string[];
  /** All remote branches */
  remote: string[];
  /** Remote tracking info */
  tracking?: {
    remote: string;
    branch: string;
    ahead: number;
    behind: number;
  };
  /** Is detached HEAD */
  detached: boolean;
}

/**
 * Git commit information
 */
export interface GitCommit {
  /** Commit hash */
  hash: string;
  /** Short hash */
  shortHash: string;
  /** Commit message */
  message: string;
  /** Author name */
  author: string;
  /** Author email */
  email: string;
  /** Commit date */
  date: Date;
  /** Relative time (e.g., "2 hours ago") */
  relativeTime: string;
  /** Changed files count */
  filesChanged?: number;
  /** Insertions count */
  insertions?: number;
  /** Deletions count */
  deletions?: number;
}

/**
 * Changed file information
 */
export interface ChangedFile {
  /** File path */
  path: string;
  /** Change status (M, A, D, R, C, U) */
  status: 'M' | 'A' | 'D' | 'R' | 'C' | 'U';
  /** Status description */
  statusText: string;
  /** Is staged */
  staged: boolean;
  /** Insertions count */
  insertions?: number;
  /** Deletions count */
  deletions?: number;
}

/**
 * File diff information
 */
export interface FileDiff {
  /** File path */
  path: string;
  /** Diff content */
  diff: string;
  /** Old file path (for renames) */
  oldPath?: string;
  /** Change type */
  type: 'add' | 'modify' | 'delete' | 'rename' | 'copy';
  /** Hunks (sections of changes) */
  hunks: DiffHunk[];
  /** Total additions */
  additions: number;
  /** Total deletions */
  deletions: number;
}

/**
 * Diff hunk (section of changes)
 */
export interface DiffHunk {
  /** Old file start line */
  oldStart: number;
  /** Old file line count */
  oldLines: number;
  /** New file start line */
  newStart: number;
  /** New file line count */
  newLines: number;
  /** Hunk header */
  header: string;
  /** Lines in this hunk */
  lines: DiffLine[];
}

/**
 * Diff line
 */
export interface DiffLine {
  /** Line type (add, delete, context) */
  type: '+' | '-' | ' ';
  /** Line content */
  content: string;
  /** Old line number */
  oldLineNumber?: number;
  /** New line number */
  newLineNumber?: number;
}

/**
 * Commit options
 */
export interface CommitOptions {
  /** Commit message */
  message: string;
  /** Commit description (body) */
  description?: string;
  /** Commit type for conventional commits */
  type?: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'perf' | 'test' | 'build' | 'ci' | 'chore';
  /** Commit scope */
  scope?: string;
  /** Breaking change indicator */
  breaking?: boolean;
  /** Co-authors */
  coAuthors?: string[];
  /** Allow empty commit */
  allowEmpty?: boolean;
  /** Skip hooks */
  noVerify?: boolean;
  /** GPG sign */
  sign?: boolean;
}

/**
 * Git hook type
 */
export type GitHookType =
  | 'pre-commit'
  | 'post-commit'
  | 'pre-push'
  | 'post-merge'
  | 'pre-rebase'
  | 'post-checkout';

/**
 * Git hook handler
 */
export type GitHookHandler = (context: GitHookContext) => Promise<boolean | void> | boolean | void;

/**
 * Git hook context
 */
export interface GitHookContext {
  /** Hook type */
  hook: GitHookType;
  /** Current git status */
  status?: GitStatus;
  /** Changed files (for pre-commit) */
  files?: ChangedFile[];
  /** Abort the operation */
  abort: (reason: string) => void;
}

/**
 * Branch protection rule
 */
export interface BranchProtectionRule {
  /** Branch pattern (glob) */
  pattern: string;
  /** Allow direct commits */
  allowCommits?: boolean;
  /** Require pull request */
  requirePR?: boolean;
  /** Custom validation */
  validate?: (branch: string) => boolean | Promise<boolean>;
  /** Error message */
  message?: string;
}

// ============================================================================
// Internal State
// ============================================================================

/** Git status cache */
let statusCache: GitStatus | null = null;
let statusCacheTime = 0;
const STATUS_CACHE_TTL = 5000; // 5 seconds

/** Branch info cache */
let branchCache: BranchInfo | null = null;
let branchCacheTime = 0;
const BRANCH_CACHE_TTL = 10000; // 10 seconds

/** Registered git hooks */
const gitHooks = new Map<GitHookType, GitHookHandler[]>();

/** Branch protection rules */
const protectionRules: BranchProtectionRule[] = [
  {
    pattern: 'main',
    allowCommits: false,
    requirePR: true,
    message: 'Direct commits to main branch are not allowed. Please create a pull request.',
  },
  {
    pattern: 'master',
    allowCommits: false,
    requirePR: true,
    message: 'Direct commits to master branch are not allowed. Please create a pull request.',
  },
  {
    pattern: 'production',
    allowCommits: false,
    requirePR: true,
    message: 'Direct commits to production branch are not allowed. Please create a pull request.',
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Execute git command
 */
async function execGit(args: string[]): Promise<string> {
  try {
    // Dynamic import to avoid hard dependency
    const { execSync } = await import('child_process');
    const result = execSync(`git ${args.join(' ')}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Git command failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Check if we're in a git repository
 */
async function isGitRepository(): Promise<boolean> {
  try {
    await execGit(['rev-parse', '--is-inside-work-tree']);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse git status output
 */
function parseGitStatus(output: string): Partial<GitStatus> {
  const lines = output.split('\n').filter(line => line.trim());
  const status: Partial<GitStatus> = {
    staged: [],
    modified: [],
    untracked: [],
    deleted: [],
    conflicted: [],
  };

  for (const line of lines) {
    const statusCode = line.substring(0, 2);
    const filePath = line.substring(3);

    if (statusCode.includes('?')) {
      status.untracked?.push(filePath);
    } else if (statusCode.includes('U') || statusCode.includes('A') && statusCode.includes('A')) {
      status.conflicted?.push(filePath);
    } else if (statusCode[0] !== ' ' && statusCode[0] !== '?') {
      status.staged?.push(filePath);
    } else if (statusCode[1] === 'M') {
      status.modified?.push(filePath);
    } else if (statusCode[1] === 'D') {
      status.deleted?.push(filePath);
    }
  }

  return status;
}

/**
 * Get relative time string
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffYear > 0) return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`;
  if (diffMonth > 0) return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
  if (diffWeek > 0) return `${diffWeek} week${diffWeek > 1 ? 's' : ''} ago`;
  if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  return 'just now';
}

/**
 * Format conventional commit message
 */
function formatConventionalCommit(options: CommitOptions): string {
  let message = '';

  if (options.type) {
    message += options.type;
    if (options.scope) {
      message += `(${options.scope})`;
    }
    if (options.breaking) {
      message += '!';
    }
    message += ': ';
  }

  message += options.message;

  if (options.description) {
    message += `\n\n${options.description}`;
  }

  if (options.breaking) {
    message += '\n\nBREAKING CHANGE: ';
  }

  if (options.coAuthors && options.coAuthors.length > 0) {
    message += '\n\n';
    for (const coAuthor of options.coAuthors) {
      message += `Co-authored-by: ${coAuthor}\n`;
    }
  }

  return message;
}

/**
 * Check branch protection
 */
async function checkBranchProtection(branch: string): Promise<{ allowed: boolean; message?: string }> {
  for (const rule of protectionRules) {
    // Simple glob matching (can be enhanced with a proper glob library)
    const pattern = rule.pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${pattern}$`);

    if (regex.test(branch)) {
      if (!rule.allowCommits) {
        return {
          allowed: false,
          message: rule.message || `Commits to ${branch} are not allowed`,
        };
      }

      if (rule.validate) {
        const valid = await rule.validate(branch);
        if (!valid) {
          return {
            allowed: false,
            message: rule.message || `Custom validation failed for ${branch}`,
          };
        }
      }
    }
  }

  return { allowed: true };
}

/**
 * Execute git hooks
 */
async function executeHooks(hookType: GitHookType, context: Omit<GitHookContext, 'hook' | 'abort'>): Promise<boolean> {
  const handlers = gitHooks.get(hookType) || [];
  let aborted = false;
  let abortReason = '';

  const hookContext: GitHookContext = {
    ...context,
    hook: hookType,
    abort: (reason: string) => {
      aborted = true;
      abortReason = reason;
    },
  };

  for (const handler of handlers) {
    const result = await handler(hookContext);
    if (result === false || aborted) {
      if (process.env.ENZYME_DEBUG) {
        console.error(`Git hook ${hookType} aborted: ${abortReason || 'Handler returned false'}`);
      }
      return false;
    }
  }

  return true;
}

/**
 * Parse diff hunks
 */
function parseDiffHunks(diff: string): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  const lines = diff.split('\n');
  let currentHunk: DiffHunk | null = null;

  for (const line of lines) {
    // Match hunk header: @@ -oldStart,oldLines +newStart,newLines @@
    const hunkHeaderMatch = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@(.*)$/);
    if (hunkHeaderMatch) {
      if (currentHunk) {
        hunks.push(currentHunk);
      }

      currentHunk = {
        oldStart: parseInt(hunkHeaderMatch[1], 10),
        oldLines: hunkHeaderMatch[2] ? parseInt(hunkHeaderMatch[2], 10) : 1,
        newStart: parseInt(hunkHeaderMatch[3], 10),
        newLines: hunkHeaderMatch[4] ? parseInt(hunkHeaderMatch[4], 10) : 1,
        header: line,
        lines: [],
      };
      continue;
    }

    if (currentHunk && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))) {
      const type = line[0] as '+' | '-' | ' ';
      currentHunk.lines.push({
        type,
        content: line.substring(1),
        oldLineNumber: type !== '+' ? currentHunk.oldStart + currentHunk.lines.filter(l => l.type !== '+').length : undefined,
        newLineNumber: type !== '-' ? currentHunk.newStart + currentHunk.lines.filter(l => l.type !== '-').length : undefined,
      });
    }
  }

  if (currentHunk) {
    hunks.push(currentHunk);
  }

  return hunks;
}

// ============================================================================
// Core Git Functions
// ============================================================================

/**
 * Get git repository status
 */
async function getGitStatus(useCache = true): Promise<GitStatus> {
  if (!await isGitRepository()) {
    throw new Error('Not a git repository');
  }

  // Check cache
  if (useCache && statusCache && Date.now() - statusCacheTime < STATUS_CACHE_TTL) {
    return statusCache;
  }

  try {
    // Get current branch
    const branch = await execGit(['rev-parse', '--abbrev-ref', 'HEAD']);

    // Get status in short format
    const statusOutput = await execGit(['status', '--short', '--branch']);
    const statusLines = statusOutput.split('\n');

    // Parse branch info from first line
    const branchLine = statusLines[0];
    let ahead = 0;
    let behind = 0;
    let remote: string | undefined;

    const aheadMatch = branchLine.match(/ahead (\d+)/);
    const behindMatch = branchLine.match(/behind (\d+)/);
    const remoteMatch = branchLine.match(/\.\.\.([^\s]+)/);

    if (aheadMatch) ahead = parseInt(aheadMatch[1], 10);
    if (behindMatch) behind = parseInt(behindMatch[1], 10);
    if (remoteMatch) remote = remoteMatch[1];

    // Parse file status
    const fileStatus = parseGitStatus(statusLines.slice(1).join('\n'));

    const status: GitStatus = {
      branch,
      clean: !fileStatus.staged?.length && !fileStatus.modified?.length && !fileStatus.deleted?.length && !fileStatus.untracked?.length,
      staged: fileStatus.staged || [],
      modified: fileStatus.modified || [],
      untracked: fileStatus.untracked || [],
      deleted: fileStatus.deleted || [],
      conflicted: fileStatus.conflicted || [],
      ahead,
      behind,
      remote,
    };

    // Update cache
    statusCache = status;
    statusCacheTime = Date.now();

    return status;
  } catch (error) {
    throw new Error(`Failed to get git status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get current branch information
 */
async function getCurrentBranch(): Promise<string> {
  if (!await isGitRepository()) {
    throw new Error('Not a git repository');
  }

  try {
    return await execGit(['rev-parse', '--abbrev-ref', 'HEAD']);
  } catch (error) {
    throw new Error(`Failed to get current branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get branch information
 */
async function getBranchInfo(useCache = true): Promise<BranchInfo> {
  if (!await isGitRepository()) {
    throw new Error('Not a git repository');
  }

  // Check cache
  if (useCache && branchCache && Date.now() - branchCacheTime < BRANCH_CACHE_TTL) {
    return branchCache;
  }

  try {
    const current = await getCurrentBranch();
    const detached = current === 'HEAD';

    // Get local branches
    const localOutput = await execGit(['branch', '--format=%(refname:short)']);
    const local = localOutput.split('\n').filter(b => b.trim());

    // Get remote branches
    let remote: string[] = [];
    try {
      const remoteOutput = await execGit(['branch', '-r', '--format=%(refname:short)']);
      remote = remoteOutput.split('\n').filter(b => b.trim());
    } catch {
      // No remotes configured
    }

    // Get tracking info
    let tracking: BranchInfo['tracking'];
    if (!detached) {
      try {
        const trackingBranch = await execGit(['rev-parse', '--abbrev-ref', `${current}@{upstream}`]);
        const [remoteName, branchName] = trackingBranch.split('/');

        const status = await getGitStatus(false);
        tracking = {
          remote: remoteName,
          branch: branchName,
          ahead: status.ahead,
          behind: status.behind,
        };
      } catch {
        // No tracking branch
      }
    }

    const branchInfo: BranchInfo = {
      current,
      local,
      remote,
      tracking,
      detached,
    };

    // Update cache
    branchCache = branchInfo;
    branchCacheTime = Date.now();

    return branchInfo;
  } catch (error) {
    throw new Error(`Failed to get branch info: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get recent commits
 */
async function getRecentCommits(count = 10): Promise<GitCommit[]> {
  if (!await isGitRepository()) {
    throw new Error('Not a git repository');
  }

  try {
    const format = '%H%n%h%n%s%n%an%n%ae%n%at';
    const output = await execGit(['log', `-${count}`, `--format=${format}`, '--']);

    const commits: GitCommit[] = [];
    const lines = output.split('\n');

    for (let i = 0; i < lines.length; i += 6) {
      if (i + 5 < lines.length) {
        const timestamp = parseInt(lines[i + 5], 10) * 1000;
        const date = new Date(timestamp);

        commits.push({
          hash: lines[i],
          shortHash: lines[i + 1],
          message: lines[i + 2],
          author: lines[i + 3],
          email: lines[i + 4],
          date,
          relativeTime: getRelativeTime(date),
        });
      }
    }

    return commits;
  } catch (error) {
    throw new Error(`Failed to get recent commits: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get changed files
 */
async function getChangedFiles(): Promise<ChangedFile[]> {
  if (!await isGitRepository()) {
    throw new Error('Not a git repository');
  }

  try {
    const status = await getGitStatus(false);
    const files: ChangedFile[] = [];

    // Staged files
    for (const path of status.staged) {
      files.push({
        path,
        status: 'M',
        statusText: 'Modified',
        staged: true,
      });
    }

    // Modified files
    for (const path of status.modified) {
      files.push({
        path,
        status: 'M',
        statusText: 'Modified',
        staged: false,
      });
    }

    // Deleted files
    for (const path of status.deleted) {
      files.push({
        path,
        status: 'D',
        statusText: 'Deleted',
        staged: false,
      });
    }

    // Untracked files
    for (const path of status.untracked) {
      files.push({
        path,
        status: 'A',
        statusText: 'Added',
        staged: false,
      });
    }

    // Conflicted files
    for (const path of status.conflicted) {
      files.push({
        path,
        status: 'U',
        statusText: 'Conflicted',
        staged: false,
      });
    }

    return files;
  } catch (error) {
    throw new Error(`Failed to get changed files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get file diff
 */
async function getDiff(file?: string): Promise<FileDiff | FileDiff[]> {
  if (!await isGitRepository()) {
    throw new Error('Not a git repository');
  }

  try {
    const args = ['diff', '--unified=3'];
    if (file) {
      args.push('--', file);
    }

    const diffOutput = await execGit(args);

    if (!diffOutput) {
      return file ? { path: file, diff: '', type: 'modify', hunks: [], additions: 0, deletions: 0 } : [];
    }

    // Parse diff output
    const diffs: FileDiff[] = [];
    const fileSections = diffOutput.split(/^diff --git /m).filter(s => s.trim());

    for (const section of fileSections) {
      const lines = section.split('\n');
      const firstLine = `diff --git ${lines[0]}`;

      // Extract file paths
      const pathMatch = firstLine.match(/a\/(.+) b\/(.+)/);
      if (!pathMatch) continue;

      const oldPath = pathMatch[1];
      const newPath = pathMatch[2];

      // Determine change type
      let type: FileDiff['type'] = 'modify';
      if (section.includes('new file mode')) type = 'add';
      else if (section.includes('deleted file mode')) type = 'delete';
      else if (section.includes('rename from')) type = 'rename';
      else if (section.includes('copy from')) type = 'copy';

      // Parse hunks
      const hunkSection = section.substring(section.indexOf('@@'));
      const hunks = parseDiffHunks(hunkSection);

      // Count additions and deletions
      let additions = 0;
      let deletions = 0;
      for (const hunk of hunks) {
        for (const line of hunk.lines) {
          if (line.type === '+') additions++;
          else if (line.type === '-') deletions++;
        }
      }

      diffs.push({
        path: newPath,
        oldPath: oldPath !== newPath ? oldPath : undefined,
        diff: section,
        type,
        hunks,
        additions,
        deletions,
      });
    }

    return file ? (diffs[0] || { path: file, diff: '', type: 'modify', hunks: [], additions: 0, deletions: 0 }) : diffs;
  } catch (error) {
    throw new Error(`Failed to get diff: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Stage a file
 */
async function stageFile(file: string): Promise<void> {
  if (!await isGitRepository()) {
    throw new Error('Not a git repository');
  }

  try {
    await execGit(['add', '--', file]);

    // Clear status cache
    statusCache = null;

    if (process.env.ENZYME_DEBUG) {
      console.log(`Staged file: ${file}`);
    }
  } catch (error) {
    throw new Error(`Failed to stage file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Stage all files
 */
async function stageAll(): Promise<void> {
  if (!await isGitRepository()) {
    throw new Error('Not a git repository');
  }

  try {
    await execGit(['add', '-A']);

    // Clear status cache
    statusCache = null;

    if (process.env.ENZYME_DEBUG) {
      console.log('Staged all files');
    }
  } catch (error) {
    throw new Error(`Failed to stage all files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Unstage a file
 */
async function unstageFile(file: string): Promise<void> {
  if (!await isGitRepository()) {
    throw new Error('Not a git repository');
  }

  try {
    await execGit(['reset', 'HEAD', '--', file]);

    // Clear status cache
    statusCache = null;

    if (process.env.ENZYME_DEBUG) {
      console.log(`Unstaged file: ${file}`);
    }
  } catch (error) {
    throw new Error(`Failed to unstage file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a commit
 */
async function createCommit(messageOrOptions: string | CommitOptions): Promise<string> {
  if (!await isGitRepository()) {
    throw new Error('Not a git repository');
  }

  try {
    // Parse options
    const options: CommitOptions = typeof messageOrOptions === 'string'
      ? { message: messageOrOptions }
      : messageOrOptions;

    // Check branch protection
    const currentBranch = await getCurrentBranch();
    const protection = await checkBranchProtection(currentBranch);
    if (!protection.allowed) {
      throw new Error(protection.message || 'Commits to this branch are not allowed');
    }

    // Get changed files for hooks
    const files = await getChangedFiles();
    const status = await getGitStatus(false);

    // Execute pre-commit hooks
    const preCommitAllowed = await executeHooks('pre-commit', { status, files });
    if (!preCommitAllowed) {
      throw new Error('Pre-commit hook rejected the commit');
    }

    // Format commit message
    const message = options.type ? formatConventionalCommit(options) : options.message;

    // Build git commit command
    const args = ['commit', '-m', message];
    if (options.allowEmpty) args.push('--allow-empty');
    if (options.noVerify) args.push('--no-verify');
    if (options.sign) args.push('--gpg-sign');

    // Execute commit
    const output = await execGit(args);

    // Extract commit hash
    const hashMatch = output.match(/\[.+ ([a-f0-9]+)\]/);
    const hash = hashMatch ? hashMatch[1] : '';

    // Clear caches
    statusCache = null;
    branchCache = null;

    // Execute post-commit hooks
    await executeHooks('post-commit', { status, files });

    if (process.env.ENZYME_DEBUG) {
      console.log(`Created commit: ${hash}`);
    }

    return hash;
  } catch (error) {
    throw new Error(`Failed to create commit: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if working directory is clean
 */
async function isCleanWorkingDir(): Promise<boolean> {
  if (!await isGitRepository()) {
    return false;
  }

  try {
    const status = await getGitStatus();
    return status.clean;
  } catch {
    return false;
  }
}

/**
 * Detect merge conflicts
 */
async function detectConflicts(): Promise<string[]> {
  if (!await isGitRepository()) {
    return [];
  }

  try {
    const status = await getGitStatus(false);
    return status.conflicted;
  } catch {
    return [];
  }
}

/**
 * Add branch protection rule
 */
function addBranchProtection(rule: BranchProtectionRule): void {
  protectionRules.push(rule);
}

/**
 * Remove branch protection rule
 */
function removeBranchProtection(pattern: string): boolean {
  const index = protectionRules.findIndex(rule => rule.pattern === pattern);
  if (index !== -1) {
    protectionRules.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Register git hook
 */
function registerHook(hookType: GitHookType, handler: GitHookHandler): void {
  const handlers = gitHooks.get(hookType) || [];
  handlers.push(handler);
  gitHooks.set(hookType, handlers);
}

/**
 * Unregister git hook
 */
function unregisterHook(hookType: GitHookType, handler: GitHookHandler): boolean {
  const handlers = gitHooks.get(hookType);
  if (!handlers) return false;

  const index = handlers.indexOf(handler);
  if (index !== -1) {
    handlers.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Clear all caches
 */
function clearCaches(): void {
  statusCache = null;
  branchCache = null;
  statusCacheTime = 0;
  branchCacheTime = 0;
}

// ============================================================================
// Extension Export
// ============================================================================

/**
 * Comprehensive Git Integration Extension
 *
 * @example
 * ```typescript
 * import { gitExtension } from '@/lib/extensions/built-in/git';
 *
 * // In your app
 * const enzyme = createEnzyme().$extends(gitExtension);
 *
 * // Use git methods
 * const status = await enzyme.$getGitStatus();
 * const commits = await enzyme.$getRecentCommits(20);
 * await enzyme.$stageFile('src/app.ts');
 * await enzyme.$createCommit({
 *   type: 'feat',
 *   scope: 'ui',
 *   message: 'add dark mode support',
 *   breaking: false,
 * });
 *
 * // Register hooks
 * enzyme.$registerGitHook('pre-commit', async (context) => {
 *   // Run linting, tests, etc.
 *   console.log('Pre-commit hook:', context.files?.length, 'files');
 *   return true; // Allow commit
 * });
 *
 * // Add branch protection
 * enzyme.$addBranchProtection({
 *   pattern: 'release/*',
 *   allowCommits: false,
 *   message: 'Release branches are protected',
 * });
 * ```
 */
export const gitExtension: EnzymeExtension = {
  name: 'enzyme:git',
  version: '2.0.0',
  description: 'Comprehensive git integration for development tooling and admin interfaces',

  client: {
    /**
     * Get repository status
     * @returns Current git status
     */
    async $getGitStatus(useCache = true): Promise<GitStatus | null> {
      try {
        return await getGitStatus(useCache);
      } catch (error) {
        if (process.env.ENZYME_DEBUG) {
          console.warn('Git status unavailable:', error);
        }
        return null;
      }
    },

    /**
     * Get current branch name
     * @returns Current branch name
     */
    async $getCurrentBranch(): Promise<string | null> {
      try {
        return await getCurrentBranch();
      } catch (error) {
        if (process.env.ENZYME_DEBUG) {
          console.warn('Git branch unavailable:', error);
        }
        return null;
      }
    },

    /**
     * Get branch information
     * @returns Branch information
     */
    async $getBranchInfo(useCache = true): Promise<BranchInfo | null> {
      try {
        return await getBranchInfo(useCache);
      } catch (error) {
        if (process.env.ENZYME_DEBUG) {
          console.warn('Git branch info unavailable:', error);
        }
        return null;
      }
    },

    /**
     * Get recent commits
     * @param count - Number of commits to retrieve (default: 10)
     * @returns Array of commits
     */
    async $getRecentCommits(count = 10): Promise<GitCommit[]> {
      try {
        return await getRecentCommits(count);
      } catch (error) {
        if (process.env.ENZYME_DEBUG) {
          console.warn('Git commits unavailable:', error);
        }
        return [];
      }
    },

    /**
     * Get changed files
     * @returns Array of changed files
     */
    async $getChangedFiles(): Promise<ChangedFile[]> {
      try {
        return await getChangedFiles();
      } catch (error) {
        if (process.env.ENZYME_DEBUG) {
          console.warn('Git changed files unavailable:', error);
        }
        return [];
      }
    },

    /**
     * Get file diff
     * @param file - File path (optional, if not provided returns all diffs)
     * @returns File diff or array of diffs
     */
    async $getDiff(file?: string): Promise<FileDiff | FileDiff[] | null> {
      try {
        return await getDiff(file);
      } catch (error) {
        if (process.env.ENZYME_DEBUG) {
          console.warn('Git diff unavailable:', error);
        }
        return null;
      }
    },

    /**
     * Stage a file
     * @param file - File path to stage
     */
    async $stageFile(file: string): Promise<void> {
      await stageFile(file);
    },

    /**
     * Stage all files
     */
    async $stageAll(): Promise<void> {
      await stageAll();
    },

    /**
     * Unstage a file
     * @param file - File path to unstage
     */
    async $unstageFile(file: string): Promise<void> {
      await unstageFile(file);
    },

    /**
     * Create a commit
     * @param messageOrOptions - Commit message or options
     * @returns Commit hash
     */
    async $createCommit(messageOrOptions: string | CommitOptions): Promise<string> {
      return await createCommit(messageOrOptions);
    },

    /**
     * Check if working directory is clean
     * @returns True if clean, false otherwise
     */
    async $isCleanWorkingDir(): Promise<boolean> {
      return await isCleanWorkingDir();
    },

    /**
     * Detect merge conflicts
     * @returns Array of conflicted file paths
     */
    async $detectConflicts(): Promise<string[]> {
      return await detectConflicts();
    },

    /**
     * Check if in a git repository
     * @returns True if in a git repository
     */
    async $isGitRepository(): Promise<boolean> {
      return await isGitRepository();
    },

    /**
     * Add branch protection rule
     * @param rule - Protection rule
     */
    $addBranchProtection(rule: BranchProtectionRule): void {
      addBranchProtection(rule);
    },

    /**
     * Remove branch protection rule
     * @param pattern - Branch pattern
     * @returns True if removed, false if not found
     */
    $removeBranchProtection(pattern: string): boolean {
      return removeBranchProtection(pattern);
    },

    /**
     * Register git hook handler
     * @param hookType - Hook type
     * @param handler - Hook handler
     */
    $registerGitHook(hookType: GitHookType, handler: GitHookHandler): void {
      registerHook(hookType, handler);
    },

    /**
     * Unregister git hook handler
     * @param hookType - Hook type
     * @param handler - Hook handler
     * @returns True if removed, false if not found
     */
    $unregisterGitHook(hookType: GitHookType, handler: GitHookHandler): boolean {
      return unregisterHook(hookType, handler);
    },

    /**
     * Clear git caches
     */
    $clearGitCaches(): void {
      clearCaches();
    },
  },

  state: {
    initialState: {
      gitStatus: null as GitStatus | null,
      gitBranch: null as string | null,
      gitConflicts: [] as string[],
    },
  },

  hooks: {
    async onInit() {
      if (process.env.ENZYME_DEBUG) {
        console.log('Git extension initialized');
      }

      // Check if git is available
      const isGit = await isGitRepository();
      if (!isGit && process.env.ENZYME_DEBUG) {
        console.warn('Git repository not detected. Git features will be unavailable.');
      }
    },
  },
};
