import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { worker } from './chat/mocks/browser';
import { startChatSocketServer } from './chat/transport/socketServer';
import './index.css';

async function bootstrap(): Promise<void> {
  // 1) MSW must be active before any request fires (mocks auth + messages).
  await worker.start({ onUnhandledRequest: 'bypass' });

  // 2) Stand up the in-browser mock WebSocket server for the realtime stream.
  startChatSocketServer();

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
