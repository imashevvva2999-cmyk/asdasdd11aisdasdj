import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ArtistOverviewAnalytics, NoData } from '@/components/dashboard/demo-artist-analytics';
import { ListenTrendChart } from '@/components/dashboard/listen-trend-chart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Chip, EmptyState, StatCard } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { getTrackAnalytics, type TimePeriod } from '@/lib/analytics-mock';
import { useDashboardStrings } from '@/state/dashboard-locale-store';
import { useArtistStore } from '@/state/artist-store';
import { useIsDemoArtist } from '@/state/demo-session-store';
import { useDemoStrings } from '@/demo/demo-strings';
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
  const published = useMemo(() => entries.filter((e) => e.status === 'published'), [entries]);
  const [rawTrackId, setRawTrackId] = useState(published[0]?.track.id);
  const trackId = published.some((e) => e.track.id === rawTrackId) ? rawTrackId : published[0]?.track.id;
  const [period, setPeriod] = useState<TimePeriod>('28d');
  const demo = useIsDemoArtist();
  const { d } = useDemoStrings();

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
  // Simulated per-track figures only for the labelled demo account; regular
  // artists have no telemetry yet, so they see "—" and empty states.
  const data = demo ? getTrackAnalytics(activeTrackId, period) : undefined;
  const noData = <NoData text={d.anNoData} hint={d.anNoDataHint} />;
  const periodLabel = t(PERIOD_KEYS.find((p) => p.id === period)!.key);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* One Analytics layout for every artist; demo vs own data inside. */}
        <ArtistOverviewAnalytics demo={demo} />
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
          <StatCard label={t('streams')} value={data ? data.streams.toLocaleString('en-US') : '—'} style={styles.statTile} />
          <StatCard label={t('listeners')} value={data ? data.listeners.toLocaleString('en-US') : '—'} style={styles.statTile} />
          <StatCard label={t('completion')} value={data ? `${data.completionPct}%` : '—'} style={styles.statTile} />
          <StatCard label={t('inPlaylists')} value={data ? data.playlistAdds.toLocaleString('en-US') : '—'} style={styles.statTile} />
        </View>

        <View style={styles.chartCard}>
          <ThemedText variant="label-sm" emphasis="medium" style={styles.sectionLabel}>
            {t('trendSection')}
          </ThemedText>
          <ThemedText variant="headline-sm">{t('listensOver')} {periodLabel.toLowerCase()}</ThemedText>
          {data ? <ListenTrendChart points={data.trend} peakLabel={`${t('peakLabel')} ${data.peak.toLocaleString('en-US')}`} /> : noData}
          <View style={styles.chartFooter}>
            <ThemedText variant="body-sm" emphasis="medium">
              {t('averageListenTime')}
            </ThemedText>
            <ThemedText variant="body-sm">
              {data ? `${Math.floor(data.avgListenSec / 60)}:${String(data.avgListenSec % 60).padStart(2, '0')} (${data.avgListenPct}%)` : '—'}
            </ThemedText>
          </View>
        </View>

        <View style={styles.chartCard}>
          <ThemedText variant="label-sm" emphasis="medium" style={styles.sectionLabel}>
            {t('audienceSection')}
          </ThemedText>
          <ThemedText variant="headline-sm">{t('listenerGeography')}</ThemedText>
          {!data && noData}
          {data?.geography.map((g) => (
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
          {data ? (
            <View style={styles.statsGrid}>
              {data.channels.map((c) => (
                <StatCard key={c.name.en} label={c.name[locale]} value={`${c.pct}%`} style={styles.statTile} />
              ))}
            </View>
          ) : (
            noData
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
