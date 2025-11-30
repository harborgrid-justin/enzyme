/**
 * App Component Template Generator
 */

import type { TemplateContext } from '../utils';

export function generateAppTsx(context: TemplateContext): string {
  const {
    hasRouting,
    hasState,
    hasAuth,
    hasMonitoring,
    hasTheme,
    template
  } = context;

  // For minimal template, generate a simple component
  if (template === 'minimal') {
    return `import { ThemeProvider } from '@missionfabric-js/enzyme/theme';

function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to Enzyme
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          Your minimal enzyme project is ready!
        </p>
        <div className="space-x-4">
          <a
            href="https://github.com/harborgrid-justin/enzyme"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Documentation
          </a>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <HomePage />
    </ThemeProvider>
  );
}
`;
  }

  // For other templates, generate provider-wrapped app
  const imports: string[] = [];
  const providers: string[] = [];

  if (hasTheme) {
    imports.push(`import { ThemeProvider } from '@missionfabric-js/enzyme/theme';`);
    providers.push('ThemeProvider');
  }

  if (hasState) {
    imports.push(`import { QueryClient, QueryClientProvider } from '@tanstack/react-query';`);
  }

  if (hasAuth) {
    imports.push(`import { AuthProvider } from '@missionfabric-js/enzyme/auth';`);
    providers.push('AuthProvider');
  }

  if (hasMonitoring) {
    imports.push(`import { GlobalErrorBoundary } from '@missionfabric-js/enzyme/monitoring';`);
    imports.push(`import { PerformanceProvider } from '@missionfabric-js/enzyme/performance';`);
    providers.push('GlobalErrorBoundary');
    providers.push('PerformanceProvider');
  }

  if (hasRouting) {
    imports.push(`import { RouterProvider } from 'react-router-dom';`);
    imports.push(`import { router } from './config/router';`);
  }

  return `import React from 'react';
${imports.join('\n')}
${hasState ? `
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});` : ''}

export default function App() {
  return (
${hasTheme ? '    <ThemeProvider>' : ''}
${hasState ? '      <QueryClientProvider client={queryClient}>' : ''}
${hasAuth ? '        <AuthProvider>' : ''}
${hasMonitoring ? '          <GlobalErrorBoundary>\n            <PerformanceProvider>' : ''}
${hasRouting ? '              <RouterProvider router={router} />' : '              <div>App Content</div>'}
${hasMonitoring ? '            </PerformanceProvider>\n          </GlobalErrorBoundary>' : ''}
${hasAuth ? '        </AuthProvider>' : ''}
${hasState ? '      </QueryClientProvider>' : ''}
${hasTheme ? '    </ThemeProvider>' : ''}
  );
}
`;
}
