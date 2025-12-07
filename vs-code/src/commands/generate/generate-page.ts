import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { BaseCommand, CommandContext, CommandMetadata } from '../base-command';

interface PageOptions {
  name: string;
  routePath: string;
  layout?: string;
  guards: string[];
  params: string[];
  withLoader: boolean;
  withMeta: boolean;
}

/**
 * Generate Page Command
 * Creates a new page component with route registration
 * Keybinding: Ctrl+Shift+G P
 */
export class GeneratePageCommand extends BaseCommand {
  getMetadata(): CommandMetadata {
    return {
      id: 'enzyme.generate.page',
      title: 'Enzyme: Generate Page',
      category: 'Enzyme Generate',
      icon: '$(file)',
      keybinding: {
        key: 'ctrl+shift+g p',
        mac: 'cmd+shift+g p',
        when: 'editorTextFocus',
      },
    };
  }

  protected async executeCommand(_context: CommandContext): Promise<void> {
    const workspaceFolder = await this.ensureWorkspaceFolder();

    // Gather page options
    const options = await this.gatherPageOptions();
    if (!options) {
      return; // User cancelled
    }

    // Generate the page
    await this.withProgress(
      `Generating ${options.name} page...`,
      async (progress, token) => {
        progress.report({ message: 'Creating page files...' });

        const pagePath = await this.generatePage(
          workspaceFolder,
          options,
          token
        );

        progress.report({ message: 'Registering route...', increment: 60 });

        await this.registerRoute(workspaceFolder, options);

        progress.report({ message: 'Opening files...', increment: 80 });

        // Open the generated page file
        const pageFile = vscode.Uri.file(pagePath);
        await this.openFile(pageFile);

        progress.report({ message: 'Done!', increment: 100 });
      }
    );

    await this.showInfo(
      `Page "${options.name}" created successfully at route "${options.routePath}"!`
    );
  }

  private async gatherPageOptions(): Promise<PageOptions | undefined> {
    // Get route path
    const routePath = await this.showInputBox({
      prompt: 'Enter route path (e.g., /users/:id)',
      placeHolder: '/my-route',
      validateInput: (value) => {
        if (!value) {
          return 'Route path is required';
        }
        if (!value.startsWith('/')) {
          return 'Route path must start with /';
        }
        return undefined;
      },
    });

    if (!routePath) {
      return undefined;
    }

    // Extract route parameters
    const params = this.extractRouteParams(routePath);

    // Get page name (default from route path)
    const defaultName = this.routePathToPageName(routePath);
    const name = await this.showInputBox({
      prompt: 'Enter page name (PascalCase)',
      placeHolder: defaultName,
      value: defaultName,
      validateInput: (value) => {
        if (!value) {
          return 'Page name is required';
        }
        if (!/^[A-Z][a-zA-Z0-9]*Page$/.test(value)) {
          return 'Page name must be in PascalCase and end with "Page" (e.g., MyPage)';
        }
        return undefined;
      },
    });

    if (!name) {
      return undefined;
    }

    // Select layout
    const layoutOptions = [
      { label: '$(layout) Default Layout', value: 'default' },
      { label: '$(layout) Dashboard Layout', value: 'dashboard' },
      { label: '$(layout) Auth Layout', value: 'auth' },
      { label: '$(layout) Blank Layout', value: 'blank' },
      { label: '$(close) No Layout', value: undefined },
    ];

    const layoutSelection = await this.showQuickPick(layoutOptions, {
      title: 'Select Layout',
      placeHolder: 'Choose a layout for the page',
    });

    if (layoutSelection === undefined) {
      return undefined;
    }

    const layout = layoutSelection.value;

    // Select guards
    const guardOptions = [
      { label: 'Require Authentication', value: 'auth', picked: false },
      { label: 'Require Admin Role', value: 'admin', picked: false },
      { label: 'Require Specific Permission', value: 'permission', picked: false },
    ];

    const selectedGuards = await vscode.window.showQuickPick(guardOptions, {
      canPickMany: true,
      title: 'Route Guards',
      placeHolder: 'Select route guards (optional)',
    });

    const guards = selectedGuards?.map((g) => g.value) ?? [];

    // Additional options
    const optionItems = [
      { label: 'Include Loader Function', picked: true, value: 'loader' },
      { label: 'Include Meta Tags', picked: true, value: 'meta' },
    ];

    const selectedOptions = await vscode.window.showQuickPick(optionItems, {
      canPickMany: true,
      title: 'Page Options',
      placeHolder: 'Select additional options',
    });

    const withLoader =
      selectedOptions?.some((o) => o.value === 'loader') ?? true;
    const withMeta = selectedOptions?.some((o) => o.value === 'meta') ?? true;

    return {
      name,
      routePath,
      layout,
      guards,
      params,
      withLoader,
      withMeta,
    };
  }

  private extractRouteParams(routePath: string): string[] {
    const paramRegex = /:([a-zA-Z0-9_]+)/g;
    const params: string[] = [];
    let match;

    while ((match = paramRegex.exec(routePath)) !== null) {
      params.push(match[1]);
    }

    return params;
  }

  private routePathToPageName(routePath: string): string {
    // Remove leading slash and parameters
    const cleaned = routePath
      .replace(/^\//, '')
      .replace(/\/:[^/]+/g, '')
      .replace(/\//g, '-');

    // Convert to PascalCase
    const pascalCase = cleaned
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');

    return `${pascalCase || 'Home'}Page`;
  }

  private async generatePage(
    workspaceFolder: vscode.WorkspaceFolder,
    options: PageOptions,
    token: vscode.CancellationToken
  ): Promise<string> {
    const srcPath = path.join(workspaceFolder.uri.fsPath, 'src');
    const pagesPath = path.join(srcPath, 'pages');

    // Create pages directory if it doesn't exist
    await fs.mkdir(pagesPath, { recursive: true });

    if (token.isCancellationRequested) {
      throw new Error('Operation cancelled');
    }

    // Generate page file
    const pagePath = path.join(pagesPath, `${options.name}.tsx`);
    const pageContent = this.generatePageContent(options);
    await fs.writeFile(pagePath, pageContent);

    // Generate loader file if requested
    if (options.withLoader) {
      const loaderPath = path.join(pagesPath, `${options.name}.loader.ts`);
      const loaderContent = this.generateLoaderContent(options);
      await fs.writeFile(loaderPath, loaderContent);
    }

    return pagePath;
  }

  private generatePageContent(options: PageOptions): string {
    const { name, params, withLoader, withMeta } = options;

    const imports = [
      "import React from 'react';",
      params.length > 0 ? "import { useParams } from 'react-router-dom';" : null,
      withLoader ? `import { useLoaderData } from 'react-router-dom';` : null,
      withMeta ? "import { Helmet } from 'react-helmet-async';" : null,
    ]
      .filter(Boolean)
      .join('\n');

    const paramsInterface =
      params.length > 0
        ? `
interface RouteParams {
  ${params.map((p) => `${p}: string;`).join('\n  ')}
}
`
        : '';

    const loaderDataInterface = withLoader
      ? `
interface LoaderData {
  // Add loader data types here
  data?: unknown;
}
`
      : '';

    const hooks = [
      params.length > 0 ? `const params = useParams<RouteParams>();` : null,
      withLoader ? `const loaderData = useLoaderData() as LoaderData;` : null,
    ]
      .filter(Boolean)
      .join('\n  ');

    const metaTags = withMeta
      ? `
      <Helmet>
        <title>${name}</title>
        <meta name="description" content="${name} description" />
      </Helmet>
`
      : '';

    return `${imports}
${paramsInterface}${loaderDataInterface}
export const ${name}: React.FC = () => {
  ${hooks}

  return (
    <div>
      ${metaTags}
      <h1>${name}</h1>
      ${params.length > 0 ? `<p>Route params: {JSON.stringify(params)}</p>` : ''}
      ${withLoader ? `<p>Loader data: {JSON.stringify(loaderData)}</p>` : ''}
    </div>
  );
};
`;
  }

  private generateLoaderContent(options: PageOptions): string {
    const { name, params } = options;

    const paramsType =
      params.length > 0
        ? `{ ${params.map((p) => `${p}: string`).join(', ')} }`
        : 'Record<string, never>';

    return `import { LoaderFunctionArgs } from 'react-router-dom';

export async function ${name.replace('Page', '')}Loader({
  params,
  request,
}: LoaderFunctionArgs) {
  const routeParams = params as ${paramsType};

  // Add your data loading logic here
  // Example:
  // const data = await fetchData(routeParams.id);

  return {
    data: {},
    ${params.map((p) => `${p}: routeParams.${p}`).join(',\n    ')},
  };
}
`;
  }

  private async registerRoute(
    workspaceFolder: vscode.WorkspaceFolder,
    options: PageOptions
  ): Promise<void> {
    const srcPath = path.join(workspaceFolder.uri.fsPath, 'src');
    const routesPath = path.join(srcPath, 'routes');

    // Create routes directory if it doesn't exist
    await fs.mkdir(routesPath, { recursive: true });

    // Read or create routes config
    const routesConfigPath = path.join(routesPath, 'index.ts');
    let routesContent = '';

    try {
      routesContent = await fs.readFile(routesConfigPath, 'utf-8');
    } catch {
      // File doesn't exist, create initial content
      routesContent = `import { RouteObject } from 'react-router-dom';\n\nexport const routes: RouteObject[] = [];\n`;
    }

    // Generate route configuration
    const routeConfig = this.generateRouteConfig(options);

    // Insert route configuration
    const updatedContent = this.insertRouteConfig(routesContent, routeConfig);
    await fs.writeFile(routesConfigPath, updatedContent);

    this.log('info', `Route registered at ${options.routePath}`);
  }

  private generateRouteConfig(options: PageOptions): string {
    const { name, routePath, layout, guards, withLoader } = options;

    const loaderImport = withLoader
      ? `import { ${name.replace('Page', '')}Loader } from '../pages/${name}.loader';`
      : '';

    const guardConfig =
      guards.length > 0
        ? `
    meta: {
      guards: [${guards.map((g) => `'${g}'`).join(', ')}],
    },`
        : '';

    const loaderConfig = withLoader
      ? `
    loader: ${name.replace('Page', '')}Loader,`
      : '';

    const layoutConfig = layout
      ? `
    element: <${layout === 'default' ? 'DefaultLayout' : layout === 'dashboard' ? 'DashboardLayout' : layout === 'auth' ? 'AuthLayout' : 'BlankLayout'}><${name} /></>,`
      : `
    element: <${name} />,`;

    return `${loaderImport}
import { ${name} } from '../pages/${name}';

// Add this route to your routes array:
{
  path: '${routePath}',${layoutConfig}${loaderConfig}${guardConfig}
}`;
  }

  private insertRouteConfig(
    existingContent: string,
    routeConfig: string
  ): string {
    // Add import at the top (after existing imports)
    const importMatch = routeConfig.match(/^(import.*\n)+/m);
    if (importMatch) {
      const imports = importMatch[0];
      const lastImportIndex = existingContent.lastIndexOf('import ');
      const afterLastImport = existingContent.indexOf('\n', lastImportIndex);
      existingContent =
        existingContent.slice(0, afterLastImport + 1) +
        imports +
        existingContent.slice(afterLastImport + 1);
    }

    // Add route object as a comment for manual insertion
    const routeObject = routeConfig.split('// Add this route to your routes array:')[1];
    if (routeObject) {
      // Add as a comment at the end
      existingContent += `\n// TODO: Add this route to your routes array:\n/*${routeObject}*/\n`;
    }

    return existingContent;
  }
}
