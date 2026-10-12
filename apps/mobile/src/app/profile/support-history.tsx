import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DemoNotice } from '@/components/demo-notice';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Chip, EmptyState, Icon, PressableScale } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useHydrated } from '@/hooks/use-hydrated';
import { formatKgsAmount } from '@/lib/format-currency';
import type { AppStringKey } from '@/lib/i18n';
import { groupSupportHistory, supportDateLabel, type SupportDateMode } from '@/lib/support-dates';
import { getArtistById, type SupportHistoryEntry } from '@/mocks';
import { useAppStrings } from '@/state/locale-store';
import { useSupportStore } from '@/state/support-store';

const FILTERS = ['All', 'This Month'] as const;
type FilterKey = (typeof FILTERS)[number];

/** Internal filter VALUES stay fixed English strings; only the label is localized. */
const FILTER_LABEL_KEYS: Record<FilterKey, AppStringKey> = {
  All: 'filterAll',
  'This Month': 'filterThisMonthLabel',
};

/**
 * S-22 Support History (docs/screens.md §3.12). Local/mock donation history
 * only — no real transaction retrieval. The "Zero Platform Fees • 100% to
 * Artists" / "MBANK Instant Settlement Secured" banner from the Stitch
 * design is intentionally omitted: OQ-10 (donation commission/business
 * model) is unresolved, and docs/open-questions.md explicitly notes that
 * copy is mockup text, not a confirmed business model.
 */
export default function SupportHistoryScreen() {
  const history = useSupportStore((s) => s.history);
  const [filter, setFilter] = useState<FilterKey>('All');
  const { t, locale } = useAppStrings();

  const visibleHistory = useMemo(() => {
    if (filter === 'All') return history;
    const now = new Date();
    return history.filter((entry) => {
      const date = new Date(entry.createdAt);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    });
  }, [history, filter]);

  const totalSupported = history.reduce((sum, entry) => sum + entry.amount, 0);
  const distinctArtistCount = new Set(history.map((entry) => entry.artistId)).size;
  // The static HTML and the first browser render share one fixed date form
  // (UTC, months only); after hydration: the visitor's time zone, Today / Last Week.
  const hydrated = useHydrated();
  const dateMode: SupportDateMode = hydrated ? { kind: 'live', now: new Date() } : { kind: 'static' };
  const grouped = groupSupportHistory(visibleHistory, dateMode, locale);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <ThemedText variant="mono-num" emphasis="medium" style={styles.upperLabel}>
            {t('totalSupportedLabel')}
          </ThemedText>
          <View style={styles.totalRow}>
            <ThemedText variant="display-lg">{formatKgsAmount(totalSupported)}</ThemedText>
            <ThemedText variant="headline-sm" emphasis="medium">
              сом
            </ThemedText>
          </View>
          <ThemedText variant="body-md" emphasis="medium">
            {t('directPatronageToPrefix')} {distinctArtistCount} {distinctArtistCount === 1 ? t('creatorSingular') : t('creatorPlural')}
          </ThemedText>
          <DemoNotice text={t('demoHistoryLabel')} style={styles.demoNotice} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((item) => (
            <Chip key={item} label={t(FILTER_LABEL_KEYS[item])} selected={item === filter} onPress={() => setFilter(item)} />
          ))}
        </ScrollView>

        {visibleHistory.length === 0 ? (
          <EmptyState
            icon="volunteer-activism"
            title={t('noSupportHistoryTitle')}
            hint={t('noSupportHistoryHint')}
          />
        ) : (
          grouped.map(([period, entries]) => (
            <View key={period} style={styles.group}>
              <View style={styles.groupHeader}>
                <ThemedText variant="label-md" emphasis="medium" style={styles.groupTitle}>
                  {period}
                </ThemedText>
                <ThemedText variant="label-md" emphasis="medium">
                  {entries.length} {entries.length === 1 ? t('grantSingular') : t('grantPlural')}
                </ThemedText>
              </View>
              <View style={styles.entries}>
                {entries.map((entry) => (
                  <SupportHistoryRow key={entry.id} entry={entry} dateMode={dateMode} />
                ))}
              </View>
            </View>
          ))
        )}

        <View style={styles.footerCard}>
          <View style={styles.footerIcon}>
            <Icon name="account-balance" size={20} color={Colors.text.high} />
          </View>
          <ThemedText variant="label-lg">{t('mbankDirectCreatorNetworkLabel')}</ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function SupportHistoryRow({ entry, dateMode }: { entry: SupportHistoryEntry; dateMode: SupportDateMode }) {
  const artist = getArtistById(entry.artistId);
  const { t, locale } = useAppStrings();

  return (
    <PressableScale
      accessibilityRole={artist ? 'button' : undefined}
      disabled={!artist}
      onPress={artist ? () => router.push({ pathname: '/artist/[id]', params: { id: artist.id } }) : undefined}
      style={styles.row}
    >
      <View style={styles.rowTop}>
        <Artwork shape="circle" size={48} radius={24} uri={artist?.photoUri} placeholderIcon="person" />
        <View style={styles.rowText}>
          <ThemedText variant="headline-sm" numberOfLines={1}>
            {artist?.name ?? t('unknownArtistLabel')}
          </ThemedText>
          <ThemedText variant="body-sm" emphasis="medium">
            {t('directFanPatronageLabel')}
          </ThemedText>
        </View>
        {artist && <Icon name="chevron-right" color={Colors.text.medium} />}
      </View>
      <View style={styles.rowFooter}>
        <View style={styles.statusDot} />
        <ThemedText variant="label-md" style={styles.rowFooterText}>
          {formatKgsAmount(entry.amount)} сом • {t('completedStatusLabel')}
        </ThemedText>
        <ThemedText variant="label-md" emphasis="medium">
          {supportDateLabel(entry.createdAt, dateMode, locale)}
        </ThemedText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  demoNotice: {
    justifyContent: 'flex-start',
    marginTop: Spacing.sm,
  },
  content: {
    padding: Spacing.margin,
    gap: Spacing.lg,
    paddingBottom: Spacing.xl * 3,
  },
  heroCard: {
    gap: 4,
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surface.l1,
  },
  upperLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  filterRow: {
    gap: Spacing.xs,
  },
  group: {
    gap: Spacing.sm,
  },
  groupTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  entries: {
    gap: Spacing.sm,
  },
  row: {
    backgroundColor: Colors.surface.l1,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.secondary,
  },
  rowFooterText: {
    flex: 1,
  },
  footerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surface.l1,
    marginTop: Spacing.sm,
  },
  footerIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
