import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, AvatarCard, CoverCard, EmptyState, PillButton, TrackRow } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useContentWidth } from '@/hooks/use-content-width';
import { useToast } from '@/hooks/use-toast';
import { getTrackIdsForGenre } from '@/lib/genre-tracks';
import { genreFollowToggleToast, genreTagLabel } from '@/lib/i18n';
import { albums, artists, featuredGenre, genreDetails, genres, getGenreById, getTrackById, type Track } from '@/mocks';
import { useLibraryStore } from '@/state/library-store';
import { useAppStrings } from '@/state/locale-store';
import { usePlayerStore } from '@/state/player-store';

/** Compact enough that title, two lines of description and the actions sit
 * comfortably over the artwork on a 390px-wide phone. */
const HERO_HEIGHT = 280;

/** Pre-renders every catalog genre — and the featured one Search links to — for
 * the static website (direct links and refresh serve the genre's own HTML, React #418). */
export function generateStaticParams() {
  return [featuredGenre, ...genres].map((genre) => ({ id: genre.id }));
}

/** S-07 Genre / Category detail (docs/screens.md §3.2). */
export default function GenreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const genre = getGenreById(id ?? '');
  const detail = genreDetails[id ?? ''];

  const compilations = albums.slice(0, 4);
  const windowWidth = useContentWidth();
  const heroWidth = windowWidth - Spacing.margin * 2;
  const columnWidth = Math.floor((heroWidth - Spacing.md) / 2);
  const pioneeringArtists = artists.slice(0, 4);
  // Genre-specific listing: only tracks mapped to this genre (GENRE_TAG_MAP);
  // an unmapped/empty genre shows an empty state, never unrelated tracks.
  const trending = getTrackIdsForGenre(id ?? '')
    .map((trackId) => getTrackById(trackId))
    .filter((track): track is Track => track !== undefined);
  const newReleases = albums.slice(3, 6);
  const trendingIds = trending.map((track) => track.id);
  const play = usePlayerStore((s) => s.play);
  const currentTrackId = usePlayerStore((s) => s.currentTrackId());
  const followed = useLibraryStore((s) => s.followedGenreIds.has(id ?? ''));
  const toggleGenreFollowed = useLibraryStore((s) => s.toggleGenreFollowed);
  const { showToast, toast } = useToast();
  const { locale, t } = useAppStrings();
  const genreTitle = genre?.title ?? detail?.heroTitle ?? t('thisGenreFallback');

  function playTrending(trackId = trendingIds[0]) {
    if (!trackId) return;
    play(trackId, trendingIds);
    router.push('/player/now-playing');
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Stitch S-07: full-bleed image card with the copy and actions overlaid. */}
        <View style={styles.hero}>
          <Artwork uri={genre?.coverUri} size={heroWidth} aspectRatio={heroWidth / HERO_HEIGHT} radius={Radii.lg} style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={['rgba(10, 10, 12, 0.05)', 'rgba(10, 10, 12, 0.65)', 'rgba(10, 10, 12, 0.95)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />
          {detail && (
            <View style={styles.kindPill}>
              <ThemedText variant="label-sm" emphasis="high">
                {genreTagLabel(locale, detail.label)}
              </ThemedText>
            </View>
          )}
          <View style={styles.heroBody}>
            {detail?.listeners && (
              <ThemedText variant="label-md" style={styles.heroEyebrow}>
                {detail.listeners}
              </ThemedText>
            )}
            <ThemedText variant="display-lg-mobile" numberOfLines={2}>{detail?.heroTitle ?? genre?.title ?? t('genreFallback')}</ThemedText>
            {detail && (
              <ThemedText variant="body-sm" emphasis="medium" numberOfLines={2}>
                {detail.description}
              </ThemedText>
            )}
          <View style={styles.heroActions}>
            <PillButton
              label={t('listenNow')}
              leadingIcon="play-arrow"
              disabled={trending.length === 0}
              onPress={() => playTrending()}
              style={styles.heroButton}
            />
            <PillButton
              label={followed ? t('followingLabel') : t('followLabel')}
              leadingIcon={followed ? 'check' : 'add'}
              variant="secondary"
              onPress={() => {
                if (!id) return;
                toggleGenreFollowed(id);
                showToast(genreFollowToggleToast(locale, followed, genreTitle), 'check');
              }}
              style={styles.heroButton}
            />
          </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle title={t('genreCompilationsTitle')} subtitle={t('genreCompilationsSubtitle')} />
          <View style={styles.grid}>
            {chunkPairs(compilations).map((row, rowIndex) => (
              <View key={rowIndex} style={styles.gridRow}>
                {row.map((album) => (
                  <CoverCard
                    key={album.id}
                    layout="below"
                    surfaced
                    width={columnWidth}
                    coverUri={album.coverUri}
                    title={album.title}
                    subtitle={`${album.trackCount} ${t('tracksCountSuffix')}`}
                    onPress={() => router.push({ pathname: '/album/[id]', params: { id: album.id } })}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle title={t('genrePioneeringArtistsTitle')} subtitle={t('genrePioneeringArtistsSubtitle')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carouselBleed} contentContainerStyle={styles.carousel}>
            {pioneeringArtists.map((artist) => (
              <AvatarCard
                key={artist.id}
                photoUri={artist.photoUri}
                name={artist.name}
                verified={artist.verified}
                metaLabel={artist.monthlyListeners ? `${(artist.monthlyListeners / 1_000_000).toFixed(1)}M ${t('fansSuffix')}` : undefined}
                onPress={() => router.push({ pathname: '/artist/[id]', params: { id: artist.id } })}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          {trending.length === 0 ? (
            <EmptyState icon="library-music" title={t('genreNoTracksTitle')} hint={t('genreNoTracksHint')} />
          ) : (
            <>
              {/* Neutral wording: no play/trending data exists, so no "live"/"most played" claim. */}
              <SectionTitle title={`${t('genreTopPrefix')} ${trending.length}`} subtitle={t('genreTracksSubtitle')} />
              <View style={styles.trackList}>
                {trending.map((track, index) => (
                  <TrackRow
                    key={track.id}
                    index={index + 1}
                    coverUri={track.coverUri}
                    active={currentTrackId === track.id}
                    title={track.title}
                    artist={track.artistName}
                    lossless={track.lossless}
                    explicit={track.explicit}
                    onPress={() => playTrending(track.id)}
                    onOptionsPress={() => router.push({ pathname: '/sheets/options', params: { kind: 'track', id: track.id } })}
                  />
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.section}>
          <SectionTitle title={t('newReleases')} subtitle={t('recentReleasesSubtitle')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carouselBleed} contentContainerStyle={styles.carousel}>
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

function chunkPairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

/** Section heading with the one-line muted subtitle Stitch S-07 uses. */
function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionTitle}>
      <ThemedText variant="headline-md">{title}</ThemedText>
      <ThemedText variant="body-sm" emphasis="medium">
        {subtitle}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.margin,
    gap: Spacing.lg,
    paddingBottom: Spacing.miniPlayerClearance,
  },
  hero: {
    height: HERO_HEIGHT,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: Colors.surface.l1,
  },
  heroBody: {
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  kindPill: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(10, 10, 12, 0.55)',
  },
  heroEyebrow: {
    color: Colors.secondary,
  },
  heroActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  heroButton: {
    height: 44,
  },
  section: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  grid: {
    gap: Spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  carouselBleed: {
    marginHorizontal: -Spacing.margin,
  },
  sectionTitle: {
    gap: 2,
  },
  carousel: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.margin,
  },
  trackList: {
    gap: 2,
  },
});
