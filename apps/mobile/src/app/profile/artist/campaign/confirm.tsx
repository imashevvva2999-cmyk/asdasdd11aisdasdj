import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DemoNotice } from '@/components/demo-notice';
import { S, SR, SS, SText, StitchHeader, alpha, usePromoStrings } from '@/components/promotion-stitch';
import { STITCH_GENRES } from '@/components/promotion-stitch/data/genres';
import { ConfirmPromoStrings } from '@/components/promotion-stitch/strings/confirm';
import { InteractionPromoStrings } from '@/components/promotion-stitch/strings/interactions';
import { KG_REGIONS } from '@/components/promotion-stitch/strings/setup-form';
import { StartDatePopover } from '@/components/promotion-stitch/start-date-popover';
import { Artwork, Icon } from '@/components/ui';
import { useToast } from '@/hooks/use-toast';
import { goBack } from '@/lib/navigation';
import { formatKgsAmount } from '@/lib/format-currency';
import { PROMO_PACKAGES } from '@/mocks/promotions';
import { useArtistStore } from '@/state/artist-store';
import { isValidStartDate, parseIsoDay, toIsoDay, useCampaignStore } from '@/state/campaign-store';
import { useDashboardStrings } from '@/state/dashboard-locale-store';
import { useAppStrings } from '@/state/locale-store';

const MONTHS = {
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
} as const;

const MBANK_GREEN = '#00c996';

function shortDate(date: Date, locale: 'en' | 'ru') {
  return locale === 'ru' ? `${date.getDate()} ${MONTHS.ru[date.getMonth()]}` : `${MONTHS.en[date.getMonth()]} ${date.getDate()}`;
}

/** Campaign wizard step 4/4 — Stitch "Campaign Preview & Payment"
 * (6._mbank_pay), ported 1:1. The pay button still only runs the local
 * campaign-store transition; no real MBANK charge happens. */
export default function CampaignConfirmScreen() {
  const { t, locale } = useDashboardStrings();
  const { t: tApp } = useAppStrings();
  const s = usePromoStrings(ConfirmPromoStrings);
  const entries = useArtistStore((st) => st.entries);
  const trackId = useCampaignStore((st) => st.trackId);
  const packageId = useCampaignStore((st) => st.packageId);
  const targetGenreIds = useCampaignStore((st) => st.targetGenreIds);
  const geoScope = useCampaignStore((st) => st.geoScope);
  const customRegionIds = useCampaignStore((st) => st.customRegionIds);
  const description = useCampaignStore((st) => st.description.trim());
  const startDate = useCampaignStore((st) => st.startDate);
  const setStartDate = useCampaignStore((st) => st.setStartDate);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [reachInfoOpen, setReachInfoOpen] = useState(false);
  const stage = useCampaignStore((st) => st.stage);
  const confirm = useCampaignStore((st) => st.confirm);
  const cancelPayment = useCampaignStore((st) => st.cancelPayment);
  const method = useCampaignStore((st) => st.paymentMethod);
  const setMethod = useCampaignStore((st) => st.setPaymentMethod);
  const paymentError = useCampaignStore((st) => st.paymentError);
  const walletBalanceKgs = useCampaignStore((st) => st.walletBalanceKgs);
  const si = usePromoStrings(InteractionPromoStrings);
  const { showToast, toast } = useToast();

  useEffect(() => {
    if (!trackId || !packageId) router.replace('/profile/artist/campaign/select-track');
  }, [trackId, packageId]);

  const track = entries.find((e) => e.track.id === trackId)?.track;
  const pkg = PROMO_PACKAGES.find((p) => p.id === packageId);

  if (!trackId || !track || !packageId || !pkg) {
    return <View style={styles.flex} />;
  }

  async function handleConfirm() {
    const outcome = await confirm(total);
    if (outcome === 'success') router.replace('/profile/artist/campaign/success');
  }

  function handleCancel() {
    cancelPayment();
    showToast(si.paymentCancelled, 'close');
  }

  function handleBack() {
    if (processing) cancelPayment();
    goBack('/profile/artist/campaign/setup');
  }

  const discount = Math.round(pkg.priceKgs * 0.15);
  const total = pkg.priceKgs - discount;
  const cashback = Math.round(total * 0.05);
  // Selected start day (today if none or no longer valid); end keeps the package duration.
  const startIso = startDate && isValidStartDate(startDate) ? startDate : toIsoDay(new Date());
  const start = parseIsoDay(startIso) ?? new Date();
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + pkg.durationDays);
  const customLabel = KG_REGIONS.filter((r) => customRegionIds.includes(r.id)).map((r) => r.label[locale]).join(', ');
  const geoLabel = { all: s.geoAll, bishkek: s.geoBishkek, 'bishkek-osh': s.geoBishkekOsh, custom: customLabel || s.geoCustom }[geoScope];
  const chips = STITCH_GENRES.filter((g) => targetGenreIds.includes(g.id));
  const processing = stage === 'processing';

  return (
    <View style={styles.flex}>
      <StitchHeader title={s.title} backLabel={tApp('backLabel')} onBack={handleBack} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.glowWrap} pointerEvents="none">
          <LinearGradient
            colors={[alpha(S.primary, 0.2), alpha(S.tertiaryContainer, 0.1), 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.glow}
          />
        </View>

        <View style={styles.content}>
          {/* Progress stepper */}
          <View style={styles.stepper}>
            <View style={styles.stepLeft}>
              <View style={styles.stepDot} />
              <SText v="label-md" color={S.primary} style={styles.trackingWide}>
                {s.step}
              </SText>
            </View>
            <View style={styles.stepBars}>
              <View style={[styles.stepBar, { width: 20 }]} />
              <View style={[styles.stepBar, { width: 20 }]} />
              <View style={[styles.stepBar, { width: 20 }]} />
              <View style={[styles.stepBar, styles.stepBarActive]} />
            </View>
            <SText v="mono-num" color={S.outline} style={styles.upperWider}>
              {s.final}
            </SText>
          </View>

          {/* 1. Campaign summary card */}
          <View style={styles.summaryCard}>
            <View style={styles.releaseHeader}>
              <View style={styles.rowBetween}>
                <SText v="label-sm" color={S.outline} style={styles.upperWider}>
                  {s.promotedRelease}
                </SText>
                <View style={styles.studioChip}>
                  <Icon name="graphic-eq" size={13} color={S.tertiary} />
                  <SText v="label-sm" color={S.tertiary}>
                    {s.studioChip}
                  </SText>
                </View>
              </View>
              <View style={styles.releaseRow}>
                <View style={styles.cover}>
                  <Artwork uri={track.coverUri} size={64} radius={SR.lg} />
                  <LinearGradient colors={['transparent', 'transparent', alpha(S.black, 0.5)]} style={StyleSheet.absoluteFill} pointerEvents="none" />
                </View>
                <View style={styles.releaseText}>
                  <SText v="headline-sm" numberOfLines={1}>
                    {track.title}
                  </SText>
                  <SText v="body-md" color={S.outline} numberOfLines={1}>
                    {track.artistName}
                  </SText>
                  <View style={styles.releaseMeta}>
                    <View style={styles.singleChip}>
                      <SText v="label-sm" color={S.onSurfaceVariant}>
                        {s.single} • {start.getFullYear()}
                      </SText>
                    </View>
                  </View>
                  {description.length > 0 && (
                    <SText v="body-sm" color={S.onSurfaceVariant} numberOfLines={2} style={styles.descLine}>
                      «{description}»
                    </SText>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.specs}>
              <View style={styles.specGrid}>
                <View style={styles.specCell}>
                  <SText v="label-sm" color={S.outline}>
                    {s.tariffPlan}
                  </SText>
                  <View style={styles.specValue}>
                    <Icon name="bolt" size={16} color={S.secondary} />
                    <SText v="label-lg">
                      {pkg.name} ({pkg.durationDays} {s.days})
                    </SText>
                  </View>
                </View>
                <View style={styles.specCell}>
                  <SText v="label-sm" color={S.outline}>
                    {s.showPeriod}
                  </SText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={s.periodEditLabel}
                    disabled={processing}
                    onPress={() => setCalendarOpen(true)}
                    style={({ pressed }) => [styles.specValue, styles.periodButton, pressed && styles.pressedDim]}
                  >
                    <Icon name="date-range" size={16} color={S.tertiary} />
                    <SText v="label-lg">
                      {shortDate(start, locale)} — {shortDate(end, locale)}
                    </SText>
                    <Icon name="expand-more" size={16} color={S.outline} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.audienceCard}>
                <View style={styles.rowBetween}>
                  <SText v="label-sm" color={S.outline}>
                    {s.audienceGeo}
                  </SText>
                  <Icon name="tune" size={16} color={S.outline} />
                </View>
                <SText v="body-md">
                  {geoLabel}
                  {s.ageRange}
                </SText>
                {chips.length > 0 && (
                  <View style={styles.chipRow}>
                    {chips.map((g) => (
                      <View key={g.id} style={styles.genreChip}>
                        <SText v="label-sm" color={S.onSurfaceVariant}>
                          {g.chip[locale]}
                        </SText>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <LinearGradient
                colors={[S.surfaceContainerHigh, S.surfaceContainer, S.surfaceContainerHigh]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.forecast}
              >
                <View style={styles.forecastText}>
                  <SText v="label-sm" color={S.outline}>
                    {s.reachForecast}
                  </SText>
                  <SText v="headline-sm" color={S.secondary} style={styles.trackingTight}>
                    ~{pkg.forecastLow.toLocaleString('ru-RU')} – {pkg.forecastHigh.toLocaleString('ru-RU')}
                  </SText>
                  <SText v="body-sm" color={S.outline}>
                    {s.reachSub}
                  </SText>
                  {reachInfoOpen && (
                    <SText v="body-sm" color={S.onSurfaceVariant} style={styles.reachInfo}>
                      {s.reachInfo}
                    </SText>
                  )}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={s.reachInfoLabel}
                  accessibilityState={{ expanded: reachInfoOpen }}
                  onPress={() => setReachInfoOpen((v) => !v)}
                  hitSlop={8}
                  style={styles.forecastIcon}
                >
                  <Icon name="info-outline" size={18} color={S.outline} />
                </Pressable>
              </LinearGradient>
            </View>
          </View>

          {/* 2. Cost breakdown */}
          <View style={styles.costCard}>
            <View style={styles.rowBetween}>
              <SText v="headline-sm">{s.costBreakdown}</SText>
              <SText v="label-sm" color={S.outline}>
                {s.kgs}
              </SText>
            </View>
            <View style={styles.costRows}>
              <View style={styles.rowBetween}>
                <SText v="body-md" color={S.outline}>
                  {s.tariffCost} ({pkg.durationDays} {s.days})
                </SText>
                <SText v="mono-num" size={13} weight="600">
                  {formatKgsAmount(pkg.priceKgs)} {s.som}
                </SText>
              </View>
              <View style={styles.rowBetween}>
                <View style={styles.discountLabel}>
                  <SText v="body-md" color={S.outline}>
                    {s.discount}
                  </SText>
                  <View style={styles.promoBadge}>
                    <SText v="label-sm" color={S.primary}>
                      {s.promo}
                    </SText>
                  </View>
                </View>
                <SText v="mono-num" size={13} weight="600" color={S.primary}>
                  -{formatKgsAmount(discount)} {s.som}
                </SText>
              </View>
              <View style={styles.rowBetween}>
                <SText v="body-md" color={S.outline}>
                  {s.commission}
                </SText>
                <SText v="mono-num" size={13} weight="600" color={S.secondary}>
                  0 {s.som}
                </SText>
              </View>
              <View style={styles.totalCard}>
                <View>
                  <SText v="label-md" color={S.outline}>
                    {s.totalToPay}
                  </SText>
                  <SText v="body-sm" color={S.outline}>
                    {s.taxesIncluded}
                  </SText>
                </View>
                <View style={styles.totalValue}>
                  <SText v="headline-lg" style={styles.trackingTight}>
                    {formatKgsAmount(total)}
                  </SText>
                  <SText v="label-lg" color={S.primary}>
                    {s.som}
                  </SText>
                </View>
              </View>
            </View>
          </View>

          {/* 3. Payment method */}
          <View style={styles.methods}>
            <View style={styles.rowBetween}>
              <SText v="headline-sm">{s.paymentMethod}</SText>
              <SText v="label-sm" color={S.primary}>
                {s.gatewaySecured}
              </SText>
            </View>

            <Pressable accessibilityRole="radio" accessibilityState={{ selected: method === 'mbank' }} onPress={() => setMethod('mbank')}>
              <LinearGradient
                colors={method === 'mbank' ? [S.surfaceContainerHigh, S.surfaceContainer] : [S.surfaceContainerLow, S.surfaceContainerLow]}
                style={[styles.mbankCard, method === 'mbank' && styles.mbankCardActive]}
              >
                {method === 'mbank' && (
                  <LinearGradient
                    colors={[S.secondary, S.primaryContainer, S.secondary]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.accentStrip}
                  />
                )}
                <View style={styles.mbankRow}>
                  <View style={styles.mbankLeft}>
                    <View style={styles.mbankLogo}>
                      <View style={styles.logoBars}>
                        <View style={[styles.logoBar, { height: 14, backgroundColor: MBANK_GREEN }]} />
                        <View style={[styles.logoBar, { height: 24, backgroundColor: MBANK_GREEN }]} />
                        <View style={[styles.logoBar, { height: 18, backgroundColor: S.secondary }]} />
                        <View style={styles.logoLast}>
                          <View style={[styles.logoDot, { backgroundColor: S.secondary }]} />
                          <View style={[styles.logoBar, { height: 12, backgroundColor: MBANK_GREEN }]} />
                        </View>
                      </View>
                    </View>
                    <View style={styles.flexShrink}>
                      <View style={styles.mbankTitleRow}>
                        <SText v="headline-sm">{s.mbankPay}</SText>
                      </View>
                      <SText v="body-md" color={S.outline} numberOfLines={1}>
                        {s.balance}
                      </SText>
                      <View style={styles.cashback}>
                        <Icon name="stars" size={15} color={S.secondary} />
                        <SText v="label-sm" color={S.secondary} style={styles.flexShrink}>
                          {s.cashbackPrefix}
                          {formatKgsAmount(cashback)}
                          {s.cashbackSuffix}
                        </SText>
                      </View>
                    </View>
                  </View>
                  {method === 'mbank' ? (
                    <View style={styles.radioOn}>
                      <Icon name="check" size={16} color={S.onPrimary} />
                    </View>
                  ) : (
                    <View style={styles.radioOff} />
                  )}
                </View>
              </LinearGradient>
            </Pressable>

            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: method === 'wallet' }}
              onPress={() => setMethod('wallet')}
              style={[styles.walletCard, method === 'wallet' && styles.walletCardActive]}
            >
              <View style={styles.walletLeft}>
                <View style={styles.walletIcon}>
                  <Icon name="account-balance-wallet" size={22} color={S.outline} />
                </View>
                <View style={styles.flexShrink}>
                  <SText v="label-lg" numberOfLines={1}>
                    {s.studioWallet}
                  </SText>
                  <SText v="body-sm" color={S.outline}>
                    {si.walletAvailablePrefix}
                    {walletBalanceKgs.toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US')} {si.currency}
                  </SText>
                </View>
              </View>
              {method === 'wallet' ? (
                <View style={[styles.radioOn, { width: 20, height: 20 }]}>
                  <Icon name="check" size={14} color={S.onPrimary} />
                </View>
              ) : (
                <View style={styles.radioOff} />
              )}
            </Pressable>
          </View>

          {/* Quick-pay micro card */}
          <LinearGradient
            colors={[alpha(S.surfaceContainerHigh, 0.9), alpha(S.surfaceContainer, 0.9)]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.quickPay}
          >
            <View style={styles.quickLeft}>
              <Icon name="touch-app" size={22} color={S.secondary} />
              <View>
                <SText v="label-md">{s.quickPay}</SText>
                <SText v="body-sm" color={S.outline}>
                  {s.quickPayHint}
                </SText>
              </View>
            </View>
            <Icon name="verified-user" size={20} color={S.outline} />
          </LinearGradient>

          {/* 4. Primary MBANK action */}
          <View style={styles.actions}>
            {paymentError === 'insufficientWallet' && (
              <SText v="body-sm" color={S.error} style={styles.footer} accessibilityRole="alert">
                {si.insufficientWallet}
              </SText>
            )}
            <DemoNotice text={t('campaignDemoNoticeLabel')} />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: processing, busy: processing }}
              disabled={processing}
              onPress={handleConfirm}
              style={styles.payShadow}
            >
              <LinearGradient
                colors={[S.primaryContainer, S.tertiaryContainer, S.secondaryContainer]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.payButton}
              >
                {processing ? <ActivityIndicator size="small" color={S.white} /> : <Icon name="lock" size={22} color={S.white} />}
                <SText v="headline-sm" color={S.white}>
                  {s.payPrefix} {formatKgsAmount(total)} {s.paySuffix}
                </SText>
              </LinearGradient>
            </Pressable>
            {processing ? (
              <Pressable accessibilityRole="button" onPress={handleCancel} hitSlop={8}>
                <SText v="label-md" color={S.primary} style={styles.footer}>
                  {si.cancelPayment}
                </SText>
              </Pressable>
            ) : (
              <SText v="body-sm" color={S.outline} style={styles.footer}>
                {s.footer}
              </SText>
            )}
          </View>
        </View>
      </ScrollView>
      <StartDatePopover
        visible={calendarOpen}
        value={startIso}
        durationDays={pkg.durationDays}
        locale={locale}
        labels={{ title: s.calTitle, ends: s.calEnds, cancel: s.calCancel, apply: s.calApply, prevMonth: s.calPrevMonth, nextMonth: s.calNextMonth, prevYear: s.calPrevYear, nextYear: s.calNextYear, weekdays: s.calWeekdays }}
        onApply={setStartDate}
        onClose={() => setCalendarOpen(false)}
      />
      {toast}
    </View>
  );
}

const styles = StyleSheet.create({
  descLine: { marginTop: 6 },
  flex: { flex: 1, backgroundColor: S.surface },
  flexShrink: { flexShrink: 1, minWidth: 0 },
  scroll: { paddingBottom: SS.xl },
  glowWrap: { position: 'absolute', top: -64, left: 0, right: 0, alignItems: 'center' },
  glow: { width: 320, height: 176, borderRadius: SR.full, opacity: 0.9 },
  content: { paddingHorizontal: SS.margin, paddingTop: SS.md, gap: SS.lg },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SS.sm },
  trackingWide: { letterSpacing: 0.025 * 12 },
  trackingTight: { letterSpacing: -0.025 * 18 },
  upperWider: { textTransform: 'uppercase', letterSpacing: 0.05 * 10 },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: alpha(S.surfaceContainer, 0.6),
    paddingHorizontal: SS.md,
    paddingVertical: SS.sm,
    borderRadius: SR.full,
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    shadowOpacity: 0.35,
  },
  stepLeft: { flexDirection: 'row', alignItems: 'center', gap: SS.xs },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: S.primaryContainer },
  stepBars: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBar: { height: 6, borderRadius: 3, backgroundColor: S.primaryContainer },
  stepBarActive: {
    width: 28,
    backgroundColor: S.primary,
    shadowColor: S.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.6,
  },

  summaryCard: {
    backgroundColor: S.surfaceContainer,
    borderRadius: SR.xl,
    overflow: 'hidden',
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 32,
    shadowOpacity: 0.65,
  },
  releaseHeader: { padding: SS.lg, backgroundColor: alpha(S.surfaceContainerHigh, 0.6), gap: SS.md },
  studioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: SR.full,
    backgroundColor: S.surfaceVariant,
  },
  releaseRow: { flexDirection: 'row', alignItems: 'center', gap: SS.md },
  cover: {
    width: 64,
    height: 64,
    borderRadius: SR.lg,
    overflow: 'hidden',
    shadowColor: S.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    shadowOpacity: 0.25,
  },
  releaseText: { flex: 1, minWidth: 0 },
  releaseMeta: { flexDirection: 'row', alignItems: 'center', gap: SS.xs, marginTop: 4 },
  singleChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: SR.DEFAULT, backgroundColor: S.surfaceContainerHighest },

  specs: { padding: SS.lg, gap: SS.md },
  specGrid: { flexDirection: 'row', gap: SS.sm },
  specCell: { flex: 1, backgroundColor: S.surfaceContainerLow, padding: SS.md, borderRadius: SR.lg, gap: 4 },
  specValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  audienceCard: { backgroundColor: S.surfaceContainerLow, padding: SS.md, borderRadius: SR.lg, gap: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  genreChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: SR.full, backgroundColor: S.surfaceVariant },
  forecast: { padding: SS.md, borderRadius: SR.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  forecastText: { gap: 2, flexShrink: 1 },
  forecastIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  reachInfo: { marginTop: 6 },
  periodButton: { alignSelf: 'flex-start' },
  pressedDim: { opacity: 0.7 },

  costCard: {
    backgroundColor: S.surfaceContainer,
    borderRadius: SR.xl,
    padding: SS.lg,
    gap: SS.md,
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    shadowOpacity: 0.5,
  },
  costRows: { gap: 10 },
  discountLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  promoBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: SR.DEFAULT, backgroundColor: alpha(S.primaryContainer, 0.2) },
  totalCard: {
    marginTop: 8,
    padding: SS.md,
    borderRadius: SR.lg,
    backgroundColor: alpha(S.surfaceContainerLowest, 0.8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalValue: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },

  methods: { gap: SS.md },
  mbankCard: {
    padding: SS.md,
    borderRadius: SR.xl,
    overflow: 'hidden',
  },
  mbankCardActive: {
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 20,
    shadowOpacity: 0.6,
  },
  accentStrip: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  mbankRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SS.md, marginTop: 4 },
  mbankLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: SS.md, flexShrink: 1, minWidth: 0 },
  mbankLogo: {
    width: 48,
    height: 48,
    borderRadius: SR.xl,
    backgroundColor: S.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 24 },
  logoBar: { width: 6, borderRadius: 3 },
  logoLast: { alignItems: 'center', gap: 0 },
  logoDot: { width: 6, height: 6, borderRadius: 3, position: 'absolute', top: -6 },
  mbankTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cashback: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  radioOn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: S.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: S.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.4,
  },
  radioOff: { width: 20, height: 20, borderRadius: 10, backgroundColor: S.surfaceContainerHighest },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SS.md,
    borderRadius: SR.xl,
    backgroundColor: S.surfaceContainerLow,
  },
  walletCardActive: { backgroundColor: S.surfaceContainer },
  walletLeft: { flexDirection: 'row', alignItems: 'center', gap: SS.md, flexShrink: 1, minWidth: 0 },
  walletIcon: { width: 44, height: 44, borderRadius: SR.lg, backgroundColor: S.surfaceVariant, alignItems: 'center', justifyContent: 'center' },

  quickPay: {
    padding: SS.md,
    borderRadius: SR.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    shadowOpacity: 0.4,
  },
  quickLeft: { flexDirection: 'row', alignItems: 'center', gap: SS.sm, flexShrink: 1 },

  actions: { gap: SS.sm, paddingTop: SS.xs },
  payShadow: {
    borderRadius: SR.full,
    shadowColor: S.primaryContainer,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 28,
    shadowOpacity: 0.4,
  },
  payButton: { height: 56, borderRadius: SR.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  footer: { textAlign: 'center', paddingHorizontal: SS.md, lineHeight: 20 },
});
