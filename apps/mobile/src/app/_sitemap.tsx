import { Sitemap } from 'expo-router';

import NotFoundScreen from './+not-found';

/**
 * Expo Router's route list is a development tool: kept in development, a 404
 * on the public website (W1). The static file is also removed after export
 * (scripts/web-postexport.mjs).
 */
export default function SitemapRoute() {
  return __DEV__ ? <Sitemap /> : <NotFoundScreen />;
}
