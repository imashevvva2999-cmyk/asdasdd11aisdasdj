import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip, Icon, PillButton, PressableScale, StatCard } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { formatKgsAmount } from '@/lib/format-currency';
import type { DashboardStringKey, LocalizedText } from '@/lib/dashboard-i18n';
import { getMbankPaymentAdapter, newOrderId, type PaymentOrder, type PaymentResult } from '@/lib/payments/mbank-payment';
import { useDashboardStrings } from '@/state/dashboard-locale-store';
import { usePaymentStore } from '@/state/payment-store';
import { useIsDemoArtist } from '@/state/demo-session-store';
import { DEMO_SUBSCRIPTION } from '@/demo/demo-fixture';
import { useDemoStrings } from '@/demo/demo-strings';
import { useIsGuestPreview } from '@/demo/guest-mode';
import { useToast } from '@/hooks/use-toast';

const TIERS: {
  id: string;
  badge: LocalizedText;
  name: LocalizedText;
  tagline: LocalizedText;
  priceYear: number;
  priceMonthLabel: string;
  features: LocalizedText[];
  current: boolean;
}[] = [
  {
    id: 'studio-pro',
    badge: { en: 'RECOMMENDED', ru: 'РЕКОМЕНДУЕМ' },
    name: { en: 'Studio PRO', ru: 'Studio PRO' },
    tagline: { en: 'Maximum reach and 100% revenue', ru: 'Максимум охвата и доход 100%' },
    priceYear: 3740,
    priceMonthLabel: '311 сом/mo',
    features: [
      { en: 'Unlimited Lossless (FLAC/WAV 24-bit) uploads', ru: 'Неограниченная загрузка треков в Lossless (FLAC/WAV 24-bit)' },
      { en: 'Real-time analytics — per-second stats and cities', ru: 'Аналитика в реальном времени: посекундная статистика и города' },
      { en: 'Editorial pitching into official Mmusic playlists', ru: 'Редакционный питчинг в официальные плейлисты Mmusic' },
      { en: '100% royalties, no platform fee', ru: 'Роялти 100% без комиссии платформы' },
      { en: 'Instant MBANK payout, 24/7, no fee', ru: 'Мгновенный вывод на MBANK 24/7 без комиссии' },
      { en: 'Verified artist badge', ru: 'Бейдж верифицированного артиста' },
    ],
    current: false,
  },
  {
    id: 'basic',
    badge: { en: 'FOR STARTING OUT', ru: 'ДЛЯ СТАРТА' },
    name: { en: 'Basic Artist', ru: 'Базовый Артист' },
    tagline: { en: 'Free, forever', ru: 'Бесплатный доступ навсегда' },
    priceYear: 0,
    priceMonthLabel: 'forever',
    features: [
      { en: 'Up to 3 releases per year', ru: 'До 3 релизов в год' },
      { en: 'Basic stream stats (weekly)', ru: 'Базовая статистика стримов (раз в неделю)' },
      { en: '70% streaming royalties', ru: 'Роялти 70% от стриминга' },
      { en: 'MBANK payout once a month', ru: 'Вывод средств через MBANK (раз в месяц)' },
    ],
    current: true,
  },
  {
    id: 'label-team',
    badge: { en: 'TEAMS & LABELS', ru: 'КОМАНДЫ И ЛЕЙБЛЫ' },
    name: { en: 'Label & Team', ru: 'Label & Team' },
    tagline: { en: 'Manage a roster of artists', ru: 'Управление каталогом артистов' },
    priceYear: 9500,
    priceMonthLabel: '790 сом/mo',
    features: [
      { en: 'Up to 10 artists in one workspace', ru: 'До 10 артистов в едином кабинете' },
      { en: 'Multi-access for managers and sound producers', ru: 'Мульти-доступ для менеджеров и саунд-продюсеров' },
      { en: '100% payouts with split royalties', ru: 'Выплаты 100% с раздельным сплитом роялти' },
      { en: 'A dedicated Mmusic & MBANK curator', ru: 'Персональный куратор от Mmusic и MBANK' },
    ],
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
  const { t, locale } = useDashboardStrings();
  const [yearly, setYearly] = useState(true);
  const [currentTierId, setCurrentTierId] = useState(TIERS.find((tier) => tier.current)!.id);
  const pending = useRef<{ orderId: string; tierId: string } | undefined>(undefined);
  const lastHandledResult = useRef<PaymentResult | undefined>(undefined);
  const result = usePaymentStore((s) => s.result);
  const paidOrder = usePaymentStore((s) => s.order);
  const demo = useIsDemoArtist();
  const guest = useIsGuestPreview();
  const { d } = useDemoStrings();
  const { showToast, toast } = useToast();
  // Demo account is on Studio PRO; everyone else keeps the tier marked current.
  const activeTierId = demo ? DEMO_SUBSCRIPTION.planId : currentTierId;
  const dateLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  // Tier activation side effect for this tab's MBANK (demo) checkout — the
  // shared mbank-result.tsx sheet now owns the outcome's visual presentation
  // and the store's reset() (only on its own Done/Close), so this only needs
  // to flip the active tier on success. Dedup by result identity rather than
  // clearing `pending`: Retry (from the result sheet) replays the SAME order
  // through a NEW completeDemo() call, producing a new `result` object this
  // effect must still react to.
  useEffect(() => {
    if (!result || !paidOrder || paidOrder.id !== pending.current?.orderId) return;
    if (result === lastHandledResult.current) return;
    lastHandledResult.current = result;
    if (result.outcome === 'success') {
      setCurrentTierId(pending.current.tierId);
    }
  }, [result, paidOrder]);

  async function choose(tier: (typeof TIERS)[number]) {
    // Guest Preview is read-only: never opens a checkout (payment-store is guarded too).
    if (guest) return showToast(d.readOnlyToast, 'lock');
    const amountKgs = yearly ? tier.priceYear : Math.round((tier.priceYear / 10) * 1.15);
    const order: PaymentOrder = {
      id: newOrderId('STUDIO'),
      amountKgs,
      currency: 'KGS',
      description: `${tier.name[locale]} · ${yearly ? t('perYear') : t('perMonth')}`,
      purpose: 'studio-pro',
    };
    pending.current = { orderId: order.id, tierId: tier.id };
    const session = await getMbankPaymentAdapter().createSession(order);
    usePaymentStore.getState().start(order);
    if (session.kind === 'redirect') {
      if (Platform.OS === 'web') window.location.assign(session.checkoutUrl);
      else void Linking.openURL(session.checkoutUrl);
      return;
    }
    router.push('/sheets/mbank-pay');
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        {demo && (
          <View style={[styles.tierCard, styles.tierCardHighlight]}>
            <ThemedText variant="label-sm" style={{ color: Colors.secondary }}>{d.planTitle}</ThemedText>
            <ThemedText variant="headline-lg">{d.planDemo}</ThemedText>
            <ThemedText variant="body-sm" emphasis="medium">
              {d.planSince} {dateLabel(DEMO_SUBSCRIPTION.since)} • {d.planRenews} {dateLabel(DEMO_SUBSCRIPTION.renews)} • {formatKgsAmount(DEMO_SUBSCRIPTION.priceYearKgs)} сом / {t('perYear')}
            </ThemedText>
            <View style={styles.usageGrid}>
              {DEMO_SUBSCRIPTION.usage.map((u) => (
                <StatCard key={u.label.en} label={u.label[locale]} value={u.value} style={styles.usageTile} />
              ))}
            </View>
            <ThemedText variant="body-sm" emphasis="medium">{d.planNoBilling}</ThemedText>
          </View>
        )}

        <ThemedText variant="headline-lg">{t('studioPlans')}</ThemedText>
        <ThemedText variant="body-md" emphasis="medium">{t('studioPlansHint')}</ThemedText>

        <View style={styles.toggleRow}>
          <Chip label={t('monthly')} selected={!yearly} onPress={() => setYearly(false)} />
          <Chip label={t('yearlyDiscount')} selected={yearly} onPress={() => setYearly(true)} />
        </View>

        {TIERS.map((tier) => (
          <View key={tier.id} style={[styles.tierCard, tier.id === 'studio-pro' && styles.tierCardHighlight]}>
            <ThemedText variant="label-sm" style={{ color: Colors.secondary }}>{tier.badge[locale]}</ThemedText>
            <ThemedText variant="headline-lg">{tier.name[locale]}</ThemedText>
            <ThemedText variant="body-sm" emphasis="medium">{tier.tagline[locale]}</ThemedText>
            <ThemedText variant="display-lg-mobile">
              {tier.priceYear === 0 ? '0 сом' : `${formatKgsAmount(yearly ? tier.priceYear : Math.round((tier.priceYear / 10) * 1.15))} сом`}
              <ThemedText variant="body-sm" emphasis="medium"> / {tier.priceYear === 0 ? t('forever') : yearly ? t('perYear') : t('perMonth')}</ThemedText>
            </ThemedText>
            {tier.features.map((f) => (
              <View key={f.en} style={styles.featureRow}>
                <Icon name="check" size={16} color={Colors.tertiary} />
                <ThemedText variant="body-sm" style={styles.flexText}>{f[locale]}</ThemedText>
              </View>
            ))}
            <PillButton
              label={tier.id === activeTierId ? t('currentPlan') : `${t('chooseTier')} ${tier.name[locale]}`}
              disabled={tier.id === activeTierId || tier.priceYear === 0}
              onPress={tier.id === activeTierId || tier.priceYear === 0 ? undefined : () => void choose(tier)}
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
  usageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  usageTile: { flexBasis: '47%' },
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
