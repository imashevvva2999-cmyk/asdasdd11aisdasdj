import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';

import { Artwork, Icon } from '@/components/ui';
import { S, SR, SS, SText, StitchHeader, alpha, usePromoStrings } from '@/components/promotion-stitch';
import { SelectPackagePromoStrings } from '@/components/promotion-stitch/strings/select-package';
import { artistBase, useIsGuestPreview } from '@/demo/guest-mode';
import { goBack } from '@/lib/navigation';
import { useDashboardStrings } from '@/state/dashboard-locale-store';
import { formatKgsAmount } from '@/lib/format-currency';
import { PROMO_PACKAGES, type PromoPackage } from '@/mocks/promotions';
import { useArtistStore } from '@/state/artist-store';
import { useCampaignStore } from '@/state/campaign-store';
import { useAppStrings } from '@/state/locale-store';

type PackageId = PromoPackage['id'];

/** Campaign wizard step 2/4 — Stitch "Choose Promotion Package" (screen 3),
 * reproduced 1:1. Redirects to step 1 if entered mid-flow with no track. */
export default function SelectPackageScreen() {
  const { t, locale } = useDashboardStrings();
  const { t: tApp } = useAppStrings();
  const s = usePromoStrings(SelectPackagePromoStrings);
  const entries = useArtistStore((st) => st.entries);
  const artist = useArtistStore((st) => st.artist);
  const trackId = useCampaignStore((st) => st.trackId);
  const selectPackage = useCampaignStore((st) => st.selectPackage);
  // Guest preview: compare packages and open their details; choosing one is
  // refused by the store, so cards open the details sheet instead.
  const guest = useIsGuestPreview();
  const base = artistBase(guest);

  useEffect(() => {
    if (!trackId) router.replace((guest ? `${base.dashboard}/promotion` : `${base.campaign}/select-track`) as Href);
  }, [trackId, guest, base.dashboard, base.campaign]);

  const track = entries.find((e) => e.track.id === trackId)?.track;

  if (!trackId || !track) {
    return <View style={styles.flex} />;
  }

  const price = (amount: number) => `${locale === 'ru' ? formatKgsAmount(amount).replace(/,/g, ' ') : formatKgsAmount(amount)} ${s.currency}`;
  const forecast = (pkg: PromoPackage) => `${s.forecastPrefix} ${pkg.forecastLabel[locale]}`;

  function choosePackage(packageId: string) {
    if (guest) return openDetails(packageId);
    selectPackage(packageId);
    router.push('/profile/artist/campaign/setup');
  }

  function openDetails(packageId: string) {
    router.push({ pathname: `${base.campaign}/package-details`, params: { packageId } } as Href);
  }

  const badgeText: Record<PackageId, string> = { start: s.badgeStart, boost: s.badgeBoost, pro: s.badgePro, spotlight: s.badgeSpotlight };
  const termText: Record<PackageId, string> = { start: s.termStart, boost: s.termBoost, pro: s.termPro, spotlight: s.termSpotlight };
  const linkText: Record<PackageId, string> = { start: s.linkStart, boost: s.linkBoost, pro: s.linkPro, spotlight: s.linkSpotlight };

  function priceNote(pkg: PromoPackage) {
    if (pkg.id === 'start') return { text: s.free, color: S.outline };
    const perDay = pkg.perDayLabel?.[locale] ?? '';
    if (pkg.id === 'boost') return { text: perDay, color: S.secondary };
    if (pkg.id === 'pro') return { text: `${perDay} • ${s.proDiscount}`, color: S.primary };
    return { text: perDay, color: S.onSurfaceVariant };
  }

  function Badge({ id }: { id: PackageId }) {
    if (id === 'spotlight') {
      return (
        <LinearGradient colors={[S.primaryContainer, S.tertiaryContainer]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.badge, styles.badgeSpotlight]}>
          <SText v="label-sm" weight="700" color={S.onPrimary} style={styles.badgeUpper}>
            {badgeText[id]}
          </SText>
        </LinearGradient>
      );
    }
    const tone =
      id === 'boost'
        ? { bg: alpha(S.secondaryContainer, 0.2), fg: S.secondaryFixedDim, w: '600' as const }
        : id === 'pro'
          ? { bg: alpha(S.primaryContainer, 0.2), fg: S.primaryFixedDim, w: '600' as const }
          : { bg: S.surfaceContainerHighest, fg: S.onSurfaceVariant, w: '700' as const };
    return (
      <View style={[styles.badge, { backgroundColor: tone.bg }]}>
        <SText v="label-sm" weight={tone.w} color={tone.fg}>
          {badgeText[id]}
        </SText>
      </View>
    );
  }

  function Bullet({ icon, iconColor, text, strong }: { icon: string; iconColor: string; text: string; strong?: boolean }) {
    return (
      <View style={styles.bullet}>
        <Icon name={icon} size={16} color={iconColor} />
        <SText v="body-sm" color={strong ? S.onSurface : S.onSurfaceVariant} weight={strong ? '500' : undefined} style={styles.flexText}>
          {text}
        </SText>
      </View>
    );
  }

  function Card({ pkg }: { pkg: PromoPackage }) {
    const spotlight = pkg.id === 'spotlight';
    const note = priceNote(pkg);
    const features = pkg.features.map((f) => f[locale]);

    const header = (
      <View style={styles.cardTop}>
        <View style={styles.cardTitleCol}>
          <View style={styles.nameRow}>
            <SText v="headline-md" weight={spotlight ? '700' : undefined} style={styles.name}>
              {pkg.name}
            </SText>
            <Badge id={pkg.id} />
          </View>
          <SText v="body-sm" color={S.onSurfaceVariant}>
            {termText[pkg.id]}
          </SText>
        </View>
        <View style={styles.priceRow}>
          <View style={styles.priceCol}>
            <SText v="headline-md" weight={spotlight ? '700' : '600'} color={spotlight ? S.primary : S.onSurface}>
              {price(pkg.priceKgs)}
            </SText>
            <SText v="mono-num" color={note.color}>
              {note.text}
            </SText>
          </View>
          <Icon name="chevron-right" size={24} color={spotlight ? S.primary : S.outline} />
        </View>
      </View>
    );

    const link = (
      <Pressable accessibilityRole="link" onPress={() => openDetails(pkg.id)} style={[styles.linkRow, spotlight && styles.linkRowSpotlight]}>
        <SText v="label-md" color={spotlight ? S.primary : S.outline}>
          {linkText[pkg.id]}
        </SText>
        <Icon name="arrow-forward" size={16} color={spotlight ? S.primary : S.outline} />
      </Pressable>
    );

    if (spotlight) {
      return (
        <Pressable accessibilityRole="button" onPress={() => choosePackage(pkg.id)} style={({ pressed }) => [styles.cardShadowSpotlight, pressed && styles.pressed]}>
          <LinearGradient colors={[S.surfaceContainerHigh, S.surfaceContainer]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.card}>
            <View pointerEvents="none" style={styles.glow} />
            {header}
            <View style={[styles.cardBottom, styles.cardBottomSpotlight]}>
              <View style={styles.forecastBox}>
                <View style={styles.forecastBoxLeft}>
                  <Icon name="local-fire-department" size={20} color={S.primary} />
                  <SText v="label-md" weight="600" style={styles.flexText}>
                    {forecast(pkg)}
                  </SText>
                </View>
                <View style={styles.topTier}>
                  <SText v="mono-num" weight="700" color={S.primary}>
                    {s.topTier}
                  </SText>
                </View>
              </View>
              <View style={styles.bulletList}>
                <Bullet icon="verified" iconColor={S.primary} text={features[0]} strong />
                <Bullet icon="check-circle-outline" iconColor={S.primary} text={features[1]} />
                <Bullet icon="check-circle-outline" iconColor={S.outline} text={features[2]} />
                <Bullet icon="check-circle-outline" iconColor={S.outline} text={s.spotlightPush} />
              </View>
              {link}
            </View>
          </LinearGradient>
        </Pressable>
      );
    }

    return (
      <Pressable accessibilityRole="button" onPress={() => choosePackage(pkg.id)} style={({ pressed }) => [styles.card, styles.cardPlain, pressed && styles.pressed]}>
        {header}
        <View style={styles.cardBottom}>
          <View style={styles.bulletList}>
            {pkg.id === 'boost' && <Bullet icon="speed" iconColor={S.secondary} text={forecast(pkg)} strong />}
            {pkg.id === 'pro' && <Bullet icon="trending-up" iconColor={S.primary} text={forecast(pkg)} strong />}
            {features.map((f) => (
              <Bullet key={f} icon="check-circle-outline" iconColor={S.outline} text={f} />
            ))}
          </View>
          {link}
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.flex}>
      <StitchHeader title={s.title} backLabel={tApp('backLabel')} onBack={() => goBack((guest ? `${base.dashboard}/promotion` : `${base.campaign}/select-track`) as Href)} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.stepRow}>
          <View style={styles.stepLeft}>
            <View style={styles.stepPill}>
              <SText v="label-sm" color={S.primary} style={styles.badgeUpper}>
                {s.step}
              </SText>
            </View>
            <SText v="body-sm" color={S.outline}>
              •
            </SText>
            <SText v="body-sm" color={S.onSurfaceVariant}>
              {s.stepSection}
            </SText>
          </View>
          <View style={styles.segments}>
            <View style={[styles.segment, { backgroundColor: S.primary }]} />
            <View style={[styles.segment, { backgroundColor: S.primary }]} />
            <View style={[styles.segment, { backgroundColor: S.surfaceVariant }]} />
            <View style={[styles.segment, { backgroundColor: S.surfaceVariant }]} />
          </View>
        </View>

        <SText v="body-md" color={S.onSurfaceVariant} style={styles.relaxed}>
          {s.subtitle}
        </SText>

        <View style={styles.trackChip}>
          <View style={styles.trackLeft}>
            <View style={styles.cover}>
              <Artwork uri={track.coverUri} size={48} radius={SR.lg} />
              <LinearGradient pointerEvents="none" colors={['transparent', 'transparent', alpha(S.background, 0.6)]} style={StyleSheet.absoluteFill} />
              <View pointerEvents="none" style={styles.coverIcon}>
                <Icon name="graphic-eq" size={14} color={S.primary} />
              </View>
            </View>
            <View style={styles.flexText}>
              <SText v="label-lg" numberOfLines={1}>
                {track.title}
              </SText>
              <SText v="body-sm" color={S.onSurfaceVariant} numberOfLines={1}>
                {track.artistName || artist?.name || ''}
              </SText>
            </View>
          </View>
          <Pressable accessibilityRole="button" onPress={() => goBack((guest ? `${base.dashboard}/promotion` : `${base.campaign}/select-track`) as Href)} style={styles.changeBtn}>
            <SText v="label-md" color={S.primary}>
              {s.change}
            </SText>
          </Pressable>
        </View>

        <View style={styles.cards}>
          {PROMO_PACKAGES.map((pkg) => (
            <Card key={pkg.id} pkg={pkg} />
          ))}
        </View>

        <View style={styles.disclaimer}>
          <Icon name="info-outline" size={18} color={S.outline} />
          <SText v="body-sm" color={S.outline} style={[styles.flexText, styles.snug]}>
            {t('forecastDisclaimerLabel')}
          </SText>
        </View>
      </ScrollView>
    </View>
  );
}

const webBlur = Platform.OS === 'web' ? ({ filter: 'blur(40px)' } as unknown as ViewStyle) : null;

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: S.surface },
  flexText: { flex: 1, minWidth: 0 },
  content: { paddingHorizontal: SS.margin, paddingBottom: 112, gap: SS.lg },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: SS.xs },
  stepLeft: { flexDirection: 'row', alignItems: 'center', gap: SS.xs },
  stepPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: SR.full, backgroundColor: S.surfaceContainerHigh },
  badgeUpper: { textTransform: 'uppercase', letterSpacing: 0.5 },
  segments: { flexDirection: 'row', gap: 4 },
  segment: { width: 24, height: 4, borderRadius: SR.full },
  relaxed: { lineHeight: 23 },
  snug: { lineHeight: 16.5 },
  trackChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: SR.xl,
    backgroundColor: S.surfaceContainerLow,
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 20,
    shadowOpacity: 0.4,
    elevation: 6,
  },
  trackLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  cover: { width: 48, height: 48, borderRadius: SR.lg, overflow: 'hidden', backgroundColor: S.surfaceContainerHighest },
  coverIcon: { position: 'absolute', right: 4, bottom: 4 },
  changeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: SR.full, backgroundColor: S.surfaceVariant, marginLeft: SS.sm },
  cards: { gap: SS.md },
  card: { borderRadius: SR['2xl'], padding: 20, overflow: 'hidden' },
  cardPlain: {
    backgroundColor: S.surfaceContainer,
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    shadowOpacity: 0.1,
    elevation: 3,
  },
  cardShadowSpotlight: {
    borderRadius: SR['2xl'],
    shadowColor: S.primaryContainer,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 36,
    shadowOpacity: 0.25,
    elevation: 10,
  },
  pressed: { transform: [{ scale: 0.98 }] },
  glow: { position: 'absolute', top: -48, right: -48, width: 160, height: 160, borderRadius: 80, backgroundColor: alpha(S.primaryContainer, 0.2), ...webBlur },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SS.sm },
  cardTitleCol: { flex: 1, minWidth: 0, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  name: { letterSpacing: -0.025 * 20 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: SR.full },
  badgeSpotlight: { paddingHorizontal: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  priceCol: { alignItems: 'flex-end' },
  cardBottom: {
    marginTop: 16,
    marginHorizontal: -20,
    marginBottom: -20,
    padding: 20,
    borderBottomLeftRadius: SR['2xl'],
    borderBottomRightRadius: SR['2xl'],
    backgroundColor: alpha(S.surfaceContainerLow, 0.5),
    gap: 8,
  },
  cardBottomSpotlight: { backgroundColor: alpha(S.surfaceContainerLowest, 0.7), gap: 10 },
  bulletList: { gap: 6 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkRow: { paddingTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkRowSpotlight: { paddingTop: 8 },
  forecastBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: SR.xl, backgroundColor: alpha(S.surfaceContainerHigh, 0.6), gap: 8 },
  forecastBoxLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  topTier: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: SR.DEFAULT, backgroundColor: alpha(S.primary, 0.2) },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: SR.xl, backgroundColor: S.surfaceContainerLow },
});
