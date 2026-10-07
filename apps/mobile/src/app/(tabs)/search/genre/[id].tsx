import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AvatarCard, CoverCard, PillButton, TrackRow } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { albums, artists, genreDetails, getGenreById, tracks } from '@/mocks';

/** S-07 Genre / Category detail (docs/screens.md §3.2). */
export default function GenreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const genre = getGenreById(id ?? '');
  const detail = genreDetails[id ?? ''];

  const compilations = albums.slice(0, 3);
  const pioneeringArtists = artists.slice(0, 4);
  const trending = tracks.slice(0, 4);
  const newReleases = albums.slice(3, 6);

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
            <PillButton label="Listen Now" onPress={() => {}} style={styles.heroButton} />
            <PillButton label="Follow" variant="secondary" onPress={() => {}} style={styles.heroButton} />
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
                onPress={() => router.push({ pathname: '/player/now-playing', params: { trackId: track.id } })}
                onOptionsPress={() => {}}
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
                title={album.title}
                subtitle={album.artistName}
                onPress={() => router.push({ pathname: '/album/[id]', params: { id: album.id } })}
              />
            ))}
          </ScrollView>
        </View>
      </ScrollView>
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
