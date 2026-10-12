import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState, Icon, IconButton, PillButton, TrackRow } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';
import { sortAccessibilityLabel, sortedByToastLabel, type AppStringKey } from '@/lib/i18n';
import { nextSortMode, sortTracks, type TrackSortMode } from '@/lib/sort-tracks';
import { getTrackById, type Track } from '@/mocks';
import { useLibraryStore } from '@/state/library-store';
import { useAppStrings } from '@/state/locale-store';
import { usePlayerStore } from '@/state/player-store';

/** Internal sort VALUES stay these fixed English strings (comparisons below use
 * them); only the on-screen/accessibility LABEL is localized, via this map —
 * same pattern as Library's own FILTER_LABEL_KEYS/SORT_LABEL_KEYS. */
const TRACK_SORT_LABEL_KEYS: Record<TrackSortMode, AppStringKey> = {
  'Default order': 'sortDefaultOrderLabel',
  Title: 'titleLabel',
  Artist: 'artistLabel',
};

const LIKED_SONGS_ID = 'liked-songs';

/**
 * S-13 Liked Songs — "auto playlist" sourced live from the shared player store's
 * `likedTrackIds`, not a separate local list, so liking a track anywhere in the
 * app (Now Playing, Album, Playlist, Artist) is reflected here immediately.
 * Download is a local flag only (library store); Sort reorders locally.
 */
export default function LikedSongsScreen() {
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const play = usePlayerStore((s) => s.play);
  const playShuffled = usePlayerStore((s) => s.playShuffled);
  const currentTrackId = usePlayerStore((s) => s.currentTrackId());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isDownloaded = useLibraryStore((s) => s.isDownloaded(LIKED_SONGS_ID));
  const toggleDownloaded = useLibraryStore((s) => s.toggleDownloaded);
  const [sortMode, setSortMode] = useState<TrackSortMode>('Default order');
  const { showToast, toast } = useToast();
  const { t, locale } = useAppStrings();

  const likedTracks = useMemo(
    () =>
      sortTracks(
        Array.from(likedTrackIds)
          .map((id) => getTrackById(id))
          .filter((t): t is Track => Boolean(t)),
        sortMode,
      ),
    [likedTrackIds, sortMode],
  );
  const likedTrackIdsOrdered = likedTracks.map((t) => t.id);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Stitch S-13: badge left, text right, then Play All + shuffle on the
            left and the quieter download / sort controls on the right. */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Icon name="favorite" size={40} color={Colors.primary} />
          </View>
          <View style={styles.heroText}>
            <ThemedText variant="label-sm" emphasis="primary" style={styles.eyebrow}>
              {t('autoPlaylistLabel')}
            </ThemedText>
            <ThemedText variant="display-lg-mobile">{t('likedSongs')}</ThemedText>
            <ThemedText variant="body-sm" emphasis="medium">
              {likedTracks.length} {likedTracks.length === 1 ? t('savedTrackSingular') : t('savedTrackPlural')}
            </ThemedText>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <PillButton
            label={t('playAllLabel')}
            leadingIcon="play-arrow"
            disabled={likedTrackIdsOrdered.length === 0}
            onPress={() => likedTrackIdsOrdered.length > 0 && play(likedTrackIdsOrdered[0]!, likedTrackIdsOrdered)}
            style={styles.playAll}
          />
          <IconButton icon="shuffle" size={48} accessibilityLabel={t('shuffleLabel')} onPress={() => playShuffled(likedTrackIdsOrdered)} />
          <View style={styles.spacer} />
          <IconButton
            variant="ghost"
            size={40}
            icon={isDownloaded ? 'download-done' : 'download'}
            color={isDownloaded ? Colors.secondary : Colors.text.medium}
            accessibilityLabel={isDownloaded ? t('removeDownloadLabel') : t('downloadOfflineLabel')}
            onPress={() => {
              toggleDownloaded(LIKED_SONGS_ID);
              showToast(isDownloaded ? t('toastDownloadRemoved') : t('toastMarkedForOffline'), 'download');
            }}
          />
          <IconButton
            variant="ghost"
            size={40}
            icon="swap-vert"
            color={Colors.text.medium}
            accessibilityLabel={sortAccessibilityLabel(locale, t(TRACK_SORT_LABEL_KEYS[sortMode]))}
            onPress={() => {
              const next = nextSortMode(sortMode);
              setSortMode(next);
              showToast(sortedByToastLabel(locale, t(TRACK_SORT_LABEL_KEYS[next])), 'sort');
            }}
          />
        </View>

        {likedTracks.length === 0 ? (
          <EmptyState icon="favorite-border" title={t('likedSongsEmptyTitle')} hint={t('likedSongsEmptyHint')} />
        ) : (
          <View style={styles.trackList}>
            {likedTracks.map((track, index) => (
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
                onPress={() => play(track.id, likedTrackIdsOrdered)}
                onOptionsPress={() => router.push({ pathname: '/sheets/options', params: { kind: 'track', id: track.id } })}
              />
            ))}
          </View>
        )}
      </ScrollView>
      {toast}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.margin,
    gap: Spacing.lg,
    paddingBottom: Spacing.miniPlayerClearance,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  heroBadge: {
    width: 96,
    height: 96,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface.l2,
    borderWidth: 1,
    borderColor: 'rgba(255, 75, 75, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  playAll: {
    paddingHorizontal: Spacing.lg,
  },
  spacer: {
    flex: 1,
  },
  trackList: {
    gap: 2,
  },
});
