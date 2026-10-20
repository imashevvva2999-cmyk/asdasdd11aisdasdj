// First: configures @mmusic/core storage before the persisted demo-session / dashboard-locale stores are used.
import '@/platform/storage';

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { DEMO_CAMPAIGN_HISTORY } from '@mmusic/core/demo/demo-fixture';
import { DemoStrings } from '@mmusic/core/demo/demo-strings';
import { artistBase, useIsGuestPreview } from '@mmusic/core/demo/guest-mode';
import { ACTIVE_CAMPAIGN, CAMPAIGN_HISTORY, PROMO_PACKAGES, type CampaignHistoryEntry } from '@mmusic/core/mocks/promotions';
import { DashboardPromoStrings } from '@mmusic/core/promotion/strings/dashboard';
import { InteractionPromoStrings } from '@mmusic/core/promotion/strings/interactions';
import { useArtistStore } from '@mmusic/core/state/artist-store';
import { ACTIVE_CAMPAIGN_KEY, useCampaignStore } from '@mmusic/core/state/campaign-store';
import { useDashboardStrings } from '@mmusic/core/state/dashboard-locale-store';
import { useIsDemoArtist } from '@mmusic/core/state/demo-session-store';
import { Icon } from '@mmusic/ui-kit/web';

import { Artwork } from '@/components/Artwork';

import { formatGrouped, ProgressBar, usePromoStrings, useStudioToast } from '../kit';
import { NoArtist } from './OverviewTab';

/** History rows shown before "All N" expands the list. */
const HISTORY_PREVIEW = 2;
const GEO_TONES = ['var(--st-primary-container)', 'var(--st-secondary)', 'var(--st-tertiary)'];

/**
 * Artist Dashboard — Promotion (mobile app/profile/artist/dashboard/promotion.tsx, Stitch "1. mmusic_studio"). Entry
 * into the local campaign wizard (core campaign-store); campaign figures come from the shared promotion mocks / demo
 * fixture, Stitch-only labels from the shared copy tables.
 */
export function PromotionTab() {
  const { t, locale } = useDashboardStrings();
  const s = usePromoStrings(DashboardPromoStrings);
  const si = usePromoStrings(InteractionPromoStrings);
  const navigate = useNavigate();
  const artist = useArtistStore((st) => st.artist);
  const entries = useArtistStore((st) => st.entries);
  const published = useMemo(() => entries.filter((e) => e.status === 'published'), [entries]);
  const { showToast, toast } = useStudioToast();
  const launched = useCampaignStore((st) => st.launched);
  const walletBalanceKgs = useCampaignStore((st) => st.walletBalanceKgs);
  const paused = useCampaignStore((st) => st.pausedCampaignIds.includes(ACTIVE_CAMPAIGN_KEY));
  const togglePause = useCampaignStore((st) => st.togglePause);
  const draftTrackId = useCampaignStore((st) => st.trackId);
  const draftPackageId = useCampaignStore((st) => st.packageId);
  const draftStage = useCampaignStore((st) => st.stage);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const demo = useIsDemoArtist();
  const guest = useIsGuestPreview();
  const dStr = DemoStrings[locale];

  if (!artist) return <NoArtist />;

  const fmt = (n: number) => formatGrouped(n, locale);
  const base = artistBase(guest);
  // Guest preview: "create campaign" opens the read-only package comparison.
  const toWizard = () => void navigate(guest ? `${base.campaign}/select-package` : `${base.campaign}/select-track`);
  const toStatistics = (campaignId?: string) => void navigate(campaignId ? `${base.campaign}/statistics?campaign=${encodeURIComponent(campaignId)}` : `${base.campaign}/statistics`);
  const readOnly = () => showToast(dStr.readOnlyToast, 'lock');
  const onPause = () => {
    if (guest) return readOnly();
    togglePause(ACTIVE_CAMPAIGN_KEY);
    showToast(paused ? si.resumed : si.paused, paused ? 'play-arrow' : 'pause');
  };

  const activeTrack = published.find((e) => e.track.id === ACTIVE_CAMPAIGN.trackId)?.track;
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
  // Demo account: completed campaigns for its own catalog.
  const completedHistory = demo ? DEMO_CAMPAIGN_HISTORY : CAMPAIGN_HISTORY;
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
    else if (h.id === 'draft') void navigate(draftStage === 'settingUp' ? '/profile/artist/campaign/setup' : '/profile/artist/campaign/confirm');
    else toStatistics(h.id);
  };
  const visibleHistory = historyExpanded ? history : history.slice(0, HISTORY_PREVIEW);

  const investmentKgs = completedHistory.reduce((sum, h) => sum + (h.budgetKgs ?? 0), 0);
  const minPerDayKgs = Math.round(Math.min(...PROMO_PACKAGES.filter((p) => p.durationDays > 0).map((p) => p.priceKgs / p.durationDays)));
  const campaignTitle = activeTrack?.title ?? published[0]?.track.title ?? t('activeCampaignFallbackLabel');
  const campaignCover = activeTrack?.coverUri ?? published[0]?.track.coverUri;
  const progress = Math.round(ACTIVE_CAMPAIGN.progressPct);
  const geo = ACTIVE_CAMPAIGN.geoBreakdown ?? [];
  const geoTopPct = geo.slice(0, 2).reduce((sum, g) => sum + g.pct, 0);

  return (
    <div className="st-promo">
      {/* Artist mini header */}
      <div className="st-row" style={{ justifyContent: 'space-between' }}>
        <div className="st-row">
          <span className="st-promo-avatar">
            <Artwork source={artist.photoUri} />
            <span className="verified">
              <Icon name="verified" size={11} />
            </span>
          </span>
          <span className="st-grow">
            <span className="st-row" style={{ gap: 8 }}>
              <span className="t-headline-sm ellipsis">{artist.name}</span>
              <span className="st-promo-badge">{s.artistBadge}</span>
            </span>
            <span className="t-body-sm promo-muted">{s.artistMeta}</span>
          </span>
        </div>
        <button type="button" className="icon-btn" aria-label={s.helpLabel} onClick={() => showToast(si.helpToast, 'help-outline')}>
          <Icon name="help-outline" size={18} />
        </button>
      </div>

      {/* Hero launch card */}
      <div className="st-promo-hero">
        <span className="glow top" aria-hidden="true" />
        <span className="glow bottom" aria-hidden="true" />
        <div className="body">
          <div className="st-row" style={{ gap: 8 }}>
            <span className="st-smart">
              <Icon name="local-fire-department" size={14} />
              {s.smartPush}
            </span>
            <span className="t-mono-num promo-muted">{s.audioHub}</span>
          </div>
          <h2 className="t-headline-lg" style={{ margin: 0 }}>
            {s.heroTitle}
          </h2>
          <p className="t-body-md promo-muted" style={{ margin: 0 }}>
            {s.heroBodyPrefix}
            <strong style={{ color: 'var(--st-on-surface)' }}>{s.heroBodyBrand}</strong>
            {s.heroBodySuffix}
          </p>
          <div className="st-row wrap" style={{ gap: 16 }}>
            <button type="button" className="ui-btn" onClick={toWizard}>
              <Icon name="rocket-launch" size={18} />
              {s.heroCta}
            </button>
            <span>
              <span className="t-mono-num promo-muted block">{s.startFrom}</span>
              <span className="t-label-md st-promo-gold">
                {minPerDayKgs} {s.perDay}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* 30-day summary */}
      <section className="st-col" style={{ gap: 12 }}>
        <div className="st-row" style={{ justifyContent: 'space-between' }}>
          <h2 className="t-headline-sm st-row" style={{ margin: 0, gap: 8 }}>
            <span className="st-promo-gold">
              <Icon name="insights" size={20} />
            </span>
            {s.summaryTitle}
          </h2>
          <span className="t-mono-num promo-muted">{s.updated}</span>
        </div>
        <div className="st-stats four">
          <div className="st-promo-stat">
            <span className="head">
              {s.reachLabel}
              <Icon name="graphic-eq" size={18} />
            </span>
            <span className="value">{fmt(ACTIVE_CAMPAIGN.reach)}</span>
            <span className="t-label-sm st-emerald st-row" style={{ gap: 4 }}>
              <Icon name="trending-up" size={14} />
              {s.reachDelta}
            </span>
          </div>
          <div className="st-promo-stat">
            <span className="head">
              {s.fansLabel}
              <Icon name="favorite-border" size={18} />
            </span>
            <span className="value">{ACTIVE_CAMPAIGN.conversionRatePct}%</span>
            <span className="t-body-sm promo-muted ellipsis">{s.fansHint}</span>
          </div>
          <div className="st-promo-stat">
            <span className="head">
              {s.rotationLabel}
              <span className="st-live-dot" />
            </span>
            <span className="value small">1 {s.campaignWord}</span>
            <span className="t-body-sm ellipsis" style={{ color: 'var(--st-primary-container)' }}>
              «{campaignTitle}»
            </span>
          </div>
          <div className="st-promo-stat">
            <span className="head">
              {s.investLabel}
              <Icon name="account-balance-wallet" size={18} />
            </span>
            <span className="value small">
              {fmt(investmentKgs)} <span className="t-label-md promo-muted">{s.currency}</span>
            </span>
            <span className="t-body-sm st-emerald">{s.roi}</span>
          </div>
        </div>
      </section>

      {/* Current campaign */}
      <section className="st-col" style={{ gap: 12 }}>
        <div className="st-row" style={{ justifyContent: 'space-between' }}>
          <h2 className="t-headline-sm st-row" style={{ margin: 0, gap: 8 }}>
            <span style={{ color: 'var(--st-primary-container)' }}>
              <Icon name="radio-button-checked" size={20} />
            </span>
            {s.currentTitle}
          </h2>
          <span className="st-live-badge">
            <span className="st-live-dot" />
            {s.onAir} • {ACTIVE_CAMPAIGN.dayOfTotal[locale]}
          </span>
        </div>
        <div className="st-promo-card">
          <div className="st-row" style={{ alignItems: 'flex-start', gap: 16 }}>
            <Artwork source={campaignCover} className="st-promo-cover" />
            <span className="st-grow">
              <span className="st-row" style={{ justifyContent: 'space-between' }}>
                <span className="t-label-sm st-promo-gold ellipsis" style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {s.streamType}
                </span>
                <span className="t-mono-num promo-muted">{s.campaignId}</span>
              </span>
              <span className="t-headline-sm ellipsis block">{campaignTitle}</span>
              <span className="t-body-sm promo-muted ellipsis block">
                {artist.name} • {s.lpSuffix}
              </span>
              <span className="st-row t-mono-num" style={{ justifyContent: 'space-between', marginTop: 8 }}>
                <span className="st-row" style={{ gap: 4 }}>
                  <span style={{ color: 'var(--st-primary-container)' }}>
                    <Icon name="play-circle-outline" size={14} />
                  </span>
                  {fmt(ACTIVE_CAMPAIGN.reach)} {s.impressions}
                </span>
                <span className="promo-muted">
                  {s.goal} {fmt(ACTIVE_CAMPAIGN.reachGoal)}
                </span>
              </span>
            </span>
          </div>
          <div className="st-col" style={{ gap: 8 }}>
            <div className="st-row t-body-sm" style={{ justifyContent: 'space-between' }}>
              <span>{s.progress}</span>
              <span className="t-mono-num" style={{ color: 'var(--st-primary-container)', fontWeight: 700 }}>
                {progress}% {s.done}
              </span>
            </div>
            <ProgressBar pct={ACTIVE_CAMPAIGN.progressPct} gradient label={s.progress} />
            <div className="st-row t-mono-num promo-muted" style={{ justifyContent: 'space-between' }}>
              <span>
                {s.remaining} {fmt(ACTIVE_CAMPAIGN.reachGoal - ACTIVE_CAMPAIGN.reach)} {s.impressions}
              </span>
              <span>{s.finish}</span>
            </div>
          </div>
          <div className="st-row">
            <button type="button" className="ui-btn ghost st-grow" onClick={() => toStatistics()}>
              {s.details}
              <Icon name="arrow-forward" size={16} />
            </button>
            <button type="button" className="icon-btn" aria-label={paused ? si.resume : s.pause} aria-pressed={paused} onClick={onPause}>
              <Icon name={paused ? 'play-arrow' : 'pause'} size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Listener geography */}
      <section className="st-promo-card">
        <div className="st-row" style={{ justifyContent: 'space-between' }}>
          <h2 className="t-headline-sm st-row" style={{ margin: 0, gap: 8 }}>
            <span className="st-promo-gold">
              <Icon name="public" size={20} />
            </span>
            {s.geoTitle}
          </h2>
          <span className="t-mono-num" style={{ color: 'var(--st-primary)' }}>
            {s.geoTop} ({geoTopPct}%)
          </span>
        </div>
        {geo.map((g, i) => (
          <div key={g.regionLabel.en} className="st-col" style={{ gap: 6 }}>
            <div className="st-row" style={{ justifyContent: 'space-between' }}>
              <span className="t-body-sm">{g.regionLabel[locale]}</span>
              <span className="t-mono-num promo-muted">
                {g.pct}% ({fmt(g.count)} {s.people})
              </span>
            </div>
            <div className="st-share-track">
              <span className="fill" style={{ width: `${g.pct}%`, background: GEO_TONES[i % GEO_TONES.length] }} />
            </div>
          </div>
        ))}
      </section>

      {/* Campaign history */}
      <section className="st-col" style={{ gap: 12 }}>
        <div className="st-row" style={{ justifyContent: 'space-between' }}>
          <h2 className="t-headline-sm st-row" style={{ margin: 0, gap: 8 }}>
            <span className="promo-muted">
              <Icon name="history" size={20} />
            </span>
            {s.historyTitle}
          </h2>
          <button type="button" className="st-link-btn" aria-expanded={historyExpanded} onClick={() => setHistoryExpanded((v) => !v)}>
            {historyExpanded ? si.collapse : `${s.all} ${history.length}`}
          </button>
        </div>
        <div className="ui-list">
          {visibleHistory.map((h) => (
            <button key={h.id} type="button" className="ui-row" onClick={() => openHistory(h)}>
              <Artwork source={coverFor(h.trackId)} className="art" />
              <span className="text">
                <span className="st-row" style={{ gap: 8 }}>
                  <span className="t-label-lg ellipsis">{h.trackTitle}</span>
                  {h.formatBadge && <span className="st-pill t-mono-num">{h.formatBadge[locale]}</span>}
                </span>
                <span className="t-body-sm medium ellipsis">
                  {h.completedLabel[locale]}
                  {h.budgetKgs !== undefined ? ` • ${s.budget} ${fmt(h.budgetKgs)} ${s.currency}` : ''}
                </span>
              </span>
              <span className="trail" style={{ display: 'grid', justifyItems: 'end', gap: 2 }}>
                <span className="t-mono-num st-emerald" style={{ fontWeight: 700 }}>
                  {h.metric[locale]}
                </span>
                <span className="t-body-sm">
                  {fmt(h.reach)} {s.reachSuffix}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Promo wallet */}
      <div className="st-promo-wallet">
        <div className="st-row">
          <span className="icon">
            <Icon name="monetization-on" size={20} />
          </span>
          <span className="st-grow">
            <span className="t-label-md block">{s.walletTitle}</span>
            <span className="t-body-sm promo-muted">{s.walletHint}</span>
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className="t-headline-sm block">
            {fmt(walletBalanceKgs)} {s.currency}
          </span>
          <button type="button" className="st-link-btn st-promo-gold" onClick={() => showToast(guest ? dStr.readOnlyToast : si.topUpToast, guest ? 'lock' : undefined)}>
            {s.walletTopUp}
          </button>
        </div>
      </div>

      {/* Create-campaign CTA */}
      <button type="button" className="st-promo-create" onClick={toWizard}>
        <Icon name="add-circle" size={22} />
        {s.createCta}
      </button>
      {toast}
    </div>
  );
}
