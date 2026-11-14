import '@fontsource-variable/big-shoulders';
import '@fontsource-variable/schibsted-grotesk';
import '@fontsource/dm-mono/latin-400.css';
import '@fontsource/dm-mono/latin-500.css';
import './styles/tokens.css';
import './styles/global.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { applyTheme, useThemeStore } from './state/themeStore';

applyTheme(useThemeStore.getState().theme);
useThemeStore.subscribe((state) => applyTheme(state.theme));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
