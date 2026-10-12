import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Artwork, Icon, IconButton, MenuRow, PillButton, PlaylistPickerRow, SheetScreen, TextField, Toast } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useHydratedSearchParams } from '@/hooks/use-hydrated-search-params';
import { addedToPlaylistToast } from '@/lib/i18n';
import { goBack } from '@/lib/navigation';
import { getTrackById, playlistUpdatedLabel } from '@/mocks';
import { useAppStrings } from '@/state/locale-store';
import { usePlaylistsStore } from '@/state/playlists-store';
import { usePlayerStore } from '@/state/player-store';

/**
 * S-18 Add to Playlist (bottom sheet, docs/screens.md §3.7). Local/mock
 * playlists only — no backend persistence. Reached from Now Playing's "⋯"
 * for the current track (no separate Track Options sheet exists yet in this
 * batch's scope, so this is wired as the direct entry point).
 */
export default function AddToPlaylistSheet() {
  const params = useHydratedSearchParams<{ trackId: string }>();
  // Static HTML / hydration: the track is not known yet — an empty sheet, not another track's card (#418).
  if (!params) return <SheetScreen>{null}</SheetScreen>;
  return <AddToPlaylistContent trackIdParam={params.trackId} />;
}

function AddToPlaylistContent({ trackIdParam }: { trackIdParam: string | undefined }) {
  const playerCurrentTrackId = usePlayerStore((s) => s.currentTrackId());
  const trackId = trackIdParam ?? playerCurrentTrackId;
  const track = trackId ? getTrackById(trackId) : undefined;

  const playlists = usePlaylistsStore((s) => s.playlists);
  const addTrackToPlaylist = usePlaylistsStore((s) => s.addTrackToPlaylist);
  const removeTrackFromPlaylist = usePlaylistsStore((s) => s.removeTrackFromPlaylist);
  const { locale, t } = useAppStrings();

  const [query, setQuery] = useState('');
  const [toastLabel, setToastLabel] = useState<string | null>(null);

  const filteredPlaylists = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return playlists;
    return playlists.filter((playlist) => playlist.title.toLowerCase().includes(normalized));
  }, [playlists, query]);

  function handleToggle(playlistId: string, playlistTitle: string, alreadyAdded: boolean) {
    if (!trackId) return;
    if (alreadyAdded) {
      removeTrackFromPlaylist(playlistId, trackId);
    } else {
      addTrackToPlaylist(playlistId, trackId);
      setToastLabel(addedToPlaylistToast(locale, playlistTitle));
      setTimeout(() => setToastLabel(null), 2000);
    }
  }

  return (
    <SheetScreen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText variant="headline-md">{t('addToPlaylistTitle')}</ThemedText>
          <ThemedText variant="body-sm" emphasis="medium">
            {t('addToPlaylistSubtitle')}
          </ThemedText>
        </View>
        <IconButton icon="close" size={36} accessibilityLabel={t('closeLabel')} onPress={() => goBack()} />
      </View>

      {track && (
        <View style={styles.trackCard}>
          <Artwork uri={track.coverUri} size={44} radius={8} />
          <View style={styles.trackText}>
            <ThemedText variant="label-lg" numberOfLines={1}>
              {track.title}
            </ThemedText>
            <ThemedText variant="body-sm" emphasis="medium" numberOfLines={1}>
              {track.artistName}
            </ThemedText>
          </View>
        </View>
      )}

      <View style={styles.searchBlock}>
        <TextField
          placeholder={t('findPlaylistPlaceholder')}
          value={query}
          onChangeText={setQuery}
          leftAccessory={<Icon name="search" size={18} color={Colors.text.medium} />}
        />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <MenuRow
          icon="playlist-add"
          title={t('newPlaylistLabel')}
          subtitle={t('newPlaylistAutoInsertSubtitle')}
          onPress={() =>
            router.push({
              pathname: '/create-playlist',
              params: trackId ? { initialTrackId: trackId } : {},
            })
          }
        />

        {filteredPlaylists.map((playlist) => {
          const added = trackId ? (playlist.trackIds ?? []).includes(trackId) : false;
          const countLabel = `${playlist.trackCount} ${playlist.trackCount === 1 ? t('playlistSongSingular') : t('playlistSongPlural')}${playlistUpdatedLabel(locale, playlist.id) ? ` • ${playlistUpdatedLabel(locale, playlist.id)}` : ''}`;
          return (
            <PlaylistPickerRow
              key={playlist.id}
              coverUri={playlist.coverUri}
              title={playlist.title}
              trackCountLabel={countLabel}
              selected={added}
              onPress={() => handleToggle(playlist.id, playlist.title, added)}
            />
          );
        })}
      </ScrollView>

      <PillButton label={t('doneLabel')} variant="secondary" onPress={() => goBack()} style={styles.doneButton} />

      <Toast message={toastLabel ? `✓ ${toastLabel}` : ''} icon="check" visible={Boolean(toastLabel)} />
    </SheetScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.margin,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: 12,
    backgroundColor: Colors.surface.l3,
  },
  trackText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  searchBlock: {
    paddingHorizontal: Spacing.margin,
    marginTop: Spacing.md,
  },
  list: {
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.md,
    gap: Spacing.xs,
  },
  doneButton: {
    marginHorizontal: Spacing.margin,
    marginVertical: Spacing.md,
  },
});
