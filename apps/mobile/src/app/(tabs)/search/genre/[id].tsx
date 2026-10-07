import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AvatarCard, CoverCard, PillButton, TrackRow } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';
import { albums, artists, genreDetails, getGenreById, tracks } from '@/mocks';
import { useLibraryStore } from '@/state/library-store';
import { usePlayerStore } from '@/state/player-store';

/** S-07 Genre / Category detail (docs/screens.md §3.2). */
export default function GenreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const genre = getGenreById(id ?? '');
  const detail = genreDetails[id ?? ''];

  const compilations = albums.slice(0, 3);
  const pioneeringArtists = artists.slice(0, 4);
  const trending = tracks.slice(0, 4);
  const newReleases = albums.slice(3, 6);
  const trendingIds = trending.map((track) => track.id);
  const play = usePlayerStore((s) => s.play);
  const followed = useLibraryStore((s) => s.followedGenreIds.has(id ?? ''));
  const toggleGenreFollowed = useLibraryStore((s) => s.toggleGenreFollowed);
  const { showToast, toast } = useToast();
  const genreTitle = genre?.title ?? detail?.heroTitle ?? 'this genre';

  function playTrending(trackId = trendingIds[0]) {
    if (!trackId) return;
    play(trackId, trendingIds);
    router.push('/player/now-playing');
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <ThemedText variant="display-lg-mobile">{detail?.heroTitle ?? genre?.title ?? 'Genre'}</ThemedText>
          {detail && (
            <ThemedText variant="body-md" emphasis="medium">
              {detail.listeners}
            </ThemedText>
          )}
          {detail && (
            <ThemedText variant="body-md" emphasis="medium">
              {detail.description}
            </ThemedText>
          )}
          <View style={styles.heroActions}>
            <PillButton label="Listen Now" onPress={() => playTrending()} style={styles.heroButton} />
            <PillButton
              label={followed ? 'Following' : 'Follow'}
              variant="secondary"
              onPress={() => {
                if (!id) return;
                toggleGenreFollowed(id);
                showToast(followed ? `Unfollowed ${genreTitle}` : `Following ${genreTitle}`, 'check');
              }}
              style={styles.heroButton}
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText variant="headline-md">Essential Compilations</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
            {compilations.map((album) => (
              <CoverCard
                key={album.id}
                layout="below"
                width={150}
                coverUri={album.coverUri}
                title={album.title}
                subtitle={`${album.trackCount} tracks`}
                onPress={() => router.push({ pathname: '/album/[id]', params: { id: album.id } })}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <ThemedText variant="headline-md">Pioneering Artists</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
            {pioneeringArtists.map((artist) => (
              <AvatarCard
                key={artist.id}
                photoUri={artist.photoUri}
                name={artist.name}
                verified={artist.verified}
                metaLabel={artist.monthlyListeners ? `${(artist.monthlyListeners / 1_000_000).toFixed(1)}M fans` : undefined}
                onPress={() => router.push({ pathname: '/artist/[id]', params: { id: artist.id } })}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText variant="headline-md">Trending — Live Top {trending.length}</ThemedText>
          </View>
          <View style={styles.trackList}>
            {trending.map((track, index) => (
              <TrackRow
                key={track.id}
                index={index + 1}
                title={track.title}
                artist={track.artistName}
                lossless={track.lossless}
                explicit={track.explicit}
                onPress={() => playTrending(track.id)}
                onOptionsPress={() => router.push({ pathname: '/sheets/options', params: { kind: 'track', id: track.id } })}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText variant="headline-md">New Releases</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
            {newReleases.map((album) => (
              <CoverCard
                key={album.id}
                layout="below"
                width={150}
                coverUri={album.coverUri}
                title={album.title}
                subtitle={album.artistName}
                onPress={() => router.push({ pathname: '/album/[id]', params: { id: album.id } })}
              />
            ))}
          </ScrollView>
        </View>
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
    paddingBottom: Spacing.xl * 3,
  },
  hero: {
    gap: Spacing.xs,
  },
  heroActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  heroButton: {
    flex: 1,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  carousel: {
    gap: Spacing.md,
  },
  trackList: {
    gap: 2,
  },
});
