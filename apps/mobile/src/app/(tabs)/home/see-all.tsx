import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Chip, CoverCard, IconButton, PillButton } from '@/components/ui';
import type { LocalOrRemoteImage } from '@/constants/stitch-artwork';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useContentWidth } from '@/hooks/use-content-width';
import { useToast } from '@/hooks/use-toast';
import type { AppStringKey } from '@/lib/i18n';
import { albums, getTrackById, type Album, type Track } from '@/mocks';
import { useLibraryStore } from '@/state/library-store';
import { useAppStrings } from '@/state/locale-store';
import { usePlayerStore } from '@/state/player-store';

const FILTERS = ['This Week', 'Top Charts', 'Albums', 'Singles'] as const;
type FilterKey = (typeof FILTERS)[number];

/** Internal filter VALUES stay these fixed English strings (switch below
 * compares against them); only the on-screen LABEL is localized. */
const FILTER_LABEL_KEYS: Record<FilterKey, AppStringKey> = {
  'This Week': 'filterThisWeekLabel',
  'Top Charts': 'filterTopChartsLabel',
  Albums: 'filterAlbums',
  Singles: 'filterSinglesLabel',
};

/** Ranked mock "chart" — reuses existing tracks (all already carry real or
 * generated artwork) rather than inventing a parallel catalog. */
const TOP_CHART_TRACK_IDS = ['midnight-mirage', 'horizon', 'obsidian-frequencies', 'ember-tide', 'vapor-trails', 'abyssal-bloom'];

type SeeAllItem = {
  id: string;
  kind: 'album' | 'track';
  title: string;
  subtitle: string;
  coverUri?: LocalOrRemoteImage;
  meta: string;
  onPress: () => void;
};

function albumToItem(album: Album, t: (key: AppStringKey) => string): SeeAllItem {
  return {
    id: album.id,
    kind: 'album',
    title: album.title,
    subtitle: album.artistName,
    coverUri: album.coverUri,
    meta: album.trackCount === 1 ? t('albumTypeSingle') : `${album.trackCount} ${t('trackCountPlural')}`,
    onPress: () => router.push({ pathname: '/album/[id]', params: { id: album.id } }),
  };
}

function trackToItem(track: Track, rank: number, t: (key: AppStringKey) => string): SeeAllItem {
  return {
    id: track.id,
    kind: 'track',
    title: track.title,
    subtitle: track.artistName,
    coverUri: track.coverUri,
    meta: `#${rank} ${t('filterTopChartsLabel')}`,
    onPress: () => router.push({ pathname: '/player/now-playing', params: { trackId: track.id } }),
  };
}

function getFilterContent(
  filter: FilterKey,
  t: (key: AppStringKey) => string,
): { sectionTitle: string; heroItem?: SeeAllItem; items: SeeAllItem[] } {
  switch (filter) {
    case 'This Week': {
      const [hero, ...rest] = albums;
      return { sectionTitle: t('freshFindsTitle'), heroItem: hero && albumToItem(hero, t), items: rest.map((a) => albumToItem(a, t)) };
    }
    case 'Top Charts': {
      const chartTracks = TOP_CHART_TRACK_IDS.map((id) => getTrackById(id)).filter((t): t is Track => Boolean(t));
      const [hero, ...rest] = chartTracks;
      return {
        sectionTitle: t('topTracksTitle'),
        heroItem: hero && trackToItem(hero, 1, t),
        items: rest.map((track, index) => trackToItem(track, index + 2, t)),
      };
    }
    case 'Albums': {
      const albumsOnly = albums.filter((a) => a.type === 'album' || a.type === 'ep');
      const [hero, ...rest] = albumsOnly;
      return { sectionTitle: t('allAlbumsTitle'), heroItem: hero && albumToItem(hero, t), items: rest.map((a) => albumToItem(a, t)) };
    }
    case 'Singles': {
      const singlesOnly = albums.filter((a) => a.type === 'single');
      const [hero, ...rest] = singlesOnly;
      return { sectionTitle: t('allSinglesTitle'), heroItem: hero && albumToItem(hero, t), items: rest.map((a) => albumToItem(a, t)) };
    }
  }
}

/** S-02 See All (New Releases / Trending) — docs/screens.md §3.1. Filter chips
 * select one of 4 frontend-only mock datasets (This Week / Top Charts /
 * Albums / Singles) instead of only changing the chip's own active style —
 * hero and carousel both update to match. */
export default function SeeAllScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('This Week');
  const { t } = useAppStrings();
  const { sectionTitle, heroItem, items } = useMemo(() => getFilterContent(activeFilter, t), [activeFilter, t]);
  const libraryItems = useLibraryStore((s) => s.items);
  const toggleSaved = useLibraryStore((s) => s.toggleSaved);
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const toggleLike = usePlayerStore((s) => s.toggleLike);
  const { showToast, toast } = useToast();
  const heroWidth = useContentWidth() - Spacing.margin * 2;
  const heroHeight = Math.round(heroWidth / 1.6);

  const heroSaved = heroItem
    ? heroItem.kind === 'track'
      ? likedTrackIds.has(heroItem.id)
      : libraryItems.some((item) => item.kind === 'album' && item.refId === heroItem.id)
    : false;

  function handleSaveHero() {
    if (!heroItem) return;
    if (heroItem.kind === 'track') {
      toggleLike(heroItem.id);
      showToast(heroSaved ? t('toastRemovedFromLikedSongs') : t('toastAddedToLikedSongs'), 'favorite');
    } else {
      toggleSaved('album', heroItem.id);
      showToast(heroSaved ? t('removedFromLibrary') : t('savedToLibrary'), 'check');
    }
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.filterRow}>
          {FILTERS.map((filter) => (
            <Chip key={filter} label={t(FILTER_LABEL_KEYS[filter])} selected={filter === activeFilter} onPress={() => setActiveFilter(filter)} />
          ))}
        </View>

        {heroItem && (
          // Stitch S-02: 16:10 artwork card with the copy and actions overlaid.
          <View style={[styles.heroCard, { height: heroHeight }]}>
            <Artwork uri={heroItem.coverUri} size={heroWidth} aspectRatio={heroWidth / heroHeight} radius={Radii.lg} style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['transparent', 'rgba(10, 10, 12, 0.6)', 'rgba(10, 10, 12, 0.95)']}
              locations={[0.2, 0.55, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroBody}>
            <ThemedText variant="headline-lg" numberOfLines={2}>
              {heroItem.title}
            </ThemedText>
            <ThemedText variant="body-md" emphasis="medium">
              {heroItem.subtitle} · {heroItem.meta}
            </ThemedText>
            <View style={styles.heroActions}>
              <PillButton label={t('listenNow')} leadingIcon="play-arrow" onPress={heroItem.onPress} style={styles.heroButton} />
              <IconButton
                icon={heroSaved ? 'bookmark-added' : 'bookmark-add'}
                color={heroSaved ? Colors.primary : undefined}
                accessibilityLabel={heroSaved ? t('statSaved') : t('saveLabel')}
                onPress={handleSaveHero}
              />
              <IconButton
                icon="more-horiz"
                accessibilityLabel={t('moreOptionsLabel')}
                onPress={() => router.push({ pathname: '/sheets/options', params: { kind: heroItem.kind, id: heroItem.id } })}
              />
            </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText variant="headline-md">{sectionTitle}</ThemedText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carouselBleed} contentContainerStyle={styles.carousel}>
            {items.map((item) => (
              <CoverCard
                key={item.id}
                layout="below"
                width={144}
                coverUri={item.coverUri}
                title={item.title}
                subtitle={item.subtitle}
                meta={item.meta}
                onPress={item.onPress}
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
    // Clear of the floating nav pill and player capsule (W3 Этап 1).
    paddingBottom: Spacing.miniPlayerClearance,
    gap: Spacing.lg,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  heroCard: {
    borderRadius: Radii.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: Colors.surface.l1,
  },
  heroBody: {
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  heroButton: {
    flex: 1,
    height: 44,
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
    paddingHorizontal: Spacing.margin,
  },
  carouselBleed: {
    marginHorizontal: -Spacing.margin,
  },
});
