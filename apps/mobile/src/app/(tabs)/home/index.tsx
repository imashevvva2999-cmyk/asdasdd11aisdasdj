import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MmusicBrand } from '@/components/mmusic-brand';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CoverCard, FeaturedBanner, IconButton, MoodCard, QuickTile, SectionHeader, TrackRow, type MoodVisualKind } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';
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
import { useLibraryStore } from '@/state/library-store';
import { usePlayerStore } from '@/state/player-store';

/** Mood motif per mix (presentation only — the mix data stays unchanged). */
const MOOD_VISUALS: Record<string, MoodVisualKind> = {
  'late-night': 'moon',
  melancholy: 'rain',
  'high-energy': 'energy',
  'flow-state': 'flow',
};

/** S-01 Home — tab root (docs/screens.md §3.1). */
export default function HomeScreen() {
  const hero = getPlaylistById(heroPlaylistId);
  const play = usePlayerStore((s) => s.play);
  const currentTrackId = usePlayerStore((s) => s.currentTrackId());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const libraryItems = useLibraryStore((s) => s.items);
  const toggleSaved = useLibraryStore((s) => s.toggleSaved);
  const isAlbumSaved = (albumId: string) => libraryItems.some((item) => item.kind === 'album' && item.refId === albumId);
  const { showToast, toast } = useToast();

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
                onPress={() => {
                  if (tile.artistId) {
                    router.push({ pathname: '/artist/[id]', params: { id: tile.artistId } });
                    return;
                  }
                  play(tile.trackIds[0]!, tile.trackIds);
                  router.push('/player/now-playing');
                }}
                onPlayPress={() => play(tile.trackIds[0]!, tile.trackIds)}
                style={styles.forYouItem}
              />
            ))}
          </View>
        </Section>

        {hero && (
          <View style={styles.section}>
            <FeaturedBanner
              layout="footer"
              animated
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carouselBleed} contentContainerStyle={styles.carousel}>
            {trendingNowAlbumIds.map((albumId) => {
              const album = getAlbumById(albumId);
              if (!album) return null;
              return (
                <CoverCard
                  key={album.id}
                  layout="below"
                  width={160}
                  coverUri={album.coverUri}
                  title={album.title}
                  subtitle={album.artistName}
                  meta={`${album.trackCount} Tracks`}
                  metaTone="muted"
                  liked={isAlbumSaved(album.id)}
                  onPress={() => router.push({ pathname: '/album/[id]', params: { id: album.id } })}
                  onToggleLike={() => toggleSaved('album', album.id)}
                />
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <SectionHeader title="New Releases" actionLabel="Explore" onActionPress={() => router.push('/home/see-all')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carouselBleed} contentContainerStyle={styles.carousel}>
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
          <SectionHeader
            title="Jump Back In"
            actionLabel="History"
            onActionPress={() => showToast("Full listening history isn't available yet", 'history')}
          />
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
                  active={currentTrackId === track.id}
                  onPress={() => {
                    play(track.id, jumpBackInTrackIds);
                    router.push({ pathname: '/player/now-playing', params: { trackId: track.id } });
                  }}
                  onOptionsPress={() => router.push({ pathname: '/sheets/options', params: { kind: 'track', id: track.id } })}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.sectionLast}>
          <View style={styles.moodHeader}>
            <ThemedText variant="headline-md">Mood & Vibe Mixes</ThemedText>
          </View>
          {/* Explicit 2-per-row chunking: RN-web doesn't wrap `flex: 1` cards with
              flexWrap, so all four were squeezed into one row (Stitch is 2×2). */}
          <View style={styles.moodGrid}>
            {chunkPairs(moodMixes).map((row, rowIndex) => (
              <View key={rowIndex} style={styles.moodRow}>
                {row.map((mix) => (
                  <MoodCard
                    key={mix.id}
                    title={mix.title}
                    subtitle={mix.subtitle}
                    trackCountLabel={`${mix.trackCount} Tracks`}
                    icon={mix.icon}
                    tint={mix.tint}
                    visual={MOOD_VISUALS[mix.id]}
                    onPress={() => {
                      play(mix.trackIds[0]!, mix.trackIds);
                      router.push('/player/now-playing');
                    }}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      {toast}
    </ThemedView>
  );
}

function Header() {
  return (
    <ThemedView surface="canvas" style={headerStyles.header}>
      <SafeAreaView edges={['top']}>
        <View style={headerStyles.row}>
          <MmusicBrand />
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

function chunkPairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
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
    paddingHorizontal: Spacing.margin,
  },
  // Carousels run edge to edge (Stitch -mx-margin px-margin); only their
  // headers keep the page margin.
  carouselBleed: {
    marginHorizontal: -Spacing.margin,
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
  moodGrid: {
    gap: Spacing.sm,
  },
  moodRow: {
    flexDirection: 'row',
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
});
