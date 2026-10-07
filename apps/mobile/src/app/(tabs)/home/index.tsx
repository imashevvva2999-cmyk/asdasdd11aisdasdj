import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CoverCard, EqualizerIndicator, FeaturedBanner, IconButton, MoodCard, QuickTile, SectionHeader, TrackRow } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import {
  forYouTiles,
  getAlbumById,
  getPlaylistById,
  getTrackById,
  heroPlaylistId,
  jumpBackInTrackIds,
  moodMixes,
  newReleases,
  trendingNowAlbumIds,
} from '@/mocks';
import { usePlayerStore } from '@/state/player-store';

/** S-01 Home — tab root (docs/screens.md §3.1). */
export default function HomeScreen() {
  const hero = getPlaylistById(heroPlaylistId);
  const play = usePlayerStore((s) => s.play);
  const currentTrackId = usePlayerStore((s) => s.currentTrackId());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLiked = usePlayerStore((s) => s.isLiked);
  const toggleLike = usePlayerStore((s) => s.toggleLike);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <Header />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Section title="For you">
          <View style={styles.forYouGrid}>
            {forYouTiles.map((tile) => (
              <QuickTile
                key={tile.id}
                title={tile.title}
                coverUri={tile.coverUri}
                onPress={() => {}}
                onPlayPress={() => {}}
                style={styles.forYouItem}
              />
            ))}
          </View>
        </Section>

        {hero && (
          <View style={styles.section}>
            <FeaturedBanner
              layout="footer"
              title={hero.title}
              subtitle={hero.curator}
              coverUri={hero.coverUri}
              height={224}
              onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: hero.id } })}
              onPlayPress={() => {
                const trackIds = hero.trackIds;
                if (trackIds && trackIds.length > 0) play(trackIds[0]!, trackIds);
              }}
            />
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader title="Trending Now" actionLabel="See All" onActionPress={() => router.push('/home/see-all')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
            {trendingNowAlbumIds.map((albumId) => {
              const album = getAlbumById(albumId);
              if (!album) return null;
              const firstTrackId = album.trackIds?.[0];
              return (
                <CoverCard
                  key={album.id}
                  layout="below"
                  width={160}
                  coverUri={album.coverUri}
                  title={album.title}
                  subtitle={album.artistName}
                  meta={`${album.trackCount} Tracks`}
                  liked={firstTrackId ? isLiked(firstTrackId) : false}
                  onPress={() => router.push({ pathname: '/album/[id]', params: { id: album.id } })}
                  onToggleLike={firstTrackId ? () => toggleLike(firstTrackId) : undefined}
                />
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <SectionHeader title="New Releases" actionLabel="Explore" onActionPress={() => router.push('/home/see-all')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
            {newReleases.map(({ albumId, label }) => {
              const album = getAlbumById(albumId);
              if (!album) return null;
              return (
                <CoverCard
                  key={album.id}
                  layout="below"
                  surfaced
                  width={192}
                  height={176}
                  coverUri={album.coverUri}
                  title={album.title}
                  subtitle={album.artistName}
                  meta={label}
                  onPress={() => router.push({ pathname: '/album/[id]', params: { id: album.id } })}
                />
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Jump Back In" actionLabel="History" onActionPress={() => {}} />
          <View style={styles.trackList}>
            {jumpBackInTrackIds.map((trackId) => {
              const track = getTrackById(trackId);
              if (!track) return null;
              const trackIsPlaying = currentTrackId === track.id && isPlaying;
              return (
                <TrackRow
                  key={track.id}
                  coverUri={track.coverUri}
                  title={track.title}
                  artist={track.artistName}
                  lossless={track.lossless}
                  explicit={track.explicit}
                  isPlaying={trackIsPlaying}
                  onPress={() => {
                    play(track.id, jumpBackInTrackIds);
                    router.push({ pathname: '/player/now-playing', params: { trackId: track.id } });
                  }}
                  onOptionsPress={() => {}}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.sectionLast}>
          <View style={styles.moodHeader}>
            <ThemedText variant="headline-md">Mood & Vibe Mixes</ThemedText>
            <ThemedText variant="label-sm" emphasis="medium" style={styles.tunedLabel}>
              TUNED TO YOU
            </ThemedText>
          </View>
          <View style={styles.moodGrid}>
            {moodMixes.map((mix) => (
              <MoodCard
                key={mix.id}
                title={mix.title}
                subtitle={mix.subtitle}
                trackCountLabel={`${mix.trackCount} Tracks`}
                icon={mix.icon}
                tint={mix.tint}
                onPress={() => {}}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function Header() {
  return (
    <ThemedView surface="canvas" style={headerStyles.header}>
      <SafeAreaView edges={['top']}>
        <View style={headerStyles.row}>
          <View style={headerStyles.brand}>
            <ThemedText variant="headline-md">Mmusic</ThemedText>
            <EqualizerIndicator size={14} />
          </View>
          <IconButton
            icon="person"
            accessibilityLabel="Profile"
            onPress={() => router.push('/profile')}
          />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <ThemedText variant="headline-md">{title}</ThemedText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingBottom: Spacing.miniPlayerClearance,
  },
  section: {
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.margin,
  },
  sectionLast: {
    paddingHorizontal: Spacing.margin,
  },
  sectionTitleRow: {
    marginBottom: Spacing.sm,
  },
  forYouGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  forYouItem: {
    width: '48.5%',
  },
  carousel: {
    gap: Spacing.md,
    paddingRight: Spacing.margin,
  },
  trackList: {
    gap: 2,
    backgroundColor: Colors.surface.l1,
    borderRadius: Radii.md,
    padding: Spacing.xs,
  },
  moodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  tunedLabel: {
    letterSpacing: 1,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
});

const headerStyles = StyleSheet.create({
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  row: {
    height: 56,
    paddingHorizontal: Spacing.margin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
