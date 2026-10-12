import { Stack } from 'expo-router';

import { IconButton } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { goBack } from '@/lib/navigation';
import { useAppStrings } from '@/state/locale-store';

/** Always-present back control: opened by direct link or after a web refresh
 * there is no history, and the default back button would not render, leaving
 * an empty header band. Falls back to the Search tab root. */
function SearchBackButton() {
  const { t } = useAppStrings();
  return <IconButton icon="arrow-back" variant="ghost" size={40} accessibilityLabel={t('backLabel')} onPress={() => goBack('/search')} />;
}

/** Search tab's own stack (docs/screens.md §1: Search → Results → Empty; → Genre; → All Genres → Genre). */
export default function SearchStackLayout() {
  const { t } = useAppStrings();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.canvas },
        headerTintColor: Colors.text.high,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.canvas },
        headerLeft: () => <SearchBackButton />,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {/* Stitch shows only a back control on these — the heading lives in the page body. */}
      <Stack.Screen name="results" options={{ title: t('searchResultsTitle'), headerTitle: '' }} />
      <Stack.Screen name="all-genres" options={{ title: t('allGenresTitle'), headerTitle: '' }} />
      <Stack.Screen name="genre/[id]" options={{ title: t('genreFallback'), headerTitle: '' }} />
    </Stack>
  );
}
