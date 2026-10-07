import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip, CircleButton, Icon, IconButton, LibraryRow } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { getAlbumById, getArtistById, getPlaylistById, libraryItems } from '@/mocks';
import { usePlayerStore } from '@/state/player-store';

const FILTERS = ['All', 'Playlists', 'Artists', 'Albums', 'Downloaded'] as const;

/** S-12 Your Library — tab root (docs/screens.md §3.10). */
export default function LibraryScreen() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const likedSongsCount = usePlayerStore((s) => s.likedTrackIds.size);

  const visibleItems = useMemo(() => {
    if (filter === 'All') return libraryItems;
    if (filter === 'Downloaded') return libraryItems.filter((item) => item.downloaded);
    const kind = filter === 'Playlists' ? 'playlist' : filter === 'Artists' ? 'artist' : 'album';
    return libraryItems.filter((item) => item.kind === kind);
  }, [filter]);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.headerRow}>
          <ThemedText variant="display-lg-mobile">Your Library</ThemedText>
          <View style={styles.headerActions}>
            <IconButton icon="search" accessibilityLabel="Search in Library" onPress={() => {}} size={40} />
            <IconButton
              icon="add"
              accessibilityLabel="Create Playlist"
              onPress={() => router.push('/create-playlist')}
              size={40}
              style={styles.addButton}
              color={Colors.canvas}
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

        <View style={styles.likedSongsCard}>
          <View style={styles.likedSongsInfo}>
            <View style={styles.likedSongsIcon}>
              <Icon name="favorite" size={28} color={Colors.text.high} />
            </View>
            <View style={styles.likedSongsText}>
              <ThemedText variant="headline-md">Liked Songs</ThemedText>
              <ThemedText variant="body-sm" emphasis="medium">
                {likedSongsCount} tracks
              </ThemedText>
            </View>
          </View>
          <CircleButton
            icon="play-arrow"
            size={48}
            iconSize={24}
            accessibilityLabel="Play Liked Songs"
            onPress={() => router.push('/library/liked-songs')}
          />
        </View>

        <View style={styles.list}>
          {visibleItems.map((item) => {
            if (item.kind === 'playlist') {
              const playlist = getPlaylistById(item.refId);
              if (!playlist) return null;
              return (
                <LibraryRow
                  key={item.id}
                  title={playlist.title}
                  subtitle={`${playlist.editorial ? 'Editorial' : 'Playlist'} • ${playlist.trackCount} songs`}
                  downloaded={item.downloaded}
                  trailing="more"
                  onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: playlist.id } })}
                  onOptionsPress={() => {}}
                />
              );
            }
            if (item.kind === 'artist') {
              const artist = getArtistById(item.refId);
              if (!artist) return null;
              return (
                <LibraryRow
                  key={item.id}
                  coverShape="circle"
                  title={artist.name}
                  verified={artist.verified}
                  subtitle={`Artist${artist.monthlyListeners ? ` • ${(artist.monthlyListeners / 1_000_000).toFixed(1)}M monthly listeners` : ''}`}
                  trailing="chevron"
                  onPress={() => router.push({ pathname: '/artist/[id]', params: { id: artist.id } })}
                />
              );
            }
            const album = getAlbumById(item.refId);
            if (!album) return null;
            return (
              <LibraryRow
                key={item.id}
                title={album.title}
                subtitle={`Album • ${album.artistName} • ${album.trackCount} tracks`}
                downloaded={item.downloaded}
                trailing="more"
                onPress={() => router.push({ pathname: '/album/[id]', params: { id: album.id } })}
                onOptionsPress={() => {}}
              />
            );
          })}
        </View>
      </ScrollView>
    </ThemedView>
  );
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
    paddingBottom: Spacing.xl * 3,
  },
  filterRow: {
    gap: Spacing.xs,
  },
  likedSongsCard: {
    borderRadius: Radii.lg,
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
    borderRadius: Radii.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likedSongsText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  list: {
    gap: Spacing.xs,
  },
});
