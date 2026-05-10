import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { listenForInstallPrompt, registerServiceWorker } from './lib/pwa';

listenForInstallPrompt();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

registerServiceWorker();
