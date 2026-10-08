import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, AvatarCard, Chip, CircleButton, CoverCard, EmptyState, Icon, IconButton, LibraryRow, PressableScale, TextField, TrackRow } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useContentWidth } from '@/hooks/use-content-width';
import { useHydratedSearchParams } from '@/hooks/use-hydrated-search-params';
import { matchesQuery, normalizeQuery } from '@/lib/search-match';
import { albums, artists, tracks, trendingSearches } from '@/mocks';
import { usePlayerStore } from '@/state/player-store';
import { usePlaylistsStore } from '@/state/playlists-store';

const FILTERS = ['All', 'Songs', 'Artists', 'Albums', 'Playlists'] as const;

/**
 * S-04 Search Results. S-05 "Empty Search" (docs/screens.md) renders as an
 * empty-data STATE of this same route when the query matches nothing — there is
 * no separate navigable "empty search" screen, matching the Фаза 3 routing
 * decision (docs/screens.md §2 Artist Flow notes apply the same principle here).
 */
export default function SearchResultsScreen() {
  const params = useHydratedSearchParams<{ q: string }>();
  // Static HTML / hydration: the query is not known yet — a blank page, not the
  // "Trending" state that ?q= would replace (#418). The key starts the screen
  // fresh for each query it is opened with.
  if (!params) return <ThemedView surface="canvas" style={styles.flex} />;
  const initialQuery = typeof params.q === 'string' ? params.q : '';
  return <SearchResultsContent key={initialQuery} initialQuery={initialQuery} />;
}

function SearchResultsContent({ initialQuery }: { initialQuery: string }) {
  const columnWidth = Math.floor((useContentWidth() - Spacing.margin * 2 - Spacing.md) / 2);
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const playlists = usePlaylistsStore((s) => s.playlists);
  const play = usePlayerStore((s) => s.play);
  const currentTrackId = usePlayerStore((s) => s.currentTrackId());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const toggleLike = usePlayerStore((s) => s.toggleLike);

  const q = normalizeQuery(query);
  const matchedArtists = useMemo(() => artists.filter((a) => matchesQuery(q, a.name)), [q]);
  const matchedTracks = useMemo(() => tracks.filter((t) => matchesQuery(q, t.title, t.artistName)), [q]);
  const matchedAlbums = useMemo(() => albums.filter((a) => matchesQuery(q, a.title, a.artistName)), [q]);
  const matchedPlaylists = useMemo(() => playlists.filter((p) => matchesQuery(q, p.title)), [q, playlists]);

  const topResult = matchedArtists[0];
  const hasAnyResult = matchedArtists.length > 0 || matchedTracks.length > 0 || matchedAlbums.length > 0 || matchedPlaylists.length > 0;

  function playTopResult() {
    if (!topResult) return;
    const queue = topResult.popularTrackIds?.length
      ? topResult.popularTrackIds
      : tracks.filter((t) => t.artistId === topResult.id).map((t) => t.id);
    if (queue.length === 0) {
      router.push({ pathname: '/artist/[id]', params: { id: topResult.id } });
      return;
    }
    play(queue[0]!, queue);
    router.push('/player/now-playing');
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <View style={styles.searchBarWrap}>
        <TextField
          variant="search"
          value={query}
          onChangeText={setQuery}
          autoFocus={initialQuery === ''}
          returnKeyType="search"
          placeholder="Songs, artists, or albums..."
          leftAccessory={<Icon name="search" color={Colors.text.medium} />}
          rightAccessory={
            query.length > 0 ? (
              <IconButton icon="close" size={32} color={Colors.text.medium} accessibilityLabel="Clear search" onPress={() => setQuery('')} />
            ) : undefined
          }
        />
        <View style={styles.filterRow}>
          {FILTERS.map((item) => (
            <Chip key={item} label={item} selected={item === filter} onPress={() => setFilter(item)} />
          ))}
        </View>
      </View>

      {q === '' || !hasAnyResult ? (
        <ScrollView contentContainerStyle={styles.emptyContent} keyboardShouldPersistTaps="handled">
          {q === '' ? (
            <EmptyState
              icon="search"
              title="Search Mmusic"
              hint="Find songs, artists, albums and playlists."
              actionLabel="Explore All Genres"
              onActionPress={() => router.push('/search/all-genres')}
            />
          ) : (
            <EmptyState
              icon="search-off"
              variant="hero"
              actionIcon="explore"
              title={`No results for "${query}"`}
              hint="Please check your spelling or try searching for another artist, track, album, or genre."
              actionLabel="Explore All Genres"
              onActionPress={() => router.push('/search/all-genres')}
            />
          )}
          <View style={styles.trendingNow}>
            <View style={styles.trendingHeader}>
              <Icon name="trending-up" size={16} color={Colors.secondary} />
              <ThemedText variant="label-lg">Trending right now</ThemedText>
            </View>
            <View style={styles.trendingChips}>
              {trendingSearches.map((item) => (
                <PressableScale
                  key={item.query}
                  accessibilityRole="button"
                  onPress={() => setQuery(item.query)}
                  style={styles.trendingChip}
                >
                  <Icon name="search" size={15} color={Colors.primary} />
                  <ThemedText variant="label-md">{item.query}</ThemedText>
                </PressableScale>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {(filter === 'All' || filter === 'Artists') && topResult && (
            <View style={styles.section}>
              <ThemedText variant="headline-sm">Top Result</ThemedText>
              <View style={styles.topResultCard}>
                <View style={styles.topResultInfo}>
                  <Artwork shape="circle" size={56} uri={topResult.photoUri} />
                  <View style={styles.topResultText}>
                    <View style={styles.topResultNameRow}>
                      <ThemedText variant="headline-sm" numberOfLines={1}>
                        {topResult.name}
                      </ThemedText>
                      {topResult.verified && <Icon name="verified" size={16} color={Colors.primary} />}
                    </View>
                    <ThemedText variant="body-sm" emphasis="medium" numberOfLines={1}>
                      {`Artist${topResult.monthlyListeners ? ` • ${formatListeners(topResult.monthlyListeners)} monthly listeners` : ''}`}
                    </ThemedText>
                  </View>
                </View>
                <CircleButton
                  icon="play-arrow"
                  size={44}
                  iconSize={22}
                  accessibilityLabel={`Play ${topResult.name} top tracks`}
                  onPress={playTopResult}
                />
              </View>
            </View>
          )}

          {(filter === 'All' || filter === 'Songs') && matchedTracks.length > 0 && (
            <View style={styles.section}>
              <ThemedText variant="headline-sm">Songs</ThemedText>
              <View style={styles.trackList}>
                {matchedTracks.map((track) => (
                  <TrackRow
                    key={track.id}
                    coverUri={track.coverUri}
                    title={track.title}
                    artist={track.artistName}
                    lossless={track.lossless}
                    explicit={track.explicit}
                    liked={likedTrackIds.has(track.id)}
                    active={currentTrackId === track.id}
                    isPlaying={currentTrackId === track.id && isPlaying}
                    onPress={() => router.push({ pathname: '/player/now-playing', params: { trackId: track.id } })}
                    onToggleLike={() => toggleLike(track.id)}
                    onOptionsPress={() => router.push({ pathname: '/sheets/options', params: { kind: 'track', id: track.id } })}
                  />
                ))}
              </View>
            </View>
          )}

          {(filter === 'All' || filter === 'Artists') && matchedArtists.length > 0 && (
            <View style={styles.section}>
              <ThemedText variant="headline-sm">Artists</ThemedText>
              <View style={styles.grid}>
                {chunkPairs(matchedArtists).map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.gridRow}>
                    {row.map((artist) => (
                      <View key={artist.id} style={styles.artistCard}>
                        <AvatarCard
                          photoUri={artist.photoUri}
                          name={artist.name}
                          verified={artist.verified}
                          metaLabel="Artist"
                          size={80}
                          style={styles.artistCardInner}
                          onPress={() => router.push({ pathname: '/artist/[id]', params: { id: artist.id } })}
                        />
                      </View>
                    ))}
                    {row.length === 1 && <View style={styles.gridSpacer} />}
                  </View>
                ))}
              </View>
            </View>
          )}

          {(filter === 'All' || filter === 'Albums') && matchedAlbums.length > 0 && (
            <View style={styles.section}>
              <ThemedText variant="headline-sm">Albums & EPs</ThemedText>
              <View style={styles.grid}>
                {chunkPairs(matchedAlbums).map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.gridRow}>
                    {row.map((album) => (
                      <CoverCard
                        key={album.id}
                        coverUri={album.coverUri}
                        layout="below"
                        width={columnWidth}
                        title={album.title}
                        subtitle={`${album.year} • ${album.type === 'ep' ? 'EP' : album.type === 'single' ? 'Single' : 'Album'}`}
                        onPress={() => router.push({ pathname: '/album/[id]', params: { id: album.id } })}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          )}

          {(filter === 'All' || filter === 'Playlists') && matchedPlaylists.length > 0 && (
            <View style={styles.section}>
              <ThemedText variant="headline-sm">Featured Playlists</ThemedText>
              {matchedPlaylists.map((playlist) => (
                <View key={playlist.id} style={styles.playlistCard}>
                  {playlist.editorial && (
                    <ThemedText variant="label-sm" emphasis="primary" style={styles.eyebrow}>
                      Official Playlist
                    </ThemedText>
                  )}
                  <LibraryRow
                  coverUri={playlist.coverUri}
                  title={playlist.title}
                  subtitle={`Playlist • ${playlist.trackCount} ${playlist.trackCount === 1 ? 'song' : 'songs'}${playlist.durationLabel ? ` • ${playlist.durationLabel}` : ''}`}
                  trailing="chevron"
                  onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: playlist.id } })}
                  />
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </ThemedView>
  );
}

function formatListeners(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}K`;
  return String(count);
}

function chunkPairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchBarWrap: {
    padding: Spacing.margin,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  content: {
    paddingHorizontal: Spacing.margin,
    paddingBottom: Spacing.miniPlayerClearance,
    gap: Spacing.lg,
  },
  emptyContent: {
    paddingHorizontal: Spacing.margin,
    paddingBottom: Spacing.miniPlayerClearance,
  },
  grid: {
    gap: Spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  gridSpacer: {
    flex: 1,
  },
  artistCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surface.l1,
  },
  artistCardInner: {
    width: '100%',
  },
  playlistCard: {
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surface.l1,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.xs,
  },
  section: {
    gap: Spacing.sm,
  },
  topResultCard: {
    backgroundColor: Colors.surface.l1,
    borderRadius: 16,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  topResultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
    minWidth: 0,
  },
  topResultText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  topResultNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trackList: {
    gap: 2,
  },
  trendingNow: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  trendingChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  trendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface.l1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
});
