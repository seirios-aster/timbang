import '@fontsource-variable/big-shoulders';
import '@fontsource-variable/schibsted-grotesk';
import '@fontsource/dm-mono/latin-400.css';
import '@fontsource/dm-mono/latin-500.css';
import './styles/tokens.css';
import './styles/global.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ErrorBoundary } from './app/ErrorBoundary';
import './lib/install';
import './state/customFoodsStore';
import { applyTheme, useThemeStore } from './state/themeStore';

applyTheme(useThemeStore.getState().theme);
useThemeStore.subscribe((state) => applyTheme(state.theme));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Fade out the launch screen once the app and its fonts are ready. It stays up for at least
// 450 ms from the start of loading, so the needle has time to settle instead of flashing.
const splash = document.getElementById('splash');
if (splash) {
  const ready = Promise.race([document.fonts.ready, new Promise((resolve) => window.setTimeout(resolve, 2000))]);
  void ready.then(() => {
    window.setTimeout(() => {
      splash.classList.add('out');
      window.setTimeout(() => splash.remove(), 450);
    }, Math.max(0, 450 - performance.now()));
  });
}

// Offline support. Only in the built app, since the dev server serves files that change constantly.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
  });
}
