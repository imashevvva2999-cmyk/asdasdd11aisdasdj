import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SettingsCard, SettingsSectionCard, settingsScreenStyles, useSettingsSections } from '@/components/settings-sections';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconButton, LibraryRow } from '@/components/ui';
import type { LocalOrRemoteImage } from '@/constants/stitch-artwork';
import { Colors, Spacing } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';
import { removeDownloadAccessibilityLabel, removedFromDownloadsToast } from '@/lib/i18n';
import { getAlbumById } from '@/mocks';
import { useLibraryStore } from '@/state/library-store';
import { useAppStrings } from '@/state/locale-store';
import { usePlaylistsStore } from '@/state/playlists-store';

/** Library uses this id for the "Liked Songs" download toggle. */
const LIKED_SONGS_ID = 'liked-songs';

type DownloadedEntry = { id: string; title: string; subtitle: string; coverUri?: LocalOrRemoteImage; open: () => void };

/**
 * Downloads & Offline — Profile Hub destination (S-23). Download/storage
 * settings from S-24 plus the list of items marked for offline in the shared
 * Library store (the same flags Library's "Downloaded" filter uses), each
 * removable. Frontend mock only: no audio is stored and storage figures are
 * illustrative (offline DRM/retention is still open — OQ-21).
 */
export default function DownloadsScreen() {
  const { showToast, toast } = useToast();
  const sections = useSettingsSections(showToast);
  const downloadedIds = useLibraryStore((s) => s.downloadedIds);
  const toggleDownloaded = useLibraryStore((s) => s.toggleDownloaded);
  const playlists = usePlaylistsStore((s) => s.playlists);
  const { t, locale } = useAppStrings();

  const entries: DownloadedEntry[] = [...downloadedIds].flatMap((id): DownloadedEntry[] => {
    if (id === LIKED_SONGS_ID) {
      return [{ id, title: t('likedSongs'), subtitle: t('autoPlaylistLabel'), open: () => router.push('/library/liked-songs') }];
    }
    const playlist = playlists.find((p) => p.id === id);
    if (playlist) {
      return [
        {
          id,
          title: playlist.title,
          subtitle: `${t('playlistLabel')} • ${playlist.trackCount} ${playlist.trackCount === 1 ? t('playlistSongSingular') : t('playlistSongPlural')}`,
          coverUri: playlist.coverUri,
          open: () => router.push({ pathname: '/playlist/[id]', params: { id } }),
        },
      ];
    }
    const album = getAlbumById(id);
    if (album) {
      return [
        {
          id,
          title: album.title,
          subtitle: `${t('albumTypeAlbum')} • ${album.artistName}`,
          coverUri: album.coverUri,
          open: () => router.push({ pathname: '/album/[id]', params: { id } }),
        },
      ];
    }
    return [];
  });

  return (
    <ThemedView surface="canvas" style={settingsScreenStyles.flex}>
      <ScrollView contentContainerStyle={settingsScreenStyles.content}>
        <SettingsSectionCard section={sections.downloads} />

        <SettingsCard title={`${t('downloadedMusicLabel')} (${entries.length})`} icon="download-done">
          {entries.length === 0 ? (
            <ThemedText variant="body-md" emphasis="medium" style={styles.empty}>
              {t('nothingDownloadedHint')}
            </ThemedText>
          ) : (
            entries.map((entry) => (
              <View key={entry.id} style={styles.entryRow}>
                <LibraryRow coverUri={entry.coverUri} title={entry.title} subtitle={entry.subtitle} trailing="none" onPress={entry.open} style={styles.entry} />
                <IconButton
                  icon="remove-circle-outline"
                  size={36}
                  color={Colors.text.medium}
                  accessibilityLabel={removeDownloadAccessibilityLabel(locale, entry.title)}
                  onPress={() => {
                    toggleDownloaded(entry.id);
                    showToast(removedFromDownloadsToast(locale, entry.title), 'download');
                  }}
                />
              </View>
            ))
          )}
        </SettingsCard>

        <ThemedText variant="body-sm" emphasis="low" style={styles.note}>
          {t('downloadsPreviewNote')}
        </ThemedText>
      </ScrollView>
      {toast}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  empty: {
    paddingVertical: Spacing.md,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entry: {
    flex: 1,
    paddingHorizontal: 0,
  },
  note: {
    textAlign: 'center',
  },
});
