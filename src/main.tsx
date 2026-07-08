import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { applySyncFromUrl } from './learn/progress';
import './styles/app.css';

// Import a ?sync=… backup into localStorage before any component reads progress.
applySyncFromUrl();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
