import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';

import { foundationCss } from '@mmusic/ui-kit/web';

import { router } from '@/router';
import '@/styles/global.css';

// Fonts, icon fonts, token variables, type classes and shared component styles are injected before the first render, so there is no unstyled flash.
const foundation = document.createElement('style');
foundation.id = 'mmusic-foundation';
foundation.textContent = foundationCss();
document.head.prepend(foundation);

const root = document.getElementById('root');
if (!root) throw new Error('#root element is missing from index.html');

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
