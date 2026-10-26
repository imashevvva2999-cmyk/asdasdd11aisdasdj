import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Artwork, EmptyState, Icon } from '@/components/ui';
import { S, SR, SS, SText, alpha, usePromoStrings } from '@/components/promotion-stitch';
import { DashboardPromoStrings } from '@/components/promotion-stitch/strings/dashboard';
import { InteractionPromoStrings } from '@/components/promotion-stitch/strings/interactions';
import { useToast } from '@/hooks/use-toast';
import { ACTIVE_CAMPAIGN, CAMPAIGN_HISTORY, PROMO_PACKAGES, type CampaignHistoryEntry } from '@/mocks/promotions';
import { useDashboardStrings } from '@/state/dashboard-locale-store';
import { useArtistStore } from '@/state/artist-store';
import { ACTIVE_CAMPAIGN_KEY, PROMO_WALLET_START_KGS, useCampaignStore } from '@/state/campaign-store';
import { artistBase, useIsGuestPreview } from '@/demo/guest-mode';
import { useIsDemoArtist } from '@/state/demo-session-store';
import { DEMO_CAMPAIGN_HISTORY } from '@/demo/demo-fixture';
import { DemoStrings } from '@/demo/demo-strings';

/** History rows shown before "All N" expands the list. */
const HISTORY_PREVIEW = 2;

/** Tailwind default palette colors used directly by the Stitch export. */
const EMERALD_400 = '#34d399';
const EMERALD_500 = '#10b981';

/** "Демо-данные" label on sample figures (the badge style of the artist header). */
function DemoPill({ label, style }: { label: string; style?: ViewStyle }) {
  return (
    <View style={[styles.proBadge, style]}>
      <SText v="mono-num" weight="600" color={S.onSurfaceVariant}>
        {label}
      </SText>
    </View>
  );
}

/** Web-only CSS blur for the hero card's glow bleeds (Tailwind blur-2xl/3xl). */
function blur(px: number): ViewStyle {
  return Platform.OS === 'web' ? ({ filter: `blur(${px}px)` } as unknown as ViewStyle) : {};
}

/** Artist Dashboard — Promotion tab, Stitch "1. mmusic_studio" reproduced 1:1.
 * Entry point into the local Campaign Creation wizard (state/campaign-store.ts).
 * As on the website: the shared promotion mocks / demo fixture are shown only to
 * the Solaris Echo demo (guest preview or demo login), labelled "Демо-данные"; a
 * regular artist sees only their own campaigns, with "—" / "no data" where no
 * real metric exists. */
export default function PromotionScreen() {
  const { t, locale } = useDashboardStrings();
  const s = usePromoStrings(DashboardPromoStrings);
  const artist = useArtistStore((st) => st.artist);
  const entries = useArtistStore((st) => st.entries);
  const published = useMemo(() => entries.filter((e) => e.status === 'published'), [entries]);
  const { showToast, toast } = useToast();
  const si = usePromoStrings(InteractionPromoStrings);
  const launched = useCampaignStore((st) => st.launched);
  const walletBalanceKgs = useCampaignStore((st) => st.walletBalanceKgs);
  const paused = useCampaignStore((st) => st.pausedCampaignIds.includes(ACTIVE_CAMPAIGN_KEY));
  const togglePause = useCampaignStore((st) => st.togglePause);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const demo = useIsDemoArtist();
  const guest = useIsGuestPreview();
  const dStr = DemoStrings[locale];
  // Sample (mock) figures are the Solaris Echo demo's only — never shown as a regular artist's own.
  const sample = demo || guest;
  const draftTrackId = useCampaignStore((st) => st.trackId);
  const draftPackageId = useCampaignStore((st) => st.packageId);
  const draftStage = useCampaignStore((st) => st.stage);

  const activeTrack = published.find((e) => e.track.id === ACTIVE_CAMPAIGN.trackId)?.track;

  if (!artist) {
    return (
      <ThemedView surface="canvas" style={styles.flex}>
        <EmptyState icon="trending-up" title={t('noArtistTitle')} hint={t('noArtistHint')} actionLabel={t('becomeArtistAction')} onActionPress={() => router.push('/profile/artist/become-artist')} />
      </ThemedView>
    );
  }

  const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, locale === 'ru' ? ' ' : ',');
  const base = artistBase(guest);
  // Guest preview: "create campaign" opens the read-only package comparison.
  const toWizard = () => router.push((guest ? `${base.campaign}/select-package` : `${base.campaign}/select-track`) as Href);
  const toStatistics = (campaignId?: string) =>
    router.push((campaignId ? { pathname: `${base.campaign}/statistics`, params: { campaign: campaignId } } : `${base.campaign}/statistics`) as Href);
  const readOnly = () => showToast(dStr.readOnlyToast, 'lock');
  const onPause = () => {
    if (guest) return readOnly();
    togglePause(ACTIVE_CAMPAIGN_KEY);
    showToast(paused ? si.resumed : si.paused, paused ? 'play-arrow' : 'pause');
  };

  // This session's launched campaigns (in review) lead the static history.
  const launchedHistory: CampaignHistoryEntry[] = launched.map((c) => ({
    id: c.id,
    trackId: c.trackId,
    trackTitle: entries.find((e) => e.track.id === c.trackId)?.track.title ?? t('activeCampaignFallbackLabel'),
    metric: { en: '—', ru: '—' },
    completedLabel: { en: InteractionPromoStrings.en.inReview, ru: InteractionPromoStrings.ru.inReview },
    reach: 0,
    budgetKgs: c.totalKgs,
  }));
  // Sample completed campaigns only for the demo (its own catalog when signed in); none for a regular artist.
  const completedHistory = demo ? DEMO_CAMPAIGN_HISTORY : guest ? CAMPAIGN_HISTORY : [];
  // An unfinished wizard draft is listed first and resumes where it stopped.
  const draftOpen = !!draftTrackId && !!draftPackageId && ['settingUp', 'confirming', 'failed'].includes(draftStage);
  const draftPkg = PROMO_PACKAGES.find((p) => p.id === draftPackageId);
  const draftHistory: CampaignHistoryEntry[] = draftOpen
    ? [
        {
          id: 'draft',
          trackId: draftTrackId,
          trackTitle: entries.find((e) => e.track.id === draftTrackId)?.track.title ?? t('activeCampaignFallbackLabel'),
          metric: { en: draftPkg?.name ?? '—', ru: draftPkg?.name ?? '—' },
          completedLabel: { en: DemoStrings.en.draftLabel, ru: DemoStrings.ru.draftLabel },
          reach: 0,
          budgetKgs: draftPkg?.priceKgs,
        },
      ]
    : [];
  const history = [...draftHistory, ...launchedHistory, ...completedHistory];
  const coverFor = (trackId?: string) => entries.find((e) => e.track.id === trackId)?.track.coverUri;
  const openHistory = (h: CampaignHistoryEntry) => {
    if (h.id === 'draft' && guest) readOnly();
    else if (h.id === 'draft') router.push(draftStage === 'settingUp' ? '/profile/artist/campaign/setup' : '/profile/artist/campaign/confirm');
    else toStatistics(h.id);
  };
  const visibleHistory = historyExpanded ? history : history.slice(0, HISTORY_PREVIEW);

  // Regular artist: their own launched budgets (real, from this account); demo: the sample history.
  const investmentKgs = sample ? completedHistory.reduce((sum, h) => sum + (h.budgetKgs ?? 0), 0) : launched.reduce((sum, c) => sum + c.totalKgs, 0);
  const latestLaunched = launched[0];
  const latestLaunchedTrack = entries.find((e) => e.track.id === latestLaunched?.trackId)?.track;
  const minPerDayKgs = Math.round(Math.min(...PROMO_PACKAGES.filter((p) => p.durationDays > 0).map((p) => p.priceKgs / p.durationDays)));
  const campaignTitle = activeTrack?.title ?? published[0]?.track.title ?? t('activeCampaignFallbackLabel');
  const campaignCover = activeTrack?.coverUri ?? published[0]?.track.coverUri;
  const progress = Math.round(ACTIVE_CAMPAIGN.progressPct);
  const geo = ACTIVE_CAMPAIGN.geoBreakdown ?? [];
  const geoTopPct = geo.slice(0, 2).reduce((sum, g) => sum + g.pct, 0);
  const geoColors = [S.primaryContainer, S.secondary, S.tertiary];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Artist mini header */}
        <View style={styles.artistRow}>
          <View style={styles.rowGapSm}>
            <View style={styles.avatarWrap}>
              <LinearGradient
                colors={[S.primaryContainer, S.secondary, S.tertiary]}
                start={{ x: 0, y: 1 }}
                end={{ x: 1, y: 0 }}
                style={styles.avatarRing}
              >
                <Artwork shape="circle" uri={artist.photoUri} size={40} radius={20} placeholderIcon="person" />
              </LinearGradient>
              <View style={styles.verified}>
                <Icon name="verified" size={11} color={S.surface} />
              </View>
            </View>
            <View style={styles.flexShrink}>
              <View style={styles.rowGapXs}>
                <SText v="headline-sm" weight="700" numberOfLines={1} style={styles.tight}>
                  {artist.name}
                </SText>
                {sample && (
                  <View style={styles.proBadge}>
                    <SText v="mono-num" weight="600" color={S.secondary} style={styles.upperWide}>
                      {s.artistBadge}
                    </SText>
                  </View>
                )}
              </View>
              {/* "PRO ARTIST" / "smart targeting active" are demo claims; a regular artist just sees their name. */}
              {sample && (
                <View style={styles.rowGapXs}>
                  <View style={styles.dotSm} />
                  <SText v="body-sm" color={S.onSurfaceVariant} style={styles.flexShrink}>
                    {s.artistMeta}
                  </SText>
                </View>
              )}
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={s.helpLabel} onPress={() => showToast(si.helpToast, 'help-outline')} style={styles.helpBtn}>
            <Icon name="help-outline" size={18} color={S.onSurfaceVariant} />
          </Pressable>
        </View>

        {/* Hero launch card */}
        <View style={styles.hero}>
          <View pointerEvents="none" style={[styles.glowTop, blur(64)]} />
          <View pointerEvents="none" style={[styles.glowBottom, blur(40)]} />
          <View style={styles.heroBody}>
            <View style={styles.rowGap8}>
              <View style={styles.smartBadge}>
                <Icon name="local-fire-department" size={14} color={S.primaryContainer} />
                <SText v="label-sm" color={S.primaryContainer} style={styles.upperWide}>
                  {s.smartPush}
                </SText>
              </View>
              <SText v="mono-num" color={S.onSurfaceVariant}>
                {s.audioHub}
              </SText>
            </View>
            <SText v="headline-lg" weight="700" style={styles.tight}>
              {s.heroTitle}
            </SText>
            <SText v="body-md" color={S.onSurfaceVariant} style={styles.relaxed}>
              {s.heroBodyPrefix}
              <SText v="body-md" weight="600">
                {s.heroBodyBrand}
              </SText>
              {s.heroBodySuffix}
            </SText>
            <View style={styles.heroCtaRow}>
              <Pressable accessibilityRole="button" onPress={toWizard} style={styles.heroCta}>
                <Icon name="rocket-launch" size={18} color={S.onPrimary} />
                <SText v="label-lg" color={S.onPrimary}>
                  {s.heroCta}
                </SText>
              </Pressable>
              <View>
                <SText v="mono-num" color={S.onSurfaceVariant}>
                  {s.startFrom}
                </SText>
                <SText v="label-md" weight="700" color={S.secondary}>
                  {minPerDayKgs} {s.perDay}
                </SText>
              </View>
            </View>
          </View>
        </View>

        {/* 30-day summary */}
        <View style={styles.summary}>
          <View style={styles.sectionHead}>
            <View style={styles.rowGap8}>
              <Icon name="insights" size={20} color={S.secondary} />
              <SText v="headline-sm" weight="600">
                {s.summaryTitle}
              </SText>
            </View>
            {sample && <DemoPill label={t('demoDataBadge')} />}
          </View>
          <View style={styles.grid}>
            <View style={styles.statCard}>
              <View style={styles.statHead}>
                <SText v="label-sm" color={S.onSurfaceVariant} style={styles.upperWide}>
                  {s.reachLabel}
                </SText>
                <Icon name="graphic-eq" size={18} color={S.primary} />
              </View>
              <View style={styles.statValue}>
                <SText v="display-lg-mobile" weight="700" style={styles.tight}>
                  {sample ? fmt(ACTIVE_CAMPAIGN.reach) : '—'}
                </SText>
                {sample ? (
                  <View style={styles.deltaRow}>
                    <Icon name="trending-up" size={14} color={EMERALD_400} />
                    <SText v="label-sm" color={EMERALD_400}>
                      {s.reachDelta}
                    </SText>
                  </View>
                ) : (
                  <SText v="body-sm" color={S.onSurfaceVariant} numberOfLines={1} style={styles.mt4}>
                    {dStr.anNoData}
                  </SText>
                )}
              </View>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statHead}>
                <SText v="label-sm" color={S.onSurfaceVariant} style={styles.upperWide}>
                  {s.fansLabel}
                </SText>
                <Icon name="favorite-border" size={18} color={S.secondary} />
              </View>
              <View style={styles.statValue}>
                <SText v="display-lg-mobile" weight="700" style={styles.tight}>
                  {sample ? `${ACTIVE_CAMPAIGN.conversionRatePct}%` : '—'}
                </SText>
                <SText v="body-sm" color={S.onSurfaceVariant} numberOfLines={1} style={styles.mt4}>
                  {sample ? s.fansHint : dStr.anNoData}
                </SText>
              </View>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statHead}>
                <SText v="label-sm" color={S.onSurfaceVariant} style={styles.upperWide}>
                  {s.rotationLabel}
                </SText>
                {(sample || launched.length > 0) && <View style={styles.dotLive} />}
              </View>
              <View style={styles.statValue}>
                <SText v="headline-lg" weight="700">
                  {sample ? `1 ${s.campaignWord}` : launched.length > 0 ? `${launched.length} ${s.campaignWord}` : '—'}
                </SText>
                {sample || latestLaunchedTrack ? (
                  <SText v="body-sm" weight="500" color={S.primaryContainer} numberOfLines={1} style={styles.mt4}>
                    «{sample ? campaignTitle : latestLaunchedTrack?.title}»
                  </SText>
                ) : (
                  <SText v="body-sm" color={S.onSurfaceVariant} numberOfLines={2} style={styles.mt4}>
                    {dStr.promoNoActive}
                  </SText>
                )}
              </View>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statHead}>
                <SText v="label-sm" color={S.onSurfaceVariant} style={styles.upperWide}>
                  {s.investLabel}
                </SText>
                <Icon name="account-balance-wallet" size={18} color={S.secondaryFixed} />
              </View>
              <View style={styles.statValue}>
                <View style={styles.baseline}>
                  <SText v="headline-lg" weight="700">
                    {fmt(investmentKgs)}
                  </SText>
                  <SText v="label-md" weight="400" color={S.onSurfaceVariant}>
                    {s.currency}
                  </SText>
                </View>
                {sample ? (
                  <SText v="body-sm" weight="500" color={EMERALD_400} style={styles.mt4}>
                    {s.roi}
                  </SText>
                ) : (
                  <SText v="body-sm" color={S.onSurfaceVariant} numberOfLines={1} style={styles.mt4}>
                    {dStr.anNoData}
                  </SText>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Current campaign (demo sample) */}
        {sample && (
        <View style={styles.sectionXl}>
          <View style={styles.sectionHead}>
            <View style={[styles.rowGap8, styles.flexShrink]}>
              <Icon name="radio-button-checked" size={20} color={S.primaryContainer} />
              <SText v="headline-sm" weight="600" style={styles.flexShrink}>
                {s.currentTitle}
              </SText>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.dotSm} />
              <SText v="label-sm" weight="600" color={EMERALD_400}>
                {s.onAir} • {ACTIVE_CAMPAIGN.dayOfTotal[locale]}
              </SText>
            </View>
          </View>
          <View style={styles.liveCard}>
            <View style={styles.liveTop}>
              <View style={styles.cover}>
                <Artwork uri={campaignCover} size={80} radius={SR.xl} />
                <View style={styles.coverOverlay}>
                  <View style={styles.eqRow}>
                    <View style={[styles.eqBar, { height: 20 }]} />
                    <View style={[styles.eqBar, { height: 12 }]} />
                    <View style={[styles.eqBar, { height: 16 }]} />
                  </View>
                </View>
              </View>
              <View style={styles.flexMeta}>
                <View style={styles.metaHead}>
                  <SText v="label-sm" weight="700" color={S.secondary} style={[styles.upperWide, styles.flexShrink]}>
                    {s.streamType}
                  </SText>
                  <SText v="mono-num" color={S.onSurfaceVariant}>
                    {s.campaignId}
                  </SText>
                </View>
                <SText v="headline-sm" weight="700" numberOfLines={1} style={styles.mt2}>
                  {campaignTitle}
                </SText>
                <SText v="body-sm" color={S.onSurfaceVariant} numberOfLines={1}>
                  {artist.name} • {s.lpSuffix}
                </SText>
                <View style={styles.playRow}>
                  <View style={styles.rowGap4}>
                    <Icon name="play-circle-outline" size={14} color={S.primaryContainer} />
                    <SText v="mono-num">
                      {fmt(ACTIVE_CAMPAIGN.reach)} {s.impressions}
                    </SText>
                  </View>
                  <SText v="mono-num" color={S.onSurfaceVariant}>
                    {s.goal} {fmt(ACTIVE_CAMPAIGN.reachGoal)}
                  </SText>
                </View>
              </View>
            </View>

            <View style={styles.progressBlock}>
              <View style={styles.progressHead}>
                <SText v="body-sm" weight="500">
                  {s.progress}
                </SText>
                <SText v="mono-num" weight="700" color={S.primaryContainer}>
                  {progress}% {s.done}
                </SText>
              </View>
              <View style={styles.track}>
                <LinearGradient
                  colors={[S.primaryContainer, S.secondary, S.tertiary]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[styles.fill, { width: `${ACTIVE_CAMPAIGN.progressPct}%` }]}
                />
              </View>
              <View style={styles.progressFoot}>
                <SText v="mono-num" color={S.onSurfaceVariant}>
                  {s.remaining} {fmt(ACTIVE_CAMPAIGN.reachGoal - ACTIVE_CAMPAIGN.reach)} {s.impressions}
                </SText>
                <SText v="mono-num" color={S.onSurfaceVariant}>
                  {s.finish}
                </SText>
              </View>
            </View>

            <View style={styles.actionRow}>
              <Pressable accessibilityRole="button" onPress={() => toStatistics()} style={styles.detailsBtn}>
                <SText v="label-md">{s.details}</SText>
                <Icon name="arrow-forward" size={16} color={S.onSurface} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={paused ? si.resume : s.pause} accessibilityState={{ checked: paused }} onPress={onPause} style={styles.pauseBtn}>
                <Icon name={paused ? 'play-arrow' : 'pause'} size={18} color={S.onSurfaceVariant} />
              </Pressable>
            </View>
          </View>
        </View>

        )}

        {/* Current campaign (regular artist): their latest launched campaign, in review — no invented delivery figures */}
        {!sample && (
          <View style={styles.sectionXl}>
            <View style={styles.sectionHead}>
              <View style={[styles.rowGap8, styles.flexShrink]}>
                <Icon name="radio-button-checked" size={20} color={S.primaryContainer} />
                <SText v="headline-sm" weight="600" style={styles.flexShrink}>
                  {s.currentTitle}
                </SText>
              </View>
            </View>
            {latestLaunched ? (
              <View style={styles.liveCard}>
                <View style={styles.liveTop}>
                  <View style={styles.cover}>
                    <Artwork uri={latestLaunchedTrack?.coverUri} size={80} radius={SR.xl} />
                  </View>
                  <View style={styles.flexMeta}>
                    <SText v="label-sm" weight="700" color={S.secondary} style={[styles.upperWide, styles.flexShrink]}>
                      {si.inReview}
                    </SText>
                    <SText v="headline-sm" weight="700" numberOfLines={1} style={styles.mt2}>
                      {latestLaunchedTrack?.title ?? t('activeCampaignFallbackLabel')}
                    </SText>
                    <SText v="body-sm" color={S.onSurfaceVariant} numberOfLines={1}>
                      {artist.name} • {s.budget} {fmt(latestLaunched.totalKgs)} {s.currency}
                    </SText>
                    <SText v="mono-num" color={S.onSurfaceVariant} style={styles.mt4}>
                      {s.impressions}: —
                    </SText>
                  </View>
                </View>
                <View style={styles.actionRow}>
                  <Pressable accessibilityRole="button" onPress={() => toStatistics(latestLaunched.id)} style={styles.detailsBtn}>
                    <SText v="label-md">{s.details}</SText>
                    <Icon name="arrow-forward" size={16} color={S.onSurface} />
                  </Pressable>
                </View>
              </View>
            ) : (
              <EmptyState icon="campaign" title={dStr.promoNoActive} hint={dStr.promoNoActiveHint} />
            )}
          </View>
        )}

        {/* Listener geography (demo sample) */}
        {sample && (
        <View style={styles.geoCard}>
          <View style={styles.geoHead}>
            <View style={[styles.rowGap8, styles.flexShrink]}>
              <Icon name="public" size={20} color={S.secondary} />
              <SText v="headline-sm" weight="600" style={styles.flexShrink}>
                {s.geoTitle}
              </SText>
            </View>
            <SText v="mono-num" weight="600" color={S.primary}>
              {s.geoTop} ({geoTopPct}%)
            </SText>
          </View>
          <View style={styles.geoList}>
            {geo.map((g, i) => (
              <View key={g.regionLabel.en}>
                <View style={styles.geoRowHead}>
                  <SText v="body-sm" style={styles.flexShrink}>
                    {g.regionLabel[locale]}
                  </SText>
                  <SText v="mono-num" color={S.onSurfaceVariant}>
                    {g.pct}% ({fmt(g.count)} {s.people})
                  </SText>
                </View>
                <View style={styles.geoTrack}>
                  <View style={[styles.fill, { width: `${g.pct}%`, backgroundColor: geoColors[i % geoColors.length] }]} />
                </View>
              </View>
            ))}
          </View>
        </View>
        )}

        {/* Campaign history */}
        <View style={styles.sectionXl}>
          <View style={styles.sectionHead}>
            <View style={styles.rowGap8}>
              <Icon name="history" size={20} color={S.onSurfaceVariant} />
              <SText v="headline-sm" weight="600">
                {s.historyTitle}
              </SText>
            </View>
            {history.length > HISTORY_PREVIEW && (
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: historyExpanded }} onPress={() => setHistoryExpanded((v) => !v)}>
                <SText v="label-sm" color={S.primary}>
                  {historyExpanded ? si.collapse : `${s.all} ${history.length}`}
                </SText>
              </Pressable>
            )}
          </View>
          {history.length === 0 && (
            <SText v="body-sm" color={S.onSurfaceVariant} style={styles.historyEmpty}>
              {dStr.promoNoHistory}
            </SText>
          )}
          <View style={styles.historyList}>
            {visibleHistory.map((h) => (
              <Pressable key={h.id} accessibilityRole="button" accessibilityLabel={h.trackTitle} onPress={() => openHistory(h)} style={styles.historyRow}>
                <View style={[styles.rowGapSm, styles.flexShrink]}>
                  <View style={styles.historyCover}>
                    <Artwork uri={coverFor(h.trackId)} size={48} radius={SR.lg} />
                  </View>
                  <View style={styles.flexShrink}>
                    <View style={styles.rowGap8}>
                      <SText v="label-lg" weight="600" numberOfLines={1} style={styles.flexShrink}>
                        {h.trackTitle}
                      </SText>
                      {h.formatBadge && (
                        <View style={styles.formatBadge}>
                          <SText v="mono-num" size={10} color={S.onSurfaceVariant}>
                            {h.formatBadge[locale]}
                          </SText>
                        </View>
                      )}
                    </View>
                    <SText v="body-sm" color={S.onSurfaceVariant}>
                      {h.completedLabel[locale]}
                      {h.budgetKgs !== undefined ? ` • ${s.budget} ${fmt(h.budgetKgs)} ${s.currency}` : ''}
                    </SText>
                  </View>
                </View>
                <View style={styles.historyRight}>
                  <SText v="mono-num" weight="700" color={EMERALD_400}>
                    {h.metric[locale]}
                  </SText>
                  <SText v="body-sm" color={S.onSurfaceVariant}>
                    {h.reach > 0 ? `${fmt(h.reach)} ${s.reachSuffix}` : `— ${s.reachSuffix}`}
                  </SText>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Promo wallet */}
        <LinearGradient
          colors={[S.surfaceContainerHigh, S.surfaceContainer]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.wallet}
        >
          <View style={[styles.rowGapSm, styles.flexShrink]}>
            <View style={styles.walletIcon}>
              <Icon name="monetization-on" size={20} color={S.secondary} />
            </View>
            <View style={styles.flexShrink}>
              <SText v="label-md" weight="600">
                {s.walletTitle}
              </SText>
              <SText v="body-sm" color={S.onSurfaceVariant}>
                {s.walletHint}
              </SText>
            </View>
          </View>
          <View style={styles.walletRight}>
            {/* Guest preview: the demo account's balance, labelled; otherwise the account's own balance (0 for a regular artist). */}
            <SText v="headline-sm" weight="700">
              {fmt(guest ? PROMO_WALLET_START_KGS : walletBalanceKgs)} {s.currency}
            </SText>
            {sample && <DemoPill label={t('demoDataBadge')} style={styles.mt2} />}
            <Pressable accessibilityRole="button" onPress={() => showToast(guest ? dStr.readOnlyToast : si.topUpToast, guest ? 'lock' : undefined)}>
              <SText v="label-sm" color={S.secondary} style={styles.mt2}>
                {s.walletTopUp}
              </SText>
            </Pressable>
          </View>
        </LinearGradient>

        {/* Docked create-campaign CTA */}
        <Pressable accessibilityRole="button" onPress={toWizard} style={styles.createWrap}>
          <LinearGradient
            colors={[S.primaryContainer, '#ff6a5c', S.tertiary]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.createBtn}
          >
            <Icon name="add-circle" size={22} color={S.onPrimary} />
            <SText v="headline-sm" weight="700" color={S.onPrimary}>
              {s.createCta}
            </SText>
          </LinearGradient>
        </Pressable>
      </ScrollView>
      {toast}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: S.surface },
  content: { paddingHorizontal: SS.margin, paddingBottom: 112 },
  flexShrink: { flexShrink: 1, minWidth: 0 },
  tight: { letterSpacing: -0.45 },
  relaxed: { lineHeight: 23 },
  upperWide: { textTransform: 'uppercase', letterSpacing: 0.5 },
  mt2: { marginTop: 2 },
  mt4: { marginTop: 4 },
  rowGap4: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowGapXs: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowGap8: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowGapSm: { flexDirection: 'row', alignItems: 'center', gap: SS.sm },

  artistRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SS.sm, marginBottom: SS.md },
  avatarWrap: { width: 44, height: 44 },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 2,
    shadowColor: S.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    shadowOpacity: 0.25,
  },
  verified: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: S.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: S.surface,
  },
  proBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: SR.full, backgroundColor: S.surfaceContainerHigh },
  dotSm: { width: 6, height: 6, borderRadius: 3, backgroundColor: EMERALD_400 },
  helpBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: S.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },

  hero: {
    borderRadius: SR['2xl'],
    overflow: 'hidden',
    padding: SS.lg,
    backgroundColor: S.surfaceContainer,
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 36,
    shadowOpacity: 0.8,
    elevation: 10,
  },
  glowTop: { position: 'absolute', top: -64, right: -64, width: 208, height: 208, borderRadius: 104, backgroundColor: alpha(S.primaryContainer, 0.25) },
  glowBottom: { position: 'absolute', bottom: -80, left: -48, width: 192, height: 192, borderRadius: 96, backgroundColor: alpha(S.secondary, 0.15) },
  heroBody: { gap: SS.sm, zIndex: 10 },
  smartBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: SR.full, backgroundColor: alpha(S.primaryContainer, 0.2) },
  heroCtaRow: { flexDirection: 'row', alignItems: 'center', gap: SS.md, paddingTop: SS.xs },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SS.lg,
    paddingVertical: 12,
    borderRadius: SR.full,
    backgroundColor: S.primaryContainer,
    shadowColor: S.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 22,
    shadowOpacity: 0.4,
    elevation: 6,
    flexShrink: 1,
  },

  summary: { marginTop: SS.lg, gap: SS.sm },
  sectionXl: { marginTop: SS.xl, gap: SS.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SS.sm },
  statCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: S.surfaceContainer, borderRadius: SR.xl, padding: SS.md, justifyContent: 'space-between', overflow: 'hidden' },
  statHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  statValue: { marginTop: SS.md },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  dotLive: { width: 10, height: 10, borderRadius: 5, backgroundColor: EMERALD_400 },
  baseline: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },

  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: SR.full, backgroundColor: alpha(EMERALD_500, 0.1), flexShrink: 1 },
  liveCard: {
    backgroundColor: S.surfaceContainerHigh,
    borderRadius: SR['2xl'],
    padding: SS.md,
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 32,
    shadowOpacity: 0.5,
    elevation: 8,
  },
  liveTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SS.md },
  cover: { width: 80, height: 80, borderRadius: SR.xl, overflow: 'hidden' },
  coverOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0, 0, 0, 0.3)', alignItems: 'center', justifyContent: 'center' },
  eqRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 20 },
  eqBar: { width: 4, borderRadius: 2, backgroundColor: S.primaryContainer },
  flexMeta: { flex: 1, minWidth: 0 },
  metaHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 },
  playRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' },
  progressBlock: { marginTop: SS.md, paddingTop: SS.xs },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  track: { height: 8, borderRadius: SR.full, backgroundColor: S.surfaceContainerHighest, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: SR.full },
  progressFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SS.sm, marginTop: SS.md, paddingTop: SS.xs },
  detailsBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: SS.md, borderRadius: SR.xl, backgroundColor: S.surfaceContainerHighest },
  pauseBtn: { width: 40, height: 40, borderRadius: SR.xl, backgroundColor: S.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center' },

  geoCard: { marginTop: SS.lg, backgroundColor: S.surfaceContainer, borderRadius: SR['2xl'], padding: SS.md },
  geoHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SS.sm, gap: 8 },
  geoList: { gap: 10, paddingTop: 4 },
  geoRowHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, gap: 8 },
  geoTrack: { height: 6, borderRadius: SR.full, backgroundColor: S.surfaceContainerHigh, overflow: 'hidden' },

  historyList: { gap: SS.xs },
  historyEmpty: { paddingHorizontal: 4 },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SS.sm, borderRadius: SR.xl, backgroundColor: S.surfaceContainer },
  historyCover: { width: 48, height: 48, borderRadius: SR.lg, overflow: 'hidden', backgroundColor: S.surfaceContainerHighest },
  formatBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: SR.DEFAULT, backgroundColor: S.surfaceContainerHighest },
  historyRight: { alignItems: 'flex-end', flexShrink: 0, paddingLeft: 8 },

  wallet: { marginTop: SS.lg, borderRadius: SR.xl, padding: SS.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  walletIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: alpha(S.secondaryContainer, 0.2), alignItems: 'center', justifyContent: 'center' },
  walletRight: { alignItems: 'flex-end' },

  createWrap: {
    marginTop: SS.xl,
    borderRadius: SR['2xl'],
    shadowColor: S.primaryContainer,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 30,
    shadowOpacity: 0.5,
    elevation: 10,
  },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: SS.lg, borderRadius: SR['2xl'] },
});
