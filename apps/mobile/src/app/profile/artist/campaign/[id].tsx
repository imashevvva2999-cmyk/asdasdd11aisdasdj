import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ListenTrendChart } from '@/components/dashboard/listen-trend-chart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Badge, Chip, EmptyState, PillButton, StatCard, TextLinkButton } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { getCampaignAnalytics, type CampaignPeriod } from '@/lib/campaign-analytics-mock';
import type { DashboardStringKey } from '@/lib/dashboard-i18n';
import { formatKgsAmount } from '@/lib/format-currency';
import type { PromoGoal } from '@/lib/promotion';
import { useArtistStore } from '@/state/artist-store';
import { useDashboardStrings } from '@/state/dashboard-locale-store';

const GOAL_LABEL: Record<PromoGoal, DashboardStringKey> = { streams: 'goalStreams', followers: 'goalFollowers', playlists: 'goalPlaylists' };

const PERIOD_KEYS: { id: CampaignPeriod; key: DashboardStringKey }[] = [
  { id: '7d', key: 'period7d' },
  { id: '14d', key: 'period14d' },
  { id: '30d', key: 'period30d' },
  { id: 'lifetime', key: 'periodLifetime' },
];

/** Artist Dashboard — Campaign Details (Promotion → tap a campaign). Every
 * performance figure is deterministic mock data derived from the campaign's
 * own stored fields (lib/campaign-analytics-mock.ts) — never real ad
 * delivery, never a real MBANK charge beyond the campaign's original
 * simulated payment. */
export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useDashboardStrings();
  const campaigns = useArtistStore((s) => s.campaigns);
  const entries = useArtistStore((s) => s.entries);
  const pauseCampaign = useArtistStore((s) => s.pauseCampaign);
  const resumeCampaign = useArtistStore((s) => s.resumeCampaign);

  const [period, setPeriod] = useState<CampaignPeriod>('lifetime');
  const [confirming, setConfirming] = useState<'pause' | 'resume' | undefined>();

  const campaign = campaigns.find((c) => c.id === id);
  const coverUri = entries.find((e) => e.track.id === campaign?.trackId)?.track.coverUri;

  const analytics = useMemo(() => (campaign ? getCampaignAnalytics(campaign, period) : undefined), [campaign, period]);

  if (!campaign || !analytics) {
    return (
      <ThemedView surface="canvas" style={styles.flex}>
        <View style={styles.content}>
          <EmptyState icon="campaign" title={t('campaignNotFoundTitle')} />
          <TextLinkButton label={t('backToPromotion')} onPress={() => router.replace('/profile/artist/dashboard/promotion')} style={styles.notFoundLink} />
        </View>
      </ThemedView>
    );
  }

  const done = campaign.status === 'completed';
  const statusLabel = campaign.status === 'active' ? t('campaignActive') : campaign.status === 'paused' ? t('campaignPaused') : t('campaignCompleted');
  const statusColor = campaign.status === 'active' ? Colors.tertiary : campaign.status === 'paused' ? Colors.secondary : Colors.text.medium;

  const startDate = new Date(campaign.createdAt);
  const endDate = new Date(startDate.getTime() + campaign.durationDays * 86_400_000);
  const dateFmt = (d: Date) => d.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' });

  function handlePause() {
    pauseCampaign(campaign!.id);
    setConfirming(undefined);
  }
  function handleResume() {
    resumeCampaign(campaign!.id);
    setConfirming(undefined);
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <ThemedText variant="headline-sm" style={styles.flexText}>{t('campaignOverviewSection')}</ThemedText>
            <Badge label={t('demoDataBadge')} />
          </View>
          <View style={styles.trackRow}>
            <Artwork uri={coverUri} size={56} radius={Radii.DEFAULT} />
            <View style={styles.flexText}>
              <ThemedText variant="headline-md" numberOfLines={1}>{campaign.trackTitle}</ThemedText>
              <ThemedText variant="body-sm" emphasis="medium">{t(GOAL_LABEL[campaign.goal])}</ThemedText>
            </View>
            <ThemedText variant="label-md" style={{ color: statusColor }}>{statusLabel}</ThemedText>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${analytics.progressPct}%` }]} />
          </View>
          <View style={styles.statsRow}>
            <ThemedText variant="body-sm" emphasis="medium">{t('progressLabel')}: {analytics.progressPct}%</ThemedText>
            <ThemedText variant="body-sm" emphasis="medium">{t('daysRemainingLabel')}: {analytics.daysRemaining}</ThemedText>
          </View>

          <InfoLine label={t('totalBudgetLabel')} value={`${formatKgsAmount(campaign.budgetKgs)} сом`} />
          <InfoLine label={t('amountSpentLabel')} value={`${formatKgsAmount(analytics.spentKgs)} сом`} />
          <InfoLine label={t('remainingBudgetLabel')} value={`${formatKgsAmount(analytics.remainingBudgetKgs)} сом`} />
          <InfoLine label={t('startDateLabel')} value={dateFmt(startDate)} />
          <InfoLine label={t('endDateLabel')} value={dateFmt(endDate)} />
        </View>

        <View style={styles.card}>
          <ThemedText variant="headline-sm">{t('performanceSection')}</ThemedText>
          <View style={styles.statsGrid}>
            <StatCard label={t('impressionsLabel')} value={analytics.impressions.toLocaleString('en-US')} style={styles.statTile} />
            <StatCard label={t('campaignReach')} value={campaign.reachSoFar.toLocaleString('en-US')} style={styles.statTile} />
            <StatCard label={t('clicksLabel')} value={analytics.clicks.toLocaleString('en-US')} style={styles.statTile} />
            <StatCard label={t('ctrLabel')} value={`${analytics.ctrPct}%`} style={styles.statTile} />
            <StatCard label={t('costPerClickLabel')} value={`${formatKgsAmount(analytics.costPerClickKgs)} сом`} style={styles.statTile} />
            {campaign.goal === 'streams' && (
              <>
                <StatCard label={t('attributedStreamsLabel')} value={analytics.attributedStreams.toLocaleString('en-US')} style={styles.statTile} />
                <StatCard label={t('costPerStreamLabel')} value={`${formatKgsAmount(analytics.costPerAttributedStreamKgs)} сом`} style={styles.statTile} />
              </>
            )}
            {campaign.goal === 'followers' && (
              <>
                <StatCard label={t('newFollowersLabel')} value={analytics.attributedNewFollowers.toLocaleString('en-US')} style={styles.statTile} />
                <StatCard label={t('costPerFollowerLabel')} value={`${formatKgsAmount(analytics.costPerFollowerKgs)} сом`} style={styles.statTile} />
              </>
            )}
            {campaign.goal === 'playlists' && (
              <StatCard label={t('attributedPlaylistsLabel')} value={analytics.attributedPlaylistAdds.toLocaleString('en-US')} style={styles.statTile} />
            )}
          </View>
          {campaign.goal === 'streams' && <ThemedText variant="body-sm" emphasis="medium">{t('attributedStreamsHint')}</ThemedText>}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {PERIOD_KEYS.map((p) => (
            <Chip key={p.id} label={t(p.key)} selected={p.id === period} onPress={() => setPeriod(p.id)} />
          ))}
        </ScrollView>

        <View style={styles.chartCard}>
          <ThemedText variant="label-sm" emphasis="medium" style={styles.sectionLabel}>{t('dailyPerformanceEyebrow')}</ThemedText>
          <ThemedText variant="headline-sm">{t('dailyPerformanceHeadline')}</ThemedText>
          <ListenTrendChart
            points={analytics.dailyPerformance}
            peakLabel={`${t('peakLabel')} ${Math.max(...analytics.dailyPerformance.map((p) => p.value)).toLocaleString('en-US')}`}
          />
        </View>

        <View style={styles.chartCard}>
          <ThemedText variant="label-sm" emphasis="medium" style={styles.sectionLabel}>{t('budgetSpendEyebrow')}</ThemedText>
          <ThemedText variant="headline-sm">{t('budgetSpendHeadline')}</ThemedText>
          <ListenTrendChart points={analytics.dailySpend} peakLabel={`${t('peakLabel')} ${formatKgsAmount(analytics.spentKgs)} сом`} />
        </View>

        <View style={styles.chartCard}>
          <ThemedText variant="label-sm" emphasis="medium" style={styles.sectionLabel}>{t('audienceSection')}</ThemedText>
          <ThemedText variant="headline-sm">{t('campaignAudienceHeadline')}</ThemedText>
          {analytics.audience.topCountries.map((c) => (
            <View key={c.name.en} style={styles.barRow}>
              <ThemedText variant="body-sm">{c.name[locale]}</ThemedText>
              <ThemedText variant="label-lg">{c.pct}%</ThemedText>
            </View>
          ))}
          <ThemedText variant="headline-sm" style={styles.subHead}>{t('topCities')}</ThemedText>
          {analytics.audience.topCities.map((c) => (
            <View key={c.name.en} style={styles.barRow}>
              <ThemedText variant="body-sm">{c.name[locale]}</ThemedText>
              <ThemedText variant="label-lg">{c.pct}%</ThemedText>
            </View>
          ))}
          <ThemedText variant="headline-sm" style={styles.subHead}>{t('ageGroups')}</ThemedText>
          {analytics.audience.ageGroups.map((g) => (
            <View key={g.label.en} style={styles.barRow}>
              <ThemedText variant="body-sm">{g.label[locale]}</ThemedText>
              <ThemedText variant="label-lg">{g.pct}%</ThemedText>
            </View>
          ))}
          <ThemedText variant="headline-sm" style={styles.subHead}>{t('listeningDevices')}</ThemedText>
          {analytics.audience.devices.map((d) => (
            <View key={d.name.en} style={styles.barRow}>
              <ThemedText variant="body-sm">{d.name[locale]}</ThemedText>
              <ThemedText variant="label-lg">{d.pct}%</ThemedText>
            </View>
          ))}
        </View>

        {!done && (
          <View style={styles.card}>
            {confirming ? (
              <>
                <ThemedText variant="headline-sm">{confirming === 'pause' ? t('pauseConfirmTitle') : t('resumeConfirmTitle')}</ThemedText>
                <ThemedText variant="body-sm" emphasis="medium">{confirming === 'pause' ? t('pauseConfirmBody') : t('resumeConfirmBody')}</ThemedText>
                <View style={styles.confirmRow}>
                  <TextLinkButton label={t('cancelLabel')} tone="muted" onPress={() => setConfirming(undefined)} />
                  <PillButton label={t('confirmLabel')} onPress={confirming === 'pause' ? handlePause : handleResume} />
                </View>
              </>
            ) : campaign.status === 'active' ? (
              <PillButton label={t('pauseCampaignCta')} leadingIcon="pause-circle-outline" onPress={() => setConfirming('pause')} />
            ) : (
              <PillButton label={t('resumeCampaignCta')} leadingIcon="play-circle-outline" onPress={() => setConfirming('resume')} />
            )}
          </View>
        )}

        <TextLinkButton label={t('backToPromotion')} onPress={() => router.replace('/profile/artist/dashboard/promotion')} style={styles.backLink} />
      </ScrollView>
    </ThemedView>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <ThemedText variant="body-sm" emphasis="medium" style={styles.flexText} numberOfLines={1}>{label}</ThemedText>
      <ThemedText variant="label-lg">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.margin, gap: Spacing.lg, paddingBottom: Spacing.xl * 3 },
  notFoundLink: { alignSelf: 'center', marginTop: Spacing.sm },
  card: { backgroundColor: Colors.surface.l1, borderRadius: Radii.lg, padding: Spacing.md, gap: Spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flexText: { flex: 1, minWidth: 0 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.surface.l3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: Colors.primary },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statTile: { flexBasis: '47%' },
  filterRow: { gap: Spacing.xs },
  chartCard: { backgroundColor: Colors.surface.l1, borderRadius: Radii.lg, padding: Spacing.md, gap: Spacing.sm },
  sectionLabel: { letterSpacing: 1, textTransform: 'uppercase' },
  subHead: { marginTop: Spacing.sm },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs },
  backLink: { alignSelf: 'center' },
});
