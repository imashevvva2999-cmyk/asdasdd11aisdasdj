import { Platform } from 'react-native';

import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

/**
 * Concrete loaded font family names, keyed so `resolveFontFamily` can look one up
 * from a design-tokens type-scale entry (`{ fontFamily, fontWeight }`). RN renders
 * custom fonts reliably cross-platform only when each weight is its own family name
 * (no runtime weight synthesis), so this mapping — not raw `fontWeight` — is what
 * actually selects the glyphs.
 */
export const loadedFonts = {
  'PlusJakartaSans-600': PlusJakartaSans_600SemiBold,
  'PlusJakartaSans-700': PlusJakartaSans_700Bold,
  'PlusJakartaSans-800': PlusJakartaSans_800ExtraBold,
  'Inter-400': Inter_400Regular,
  'Inter-500': Inter_500Medium,
  'Inter-600': Inter_600SemiBold,
  'Inter-700': Inter_700Bold,
} as const;

const familyDefaults: Record<string, { prefix: string; fallbackWeight: string }> = {
  'Plus Jakarta Sans': { prefix: 'PlusJakartaSans', fallbackWeight: '700' },
  Inter: { prefix: 'Inter', fallbackWeight: '400' },
};

/**
 * Resolve a design-tokens `{ fontFamily, fontWeight }` pair to the font-family
 * *key* registered with `useFonts(loadedFonts)` — that key string is what RN uses
 * to look up the loaded glyphs, not the numeric asset value stored in `loadedFonts`.
 */
export function resolveFontFamily(fontFamily: string, fontWeight: string): string {
  const { prefix, fallbackWeight } = familyDefaults[fontFamily] ?? familyDefaults.Inter;
  const key = `${prefix}-${fontWeight}`;
  const resolved = key in loadedFonts ? key : `${prefix}-${fallbackWeight}`;
  if (Platform.OS !== 'web') return resolved;
  // Plus Jakarta Sans has no Cyrillic glyphs, so on web the browser filled
  // "сом" etc. from its default *serif* face. Fall back to the same-weight
  // Inter (which has Cyrillic) instead. Native already falls back to the
  // system sans-serif font.
  const interKey = `Inter-${Math.min(Number(fontWeight) || 400, 700)}`;
  const interFallback = interKey in loadedFonts ? interKey : 'Inter-400';
  return resolved === interFallback ? `"${resolved}", system-ui, sans-serif` : `"${resolved}", "${interFallback}", system-ui, sans-serif`;
}
