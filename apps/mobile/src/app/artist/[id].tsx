import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MINI_PLAYER_OVERLAY_CLEARANCE, MiniPlayerOverlay } from '@/components/mini-player';
import { ThemedView } from '@/components/themed-view';
import { Artwork, AvatarCard, CircleButton, CoverCard, Icon, IconButton, PillButton, SectionHeader, TrackRow } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useContentWidth } from '@/hooks/use-content-width';
import { getAlbumById, getArtistById, getTrackById } from '@/mocks';
import { useLibraryStore } from '@/state/library-store';
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
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const artist = getArtistById(id);
  const isFollowing = useLibraryStore((s) => s.isSaved('artist', id));
  const heroWidth = useContentWidth() - Spacing.margin * 2;
  const heroHeight = Math.min(360, Math.round(heroWidth * 1.05));
  const toggleSaved = useLibraryStore((s) => s.toggleSaved);

  const play = usePlayerStore((s) => s.play);
  const playShuffled = usePlayerStore((s) => s.playShuffled);
  const currentTrackId = usePlayerStore((s) => s.currentTrackId());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  // Subscribe to the liked set itself (not the stable `isLiked` function) so
  // the hearts re-render when a like is toggled.
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const isLiked = (trackId: string) => likedTrackIds.has(trackId);
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
        {/* Stitch S-08: full-width photo card with the name overlaid. */}
        <View style={[styles.hero, { height: heroHeight }]}>
          <Artwork uri={artist.photoUri} size={heroWidth} aspectRatio={heroWidth / heroHeight} radius={Radii.xl} placeholderIcon="person" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={['transparent', 'rgba(10, 10, 12, 0.55)', 'rgba(10, 10, 12, 0.92)']}
            locations={[0.45, 0.75, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroBody}>
            <View style={styles.nameRow}>
              <ThemedText variant="display-lg-mobile" numberOfLines={1} style={styles.name}>
                {artist.name}
              </ThemedText>
              {artist.verified && <Icon name="verified" size={20} color={Colors.primary} />}
            </View>
            <View style={styles.metaRow}>
              <View style={styles.metaDot} />
              <ThemedText variant="label-md" emphasis="medium">
                {artist.monthlyListeners !== undefined ? `${formatListeners(artist.monthlyListeners)} monthly listeners` : null}
                {artist.location ? ` • ${artist.location}` : ''}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <PillButton
            label={isFollowing ? 'Following' : 'Follow'}
            variant="secondary"
            leadingIcon={isFollowing ? 'check' : 'add'}
            onPress={() => toggleSaved('artist', artist.id)}
            style={styles.smallPill}
          />
          <PillButton
            label="Support"
            variant="secondary"
            leadingIcon="volunteer-activism"
            onPress={() => router.push({ pathname: '/sheets/support', params: { artistId: artist.id } })}
            style={styles.smallPill}
          />
          <View style={styles.spacer} />
          <View>
            <CircleButton
              icon="play-arrow"
              size={56}
              iconSize={30}
              accessibilityLabel="Play popular tracks"
              onPress={() => popularTrackIds.length > 0 && play(popularTrackIds[0]!, popularTrackIds)}
            />
            <IconButton
              icon="shuffle"
              size={26}
              iconSize={14}
              accessibilityLabel="Shuffle popular tracks"
              onPress={() => playShuffled(popularTrackIds)}
              style={styles.shuffleBadge}
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
                  coverUri={track!.coverUri}
                  active={currentTrackId === track!.id}
                  title={track!.title}
                  artist={track!.artistName}
                  durationLabel={formatDuration(track!.durationSec)}
                  explicit={track!.explicit}
                  lossless={track!.lossless}
                  isPlaying={currentTrackId === track!.id && isPlaying}
                  liked={isLiked(track!.id)}
                  onPress={() => play(track!.id, popularTrackIds)}
                  onToggleLike={() => toggleLike(track!.id)}
                  onOptionsPress={() => router.push({ pathname: '/sheets/options', params: { kind: 'track', id: track!.id } })}
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
                  subtitle={`${album!.type === 'ep' ? 'EP' : album!.type === 'single' ? 'Single' : 'Album'} • ${album!.year}`}
                  layout="below"
                  width={144}
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
                  metaLabel="Artist"
                  size={64}
                  style={styles.fanCard}
                  onPress={() => router.push({ pathname: '/artist/[id]', params: { id: other!.id } })}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {artist.bio && (
          <View style={styles.section}>
            <SectionHeader title="About" />
            <View style={styles.aboutCard}>
              {(artist.location || artist.genres?.length) && (
                <ThemedText variant="label-md" emphasis="primary">
                  {[artist.location, artist.genres?.join(' · ')].filter(Boolean).join(' • ')}
                </ThemedText>
              )}
              <ThemedText variant="body-md" emphasis="medium">
                {artist.bio}
              </ThemedText>
            </View>
          </View>
        )}
      </ScrollView>
      <MiniPlayerOverlay />
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
    paddingBottom: MINI_PLAYER_OVERLAY_CLEARANCE,
    gap: Spacing.xl,
  },
  hero: {
    borderRadius: Radii.xl,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: Colors.surface.l1,
  },
  heroBody: {
    padding: Spacing.lg,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.secondary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: -Spacing.md,
  },
  smallPill: {
    height: 40,
    paddingHorizontal: Spacing.md,
  },
  spacer: {
    flex: 1,
  },
  shuffleBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    backgroundColor: Colors.surface.l3,
    borderWidth: 2,
    borderColor: Colors.canvas,
  },
  section: {
    gap: Spacing.sm,
  },
  trackList: {
    gap: 2,
  },
  hScroll: {
    gap: Spacing.md,
  },
  fanCard: {
    width: 96,
  },
  aboutCard: {
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surface.l1,
  },
});
