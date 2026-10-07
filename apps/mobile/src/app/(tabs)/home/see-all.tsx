import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip, CoverCard, IconButton, PillButton } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { albums } from '@/mocks';

const FILTERS = ['This Week', 'Top Charts', 'Albums', 'Singles'] as const;

/** S-02 See All (New Releases / Trending) — docs/screens.md §3.1. */
export default function SeeAllScreen() {
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>('This Week');
  const heroAlbum = albums[0];
  const freshFinds = albums.slice(1);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.filterRow}>
          {FILTERS.map((filter) => (
            <Chip key={filter} label={filter} selected={filter === activeFilter} onPress={() => setActiveFilter(filter)} />
          ))}
        </View>

        <View style={styles.heroCard}>
          <ThemedText variant="headline-lg" numberOfLines={2}>
            {heroAlbum.title}
          </ThemedText>
          <ThemedText variant="body-md" emphasis="medium">
            {heroAlbum.artistName} · {heroAlbum.trackCount} tracks
          </ThemedText>
          <View style={styles.heroActions}>
            <PillButton
              label="Listen Now"
              onPress={() => router.push({ pathname: '/album/[id]', params: { id: heroAlbum.id } })}
              style={styles.heroButton}
            />
            <IconButton icon="bookmark-add" accessibilityLabel="Save" onPress={() => {}} />
            <IconButton icon="more-horiz" accessibilityLabel="More options" onPress={() => {}} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText variant="headline-md">Fresh Finds</ThemedText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
            {freshFinds.map((album) => (
              <CoverCard
                key={album.id}
                layout="below"
                width={160}
                coverUri={album.coverUri}
                title={album.title}
                subtitle={album.artistName}
                onPress={() => router.push({ pathname: '/album/[id]', params: { id: album.id } })}
              />
            ))}
          </ScrollView>
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
