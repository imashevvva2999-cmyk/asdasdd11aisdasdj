import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Chip, PillButton } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';
import { formatKgsAmount } from '@/lib/format-currency';
import { ACTIVE_CAMPAIGN, CAMPAIGN_HISTORY, PROMO_TOOLS } from '@/mocks/promotions';
import { useDashboardStrings } from '@/state/dashboard-locale-store';
import { useArtistStore } from '@/state/artist-store';

const BUDGETS = [1000, 2500, 5000];

/** Artist Dashboard — Promotion tab (Stitch "mmusic_boost"). No real campaign
 * ever launches — "Launch via MBANK" is explicitly disabled, same honest
 * pattern as the listener Support flow. */
export default function PromotionScreen() {
  const { t, locale } = useDashboardStrings();
  const entries = useArtistStore((s) => s.entries);
  const published = useMemo(() => entries.filter((e) => e.status === 'published'), [entries]);
  const [rawCampaignTrackId, setRawCampaignTrackId] = useState(published[0]?.track.id);
  const campaignTrackId = published.some((e) => e.track.id === rawCampaignTrackId) ? rawCampaignTrackId : published[0]?.track.id;
  const [budget, setBudget] = useState(BUDGETS[1]);
  const { showToast, toast } = useToast();

  const activeTrack = published.find((e) => e.track.id === ACTIVE_CAMPAIGN.trackId)?.track;
  const campaignTrack = published.find((e) => e.track.id === campaignTrackId)?.track;

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        {activeTrack !== undefined && (
          <View style={styles.card}>
            <ThemedText variant="label-sm" style={{ color: Colors.primary }}>
              {t('liveLabel')} · {ACTIVE_CAMPAIGN.dayOfTotal[locale]}
            </ThemedText>
            <View style={styles.activeRow}>
              <Artwork uri={activeTrack?.coverUri} size={48} radius={Radii.DEFAULT} />
              <ThemedText variant="headline-sm" numberOfLines={1} style={styles.flexText}>
                {activeTrack?.title ?? ACTIVE_CAMPAIGN.trackId}
              </ThemedText>
            </View>
            <View style={styles.statsRow}>
              <View>
                <ThemedText variant="body-sm" emphasis="medium">{t('campaignReach')}</ThemedText>
                <ThemedText variant="headline-md">{ACTIVE_CAMPAIGN.reach.toLocaleString('en-US')} / {(ACTIVE_CAMPAIGN.reachGoal / 1000).toFixed(0)}k</ThemedText>
              </View>
              <View>
                <ThemedText variant="body-sm" emphasis="medium">{t('fanConversion')}</ThemedText>
                <ThemedText variant="headline-md">{ACTIVE_CAMPAIGN.conversionRatePct}% {t('conversionRateAbbr')}</ThemedText>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${ACTIVE_CAMPAIGN.progressPct}%` }]} />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <ThemedText variant="headline-md">{t('promotionTools')}</ThemedText>
          {PROMO_TOOLS.map((tool) => (
            <View key={tool.id} style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <ThemedText variant="label-lg" style={styles.flexText}>{tool.name[locale]}</ThemedText>
                <ThemedText variant="body-sm" style={{ color: Colors.secondary }}>{tool.priceLabel[locale]}</ThemedText>
              </View>
              <ThemedText variant="body-sm" emphasis="medium">{tool.description[locale]}</ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <ThemedText variant="headline-md">{t('createCampaign')}</ThemedText>
          {published.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {published.map((e) => (
                <Chip key={e.track.id} label={e.track.title} selected={e.track.id === campaignTrackId} onPress={() => setRawCampaignTrackId(e.track.id)} />
              ))}
            </ScrollView>
          )}
          {campaignTrack && (
            <View style={styles.activeRow}>
              <Artwork uri={campaignTrack.coverUri} size={40} radius={Radii.DEFAULT} />
              <ThemedText variant="label-lg" numberOfLines={1} style={styles.flexText}>
                {campaignTrack.title}
              </ThemedText>
            </View>
          )}
          <ThemedText variant="label-sm" emphasis="medium">{t('budget')}</ThemedText>
          <View style={styles.filterRow}>
            {BUDGETS.map((b) => (
              <Chip key={b} label={`${formatKgsAmount(b)} сом`} selected={b === budget} onPress={() => setBudget(b)} />
            ))}
          </View>
          <PillButton
            label={t('launchViaMbank')}
            trailingIcon="arrow-forward"
            style={styles.launchButton}
            onPress={() => showToast(t('launchCampaignToast'), 'campaign')}
          />
        </View>

        <View style={styles.section}>
          <ThemedText variant="headline-md">{t('history')}</ThemedText>
          {CAMPAIGN_HISTORY.map((h) => (
            <View key={h.id} style={styles.historyRow}>
              <View style={styles.flexText}>
                <ThemedText variant="label-lg">{h.trackTitle}</ThemedText>
                <ThemedText variant="body-sm" emphasis="medium">{h.completedLabel[locale]}</ThemedText>
              </View>
              <ThemedText variant="label-lg" style={{ color: Colors.tertiary }}>{h.metric[locale]}</ThemedText>
            </View>
          ))}
        </View>
      </ScrollView>
      {toast}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.margin, gap: Spacing.lg, paddingBottom: Spacing.xl * 3 },
  card: { backgroundColor: Colors.surface.l1, borderRadius: Radii.lg, padding: Spacing.md, gap: Spacing.sm },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flexText: { flex: 1, minWidth: 0 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.surface.l3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: Colors.primary },
  section: { gap: Spacing.sm },
  toolCard: { backgroundColor: Colors.surface.l1, borderRadius: Radii.md, padding: Spacing.md, gap: 4 },
  toolHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filterRow: { flexDirection: 'row', gap: Spacing.xs },
  launchButton: { marginTop: Spacing.sm },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
});
