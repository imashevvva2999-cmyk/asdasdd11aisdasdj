import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MINI_PLAYER_OVERLAY_CLEARANCE, MiniPlayerOverlay } from '@/components/mini-player';
import { RootNavBar } from '@/components/nav/root-nav-bar';
import { ThemedView } from '@/components/themed-view';
import { Artwork, IconButton, PillButton, TrackRow } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';
import { curatedByLabel, sortAccessibilityLabel, sortedByToastLabel, type AppStringKey } from '@/lib/i18n';
import { nextSortMode, sortTracks, type TrackSortMode } from '@/lib/sort-tracks';
import { getTrackById, playlistDurationLabel, playlists, type Track } from '@/mocks';
import { useLibraryStore } from '@/state/library-store';
import { useAppStrings } from '@/state/locale-store';
import { usePlayerStore } from '@/state/player-store';
import { usePlaylistsStore } from '@/state/playlists-store';

/** Internal sort VALUES stay these fixed English strings; only the label is
 * localized, via this map — same pattern as Liked Songs' own table. */
const TRACK_SORT_LABEL_KEYS: Record<TrackSortMode, AppStringKey> = {
  'Default order': 'sortDefaultOrderLabel',
  Title: 'titleLabel',
  Artist: 'artistLabel',
};

/** Pre-renders every catalog playlist for the static website, so a direct link
 * or refresh serves that playlist's own HTML (React #418: the shared `[id]`
 * shell said "not found" before the browser rendered the playlist). Playlists
 * the listener creates live only in memory and resolve client-side. */
export function generateStaticParams() {
  return playlists.map((playlist) => ({ id: playlist.id }));
}

/**
 * S-10/S-11 Playlist Detail — shared route for both documented variants (user vs
 * editorial playlist, OQ-18 still open on which content model backs each — only the
 * presentational layout is implemented here).
 */
export default function PlaylistScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const playlist = usePlaylistsStore((s) => s.getPlaylistById(id));

  const play = usePlayerStore((s) => s.play);
  const playShuffled = usePlayerStore((s) => s.playShuffled);
  const currentTrackId = usePlayerStore((s) => s.currentTrackId());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isSaved = useLibraryStore((s) => s.isSaved('playlist', id));
  const isDownloaded = useLibraryStore((s) => s.isDownloaded(id));
  const toggleSaved = useLibraryStore((s) => s.toggleSaved);
  const toggleDownloaded = useLibraryStore((s) => s.toggleDownloaded);
  const [sortMode, setSortMode] = useState<TrackSortMode>('Default order');
  const { showToast, toast } = useToast();
  const { t, locale } = useAppStrings();

  const trackList = useMemo(
    () => sortTracks((playlist?.trackIds ?? []).map((trackId) => getTrackById(trackId)).filter((t): t is Track => Boolean(t)), sortMode),
    [playlist?.trackIds, sortMode],
  );

  if (!playlist) {
    return (
      <ThemedView surface="canvas" style={styles.flex}>
        <ThemedText variant="body-md" emphasis="medium" style={styles.notFound}>
          {t('playlistNotFoundMessage')}
        </ThemedText>
      </ThemedView>
    );
  }

  const trackIdsForPlayback = trackList.map((t) => t.id);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Artwork uri={playlist.coverUri} size={220} radius={24} />
          {playlist.editorial && (
            <ThemedText variant="label-sm" emphasis="primary" style={styles.eyebrow}>
              {t('editorialPlaylistLabel')}
            </ThemedText>
          )}
          <ThemedText variant="display-lg-mobile" style={styles.title} numberOfLines={2}>
            {playlist.title}
          </ThemedText>
          {playlist.description && (
            <ThemedText variant="body-md" emphasis="medium" style={styles.description}>
              {playlist.description}
            </ThemedText>
          )}
          <ThemedText variant="body-sm" emphasis="medium">
            {playlist.curator ? curatedByLabel(locale, playlist.curator) : playlist.editorial ? t('mmusicEditorialLabel') : t('yourPlaylistLabel')}
          </ThemedText>
          <ThemedText variant="body-sm" emphasis="medium">
            {formatTrackCount(trackList.length, t)}
            {trackList.length > 0 && playlistDurationLabel(locale, playlist.id) ? ` • ${playlistDurationLabel(locale, playlist.id)}` : ''}
          </ThemedText>

          <View style={styles.actionsRow}>
            <IconButton
              icon={isSaved ? 'favorite' : 'favorite-border'}
              color={isSaved ? Colors.primary : undefined}
              accessibilityLabel={isSaved ? t('removePlaylistFromLibrary') : t('savePlaylist')}
              onPress={() => {
                toggleSaved('playlist', playlist.id);
                showToast(isSaved ? t('removedFromLibrary') : t('savedToLibrary'), 'check');
              }}
            />
            <IconButton
              icon={isDownloaded ? 'download-done' : 'download'}
              color={isDownloaded ? Colors.secondary : undefined}
              accessibilityLabel={isDownloaded ? t('removeDownloadLabel') : t('download')}
              onPress={() => {
                toggleDownloaded(playlist.id, 'playlist');
                showToast(isDownloaded ? t('toastDownloadRemoved') : t('toastMarkedForOffline'), 'download');
              }}
            />
            <IconButton
              icon="sort"
              accessibilityLabel={sortAccessibilityLabel(locale, t(TRACK_SORT_LABEL_KEYS[sortMode]))}
              onPress={() => {
                const next = nextSortMode(sortMode);
                setSortMode(next);
                showToast(sortedByToastLabel(locale, t(TRACK_SORT_LABEL_KEYS[next])), 'sort');
              }}
            />
            <View style={styles.spacer} />
            <IconButton
              icon="shuffle"
              accessibilityLabel={t('shuffleLabel')}
              onPress={() => playShuffled(trackIdsForPlayback)}
            />
            <PillButton
              label={t('playAllLabel')}
              leadingIcon="play-arrow"
              disabled={trackIdsForPlayback.length === 0}
              onPress={() => trackIdsForPlayback.length > 0 && play(trackIdsForPlayback[0]!, trackIdsForPlayback)}
            />
          </View>
        </View>

        <View style={styles.trackList}>
          {trackList.length === 0 && (
            <ThemedText variant="body-md" emphasis="medium" style={styles.emptyHint}>
              {t('noTracksYetMessage')}
            </ThemedText>
          )}
          {trackList.map((track, index) => (
            <TrackRow
              key={track.id}
              index={index + 1}
              coverUri={track.coverUri}
              active={currentTrackId === track.id}
              title={track.title}
              artist={track.artistName}
              explicit={track.explicit}
              lossless={track.lossless}
              isPlaying={currentTrackId === track.id && isPlaying}
              onPress={() => play(track.id, trackIdsForPlayback)}
              onOptionsPress={() => router.push({ pathname: '/sheets/options', params: { kind: 'track', id: track.id } })}
            />
          ))}
        </View>
      </ScrollView>
      {toast}
      <RootNavBar />
      <MiniPlayerOverlay />
    </ThemedView>
  );
}

function formatTrackCount(count: number, t: (key: AppStringKey) => string): string {
  return `${count} ${count === 1 ? t('trackCountSingular') : t('trackCountPlural')}`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  notFound: {
    padding: Spacing.margin,
  },
  content: {
    padding: Spacing.margin,
    paddingBottom: MINI_PLAYER_OVERLAY_CLEARANCE,
    gap: Spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: 4,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.md,
  },
  title: {
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  description: {
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    width: '100%',
  },
  spacer: {
    flex: 1,
  },
  trackList: {
    gap: 2,
  },
  emptyHint: {
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
