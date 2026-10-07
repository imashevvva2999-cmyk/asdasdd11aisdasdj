import { Stack } from 'expo-router';

/**
 * Bottom-sheet route group (docs/screens.md §3.7: Track options, Add to Playlist,
 * Support amount, Donation confirmation, Success). Presentation (formSheet /
 * transparentModal) is set per-screen where this group is registered in the root
 * _layout. The actual sheet-shaped UI (handle, blur backdrop) is the Фаза-2
 * AppBottomSheet component (src/components/ui/bottom-sheet.tsx) — wiring that in
 * is content work for Фаза 4+, not Фаза 3 navigation.
 */
export default function SheetsStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
