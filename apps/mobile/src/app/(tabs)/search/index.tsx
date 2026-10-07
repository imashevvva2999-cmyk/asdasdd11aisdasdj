import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CoverCard, FeaturedBanner, Icon, IconButton, RankedTile, RemovableChip, TextField, TextLinkButton } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useContentWidth } from '@/hooks/use-content-width';
import { useToast } from '@/hooks/use-toast';
import { featuredGenre, genres, initialRecentSearches, trendingSearches } from '@/mocks';

/** S-03 Search / Explore — tab root (docs/screens.md §3.2). */
export default function SearchScreen() {
  const [recentSearches, setRecentSearches] = useState(initialRecentSearches);
  const windowWidth = useContentWidth();
  const genreTileWidth = Math.floor((windowWidth - Spacing.margin * 2 - Spacing.md) / 2);
  // Explicit 2-per-row chunking instead of `flexWrap: 'wrap'`: react-native-web's
  // flex-gap polyfill does not reliably wrap fixed-width flex items here (every
  // tile rendered at the same x position stacked vertically) — Фаза 4 visual QA
  // pass finding, verified directly in Chrome DevTools.
  const genreRows = chunkPairs(genres);
  const { showToast, toast } = useToast();
  const openResults = (query?: string) =>
    router.push(query ? { pathname: '/search/results', params: { q: query } } : '/search/results');

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <ThemedText variant="headline-md">Mmusic</ThemedText>
            <Icon name="graphic-eq" size={16} color={Colors.primary} />
          </View>
          <View style={styles.headerActions}>
            <IconButton
              icon="cast"
              accessibilityLabel="Cast"
              onPress={() => showToast("Casting to other devices isn't available yet", 'cast')}
              size={36}
            />
            <IconButton
              icon="notifications"
              accessibilityLabel="Notifications"
              onPress={() => showToast("Notifications aren't available yet", 'notifications')}
              size={36}
            />
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField
          variant="search"
          placeholder="What do you want to listen to?"
          leftAccessory={<Icon name="search" color={Colors.text.medium} />}
          rightAccessory={
            <IconButton
              icon="mic"
              size={32}
              color={Colors.text.medium}
              accessibilityLabel="Voice search"
              onPress={() => showToast("Voice search isn't available yet", 'mic')}
            />
          }
          onFocus={() => openResults()}
        />

        {recentSearches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText variant="label-sm" emphasis="medium" style={styles.eyebrow}>
                RECENT SEARCHES
              </ThemedText>
              <TextLinkButton label="Clear all" tone="muted" onPress={() => setRecentSearches([])} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {recentSearches.map((query) => (
                <RemovableChip
                  key={query}
                  label={query}
                  onPress={() => openResults(query)}
                  onRemove={() => setRecentSearches((prev) => prev.filter((q) => q !== query))}
                />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.trendingTitleRow}>
            <Icon name="north-east" size={18} color={Colors.primary} />
            <ThemedText variant="headline-sm">Trending Searches</ThemedText>
          </View>
          <View style={styles.trendingGrid}>
            {trendingSearches.map((item, index) => (
              <RankedTile
                key={item.query}
                rank={index + 1}
                title={item.query}
                subtitle={item.meta}
                onPress={() => openResults(item.query)}
                style={styles.trendingItem}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText variant="headline-md" style={styles.browseTitle}>
            Browse All
          </ThemedText>
          <FeaturedBanner
            title={featuredGenre.title}
            subtitle={featuredGenre.subtitle}
            coverUri={featuredGenre.coverUri}
            height={144}
            onPress={() => router.push({ pathname: '/search/genre/[id]', params: { id: featuredGenre.id } })}
          />
        </View>

        <View style={styles.genreGrid}>
          {genreRows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.genreRow}>
              {row.map((genre) => (
                <CoverCard
                  key={genre.id}
                  layout="overlay"
                  width={genreTileWidth}
                  height={96}
                  coverUri={genre.coverUri}
                  title={genre.title}
                  onPress={() => router.push({ pathname: '/search/genre/[id]', params: { id: genre.id } })}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      {toast}
    </ThemedView>
  );
}

function chunkPairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return rows;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerSafeArea: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerRow: {
    height: 56,
    paddingHorizontal: Spacing.margin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  content: {
    padding: Spacing.margin,
    gap: Spacing.lg,
    paddingBottom: Spacing.miniPlayerClearance,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trendingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  eyebrow: {
    letterSpacing: 1,
  },
  chipRow: {
    gap: Spacing.sm,
  },
  trendingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  trendingItem: {
    minWidth: '47%',
  },
  browseTitle: {
    marginBottom: Spacing.xs,
  },
  genreGrid: {
    gap: Spacing.md,
  },
  genreRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
});
