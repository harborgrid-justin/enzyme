/**
 * Component Documentation Generator
 * Generates comprehensive documentation for React components
 */

import * as path from 'path';
import { createParser, ParsedComponent } from './parser';
import {
  heading,
  paragraph,
  codeBlock,
  propertiesTable,
  deprecationNotice,
  badge,
  generateTOC,
  TOCItem,
  writeDocFile,
  findFiles,
  groupBy,
  logger,
  formatExample,
  horizontalRule,
  inlineCode,
  list,
  frontmatter,
  crossReference,
} from './utils';
import { DocsConfig } from './index';

interface ComponentDoc {
  name: string;
  component: ParsedComponent;
  category: string;
}

/**
 * Generate component documentation
 */
export async function generateComponentDocs(config: DocsConfig): Promise<void> {
  logger.info('Generating component documentation...');

  // Find all component files (tsx files in components directories)
  const files = await findFiles(
    path.join(config.projectRoot, config.srcDir),
    /\.(tsx)$/,
    [/node_modules/, /\.test\./, /\.spec\./]
  );

  logger.info(`Found ${files.length} component files`);

  // Parse components
  const parser = createParser();
  const components: ComponentDoc[] = [];

  for (const file of files) {
    const symbols = parser.parseFile(file);

    for (const symbol of symbols) {
      if (symbol.kind === 'component') {
        const component = symbol as ParsedComponent;
        const category = getComponentCategory(file, config.srcDir);

        components.push({
          name: component.name,
          component,
          category,
        });
      }
    }
  }

  logger.info(`Found ${components.length} components`);

  // Group by category
  const grouped = groupBy(components, (c) => c.category);

  // Generate index page
  await generateComponentIndexPage(grouped, config);

  // Generate individual component docs
  for (const component of components) {
    await generateSingleComponentDoc(component, config);
  }

  logger.success('Component documentation generated successfully!');
}

/**
 * Get component category from file path
 */
function getComponentCategory(filePath: string, srcDir: string): string {
  const relative = path.relative(srcDir, filePath);
  const parts = relative.split(path.sep);

  // Try to extract category from path
  if (parts.includes('components')) {
    const idx = parts.indexOf('components');
    if (parts.length > idx + 1) {
      return parts[idx + 1];
    }
  }

  return 'general';
}

/**
 * Generate component index page
 */
async function generateComponentIndexPage(
  grouped: Map<string, ComponentDoc[]>,
  config: DocsConfig
): Promise<void> {
  let content = '';

  // Frontmatter
  content += frontmatter({
    title: 'Component Reference',
    description: 'Complete component documentation for enzyme framework',
    generated: new Date().toISOString(),
  });

  // Title
  content += heading(1, 'Component Reference');
  content += paragraph('Complete documentation for all React components in the enzyme framework.');

  // Statistics
  const totalComponents = Array.from(grouped.values()).reduce(
    (sum, components) => sum + components.length,
    0
  );
  content += paragraph(`**Total Components**: ${totalComponents}`);

  // Table of contents by category
  content += heading(2, 'Categories');

  for (const [category, components] of grouped) {
    content += heading(3, capitalize(category));

    const componentLinks = components
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((doc) => {
        const deprecated = doc.component.deprecated ? ' (deprecated)' : '';
        const propsCount = doc.component.props?.properties.length || 0;
        return `[\`${doc.name}\`](./${category}/${doc.name}.md) - ${propsCount} props${deprecated}`;
      });

    content += list(componentLinks);
  }

  // Quick start guide
  content += heading(2, 'Quick Start');
  content += paragraph('Import components from the enzyme framework:');
  content += codeBlock(
    `import { Button, Card, Modal } from '@missionfabric-js/enzyme/ui';

// Use in your application
function App() {
  return (
    <Card>
      <Button variant="primary">Click me</Button>
    </Card>
  );
}`
  );

  // Write index file
  await writeDocFile(path.join(config.outputDir, 'index.md'), content);
}

/**
 * Generate documentation for a single component
 */
async function generateSingleComponentDoc(
  doc: ComponentDoc,
  config: DocsConfig
): Promise<void> {
  const { name, component, category } = doc;
  let content = '';

  // Frontmatter
  content += frontmatter({
    title: name,
    category,
    type: 'component',
    generated: new Date().toISOString(),
  });

  // Title
  content += heading(1, name);

  // Badges
  const badges = [];
  if (component.isDefaultExport) {
    badges.push(badge('default export', 'true', 'blue'));
  }
  if (badges.length > 0) {
    content += paragraph(badges.join(' '));
  }

  // Deprecation notice
  if (component.deprecated) {
    content += deprecationNotice(component.deprecated);
  }

  // Description
  if (component.documentation) {
    content += paragraph(component.documentation);
  }

  // Generate TOC
  const tocItems: TOCItem[] = [
    { title: 'Props', anchor: 'props', level: 2 },
  ];

  if (component.examples.length > 0) {
    tocItems.push({ title: 'Examples', anchor: 'examples', level: 2 });
  }

  if (component.hooks.length > 0) {
    tocItems.push({ title: 'Hooks Used', anchor: 'hooks-used', level: 2 });
  }

  if (component.relatedComponents.length > 0) {
    tocItems.push({ title: 'Related Components', anchor: 'related-components', level: 2 });
  }

  content += generateTOC(tocItems);

  // Props section
  content += heading(2, 'Props');

  if (component.props && component.props.properties.length > 0) {
    content += propertiesTable(component.props.properties);
  } else {
    content += paragraph('This component does not accept any props.');
  }

  // Examples section
  if (component.examples.length > 0) {
    content += heading(2, 'Examples');

    for (let i = 0; i < component.examples.length; i++) {
      if (component.examples.length > 1) {
        content += heading(3, `Example ${i + 1}`);
      }
      content += formatExample(component.examples[i], 'tsx');
    }
  }

  // Hooks used
  if (component.hooks.length > 0) {
    content += heading(2, 'Hooks Used');
    content += paragraph('This component uses the following hooks:');

    const hookLinks = component.hooks.map((hook) => inlineCode(hook));
    content += list(hookLinks);
  }

  // Related components
  if (component.relatedComponents.length > 0) {
    content += heading(2, 'Related Components');

    const relatedLinks = component.relatedComponents.map((rel) => {
      return crossReference('component', rel, '..');
    });

    content += list(relatedLinks);
  }

  // Usage tips
  content += heading(2, 'Usage Tips');
  content += generateUsageTips(component);

  // Accessibility
  content += heading(2, 'Accessibility');
  content += generateAccessibilitySection(component);

  // Source reference
  content += horizontalRule();
  content += paragraph(`**Source**: \`${component.filePath}\``);

  if (component.since) {
    content += paragraph(`**Since**: ${component.since}`);
  }

  // Write component file
  const outputPath = path.join(config.outputDir, category, `${name}.md`);
  await writeDocFile(outputPath, content);
}

/**
 * Generate usage tips section
 */
function generateUsageTips(component: ParsedComponent): string {
  const tips: string[] = [];

  // Basic tip
  tips.push('Always provide meaningful props to ensure the component works as expected.');

  // Props-specific tips
  if (component.props) {
    const requiredProps = component.props.properties.filter((p) => !p.optional);
    if (requiredProps.length > 0) {
      tips.push(
        `This component requires the following props: ${requiredProps.map((p) => inlineCode(p.name)).join(', ')}`
      );
    }
  }

  // Hook-specific tips
  if (component.hooks.some((h) => h.includes('useEffect'))) {
    tips.push('This component may trigger side effects. Consider its lifecycle carefully.');
  }

  return list(tips);
}

/**
 * Generate accessibility section
 */
function generateAccessibilitySection(component: ParsedComponent): string {
  let content = '';

  content += paragraph(
    'Ensure this component is accessible by following these guidelines:'
  );

  const guidelines = [
    'Provide appropriate ARIA labels when necessary',
    'Ensure keyboard navigation works correctly',
    'Test with screen readers',
    'Maintain proper color contrast ratios',
    'Use semantic HTML elements',
  ];

  content += list(guidelines);

  // Component-specific accessibility notes
  if (component.props) {
    const hasAriaProps = component.props.properties.some((p) =>
      p.name.startsWith('aria')
    );

    if (hasAriaProps) {
      content += paragraph(
        '**Note**: This component supports ARIA props for enhanced accessibility.'
      );
    }
  }

  return content;
}

/**
 * Helper function to capitalize text
 */
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
