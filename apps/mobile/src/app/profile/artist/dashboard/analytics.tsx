import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ListenTrendChart } from '@/components/dashboard/listen-trend-chart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Chip, StatCard } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { getTrackAnalytics, type TimePeriod } from '@/lib/analytics-mock';
import { useDashboardStrings } from '@/state/dashboard-locale-store';
import { useArtistStore } from '@/state/artist-store';
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
  const { t } = useDashboardStrings();
  const entries = useArtistStore((s) => s.entries);
  const published = useMemo(() => entries.filter((e) => e.status === 'published'), [entries]);
  const [trackId, setTrackId] = useState(published[0]?.track.id ?? 'midnight-mirage');
  const [period, setPeriod] = useState<TimePeriod>('28d');

  const track = published.find((e) => e.track.id === trackId)?.track;
  const data = getTrackAnalytics(trackId, period);
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
        </View>

        {published.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {published.map((e) => (
              <Chip key={e.track.id} label={e.track.title} selected={e.track.id === trackId} onPress={() => setTrackId(e.track.id)} />
            ))}
          </ScrollView>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {PERIOD_KEYS.map((p) => (
            <Chip key={p.id} label={t(p.key)} selected={p.id === period} onPress={() => setPeriod(p.id)} />
          ))}
        </ScrollView>

        <View style={styles.statsGrid}>
          <StatCard label={t('streams')} value={data.streams.toLocaleString('en-US')} />
          <StatCard label={t('listeners')} value={data.listeners.toLocaleString('en-US')} />
          <StatCard label={t('completion')} value={`${data.completionPct}%`} />
          <StatCard label={t('inPlaylists')} value={data.playlistAdds.toLocaleString('en-US')} />
        </View>

        <View style={styles.chartCard}>
          <ThemedText variant="label-sm" emphasis="medium" style={styles.sectionLabel}>
            {t('trendSection')}
          </ThemedText>
          <ThemedText variant="headline-sm">{t('listensOver')} {periodLabel.toLowerCase()}</ThemedText>
          <ListenTrendChart points={data.trend} peakLabel={data.peak.toLocaleString('en-US')} />
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
            <View key={g.city} style={styles.barRow}>
              <ThemedText variant="body-sm">
                {g.city} <ThemedText variant="body-sm" emphasis="medium">{g.country}</ThemedText>
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
              <StatCard key={c.name} label={c.name} value={`${c.pct}%`} />
            ))}
          </View>
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
  chartCard: { backgroundColor: Colors.surface.l1, borderRadius: Radii.lg, padding: Spacing.md, gap: Spacing.sm },
  sectionLabel: { letterSpacing: 1, textTransform: 'uppercase' },
  chartFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.surface.l3 },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
