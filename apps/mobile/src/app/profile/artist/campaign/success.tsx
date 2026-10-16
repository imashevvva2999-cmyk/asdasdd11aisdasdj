import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { DemoNotice } from '@/components/demo-notice';
import { S, SR, SS, SText, alpha, usePromoStrings } from '@/components/promotion-stitch';
import { SuccessPromoStrings } from '@/components/promotion-stitch/strings/success';
import { Icon } from '@/components/ui';
import { PROMO_PACKAGES } from '@/mocks/promotions';
import { useArtistStore } from '@/state/artist-store';
import { useCampaignStore } from '@/state/campaign-store';
import { useDashboardStrings } from '@/state/dashboard-locale-store';

/** Campaign wizard terminal screen — Stitch screen 7 ("Продвижение создано!"),
 * reproduced 1:1 from stitch_artist-promotion/7./code.html. The moderation
 * status and "what happens next" steps are the Stitch demo copy; the existing
 * DemoNotice line still states that no real campaign is submitted. */
export default function CampaignSuccessScreen() {
  const { t } = useDashboardStrings();
  const s = usePromoStrings(SuccessPromoStrings);
  const insets = useSafeAreaInsets();
  const entries = useArtistStore((st) => st.entries);
  const launched = useCampaignStore((st) => st.launched);

  const latest = launched[0];
  const track = latest ? entries.find((e) => e.track.id === latest.trackId)?.track : undefined;
  const pkg = latest ? PROMO_PACKAGES.find((p) => p.id === latest.packageId) : undefined;

  // Dismiss to the dashboard's own stack screen (Promotion is a tab inside it).
  // No draft reset here: the wizard screens still mounted underneath redirect
  // to track selection when their draft disappears, which hijacked this
  // navigation. A finished ('success') draft is replaced by the next
  // startCampaign() anyway.
  function backToDashboard() {
    router.dismissTo('/profile/artist/dashboard' as Href);
  }

  if (!latest || !track || !pkg) {
    return (
      <View style={[styles.flex, styles.emptyWrap, { paddingTop: insets.top }]}>
        <SText v="body-md" color={S.onSurfaceVariant} style={styles.center}>
          {t('nothingJustLaunchedLabel')}
        </SText>
        <Pressable accessibilityRole="button" onPress={() => router.dismissTo('/profile/artist/dashboard' as Href)} style={styles.backLink}>
          <SText v="label-md" color={S.onSurfaceVariant}>
            {t('backToStudioDashboardLabel')}
          </SText>
        </Pressable>
      </View>
    );
  }

  const digits = latest.id.replace(/\D/g, '');
  const campaignCode = `#PR-${digits.slice(-4)}-MM`;
  const paid = pkg.priceKgs - Math.round(pkg.priceKgs * 0.15);

  const specs = [
    { icon: 'tag', label: s.campaign },
    { icon: 'rocket-launch', label: s.tariff },
    { icon: 'account-balance-wallet', label: s.payment },
    { icon: 'schedule', label: s.start },
  ];

  return (
    <View style={[styles.flex, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top dismiss bar */}
        <View style={styles.topBar}>
          <View style={styles.hubRow}>
            <View style={styles.hubDot} />
            <SText v="mono-num" color={S.onSurfaceVariant} style={styles.hubText}>
              {s.releaseHub}
            </SText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={s.close} onPress={backToDashboard} style={styles.closeBtn}>
            <Icon name="close" size={20} color={S.onSurface} />
          </Pressable>
        </View>

        {/* Nebula rings */}
        <View style={styles.hero}>
          <View style={styles.ringsBox}>
            <LinearGradient
              colors={[alpha(S.primaryContainer, 0.2), alpha(S.secondaryContainer, 0.1), 'transparent']}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={styles.pulse}
            />
            <View style={styles.ring1}>
              <View style={styles.ring2}>
                <LinearGradient
                  colors={[S.primaryContainer, S.tertiaryContainer, S.secondary]}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.checkCircle}
                >
                  <Icon name="check" size={44} color={S.onPrimaryContainer} />
                  <View style={styles.particle}>
                    <Icon name="auto-awesome" size={10} color={S.onSecondary} />
                  </View>
                </LinearGradient>
              </View>
            </View>
            <Svg viewBox="0 0 200 200" style={styles.ticks} pointerEvents="none">
              <Circle cx={100} cy={100} r={92} fill="none" stroke={S.primary} strokeDasharray="2 8" strokeWidth={1.5} />
              <Circle cx={100} cy={100} r={82} fill="none" stroke={S.secondary} strokeDasharray="1 6" strokeWidth={1} />
            </Svg>
          </View>

          <SText v="headline-lg" style={styles.title}>
            {s.title}
          </SText>
          <SText v="body-md" color={S.onSurfaceVariant} style={styles.body}>
            {s.bodyBefore}{' '}
            <SText v="body-md" weight="500" color={S.primary}>
              {`«${track.title}»`}
            </SText>{' '}
            {s.bodyAfter}
          </SText>
        </View>

        {/* Status & meta card */}
        <View style={styles.statusCard}>
          <LinearGradient
            colors={['transparent', alpha(S.primary, 0.3), 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topLine}
          />
          <View style={styles.pill}>
            <View style={styles.pillLeft}>
              <View style={styles.liveDotWrap}>
                <View style={styles.liveDotHalo} />
                <View style={styles.liveDot} />
              </View>
              <SText v="label-md" color={S.secondaryFixed}>
                {s.moderation}
              </SText>
            </View>
            <SText v="mono-num" color={S.onSurfaceVariant}>
              {s.moderationEta}
            </SText>
          </View>

          <View style={styles.specs}>
            {specs.map((spec, i) => (
              <View key={spec.icon} style={styles.specRow}>
                <View style={styles.specLabel}>
                  <Icon name={spec.icon} size={16} color={S.onSurfaceVariant} />
                  <SText v="body-sm" color={S.onSurfaceVariant}>
                    {spec.label}
                  </SText>
                </View>
                {i === 0 && (
                  <SText v="mono-num" weight="600" style={styles.code}>
                    {campaignCode}
                  </SText>
                )}
                {i === 1 && (
                  <SText v="label-md">
                    {pkg.name} • {pkg.durationDays} {s.rotationDays}
                  </SText>
                )}
                {i === 2 && (
                  <View style={styles.payValue}>
                    <SText v="label-md">{`${paid.toLocaleString('ru-RU')} сом • MBANK`}</SText>
                    <Icon name="verified" size={14} color={S.primary} />
                  </View>
                )}
                {i === 3 && <SText v="body-sm">{s.startValue}</SText>}
              </View>
            ))}
          </View>
        </View>

        <DemoNotice text={t('campaignDemoNoticeLabel')} style={styles.demo} />

        {/* What happens next */}
        <View style={styles.nextCard}>
          <View style={styles.nextHeader}>
            <Icon name="stream" size={18} color={S.tertiary} />
            <SText v="headline-sm">{s.nextTitle}</SText>
          </View>
          <View style={styles.steps}>
            <Step n={1}>
              {s.step1Before}{' '}
              <SText v="body-md" weight="500" color={S.tertiary}>
                {s.step1Accent}
              </SText>
              .
            </Step>
            <Step n={2}>
              {s.step2Before}{' '}
              <SText v="body-md" weight="500">
                {s.step2Accent}
              </SText>{' '}
              {s.step2After}
            </Step>
            <Step n={3}>
              {s.step3Before}{' '}
              <SText v="body-md" weight="500" color={S.secondaryFixed}>
                {s.step3Accent}
              </SText>
              .
            </Step>
          </View>
        </View>

        {/* CTA */}
        <View style={styles.ctaArea}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/profile/artist/campaign/statistics')}
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          >
            <Icon name="insights" size={20} color={S.onPrimaryContainer} />
            <SText v="label-lg" color={S.onPrimaryContainer}>
              {s.viewAnalytics}
            </SText>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={backToDashboard} style={styles.backLink}>
            <SText v="label-md" color={S.onSurfaceVariant}>
              {s.backToDashboard}
            </SText>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <SText v="mono-num" color={S.primary}>
          {n}
        </SText>
      </View>
      <SText v="body-md" style={styles.stepText}>
        {children}
      </SText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: S.surface },
  emptyWrap: { alignItems: 'center', padding: SS.margin, gap: SS.sm },
  center: { textAlign: 'center' },
  content: { paddingHorizontal: SS.margin, paddingBottom: SS.xl },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SS.md },
  hubRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hubDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: S.secondary },
  hubText: { textTransform: 'uppercase', letterSpacing: 0.1 * 11 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: S.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', marginTop: 8, marginBottom: 24, overflow: 'hidden' },
  ringsBox: { width: 224, height: 224, marginVertical: 8, alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: SR.full, opacity: 0.9 },
  ring1: {
    position: 'absolute',
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: alpha(S.surfaceContainerHigh, 0.4),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 25 },
    shadowRadius: 50,
    shadowOpacity: 0.25,
  },
  ring2: { width: 144, height: 144, borderRadius: 72, backgroundColor: alpha(S.surfaceContainer, 0.6), alignItems: 'center', justifyContent: 'center' },
  checkCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 15,
    shadowOpacity: 0.1,
  },
  particle: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: S.secondaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    shadowOpacity: 0.1,
  },
  ticks: { position: 'absolute', top: 0, left: 0, width: 224, height: 224, opacity: 0.4 },
  title: { marginTop: 8, marginBottom: 8, textAlign: 'center', letterSpacing: -0.025 * 24 },
  body: { maxWidth: 320, textAlign: 'center', lineHeight: 23 },
  statusCard: {
    backgroundColor: S.surfaceContainerLow,
    borderRadius: SR.xl,
    padding: SS.lg,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 25,
    shadowOpacity: 0.1,
  },
  topLine: { position: 'absolute', left: 0, right: 0, top: 0, height: 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: alpha(S.surfaceContainer, 0.5),
    paddingHorizontal: SS.md,
    paddingTop: SS.sm,
    paddingBottom: SS.md,
    borderRadius: SR.lg,
    marginBottom: SS.md,
  },
  pillLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDotWrap: { width: 10, height: 10, alignItems: 'center', justifyContent: 'center' },
  liveDotHalo: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: S.secondary, opacity: 0.4 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: S.secondary },
  specs: { gap: 12 },
  specRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SS.sm },
  specLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  code: { letterSpacing: 0.025 * 11 },
  payValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  demo: { marginBottom: 16 },
  nextCard: {
    backgroundColor: S.surfaceContainerLowest,
    borderRadius: SR.xl,
    padding: SS.lg,
    marginBottom: 24,
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    shadowOpacity: 0.1,
  },
  nextHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SS.md },
  steps: { gap: 16 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: S.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  stepText: { flex: 1, lineHeight: 19 },
  ctaArea: { alignItems: 'center', gap: 12 },
  cta: {
    width: '100%',
    height: 56,
    borderRadius: SR.full,
    backgroundColor: S.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 15,
    shadowOpacity: 0.1,
  },
  pressed: { transform: [{ scale: 0.95 }] },
  backLink: { width: '100%', paddingVertical: SS.sm, alignItems: 'center' },
});
