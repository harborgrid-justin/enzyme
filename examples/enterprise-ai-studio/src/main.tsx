import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { worker } from './studio/mocks/browser';
import './index.css';

async function bootstrap(): Promise<void> {
  // MSW must be active before any request fires (mocks auth + studio endpoints).
  await worker.start({ onUnhandledRequest: 'bypass' });

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
