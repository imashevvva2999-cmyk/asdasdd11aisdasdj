import { DemoStrings } from '@mmusic/core/demo/demo-strings';

import { useLocaleStore } from '@/state/locale-store';

// The RU/EN table lives in @mmusic/core (W2.4b group 3); the locale hook stays with the app's store.
export { DemoStrings };

export function useDemoStrings() {
  const locale = useLocaleStore((s) => s.locale);
  return { d: DemoStrings[locale], locale };
}
