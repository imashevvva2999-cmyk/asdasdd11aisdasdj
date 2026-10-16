import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ListenTrendChart } from '@/components/dashboard/listen-trend-chart';
import { ThemedText } from '@/components/themed-text';
import { Artwork, Chip, StatCard } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { DEMO_PERIODS, buildDemoArtistAnalytics, type DemoPeriod, type DemoShare } from '@/demo/demo-analytics';
import { useDemoStrings } from '@/demo/demo-strings';
import { useArtistStore } from '@/state/artist-store';
import { useCampaignStore } from '@/state/campaign-store';

/** Thin horizontal share bar — same row shape as the per-track geography list. */
function ShareRow({ label, pct, count, fmt, color = Colors.primary }: { label: string; pct: number; count: number; fmt: (n: number) => string; color?: string }) {
  return (
    <View style={styles.shareRow}>
      <View style={styles.shareHead}>
        <ThemedText variant="body-sm" style={styles.flexText} numberOfLines={1}>
          {label}
        </ThemedText>
        <ThemedText variant="label-lg">
          {pct.toFixed(pct % 1 === 0 ? 0 : 1)}% <ThemedText variant="body-sm" emphasis="medium">({fmt(count)})</ThemedText>
        </ThemedText>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

/**
 * Demo Artist Account — artist-level DEMO analytics shown above the existing
 * per-track Analytics (src/demo/demo-analytics.ts). Only rendered for the demo
 * account; every figure is labelled as simulated.
 */
export function DemoArtistAnalytics() {
  const { d, locale } = useDemoStrings();
  const entries = useArtistStore((s) => s.entries);
  const launched = useCampaignStore((s) => s.launched);
  const [period, setPeriod] = useState<DemoPeriod>('30d');
  const data = useMemo(() => buildDemoArtistAnalytics(entries, period, launched), [entries, period, launched]);
  const fmt = (n: number) => n.toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US');
  const periodLabel: Record<DemoPeriod, string> = { '7d': d.an7d, '30d': d.an30d, '90d': d.an90d };
  const geoGroup = (region: 'kg' | 'abroad') => data.geography.filter((g) => g.region === region);
  const groupPct = (rows: DemoShare[]) => rows.reduce((s, g) => s + g.pct, 0);
  const historyMax = Math.max(1, ...data.history.map((h) => h.streams));

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <ThemedText variant="headline-md">{d.anTitle}</ThemedText>
        <View style={styles.demoBadge}>
          <ThemedText variant="label-sm" style={{ color: Colors.secondary }}>
            {d.anBadge}
          </ThemedText>
        </View>
      </View>
      <ThemedText variant="body-sm" emphasis="medium">
        {d.anNote}
      </ThemedText>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {DEMO_PERIODS.map((p) => (
          <Chip key={p} label={periodLabel[p]} selected={p === period} onPress={() => setPeriod(p)} />
        ))}
      </ScrollView>

      <View style={styles.statsGrid}>
        <StatCard label={d.anStreams} value={fmt(data.streams)} style={styles.statTile} />
        <StatCard label={d.anListeners} value={fmt(data.listeners)} style={styles.statTile} />
        <StatCard label={d.anSaveRate} value={`${data.saveRatePct}%`} style={styles.statTile} />
        <StatCard label={d.anEngagement} value={`${data.engagementPct}%`} style={styles.statTile} />
      </View>

      <View style={styles.card}>
        <ThemedText variant="label-sm" emphasis="medium" style={styles.cardLabel}>
          {d.anAttributed}
        </ThemedText>
        <ThemedText variant="headline-md">{fmt(data.attributedStreams)}</ThemedText>
        <ThemedText variant="body-sm" emphasis="medium">
          {data.attributedPct}% {d.anAttributedHint}
        </ThemedText>
      </View>

      <View style={styles.card}>
        <ThemedText variant="headline-sm">
          {d.anTrend} • {periodLabel[period].toLowerCase()}
        </ThemedText>
        <ListenTrendChart points={data.trend} peakLabel={`${d.anPeak} ${fmt(data.peak)}`} />
      </View>

      <View style={styles.card}>
        <ThemedText variant="headline-sm">{d.anAges}</ThemedText>
        {data.ages.map((a) => (
          <ShareRow key={a.label.en} label={a.label[locale]} pct={a.pct} count={a.count} fmt={fmt} />
        ))}
      </View>

      <View style={styles.card}>
        <ThemedText variant="headline-sm">{d.anGeo}</ThemedText>
        {(['kg', 'abroad'] as const).map((region) => (
          <View key={region} style={styles.group}>
            <ThemedText variant="label-sm" emphasis="medium" style={styles.cardLabel}>
              {region === 'kg' ? d.anKg : d.anAbroad} • {groupPct(geoGroup(region))}%
            </ThemedText>
            {geoGroup(region).map((g) => (
              <ShareRow key={g.label.en} label={g.label[locale]} pct={g.pct} count={g.count} fmt={fmt} color={region === 'kg' ? Colors.primary : Colors.secondary} />
            ))}
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <ThemedText variant="headline-sm">{d.anSources}</ThemedText>
        {data.sources.map((s, i) => (
          <ShareRow key={s.label.en} label={s.label[locale]} pct={s.pct} count={s.count} fmt={fmt} color={i === data.sources.length - 1 ? Colors.secondary : Colors.tertiary} />
        ))}
      </View>

      <View style={styles.card}>
        <ThemedText variant="headline-sm">{d.anTop}</ThemedText>
        {data.topTracks.map((t, i) => (
          <View key={t.trackId} style={styles.topRow}>
            <ThemedText variant="label-lg" emphasis="medium" style={styles.rank}>
              {i + 1}
            </ThemedText>
            <Artwork uri={t.coverUri} size={40} radius={Radii.DEFAULT} />
            <View style={styles.flexText}>
              <ThemedText variant="label-lg" numberOfLines={1}>
                {t.title}
              </ThemedText>
              <ThemedText variant="body-sm" emphasis="medium">
                {fmt(t.streams)} • {t.sharePct}%
              </ThemedText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <ThemedText variant="headline-sm">{d.anHistory}</ThemedText>
        <View style={styles.historyChart}>
          {data.history.map((h) => (
            <View key={h.label.en} style={styles.historyCol}>
              <ThemedText variant="body-sm" emphasis="medium" numberOfLines={1}>
                {fmt(Math.round(h.streams / 1000))}K
              </ThemedText>
              <View style={styles.historyTrack}>
                <View style={[styles.historyFill, { height: `${(h.streams / historyMax) * 100}%` }]} />
              </View>
              <ThemedText variant="label-sm" emphasis="medium">
                {h.label[locale]}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>

      <ThemedText variant="headline-md" style={styles.byTrack}>
        {d.anByTrack}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  demoBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radii.full, backgroundColor: 'rgba(245, 166, 35, 0.14)' },
  filterRow: { gap: Spacing.xs },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statTile: { flexBasis: '47%' },
  card: { backgroundColor: Colors.surface.l1, borderRadius: Radii.lg, padding: Spacing.md, gap: Spacing.sm },
  cardLabel: { letterSpacing: 1, textTransform: 'uppercase' },
  group: { gap: Spacing.sm, marginTop: Spacing.xs },
  shareRow: { gap: 4 },
  shareHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  flexText: { flex: 1, minWidth: 0 },
  barTrack: { height: 4, borderRadius: 2, backgroundColor: Colors.surface.l3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rank: { width: 18, textAlign: 'center' },
  historyChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: Spacing.xs, height: 150 },
  historyCol: { flex: 1, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' },
  historyTrack: { width: '60%', flex: 1, justifyContent: 'flex-end', borderRadius: 4, backgroundColor: Colors.surface.l3, overflow: 'hidden' },
  historyFill: { width: '100%', borderRadius: 4, backgroundColor: Colors.primary },
  byTrack: { marginTop: Spacing.sm },
});
