import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { BaseCommand } from '../base-command';
import type { CommandContext, CommandMetadata } from '../base-command';

/**
 * Component generation options interface
 *
 * @interface ComponentOptions
 * @property {string} name - The component name in PascalCase (e.g., 'MyComponent')
 * @property {'functional' | 'class' | 'form' | 'layout' | 'hoc'} type - The type of component to generate
 * @property {'feature' | 'shared' | 'ui'} location - Where to place the component
 * @property {boolean} withTests - Whether to generate test files
 * @property {boolean} withStories - Whether to generate Storybook stories
 * @property {boolean} withStyles - Whether to generate CSS module file
 * @property {string} [featurePath] - Optional feature directory path if location is 'feature'
 */
interface ComponentOptions {
  name: string;
  type: 'functional' | 'class' | 'form' | 'layout' | 'hoc';
  location: 'feature' | 'shared' | 'ui';
  withTests: boolean;
  withStories: boolean;
  withStyles: boolean;
  featurePath?: string;
}

/**
 * Generate Component Command
 *
 * Creates a new React component with optional tests, stories, and CSS modules.
 * Supports multiple component patterns including functional, class, form, layout, and HOC.
 *
 * Features:
 * - Interactive wizard for component configuration
 * - Multiple component types (functional, class, form, layout, HOC)
 * - Flexible location options (feature-specific, shared, or UI)
 * - Optional test file generation with proper imports
 * - Optional Storybook stories generation
 * - Optional CSS module generation
 * - Automatic index file creation for clean exports
 *
 * @class GenerateComponentCommand
 * @augments {BaseCommand}
 *
 * @example
 * ```typescript
 * // Command registration
 * const command = new GenerateComponentCommand(context, outputChannel);
 * context.subscriptions.push(command.register());
 *
 * // Execute programmatically
 * await vscode.commands.executeCommand('enzyme.generate.component');
 * ```
 *
 * Keybinding: Ctrl+Shift+G C (Windows/Linux), Cmd+Shift+G C (macOS)
 */
export class GenerateComponentCommand extends BaseCommand {
  /**
   *
   */
  getMetadata(): CommandMetadata {
    return {
      id: 'enzyme.generate.component',
      title: 'Enzyme: Generate Component',
      category: 'Enzyme Generate',
      icon: '$(symbol-class)',
      keybinding: {
        key: 'ctrl+shift+g c',
        mac: 'cmd+shift+g c',
        when: 'editorTextFocus',
      },
    };
  }

  /**
   *
   * @param _context
   */
  protected async executeCommand(_context: CommandContext): Promise<void> {
    const workspaceFolder = await this.ensureWorkspaceFolder();

    // Gather component options
    const options = await this.gatherComponentOptions(workspaceFolder);
    if (!options) {
      return; // User cancelled
    }

    // Generate the component
    await this.withProgress(
      `Generating ${options.name} component...`,
      async (progress, token) => {
        progress.report({ message: 'Creating component files...' });

        const componentPath = await this.generateComponent(
          workspaceFolder,
          options,
          token
        );

        progress.report({ message: 'Opening files...', increment: 80 });

        // Open the generated component file
        const componentFile = vscode.Uri.file(componentPath);
        await this.openFile(componentFile);

        progress.report({ message: 'Done!', increment: 100 });
      }
    );

    await this.showInfo(
      `Component "${options.name}" created successfully!`,
      'Open Folder'
    );
  }

  /**
   *
   * @param workspaceFolder
   */
  private async gatherComponentOptions(
    workspaceFolder: vscode.WorkspaceFolder
  ): Promise<ComponentOptions | undefined> {
    // Select component type
    const typeOptions = [
      {
        label: '$(symbol-method) Functional Component',
        description: 'Modern React functional component with hooks',
        value: 'functional' as const,
      },
      {
        label: '$(symbol-class) Class Component',
        description: 'Traditional React class component',
        value: 'class' as const,
      },
      {
        label: '$(form) Form Component',
        description: 'Form component with validation',
        value: 'form' as const,
      },
      {
        label: '$(layout) Layout Component',
        description: 'Layout/container component',
        value: 'layout' as const,
      },
      {
        label: '$(symbol-interface) Higher-Order Component',
        description: 'HOC pattern component',
        value: 'hoc' as const,
      },
    ];

    const typeSelection = await this.showQuickPick(typeOptions, {
      title: 'Select Component Type',
      placeHolder: 'Choose the type of component to generate',
    });

    if (!typeSelection) {
      return undefined;
    }

    // Get component name
    const name = await this.showInputBox({
      prompt: 'Enter component name (PascalCase)',
      placeHolder: 'MyComponent',
      validateInput: (value) => {
        if (!value) {
          return 'Component name is required';
        }
        if (!/^[A-Z][\dA-Za-z]*$/.test(value)) {
          return 'Component name must be in PascalCase (e.g., MyComponent)';
        }
        return undefined;
      },
    });

    if (!name) {
      return undefined;
    }

    // Select location
    const locationOptions = [
      {
        label: '$(folder) Feature-Specific',
        description: 'Place in a specific feature directory',
        value: 'feature' as const,
      },
      {
        label: '$(globe) Shared Components',
        description: 'Place in shared/components directory',
        value: 'shared' as const,
      },
      {
        label: '$(paintcan) UI Components',
        description: 'Place in ui/components directory',
        value: 'ui' as const,
      },
    ];

    const locationSelection = await this.showQuickPick(locationOptions, {
      title: 'Select Component Location',
      placeHolder: 'Where should the component be created?',
    });

    if (!locationSelection) {
      return undefined;
    }

    let featurePath: string | undefined;
    if (locationSelection.value === 'feature') {
      featurePath = await this.selectFeatureDirectory(workspaceFolder);
      if (!featurePath) {
        return undefined;
      }
    }

    // Select options
    const optionItems = [
      { label: 'Include Tests', picked: true, value: 'tests' },
      { label: 'Include Stories (Storybook)', picked: false, value: 'stories' },
      { label: 'Include Styles', picked: true, value: 'styles' },
    ];

    const selectedOptions = await vscode.window.showQuickPick(optionItems, {
      canPickMany: true,
      title: 'Component Options',
      placeHolder: 'Select additional options',
    });

    const withTests = selectedOptions?.some((o) => o.value === 'tests') ?? true;
    const withStories =
      selectedOptions?.some((o) => o.value === 'stories') ?? false;
    const withStyles =
      selectedOptions?.some((o) => o.value === 'styles') ?? true;

    const options: ComponentOptions = {
      name,
      type: typeSelection.value,
      location: locationSelection.value,
      withTests,
      withStories,
      withStyles,
    };

    if (featurePath !== undefined) {
      options.featurePath = featurePath;
    }

    return options;
  }

  /**
   *
   * @param workspaceFolder
   */
  private async selectFeatureDirectory(
    workspaceFolder: vscode.WorkspaceFolder
  ): Promise<string | undefined> {
    const sourcePath = path.join(workspaceFolder.uri.fsPath, 'src');
    const featuresPath = path.join(sourcePath, 'features');

    try {
      const features = await fs.readdir(featuresPath);
      const featureDirectories = await Promise.all(
        features.map(async (feature) => {
          const featurePath = path.join(featuresPath, feature);
          const stat = await fs.stat(featurePath);
          return stat.isDirectory() ? feature : null;
        })
      );

      const validFeatures = featureDirectories.filter(
        (f): f is string => f !== null
      );

      if (validFeatures.length === 0) {
        await this.showWarning('No feature directories found');
        return undefined;
      }

      const selected = await this.showQuickPick(
        validFeatures.map((f) => ({
          label: f,
          description: `src/features/${f}`,
        })),
        {
          title: 'Select Feature',
          placeHolder: 'Choose a feature directory',
        }
      );

      return selected ? path.join(featuresPath, selected.label) : undefined;
    } catch (error) {
      this.log('warn', 'Failed to read features directory', error);
      return undefined;
    }
  }

  /**
   *
   * @param workspaceFolder
   * @param options
   * @param token
   */
  private async generateComponent(
    workspaceFolder: vscode.WorkspaceFolder,
    options: ComponentOptions,
    token: vscode.CancellationToken
  ): Promise<string> {
    // Determine target directory
    let targetDir: string;
    const sourcePath = path.join(workspaceFolder.uri.fsPath, 'src');

    if (options.location === 'feature' && options.featurePath) {
      targetDir = path.join(options.featurePath, 'components', options.name);
    } else if (options.location === 'shared') {
      targetDir = path.join(sourcePath, 'shared', 'components', options.name);
    } else {
      targetDir = path.join(sourcePath, 'ui', 'components', options.name);
    }

    // Create directory
    await fs.mkdir(targetDir, { recursive: true });

    if (token.isCancellationRequested) {
      throw new Error('Operation cancelled');
    }

    // Generate component file
    const componentPath = path.join(targetDir, `${options.name}.tsx`);
    const componentContent = this.generateComponentContent(options);
    await fs.writeFile(componentPath, componentContent);

    // Generate index file
    const indexPath = path.join(targetDir, 'index.ts');
    const indexContent = `export { ${options.name} } from './${options.name}';\n`;
    await fs.writeFile(indexPath, indexContent);

    // Generate styles if requested
    if (options.withStyles) {
      const stylesPath = path.join(targetDir, `${options.name}.module.css`);
      const stylesContent = this.generateStylesContent(options);
      await fs.writeFile(stylesPath, stylesContent);
    }

    // Generate tests if requested
    if (options.withTests) {
      const testPath = path.join(targetDir, `${options.name}.test.tsx`);
      const testContent = this.generateTestContent(options);
      await fs.writeFile(testPath, testContent);
    }

    // Generate stories if requested
    if (options.withStories) {
      const storyPath = path.join(targetDir, `${options.name}.stories.tsx`);
      const storyContent = this.generateStoryContent(options);
      await fs.writeFile(storyPath, storyContent);
    }

    return componentPath;
  }

  /**
   *
   * @param options
   */
  private generateComponentContent(options: ComponentOptions): string {
    const { name, type, withStyles } = options;

    const imports = [
      "import React from 'react';",
      withStyles ? `import styles from './${name}.module.css';` : null,
    ]
      .filter(Boolean)
      .join('\n');

    let componentCode = '';

    switch (type) {
      case 'functional':
        componentCode = `
export interface ${name}Props {
  className?: string;
  children?: React.ReactNode;
}

export const ${name}: React.FC<${name}Props> = ({ className, children }) => {
  return (
    <div className={${withStyles ? `styles.${name.toLowerCase()}` : 'className'}}>
      {children}
    </div>
  );
};
`;
        break;

      case 'class':
        componentCode = `
export interface ${name}Props {
  className?: string;
  children?: React.ReactNode;
}

export interface ${name}State {
  // Add state properties here
}

export class ${name} extends React.Component<${name}Props, ${name}State> {
  constructor(props: ${name}Props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <div className={${withStyles ? `styles.${name.toLowerCase()}` : 'this.props.className'}}>
        {this.props.children}
      </div>
    );
  }
}
`;
        break;

      case 'form':
        componentCode = `
export interface ${name}Props {
  onSubmit: (data: FormData) => void;
  className?: string;
}

interface FormData {
  // Add form fields here
}

export const ${name}: React.FC<${name}Props> = ({ onSubmit, className }) => {
  const [formData, setFormData] = React.useState<FormData>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className={${withStyles ? `styles.${name.toLowerCase()}` : 'className'}}>
      {/* Add form fields here */}
      <button type="submit">Submit</button>
    </form>
  );
};
`;
        break;

      case 'layout':
        componentCode = `
export interface ${name}Props {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const ${name}: React.FC<${name}Props> = ({
  header,
  sidebar,
  children,
  footer,
  className,
}) => {
  return (
    <div className={${withStyles ? `styles.${name.toLowerCase()}` : 'className'}}>
      {header && <header className={${withStyles ? 'styles.header' : 'undefined'}}>{header}</header>}
      <div className={${withStyles ? 'styles.main' : 'undefined'}}>
        {sidebar && <aside className={${withStyles ? 'styles.sidebar' : 'undefined'}}>{sidebar}</aside>}
        <main className={${withStyles ? 'styles.content' : 'undefined'}}>{children}</main>
      </div>
      {footer && <footer className={${withStyles ? 'styles.footer' : 'undefined'}}>{footer}</footer>}
    </div>
  );
};
`;
        break;

      case 'hoc':
        componentCode = `
export interface With${name}Props {
  // Add HOC props here
}

export function with${name}<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P & With${name}Props> {
  return (props: P & With${name}Props) => {
    // Add HOC logic here

    return <Component {...props} />;
  };
}
`;
        break;
    }

    return `${imports}\n${componentCode}`;
  }

  /**
   *
   * @param options
   */
  private generateStylesContent(options: ComponentOptions): string {
    const { name } = options;
    return `.${name.toLowerCase()} {
  /* Add styles here */
}
`;
  }

  /**
   *
   * @param options
   */
  private generateTestContent(options: ComponentOptions): string {
    const { name, type } = options;

    const isHOC = type === 'hoc';
    const componentName = isHOC ? `with${name}` : name;

    return `import { render, screen } from '@testing-library/react';
import { ${componentName} } from './${name}';

describe('${componentName}', () => {
  it('should render successfully', () => {
    ${isHOC ? `const TestComponent = with${name}(() => <div>Test</div>);\n    render(<TestComponent />);` : `render(<${name} />);`}
    expect(screen.getByText(/test/i)).toBeInTheDocument();
  });
});
`;
  }

  /**
   *
   * @param options
   */
  private generateStoryContent(options: ComponentOptions): string {
    const { name, type } = options;

    if (type === 'hoc') {
      return `import type { Meta, StoryObj } from '@storybook/react';
import { with${name} } from './${name}';

const TestComponent = with${name}(() => <div>Test Component</div>);

const meta: Meta<typeof TestComponent> = {
  title: 'Components/${name}',
  component: TestComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TestComponent>;

export const Default: Story = {};
`;
    }

    return `import type { Meta, StoryObj } from '@storybook/react';
import { ${name} } from './${name}';

const meta: Meta<typeof ${name}> = {
  title: 'Components/${name}',
  component: ${name},
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ${name}>;

export const Default: Story = {
  args: {
    children: 'Default ${name}',
  },
};
`;
  }
}
