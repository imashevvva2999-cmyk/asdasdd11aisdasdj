import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient as SvgLinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { Artwork, Icon } from '@/components/ui';
import { S, SR, SS, SText, StitchHeader, alpha, usePromoStrings } from '@/components/promotion-stitch';
import { InteractionPromoStrings } from '@/components/promotion-stitch/strings/interactions';
import { StatisticsPromoStrings } from '@/components/promotion-stitch/strings/statistics';
import { useHydrated } from '@/hooks/use-hydrated';
import { useToast } from '@/hooks/use-toast';
import { DEMO_CAMPAIGN_HISTORY } from '@/demo/demo-fixture';
import { DemoNotice } from '@/components/demo-notice';
import { DemoStrings } from '@/demo/demo-strings';
import { artistBase, useIsGuestPreview } from '@/demo/guest-mode';
import { goBack } from '@/lib/navigation';
import { resolveCampaignView } from '@/lib/campaign-view';
import { CAMPAIGN_HISTORY } from '@/mocks/promotions';
import { useArtistStore } from '@/state/artist-store';
import { ACTIVE_CAMPAIGN_KEY, useCampaignStore } from '@/state/campaign-store';
import { useIsDemoArtist } from '@/state/demo-session-store';
import { useDashboardStrings } from '@/state/dashboard-locale-store';
import { useAppStrings } from '@/state/locale-store';

const GEO_FILLS = [S.primary, S.secondary, S.tertiary];

/** One geography percentage row (Stitch screen 8 "Топ локаций показа") —
 * also used by the Promotion dashboard's listener-geography card. */
export function GeoBreakdownRow({ regionLabel, pct, count, fill = S.primary }: { regionLabel: string; pct: number; count: number; fill?: string }) {
  return (
    <View style={geoStyles.row}>
      <View style={geoStyles.labelRow}>
        <SText v="label-md">{regionLabel}</SText>
        <SText v="label-md" weight="500">
          {pct}%{' '}
          <SText v="body-sm" color={S.outline}>
            ({count.toLocaleString('ru-RU')})
          </SText>
        </SText>
      </View>
      <View style={geoStyles.track}>
        <View style={[geoStyles.fill, { width: `${pct}%`, backgroundColor: fill }]} />
      </View>
    </View>
  );
}

const geoStyles = StyleSheet.create({
  row: { gap: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 6, borderRadius: SR.full, backgroundColor: S.surfaceContainerHigh, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: SR.full },
});

type Metric = 'impressions' | 'streams' | 'conversion';

/** Stitch's own per-tab curves (viewBox 0 0 320 120). The point markers stay
 * put when switching tabs, exactly as in the export's script. */
const CURVES: Record<Metric, { line: string; area: string }> = {
  impressions: {
    line: 'M 10 95 Q 85 85, 110 50 T 210 35 T 310 18',
    area: 'M 10 95 Q 85 85, 110 50 T 210 35 T 310 18 L 310 100 L 10 100 Z',
  },
  streams: {
    line: 'M 10 98 Q 90 90, 110 65 T 210 40 T 310 30',
    area: 'M 10 98 Q 90 90, 110 65 T 210 40 T 310 30 L 310 100 L 10 100 Z',
  },
  conversion: {
    line: 'M 10 70 Q 75 60, 110 40 T 210 32 T 310 22',
    area: 'M 10 70 Q 75 60, 110 40 T 210 32 T 310 22 L 310 100 L 10 100 Z',
  },
};

/** Campaign Analytics — Stitch screen 8, 1:1. Numbers come from the static
 * ACTIVE_CAMPAIGN demo data (so the screen has content even in a cold static
 * export); Stitch-only figures (deltas, chart, age split) are the export's own
 * static values. Share sends a text report (clipboard fallback on web), export
 * downloads/shares a CSV, and the management actions reopen the wizard for this
 * track or toggle the local pause state. */
export default function CampaignStatisticsScreen() {
  const { t, locale } = useDashboardStrings();
  const { t: tApp } = useAppStrings();
  const s = usePromoStrings(StatisticsPromoStrings);
  const entries = useArtistStore((st) => st.entries);
  const artist = useArtistStore((st) => st.artist);
  const launched = useCampaignStore((st) => st.launched);
  const hydrated = useHydrated();
  const { showToast, toast } = useToast();
  const si = usePromoStrings(InteractionPromoStrings);
  // Guest preview: campaign management is read-only; back stays inside /demo.
  const guest = useIsGuestPreview();
  const demo = useIsDemoArtist();
  const readOnly = () => showToast(DemoStrings[locale].readOnlyToast, 'lock');
  const startCampaign = useCampaignStore((st) => st.startCampaign);
  const selectPackage = useCampaignStore((st) => st.selectPackage);
  const { campaign: campaignParam } = useLocalSearchParams<{ campaign?: string }>();
  const allHistory = [...DEMO_CAMPAIGN_HISTORY, ...CAMPAIGN_HISTORY];
  const view = resolveCampaignView(campaignParam, ACTIVE_CAMPAIGN_KEY, launched, allHistory);
  const ACTIVE_CAMPAIGN = view.data;
  const paused = useCampaignStore((st) => st.pausedCampaignIds.includes(view.key));
  const togglePause = useCampaignStore((st) => st.togglePause);
  const [metric, setMetric] = useState<Metric>('impressions');

  // Numbers are the static ACTIVE_CAMPAIGN demo data; for the title/artwork,
  // prefer a real track (the demo id, then this session's launched campaign).
  // Neither store is persisted, so fall back to a plain localized label —
  // never the raw ACTIVE_CAMPAIGN.trackId slug.
  const track =
    entries.find((e) => e.track.id === view.trackId)?.track ??
    (view.status === 'active' ? entries.find((e) => e.track.id === launched[0]?.trackId)?.track : undefined);
  const title = track?.title ?? allHistory.find((h) => h.id === campaignParam)?.trackTitle ?? t('activeCampaignFallbackLabel');
  const artistName = track?.artistName ?? artist?.name ?? '';
  const [currentDay, totalDays] = ACTIVE_CAMPAIGN.dayOfTotal.en.match(/\d+/g)?.map(Number) ?? [0, 0];
  const daysRemaining = Math.max(totalDays - currentDay, 0);
  const idDigits = view.status === 'active' ? (launched[0]?.id.match(/\d+/)?.[0] ?? view.number).slice(-4) : view.number;
  const campaignId = `#PR-${idDigits}-MM`;
  // Hero sparkline: daily impressions. Only the labelled demo dataset has
  // delivery data (its reach spread over the days run so far); regular
  // artists and campaigns still in review show an empty state instead.
  const sparkPoints = demo && view.status !== 'review' && ACTIVE_CAMPAIGN.reach > 0 ? dailyImpressions(ACTIVE_CAMPAIGN.reach, ACTIVE_CAMPAIGN.dayOfTotal.en) : [];
  const numberLocale = locale === 'ru' ? 'ru-RU' : 'en-US';
  const fmt = (n: number) => n.toLocaleString(numberLocale);

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + daysRemaining);
  const endLabel = endDate.toLocaleDateString(numberLocale, { day: 'numeric', month: 'long' });

  const reportRows: [string, string][] = [
    ['ID', `${campaignId} — ${title}${artistName ? ` · ${artistName}` : ''}`],
    [s.tabImpressions, `${ACTIVE_CAMPAIGN.reach} / ${ACTIVE_CAMPAIGN.reachGoal}`],
    ['CR', `${ACTIVE_CAMPAIGN.conversionRatePct}%`],
    [s.playlistSaves, String(ACTIVE_CAMPAIGN.playlistSaves ?? 0)],
    ...(ACTIVE_CAMPAIGN.geoBreakdown ?? []).map((g): [string, string] => [g.regionLabel[locale], `${g.pct}%`]),
  ];

  async function copyReport(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(si.reportCopied, 'content-copy');
    } catch {
      showToast(t('actionUnavailableToast'));
    }
  }

  async function shareReport() {
    const text = reportRows.map(([k, v]) => `${k}: ${v}`).join('\n');
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && !navigator.share) return copyReport(text);
    try {
      const res = await Share.share({ title: campaignId, message: text });
      if (res.action !== Share.dismissedAction) showToast(si.reportShared, 'share');
    } catch {
      if (Platform.OS === 'web') await copyReport(text);
    }
  }

  async function exportCsv() {
    const csv = ['metric,value', ...reportRows.map(([k, v]) => `"${k.replace(/"/g, '""')}","${v.replace(/"/g, '""')}"`)].join('\n');
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-${campaignId.replace(/#/g, '')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(si.exported, 'download');
      return;
    }
    try {
      await Share.share({ title: campaignId, message: csv });
    } catch {
      showToast(t('actionUnavailableToast'));
    }
  }

  // Extending or re-targeting reopens the wizard for this campaign's track;
  // the change goes through Review & Pay like any new campaign.
  function extendCampaign() {
    if (guest) return readOnly();
    if (!track) return showToast(si.noCampaignTrack);
    startCampaign(track.id);
    router.push('/profile/artist/campaign/select-package');
  }

  function editAudience() {
    if (guest) return readOnly();
    if (!track) return showToast(si.noCampaignTrack);
    startCampaign(track.id);
    selectPackage(launched.find((c) => c.trackId === track.id)?.packageId ?? 'pro');
    router.push('/profile/artist/campaign/setup');
  }

  function onPause() {
    if (guest) return readOnly();
    togglePause(view.key);
    showToast(paused ? si.resumed : si.paused, paused ? 'play-arrow' : 'pause');
  }

  const curve = CURVES[metric];
  const tabs: { key: Metric; label: string }[] = [
    { key: 'impressions', label: s.tabImpressions },
    { key: 'streams', label: s.tabStreams },
    { key: 'conversion', label: s.tabConversion },
  ];

  return (
    <View style={styles.screen}>
      <StitchHeader title={t('campaignAnalyticsTitle')} onBack={() => goBack(`${artistBase(guest).dashboard}/promotion` as Href)} backLabel={tApp('backLabel')} />

      <ScrollView contentContainerStyle={styles.content}>
        {guest && <DemoNotice text={`${DemoStrings[locale].guestBadge} • ${DemoStrings[locale].readOnly} • ${DemoStrings[locale].guestBanner}`} style={styles.guestNotice} />}
        <View style={styles.idRow}>
          <View style={styles.flexShrink}>
            <SText v="label-sm" color={S.outline} style={styles.upper}>
              {s.campaignPrefix} {campaignId}
            </SText>
            <SText v="headline-sm" numberOfLines={1}>
              {title}
            </SText>
          </View>
          <View style={styles.iconRow}>
            <Pressable accessibilityRole="button" accessibilityLabel={s.share} onPress={shareReport} style={styles.roundBtn}>
              <Icon name="ios-share" size={20} color={S.onSurfaceVariant} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={s.export} onPress={exportCsv} style={styles.roundBtn}>
              <Icon name="download" size={20} color={S.onSurfaceVariant} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.heroCard, styles.shadowXl]}>
          <View style={styles.heroTop}>
            <View style={styles.cover}>
              <Artwork uri={track?.coverUri} size={64} radius={SR.lg} />
              <LinearGradient
                pointerEvents="none"
                colors={[alpha(S.black, 0.4), 'transparent', 'transparent']}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </View>
            <View style={styles.heroText}>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <SText v="label-sm" color={S.primary}>
                  {view.status === 'active' ? `${s.live} • ` : ''}
                  {ACTIVE_CAMPAIGN.dayOfTotal[locale]}
                </SText>
              </View>
              <SText v="headline-sm" numberOfLines={1}>
                {title}
              </SText>
              <SText v="body-sm" color={S.onSurfaceVariant} numberOfLines={1}>
                {artistName}
              </SText>
            </View>
            <Sparkline points={sparkPoints} caption={s.sparkCaption} empty={s.sparkEmpty} />
          </View>

          <View style={styles.progressBlock}>
            <View style={styles.between}>
              <SText v="label-md">
                {fmt(ACTIVE_CAMPAIGN.reach)}{' '}
                <SText v="label-md" color={S.outline}>
                  / {fmt(ACTIVE_CAMPAIGN.reachGoal)} {s.impressionsOf}
                </SText>
              </SText>
              <SText v="mono-num" weight="600" color={S.secondary}>
                {Math.round(ACTIVE_CAMPAIGN.progressPct)}% {s.budgetSuffix}
              </SText>
            </View>
            <View style={styles.barTrack}>
              <LinearGradient
                colors={[S.primaryContainer, S.primary, S.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.barFill, { width: `${ACTIVE_CAMPAIGN.progressPct}%` }]}
              />
            </View>
            <View style={[styles.between, styles.pt2]}>
              <View style={styles.inlineIcon}>
                <Icon name="event-repeat" size={14} color={S.outline} />
                <SText v="body-sm" color={S.outline}>
                  {s.remaining.replace('{n}', String(daysRemaining))}
                  {hydrated ? ` ${s.until.replace('{date}', endLabel)}` : ''}
                </SText>
              </View>
              <SText v="mono-num" weight="500" color={S.primary}>
                {s.active}
              </SText>
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          <StatTile
            icon="graphic-eq"
            iconColor={S.primary}
            badge={
              <View style={styles.inlineIcon}>
                <Icon name="trending-up" size={14} color={S.primary} />
                <SText v="label-sm" color={S.primary}>
                  +18%
                </SText>
              </View>
            }
            value={fmt(ACTIVE_CAMPAIGN.reach)}
            caption={s.trackImpressions}
          />
          <StatTile
            icon="headphones"
            iconColor={S.secondary}
            badge={
              <SText v="label-sm" color={S.secondary}>
                {ACTIVE_CAMPAIGN.conversionRatePct}% CR
              </SText>
            }
            value={fmt(ACTIVE_CAMPAIGN.newFollowers)}
            caption={s.promoListeners}
          />
          <StatTile
            icon="library-add-check"
            iconColor={S.tertiary}
            badge={
              <SText v="label-sm" color={S.tertiary}>
                {s.top5}
              </SText>
            }
            value={fmt(ACTIVE_CAMPAIGN.playlistSaves ?? 0)}
            caption={s.playlistSaves}
          />
          <StatTile
            icon="celebration"
            iconColor={S.onSurfaceVariant}
            badge={
              <SText v="label-sm" color={S.outline}>
                {s.today38}
              </SText>
            }
            value={fmt(ACTIVE_CAMPAIGN.profileVisits ?? 0)}
            caption={s.profileVisits}
          />
        </View>

        <View style={[styles.card, styles.shadowMd]}>
          <View style={styles.gapXs}>
            <View style={styles.between}>
              <SText v="headline-sm">{s.dynamicsTitle}</SText>
              <SText v="label-sm" color={S.primary}>
                {s.perDay}
              </SText>
            </View>
            <SText v="body-sm" color={S.outline}>
              {s.dynamicsSubtitle}
            </SText>
          </View>

          <View style={styles.tabs}>
            {tabs.map((tab) => {
              const active = tab.key === metric;
              return (
                <Pressable
                  key={tab.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setMetric(tab.key)}
                  style={[styles.tab, active && styles.tabActive]}
                >
                  <SText v="label-md" color={active ? S.onPrimaryContainer : S.outline} style={styles.center}>
                    {tab.label}
                  </SText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.chart}>
            <Svg width="100%" height="100%" viewBox="0 0 320 120" preserveAspectRatio="none">
              <Defs>
                <SvgLinearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                  <Stop offset="0%" stopColor="#ff5351" stopOpacity={0.35} />
                  <Stop offset="100%" stopColor="#ff5351" stopOpacity={0} />
                </SvgLinearGradient>
                <SvgLinearGradient id="lineStroke" x1="0" x2="1" y1="0" y2="0">
                  <Stop offset="0%" stopColor="#ffb3ae" />
                  <Stop offset="50%" stopColor="#ff5351" />
                  <Stop offset="100%" stopColor="#ffb955" />
                </SvgLinearGradient>
              </Defs>
              <Line stroke="#353437" strokeDasharray="3 3" strokeWidth={1} x1={0} x2={320} y1={20} y2={20} />
              <Line stroke="#353437" strokeDasharray="3 3" strokeWidth={1} x1={0} x2={320} y1={60} y2={60} />
              <Line stroke="#353437" strokeWidth={1} x1={0} x2={320} y1={100} y2={100} />
              <Path d={curve.area} fill="url(#areaGradient)" />
              <Path d={curve.line} fill="none" stroke="url(#lineStroke)" strokeLinecap="round" strokeWidth={3} />
              <Circle cx={10} cy={95} fill="#131315" r={4} stroke="#ffb3ae" strokeWidth={2} />
              <Circle cx={110} cy={50} fill="#131315" r={4} stroke="#ff5351" strokeWidth={2} />
              <Circle cx={210} cy={35} fill="#131315" r={4} stroke="#ff5351" strokeWidth={2} />
              <Circle cx={310} cy={18} fill="#ffb955" r={5} stroke="#ffffff" strokeWidth={2} />
              <G transform="translate(260, -2)">
                <Rect fill="#2a2a2c" height={18} rx={9} width={52} />
                <SvgText fill="#ffb955" fontFamily="Inter" fontSize={10} fontWeight="600" textAnchor="middle" x={26} y={12}>
                  {s.peak}
                </SvgText>
              </G>
            </Svg>
          </View>
          <View style={styles.xLabels}>
            <SText v="mono-num" color={S.outline}>
              {s.day1}
            </SText>
            <SText v="mono-num" color={S.outline}>
              {s.day2}
            </SText>
            <SText v="mono-num" color={S.outline}>
              {s.day3}
            </SText>
            <SText v="mono-num" weight="600">
              {s.today}
            </SText>
          </View>
        </View>

        <View style={[styles.card, styles.shadowMd]}>
          <View style={styles.between}>
            <SText v="headline-sm">{s.geoTitle}</SText>
            <SText v="label-sm" color={S.outline}>
              {s.country}
            </SText>
          </View>
          <View style={styles.gapSm}>
            <SText v="label-sm" color={S.onSurfaceVariant}>
              {s.topLocations}
            </SText>
            {(ACTIVE_CAMPAIGN.geoBreakdown ?? []).map((g, i) => (
              <GeoBreakdownRow key={g.regionLabel.en} regionLabel={g.regionLabel[locale]} pct={g.pct} count={g.count} fill={GEO_FILLS[i % GEO_FILLS.length]} />
            ))}
          </View>
          <View style={[styles.gapXs, styles.pt4]}>
            <SText v="label-sm" color={S.onSurfaceVariant}>
              {s.ageSlice}
            </SText>
            <View style={styles.ageRow}>
              <View style={styles.ageCell}>
                <SText v="body-sm" color={S.outline}>
                  {s.age1824}
                </SText>
                <SText v="headline-sm" color={S.primary}>
                  52%
                </SText>
              </View>
              <View style={styles.ageCell}>
                <SText v="body-sm" color={S.outline}>
                  {s.age2534}
                </SText>
                <SText v="headline-sm" color={S.secondary}>
                  36%
                </SText>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.card, styles.shadowMd, styles.mbLg]}>
          <View style={styles.inlineIconXs}>
            <Icon name="tune" size={20} color={S.primary} />
            <SText v="headline-sm">{s.manageTitle}</SText>
          </View>
          <View style={styles.gapXs}>
            <Pressable accessibilityRole="button" onPress={extendCampaign} style={[styles.pillBtn, styles.pillPrimary]}>
              <Icon name="bolt" size={20} color={S.onPrimaryContainer} />
              <SText v="label-lg" color={S.onPrimaryContainer}>
                {s.extend}
              </SText>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={editAudience} style={[styles.pillBtn, styles.pillSecondary]}>
              <Icon name="group" size={18} color={S.onSurface} />
              <SText v="label-md">{s.editAudience}</SText>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ checked: paused }} onPress={onPause} style={[styles.pillBtn, styles.pillPause]}>
              <Icon name={paused ? 'play-circle-outline' : 'pause-circle-outline'} size={18} color={S.error} />
              <SText v="label-md" color={S.error}>
                {paused ? si.resumeDelivery : s.pause}
              </SText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      {toast}
    </View>
  );
}

function StatTile({ icon, iconColor, badge, value, caption }: { icon: string; iconColor: string; badge: React.ReactNode; value: string; caption: string }) {
  return (
    <View style={[styles.tile, styles.shadowMd]}>
      <View style={[styles.between, styles.mb2]}>
        <Icon name={icon} size={20} color={iconColor} />
        {badge}
      </View>
      <View>
        <SText v="headline-lg" style={styles.tight}>
          {value}
        </SText>
        <SText v="label-md" color={S.outline}>
          {caption}
        </SText>
      </View>
    </View>
  );
}

/** Split reach into deterministic daily impressions for the days run so far
 * ("Day 4 of 10" → 4 days; "Completed … · 14 days" → 14). Sums to reach. */
function dailyImpressions(reach: number, dayLabel: string): number[] {
  const nums = dayLabel.match(/\d+/g)?.map(Number) ?? [];
  const days = Math.max(2, Math.min(30, /^Day/.test(dayLabel) ? nums[0] ?? 2 : nums[nums.length - 1] ?? 7));
  const weights = Array.from({ length: days }, (_, i) => 0.7 + 0.6 * (i / (days - 1)) + 0.15 * Math.sin(i * 1.7));
  const total = weights.reduce((a, w) => a + w, 0);
  return weights.map((w) => Math.round((reach * w) / total));
}

/** Compact activity sparkline for the hero card (or a quiet empty state). */
function Sparkline({ points, caption, empty }: { points: number[]; caption: string; empty: string }) {
  const W = 84;
  const H = 34;
  if (points.length < 2) {
    return (
      <View style={styles.spark} accessibilityLabel={empty}>
        <Svg width={W} height={H}>
          <Line x1={2} y1={H - 4} x2={W - 2} y2={H - 4} stroke={alpha(S.outline, 0.35)} strokeWidth={1.5} strokeDasharray="3 4" />
        </Svg>
        <SText v="label-sm" color={S.outline}>
          {empty}
        </SText>
      </View>
    );
  }
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = Math.max(1, max - min);
  const xy = points.map((v, i) => [2 + (i * (W - 4)) / (points.length - 1), H - 4 - ((v - min) / span) * (H - 10)] as const);
  const d = xy.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const last = xy[xy.length - 1]!;
  return (
    <View style={styles.spark} accessibilityLabel={caption}>
      <Svg width={W} height={H}>
        <Path d={`${d} L ${last[0].toFixed(1)} ${H} L 2 ${H} Z`} fill={alpha(S.primary, 0.12)} />
        <Path d={d} fill="none" stroke={S.primary} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={last[0]} cy={last[1]} r={2.5} fill={S.primary} />
      </Svg>
      <SText v="label-sm" color={S.outline}>
        {caption}
      </SText>
    </View>
  );
}

const styles = StyleSheet.create({
  spark: { alignItems: 'flex-end', gap: 2 },
  guestNotice: { marginBottom: SS.md },
  screen: { flex: 1, backgroundColor: S.surface },
  content: { paddingHorizontal: SS.margin, paddingTop: SS.md, paddingBottom: SS.lg, gap: SS.lg },
  idRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SS.sm },
  flexShrink: { flexShrink: 1, minWidth: 0 },
  upper: { textTransform: 'uppercase', letterSpacing: 0.05 * 10 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: SS.xs },
  roundBtn: { width: 40, height: 40, borderRadius: SR.full, backgroundColor: S.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  heroCard: { overflow: 'hidden', borderRadius: SR.xl, backgroundColor: S.surfaceContainer, padding: SS.md, gap: SS.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: SS.md },
  cover: {
    width: 64,
    height: 64,
    borderRadius: SR.lg,
    overflow: 'hidden',
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    shadowOpacity: 0.6,
  },
  heroText: { flex: 1, minWidth: 0 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: SR.full,
    backgroundColor: alpha(S.primaryContainer, 0.2),
    marginBottom: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: S.primary },
  progressBlock: { gap: SS.xs, paddingTop: 4 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pt2: { paddingTop: 2 },
  pt4: { paddingTop: SS.xs },
  barTrack: { width: '100%', height: 8, borderRadius: SR.full, backgroundColor: S.surfaceContainerHighest, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: SR.full },
  inlineIcon: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inlineIconXs: { flexDirection: 'row', alignItems: 'center', gap: SS.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SS.sm },
  tile: { flexBasis: '47%', flexGrow: 1, padding: SS.md, borderRadius: SR.xl, backgroundColor: S.surfaceContainer, justifyContent: 'space-between' },
  mb2: { marginBottom: 8 },
  tight: { letterSpacing: -0.025 * 24 },
  card: { padding: SS.md, borderRadius: SR.xl, backgroundColor: S.surfaceContainer, gap: SS.md },
  mbLg: { marginBottom: SS.lg },
  gapXs: { gap: SS.xs },
  gapSm: { gap: SS.sm },
  tabs: { flexDirection: 'row', alignItems: 'center', gap: SS.xs, backgroundColor: S.surfaceContainerHigh, padding: 4, borderRadius: SR.full },
  tab: { flex: 1, paddingVertical: 4, borderRadius: SR.full },
  tabActive: { backgroundColor: S.primaryContainer },
  center: { textAlign: 'center' },
  chart: { width: '100%', height: 168, paddingTop: 8 },
  xLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  ageRow: { flexDirection: 'row', gap: SS.xs },
  ageCell: { flex: 1, padding: SS.sm, borderRadius: SR.lg, backgroundColor: S.surfaceContainerHigh, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pillBtn: { width: '100%', borderRadius: SR.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SS.xs },
  pillPrimary: {
    height: 48,
    backgroundColor: S.primaryContainer,
    shadowColor: S.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 20,
    shadowOpacity: 0.35,
  },
  pillSecondary: { height: 44, backgroundColor: S.surfaceContainerHigh },
  pillPause: { height: 44, backgroundColor: S.surfaceContainerLow },
  shadowMd: { shadowColor: S.black, shadowOffset: { width: 0, height: 4 }, shadowRadius: 6, shadowOpacity: 0.1, elevation: 3 },
  shadowXl: { shadowColor: S.black, shadowOffset: { width: 0, height: 20 }, shadowRadius: 25, shadowOpacity: 0.1, elevation: 8 },
});
