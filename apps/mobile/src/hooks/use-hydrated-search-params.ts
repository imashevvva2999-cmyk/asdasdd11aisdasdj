import { useLocalSearchParams } from 'expo-router';

import { useHydrated } from './use-hydrated';

/**
 * Query parameters (`?q=`, `?id=`…) that are safe to render on the static
 * website (React #418). The static HTML is built without a query string, so a
 * screen that renders from `useLocalSearchParams` during hydration draws a
 * different tree than the server did. This returns `undefined` while the page
 * hydrates — the screen shows a neutral shell, exactly like the static HTML,
 * never another state's content — and the real parameters straight after.
 * Screens mounted later (in-app navigation) get the parameters at once.
 */
export function useHydratedSearchParams<T extends Record<string, string | undefined>>(): Partial<T> | undefined {
  const params = useLocalSearchParams() as Partial<T>;
  return useHydrated() ? params : undefined;
}
