/**
 * API Documentation Generator
 * Generates comprehensive API documentation from TypeScript source files
 */

import * as path from 'path';
import { createParser, ParsedFunction, ParsedInterface } from './parser';
import {
  heading,
  paragraph,
  codeBlock,
  parametersTable,
  propertiesTable,
  deprecationNotice,
  badge,
  generateTOC,
  TOCItem,
  writeDocFile,
  findFiles,
  logger,
  formatExample,
  formatType,
  horizontalRule,
  inlineCode,
  list,
  frontmatter,
} from './utils';
import { DocsConfig } from './index';

interface APIModule {
  name: string;
  description: string;
  functions: ParsedFunction[];
  interfaces: ParsedInterface[];
  filePath: string;
}

/**
 * Generate all API documentation
 */
export async function generateAllDocs(config: DocsConfig): Promise<void> {
  logger.info('Generating API documentation...');

  // Find all TypeScript files
  const files = await findFiles(
    path.join(config.projectRoot, config.srcDir),
    /\.tsx?$/,
    [/node_modules/, /\.test\./, /\.spec\./]
  );

  logger.info(`Found ${files.length} TypeScript files`);

  // Parse files
  const parser = createParser();
  const modules = new Map<string, APIModule>();

  for (const file of files) {
    const symbols = parser.parseFile(file);

    if (symbols.length === 0) {
      continue;
    }

    const moduleName = getModuleName(file, config.srcDir);
    const module = modules.get(moduleName) || {
      name: moduleName,
      description: '',
      functions: [],
      interfaces: [],
      filePath: file,
    };

    for (const symbol of symbols) {
      if (symbol.kind === 'function') {
        module.functions.push(symbol as ParsedFunction);
      } else if (symbol.kind === 'interface') {
        module.interfaces.push(symbol as ParsedInterface);
      }
    }

    modules.set(moduleName, module);
  }

  logger.info(`Parsed ${modules.size} modules`);

  // Group modules by category
  const groupedModules = groupModulesByCategory(modules);

  // Generate index page
  await generateIndexPage(groupedModules, config);

  // Generate individual module documentation
  for (const [category, categoryModules] of groupedModules) {
    for (const module of categoryModules) {
      await generateModuleDocs(module, category, config);
    }
  }

  logger.success('API documentation generated successfully!');
}

/**
 * Get module name from file path
 */
function getModuleName(filePath: string, srcDir: string): string {
  const relative = path.relative(srcDir, filePath);
  const parsed = path.parse(relative);

  // Remove index from name
  if (parsed.name === 'index') {
    return parsed.dir.replace(/\//g, '-') || 'root';
  }

  return path.join(parsed.dir, parsed.name).replace(/\//g, '-');
}

/**
 * Group modules by category (based on directory structure)
 */
function groupModulesByCategory(modules: Map<string, APIModule>): Map<string, APIModule[]> {
  const grouped = new Map<string, APIModule[]>();

  for (const [name, module] of modules) {
    const category = name.split('-')[0] || 'misc';
    const categoryModules = grouped.get(category) || [];
    categoryModules.push(module);
    grouped.set(category, categoryModules);
  }

  return grouped;
}

/**
 * Generate API documentation index page
 */
async function generateIndexPage(
  groupedModules: Map<string, APIModule[]>,
  config: DocsConfig
): Promise<void> {
  let content = '';

  // Frontmatter
  content += frontmatter({
    title: 'API Reference',
    description: 'Complete API documentation for enzyme framework',
    generated: new Date().toISOString(),
  });

  // Title
  content += heading(1, 'API Reference');
  content += paragraph('Complete API documentation for the enzyme framework.');

  // Table of contents by category
  content += heading(2, 'Categories');

  for (const [category, modules] of groupedModules) {
    content += heading(3, capitalize(category));

    const moduleLinks = modules
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((module) => {
        const functionCount = module.functions.length;
        const interfaceCount = module.interfaces.length;
        const stats = [];
        if (functionCount > 0) stats.push(`${functionCount} functions`);
        if (interfaceCount > 0) stats.push(`${interfaceCount} interfaces`);

        return `[\`${module.name}\`](./${category}/${module.name}.md) - ${stats.join(', ') || 'No exports'}`;
      });

    content += list(moduleLinks);
  }

  // Write index file
  await writeDocFile(path.join(config.outputDir, 'index.md'), content);
}

/**
 * Generate module documentation
 */
async function generateModuleDocs(
  module: APIModule,
  category: string,
  config: DocsConfig
): Promise<void> {
  let content = '';

  // Frontmatter
  content += frontmatter({
    title: module.name,
    category,
    generated: new Date().toISOString(),
  });

  // Title
  content += heading(1, module.name);

  if (module.description) {
    content += paragraph(module.description);
  }

  // Generate TOC
  const tocItems: TOCItem[] = [];

  if (module.functions.length > 0) {
    tocItems.push({
      title: 'Functions',
      anchor: 'functions',
      level: 2,
      children: module.functions.map((fn) => ({
        title: fn.name,
        anchor: slugify(fn.name),
        level: 3,
      })),
    });
  }

  if (module.interfaces.length > 0) {
    tocItems.push({
      title: 'Interfaces',
      anchor: 'interfaces',
      level: 2,
      children: module.interfaces.map((iface) => ({
        title: iface.name,
        anchor: slugify(iface.name),
        level: 3,
      })),
    });
  }

  if (tocItems.length > 0) {
    content += generateTOC(tocItems);
  }

  // Functions section
  if (module.functions.length > 0) {
    content += heading(2, 'Functions');

    for (const func of module.functions) {
      content += generateFunctionDocs(func);
    }
  }

  // Interfaces section
  if (module.interfaces.length > 0) {
    content += heading(2, 'Interfaces');

    for (const iface of module.interfaces) {
      content += generateInterfaceDocs(iface);
    }
  }

  // Source file reference
  content += horizontalRule();
  content += paragraph(`**Source**: \`${module.filePath}\``);

  // Write module file
  const outputPath = path.join(config.outputDir, category, `${module.name}.md`);
  await writeDocFile(outputPath, content);
}

/**
 * Generate function documentation
 */
function generateFunctionDocs(func: ParsedFunction): string {
  let content = '';

  // Function name and signature
  content += heading(3, func.name);

  // Badges
  const badges = [];
  if (func.isAsync) badges.push(badge('async', 'true', 'blue'));
  if (func.isExported) badges.push(badge('exported', 'true', 'green'));
  if (badges.length > 0) {
    content += paragraph(badges.join(' '));
  }

  // Deprecation notice
  if (func.deprecated) {
    content += deprecationNotice(func.deprecated);
  }

  // Description
  if (func.documentation) {
    content += paragraph(func.documentation);
  }

  // Signature
  const typeParams = func.typeParameters ? `<${func.typeParameters.join(', ')}>` : '';
  const params = func.parameters
    .map((p) => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
    .join(', ');
  const asyncModifier = func.isAsync ? 'async ' : '';
  const signature = `${asyncModifier}function ${func.name}${typeParams}(${params}): ${func.returnType}`;

  content += heading(4, 'Signature');
  content += codeBlock(signature);

  // Parameters
  if (func.parameters.length > 0) {
    content += heading(4, 'Parameters');
    content += parametersTable(func.parameters);
  }

  // Return type
  content += heading(4, 'Returns');
  content += paragraph(inlineCode(formatType(func.returnType)));

  // Examples
  if (func.examples.length > 0) {
    content += heading(4, 'Examples');
    for (const example of func.examples) {
      content += formatExample(example);
    }
  }

  // Metadata
  if (func.since) {
    content += paragraph(`**Since**: ${func.since}`);
  }

  content += horizontalRule();

  return content;
}

/**
 * Generate interface documentation
 */
function generateInterfaceDocs(iface: ParsedInterface): string {
  let content = '';

  // Interface name
  content += heading(3, iface.name);

  // Badges
  if (iface.isExported) {
    content += paragraph(badge('exported', 'true', 'green'));
  }

  // Deprecation notice
  if (iface.deprecated) {
    content += deprecationNotice(iface.deprecated);
  }

  // Description
  if (iface.documentation) {
    content += paragraph(iface.documentation);
  }

  // Extends
  if (iface.extends && iface.extends.length > 0) {
    content += paragraph(`**Extends**: ${iface.extends.map((e) => inlineCode(e)).join(', ')}`);
  }

  // Properties
  if (iface.properties.length > 0) {
    content += heading(4, 'Properties');
    content += propertiesTable(iface.properties);
  }

  // Examples
  if (iface.examples.length > 0) {
    content += heading(4, 'Examples');
    for (const example of iface.examples) {
      content += formatExample(example);
    }
  }

  // Metadata
  if (iface.since) {
    content += paragraph(`**Since**: ${iface.since}`);
  }

  content += horizontalRule();

  return content;
}

/**
 * Helper function to slugify text
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Helper function to capitalize text
 */
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
