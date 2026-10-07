import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CoverCard, FeaturedBanner, Icon, IconButton, RankedTile, RemovableChip, TextField, TextLinkButton } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { featuredGenre, genres, initialRecentSearches, trendingSearches } from '@/mocks';

/** S-03 Search / Explore — tab root (docs/screens.md §3.2). */
export default function SearchScreen() {
  const [recentSearches, setRecentSearches] = useState(initialRecentSearches);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <ThemedText variant="headline-md">Mmusic</ThemedText>
            <Icon name="graphic-eq" size={16} color={Colors.primary} />
          </View>
          <View style={styles.headerActions}>
            <IconButton icon="cast" accessibilityLabel="Cast" onPress={() => {}} size={36} />
            <IconButton icon="notifications" accessibilityLabel="Notifications" onPress={() => {}} size={36} />
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField
          placeholder="What do you want to listen to?"
          leftAccessory={<Icon name="search" color={Colors.text.medium} />}
          rightAccessory={<Icon name="mic" color={Colors.text.medium} />}
          onFocus={() => router.push('/search/results')}
        />

        {recentSearches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText variant="label-sm" emphasis="medium" style={styles.eyebrow}>
                RECENT SEARCHES
              </ThemedText>
              <TextLinkButton label="Clear all" onPress={() => setRecentSearches([])} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {recentSearches.map((query) => (
                <RemovableChip
                  key={query}
                  label={query}
                  onPress={() => router.push('/search/results')}
                  onRemove={() => setRecentSearches((prev) => prev.filter((q) => q !== query))}
                />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <ThemedText variant="label-sm" emphasis="medium" style={styles.eyebrow}>
            TRENDING SEARCHES
          </ThemedText>
          <View style={styles.trendingGrid}>
            {trendingSearches.map((item, index) => (
              <RankedTile
                key={item.query}
                rank={index + 1}
                title={item.query}
                subtitle={item.meta}
                onPress={() => router.push('/search/results')}
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
            height={144}
            onPress={() => router.push({ pathname: '/search/genre/[id]', params: { id: featuredGenre.id } })}
          />
        </View>

        <View style={styles.genreGrid}>
          {genres.map((genre) => (
            <CoverCard
              key={genre.id}
              layout="overlay"
              width={168}
              height={84}
              title={genre.title}
              onPress={() => router.push({ pathname: '/search/genre/[id]', params: { id: genre.id } })}
              style={styles.genreItem}
            />
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
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
    paddingBottom: Spacing.xl * 3,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.margin,
  },
  genreItem: {
    flexGrow: 1,
  },
});
