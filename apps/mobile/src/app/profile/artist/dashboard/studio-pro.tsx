import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip, Icon, PillButton, PressableScale } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';
import { formatKgsAmount } from '@/lib/format-currency';
import type { DashboardStringKey } from '@/lib/dashboard-i18n';
import { useDashboardStrings } from '@/state/dashboard-locale-store';

const TIERS = [
  {
    id: 'studio-pro',
    badge: 'RECOMMENDED',
    name: 'Studio PRO',
    tagline: 'Maximum reach and 100% revenue',
    priceYear: 3740,
    priceMonthLabel: '311 сом/mo',
    features: ['Unlimited Lossless (FLAC/WAV 24-bit) uploads', 'Real-time analytics — per-second stats and cities', 'Editorial pitching into official Mmusic playlists', '100% royalties, no platform fee', 'Instant MBANK payout, 24/7, no fee', 'Verified artist badge'],
    current: false,
  },
  {
    id: 'basic',
    badge: 'FOR STARTING OUT',
    name: 'Basic Artist',
    tagline: 'Free, forever',
    priceYear: 0,
    priceMonthLabel: 'forever',
    features: ['Up to 3 releases per year', 'Basic stream stats (weekly)', '70% streaming royalties', 'MBANK payout once a month'],
    current: true,
  },
  {
    id: 'label-team',
    badge: 'TEAMS & LABELS',
    name: 'Label & Team',
    tagline: 'Manage a roster of artists',
    priceYear: 9500,
    priceMonthLabel: '790 сом/mo',
    features: ['Up to 10 artists in one workspace', 'Multi-access for managers and sound producers', '100% payouts with split royalties', 'A dedicated Mmusic & MBANK curator'],
    current: false,
  },
];

const PERKS: { icon: string; titleKey: DashboardStringKey; bodyKey: DashboardStringKey }[] = [
  { icon: 'percent', titleKey: 'perkCashbackTitle', bodyKey: 'perkCashbackBody' },
  { icon: 'volunteer-activism', titleKey: 'perkDonationsTitle', bodyKey: 'perkDonationsBody' },
  { icon: 'gavel', titleKey: 'perkLegalTitle', bodyKey: 'perkLegalBody' },
];

const FAQ: { qKey: DashboardStringKey; aKey: DashboardStringKey }[] = [
  { qKey: 'faqChangePlanQ', aKey: 'faqChangePlanA' },
  { qKey: 'faqPayoutQ', aKey: 'faqPayoutA' },
];

/** One FAQ row, real per-item expand/collapse state — matches Stitch
 * "mmusic_studio"'s accordion (expanding one question never affects another). */
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <PressableScale onPress={() => setOpen((v) => !v)} style={styles.faqItem} accessibilityRole="button" accessibilityState={{ expanded: open }}>
      <View style={styles.faqHeader}>
        <ThemedText variant="label-lg" style={styles.flexText}>{question}</ThemedText>
        <Icon name={open ? 'expand-less' : 'expand-more'} size={20} color={Colors.text.medium} />
      </View>
      {open && <ThemedText variant="body-sm" emphasis="medium" style={styles.faqAnswer}>{answer}</ThemedText>}
    </PressableScale>
  );
}

/** Artist Dashboard — Studio Pro tab (Stitch "mmusic_studio"). Every
 * subscribe CTA is explicitly disabled — no real subscriptions exist. */
export default function StudioProScreen() {
  const { t } = useDashboardStrings();
  const [yearly, setYearly] = useState(true);
  const { showToast, toast } = useToast();

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText variant="headline-lg">{t('studioPlans')}</ThemedText>
        <ThemedText variant="body-md" emphasis="medium">{t('studioPlansHint')}</ThemedText>

        <View style={styles.toggleRow}>
          <Chip label={t('monthly')} selected={!yearly} onPress={() => setYearly(false)} />
          <Chip label={t('yearlyDiscount')} selected={yearly} onPress={() => setYearly(true)} />
        </View>

        {TIERS.map((tier) => (
          <View key={tier.id} style={[styles.tierCard, tier.id === 'studio-pro' && styles.tierCardHighlight]}>
            <ThemedText variant="label-sm" style={{ color: Colors.secondary }}>{tier.badge}</ThemedText>
            <ThemedText variant="headline-lg">{tier.name}</ThemedText>
            <ThemedText variant="body-sm" emphasis="medium">{tier.tagline}</ThemedText>
            <ThemedText variant="display-lg-mobile">
              {tier.priceYear === 0 ? '0 сом' : `${formatKgsAmount(yearly ? tier.priceYear : Math.round((tier.priceYear / 10) * 1.15))} сом`}
              <ThemedText variant="body-sm" emphasis="medium"> / {tier.priceYear === 0 ? t('forever') : yearly ? t('perYear') : t('perMonth')}</ThemedText>
            </ThemedText>
            {tier.features.map((f) => (
              <View key={f} style={styles.featureRow}>
                <Icon name="check" size={16} color={Colors.tertiary} />
                <ThemedText variant="body-sm" style={styles.flexText}>{f}</ThemedText>
              </View>
            ))}
            <PillButton
              label={tier.current ? t('currentPlan') : `${t('chooseTier')} ${tier.name}`}
              disabled={tier.current}
              onPress={tier.current ? undefined : () => showToast('Subscriptions aren\'t available in this preview', 'studio')}
              style={styles.tierButton}
            />
          </View>
        ))}

        <View style={styles.section}>
          <ThemedText variant="headline-md">{t('mbankBenefits')}</ThemedText>
          {PERKS.map((p) => (
            <View key={p.titleKey} style={styles.perkRow}>
              <Icon name={p.icon} size={20} color={Colors.primary} />
              <View style={styles.flexText}>
                <ThemedText variant="label-lg">{t(p.titleKey)}</ThemedText>
                <ThemedText variant="body-sm" emphasis="medium">{t(p.bodyKey)}</ThemedText>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <ThemedText variant="headline-md">{t('faqTitle')}</ThemedText>
          {FAQ.map((item) => (
            <FaqItem key={item.qKey} question={t(item.qKey)} answer={t(item.aKey)} />
          ))}
        </View>
      </ScrollView>
      {toast}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.margin, gap: Spacing.md, paddingBottom: Spacing.xl * 3 },
  toggleRow: { flexDirection: 'row', gap: Spacing.xs },
  tierCard: { backgroundColor: Colors.surface.l1, borderRadius: Radii.lg, padding: Spacing.md, gap: Spacing.xs },
  tierCardHighlight: { borderWidth: 1, borderColor: Colors.primary },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  flexText: { flex: 1, minWidth: 0 },
  tierButton: { marginTop: Spacing.sm },
  section: { gap: Spacing.sm, marginTop: Spacing.sm },
  perkRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  faqItem: { backgroundColor: Colors.surface.l1, borderRadius: Radii.md, padding: Spacing.md, gap: Spacing.xs },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqAnswer: { lineHeight: 20 },
});
