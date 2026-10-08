import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type AnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeStage, releaseStageOpen } from '@/components/home/home-stage';
import { MmusicBrand } from '@/components/mmusic-brand';
import { PlayerBackground } from '@/components/player/player-background';
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
import { clamp01 } from '@/lib/stage-math';
import { hasStartedPlayback, stageOnScreen } from '@/lib/stage-rules';
import { useLibraryStore } from '@/state/library-store';
import { usePlayerStore } from '@/state/player-store';
import { expandOrigin, stageVisible } from '@/state/player-surface';

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
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const queue = usePlayerStore((s) => s.queue);
  // The hero's own tracks are what the player is on (queue matches the playlist).
  const heroInPlayer = !!hero?.trackIds && !!currentTrackId && hero.trackIds.includes(currentTrackId) && queue.length === hero.trackIds.length;
  const heroPlaying = heroInPlayer && isPlaying;
  const libraryItems = useLibraryStore((s) => s.items);
  const toggleSaved = useLibraryStore((s) => s.toggleSaved);
  const isAlbumSaved = (albumId: string) => libraryItems.some((item) => item.kind === 'album' && item.refId === albumId);
  const { showToast, toast } = useToast();

  // Floating Canvas stage (W3 Этап 1): the playing track's palette behind the
  // header and the stage, scrolling away with them; the capsule takes over
  // once the stage has left the screen.
  const hasTrack = usePlayerStore((s) => hasStartedPlayback(s.playback) && s.currentTrack() !== undefined);
  const scrollY = useSharedValue(0);
  const stageHeight = useSharedValue(0);
  const headerHeight = useSharedValue(0);
  const hasStage = useSharedValue(hasTrack);
  const focused = useSharedValue(false);

  useEffect(() => {
    hasStage.value = hasTrack;
    if (!hasTrack) stageHeight.value = 0;
    stageVisible.value = focused.value && hasTrack && stageOnScreen(scrollY.value, stageHeight.value);
  }, [hasTrack, hasStage, focused, scrollY, stageHeight]);

  useFocusEffect(
    useCallback(() => {
      focused.value = true;
      // Home is in front again, so no player is open: a stale "opening from the
      // stage" (e.g. a double tap the router deduped) must not linger.
      releaseStageOpen();
      expandOrigin.value = 'mini';
      stageVisible.value = hasStage.value && stageOnScreen(scrollY.value, stageHeight.value);
      return () => {
        focused.value = false;
        // Other tabs have no stage: the capsule is the player there. Opening the
        // player from the stage keeps it "on screen" (it grows into the player
        // and comes back on close), so the capsule never flashes in between.
        if (expandOrigin.value !== 'stage') stageVisible.value = false;
      };
    }, [focused, hasStage, scrollY, stageHeight]),
  );

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
    if (focused.value && hasStage.value) stageVisible.value = stageOnScreen(event.contentOffset.y, stageHeight.value);
  });
  const backdropStyle = useAnimatedStyle(() => ({
    height: headerHeight.value + stageHeight.value,
    transform: [{ translateY: -Math.max(0, scrollY.value) }],
  }));
  // The header is clear over the stage and takes the canvas once the stage scrolls under it.
  const headerStyle = useAnimatedStyle(() => {
    const solid = hasStage.value ? clamp01((scrollY.value - (stageHeight.value - HEADER_FADE)) / HEADER_FADE) : 1;
    return {
      backgroundColor: `rgba(10, 10, 12, ${solid})`,
      borderBottomColor: `rgba(255, 255, 255, ${0.06 * solid})`,
    };
  });

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      {hasTrack && (
        <Animated.View pointerEvents="none" style={[styles.backdrop, backdropStyle]}>
          <PlayerBackground />
          <LinearGradient colors={['rgba(10, 10, 12, 0)', 'rgba(10, 10, 12, 1)']} style={styles.backdropFade} />
        </Animated.View>
      )}
      <Header
        style={headerStyle}
        onLayout={(e) => {
          headerHeight.value = e.nativeEvent.layout.height;
        }}
      />
      <Animated.ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <HomeStage
          onLayout={(e) => {
            stageHeight.value = e.nativeEvent.layout.height;
          }}
        />
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
              active={heroPlaying}
              title={hero.title}
              subtitle={hero.curator}
              coverUri={hero.coverUri}
              height={224}
              onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: hero.id } })}
              onPlayPress={() => {
                if (heroInPlayer) {
                  togglePlayPause();
                  return;
                }
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
      </Animated.ScrollView>
      {toast}
    </ThemedView>
  );
}

function Header({ style, onLayout }: { style: AnimatedStyle<ViewStyle>; onLayout: (event: LayoutChangeEvent) => void }) {
  return (
    <Animated.View style={[headerStyles.header, style]} onLayout={onLayout}>
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
    </Animated.View>
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

/** How far the header takes to turn solid as the stage passes under it. */
const HEADER_FADE = 24;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingBottom: Spacing.miniPlayerClearance,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  // The stage settles into the canvas instead of ending on a hard edge.
  backdropFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 48,
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
