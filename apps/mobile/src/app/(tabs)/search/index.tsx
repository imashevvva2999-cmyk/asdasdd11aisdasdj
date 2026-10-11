import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MmusicBrand } from '@/components/mmusic-brand';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CoverCard, FeaturedBanner, Icon, IconButton, RankedTile, RemovableChip, TextField, TextLinkButton } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useContentWidth } from '@/hooks/use-content-width';
import { useTabEntrance } from '@/hooks/use-tab-entrance';
import { useToast } from '@/hooks/use-toast';
import { notificationsUnreadLabel } from '@/lib/i18n';
import { featuredGenre, genres, initialRecentSearches, trendingSearches } from '@/mocks';
import { useAppStrings } from '@/state/locale-store';
import { countUnread, useNotificationsStore } from '@/state/notifications-store';

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
  const { locale, t } = useAppStrings();
  const entrance = useTabEntrance('search');
  const unreadCount = useNotificationsStore((st) => countUnread(st.items));
  const openResults = (query?: string) =>
    router.push(query ? { pathname: '/search/results', params: { q: query } } : '/search/results');

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.headerRow}>
          <MmusicBrand />
          <View style={styles.headerActions}>
            <View>
              <IconButton
                icon={unreadCount > 0 ? 'notifications-active' : 'notifications'}
                accessibilityLabel={unreadCount > 0 ? notificationsUnreadLabel(locale, unreadCount) : t('notificationsLabel')}
                onPress={() => router.push('/sheets/notifications')}
                size={40}
              />
              {unreadCount > 0 && <View style={styles.unreadDot} pointerEvents="none" />}
            </View>
          </View>
        </View>
      </SafeAreaView>

      <Animated.View style={[styles.flex, entrance.style]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField
          variant="search"
          placeholder={t('searchPlaceholder')}
          leftAccessory={<Icon name="search" color={Colors.text.medium} />}
          rightAccessory={
            <IconButton
              icon="mic"
              size={36}
              color={Colors.text.medium}
              accessibilityLabel={t('voiceSearchLabel')}
              onPress={() => showToast(t('voiceSearchComingSoon'), 'mic')}
            />
          }
          onFocus={() => openResults()}
        />

        {recentSearches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText variant="label-sm" emphasis="medium" style={styles.eyebrow}>
                {t('recentSearches').toUpperCase()}
              </ThemedText>
              <TextLinkButton label={t('clearAll')} tone="muted" onPress={() => setRecentSearches([])} />
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
            <ThemedText variant="headline-sm">{t('trendingSearches')}</ThemedText>
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
            {t('browseAll')}
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
      </Animated.View>
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
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: Colors.surface.l2,
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
