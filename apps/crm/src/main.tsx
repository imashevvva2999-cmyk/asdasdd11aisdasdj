import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';

import { BackofficeProvider } from '@mmusic/backoffice/react';
import { invalidPermissions } from '@mmusic/backoffice/rbac';
import { foundationCss } from '@mmusic/ui-kit/web';

import { backoffice, router } from '@/app';

// Shared Mmusic fonts, icon fonts, token variables and type classes before the first render (as the website does).
const foundation = document.createElement('style');
foundation.id = 'mmusic-foundation';
foundation.textContent = foundationCss();
document.head.prepend(foundation);

if (import.meta.env.DEV) {
  for (const role of backoffice.roles) {
    const wrong = invalidPermissions(role);
    if (wrong.length > 0) console.error(`[CRM] role ${role.id} holds permissions of another app:`, wrong);
  }
}

const root = document.getElementById('root');
if (!root) throw new Error('#root element is missing from index.html');

createRoot(root).render(
  <StrictMode>
    <BackofficeProvider value={backoffice}>
      <RouterProvider router={router} />
    </BackofficeProvider>
  </StrictMode>,
);
