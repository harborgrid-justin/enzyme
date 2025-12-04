/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Import Enzyme performance utilities
import { performance } from '@missionfabric-js/enzyme';

// Initialize performance monitoring with correct options
performance.initPerformanceMonitoring({
  debug: true,
  reportToAnalytics: true,
  analyticsEndpoint: '/api/metrics',
  sampleRate: 1,
});

// Error reporting for development
if (process.env.NODE_ENV === 'development') {
  const originalError = console.error;
  console.error = (...args) => {
    originalError.apply(console, args);
    // In a real app, you'd send this to your error reporting service
  };
}

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
