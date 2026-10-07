import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AvatarCard, Chip, CircleButton, CoverCard, Icon, IconButton, LibraryRow, PressableScale } from '@/components/ui';
import type { LocalOrRemoteImage } from '@/constants/stitch-artwork';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { getAlbumById, getArtistById, type LibraryItem } from '@/mocks';
import { useLibraryStore } from '@/state/library-store';
import { usePlayerStore } from '@/state/player-store';
import { usePlaylistsStore } from '@/state/playlists-store';

const FILTERS = ['All', 'Playlists', 'Artists', 'Albums', 'Downloaded'] as const;
const SORT_MODES = ['Recently Added', 'Alphabetical'] as const;

type ResolvedItem = {
  item: LibraryItem;
  title: string;
  subtitle: string;
  coverUri?: LocalOrRemoteImage;
  verified?: boolean;
  open: () => void;
};

/**
 * S-12 Your Library — tab root (docs/screens.md §3.10). Renders the shared
 * library store (frontend functional QA pass), so saving/following/
 * downloading/creating anywhere in the app shows up here in the same
 * session. Playlists resolve through the playlists store so user-created
 * ones appear too. Sort and the list/grid view toggle are local UI state.
 */
export default function LibraryScreen() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [sortMode, setSortMode] = useState<(typeof SORT_MODES)[number]>('Recently Added');
  const [gridView, setGridView] = useState(false);
  const windowWidth = useWindowDimensions().width;
  const gridItemWidth = Math.floor((Math.min(windowWidth, 800) - Spacing.margin * 2 - Spacing.md) / 2);

  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const play = usePlayerStore((s) => s.play);
  const items = useLibraryStore((s) => s.items);
  const downloadedIds = useLibraryStore((s) => s.downloadedIds);
  const playlists = usePlaylistsStore((s) => s.playlists);

  const visibleItems = useMemo(() => {
    const filtered = items.filter((item) => {
      if (filter === 'All') return true;
      if (filter === 'Downloaded') return downloadedIds.has(item.refId);
      const kind = filter === 'Playlists' ? 'playlist' : filter === 'Artists' ? 'artist' : 'album';
      return item.kind === kind;
    });
    const resolved = filtered.map((item) => resolveItem(item, playlists)).filter((r): r is ResolvedItem => r !== undefined);
    if (sortMode === 'Alphabetical') return [...resolved].sort((a, b) => a.title.localeCompare(b.title));
    return [...resolved].sort((a, b) => b.item.addedAt.localeCompare(a.item.addedAt));
  }, [items, downloadedIds, playlists, filter, sortMode]);

  const likedIds = Array.from(likedTrackIds);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.headerRow}>
          <ThemedText variant="display-lg-mobile">Your Library</ThemedText>
          <View style={styles.headerActions}>
            <IconButton
              icon="add"
              accessibilityLabel="Create Playlist"
              onPress={() => router.push('/create-playlist')}
              size={40}
              style={styles.addButton}
              color={Colors.text.high}
            />
            {/* Interim OQ-17 entry point (docs/open-questions.md): avatar in Home/Library
             * header, per the documented [П] proposal — final treatment is Фаза 4+ content. */}
            <IconButton icon="person" accessibilityLabel="Profile" onPress={() => router.push('/profile')} size={40} />
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((item) => (
            <Chip key={item} label={item} selected={item === filter} onPress={() => setFilter(item)} />
          ))}
        </ScrollView>

        <View style={styles.sortRow}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Sort: ${sortMode}`}
            onPress={() => setSortMode((mode) => SORT_MODES[(SORT_MODES.indexOf(mode) + 1) % SORT_MODES.length])}
            style={styles.sortTrigger}
          >
            <Icon name="swap-vert" size={18} color={Colors.text.medium} />
            <ThemedText variant="label-md" emphasis="medium">
              {sortMode}
            </ThemedText>
            <Icon name="expand-more" size={16} color={Colors.text.low} />
          </PressableScale>
          <IconButton
            icon={gridView ? 'view-agenda' : 'grid-view'}
            accessibilityLabel={gridView ? 'Show as list' : 'Show as grid'}
            onPress={() => setGridView((value) => !value)}
            size={32}
            style={styles.transparentButton}
          />
        </View>

        <PressableScale accessibilityLabel="Open Liked Songs" onPress={() => router.push('/library/liked-songs')} style={styles.likedSongsCard}>
          <View style={styles.likedSongsInfo}>
            <LinearGradient
              colors={[Colors.primary, Colors.tertiary, Colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.likedSongsIcon}
            >
              <Icon name="favorite" size={28} color={Colors.text.high} />
            </LinearGradient>
            <View style={styles.likedSongsText}>
              <ThemedText variant="headline-md">Liked Songs</ThemedText>
              <View style={styles.likedSongsMetaRow}>
                <ThemedText variant="body-sm" emphasis="medium">
                  {likedIds.length} {likedIds.length === 1 ? 'track' : 'tracks'}
                </ThemedText>
              </View>
            </View>
          </View>
          <CircleButton
            icon="play-arrow"
            size={48}
            iconSize={24}
            accessibilityLabel="Play Liked Songs"
            onPress={() => likedIds.length > 0 && play(likedIds[0]!, likedIds)}
          />
        </PressableScale>

        {visibleItems.length === 0 && (
          <ThemedText variant="body-md" emphasis="medium" style={styles.emptyHint}>
            {filter === 'Downloaded' ? 'Nothing downloaded yet.' : 'Nothing here yet.'}
          </ThemedText>
        )}

        {gridView ? (
          <View style={styles.grid}>
            {chunkPairs(visibleItems).map((row, rowIndex) => (
              <View key={rowIndex} style={styles.gridRow}>
                {row.map((entry) =>
                  entry.item.kind === 'artist' ? (
                    <AvatarCard
                      key={entry.item.id}
                      photoUri={entry.coverUri}
                      name={entry.title}
                      verified={entry.verified}
                      metaLabel="Artist"
                      size={gridItemWidth - Spacing.lg}
                      onPress={entry.open}
                      style={{ width: gridItemWidth }}
                    />
                  ) : (
                    <CoverCard
                      key={entry.item.id}
                      layout="below"
                      width={gridItemWidth}
                      coverUri={entry.coverUri}
                      title={entry.title}
                      subtitle={entry.subtitle}
                      onPress={entry.open}
                    />
                  ),
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.list}>
            {visibleItems.map((entry) => (
              <LibraryRow
                key={entry.item.id}
                coverShape={entry.item.kind === 'artist' ? 'circle' : 'square'}
                coverUri={entry.coverUri}
                title={entry.title}
                verified={entry.verified}
                subtitle={entry.subtitle}
                trailing={entry.item.kind === 'artist' ? 'chevron' : 'more'}
                onPress={entry.open}
                onOptionsPress={
                  entry.item.kind === 'artist'
                    ? undefined
                    : () => router.push({ pathname: '/sheets/options', params: { kind: entry.item.kind, id: entry.item.refId } })
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function resolveItem(item: LibraryItem, playlists: ReturnType<typeof usePlaylistsStore.getState>['playlists']): ResolvedItem | undefined {
  if (item.kind === 'playlist') {
    const playlist = playlists.find((p) => p.id === item.refId);
    if (!playlist) return undefined;
    return {
      item,
      title: playlist.title,
      subtitle: `${playlist.editorial ? 'Editorial' : 'Playlist'} • ${playlist.trackCount} ${playlist.trackCount === 1 ? 'song' : 'songs'}`,
      coverUri: playlist.coverUri,
      open: () => router.push({ pathname: '/playlist/[id]', params: { id: playlist.id } }),
    };
  }
  if (item.kind === 'artist') {
    const artist = getArtistById(item.refId);
    if (!artist) return undefined;
    return {
      item,
      title: artist.name,
      subtitle: `Artist${artist.monthlyListeners ? ` • ${(artist.monthlyListeners / 1_000_000).toFixed(1)}M monthly listeners` : ''}`,
      coverUri: artist.photoUri,
      verified: artist.verified,
      open: () => router.push({ pathname: '/artist/[id]', params: { id: artist.id } }),
    };
  }
  const album = getAlbumById(item.refId);
  if (!album) return undefined;
  return {
    item,
    title: album.title,
    subtitle: `Album • ${album.artistName} • ${album.trackCount} tracks`,
    coverUri: album.coverUri,
    open: () => router.push({ pathname: '/album/[id]', params: { id: album.id } }),
  };
}

function chunkPairs<T>(list: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < list.length; i += 2) rows.push(list.slice(i, i + 2));
  return rows;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerSafeArea: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerRow: {
    minHeight: 64,
    paddingHorizontal: Spacing.margin,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  addButton: {
    backgroundColor: Colors.primary,
  },
  content: {
    padding: Spacing.margin,
    gap: Spacing.lg,
    paddingBottom: Spacing.miniPlayerClearance,
  },
  filterRow: {
    gap: Spacing.xs,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sortTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transparentButton: {
    backgroundColor: 'transparent',
  },
  likedSongsCard: {
    borderRadius: Radii.md,
    backgroundColor: Colors.surface.l2,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  likedSongsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    flex: 1,
    minWidth: 0,
  },
  likedSongsIcon: {
    width: 64,
    height: 64,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likedSongsText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  likedSongsMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  list: {
    gap: Spacing.xs,
  },
  grid: {
    gap: Spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  emptyHint: {
    textAlign: 'center',
  },
});
