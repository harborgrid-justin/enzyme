import type { GeneratorOptions, GeneratorTemplate } from '../index';

/**
 * Generate page template files
 * @param options - Generator configuration options
 * @returns {GeneratorTemplate} The generated page template structure
 */
export function pageTemplate(options: GeneratorOptions): GeneratorTemplate {
  const { name, path: basePath = 'src/pages', skipTests } = options;
  const pagePath = `${basePath}/${name}`;

  const files = [];

  // Main page component
  files.push({
    path: `${pagePath}/${name}Page.tsx`,
    content: generatePage(name),
  });

  // Page types
  files.push({
    path: `${pagePath}/${name}Page.types.ts`,
    content: generateTypes(name),
  });

  // Loader
  files.push({
    path: `${pagePath}/${name}Page.loader.ts`,
    content: generateLoader(name),
  });

  // Error boundary
  files.push({
    path: `${pagePath}/${name}Page.error.tsx`,
    content: generateErrorBoundary(name),
  });

  // Test file
  if (!skipTests) {
    files.push({
      path: `${pagePath}/${name}Page.test.tsx`,
      content: generateTest(name),
    });
  }

  // Index barrel export
  files.push({
    path: `${pagePath}/index.ts`,
    content: generateIndex(name),
  });

  return {
    type: 'page',
    files,
  };
}

/**
 * Generate page component
 * @param name - The name of the page
 * @returns {string} The generated page code
 */
function generatePage(name: string): string {
  return `import React from 'react';
import { useLoaderData } from 'react-router-dom';
import { ${name}PageProps, ${name}PageData } from './${name}Page.types';

export const ${name}Page: React.FC<${name}PageProps> = () => {
  const data = useLoaderData() as ${name}PageData;

  return (
    <div className="${name.toLowerCase()}-page">
      <h1>${name}</h1>
      <p>Welcome to the ${name} page</p>
      {/* Add your page content here */}
    </div>
  );
};

${name}Page.displayName = '${name}Page';
`;
}

/**
 * Generate TypeScript types for page
 * @param name - The name of the page
 * @returns {string} The generated types code
 */
function generateTypes(name: string): string {
  return `export interface ${name}PageProps {
  // Add your props here
}

export interface ${name}PageData {
  // Add your loader data types here
}

export interface ${name}PageParams {
  // Add your route params here
}
`;
}

/**
 * Generate router loader function
 * @param name - The name of the page
 * @returns {string} The generated loader code
 */
function generateLoader(name: string): string {
  return `import { LoaderFunctionArgs } from 'react-router-dom';
import { ${name}PageData, ${name}PageParams } from './${name}Page.types';

export async function ${name.toLowerCase()}PageLoader({
  params,
  request,
}: LoaderFunctionArgs): Promise<${name}PageData> {
  // Fetch data for the page
  const data: ${name}PageData = {
    // Add your data here
  };

  return data;
}
`;
}

/**
 * Generate error boundary component
 * @param name - The name of the page
 * @returns {string} The generated error boundary code
 */
function generateErrorBoundary(name: string): string {
  return `import React from 'react';
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';

export const ${name}PageError: React.FC = () => {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="error-page">
        <h1>{error.status} {error.statusText}</h1>
        <p>{error.data}</p>
      </div>
    );
  }

  return (
    <div className="error-page">
      <h1>Oops!</h1>
      <p>Something went wrong on the ${name} page.</p>
    </div>
  );
};

${name}PageError.displayName = '${name}PageError';
`;
}

/**
 * Generate test file
 * @param name - The name of the page
 * @returns {string} The generated test code
 */
function generateTest(name: string): string {
  return `import React from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { ${name}Page } from './${name}Page';
import { ${name.toLowerCase()}PageLoader } from './${name}Page.loader';

describe('${name}Page', () => {
  it('renders the page', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <${name}Page />,
          loader: ${name.toLowerCase()}PageLoader,
        },
      ],
      {
        initialEntries: ['/'],
      }
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('${name}')).toBeInTheDocument();
  });
});
`;
}

/**
 * Generate index barrel export
 * @param name - The name of the page
 * @returns {string} The generated index code
 */
function generateIndex(name: string): string {
  return `export { ${name}Page } from './${name}Page';
export { ${name}PageError } from './${name}Page.error';
export { ${name.toLowerCase()}PageLoader } from './${name}Page.loader';
export type { ${name}PageProps, ${name}PageData, ${name}PageParams } from './${name}Page.types';
`;
}
