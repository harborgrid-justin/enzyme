/**
 * Config Template Generator
 */

import type { TemplateContext } from '../utils';

export function generateConfig(context: TemplateContext): string {
  const { projectName, hasRouting, hasAuth, hasMonitoring, template } = context;

  let content = `/**
 * Application configuration
 */

export const config = {
  app: {
    name: '${projectName}',
    version: '0.1.0',
    environment: import.meta.env.MODE,
  },
  api: {
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
    timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 10000,
  },
};

export default config;
`;

  if (hasRouting) {
    content += `

// Router configuration
import { createRouter } from '@missionfabric-js/enzyme/routing';
import type { RouteConfig } from '@missionfabric-js/enzyme/routing';

const routeConfigs: RouteConfig[] = [
  { path: '/', importFn: () => import('../routes/Home') },
  { path: '/about', importFn: () => import('../routes/About') },`;

    if (hasAuth) {
      content += `
  { path: '/login', importFn: () => import('../routes/Login') },
  { path: '/dashboard', importFn: () => import('../routes/Dashboard') },`;
    }

    if (hasMonitoring) {
      content += `
  { path: '/monitoring', importFn: () => import('../routes/Monitoring') },`;
    }

    if (template === 'full') {
      content += `
  { path: '/features', importFn: () => import('../routes/Features') },`;
    }

    content += `
];

export const router = createRouter(routeConfigs, {
  prefetchOnHover: true,
  prefetchDelay: 100,
});
`;
  }

  return content;
}
