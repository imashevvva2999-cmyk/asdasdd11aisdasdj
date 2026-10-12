import { router } from 'expo-router';
import Head from 'expo-router/head';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/ui/empty-state';
import { useAppStrings } from '@/state/locale-store';

/**
 * The website's 404 (W1): an unknown URL, a mistyped link, or a page that
 * only exists in development. The host serves this page with status 404.
 */
export default function NotFoundScreen() {
  const { t } = useAppStrings();
  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <Head>
        <title>{`${t('pageNotFoundTitle')} – Mmusic`}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <SafeAreaView style={styles.center}>
        <EmptyState
          icon="explore-off"
          title={t('pageNotFoundTitle')}
          hint={t('pageNotFoundHint')}
          actionLabel={t('goToHomeLabel')}
          onActionPress={() => router.replace('/home')}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center' },
});
