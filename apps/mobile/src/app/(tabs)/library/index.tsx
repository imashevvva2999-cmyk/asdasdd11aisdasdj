import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AvatarCard, Chip, CoverCard, Icon, IconButton, LibraryRow, PressableScale, TextField, TextLinkButton, TrackRow } from '@/components/ui';
import type { LocalOrRemoteImage } from '@/constants/stitch-artwork';
import { Colors, Spacing } from '@/constants/theme';
import { useContentWidth } from '@/hooks/use-content-width';
import { useTabEntrance } from '@/hooks/use-tab-entrance';
import { matchesQuery, normalizeQuery } from '@/lib/search-match';
import { sortAccessibilityLabel, type AppStringKey } from '@/lib/i18n';
import { getAlbumById, getArtistById, getTrackById, type LibraryItem, type Track } from '@/mocks';
import { useLibraryStore } from '@/state/library-store';
import { useAppStrings } from '@/state/locale-store';
import { usePlayerStore } from '@/state/player-store';
import { usePlaylistsStore } from '@/state/playlists-store';

const FILTERS = ['All', 'Playlists', 'Artists', 'Albums', 'Downloaded'] as const;
const SORT_MODES = ['Recently Added', 'Alphabetical'] as const;

/** Internal filter/sort VALUES stay these fixed English strings (all the
 * logic below compares against them) — only their on-screen LABEL is
 * localized, via these lookup maps. */
const FILTER_LABEL_KEYS: Record<(typeof FILTERS)[number], AppStringKey> = {
  All: 'filterAll',
  Playlists: 'filterPlaylists',
  Artists: 'filterArtists',
  Albums: 'filterAlbums',
  Downloaded: 'filterDownloaded',
};
const SORT_LABEL_KEYS: Record<(typeof SORT_MODES)[number], AppStringKey> = {
  'Recently Added': 'recentlyAdded',
  Alphabetical: 'sortAlphabetical',
};

type ResolvedItem = {
  item: LibraryItem;
  title: string;
  subtitle: string;
  coverUri?: LocalOrRemoteImage;
  verified?: boolean;
  /** Text Library search matches against (names, not the "Album •" labels). */
  searchFields: string[];
  open: () => void;
};

/**
 * S-12 Your Library — tab root (docs/screens.md §3.10). Renders the shared
 * library store (frontend functional QA pass), so saving/following/
 * downloading/creating anywhere in the app shows up here in the same
 * session. Playlists resolve through the playlists store so user-created
 * ones appear too. Sort and the list/grid view toggle are local UI state.
 * Library search (🔍 in the sort row) narrows the same list — on top of the
 * active filter chip and sort — and, under "All", also lists matching liked
 * songs; every result opens its own artist / album / playlist / song.
 */
export default function LibraryScreen() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [sortMode, setSortMode] = useState<(typeof SORT_MODES)[number]>('Recently Added');
  const [gridView, setGridView] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const q = normalizeQuery(query);
  const windowWidth = useContentWidth();
  const gridItemWidth = Math.floor((Math.min(windowWidth, 800) - Spacing.margin * 2 - Spacing.md) / 2);
  const entrance = useTabEntrance('library');
  const { t, locale } = useAppStrings();

  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const play = usePlayerStore((s) => s.play);
  const currentTrackId = usePlayerStore((s) => s.currentTrackId());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
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
    const resolved = filtered
      .map((item) => resolveItem(item, playlists, t))
      .filter((r): r is ResolvedItem => r !== undefined && matchesQuery(q, ...r.searchFields));
    if (sortMode === 'Alphabetical') return [...resolved].sort((a, b) => a.title.localeCompare(b.title));
    return [...resolved].sort((a, b) => b.item.addedAt.localeCompare(a.item.addedAt));
  }, [items, downloadedIds, playlists, filter, sortMode, q, t]);

  const likedIds = Array.from(likedTrackIds);
  // Songs aren't one of the chip kinds, so they only join results under "All".
  const matchedSongs: Track[] =
    q !== '' && filter === 'All'
      ? likedIds.map((id) => getTrackById(id)).filter((t): t is Track => t !== undefined && matchesQuery(q, t.title, t.artistName))
      : [];
  const showLikedSongs = matchesQuery(q, 'Liked Songs');
  const noMatches = q !== '' && visibleItems.length === 0 && matchedSongs.length === 0 && !showLikedSongs;

  // Same row as every other Library item; play lives on the Liked Songs page.
  const likedSongsRow = showLikedSongs && (
    <LibraryRow
      coverIcon="favorite"
      title={t('likedSongs')}
      subtitle={`${t('playlistLabel')} • ${likedIds.length} ${likedIds.length === 1 ? t('playlistSongSingular') : t('playlistSongPlural')}`}
      trailing="chevron"
      onPress={() => router.push('/library/liked-songs')}
    />
  );

  function closeSearch() {
    setQuery('');
    setSearchOpen(false);
  }

  function playSong(trackId: string) {
    play(trackId, likedIds);
    router.push('/player/now-playing');
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.headerRow}>
          {/* Page title: 28px at the heading weight (700), not the 800-weight
              display style, so it reads as a page title rather than a hero. */}
          <ThemedText variant="headline-lg" style={styles.pageTitle}>
            {t('yourLibrary')}
          </ThemedText>
          <View style={styles.headerActions}>
            <IconButton
              icon="add"
              accessibilityLabel={t('createPlaylistLabel')}
              onPress={() => router.push('/create-playlist')}
              size={40}
              style={styles.addButton}
              color={Colors.text.high}
            />
            {/* Interim OQ-17 entry point (docs/open-questions.md): avatar in Home/Library
             * header, per the documented [П] proposal — final treatment is Фаза 4+ content. */}
            <IconButton icon="person" accessibilityLabel={t('profileTitle')} onPress={() => router.push('/profile')} size={40} />
          </View>
        </View>
      </SafeAreaView>

      <Animated.View style={[styles.flex, entrance.style]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((item) => (
            <Chip key={item} label={t(FILTER_LABEL_KEYS[item])} selected={item === filter} onPress={() => setFilter(item)} />
          ))}
        </ScrollView>

        <View style={styles.sortRow}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={sortAccessibilityLabel(locale, t(SORT_LABEL_KEYS[sortMode]))}
            onPress={() => setSortMode((mode) => SORT_MODES[(SORT_MODES.indexOf(mode) + 1) % SORT_MODES.length])}
            style={styles.sortTrigger}
          >
            <Icon name="swap-vert" size={18} color={Colors.text.medium} />
            <ThemedText variant="label-md" emphasis="medium">
              {t(SORT_LABEL_KEYS[sortMode])}
            </ThemedText>
            <Icon name="expand-more" size={16} color={Colors.text.low} />
          </PressableScale>
          <View style={styles.sortActions}>
            <IconButton
              icon="search"
              accessibilityLabel={t('librarySearchPlaceholder')}
              onPress={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
              size={32}
              style={styles.transparentButton}
              color={searchOpen ? Colors.primary : undefined}
            />
            <IconButton
              icon={gridView ? 'view-agenda' : 'grid-view'}
              accessibilityLabel={gridView ? t('showAsListLabel') : t('showAsGridLabel')}
              onPress={() => setGridView((value) => !value)}
              size={32}
              style={styles.transparentButton}
            />
          </View>
        </View>

        {searchOpen && (
          <View style={styles.searchRow}>
            {/* TextField's `style` styles the input itself, so the flex wrapper sizes the pill. */}
            <View style={styles.searchField}>
            <TextField
              variant="search"
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder={t('librarySearchPlaceholder')}
              accessibilityLabel={t('librarySearchPlaceholder')}
              returnKeyType="search"
              leftAccessory={<Icon name="search" color={Colors.text.medium} />}
              rightAccessory={
                query !== '' ? (
                  <IconButton icon="close" size={32} color={Colors.text.medium} accessibilityLabel={t('searchClearLabel')} onPress={() => setQuery('')} style={styles.transparentButton} />
                ) : undefined
              }
            />
            </View>
            <TextLinkButton label={t('cancel')} tone="muted" onPress={closeSearch} />
          </View>
        )}


        {noMatches ? (
          <ThemedText variant="body-md" emphasis="medium" style={styles.emptyHint}>
            {t('libraryNoMatchesPrefix')} “{query.trim()}” {t('libraryNoMatchesSuffix')}
          </ThemedText>
        ) : (
          visibleItems.length === 0 &&
          q === '' && (
            <ThemedText variant="body-md" emphasis="medium" style={styles.emptyHint}>
              {filter === 'Downloaded' ? t('libraryEmptyDownloaded') : t('libraryEmptyGeneric')}
            </ThemedText>
          )
        )}


        {gridView ? (
          <View style={styles.grid}>
            {likedSongsRow}
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
            {likedSongsRow}
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
        {matchedSongs.length > 0 && (
          <View style={styles.list}>
            <ThemedText variant="label-lg" emphasis="medium">
              {t('songsHeader')}
            </ThemedText>
            {matchedSongs.map((track) => (
              <TrackRow
                key={track.id}
                coverUri={track.coverUri}
                active={currentTrackId === track.id}
                title={track.title}
                artist={track.artistName}
                explicit={track.explicit}
                lossless={track.lossless}
                isPlaying={currentTrackId === track.id && isPlaying}
                onPress={() => playSong(track.id)}
                onOptionsPress={() => router.push({ pathname: '/sheets/options', params: { kind: 'track', id: track.id } })}
              />
            ))}
          </View>
        )}
      </ScrollView>
      </Animated.View>
    </ThemedView>
  );
}

function resolveItem(
  item: LibraryItem,
  playlists: ReturnType<typeof usePlaylistsStore.getState>['playlists'],
  t: (key: AppStringKey) => string,
): ResolvedItem | undefined {
  if (item.kind === 'playlist') {
    const playlist = playlists.find((p) => p.id === item.refId);
    if (!playlist) return undefined;
    return {
      item,
      title: playlist.title,
      subtitle: `${playlist.editorial ? t('editorialWordLabel') : t('playlistLabel')} • ${playlist.trackCount} ${playlist.trackCount === 1 ? t('playlistSongSingular') : t('playlistSongPlural')}`,
      coverUri: playlist.coverUri,
      searchFields: [playlist.title],
      open: () => router.push({ pathname: '/playlist/[id]', params: { id: playlist.id } }),
    };
  }
  if (item.kind === 'artist') {
    const artist = getArtistById(item.refId);
    if (!artist) return undefined;
    return {
      item,
      title: artist.name,
      subtitle: `${t('artistLabel')}${artist.monthlyListeners ? ` • ${(artist.monthlyListeners / 1_000_000).toFixed(1)}M ${t('monthlyListenersSuffix')}` : ''}`,
      coverUri: artist.photoUri,
      verified: artist.verified,
      searchFields: [artist.name],
      open: () => router.push({ pathname: '/artist/[id]', params: { id: artist.id } }),
    };
  }
  const album = getAlbumById(item.refId);
  if (!album) return undefined;
  return {
    item,
    title: album.title,
    subtitle: `${t('albumTypeAlbum')} • ${album.artistName} • ${album.trackCount} ${t('trackCountPlural')}`,
    coverUri: album.coverUri,
    searchFields: [album.title, album.artistName],
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
  headerSafeArea: {},
  headerRow: {
    minHeight: 64,
    paddingHorizontal: Spacing.margin,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  addButton: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    shadowOpacity: 0.3,
    elevation: 6,
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
  sortActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  searchField: {
    flex: 1,
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
