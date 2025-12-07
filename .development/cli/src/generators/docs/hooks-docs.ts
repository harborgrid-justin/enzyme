/**
 * Hooks Reference Generator
 * Generates comprehensive documentation for custom React hooks
 */

import * as path from 'path';
import { createParser, ParsedHook } from './parser';
import {
  heading,
  paragraph,
  codeBlock,
  parametersTable,
  deprecationNotice,
  generateTOC,
  TOCItem,
  writeDocFile,
  findFiles,
  groupBy,
  logger,
  formatExample,
  formatType,
  horizontalRule,
  inlineCode,
  list,
  frontmatter,
  crossReference,
} from './utils';
import { DocsConfig } from './index';

interface HookDoc {
  name: string;
  hook: ParsedHook;
  category: string;
}

/**
 * Generate hooks documentation
 */
export async function generateHooksDocs(config: DocsConfig): Promise<void> {
  logger.info('Generating hooks documentation...');

  // Find all hook files
  const files = await findFiles(
    path.join(config.projectRoot, config.srcDir),
    /\.(ts|tsx)$/,
    [/node_modules/, /\.test\./, /\.spec\./]
  );

  logger.info(`Scanning ${files.length} files for hooks...`);

  // Parse hooks
  const parser = createParser();
  const hooks: HookDoc[] = [];

  for (const file of files) {
    const symbols = parser.parseFile(file);

    for (const symbol of symbols) {
      if (symbol.kind === 'hook') {
        const hook = symbol as ParsedHook;
        const category = getHookCategory(file, config.srcDir);

        hooks.push({
          name: hook.name,
          hook,
          category,
        });
      }
    }
  }

  logger.info(`Found ${hooks.length} custom hooks`);

  // Group by category
  const grouped = groupBy(hooks, (h) => h.category);

  // Generate index page
  await generateHooksIndexPage(grouped, config);

  // Generate individual hook docs
  for (const hookDoc of hooks) {
    await generateSingleHookDoc(hookDoc, config);
  }

  logger.success('Hooks documentation generated successfully!');
}

/**
 * Get hook category from file path
 */
function getHookCategory(filePath: string, srcDir: string): string {
  const relative = path.relative(srcDir, filePath);
  const parts = relative.split(path.sep);

  // Try to extract category from path
  if (parts.includes('hooks')) {
    const idx = parts.indexOf('hooks');
    if (parts.length > idx + 1 && parts[idx + 1] !== 'index.ts') {
      // Get subdirectory or determine by hook name
      const fileName = path.parse(filePath).name;

      // Categorize by common patterns
      if (fileName.includes('State') || fileName.includes('Store')) return 'state';
      if (fileName.includes('Query') || fileName.includes('Data')) return 'data';
      if (fileName.includes('Auth')) return 'auth';
      if (fileName.includes('Route') || fileName.includes('Navigate')) return 'routing';
      if (fileName.includes('Performance') || fileName.includes('Optimiz')) return 'performance';
      if (fileName.includes('Effect') || fileName.includes('Lifecycle')) return 'lifecycle';
    }
  }

  return 'general';
}

/**
 * Generate hooks index page
 */
async function generateHooksIndexPage(
  grouped: Map<string, HookDoc[]>,
  config: DocsConfig
): Promise<void> {
  let content = '';

  // Frontmatter
  content += frontmatter({
    title: 'Hooks Reference',
    description: 'Complete hooks documentation for enzyme framework',
    generated: new Date().toISOString(),
  });

  // Title
  content += heading(1, 'Hooks Reference');
  content += paragraph(
    'Complete documentation for all custom React hooks in the enzyme framework.'
  );

  // Statistics
  const totalHooks = Array.from(grouped.values()).reduce(
    (sum, hooks) => sum + hooks.length,
    0
  );
  content += paragraph(`**Total Custom Hooks**: ${totalHooks}`);

  // Introduction
  content += heading(2, 'What are Custom Hooks?');
  content += paragraph(
    'Custom hooks are JavaScript functions that use React hooks to encapsulate and reuse stateful logic. ' +
      'They follow the naming convention of starting with "use" and can call other hooks.'
  );

  // Table of contents by category
  content += heading(2, 'Categories');

  for (const [category, hooks] of grouped) {
    content += heading(3, capitalize(category));

    const hookLinks = hooks
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((doc) => {
        const deprecated = doc.hook.deprecated ? ' (deprecated)' : '';
        const description = doc.hook.documentation.split('\n')[0] || 'No description';
        return `[\`${doc.name}\`](./${category}/${doc.name}.md) - ${description}${deprecated}`;
      });

    content += list(hookLinks);
  }

  // Quick start guide
  content += heading(2, 'Quick Start');
  content += paragraph('Import hooks from the enzyme framework:');
  content += codeBlock(
    `import { useGlobalStore, useAuth, useQuery } from '@missionfabric-js/enzyme/hooks';

function MyComponent() {
  // Use global state
  const [state, setState] = useGlobalStore();

  // Use authentication
  const { user, isAuthenticated } = useAuth();

  // Fetch data with queries
  const { data, loading, error } = useQuery('users', fetchUsers);

  // Your component logic...
}`
  );

  // Best practices
  content += heading(2, 'Best Practices');
  const bestPractices = [
    'Always call hooks at the top level of your component',
    'Only call hooks from React functions (components or custom hooks)',
    'Name custom hooks starting with "use" to follow convention',
    'Extract repeated logic into custom hooks for reusability',
    'Keep hooks focused on a single concern',
    'Document your custom hooks with JSDoc comments',
  ];
  content += list(bestPractices);

  // Write index file
  await writeDocFile(path.join(config.outputDir, 'index.md'), content);
}

/**
 * Generate documentation for a single hook
 */
async function generateSingleHookDoc(
  doc: HookDoc,
  config: DocsConfig
): Promise<void> {
  const { name, hook, category } = doc;
  let content = '';

  // Frontmatter
  content += frontmatter({
    title: name,
    category,
    type: 'hook',
    generated: new Date().toISOString(),
  });

  // Title
  content += heading(1, name);

  // Deprecation notice
  if (hook.deprecated) {
    content += deprecationNotice(hook.deprecated);
  }

  // Description
  if (hook.documentation) {
    content += paragraph(hook.documentation);
  }

  // Generate TOC
  const tocItems: TOCItem[] = [
    { title: 'Signature', anchor: 'signature', level: 2 },
    { title: 'Parameters', anchor: 'parameters', level: 2 },
    { title: 'Returns', anchor: 'returns', level: 2 },
  ];

  if (hook.dependencies.length > 0) {
    tocItems.push({ title: 'Dependencies', anchor: 'dependencies', level: 2 });
  }

  if (hook.examples.length > 0) {
    tocItems.push({ title: 'Examples', anchor: 'examples', level: 2 });
  }

  tocItems.push({ title: 'Usage Tips', anchor: 'usage-tips', level: 2 });

  content += generateTOC(tocItems);

  // Signature section
  content += heading(2, 'Signature');

  const params = hook.parameters
    .map((p) => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
    .join(', ');
  const signature = `function ${name}(${params}): ${hook.returnType}`;

  content += codeBlock(signature);

  // Parameters section
  content += heading(2, 'Parameters');

  if (hook.parameters.length > 0) {
    content += parametersTable(hook.parameters);
  } else {
    content += paragraph('This hook does not accept any parameters.');
  }

  // Returns section
  content += heading(2, 'Returns');
  content += paragraph(inlineCode(formatType(hook.returnType)));

  if (hook.tags.returns) {
    content += paragraph(hook.tags.returns);
  }

  // Dependencies section
  if (hook.dependencies.length > 0) {
    content += heading(2, 'Dependencies');
    content += paragraph('This hook internally uses the following hooks:');

    const depLinks = hook.dependencies.map((dep) => {
      // Check if it's a custom hook (starts with 'use')
      if (dep.startsWith('use') && !isReactBuiltInHook(dep)) {
        return crossReference('hook', dep, '..');
      }
      return inlineCode(dep);
    });

    content += list(depLinks);
  }

  // Examples section
  if (hook.examples.length > 0) {
    content += heading(2, 'Examples');

    for (let i = 0; i < hook.examples.length; i++) {
      if (hook.examples.length > 1) {
        content += heading(3, `Example ${i + 1}`);
      }
      content += formatExample(hook.examples[i], 'tsx');
    }
  }

  // Usage tips
  content += heading(2, 'Usage Tips');
  content += generateHookUsageTips(hook);

  // Common patterns
  content += heading(2, 'Common Patterns');
  content += generateCommonPatterns(hook);

  // Troubleshooting
  content += heading(2, 'Troubleshooting');
  content += generateTroubleshooting(hook);

  // Source reference
  content += horizontalRule();
  content += paragraph(`**Source**: \`${hook.filePath}\``);

  if (hook.since) {
    content += paragraph(`**Since**: ${hook.since}`);
  }

  // Write hook file
  const outputPath = path.join(config.outputDir, category, `${name}.md`);
  await writeDocFile(outputPath, content);
}

/**
 * Generate usage tips for a hook
 */
function generateHookUsageTips(hook: ParsedHook): string {
  const tips: string[] = [];

  // General tip
  tips.push('Call this hook at the top level of your component or custom hook.');

  // Parameter-specific tips
  if (hook.parameters.length > 0) {
    const requiredParams = hook.parameters.filter((p) => !p.optional);
    if (requiredParams.length > 0) {
      tips.push(
        `This hook requires the following parameters: ${requiredParams.map((p) => inlineCode(p.name)).join(', ')}`
      );
    }

    const optionalParams = hook.parameters.filter((p) => p.optional);
    if (optionalParams.length > 0) {
      tips.push(
        `Optional parameters can be omitted: ${optionalParams.map((p) => inlineCode(p.name)).join(', ')}`
      );
    }
  }

  // Dependency-specific tips
  if (hook.dependencies.some((d) => d.includes('useEffect'))) {
    tips.push('This hook uses effects. Be aware of when it runs and re-runs.');
  }

  if (hook.dependencies.some((d) => d.includes('useState'))) {
    tips.push('This hook manages state. Updates will trigger re-renders.');
  }

  if (hook.dependencies.some((d) => d.includes('useCallback') || d.includes('useMemo'))) {
    tips.push('This hook uses memoization for performance optimization.');
  }

  return list(tips);
}

/**
 * Generate common patterns section
 */
function generateCommonPatterns(_hook: ParsedHook): string {
  let content = '';

  content += paragraph('Here are common ways to use this hook:');

  const patterns = [
    'Basic usage in a functional component',
    'Combining with other hooks for complex logic',
    'Using in custom hooks to build higher-level abstractions',
  ];

  content += list(patterns);

  return content;
}

/**
 * Generate troubleshooting section
 */
function generateTroubleshooting(_hook: ParsedHook): string {
  let content = '';

  content += paragraph('Common issues and solutions:');

  const issues = [
    '**Hook not updating**: Ensure dependencies are correctly specified',
    '**Unexpected re-renders**: Check if hook parameters are properly memoized',
    '**Stale closures**: Make sure callback functions have correct dependencies',
    '**Performance issues**: Consider using React DevTools Profiler to identify bottlenecks',
  ];

  content += list(issues);

  return content;
}

/**
 * Check if a hook is a React built-in hook
 */
function isReactBuiltInHook(hookName: string): boolean {
  const builtInHooks = [
    'useState',
    'useEffect',
    'useContext',
    'useReducer',
    'useCallback',
    'useMemo',
    'useRef',
    'useImperativeHandle',
    'useLayoutEffect',
    'useDebugValue',
    'useDeferredValue',
    'useTransition',
    'useId',
    'useSyncExternalStore',
    'useInsertionEffect',
  ];

  return builtInHooks.includes(hookName);
}

/**
 * Helper function to capitalize text
 */
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
