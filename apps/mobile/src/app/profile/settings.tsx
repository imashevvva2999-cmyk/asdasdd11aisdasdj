import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { MenuRow } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { demoLoginAvailability } from '@/demo/demo-config';
import { useDemoStrings } from '@/demo/demo-strings';
import { useDemoSessionStore } from '@/state/demo-session-store';
import { useAppStrings } from '@/state/locale-store';
import { useLibraryStore } from '@/state/library-store';
import { useSettingsStore } from '@/state/settings-store';

/**
 * Settings — a clean 4-row navigator (Spotify-style structural pattern,
 * Mmusic's own dark/minimalist visuals): App Language, then the three
 * existing Profile Hub destinations (Audio Quality & Playback, Downloads &
 * Offline, Account & Security), reused unchanged. No inline toggles live
 * here any more — each row owns its full settings on its own screen.
 */
export default function SettingsScreen() {
  const { t, locale } = useAppStrings();
  const musicStorageGb = useSettingsStore((s) => s.musicStorageGb);
  const cacheGb = useSettingsStore((s) => s.cacheGb);
  const downloadedCount = useLibraryStore((s) => s.downloadedIds.size);
  const { d } = useDemoStrings();
  const demoActive = useDemoSessionStore((s) => s.active);
  // Dev builds only — production never shows the demo account entry.
  const showDemo = demoActive || demoLoginAvailability() !== 'production';

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <View style={styles.content}>
        <MenuRow
          icon="language"
          title={t('appLanguage')}
          subtitle={locale === 'ru' ? t('appLanguageRussian') : t('appLanguageEnglish')}
          onPress={() => router.push('/profile/settings-language')}
        />
        <MenuRow
          icon="high-quality"
          tone="secondary"
          title={t('menuAudioQuality')}
          subtitle={t('settingsAudioSubtitle')}
          onPress={() => router.push('/profile/audio-quality')}
        />
        <MenuRow
          icon="cloud-download"
          tone="neutral"
          title={t('menuDownloads')}
          subtitle={`${(musicStorageGb + cacheGb).toFixed(1)} GB ${t('usedSuffix')} • ${downloadedCount} ${t('downloadedSuffix')}`}
          onPress={() => router.push('/profile/downloads')}
        />
        <MenuRow
          icon="verified-user"
          tone="neutral"
          title={t('menuAccount')}
          subtitle={t('mbankConnectedId')}
          onPress={() => router.push('/profile/account')}
        />
        {showDemo && (
          <MenuRow
            icon="science"
            tone="neutral"
            title={d.settingsRow}
            subtitle={demoActive ? d.settingsRowSignedIn : d.settingsRowSignedOut}
            onPress={() => router.push(demoActive ? '/profile/demo-account' : '/profile/demo-login')}
          />
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.margin,
    gap: Spacing.sm,
  },
});
