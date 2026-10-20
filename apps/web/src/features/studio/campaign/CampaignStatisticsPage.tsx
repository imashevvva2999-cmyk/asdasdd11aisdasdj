// First: configures @mmusic/core storage before the persisted demo-session / locale stores are used.
import '@/platform/storage';

import { useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { DEMO_CAMPAIGN_HISTORY } from '@mmusic/core/demo/demo-fixture';
import { artistBase, useIsGuestPreview } from '@mmusic/core/demo/guest-mode';
import { resolveCampaignView } from '@mmusic/core/lib/campaign-view';
import { CAMPAIGN_HISTORY } from '@mmusic/core/mocks/promotions';
import { InteractionPromoStrings } from '@mmusic/core/promotion/strings/interactions';
import { StatisticsPromoStrings } from '@mmusic/core/promotion/strings/statistics';
import { useArtistStore } from '@mmusic/core/state/artist-store';
import { ACTIVE_CAMPAIGN_KEY, useCampaignStore } from '@mmusic/core/state/campaign-store';
import { useDashboardStrings } from '@mmusic/core/state/dashboard-locale-store';
import { useIsDemoArtist } from '@mmusic/core/state/demo-session-store';
import { Icon, type IconName } from '@mmusic/ui-kit/web';

import { Artwork } from '@/components/Artwork';
import { Page } from '@/ui';

import { useDemoStrings, usePageTitle, usePromoStrings, useStudioToast } from '../kit';
import { DemoNotice, StitchHeader, useGoBack, useToday } from './shared';

type Metric = 'impressions' | 'streams' | 'conversion';

/** Stitch's own per-tab curves (viewBox 0 0 320 120), as in the mobile screen. */
const CURVES: Record<Metric, { line: string; area: string }> = {
  impressions: { line: 'M 10 95 Q 85 85, 110 50 T 210 35 T 310 18', area: 'M 10 95 Q 85 85, 110 50 T 210 35 T 310 18 L 310 100 L 10 100 Z' },
  streams: { line: 'M 10 98 Q 90 90, 110 65 T 210 40 T 310 30', area: 'M 10 98 Q 90 90, 110 65 T 210 40 T 310 30 L 310 100 L 10 100 Z' },
  conversion: { line: 'M 10 70 Q 75 60, 110 40 T 210 32 T 310 22', area: 'M 10 70 Q 75 60, 110 40 T 210 32 T 310 22 L 310 100 L 10 100 Z' },
};
const GEO_TONES = ['primary', 'secondary', 'tertiary'] as const;

/** Deterministic daily impressions for the days run so far (sums to reach) — mobile dailyImpressions. */
function dailyImpressions(reach: number, dayLabel: string): number[] {
  const nums = dayLabel.match(/\d+/g)?.map(Number) ?? [];
  const days = Math.max(2, Math.min(30, /^Day/.test(dayLabel) ? (nums[0] ?? 2) : (nums[nums.length - 1] ?? 7)));
  const weights = Array.from({ length: days }, (_, i) => 0.7 + 0.6 * (i / (days - 1)) + 0.15 * Math.sin(i * 1.7));
  const total = weights.reduce((a, w) => a + w, 0);
  return weights.map((w) => Math.round((reach * w) / total));
}

function Sparkline({ points, caption, empty }: { points: number[]; caption: string; empty: string }) {
  const W = 84;
  const H = 34;
  if (points.length < 2) {
    return (
      <span className="cp-spark">
        <svg width={W} height={H} aria-hidden="true">
          <line x1={2} y1={H - 4} x2={W - 2} y2={H - 4} stroke="rgba(171,136,134,0.35)" strokeWidth={1.5} strokeDasharray="3 4" />
        </svg>
        <span className="t-label-sm cp-outline">{empty}</span>
      </span>
    );
  }
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = Math.max(1, max - min);
  const xy = points.map((v, i) => [2 + (i * (W - 4)) / (points.length - 1), H - 4 - ((v - min) / span) * (H - 10)] as const);
  const d = xy.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const last = xy[xy.length - 1]!;
  return (
    <span className="cp-spark">
      <svg width={W} height={H} aria-hidden="true">
        <path d={`${d} L ${last[0].toFixed(1)} ${H} L 2 ${H} Z`} fill="rgba(255,179,174,0.12)" />
        <path d={d} fill="none" stroke="#ffb3ae" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={last[0]} cy={last[1]} r={2.5} fill="#ffb3ae" />
      </svg>
      <span className="t-label-sm cp-outline">{caption}</span>
    </span>
  );
}

function StatTile({ icon, tone, badge, value, caption }: { icon: IconName; tone: string; badge: ReactNode; value: string; caption: string }) {
  return (
    <div className="cp-tile">
      <div className="cp-between">
        <Icon name={icon} size={20} className={tone} />
        {badge}
      </div>
      <strong className="cp-tile-value">{value}</strong>
      <span className="t-label-md cp-outline">{caption}</span>
    </div>
  );
}

/** Campaign Analytics (mobile campaign/statistics.tsx): ?campaign=<id> picks the active demo campaign, a launched one
 * (in review: zero delivery) or a completed one (lib/campaign-view). Share copies a text report, export downloads a
 * CSV; extend / edit audience reopen the wizard; pause toggles the local pause state. Guest preview: read-only. */
export function CampaignStatisticsPage() {
  const { t, locale } = useDashboardStrings();
  const s = usePromoStrings(StatisticsPromoStrings);
  const si = usePromoStrings(InteractionPromoStrings);
  const { d } = useDemoStrings();
  usePageTitle(t('campaignAnalyticsTitle'));
  const navigate = useNavigate();
  const goBack = useGoBack();
  const { showToast, toast } = useStudioToast();
  const entries = useArtistStore((st) => st.entries);
  const artist = useArtistStore((st) => st.artist);
  const launched = useCampaignStore((st) => st.launched);
  const guest = useIsGuestPreview();
  const demo = useIsDemoArtist();
  const readOnly = () => showToast(d.readOnlyToast, 'lock');
  const startCampaign = useCampaignStore((st) => st.startCampaign);
  const selectPackage = useCampaignStore((st) => st.selectPackage);
  const [params] = useSearchParams();
  const campaignParam = params.get('campaign') ?? undefined;
  const allHistory = [...DEMO_CAMPAIGN_HISTORY, ...CAMPAIGN_HISTORY];
  const view = resolveCampaignView(campaignParam, ACTIVE_CAMPAIGN_KEY, launched, allHistory);
  const data = view.data;
  const paused = useCampaignStore((st) => st.pausedCampaignIds.includes(view.key));
  const togglePause = useCampaignStore((st) => st.togglePause);
  const [metric, setMetric] = useState<Metric>('impressions');
  const today = useToday();

  const track =
    entries.find((e) => e.track.id === view.trackId)?.track ?? (view.status === 'active' ? entries.find((e) => e.track.id === launched[0]?.trackId)?.track : undefined);
  const title = track?.title ?? allHistory.find((h) => h.id === campaignParam)?.trackTitle ?? t('activeCampaignFallbackLabel');
  const artistName = track?.artistName ?? artist?.name ?? '';
  const [currentDay, totalDays] = data.dayOfTotal.en.match(/\d+/g)?.map(Number) ?? [0, 0];
  const daysRemaining = Math.max((totalDays ?? 0) - (currentDay ?? 0), 0);
  const idDigits = view.status === 'active' ? (launched[0]?.id.match(/\d+/)?.[0] ?? view.number).slice(-4) : view.number;
  const campaignId = `#PR-${idDigits}-MM`;
  const sparkPoints = demo && view.status !== 'review' && data.reach > 0 ? dailyImpressions(data.reach, data.dayOfTotal.en) : [];
  const numberLocale = locale === 'ru' ? 'ru-RU' : 'en-US';
  const fmt = (n: number) => n.toLocaleString(numberLocale);
  const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysRemaining);
  const endLabel = endDate.toLocaleDateString(numberLocale, { day: 'numeric', month: 'long' });

  const reportRows: [string, string][] = [
    ['ID', `${campaignId} — ${title}${artistName ? ` · ${artistName}` : ''}`],
    [s.tabImpressions, `${data.reach} / ${data.reachGoal}`],
    ['CR', `${data.conversionRatePct}%`],
    [s.playlistSaves, String(data.playlistSaves ?? 0)],
    ...(data.geoBreakdown ?? []).map((g): [string, string] => [g.regionLabel[locale], `${g.pct}%`]),
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
    if (!navigator.share) return copyReport(text);
    try {
      await navigator.share({ title: campaignId, text });
      showToast(si.reportShared, 'share');
    } catch (e) {
      // Dismissing the share sheet is not an error worth a fallback.
      if (!(e instanceof DOMException && e.name === 'AbortError')) await copyReport(text);
    }
  }
  function exportCsv() {
    const csv = ['metric,value', ...reportRows.map(([k, v]) => `"${k.replace(/"/g, '""')}","${v.replace(/"/g, '""')}"`)].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-${campaignId.replace(/#/g, '')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(si.exported, 'download');
  }
  function extendCampaign() {
    if (guest) return readOnly();
    if (!track) return showToast(si.noCampaignTrack);
    startCampaign(track.id);
    void navigate('/profile/artist/campaign/select-package');
  }
  function editAudience() {
    if (guest) return readOnly();
    if (!track) return showToast(si.noCampaignTrack);
    startCampaign(track.id);
    selectPackage(launched.find((c) => c.trackId === track.id)?.packageId ?? 'pro');
    void navigate('/profile/artist/campaign/setup');
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
    <Page narrow>
      <StitchHeader title={t('campaignAnalyticsTitle')} onBack={() => goBack(`${artistBase(guest).dashboard}/promotion`)} />
      {guest && <DemoNotice text={`${d.guestBadge} • ${d.readOnly} • ${d.guestBanner}`} />}

      <div className="cp-between cp-mb">
        <span className="cp-item-text">
          <span className="cp-eyebrow">
            {s.campaignPrefix} {campaignId}
          </span>
          <span className="t-headline-sm ellipsis">{title}</span>
        </span>
        <span className="cp-row">
          <button type="button" className="icon-btn" aria-label={s.share} onClick={() => void shareReport()}>
            <Icon name="ios-share" size={20} />
          </button>
          <button type="button" className="icon-btn" aria-label={s.export} onClick={exportCsv}>
            <Icon name="download" size={20} />
          </button>
        </span>
      </div>

      <section className="cp-card">
        <div className="cp-row">
          <Artwork source={track?.coverUri} className="cp-big-art" />
          <span className="cp-item-text">
            <span className="cp-live-pill">
              <span className="cp-live-dot" />
              {view.status === 'active' ? `${s.live} • ` : ''}
              {data.dayOfTotal[locale]}
            </span>
            <span className="t-headline-sm ellipsis">{title}</span>
            <span className="t-body-sm cp-variant ellipsis">{artistName}</span>
          </span>
          <Sparkline points={sparkPoints} caption={s.sparkCaption} empty={s.sparkEmpty} />
        </div>
        <div className="cp-between">
          <span className="t-label-md">
            {fmt(data.reach)}{' '}
            <span className="cp-outline">
              / {fmt(data.reachGoal)} {s.impressionsOf}
            </span>
          </span>
          <span className="cp-mono cp-secondary">
            {Math.round(data.progressPct)}% {s.budgetSuffix}
          </span>
        </div>
        <div className="cp-bar gradient">
          <span style={{ width: `${data.progressPct}%` }} />
        </div>
        <div className="cp-between">
          <span className="cp-row t-body-sm cp-outline">
            <Icon name="event-repeat" size={14} />
            {s.remaining.replace('{n}', String(daysRemaining))} {s.until.replace('{date}', endLabel)}
          </span>
          <span className="cp-mono cp-primary">{s.active}</span>
        </div>
      </section>

      <div className="cp-tiles">
        <StatTile
          icon="graphic-eq"
          tone="cp-primary"
          badge={
            <span className="cp-row t-label-sm cp-primary">
              <Icon name="trending-up" size={14} />
              +18%
            </span>
          }
          value={fmt(data.reach)}
          caption={s.trackImpressions}
        />
        <StatTile icon="headphones" tone="cp-secondary" badge={<span className="t-label-sm cp-secondary">{data.conversionRatePct}% CR</span>} value={fmt(data.newFollowers)} caption={s.promoListeners} />
        <StatTile icon="library-add-check" tone="cp-tertiary" badge={<span className="t-label-sm cp-tertiary">{s.top5}</span>} value={fmt(data.playlistSaves ?? 0)} caption={s.playlistSaves} />
        <StatTile icon="celebration" tone="cp-variant" badge={<span className="t-label-sm cp-outline">{s.today38}</span>} value={fmt(data.profileVisits ?? 0)} caption={s.profileVisits} />
      </div>

      <section className="cp-card">
        <div className="cp-between">
          <h2 className="cp-h2">{s.dynamicsTitle}</h2>
          <span className="t-label-sm cp-primary">{s.perDay}</span>
        </div>
        <span className="t-body-sm cp-outline">{s.dynamicsSubtitle}</span>
        <div className="cp-seg" role="tablist">
          {tabs.map((tab) => (
            <button key={tab.key} type="button" role="tab" aria-selected={tab.key === metric} className={tab.key === metric ? 'on' : ''} onClick={() => setMetric(tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>
        <svg className="cp-chart" viewBox="0 0 320 120" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="cpAreaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ff5351" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#ff5351" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="cpLineStroke" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#ffb3ae" />
              <stop offset="50%" stopColor="#ff5351" />
              <stop offset="100%" stopColor="#ffb955" />
            </linearGradient>
          </defs>
          <line stroke="#353437" strokeDasharray="3 3" strokeWidth={1} x1={0} x2={320} y1={20} y2={20} />
          <line stroke="#353437" strokeDasharray="3 3" strokeWidth={1} x1={0} x2={320} y1={60} y2={60} />
          <line stroke="#353437" strokeWidth={1} x1={0} x2={320} y1={100} y2={100} />
          <path d={curve.area} fill="url(#cpAreaGradient)" />
          <path d={curve.line} fill="none" stroke="url(#cpLineStroke)" strokeLinecap="round" strokeWidth={3} vectorEffect="non-scaling-stroke" />
          <circle cx={10} cy={95} fill="#131315" r={4} stroke="#ffb3ae" strokeWidth={2} />
          <circle cx={110} cy={50} fill="#131315" r={4} stroke="#ff5351" strokeWidth={2} />
          <circle cx={210} cy={35} fill="#131315" r={4} stroke="#ff5351" strokeWidth={2} />
          <circle cx={310} cy={18} fill="#ffb955" r={5} stroke="#ffffff" strokeWidth={2} />
        </svg>
        <div className="cp-between cp-mono cp-outline">
          <span>{s.day1}</span>
          <span>{s.day2}</span>
          <span>{s.day3}</span>
          <strong className="cp-text">
            {s.today} • {s.peak}
          </strong>
        </div>
      </section>

      <section className="cp-card">
        <div className="cp-between">
          <h2 className="cp-h2">{s.geoTitle}</h2>
          <span className="t-label-sm cp-outline">{s.country}</span>
        </div>
        <span className="t-label-sm cp-variant">{s.topLocations}</span>
        {(data.geoBreakdown ?? []).map((g, i) => (
          <div key={g.regionLabel.en} className="cp-geo-row">
            <div className="cp-between">
              <span className="t-label-md">{g.regionLabel[locale]}</span>
              <span className="t-label-md">
                {g.pct}% <span className="t-body-sm cp-outline">({g.count.toLocaleString('ru-RU')})</span>
              </span>
            </div>
            <div className="cp-geo-track">
              <span className={GEO_TONES[i % GEO_TONES.length]} style={{ width: `${g.pct}%` }} />
            </div>
          </div>
        ))}
        <span className="t-label-sm cp-variant">{s.ageSlice}</span>
        <div className="cp-age-row">
          <div className="cp-age-cell">
            <span className="t-body-sm cp-outline">{s.age1824}</span>
            <strong className="t-headline-sm cp-primary">52%</strong>
          </div>
          <div className="cp-age-cell">
            <span className="t-body-sm cp-outline">{s.age2534}</span>
            <strong className="t-headline-sm cp-secondary">36%</strong>
          </div>
        </div>
      </section>

      <section className="cp-card">
        <h2 className="cp-h2 cp-row">
          <Icon name="tune" size={20} className="cp-primary" />
          {s.manageTitle}
        </h2>
        <button type="button" className="ui-btn cp-cta" onClick={extendCampaign}>
          <Icon name="bolt" size={20} />
          {s.extend}
        </button>
        <button type="button" className="ui-btn ghost cp-full" onClick={editAudience}>
          <Icon name="group" size={18} />
          {s.editAudience}
        </button>
        <button type="button" className="ui-btn ghost cp-full cp-pause" aria-pressed={paused} onClick={onPause}>
          <Icon name={paused ? 'play-circle-outline' : 'pause-circle-outline'} size={18} />
          {paused ? si.resumeDelivery : s.pause}
        </button>
      </section>
      {toast}
    </Page>
  );
}
