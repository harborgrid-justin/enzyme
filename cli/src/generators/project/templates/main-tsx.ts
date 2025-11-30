/**
 * Main Entry Point Template Generator
 */

import type { TemplateContext } from '../utils';

export function generateMainTsx(context: TemplateContext): string {
  const { hasMonitoring } = context;

  return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
${hasMonitoring ? `
// Initialize performance monitoring
import { initPerformanceMonitoring } from '@missionfabric-js/enzyme/performance';

initPerformanceMonitoring({
  debug: import.meta.env.DEV,
  reportToAnalytics: true,
  analyticsEndpoint: import.meta.env.VITE_ANALYTICS_ENDPOINT || '/api/analytics',
  sampleRate: 1,
});` : ''}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
}
