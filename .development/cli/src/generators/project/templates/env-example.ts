/**
 * Environment Variables Example Template Generator
 */

import type { TemplateContext } from '../utils';

export function generateEnvExample(context: TemplateContext): string {
  const { hasAuth, hasMonitoring } = context;

  let content = `# Application
VITE_APP_NAME=${context.projectName}
VITE_APP_VERSION=0.1.0

# API Configuration
VITE_API_URL=http://localhost:3001/api
VITE_API_TIMEOUT=10000
`;

  if (hasAuth) {
    content += `
# Authentication
VITE_AUTH_TOKEN_KEY=auth_token
VITE_AUTH_REFRESH_KEY=refresh_token
`;
  }

  if (hasMonitoring) {
    content += `
# Monitoring & Analytics
VITE_ENABLE_ANALYTICS=false
VITE_ANALYTICS_ENDPOINT=/api/analytics
VITE_SENTRY_DSN=
`;
  }

  return content;
}
