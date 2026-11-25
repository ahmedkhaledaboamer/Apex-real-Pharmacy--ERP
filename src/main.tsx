import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { LocaleProvider } from './lib/i18n';

/** Product photos fall back to their drawing (/images/products/<slug>.svg) when the .jpg is missing. */
window.addEventListener(
  'error',
  (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement)) return;
    const m = img.src.match(/^(.*\/images\/products\/[^/?#]+)\.jpg$/);
    if (m) img.src = `${m[1]}.svg`;
  },
  true
);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LocaleProvider>
      <App />
    </LocaleProvider>
  </React.StrictMode>
);
