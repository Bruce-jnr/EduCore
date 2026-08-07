import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.jsx';
import { AuthProvider } from './features/auth/AuthContext.jsx';
import { ThemeProvider } from './features/theme/ThemeProvider.jsx';

const savedTheme = localStorage.getItem('educore_theme');
document.documentElement.dataset.theme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider><AuthProvider><App /></AuthProvider></ThemeProvider>
  </StrictMode>,
);
