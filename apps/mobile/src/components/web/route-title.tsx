import { useGlobalSearchParams, usePathname } from 'expo-router';
import Head from 'expo-router/head';

import { pageTitle } from '@/lib/page-title';
import { getTrackById } from '@/mocks';
import { usePlayerStore } from '@/state/player-store';

/**
 * Sets the document title for every route (W1): browser tabs, history and
 * shared links show the page, e.g. "Solaris Echo – Mmusic". Rendered once in
 * the root layout, also during the static export, so each HTML page ships
 * with its own title. A screen may override it with its own <Head>.
 */
export function RouteTitle() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const currentTrack = usePlayerStore((s) => s.currentTrack());
  const requested = typeof params.trackId === 'string' ? getTrackById(params.trackId) : undefined;

  return (
    <Head>
      <title>{pageTitle(pathname, params, requested ?? currentTrack)}</title>
    </Head>
  );
}
