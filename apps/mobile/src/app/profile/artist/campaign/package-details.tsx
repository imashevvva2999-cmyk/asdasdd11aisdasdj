import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { S, SR, SText, alpha, usePromoStrings } from '@/components/promotion-stitch';
import { PACKAGE_DETAILS } from '@/components/promotion-stitch/data/package-details';
import { PackageDetailsPromoStrings } from '@/components/promotion-stitch/strings/package-details';
import { Artwork, Icon, SheetScreen } from '@/components/ui';
import { DemoStrings } from '@/demo/demo-strings';
import { artistBase, useIsGuestPreview } from '@/demo/guest-mode';
import { useToast } from '@/hooks/use-toast';
import { goBack } from '@/lib/navigation';
import { formatKgsAmount } from '@/lib/format-currency';
import { PROMO_PACKAGES, type PromoPackage } from '@/mocks/promotions';
import { useArtistStore } from '@/state/artist-store';
import { useCampaignStore } from '@/state/campaign-store';
import { useLocaleStore } from '@/state/locale-store';

function formatK(n: number) {
  return n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`;
}

/** "Инвестиция в трек" block: label left, ⚡ per-day chip right (vertically
 * centered), then the large price over the duration — Stitch screen 4. */
function InvestmentBlock({ pkg, s, locale }: { pkg: PromoPackage; s: Record<keyof (typeof PackageDetailsPromoStrings)['en'], string>; locale: 'en' | 'ru' }) {
  return (
    <View style={styles.investBlock}>
      <View style={styles.investRow}>
        <SText v="label-sm" weight="500" color={S.onSurfaceVariant} numberOfLines={1} style={styles.investLabel}>
          {s.investment.toUpperCase()}
        </SText>
        <View style={styles.perDayChip}>
          <Icon name="bolt" size={14} color={S.secondary} />
          <SText v="mono-num" weight="600" color={S.secondary} numberOfLines={1}>
            {pkg.perDayLabel?.[locale] ?? s.free}
          </SText>
        </View>
      </View>
      <View style={styles.priceRow}>
        <SText v="headline-lg" weight="800" size={28} numberOfLines={1} style={styles.priceText}>
          {formatKgsAmount(pkg.priceKgs)} {s.currency}
        </SText>
        <SText v="body-sm" color={S.onSurfaceVariant} numberOfLines={1}>
          / {pkg.durationDays > 0 ? `${pkg.durationDays} ${s.daysSuffix}` : s.noLimit}
        </SText>
      </View>
    </View>
  );
}

/** Campaign wizard — Stitch "Package details" bottom sheet (screen 4),
 * opened from the package cards. */
export default function PackageDetailsSheet() {
  const { packageId } = useLocalSearchParams<{ packageId?: string }>();
  const s = usePromoStrings(PackageDetailsPromoStrings);
  // Guest preview: details are readable; selecting the package is refused.
  const guest = useIsGuestPreview();
  const base = artistBase(guest);
  const { showToast, toast } = useToast();
  const locale = useLocaleStore((st) => st.locale);
  const insets = useSafeAreaInsets();
  const entries = useArtistStore((st) => st.entries);
  const artist = useArtistStore((st) => st.artist);
  const trackId = useCampaignStore((st) => st.trackId);
  const selectPackage = useCampaignStore((st) => st.selectPackage);

  const pkg = PROMO_PACKAGES.find((p) => p.id === packageId);
  const track = entries.find((e) => e.track.id === trackId)?.track;

  if (!pkg) {
    // Cold export / no ?packageId= yet — neutral shell, same convention as
    // sheets/add-to-playlist.html.
    return <SheetScreen>{null}</SheetScreen>;
  }

  const detail = PACKAGE_DETAILS[pkg.id];
  const genreLine = artist?.genres?.length ? ` • ${artist.genres.join(' & ')}` : '';

  return (
    <View style={styles.root}>
      <Pressable accessibilityRole="button" accessibilityLabel={s.close} style={StyleSheet.absoluteFill} onPress={() => goBack(`${base.campaign}/select-package` as Href)}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.scrim} />
      </Pressable>

      <View style={styles.sheet}>
        <View pointerEvents="none" style={styles.halo} />

        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.badge}>
              <SText v="label-sm" color={S.onPrimaryContainer} style={styles.badgeText}>
                {s.badge.toUpperCase()}
              </SText>
            </View>
            <SText v="headline-sm" weight="600" numberOfLines={1} style={styles.title}>
              {s.packagePrefix} {pkg.name} {s.titleSuffix}
            </SText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={s.close} onPress={() => goBack(`${base.campaign}/select-package` as Href)} style={styles.closeBtn}>
            <Icon name="close" size={18} color={S.onSurface} />
          </Pressable>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <InvestmentBlock pkg={pkg} s={s} locale={locale} />
            <View style={styles.heroFooter}>
              <View style={styles.heroPopularity}>
                <Icon name="local-fire-department" size={16} color={S.tertiary} />
                <SText v="body-sm" weight="500" color={S.tertiary} numberOfLines={1} style={styles.shrink}>
                  {detail.popularity[locale]}
                </SText>
              </View>
              <View style={styles.roiPill}>
                <SText v="mono-num" weight="500" color={S.secondary}>
                  {detail.roi}
                </SText>
              </View>
            </View>
          </View>

          {track && (
            <View style={styles.trackCard}>
              <View style={styles.trackLeft}>
                <View style={styles.coverWrap}>
                  <LinearGradient
                    colors={[S.tertiaryContainer, S.surfaceContainerHighest, S.surfaceContainerLowest]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={[StyleSheet.absoluteFill, styles.coverImage]}>
                    <Artwork uri={track.coverUri} size={48} radius={SR.xl} />
                  </View>
                  <View style={[StyleSheet.absoluteFill, styles.coverOverlay]}>
                    <Icon name="graphic-eq" size={20} color={S.primary} />
                  </View>
                </View>
                <View style={styles.shrink}>
                  <SText v="label-sm" weight="700" color={S.primary} style={styles.upper}>
                    {s.selectedTrack.toUpperCase()}
                  </SText>
                  <SText v="headline-sm" weight="600" numberOfLines={1}>
                    {track.title}
                  </SText>
                  <SText v="body-sm" color={S.onSurfaceVariant} numberOfLines={1}>
                    {track.artistName}
                    {genreLine}
                  </SText>
                </View>
              </View>
              <Pressable accessibilityRole="button" onPress={() => goBack(`${base.campaign}/select-package` as Href)} style={styles.changeBtn}>
                <SText v="label-md">{s.change}</SText>
              </Pressable>
            </View>
          )}

          <View style={styles.section}>
            <SText v="headline-sm" weight="700" style={styles.sectionTitle}>
              {s.featuresTitle}
            </SText>
            <View style={styles.featureList}>
              {detail.features.map((f) => (
                <View key={f.title.en} style={styles.featureCard}>
                  <View style={styles.checkCircle}>
                    <Icon name="check" size={16} color={S.onPrimaryContainer} />
                  </View>
                  <View style={styles.shrink}>
                    <SText v="label-lg" weight="500">
                      {f.title[locale]}
                    </SText>
                    <SText v="body-sm" color={S.onSurfaceVariant}>
                      {f.body[locale]}
                    </SText>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <SText v="headline-sm" weight="700" style={styles.sectionTitle}>
                {s.forecastTitle}
              </SText>
              <View style={styles.aiPill}>
                <SText v="mono-num" color={S.secondaryFixedDim} style={styles.upper}>
                  {s.aiSimulation.toUpperCase()}
                </SText>
              </View>
            </View>
            <View style={styles.metricGrid}>
              <View style={styles.metric}>
                <SText v="mono-num" color={S.onSurfaceVariant}>{s.reachLabel}</SText>
                <SText v="headline-sm" weight="700" numberOfLines={1} style={styles.metricValue}>
                  {pkg.forecastHigh > 0 ? `${formatK(pkg.forecastLow)}-${formatK(pkg.forecastHigh)}` : '—'}
                </SText>
                <SText v="body-sm" color={S.tertiary}>{s.reachUnit}</SText>
              </View>
              <View style={styles.metric}>
                <SText v="mono-num" color={S.onSurfaceVariant}>{s.streamsLabel}</SText>
                <SText v="headline-sm" weight="700" numberOfLines={1} style={styles.metricValue}>
                  {detail.streams}
                </SText>
                <SText v="body-sm" color={S.secondary}>{s.streamsUnit}</SText>
              </View>
              <View style={styles.metric}>
                <SText v="mono-num" color={S.onSurfaceVariant}>{s.followersLabel}</SText>
                <SText v="headline-sm" weight="700" numberOfLines={1} style={styles.metricValue}>
                  {detail.followers}
                </SText>
                <SText v="body-sm" color={S.primary}>{s.followersUnit}</SText>
              </View>
            </View>
            <View style={styles.disclaimer}>
              <Icon name="info-outline" size={18} color={S.outline} />
              <SText v="body-sm" color={S.onSurfaceVariant} style={[styles.shrink, styles.relaxed]}>
                {s.disclaimer}
              </SText>
            </View>
          </View>

          <View style={styles.termsSection}>
            <SText v="headline-sm" weight="700" style={styles.sectionTitle}>
              {s.termsTitle}
            </SText>
            <View style={styles.termsCard}>
              <InvestmentBlock pkg={pkg} s={s} locale={locale} />
              <View style={styles.termRow}>
                <View style={styles.termIcon}>
                  <Icon name="verified-user" size={20} color={S.primary} />
                </View>
                <View style={styles.shrink}>
                  <SText v="label-md" weight="500">{s.secureTitle}</SText>
                  <SText v="body-sm" color={S.onSurfaceVariant}>{s.secureBody}</SText>
                </View>
              </View>
              <View style={styles.termRow}>
                <View style={styles.termIcon}>
                  <Icon name="pause-circle-outline" size={20} color={S.tertiary} />
                </View>
                <View style={styles.shrink}>
                  <SText v="label-md" weight="500">{s.controlTitle}</SText>
                  <SText v="body-sm" color={S.onSurfaceVariant}>{s.controlBody}</SText>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: 20 + insets.bottom }]}>
          <LinearGradient
            pointerEvents="none"
            colors={[alpha(S.surfaceContainerLow, 0), alpha(S.surfaceContainerLow, 0.95), S.surfaceContainerLow]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          <Pressable
            accessibilityRole="button"
            style={styles.cta}
            onPress={() => {
              if (guest) return showToast(DemoStrings[locale].readOnlyToast, 'lock');
              selectPackage(pkg.id);
              router.replace('/profile/artist/campaign/setup');
            }}
          >
            <SText v="headline-sm" weight="700" color={S.onPrimaryContainer}>
              {s.selectFor} {formatKgsAmount(pkg.priceKgs)} {s.currency}
            </SText>
            <Icon name="arrow-forward" size={20} color={S.onPrimaryContainer} />
          </Pressable>
          <SText v="label-sm" color={S.onSurfaceVariant} style={styles.nextStep}>
            {s.nextStep}
          </SText>
        </View>
      </View>
      {toast}
    </View>
  );
}

const webBlur = (px: number): ViewStyle => (Platform.OS === 'web' ? ({ filter: `blur(${px}px)` } as ViewStyle) : {});

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: alpha(S.surfaceContainerLowest, 0.8) },
  sheet: {
    maxHeight: '90%',
    backgroundColor: S.surfaceContainerLow,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 25 },
    shadowRadius: 50,
    shadowOpacity: 0.25,
    elevation: 24,
  },
  halo: {
    position: 'absolute',
    top: -96,
    left: '50%',
    marginLeft: -144,
    width: 288,
    height: 128,
    borderRadius: SR.full,
    backgroundColor: alpha(S.primary, 0.2),
    ...webBlur(64),
  },
  handleWrap: { width: '100%', alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  handle: { width: 48, height: 6, borderRadius: SR.full, backgroundColor: S.surfaceVariant },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: SR.full, backgroundColor: S.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  badgeText: { letterSpacing: 0.05 * 10 },
  title: { flexShrink: 1, letterSpacing: -0.025 * 18 },
  closeBtn: { width: 32, height: 32, borderRadius: SR.full, backgroundColor: S.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 140, gap: 24 },
  heroCard: {
    borderRadius: SR['2xl'],
    backgroundColor: S.surfaceContainer,
    padding: 20,
    gap: 14,
    overflow: 'hidden',
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 15,
    shadowOpacity: 0.1,
  },
  investBlock: { width: '100%', gap: 8 },
  investRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  investLabel: { flexShrink: 1, letterSpacing: 0.05 * 10 },
  perDayChip: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SR.full,
    backgroundColor: S.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: alpha(S.secondary, 0.2),
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    shadowOpacity: 0.05,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  priceText: { lineHeight: 35, letterSpacing: -0.025 * 28 },
  heroFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: alpha(S.outlineVariant, 0.3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroPopularity: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  roiPill: { backgroundColor: S.surfaceContainerHigh, paddingHorizontal: 8, paddingVertical: 2, borderRadius: SR.DEFAULT },
  trackCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: SR['2xl'], backgroundColor: S.surfaceContainerHigh, gap: 8 },
  trackLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  coverWrap: { width: 48, height: 48, borderRadius: SR.xl, overflow: 'hidden', flexShrink: 0 },
  coverImage: { opacity: 0.85 },
  coverOverlay: { backgroundColor: alpha(S.surfaceContainerLowest, 0.4), alignItems: 'center', justifyContent: 'center' },
  upper: { letterSpacing: 0.05 * 10 },
  shrink: { flexShrink: 1, minWidth: 0 },
  changeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: SR.lg, backgroundColor: S.surfaceVariant, flexShrink: 0 },
  section: { gap: 12 },
  termsSection: { gap: 10 },
  sectionTitle: { letterSpacing: -0.025 * 18 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  aiPill: { backgroundColor: S.surfaceContainerHigh, paddingHorizontal: 8, paddingVertical: 2, borderRadius: SR.full },
  featureList: { gap: 10 },
  featureCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: SR.xl, backgroundColor: S.surfaceContainer },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: SR.full,
    backgroundColor: S.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    shadowOpacity: 0.05,
  },
  metricGrid: { flexDirection: 'row', gap: 10 },
  metric: { flex: 1, minWidth: 0, padding: 12, borderRadius: SR.xl, backgroundColor: S.surfaceContainer, alignItems: 'flex-start' },
  metricValue: { marginTop: 4 },
  disclaimer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: SR.xl, backgroundColor: S.surfaceContainerLowest },
  relaxed: { lineHeight: 19.5 },
  termsCard: { padding: 14, borderRadius: SR['2xl'], backgroundColor: S.surfaceContainer, gap: 12 },
  termRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  termIcon: { width: 32, height: 32, borderRadius: SR.lg, backgroundColor: S.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 20, alignItems: 'center', gap: 8 },
  cta: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: SR.full,
    backgroundColor: S.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 25,
    shadowOpacity: 0.25,
    elevation: 12,
  },
  nextStep: { letterSpacing: 0.025 * 10 },
});
