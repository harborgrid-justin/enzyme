/**
 * @file Route Generator
 * @description Generates route files following enzyme file-system routing
 */

import * as path from 'path';
import { BaseGenerator, type GeneratorOptions, type GeneratedFile } from '../base';
import type { RouteOptions } from '../types';
import {
  resolveRoutePath,
  validateRoutePath,
  toPascalCase,
} from '../utils';

// ============================================================================
// Route Generator
// ============================================================================

export interface RouteGeneratorOptions extends GeneratorOptions, RouteOptions {}

export class RouteGenerator extends BaseGenerator<RouteGeneratorOptions> {
  protected getName(): string {
    return 'Route';
  }

  protected validate(): void {
    validateRoutePath(this.options.path);
  }

  protected async generate(): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    const routePath = resolveRoutePath(this.options.path);
    const fileName = this.options.lazy ? 'route.lazy.tsx' : 'route.tsx';

    // Generate route file
    const routeContent = this.generateRouteFile();
    files.push({
      path: path.join(routePath, fileName),
      content: routeContent,
    });

    // Generate loader file if requested
    if (this.options.loader) {
      const loaderContent = this.generateLoaderFile();
      files.push({
        path: path.join(routePath, 'loader.ts'),
        content: loaderContent,
      });
    }

    // Generate action file if requested
    if (this.options.action) {
      const actionContent = this.generateActionFile();
      files.push({
        path: path.join(routePath, 'action.ts'),
        content: actionContent,
      });
    }

    return files;
  }

  // ==========================================================================
  // File Generation Methods
  // ==========================================================================

  private generateRouteFile(): string {
    const routeName = this.getRouteName();
    const withLoader = this.options.loader ?? false;
    const withAction = this.options.action ?? false;
    const withGuard = this.options.guard;
    const withLayout = this.options.layout;
    const withMeta = this.options.meta;
    const isLazy = this.options.lazy ?? false;

    let template = `/**
 * @file Route: ${this.options.path}
 * @description Route component for ${this.options.path}
 */

import { memo } from 'react';`;

    if (withLayout) {
      template += `\nimport { ${withLayout} } from '@/layouts';`;
    } else {
      template += `\nimport { Page } from '@missionfabric-js/enzyme/ui';`;
    }

    if (withGuard) {
      template += `\nimport { ${withGuard} } from '@/guards';`;
    }

    if (withLoader) {
      template += `\nimport { loader } from './loader';`;
    }

    if (withAction) {
      template += `\nimport { action } from './action';`;
    }

    if (withLoader || withAction) {
      template += `\nimport { useLoaderData, useActionData } from 'react-router-dom';`;
    }

    template += `

// ============================================================================
// Route Configuration
// ============================================================================

`;

    if (withMeta) {
      template += `/**
 * Route metadata
 */
export const meta = {
  title: '${withMeta}',
};

`;
    }

    if (withLoader) {
      template += `/**
 * Route loader export
 */
export { loader };

`;
    }

    if (withAction) {
      template += `/**
 * Route action export
 */
export { action };

`;
    }

    template += `// ============================================================================
// Component
// ============================================================================

`;

    if (withLoader) {
      template += `/**
 * Loader data type
 */
interface LoaderData {
  // Define your loader data type here
  data: unknown;
}

`;
    }

    if (withAction) {
      template += `/**
 * Action data type
 */
interface ActionData {
  // Define your action data type here
  success: boolean;
  message?: string;
}

`;
    }

    template += `/**
 * ${routeName} route component
 */
`;

    if (isLazy) {
      template += `export const Component = memo((): React.ReactElement => {`;
    } else {
      template += `const ${routeName} = memo((): React.ReactElement => {`;
    }

    if (withLoader) {
      template += `
  const loaderData = useLoaderData() as LoaderData;`;
    }

    if (withAction) {
      template += `
  const actionData = useActionData() as ActionData | undefined;`;
    }

    template += `

  `;

    if (withLayout) {
      template += `return (
    <${withLayout}>`;
    } else {
      template += `return (
    <Page title="${withMeta || routeName}">`;
    }

    template += `
      <div>
        <h1>${routeName}</h1>`;

    if (withLoader) {
      template += `
        <pre>{JSON.stringify(loaderData, null, 2)}</pre>`;
    }

    if (withAction) {
      template += `
        {actionData && (
          <div>
            <p>Action result: {actionData.message}</p>
          </div>
        )}`;
    }

    template += `
      </div>`;

    if (withLayout) {
      template += `
    </${withLayout}>`;
    } else {
      template += `
    </Page>`;
    }

    template += `
  );
});

`;

    if (!isLazy) {
      template += `${routeName}.displayName = '${routeName}';

`;

      if (withGuard) {
        template += `/**
 * Route export with guard
 */
export default ${withGuard}(${routeName});
`;
      } else {
        template += `export default ${routeName};
`;
      }
    } else {
      template += `Component.displayName = '${routeName}';
`;
    }

    return template;
  }

  private generateLoaderFile(): string {
    const routeName = this.getRouteName();

    return `/**
 * @file Route Loader: ${this.options.path}
 * @description Data loader for ${this.options.path} route
 */

import type { LoaderFunctionArgs } from 'react-router-dom';

/**
 * Route loader data
 */
export interface ${routeName}LoaderData {
  // Define your loader data structure here
  data: unknown;
}

/**
 * Loader function for ${this.options.path}
 */
export async function loader({ params, request }: LoaderFunctionArgs): Promise<${routeName}LoaderData> {
  // Extract route parameters
  const { ...routeParams } = params;

  // Extract URL search params
  const url = new URL(request.url);
  const searchParams = Object.fromEntries(url.searchParams);

  // TODO: Implement your data loading logic
  // Example: Fetch data from API
  const response = await fetch(\`/api${this.options.path}\`);
  if (!response.ok) {
    throw new Error('Failed to load data');
  }

  const data = await response.json();

  return {
    data,
  };
}
`;
  }

  private generateActionFile(): string {
    const routeName = this.getRouteName();

    return `/**
 * @file Route Action: ${this.options.path}
 * @description Form action handler for ${this.options.path} route
 */

import type { ActionFunctionArgs } from 'react-router-dom';
import { redirect } from 'react-router-dom';

/**
 * Route action result
 */
export interface ${routeName}ActionData {
  success: boolean;
  message?: string;
  errors?: Record<string, string>;
}

/**
 * Action function for ${this.options.path}
 */
export async function action({ params, request }: ActionFunctionArgs): Promise<${routeName}ActionData | Response> {
  // Extract route parameters
  const { ...routeParams } = params;

  // Parse form data
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  // Validate form data
  // TODO: Add your validation logic
  const errors: Record<string, string> = {};

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      errors,
    };
  }

  try {
    // TODO: Implement your action logic
    // Example: Submit data to API
    const response = await fetch(\`/api${this.options.path}\`, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Action failed');
    }

    // Success - redirect or return success data
    // return redirect('/success-page');

    return {
      success: true,
      message: 'Action completed successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
`;
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private getRouteName(): string {
    // Convert route path to component name
    // /users/:id -> UsersId
    // /admin/settings -> AdminSettings
    const segments = this.options.path
      .split('/')
      .filter(s => s && !s.startsWith(':'))
      .map(s => toPascalCase(s));

    return segments.join('') || 'Index';
  }

  protected async afterGenerate(result: import('../base').GeneratorResult): Promise<void> {
    await super.afterGenerate(result);

    this.log(`\n✓ Generated route for ${this.options.path} successfully!`, 'success');
    this.log(`\nFiles created:`, 'info');
    result.files.forEach(file => {
      this.log(`  ${this.formatPath(file)}`);
    });

    this.log(`\nNext steps:`, 'info');
    this.log(`  1. The route will be automatically picked up by file-system routing`);
    this.log(`  2. Access the route at: ${this.options.path}`);
    if (this.options.loader) {
      this.log(`  3. Implement data loading in loader.ts`);
    }
    if (this.options.action) {
      this.log(`  4. Implement form handling in action.ts`);
    }
    if (this.options.guard) {
      this.log(`  5. Route is protected by ${this.options.guard} guard`);
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create and run route generator
 */
export async function generateRoute(options: RouteGeneratorOptions): Promise<void> {
  const generator = new RouteGenerator(options);
  await generator.run();
}
