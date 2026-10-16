import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { releaseStageOpen } from '@/components/home/home-stage';
import { MmusicBrand } from '@/components/mmusic-brand';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CoverCard, FeaturedBanner, IconButton, MoodCard, QuickTile, SectionHeader, TrackRow, type MoodVisualKind } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useTabEntrance } from '@/hooks/use-tab-entrance';
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
import { useAppStrings } from '@/state/locale-store';
import { type SceneEngineCtor } from '@/components/living-moods/living-mood-scene';
import { GalaxyScene } from '@/components/living-moods/scenes/galaxy-scene';
import { LiquidChromeScene } from '@/components/living-moods/scenes/liquid-chrome-scene';
import { MetaBallsScene } from '@/components/living-moods/scenes/meta-balls-scene';
import { OrbScene } from '@/components/living-moods/scenes/orb-scene';
import { usePlayerStore } from '@/state/player-store';
import { expandOrigin, stageVisible } from '@/state/player-surface';

/** Living Moods WebGL scene per mix (presentation only). */
const MOOD_SCENES: Record<string, { scene: SceneEngineCtor; colors: [string, string] }> = {
  'late-night': { scene: GalaxyScene, colors: ['#0a0e16', '#162038'] },
  melancholy: { scene: LiquidChromeScene, colors: ['#1a1a1f', '#3a3a42'] },
  'high-energy': { scene: OrbScene, colors: ['#120a16', '#2a1638'] },
  'flow-state': { scene: MetaBallsScene, colors: ['#1a1014', '#3a1f28'] },
};

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
  const queue = usePlayerStore((s) => s.queue);
  // The hero's own tracks are what the player is on (queue matches the playlist).
  const heroInPlayer = !!hero?.trackIds && !!currentTrackId && hero.trackIds.includes(currentTrackId) && queue.length === hero.trackIds.length;
  const heroPlaying = heroInPlayer && isPlaying;
  const libraryItems = useLibraryStore((s) => s.items);
  const toggleSaved = useLibraryStore((s) => s.toggleSaved);
  const isAlbumSaved = (albumId: string) => libraryItems.some((item) => item.kind === 'album' && item.refId === albumId);
  const { showToast, toast } = useToast();
  const { t } = useAppStrings();
  const entrance = useTabEntrance('home');

  // The living Late Night Flow wave runs only while Home is in front.
  const [homeFocused, setHomeFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setHomeFocused(true);
      // Home has no player stage any more: the capsule is the player on every
      // tab, and the player always opens from it.
      releaseStageOpen();
      expandOrigin.value = 'mini';
      stageVisible.value = false;
      return () => setHomeFocused(false);
    }, []),
  );

  // MMusic Stars: opens the genre × song discovery player.
  function openStars() {
    let targetTrackId = currentTrackId;
    if (!heroInPlayer) {
      const trackIds = hero?.trackIds;
      if (trackIds && trackIds.length > 0) {
        targetTrackId = trackIds[0]!;
        play(targetTrackId, trackIds);
      }
    }
    router.push({ pathname: '/player/discover', params: { trackId: targetTrackId ?? hero?.trackIds?.[0] ?? '' } });
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <Header />
      <Animated.View style={[styles.flex, entrance.style]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Section title={t('forYou')}>
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
                // A quiet ⋯ with the mix's actions instead of a coral Play per row.
                onMorePress={() => router.push({ pathname: '/sheets/options', params: { kind: 'mix', id: tile.id } })}
                style={styles.forYouItem}
              />
            ))}
          </View>
        </Section>

        {hero && (
          <View style={styles.section}>
            <FeaturedBanner
              layout="footer"
              // The particle wave stays mounted and runs only while Home is on screen
              // (paused under the player or another tab, so it resumes without a restart).
              animated
              paused={!homeFocused}
              active={heroPlaying}
              title="MMusic Stars"
              coverUri={hero.coverUri}
              height={224}
              trackId={currentTrackId ?? hero.trackIds?.[0]}
              audioPlaying={isPlaying}
              ctaLabel="Go"
              onPress={openStars}
              onPlayPress={openStars}
            />
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader title={t('trendingNow')} actionLabel={t('seeAll')} onActionPress={() => router.push('/home/see-all')} />
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
                  meta={`${album.trackCount} ${t('tracksCountSuffix')}`}
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
          <SectionHeader title={t('newReleases')} actionLabel={t('seeAll')} onActionPress={() => router.push('/home/see-all')} />
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
            title={t('jumpBackIn')}
            actionLabel={t('historyAction')}
            onActionPress={() => showToast(t('toastFullHistory'), 'history')}
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
            <ThemedText variant="headline-md">{t('moodVibeMixes')}</ThemedText>
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
                    trackCountLabel={`${mix.trackCount} ${t('tracksCountSuffix')}`}
                    icon={mix.icon}
                    tint={mix.tint}
                    visual={MOOD_VISUALS[mix.id]}
                    scene={MOOD_SCENES[mix.id]?.scene}
                    sceneColors={MOOD_SCENES[mix.id]?.colors}
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
      </Animated.View>
      {toast}
    </ThemedView>
  );
}

function Header() {
  const { t } = useAppStrings();
  return (
    <View style={headerStyles.header}>
      <SafeAreaView edges={['top']}>
        <View style={headerStyles.row}>
          <MmusicBrand />
          <IconButton
            icon="person"
            accessibilityLabel={t('profileTitle')}
            onPress={() => router.push('/profile')}
          />
        </View>
      </SafeAreaView>
    </View>
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
    backgroundColor: Colors.canvas,
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
