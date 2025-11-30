/**
 * @file Component Generator
 * @description Generates React components following enzyme patterns
 */

import * as path from 'path';
import { BaseGenerator, type GeneratorOptions, type GeneratedFile } from '../base';
import type { ComponentOptions } from '../types';
import {
  resolveComponentPath,
  toPascalCase,
  createBaseContext,
  validateComponentName,
} from '../utils';

// ============================================================================
// Component Generator
// ============================================================================

export interface ComponentGeneratorOptions extends GeneratorOptions, ComponentOptions {}

export class ComponentGenerator extends BaseGenerator<ComponentGeneratorOptions> {
  protected getName(): string {
    return 'Component';
  }

  protected validate(): void {
    validateComponentName(this.options.name);

    if (this.options.path) {
      this.validatePath(this.options.path);
    }
  }

  protected async generate(): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    const componentName = toPascalCase(this.options.name);
    const componentPath = resolveComponentPath(
      this.options.name,
      this.options.type,
      this.options.path
    );

    // Generate component file
    const componentContent = this.generateComponentFile();
    files.push({
      path: path.join(componentPath, `${componentName}.tsx`),
      content: componentContent,
    });

    // Generate index file
    const indexContent = this.generateIndexFile();
    files.push({
      path: path.join(componentPath, 'index.ts'),
      content: indexContent,
    });

    // Generate test file if requested
    if (this.options.withTest) {
      const testContent = this.generateTestFile();
      files.push({
        path: path.join(componentPath, `${componentName}.test.tsx`),
        content: testContent,
      });
    }

    // Generate Storybook story if requested
    if (this.options.withStory) {
      const storyContent = this.generateStoryFile();
      files.push({
        path: path.join(componentPath, `${componentName}.stories.tsx`),
        content: storyContent,
      });
    }

    // Generate styles file if requested
    if (this.options.withStyles) {
      const stylesContent = this.generateStylesFile();
      files.push({
        path: path.join(componentPath, `${componentName}.styles.ts`),
        content: stylesContent,
      });
    }

    return files;
  }

  // ==========================================================================
  // File Generation Methods
  // ==========================================================================

  private generateComponentFile(): string {
    const componentName = toPascalCase(this.options.name);
    const useMemo = this.options.memo ?? true;
    const useForwardRef = this.options.forwardRef ?? false;
    const withStyles = this.options.withStyles ?? false;

    const imports: string[] = [
      'React',
      useMemo ? 'memo' : '',
      useForwardRef ? 'forwardRef' : '',
      'type ReactNode',
    ].filter(Boolean);

    let template = `/**
 * @file ${componentName} Component
 * @description ${componentName} component for enzyme application
 */

import { ${imports.join(', ')} } from 'react';`;

    if (withStyles) {
      template += `\nimport { useStyles } from './${componentName}.styles';`;
    }

    template += `

// ============================================================================
// Types
// ============================================================================

/**
 * ${componentName} component props
 */
export interface ${componentName}Props {
  /** Component children */
  children?: ReactNode;

  /** Additional CSS class */
  className?: string;

  /** Custom styles */
  style?: React.CSSProperties;
}

// ============================================================================
// Component
// ============================================================================

`;

    if (useForwardRef) {
      template += `/**
 * ${componentName} component with ref forwarding
 */
export const ${componentName} = ${useMemo ? 'memo(' : ''}forwardRef<HTMLDivElement, ${componentName}Props>((
  { children, className, style },
  ref
): React.ReactElement => {`;

      if (withStyles) {
        template += `\n  const styles = useStyles();\n`;
      }

      template += `
  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
})${useMemo ? ')' : ''};

${componentName}.displayName = '${componentName}';
`;
    } else {
      template += `/**
 * ${componentName} component
 */
export const ${componentName} = ${useMemo ? 'memo((' : '('}
  { children, className, style }: ${componentName}Props
): React.ReactElement => {`;

      if (withStyles) {
        template += `\n  const styles = useStyles();\n`;
      }

      template += `
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}${useMemo ? ')' : ''};

${useMemo ? `\n${componentName}.displayName = '${componentName}';\n` : ''}`;
    }

    return template;
  }

  private generateIndexFile(): string {
    const componentName = toPascalCase(this.options.name);

    return `/**
 * ${componentName} component exports
 */

export { ${componentName} } from './${componentName}';
export type { ${componentName}Props } from './${componentName}';
`;
  }

  private generateTestFile(): string {
    const componentName = toPascalCase(this.options.name);

    return `/**
 * @file ${componentName} Component Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ${componentName} } from './${componentName}';

describe('${componentName}', () => {
  it('renders without crashing', () => {
    render(<${componentName}>Test content</${componentName}>);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <${componentName} className="custom-class">Content</${componentName}>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('applies custom styles', () => {
    const customStyle = { color: 'red' };
    const { container } = render(
      <${componentName} style={customStyle}>Content</${componentName}>
    );
    expect(container.firstChild).toHaveStyle(customStyle);
  });
});
`;
  }

  private generateStoryFile(): string {
    const componentName = toPascalCase(this.options.name);

    return `/**
 * @file ${componentName} Stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ${componentName} } from './${componentName}';

const meta: Meta<typeof ${componentName}> = {
  title: 'Components/${componentName}',
  component: ${componentName},
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
      description: 'Component children',
    },
    className: {
      control: 'text',
      description: 'Additional CSS class',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ${componentName}>;

export const Default: Story = {
  args: {
    children: 'Default ${componentName}',
  },
};

export const WithCustomClass: Story = {
  args: {
    children: '${componentName} with custom class',
    className: 'custom-class',
  },
};

export const WithCustomStyle: Story = {
  args: {
    children: '${componentName} with custom style',
    style: {
      padding: '1rem',
      backgroundColor: '#f0f0f0',
      borderRadius: '8px',
    },
  },
};
`;
  }

  private generateStylesFile(): string {
    const componentName = toPascalCase(this.options.name);

    return `/**
 * @file ${componentName} Styles
 * @description Styles for ${componentName} component
 */

import { useMemo, type CSSProperties } from 'react';
import { tokens } from '@missionfabric-js/enzyme/theme';

/**
 * ${componentName} styles hook
 */
export function useStyles(): {
  container: CSSProperties;
} {
  return useMemo(() => ({
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: tokens.spacing.md,
      padding: tokens.spacing.md,
    },
  }), []);
}
`;
  }

  protected async afterGenerate(result: { files: string[] }): Promise<void> {
    await super.afterGenerate(result);

    const componentName = toPascalCase(this.options.name);
    this.log(`\n✓ Generated ${componentName} component successfully!`, 'success');
    this.log(`\nFiles created:`, 'info');
    result.files.forEach(file => {
      this.log(`  ${this.formatPath(file)}`);
    });

    this.log(`\nNext steps:`, 'info');
    this.log(`  1. Import and use the component in your application`);
    this.log(`  2. Customize the component implementation as needed`);
    if (this.options.withTest) {
      this.log(`  3. Run tests: npm test`);
    }
    if (this.options.withStory) {
      this.log(`  4. View in Storybook: npm run storybook`);
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create and run component generator
 */
export async function generateComponent(options: ComponentGeneratorOptions): Promise<void> {
  const generator = new ComponentGenerator(options);
  await generator.run();
}
