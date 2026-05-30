import { performance as perf, utils } from '@missionfabric-js/enzyme';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { worker } from './studio/mocks/browser';
import './index.css';

async function bootstrap(): Promise<void> {
  // MSW must be active before any request fires (mocks auth + studio endpoints).
  await worker.start({ onUnhandledRequest: 'bypass' });

  // Collect Core Web Vitals (LCP/INP/CLS/…) via enzyme's vitals collector and
  // forward each sample into enzyme's analytics pipeline, so the studio is no
  // longer uninstrumented. Both are framework primitives — no bespoke wiring.
  perf.initVitals({
    onMetric: (metric) => {
      utils.trackEvent('web_vital', {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
      });
    },
  });
  utils.trackEvent('studio_loaded');

  const rootElement = document.getElementById('root');
  if (rootElement == null) {
    throw new Error('Root element #root not found');
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

void bootstrap();
