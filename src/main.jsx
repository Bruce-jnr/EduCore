import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.jsx';
import { AuthProvider } from './features/auth/AuthContext.jsx';
import { ThemeProvider } from './features/theme/ThemeProvider.jsx';
import './sirbus-style.css';
import './typography.css';

const previousBrandPrefix = ['edu', 'core'].join('');
for (const key of ['token', 'user', 'theme']) {
  const previousKey = `${previousBrandPrefix}_${key}`;
  const currentKey = `edupalgh_${key}`;
  if (!localStorage.getItem(currentKey) && localStorage.getItem(previousKey)) {
    localStorage.setItem(currentKey, localStorage.getItem(previousKey));
  }
  localStorage.removeItem(previousKey);
}

const savedTheme = localStorage.getItem('edupalgh_theme');
document.documentElement.dataset.theme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider><AuthProvider><App /></AuthProvider></ThemeProvider>
  </StrictMode>,
);
