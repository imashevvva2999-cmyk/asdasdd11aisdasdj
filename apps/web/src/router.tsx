import { createBrowserRouter, Navigate } from 'react-router';

import { HomePage, LibraryPage, NotFoundPage, ProfilePage, SearchPage } from '@/routes/pages';
import { AppShell } from '@/shell/AppShell';

// URLs mirror the Expo app (/home, /search, /library, /profile) for page-by-page parity checks later.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <HomePage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
