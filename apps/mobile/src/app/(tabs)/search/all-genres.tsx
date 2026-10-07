import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip, CoverCard, FeaturedBanner } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useContentWidth } from '@/hooks/use-content-width';
import { featuredGenre, genres } from '@/mocks';

const FILTERS = ['All', 'Genres', 'Moods & Activities', 'Regional & Heritage'] as const;

/** S-06 All Genres & Moods hub (docs/screens.md §3.2). */
export default function AllGenresScreen() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const windowWidth = useContentWidth();
  const tileWidth = Math.floor((windowWidth - Spacing.margin * 2 - Spacing.sm) / 2);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleBlock}>
          <ThemedText variant="display-lg-mobile">All Genres &amp; Moods</ThemedText>
          <ThemedText variant="body-md" emphasis="medium">
            Explore 24+ sonic realms &amp; curated cultures
          </ThemedText>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((item) => (
            <Chip key={item} label={item} selected={item === filter} onPress={() => setFilter(item)} />
          ))}
        </ScrollView>

        <FeaturedBanner
          title={featuredGenre.title}
          subtitle={featuredGenre.subtitle}
          coverUri={featuredGenre.coverUri}
          height={220}
          onPress={() => router.push({ pathname: '/search/genre/[id]', params: { id: featuredGenre.id } })}
        />

        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitle}>
            <ThemedText variant="headline-md">Curated Realms</ThemedText>
            <View style={styles.countPill}>
              <ThemedText variant="mono-num" emphasis="medium">
                {genres.length}
              </ThemedText>
            </View>
          </View>
          <ThemedText variant="label-sm" emphasis="medium" style={styles.upperLabel}>
            Tap to dive
          </ThemedText>
        </View>
        {/* Explicit rows with a computed tile width: flexGrow wrapping left
            uneven gutters on RN-web. */}
        <View style={styles.grid}>
          {chunkPairs(genres).map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((genre) => (
                <CoverCard
                  key={genre.id}
                  layout="overlay"
                  width={tileWidth}
                  height={160}
                  coverUri={genre.coverUri}
                  number={genre.number}
                  title={genre.title}
                  onPress={() => router.push({ pathname: '/search/genre/[id]', params: { id: genre.id } })}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function chunkPairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.margin,
    gap: Spacing.lg,
    paddingBottom: Spacing.xl * 3,
  },
  titleBlock: {
    gap: Spacing.xs,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  countPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface.l2,
  },
  upperLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  filterRow: {
    gap: Spacing.sm,
  },
  sectionHeaderRow: {
    marginTop: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grid: {
    gap: Spacing.sm,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
