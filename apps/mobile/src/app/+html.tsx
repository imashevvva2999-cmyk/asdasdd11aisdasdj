import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { Colors } from '@/constants/theme';

const DESCRIPTION = 'Listen to music and support the artists you love.';

/**
 * The website's HTML document (W1), used for every statically rendered page.
 * - `viewport-fit=cover`: on iPhones with a notch or home indicator the page
 *   gets the real safe-area insets, which the app already lays out around.
 * - Zoom stays allowed (accessibility).
 * - Basic metadata, Open Graph and the web app manifest; the page title is
 *   set per route by <RouteTitle> in the root layout.
 * - The canvas colour on <html>/<body> so overscroll and loading never flash white.
 * Runs only in Node during the export — no browser APIs here.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="description" content={DESCRIPTION} />
        <meta name="theme-color" content={Colors.canvas} />
        <meta name="color-scheme" content="dark" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Mmusic" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Mmusic" />
        <meta property="og:title" content="Mmusic" />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:image" content="/icons/icon-512.png" />
        <meta name="twitter:card" content="summary" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: baseCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const baseCss = `
html, body { background-color: ${Colors.canvas}; color-scheme: dark; overscroll-behavior: none; }
body { -webkit-text-size-adjust: 100%; }
`;
