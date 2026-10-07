import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, AvatarCard, CoverCard, IconButton, Icon, PillButton, SectionHeader, TrackRow } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { getAlbumById, getArtistById, getTrackById } from '@/mocks';
import { usePlayerStore } from '@/state/player-store';

/** Pre-renders the enriched `solaris-echo` artist for static web export (verify-routes.mjs);
 * other artist IDs still resolve at runtime via client-side navigation. */
export function generateStaticParams() {
  return [{ id: 'solaris-echo' }];
}

/**
 * S-08 Artist Profile — public, listener-facing artist page (docs/screens.md §3.3).
 * Not the owner-facing Artist Dashboard (S-27, profile/artist/dashboard.tsx) — this
 * is what any listener sees when they open an artist from Home/Search/Library/Album.
 */
export default function ArtistProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const artist = getArtistById(id ?? '');
  const [isFollowing, setIsFollowing] = useState(false);

  const play = usePlayerStore((s) => s.play);
  const currentTrackId = usePlayerStore((s) => s.currentTrackId());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLiked = usePlayerStore((s) => s.isLiked);
  const toggleLike = usePlayerStore((s) => s.toggleLike);

  if (!artist) {
    return (
      <ThemedView surface="canvas" style={styles.flex}>
        <ThemedText variant="body-md" emphasis="medium" style={styles.notFound}>
          Artist not found.
        </ThemedText>
      </ThemedView>
    );
  }

  const popularTracks = (artist.popularTrackIds ?? []).map((trackId) => getTrackById(trackId)).filter(Boolean);
  const releaseAlbums = (artist.releaseAlbumIds ?? []).map((albumId) => getAlbumById(albumId)).filter(Boolean);
  const fansAlsoLike = (artist.fansAlsoLikeIds ?? []).map((artistId) => getArtistById(artistId)).filter(Boolean);
  const popularTrackIds = popularTracks.map((t) => t!.id);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Artwork shape="circle" size={140} radius={70} uri={artist.photoUri} />
          <View style={styles.nameRow}>
            <ThemedText variant="headline-lg" numberOfLines={1}>
              {artist.name}
            </ThemedText>
            {artist.verified && <Icon name="verified" size={20} color={Colors.secondary} />}
          </View>
          <ThemedText variant="body-sm" emphasis="medium">
            {artist.monthlyListeners !== undefined ? `${formatListeners(artist.monthlyListeners)} monthly listeners` : null}
            {artist.location ? ` • ${artist.location}` : ''}
          </ThemedText>

          <View style={styles.actionsRow}>
            <PillButton
              label={isFollowing ? 'Following' : 'Follow'}
              variant={isFollowing ? 'secondary' : 'primary'}
              onPress={() => setIsFollowing((v) => !v)}
              style={styles.flexButton}
            />
            <IconButton
              icon="shuffle"
              accessibilityLabel="Shuffle popular tracks"
              onPress={() => popularTrackIds.length > 0 && play(popularTrackIds[0]!, popularTrackIds)}
            />
            <IconButton
              icon="play-arrow"
              accessibilityLabel="Play popular tracks"
              onPress={() => popularTrackIds.length > 0 && play(popularTrackIds[0]!, popularTrackIds)}
            />
            <IconButton
              icon="volunteer-activism"
              accessibilityLabel="Support artist"
              onPress={() => router.push({ pathname: '/sheets/support', params: { artistId: artist.id } })}
            />
          </View>
        </View>

        {popularTracks.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Popular" />
            <View style={styles.trackList}>
              {popularTracks.map((track, index) => (
                <TrackRow
                  key={track!.id}
                  index={index + 1}
                  title={track!.title}
                  artist={track!.artistName}
                  durationLabel={formatDuration(track!.durationSec)}
                  explicit={track!.explicit}
                  lossless={track!.lossless}
                  isPlaying={currentTrackId === track!.id && isPlaying}
                  liked={isLiked(track!.id)}
                  onPress={() => play(track!.id, popularTrackIds)}
                  onToggleLike={() => toggleLike(track!.id)}
                />
              ))}
            </View>
          </View>
        )}

        {releaseAlbums.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Releases" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {releaseAlbums.map((album) => (
                <CoverCard
                  key={album!.id}
                  coverUri={album!.coverUri}
                  title={album!.title}
                  subtitle={String(album!.year)}
                  layout="below"
                  width={140}
                  onPress={() => router.push({ pathname: '/album/[id]', params: { id: album!.id } })}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {fansAlsoLike.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Fans Also Like" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {fansAlsoLike.map((other) => (
                <AvatarCard
                  key={other!.id}
                  photoUri={other!.photoUri}
                  name={other!.name}
                  verified={other!.verified}
                  onPress={() => router.push({ pathname: '/artist/[id]', params: { id: other!.id } })}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {artist.bio && (
          <View style={styles.section}>
            <SectionHeader title="About" />
            <ThemedText variant="body-md" emphasis="medium">
              {artist.bio}
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatListeners(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return String(count);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  notFound: {
    padding: Spacing.margin,
  },
  content: {
    padding: Spacing.margin,
    paddingBottom: Spacing.xl * 3,
    gap: Spacing.xl,
  },
  hero: {
    alignItems: 'center',
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    width: '100%',
  },
  flexButton: {
    flex: 1,
  },
  section: {
    gap: Spacing.sm,
  },
  trackList: {
    gap: 2,
  },
  hScroll: {
    gap: Spacing.sm,
  },
});
