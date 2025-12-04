/**
 * Providers Template Generator
 */

import type { TemplateContext } from '../utils';

export function generateProviders(context: TemplateContext): string {
  const { hasAuth, hasTheme, hasMonitoring } = context;

  if (!hasAuth && !hasTheme && !hasMonitoring) {
    return `/**
 * Provider orchestration
 *
 * This file is reserved for future provider composition.
 */

export {};
`;
  }

  return `/**
 * Provider orchestration
 *
 * Combines all application providers in the correct order.
 */

import React from 'react';
${hasTheme ? `import { ThemeProvider } from '@missionfabric-js/enzyme/theme';` : ''}
${hasAuth ? `import { AuthProvider } from '@missionfabric-js/enzyme/auth';` : ''}
${hasMonitoring ? `import { GlobalErrorBoundary } from '@missionfabric-js/enzyme/monitoring';` : ''}

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
${hasTheme ? '    <ThemeProvider>' : ''}
${hasAuth ? '      <AuthProvider>' : ''}
${hasMonitoring ? '        <GlobalErrorBoundary>' : ''}
          {children}
${hasMonitoring ? '        </GlobalErrorBoundary>' : ''}
${hasAuth ? '      </AuthProvider>' : ''}
${hasTheme ? '    </ThemeProvider>' : ''}
  );
}
`;
}
