import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip, CoverCard, IconButton, PillButton } from '@/components/ui';
import type { LocalOrRemoteImage } from '@/constants/stitch-artwork';
import { Colors, Spacing } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';
import { albums, getTrackById, type Album, type Track } from '@/mocks';
import { useLibraryStore } from '@/state/library-store';
import { usePlayerStore } from '@/state/player-store';

const FILTERS = ['This Week', 'Top Charts', 'Albums', 'Singles'] as const;
type FilterKey = (typeof FILTERS)[number];

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

function albumToItem(album: Album): SeeAllItem {
  return {
    id: album.id,
    kind: 'album',
    title: album.title,
    subtitle: album.artistName,
    coverUri: album.coverUri,
    meta: album.trackCount === 1 ? 'Single' : `${album.trackCount} tracks`,
    onPress: () => router.push({ pathname: '/album/[id]', params: { id: album.id } }),
  };
}

function trackToItem(track: Track, rank: number): SeeAllItem {
  return {
    id: track.id,
    kind: 'track',
    title: track.title,
    subtitle: track.artistName,
    coverUri: track.coverUri,
    meta: `#${rank} on Top Charts`,
    onPress: () => router.push({ pathname: '/player/now-playing', params: { trackId: track.id } }),
  };
}

function getFilterContent(filter: FilterKey): { sectionTitle: string; heroItem?: SeeAllItem; items: SeeAllItem[] } {
  switch (filter) {
    case 'This Week': {
      const [hero, ...rest] = albums;
      return { sectionTitle: 'Fresh Finds', heroItem: hero && albumToItem(hero), items: rest.map(albumToItem) };
    }
    case 'Top Charts': {
      const chartTracks = TOP_CHART_TRACK_IDS.map((id) => getTrackById(id)).filter((t): t is Track => Boolean(t));
      const [hero, ...rest] = chartTracks;
      return {
        sectionTitle: 'Top Tracks',
        heroItem: hero && trackToItem(hero, 1),
        items: rest.map((track, index) => trackToItem(track, index + 2)),
      };
    }
    case 'Albums': {
      const albumsOnly = albums.filter((a) => a.type === 'album' || a.type === 'ep');
      const [hero, ...rest] = albumsOnly;
      return { sectionTitle: 'All Albums', heroItem: hero && albumToItem(hero), items: rest.map(albumToItem) };
    }
    case 'Singles': {
      const singlesOnly = albums.filter((a) => a.type === 'single');
      const [hero, ...rest] = singlesOnly;
      return { sectionTitle: 'All Singles', heroItem: hero && albumToItem(hero), items: rest.map(albumToItem) };
    }
  }
}

/** S-02 See All (New Releases / Trending) — docs/screens.md §3.1. Filter chips
 * select one of 4 frontend-only mock datasets (This Week / Top Charts /
 * Albums / Singles) instead of only changing the chip's own active style —
 * hero and carousel both update to match. */
export default function SeeAllScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('This Week');
  const { sectionTitle, heroItem, items } = useMemo(() => getFilterContent(activeFilter), [activeFilter]);
  const libraryItems = useLibraryStore((s) => s.items);
  const toggleSaved = useLibraryStore((s) => s.toggleSaved);
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const toggleLike = usePlayerStore((s) => s.toggleLike);
  const { showToast, toast } = useToast();

  const heroSaved = heroItem
    ? heroItem.kind === 'track'
      ? likedTrackIds.has(heroItem.id)
      : libraryItems.some((item) => item.kind === 'album' && item.refId === heroItem.id)
    : false;

  function handleSaveHero() {
    if (!heroItem) return;
    if (heroItem.kind === 'track') {
      toggleLike(heroItem.id);
      showToast(heroSaved ? 'Removed from Liked Songs' : 'Added to Liked Songs', 'favorite');
    } else {
      toggleSaved('album', heroItem.id);
      showToast(heroSaved ? 'Removed from Library' : 'Saved to Library', 'check');
    }
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.filterRow}>
          {FILTERS.map((filter) => (
            <Chip key={filter} label={filter} selected={filter === activeFilter} onPress={() => setActiveFilter(filter)} />
          ))}
        </View>

        {heroItem && (
          <View style={styles.heroCard}>
            <ThemedText variant="headline-lg" numberOfLines={2}>
              {heroItem.title}
            </ThemedText>
            <ThemedText variant="body-md" emphasis="medium">
              {heroItem.subtitle} · {heroItem.meta}
            </ThemedText>
            <View style={styles.heroActions}>
              <PillButton label="Listen Now" onPress={heroItem.onPress} style={styles.heroButton} />
              <IconButton
                icon={heroSaved ? 'bookmark-added' : 'bookmark-add'}
                color={heroSaved ? Colors.primary : undefined}
                accessibilityLabel={heroSaved ? 'Saved' : 'Save'}
                onPress={handleSaveHero}
              />
              <IconButton
                icon="more-horiz"
                accessibilityLabel="More options"
                onPress={() => router.push({ pathname: '/sheets/options', params: { kind: heroItem.kind, id: heroItem.id } })}
              />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText variant="headline-md">{sectionTitle}</ThemedText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
            {items.map((item) => (
              <CoverCard
                key={item.id}
                layout="below"
                width={160}
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
    gap: Spacing.lg,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  heroCard: {
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
});
