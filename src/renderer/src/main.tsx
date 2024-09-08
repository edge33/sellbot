import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import SettingsContextProvider from './Context';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsContextProvider>
      <App />
    </SettingsContextProvider>
  </StrictMode>
);
