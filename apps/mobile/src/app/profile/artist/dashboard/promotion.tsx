import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Badge, PillButton } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import type { DashboardStringKey } from '@/lib/dashboard-i18n';
import { formatKgsAmount } from '@/lib/format-currency';
import type { Campaign, PromoGoal } from '@/lib/promotion';
import { PROMO_TOOLS } from '@/mocks/promotions';
import { useArtistStore } from '@/state/artist-store';
import { useDashboardStrings } from '@/state/dashboard-locale-store';

const GOAL_LABEL: Record<PromoGoal, DashboardStringKey> = { streams: 'goalStreams', followers: 'goalFollowers', playlists: 'goalPlaylists' };

/** Artist Dashboard — Promotion tab (Stitch "mmusic_boost"). Campaigns are
 * created through the promotion wizard and paid via the MBANK payment adapter
 * (demo checkout until a live integration exists — never a real charge). */
export default function PromotionScreen() {
  const { t, locale } = useDashboardStrings();
  const entries = useArtistStore((s) => s.entries);
  const campaigns = useArtistStore((s) => s.campaigns);
  const published = useMemo(() => entries.filter((e) => e.status === 'published'), [entries]);
  const coverOf = (trackId: string) => published.find((e) => e.track.id === trackId)?.track.coverUri;
  const active = campaigns.find((c) => c.status === 'active');

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        {active && (
          <View style={styles.card}>
            <View style={styles.activeRow}>
              <ThemedText variant="label-sm" style={[styles.flexText, { color: Colors.primary }]}>
                {t('liveLabel')} · {t(GOAL_LABEL[active.goal])}
              </ThemedText>
              <Badge label={t('demoDataBadge')} />
            </View>
            <View style={styles.activeRow}>
              <Artwork uri={coverOf(active.trackId)} size={48} radius={Radii.DEFAULT} />
              <ThemedText variant="headline-sm" numberOfLines={1} style={styles.flexText}>{active.trackTitle}</ThemedText>
            </View>
            <View style={styles.statsRow}>
              <View>
                <ThemedText variant="body-sm" emphasis="medium">{t('campaignReach')}</ThemedText>
                <ThemedText variant="headline-md">
                  {active.reachSoFar.toLocaleString('en-US')} / {Math.round(active.estimatedReach / 1000)}k
                </ThemedText>
              </View>
              <View>
                <ThemedText variant="body-sm" emphasis="medium">{t('newFollowersLabel')}</ThemedText>
                <ThemedText variant="headline-md">+{active.newFollowers.toLocaleString('en-US')}</ThemedText>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, (active.reachSoFar / active.estimatedReach) * 100)}%` }]} />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <ThemedText variant="headline-md">{t('createCampaign')}</ThemedText>
          {published.length > 0 ? (
            <PillButton label={t('createCampaignCta')} leadingIcon="campaign" trailingIcon="arrow-forward" onPress={() => router.push('/profile/artist/promote')} />
          ) : (
            <ThemedText variant="body-sm" emphasis="medium">{t('noPublishedForPromo')}</ThemedText>
          )}
        </View>

        {campaigns.length > 0 && (
          <View style={styles.section}>
            <ThemedText variant="headline-md">{t('campaignsSection')}</ThemedText>
            {campaigns.map((c) => (
              <CampaignRow key={c.id} campaign={c} coverUri={coverOf(c.trackId)} />
            ))}
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
      </ScrollView>
    </ThemedView>
  );
}

function CampaignRow({ campaign: c, coverUri }: { campaign: Campaign; coverUri?: Parameters<typeof Artwork>[0]['uri'] }) {
  const { t } = useDashboardStrings();
  const done = c.status === 'completed';
  return (
    <View style={styles.historyCard}>
      <View style={styles.activeRow}>
        <Artwork uri={coverUri} size={40} radius={Radii.DEFAULT} />
        <View style={styles.flexText}>
          <ThemedText variant="label-lg" numberOfLines={1}>{c.trackTitle}</ThemedText>
          <ThemedText variant="body-sm" emphasis="medium">
            {t(GOAL_LABEL[c.goal])} · {formatKgsAmount(c.budgetKgs)} сом · {c.durationDays} {t('daysWord')}
          </ThemedText>
        </View>
        <ThemedText variant="label-md" style={{ color: done ? Colors.text.medium : Colors.tertiary }}>
          {done ? t('campaignCompleted') : t('campaignActive')}
        </ThemedText>
      </View>
      <View style={styles.statsRow}>
        <ThemedText variant="body-sm" emphasis="medium">
          {t('campaignReach')}: {c.reachSoFar.toLocaleString('en-US')} / {c.estimatedReach.toLocaleString('en-US')}
        </ThemedText>
        <ThemedText variant="body-sm" emphasis="medium">
          {c.simulatedPayment ? t('paidViaMbankDemo') : ''} · {c.paymentRef}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.margin, gap: Spacing.lg, paddingBottom: Spacing.xl * 3 },
  card: { backgroundColor: Colors.surface.l1, borderRadius: Radii.lg, padding: Spacing.md, gap: Spacing.sm },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flexText: { flex: 1, minWidth: 0 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.xs },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.surface.l3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: Colors.primary },
  section: { gap: Spacing.sm },
  toolCard: { backgroundColor: Colors.surface.l1, borderRadius: Radii.md, padding: Spacing.md, gap: 4 },
  toolHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyCard: { backgroundColor: Colors.surface.l1, borderRadius: Radii.md, padding: Spacing.sm, gap: Spacing.xs },
});
