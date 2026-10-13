import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { DemoNotice } from '@/components/demo-notice';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Badge, Chip, Icon, PillButton, PressableScale, TextLinkButton } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import type { DashboardStringKey } from '@/lib/dashboard-i18n';
import { formatKgsAmount } from '@/lib/format-currency';
import { getMbankPaymentAdapter, newOrderId, type PaymentOrder } from '@/lib/payments/mbank-payment';
import { estimateCampaign, PROMO_BUDGETS_KGS, PROMO_DURATIONS_DAYS, PROMO_GOALS, type PromoGoal } from '@/lib/promotion';
import { useArtistStore } from '@/state/artist-store';
import { useDashboardStrings } from '@/state/dashboard-locale-store';
import { usePaymentStore } from '@/state/payment-store';

type Step = 'song' | 'goal' | 'budget' | 'summary' | 'done';
const STEPS: Step[] = ['song', 'goal', 'budget', 'summary'];
const GOAL_LABEL: Record<PromoGoal, DashboardStringKey> = { streams: 'goalStreams', followers: 'goalFollowers', playlists: 'goalPlaylists' };
const GOAL_ICON: Record<PromoGoal, string> = { streams: 'play-circle-outline', followers: 'groups', playlists: 'queue-music' };

/**
 * Song promotion wizard (Artist Dashboard → Promotion → Create campaign).
 * Reach is a SIMULATED estimate; payment goes through the MBANK payment
 * adapter, which is the labelled demo checkout until a live integration exists.
 */
export default function PromoteScreen() {
  const { t } = useDashboardStrings();
  const entries = useArtistStore((s) => s.entries);
  const addCampaign = useArtistStore((s) => s.addCampaign);
  const published = useMemo(() => entries.filter((e) => e.status === 'published'), [entries]);

  const [step, setStep] = useState<Step>('song');
  const [trackId, setTrackId] = useState(published[0]?.track.id);
  const [goal, setGoal] = useState<PromoGoal>('streams');
  const [budget, setBudget] = useState(PROMO_BUDGETS_KGS[1]!);
  const [duration, setDuration] = useState(PROMO_DURATIONS_DAYS[1]!);
  const [notice, setNotice] = useState<string | undefined>();
  const [paymentRef, setPaymentRef] = useState<string | undefined>();
  const orderIdRef = useRef<string | undefined>(undefined);

  const track = published.find((e) => e.track.id === trackId)?.track;
  const estimate = estimateCampaign(budget, duration, goal);
  const result = usePaymentStore((s) => s.result);
  const paidOrder = usePaymentStore((s) => s.order);

  // Payment outcome for THIS wizard's order.
  useEffect(() => {
    if (!result || !paidOrder || paidOrder.id !== orderIdRef.current || !track) return;
    orderIdRef.current = undefined;
    if (result.outcome === 'success') {
      addCampaign({
        id: paidOrder.id,
        trackId: track.id,
        trackTitle: track.title,
        goal,
        budgetKgs: budget,
        durationDays: duration,
        estimatedReach: Math.round((estimate.reachLow + estimate.reachHigh) / 2),
        reachSoFar: 0,
        newFollowers: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        paymentRef: result.reference ?? paidOrder.id,
        simulatedPayment: result.simulated,
      });
      setPaymentRef(result.reference);
      setNotice(undefined);
      setStep('done');
    } else {
      setNotice(result.outcome === 'cancelled' ? t('paymentCancelledMsg') : t('paymentFailedMsg'));
    }
    usePaymentStore.getState().reset();
  }, [result, paidOrder, track, goal, budget, duration, estimate.reachLow, estimate.reachHigh, addCampaign, t]);

  async function pay() {
    if (!track) return;
    const order: PaymentOrder = {
      id: newOrderId('PROMO'),
      amountKgs: budget,
      currency: 'KGS',
      description: `${t('promoteTitle')}: «${track.title}» · ${t(GOAL_LABEL[goal])} · ${duration} ${t('daysWord')}`,
      purpose: 'promotion',
    };
    orderIdRef.current = order.id;
    setNotice(undefined);
    const session = await getMbankPaymentAdapter().createSession(order);
    usePaymentStore.getState().start(order);
    if (session.kind === 'redirect') {
      if (Platform.OS === 'web') window.location.assign(session.checkoutUrl);
      else void Linking.openURL(session.checkoutUrl);
      return;
    }
    router.push('/sheets/mbank-pay');
  }

  if (published.length === 0) {
    return (
      <ThemedView surface="canvas" style={styles.flex}>
        <View style={styles.content}>
          <ThemedText variant="body-md" emphasis="medium">{t('noPublishedForPromo')}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const stepIndex = STEPS.indexOf(step);
  const reachLabel = `${estimate.reachLow.toLocaleString('en-US')}–${estimate.reachHigh.toLocaleString('en-US')} ${t('listenersWord')}`;

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        {step !== 'done' && (
          <View style={styles.progressRow}>
            {STEPS.map((s, i) => (
              <View key={s} style={[styles.progressDot, i <= stepIndex && styles.progressDotOn]} />
            ))}
          </View>
        )}

        {step === 'song' && (
          <View style={styles.section}>
            <ThemedText variant="headline-md">{t('stepSong')}</ThemedText>
            {published.map((e) => {
              const selected = e.track.id === trackId;
              return (
                <PressableScale key={e.track.id} accessibilityRole="button" onPress={() => setTrackId(e.track.id)} style={[styles.option, selected && styles.optionOn]}>
                  <Artwork uri={e.track.coverUri} size={44} radius={Radii.DEFAULT} />
                  <ThemedText variant="label-lg" numberOfLines={1} style={styles.flexText}>{e.track.title}</ThemedText>
                  {selected && <Icon name="check-circle" size={22} color={Colors.primary} />}
                </PressableScale>
              );
            })}
          </View>
        )}

        {step === 'goal' && (
          <View style={styles.section}>
            <ThemedText variant="headline-md">{t('stepGoal')}</ThemedText>
            {PROMO_GOALS.map((g) => (
              <PressableScale key={g} accessibilityRole="button" onPress={() => setGoal(g)} style={[styles.option, g === goal && styles.optionOn]}>
                <Icon name={GOAL_ICON[g]} size={24} color={g === goal ? Colors.primary : Colors.text.medium} />
                <ThemedText variant="label-lg" style={styles.flexText}>{t(GOAL_LABEL[g])}</ThemedText>
                {g === goal && <Icon name="check-circle" size={22} color={Colors.primary} />}
              </PressableScale>
            ))}
          </View>
        )}

        {step === 'budget' && (
          <View style={styles.section}>
            <ThemedText variant="headline-md">{t('stepBudget')}</ThemedText>
            <View style={styles.chips}>
              {PROMO_BUDGETS_KGS.map((b) => (
                <Chip key={b} label={`${formatKgsAmount(b)} сом`} selected={b === budget} onPress={() => setBudget(b)} />
              ))}
            </View>
            <ThemedText variant="headline-md" style={styles.subHeading}>{t('stepDuration')}</ThemedText>
            <View style={styles.chips}>
              {PROMO_DURATIONS_DAYS.map((d) => (
                <Chip key={d} label={`${d} ${t('daysWord')}`} selected={d === duration} onPress={() => setDuration(d)} />
              ))}
            </View>
            <View style={styles.card}>
              <ThemedText variant="label-sm" emphasis="medium">{t('estimatedReachSimulated')}</ThemedText>
              <ThemedText variant="headline-md">{reachLabel}</ThemedText>
            </View>
          </View>
        )}

        {step === 'summary' && track && (
          <View style={styles.section}>
            <ThemedText variant="headline-md">{t('summaryTitle')}</ThemedText>
            <View style={styles.card}>
              <View style={styles.row}>
                <Artwork uri={track.coverUri} size={48} radius={Radii.DEFAULT} />
                <ThemedText variant="headline-sm" numberOfLines={1} style={styles.flexText}>{track.title}</ThemedText>
              </View>
              <SummaryLine label={t('stepGoal')} value={t(GOAL_LABEL[goal])} />
              <SummaryLine label={t('stepBudget')} value={`${formatKgsAmount(budget)} сом`} />
              <SummaryLine label={t('stepDuration')} value={`${duration} ${t('daysWord')}`} />
              <SummaryLine label={t('estimatedReachSimulated')} value={reachLabel} />
            </View>
            {notice && (
              <ThemedText variant="body-sm" style={{ color: Colors.error }} accessibilityRole="alert">
                {notice}
              </ThemedText>
            )}
            <DemoNotice text={t('mbankDemoNotice')} />
            <PillButton label={`${t('payWithMbank')} · ${formatKgsAmount(budget)} сом`} trailingIcon="arrow-forward" onPress={pay} />
          </View>
        )}

        {step === 'done' && (
          <View style={[styles.section, styles.doneBox]}>
            <Icon name="check-circle" size={56} color={Colors.tertiary} />
            <ThemedText variant="headline-lg">{t('campaignLaunched')}</ThemedText>
            {track && <ThemedText variant="body-md" emphasis="medium">«{track.title}» · {formatKgsAmount(budget)} сом · {duration} {t('daysWord')}</ThemedText>}
            <Badge label={t('paidViaMbankDemo')} />
            {paymentRef && <ThemedText variant="body-sm" emphasis="medium">{t('referenceLabel')}: {paymentRef}</ThemedText>}
            <DemoNotice text={t('demoPaymentNoCharge')} />
            <PillButton label={t('viewCampaigns')} onPress={() => router.replace('/profile/artist/dashboard/promotion')} style={styles.doneCta} />
          </View>
        )}

        {step !== 'done' && (
          <View style={styles.navRow}>
            {stepIndex > 0 ? <TextLinkButton label={t('backLabel')} tone="muted" onPress={() => setStep(STEPS[stepIndex - 1]!)} /> : <View />}
            {step !== 'summary' && <PillButton label={t('nextLabel')} trailingIcon="arrow-forward" disabled={!track} onPress={() => setStep(STEPS[stepIndex + 1]!)} />}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryLine}>
      <ThemedText variant="body-sm" emphasis="medium">{label}</ThemedText>
      <ThemedText variant="label-lg" style={styles.summaryValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.margin, gap: Spacing.lg, paddingBottom: Spacing.xl * 3 },
  progressRow: { flexDirection: 'row', gap: 6 },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.surface.l3 },
  progressDotOn: { backgroundColor: Colors.primary },
  section: { gap: Spacing.sm },
  subHeading: { marginTop: Spacing.sm },
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface.l1, borderRadius: Radii.md, padding: Spacing.sm, borderWidth: 1, borderColor: 'transparent' },
  optionOn: { borderColor: Colors.primary },
  flexText: { flex: 1, minWidth: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  card: { backgroundColor: Colors.surface.l1, borderRadius: Radii.lg, padding: Spacing.md, gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  summaryValue: { flexShrink: 1, textAlign: 'right' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  doneBox: { alignItems: 'center', paddingVertical: Spacing.lg },
  doneCta: { alignSelf: 'stretch', marginTop: Spacing.sm },
});
