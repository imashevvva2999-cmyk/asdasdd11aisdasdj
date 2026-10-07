import { Redirect } from 'expo-router';

/**
 * Root URL redirects into the Home tab (Фаза 3 — docs/screens.md §1 "Таб-бар [Д]").
 * Superseded the Фаза 1 "Hello Mmusic" placeholder now that real navigation exists.
 */
export default function RootIndex() {
  return <Redirect href="/home" />;
}
