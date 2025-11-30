/**
 * @file Page Generator
 * @description Generates page components with enzyme Page layout
 */

import * as path from 'path';
import { BaseGenerator, type GeneratorOptions, type GeneratedFile } from '../base';
import type { PageOptions } from '../types';
import {
  resolvePagePath,
  toPascalCase,
  validateComponentName,
} from '../utils';

// ============================================================================
// Page Generator
// ============================================================================

export interface PageGeneratorOptions extends GeneratorOptions, PageOptions {}

export class PageGenerator extends BaseGenerator<PageGeneratorOptions> {
  protected getName(): string {
    return 'Page';
  }

  protected validate(): void {
    validateComponentName(this.options.name);

    if (this.options.path) {
      this.validatePath(this.options.path);
    }
  }

  protected async generate(): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    const pageName = toPascalCase(this.options.name);
    const pagePath = resolvePagePath(this.options.name, this.options.path);

    // Generate page file
    const pageContent = this.generatePageFile();
    files.push({
      path: path.join(pagePath, `${pageName}Page.tsx`),
      content: pageContent,
    });

    // Generate index file
    const indexContent = this.generateIndexFile();
    files.push({
      path: path.join(pagePath, 'index.ts'),
      content: indexContent,
    });

    return files;
  }

  // ==========================================================================
  // File Generation Methods
  // ==========================================================================

  private generatePageFile(): string {
    const pageName = toPascalCase(this.options.name);
    const withState = this.options.withState ?? false;
    const withQuery = this.options.withQuery ?? false;
    const withForm = this.options.withForm ?? false;

    let template = `/**
 * @file ${pageName}Page Component
 * @description ${pageName} page component
 */

import { memo } from 'react';
import { Page } from '@missionfabric-js/enzyme/ui';`;

    if (withQuery) {
      template += `\nimport { useQuery } from '@tanstack/react-query';`;
    }

    if (withState) {
      template += `\nimport { useState } from 'react';`;
    }

    if (withForm) {
      template += `\nimport { Button } from '@missionfabric-js/enzyme/ui';`;
    }

    template += `

// ============================================================================
// Types
// ============================================================================

/**
 * ${pageName}Page component props
 */
export interface ${pageName}PageProps {
  /** Additional CSS class */
  className?: string;
}
`;

    if (withQuery) {
      template += `
/**
 * ${pageName} data type
 */
interface ${pageName}Data {
  id: string;
  name: string;
  // Add your data fields here
}
`;
    }

    template += `
// ============================================================================
// Component
// ============================================================================

/**
 * ${pageName}Page component
 */
export const ${pageName}Page = memo(({ className }: ${pageName}PageProps): React.ReactElement => {`;

    if (withState) {
      template += `
  const [count, setCount] = useState(0);`;
    }

    if (withQuery) {
      template += `
  const { data, isLoading, error } = useQuery<${pageName}Data>({
    queryKey: ['${pageName.toLowerCase()}'],
    queryFn: async () => {
      const response = await fetch('/api/${pageName.toLowerCase()}');
      if (!response.ok) throw new Error('Failed to fetch data');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Page title="${pageName}" isLoading>
        <div>Loading...</div>
      </Page>
    );
  }

  if (error) {
    return (
      <Page title="${pageName}">
        <div>Error: {error.message}</div>
      </Page>
    );
  }`;
    }

    if (withForm) {
      template += `
  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    // Handle form submission
  };`;
    }

    template += `

  return (
    <Page
      title="${pageName}"
      className={className}`;

    if (withState || withForm) {
      template += `
      actions={
        <div style={{ display: 'flex', gap: '0.5rem' }}>`;

      if (withState) {
        template += `
          <Button onClick={() => setCount(count + 1)}>
            Count: {count}
          </Button>`;
      }

      if (withForm) {
        template += `
          <Button variant="primary">
            Action
          </Button>`;
      }

      template += `
        </div>
      }`;
    }

    template += `
    >`;

    if (withForm) {
      template += `
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="name">Name:</label>
            <input
              id="name"
              type="text"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </div>
          <Button type="submit" variant="primary">
            Submit
          </Button>
        </div>
      </form>`;
    } else if (withQuery) {
      template += `
      <div>
        <h2>{data?.name}</h2>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>`;
    } else {
      template += `
      <div>
        <h2>Welcome to ${pageName}</h2>
        <p>This is your ${pageName} page. Start building amazing features!</p>
      </div>`;
    }

    template += `
    </Page>
  );
});

${pageName}Page.displayName = '${pageName}Page';
`;

    return template;
  }

  private generateIndexFile(): string {
    const pageName = toPascalCase(this.options.name);

    return `/**
 * ${pageName}Page exports
 */

export { ${pageName}Page } from './${pageName}Page';
export type { ${pageName}PageProps } from './${pageName}Page';
`;
  }

  protected async afterGenerate(result: { files: string[] }): Promise<void> {
    await super.afterGenerate(result);

    const pageName = toPascalCase(this.options.name);
    this.log(`\n✓ Generated ${pageName}Page successfully!`, 'success');
    this.log(`\nFiles created:`, 'info');
    result.files.forEach(file => {
      this.log(`  ${this.formatPath(file)}`);
    });

    this.log(`\nNext steps:`, 'info');
    this.log(`  1. Add the page to your routing configuration`);
    if (this.options.route) {
      this.log(`  2. Route path: ${this.options.route}`);
    }
    if (this.options.layout) {
      this.log(`  3. Layout: ${this.options.layout}`);
    }
    this.log(`  4. Customize the page content as needed`);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create and run page generator
 */
export async function generatePage(options: PageGeneratorOptions): Promise<void> {
  const generator = new PageGenerator(options);
  await generator.run();
}
