import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, AvatarCard, Chip, CircleButton, CoverCard, EmptyState, Icon, LibraryRow, TextField, TrackRow } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { albums, artists, playlists, tracks, trendingSearches } from '@/mocks';

const FILTERS = ['All', 'Songs', 'Artists', 'Albums', 'Playlists'] as const;

/**
 * S-04 Search Results. S-05 "Empty Search" (docs/screens.md) renders as an
 * empty-data STATE of this same route when the query matches nothing — there is
 * no separate navigable "empty search" screen, matching the Фаза 3 routing
 * decision (docs/screens.md §2 Artist Flow notes apply the same principle here).
 */
export default function SearchResultsScreen() {
  const [query, setQuery] = useState('Solaris Echo');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

  const q = query.trim().toLowerCase();
  const matchedArtists = useMemo(() => artists.filter((a) => q === '' || a.name.toLowerCase().includes(q)), [q]);
  const matchedTracks = useMemo(() => tracks.filter((t) => q === '' || t.title.toLowerCase().includes(q) || t.artistName.toLowerCase().includes(q)), [q]);
  const matchedAlbums = useMemo(() => albums.filter((a) => q === '' || a.title.toLowerCase().includes(q) || a.artistName.toLowerCase().includes(q)), [q]);
  const matchedPlaylists = useMemo(() => playlists.filter((p) => q === '' || p.title.toLowerCase().includes(q)), [q]);

  const topResult = matchedArtists[0];
  const hasAnyResult = matchedArtists.length > 0 || matchedTracks.length > 0 || matchedAlbums.length > 0 || matchedPlaylists.length > 0;

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <View style={styles.searchBarWrap}>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder="Songs, artists, or albums..."
          leftAccessory={<Icon name="search" color={Colors.text.medium} />}
          rightAccessory={
            query.length > 0 ? (
              <Icon name="close" color={Colors.text.medium} />
            ) : undefined
          }
        />
        <View style={styles.filterRow}>
          {FILTERS.map((item) => (
            <Chip key={item} label={item} selected={item === filter} onPress={() => setFilter(item)} />
          ))}
        </View>
      </View>

      {!hasAnyResult ? (
        <ScrollView contentContainerStyle={styles.emptyContent}>
          <EmptyState
            icon="search-off"
            title={`No results for "${query}"`}
            hint="Please check your spelling or try searching for another artist, track, album, or genre."
            actionLabel="Explore All Genres"
            onActionPress={() => router.push('/search/all-genres')}
          />
          <View style={styles.trendingNow}>
            <View style={styles.trendingHeader}>
              <Icon name="trending-up" size={16} color={Colors.secondary} />
              <ThemedText variant="label-lg">Trending right now</ThemedText>
            </View>
            <View style={styles.trendingChips}>
              {trendingSearches.map((item) => (
                <Chip key={item.query} label={item.query} onPress={() => setQuery(item.query)} />
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
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
                      {`Artist${topResult.monthlyListeners ? ` • ${Math.round(topResult.monthlyListeners / 1000)}K monthly listeners` : ''}`}
                    </ThemedText>
                  </View>
                </View>
                <CircleButton
                  icon="play-arrow"
                  size={44}
                  iconSize={22}
                  accessibilityLabel={`Play ${topResult.name} top tracks`}
                  onPress={() => router.push({ pathname: '/artist/[id]', params: { id: topResult.id } })}
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
                    onPress={() => router.push({ pathname: '/player/now-playing', params: { trackId: track.id } })}
                    onToggleLike={() => {}}
                    onOptionsPress={() => {}}
                  />
                ))}
              </View>
            </View>
          )}

          {(filter === 'All' || filter === 'Artists') && matchedArtists.length > 0 && (
            <View style={styles.section}>
              <ThemedText variant="headline-sm">Artists</ThemedText>
              <View style={styles.artistGrid}>
                {matchedArtists.map((artist) => (
                  <AvatarCard
                    key={artist.id}
                    photoUri={artist.photoUri}
                    name={artist.name}
                    verified={artist.verified}
                    metaLabel="Artist"
                    onPress={() => router.push({ pathname: '/artist/[id]', params: { id: artist.id } })}
                  />
                ))}
              </View>
            </View>
          )}

          {(filter === 'All' || filter === 'Albums') && matchedAlbums.length > 0 && (
            <View style={styles.section}>
              <ThemedText variant="headline-sm">Albums & EPs</ThemedText>
              <View style={styles.albumGrid}>
                {matchedAlbums.map((album) => (
                  <CoverCard
                    key={album.id}
                    coverUri={album.coverUri}
                    layout="below"
                    width={150}
                    title={album.title}
                    subtitle={`${album.year} • ${album.type === 'ep' ? 'EP' : album.type === 'single' ? 'Single' : 'Album'}`}
                    onPress={() => router.push({ pathname: '/album/[id]', params: { id: album.id } })}
                  />
                ))}
              </View>
            </View>
          )}

          {(filter === 'All' || filter === 'Playlists') && matchedPlaylists.length > 0 && (
            <View style={styles.section}>
              <ThemedText variant="headline-sm">Featured Playlists</ThemedText>
              {matchedPlaylists.map((playlist) => (
                <LibraryRow
                  key={playlist.id}
                  coverUri={playlist.coverUri}
                  title={playlist.title}
                  subtitle={`Playlist • ${playlist.trackCount} songs${playlist.durationLabel ? ` • ${playlist.durationLabel}` : ''}`}
                  trailing="chevron"
                  onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: playlist.id } })}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </ThemedView>
  );
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
    paddingBottom: Spacing.xl * 3,
    gap: Spacing.lg,
  },
  emptyContent: {
    paddingHorizontal: Spacing.margin,
    paddingBottom: Spacing.xl * 3,
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
  artistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
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
    gap: Spacing.xs,
  },
});
