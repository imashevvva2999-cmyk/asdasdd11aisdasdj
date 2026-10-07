import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip, CoverCard, FeaturedBanner } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { featuredGenre, genres } from '@/mocks';

const FILTERS = ['All', 'Genres', 'Moods & Activities', 'Regional & Heritage'] as const;

/** S-06 All Genres & Moods hub (docs/screens.md §3.2). */
export default function AllGenresScreen() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleBlock}>
          <ThemedText variant="display-lg-mobile">Explore 24+ sonic realms</ThemedText>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((item) => (
            <Chip key={item} label={item} selected={item === filter} onPress={() => setFilter(item)} />
          ))}
        </ScrollView>

        <FeaturedBanner
          title={featuredGenre.title}
          subtitle={featuredGenre.subtitle}
          height={144}
          onPress={() => router.push({ pathname: '/search/genre/[id]', params: { id: featuredGenre.id } })}
        />

        <View style={styles.sectionHeaderRow}>
          <ThemedText variant="headline-md">Curated Realms ({genres.length})</ThemedText>
        </View>
        <View style={styles.grid}>
          {genres.map((genre) => (
            <CoverCard
              key={genre.id}
              layout="overlay"
              width={168}
              height={128}
              number={genre.number}
              title={genre.title}
              onPress={() => router.push({ pathname: '/search/genre/[id]', params: { id: genre.id } })}
              style={styles.gridItem}
            />
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
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
  filterRow: {
    gap: Spacing.sm,
  },
  sectionHeaderRow: {
    marginTop: Spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  gridItem: {
    flexGrow: 1,
  },
});
