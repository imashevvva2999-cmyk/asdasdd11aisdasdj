import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';

import { router } from '@/router';
import { fontFacesCss } from '@/styles/fonts';
import { tokenVariablesCss, typeScaleCss } from '@/styles/tokens';
import '@/styles/global.css';

// Fonts, token variables and type classes are injected before the first render, so there is no unstyled flash.
const foundation = document.createElement('style');
foundation.id = 'mmusic-foundation';
foundation.textContent = fontFacesCss() + tokenVariablesCss() + typeScaleCss();
document.head.prepend(foundation);

const root = document.getElementById('root');
if (!root) throw new Error('#root element is missing from index.html');

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
