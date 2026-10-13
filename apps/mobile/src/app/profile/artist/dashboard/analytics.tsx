import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ListenTrendChart } from '@/components/dashboard/listen-trend-chart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Badge, Chip, EmptyState, StatCard } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { getTrackAnalytics, type TimePeriod } from '@/lib/analytics-mock';
import { useDashboardStrings } from '@/state/dashboard-locale-store';
import { useArtistStore } from '@/state/artist-store';
import { DEMO_AGE_GROUPS, DEMO_GENDER, DEMO_TOP_CITIES, DEMO_TOP_COUNTRIES, getDemoAccountMetrics } from '@/mocks/demo-artist-account';
import type { DashboardStringKey } from '@/lib/dashboard-i18n';

const PERIOD_KEYS: { id: TimePeriod; key: DashboardStringKey }[] = [
  { id: '24h', key: 'period24h' },
  { id: '7d', key: 'period7d' },
  { id: '28d', key: 'period28d' },
  { id: 'all', key: 'periodAll' },
];

/** Artist Dashboard — Analytics tab (Stitch "midnight_mirage"). Mock data
 * only (src/lib/analytics-mock.ts) — clearly not real telemetry. */
export default function AnalyticsScreen() {
  const { t, locale } = useDashboardStrings();
  const entries = useArtistStore((s) => s.entries);
  const demoAccount = useArtistStore((s) => s.demoAccount);
  const published = useMemo(() => entries.filter((e) => e.status === 'published'), [entries]);
  const [rawTrackId, setRawTrackId] = useState(published[0]?.track.id);
  const trackId = published.some((e) => e.track.id === rawTrackId) ? rawTrackId : published[0]?.track.id;
  const [period, setPeriod] = useState<TimePeriod>('28d');

  if (published.length === 0) {
    return (
      <ThemedView surface="canvas" style={styles.flex}>
        <EmptyState icon="show-chart" title={t('analyticsEmptyTitle')} hint={t('analyticsEmptyHint')} />
      </ThemedView>
    );
  }

  // published.length > 0 guarantees trackId resolves to a real track id above.
  const activeTrackId = trackId as string;
  const track = published.find((e) => e.track.id === activeTrackId)?.track;
  const data = getTrackAnalytics(activeTrackId, period);
  const periodLabel = t(PERIOD_KEYS.find((p) => p.id === period)!.key);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.trackHeader}>
          <Artwork uri={track?.coverUri} size={56} radius={Radii.DEFAULT} />
          <View style={styles.trackText}>
            <ThemedText variant="label-sm" style={{ color: Colors.primary }}>
              {t('inRotation')}
            </ThemedText>
            <ThemedText variant="headline-md" numberOfLines={1}>
              {track?.title ?? t('selectTrack')}
            </ThemedText>
          </View>
          {/* Every figure on this tab is seeded mock data, never real telemetry. */}
          <Badge label={t('demoDataBadge')} />
        </View>

        {published.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {published.map((e) => (
              <Chip key={e.track.id} label={e.track.title} selected={e.track.id === activeTrackId} onPress={() => setRawTrackId(e.track.id)} />
            ))}
          </ScrollView>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {PERIOD_KEYS.map((p) => (
            <Chip key={p.id} label={t(p.key)} selected={p.id === period} onPress={() => setPeriod(p.id)} />
          ))}
        </ScrollView>

        <View style={styles.statsGrid}>
          <StatCard label={t('streams')} value={data.streams.toLocaleString('en-US')} style={styles.statTile} />
          <StatCard label={t('listeners')} value={data.listeners.toLocaleString('en-US')} style={styles.statTile} />
          <StatCard label={t('completion')} value={`${data.completionPct}%`} style={styles.statTile} />
          <StatCard label={t('inPlaylists')} value={data.playlistAdds.toLocaleString('en-US')} style={styles.statTile} />
        </View>

        <View style={styles.chartCard}>
          <ThemedText variant="label-sm" emphasis="medium" style={styles.sectionLabel}>
            {t('trendSection')}
          </ThemedText>
          <ThemedText variant="headline-sm">{t('listensOver')} {periodLabel.toLowerCase()}</ThemedText>
          <ListenTrendChart points={data.trend} peakLabel={`${t('peakLabel')} ${data.peak.toLocaleString('en-US')}`} />
          <View style={styles.chartFooter}>
            <ThemedText variant="body-sm" emphasis="medium">
              {t('averageListenTime')}
            </ThemedText>
            <ThemedText variant="body-sm">
              {Math.floor(data.avgListenSec / 60)}:{String(data.avgListenSec % 60).padStart(2, '0')} ({data.avgListenPct}%)
            </ThemedText>
          </View>
        </View>

        <View style={styles.chartCard}>
          <ThemedText variant="label-sm" emphasis="medium" style={styles.sectionLabel}>
            {t('audienceSection')}
          </ThemedText>
          <ThemedText variant="headline-sm">{t('listenerGeography')}</ThemedText>
          {data.geography.map((g) => (
            <View key={g.city.en} style={styles.barRow}>
              <ThemedText variant="body-sm">
                {g.city[locale]} <ThemedText variant="body-sm" emphasis="medium">{g.country[locale]}</ThemedText>
              </ThemedText>
              <ThemedText variant="label-lg">{g.pct}%</ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.chartCard}>
          <ThemedText variant="label-sm" emphasis="medium" style={styles.sectionLabel}>
            {t('channelsSection')}
          </ThemedText>
          <ThemedText variant="headline-sm">{t('discoverySources')}</ThemedText>
          <View style={styles.statsGrid}>
            {data.channels.map((c) => (
              <StatCard key={c.name.en} label={c.name[locale]} value={`${c.pct}%`} style={styles.statTile} />
            ))}
          </View>
        </View>

        {demoAccount && <AccountSections trackIds={published.map((e) => e.track.id)} titles={published.map((e) => e.track.title)} />}
      </ScrollView>
    </ThemedView>
  );
}

/** Account-level demo analytics (demo account only) — derived from the same
 * per-track seeded figures as the cards above, so every number reconciles. */
function AccountSections({ trackIds, titles }: { trackIds: string[]; titles: string[] }) {
  const { t, locale } = useDashboardStrings();
  const metrics = useMemo(() => getDemoAccountMetrics(trackIds), [trackIds]);
  const peak = Math.max(...metrics.growth.map((p) => p.value));
  return (
    <>
      <View style={styles.chartCard}>
        <ThemedText variant="label-sm" emphasis="medium" style={styles.sectionLabel}>{t('growthSection')}</ThemedText>
        <ThemedText variant="headline-sm">{t('listenerGrowth')}</ThemedText>
        <ListenTrendChart points={metrics.growth.map((p) => ({ label: p.label[locale], value: p.value }))} peakLabel={`${t('peakLabel')} ${peak.toLocaleString('en-US')}`} />
        <View style={styles.chartFooter}>
          <ThemedText variant="body-sm" emphasis="medium">{metrics.growth[0]!.label[locale]}</ThemedText>
          <ThemedText variant="body-sm">{metrics.monthlyListeners.toLocaleString('en-US')} {t('listenersWord')}</ThemedText>
        </View>
      </View>

      <View style={styles.chartCard}>
        <ThemedText variant="label-sm" emphasis="medium" style={styles.sectionLabel}>{t('demographicsSection')}</ThemedText>
        <ThemedText variant="headline-sm">{t('ageGroups')}</ThemedText>
        {DEMO_AGE_GROUPS.map((g) => (
          <PctBar key={g.label} label={g.label} pct={g.pct} />
        ))}
        <ThemedText variant="headline-sm" style={styles.subHead}>{t('genderLabel')}</ThemedText>
        {DEMO_GENDER.map((g) => (
          <PctBar key={g.label.en} label={g.label[locale]} pct={g.pct} />
        ))}
      </View>

      <View style={styles.chartCard}>
        <ThemedText variant="headline-sm">{t('topCountries')}</ThemedText>
        {DEMO_TOP_COUNTRIES.map((c) => (
          <PctBar key={c.name.en} label={c.name[locale]} pct={c.pct} />
        ))}
        <ThemedText variant="headline-sm" style={styles.subHead}>{t('topCities')}</ThemedText>
        {DEMO_TOP_CITIES.map((c) => (
          <PctBar key={c.name.en} label={c.name[locale]} pct={c.pct} />
        ))}
      </View>

      <View style={styles.chartCard}>
        <ThemedText variant="headline-sm">{t('trackPerformance')}</ThemedText>
        {trackIds.map((id, i) => (
          <View key={id} style={styles.barRow}>
            <ThemedText variant="body-sm" numberOfLines={1} style={styles.flexText}>{titles[i]}</ThemedText>
            <ThemedText variant="label-lg">{getTrackAnalytics(id, 'all').streams.toLocaleString('en-US')} {t('streamsWord')}</ThemedText>
          </View>
        ))}
      </View>
    </>
  );
}

function PctBar({ label, pct }: { label: string; pct: number }) {
  return (
    <View style={styles.pctRow}>
      <View style={styles.barRow}>
        <ThemedText variant="body-sm">{label}</ThemedText>
        <ThemedText variant="label-lg">{pct}%</ThemedText>
      </View>
      <View style={styles.pctTrack}>
        <View style={[styles.pctFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  subHead: { marginTop: Spacing.sm },
  flexText: { flex: 1, minWidth: 0, marginRight: Spacing.sm },
  pctRow: { gap: 4 },
  pctTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.surface.l3, overflow: 'hidden' },
  pctFill: { height: '100%', borderRadius: 3, backgroundColor: Colors.primary },
  content: { padding: Spacing.margin, gap: Spacing.lg, paddingBottom: Spacing.xl * 3 },
  trackHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  trackText: { flex: 1, minWidth: 0, gap: 2 },
  filterRow: { gap: Spacing.xs },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statTile: { flexBasis: '47%' },
  chartCard: { backgroundColor: Colors.surface.l1, borderRadius: Radii.lg, padding: Spacing.md, gap: Spacing.sm },
  sectionLabel: { letterSpacing: 1, textTransform: 'uppercase' },
  chartFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.surface.l3 },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
