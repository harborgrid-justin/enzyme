import type { GeneratorOptions, GeneratorTemplate } from '../index';

/**
 *
 * @param options
 */
export function componentTemplate(options: GeneratorOptions): GeneratorTemplate {
  const { name, path: basePath = 'src/components', skipTests, skipStories, skipStyles } = options;
  const componentPath = `${basePath}/${name}`;

  const files = [];

  // Main component file
  files.push({
    path: `${componentPath}/${name}.tsx`,
    content: generateComponent(name),
  });

  // Props interface
  files.push({
    path: `${componentPath}/${name}.types.ts`,
    content: generateTypes(name),
  });

  // Styles
  if (!skipStyles) {
    files.push({
      path: `${componentPath}/${name}.styles.ts`,
      content: generateStyles(name),
    });
  }

  // Test file
  if (!skipTests) {
    files.push({
      path: `${componentPath}/${name}.test.tsx`,
      content: generateTest(name),
    });
  }

  // Storybook file
  if (!skipStories) {
    files.push({
      path: `${componentPath}/${name}.stories.tsx`,
      content: generateStory(name),
    });
  }

  // Index barrel export
  files.push({
    path: `${componentPath}/index.ts`,
    content: generateIndex(name),
  });

  return {
    type: 'component',
    files,
  };
}

/**
 *
 * @param name
 */
function generateComponent(name: string): string {
  return `import React from 'react';
import { ${name}Props } from './${name}.types';
import { Container } from './${name}.styles';

export const ${name}: React.FC<${name}Props> = ({ children, ...props }) => {
  return (
    <Container {...props}>
      {children}
    </Container>
  );
};

${name}.displayName = '${name}';
`;
}

/**
 *
 * @param name
 */
function generateTypes(name: string): string {
  return `export interface ${name}Props {
  children?: React.ReactNode;
  className?: string;
}
`;
}

/**
 *
 * @param _name
 */
function generateStyles(_name: string): string {
  return `import styled from 'styled-components';

export const Container = styled.div\`
  /* Add your styles here */
\`;
`;
}

/**
 *
 * @param name
 */
function generateTest(name: string): string {
  return `import React from 'react';
import { render, screen } from '@testing-library/react';
import { ${name} } from './${name}';

describe('${name}', () => {
  it('renders without crashing', () => {
    render(<${name}>Test</${name}>);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<${name} className="custom">Test</${name}>);
    expect(container.firstChild).toHaveClass('custom');
  });
});
`;
}

/**
 *
 * @param name
 */
function generateStory(name: string): string {
  return `import type { Meta, StoryObj } from '@storybook/react';
import { ${name} } from './${name}';

const meta: Meta<typeof ${name}> = {
  title: 'Components/${name}',
  component: ${name},
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ${name}>;

export const Default: Story = {
  args: {
    children: 'Default ${name}',
  },
};

export const WithCustomContent: Story = {
  args: {
    children: 'Custom content here',
  },
};
`;
}

/**
 *
 * @param name
 */
function generateIndex(name: string): string {
  return `export { ${name} } from './${name}';
export type { ${name}Props } from './${name}.types';
`;
}1
1