// First: configures @mmusic/core storage before the persisted demo-session / dashboard-locale stores are used.
import '@/platform/storage';

import { useMemo, useState } from 'react';

import { DEMO_PERIODS, buildDemoArtistAnalytics, type DemoPeriod, type DemoShare } from '@mmusic/core/demo/demo-analytics';
import { getTrackAnalytics, type TimePeriod } from '@mmusic/core/lib/analytics-mock';
import type { DashboardStringKey } from '@mmusic/core/lib/dashboard-i18n';
import { useArtistStore } from '@mmusic/core/state/artist-store';
import { useCampaignStore } from '@mmusic/core/state/campaign-store';
import { useDashboardStrings } from '@mmusic/core/state/dashboard-locale-store';
import { useIsDemoArtist } from '@mmusic/core/state/demo-session-store';

import { Artwork } from '@/components/Artwork';
import { EmptyState } from '@/ui';

import { ChipRow, NoData, ShareRow, StatCard, TrendChart, useDemoStrings } from '../kit';

const PERIOD_KEYS: { id: TimePeriod; key: DashboardStringKey }[] = [
  { id: '24h', key: 'period24h' },
  { id: '7d', key: 'period7d' },
  { id: '28d', key: 'period28d' },
  { id: 'all', key: 'periodAll' },
];

/**
 * Artist overview analytics (mobile components/dashboard/demo-artist-analytics.tsx): the labelled DEMO dataset for
 * the demo account / guest preview; a regular artist sees only their own data (Overview figures, own campaigns) and
 * empty states — never the demo figures.
 */
function ArtistOverviewAnalytics({ demo }: { demo: boolean }) {
  const { d, locale } = useDemoStrings();
  const entries = useArtistStore((s) => s.entries);
  const monthlyListeners = useArtistStore((s) => s.artist?.monthlyListeners ?? 0);
  const launched = useCampaignStore((s) => s.launched);
  const [period, setPeriod] = useState<DemoPeriod>('30d');
  const data = useMemo(() => buildDemoArtistAnalytics(entries, period, launched), [entries, period, launched]);
  const empty = <NoData text={d.anNoData} hint={d.anNoDataHint} />;
  const fmt = (n: number) => n.toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US');
  const periodLabel: Record<DemoPeriod, string> = { '7d': d.an7d, '30d': d.an30d, '90d': d.an90d };
  const geoGroup = (region: 'kg' | 'abroad') => data.geography.filter((g) => g.region === region);
  const groupPct = (rows: DemoShare[]) => rows.reduce((s, g) => s + g.pct, 0);
  const historyMax = Math.max(1, ...data.history.map((h) => h.streams));

  return (
    <section className="st-col">
      <div className="st-row">
        <h2 className="st-section-title" style={{ margin: 0 }}>
          {d.anTitle}
        </h2>
        {demo && <span className="st-pill st-secondary-text">{d.anBadge}</span>}
      </div>
      <p className="t-body-sm medium" style={{ margin: 0 }}>
        {demo ? d.anNote : d.anRealNote}
      </p>
      <ChipRow label={d.anTrend} options={DEMO_PERIODS.map((p) => ({ id: p, label: periodLabel[p] }))} value={period} onChange={setPeriod} />

      <div className="st-stats four">
        <StatCard label={d.anStreams} value={demo ? fmt(data.streams) : fmt(0)} />
        <StatCard label={d.anListeners} value={demo ? fmt(data.listeners) : fmt(monthlyListeners)} />
        <StatCard label={d.anSaveRate} value={demo ? `${data.saveRatePct}%` : '—'} />
        <StatCard label={d.anEngagement} value={demo ? `${data.engagementPct}%` : '—'} />
      </div>

      <div className="st-analytics-grid">
        <div className="st-card">
          <span className="st-eyebrow">{d.anAttributed}</span>
          <span className="t-headline-md">{fmt(demo ? data.attributedStreams : 0)}</span>
          <span className="t-body-sm medium">
            {demo ? `${data.attributedPct}% ${d.anAttributedHint}` : launched.length > 0 ? d.anPromoInReview.replace('{n}', String(launched.length)) : d.anPromoNone}
          </span>
        </div>

        <div className="st-card">
          <h3 className="t-headline-sm">
            {d.anTrend} • {periodLabel[period].toLowerCase()}
          </h3>
          {demo ? <TrendChart points={data.trend} peakLabel={`${d.anPeak} ${fmt(data.peak)}`} /> : empty}
        </div>

        <div className="st-card">
          <h3 className="t-headline-sm">{d.anAges}</h3>
          {demo ? data.ages.map((a) => <ShareRow key={a.label.en} label={a.label[locale]} pct={a.pct} count={a.count} fmt={fmt} />) : empty}
        </div>

        <div className="st-card">
          <h3 className="t-headline-sm">{d.anGeo}</h3>
          {!demo && empty}
          {demo &&
            (['kg', 'abroad'] as const).map((region) => (
              <div key={region} className="st-col" style={{ gap: 10 }}>
                <span className="st-eyebrow">
                  {region === 'kg' ? d.anKg : d.anAbroad} • {groupPct(geoGroup(region))}%
                </span>
                {geoGroup(region).map((g) => (
                  <ShareRow key={g.label.en} label={g.label[locale]} pct={g.pct} count={g.count} fmt={fmt} tone={region === 'kg' ? 'primary' : 'secondary'} />
                ))}
              </div>
            ))}
        </div>

        <div className="st-card">
          <h3 className="t-headline-sm">{d.anSources}</h3>
          {!demo && empty}
          {demo && data.sources.map((s, i) => <ShareRow key={s.label.en} label={s.label[locale]} pct={s.pct} count={s.count} fmt={fmt} tone={i === data.sources.length - 1 ? 'secondary' : 'tertiary'} />)}
        </div>

        <div className="st-card">
          <h3 className="t-headline-sm">{d.anTop}</h3>
          {!demo && empty}
          {demo &&
            data.topTracks.map((tr, i) => (
              <div key={tr.trackId} className="st-row">
                <span className="t-label-lg medium" style={{ width: 18, textAlign: 'right' }}>
                  {i + 1}
                </span>
                <Artwork source={tr.coverUri} className="st-top-art" />
                <span className="st-grow">
                  <span className="t-label-lg ellipsis block">{tr.title}</span>
                  <span className="t-body-sm medium">
                    {fmt(tr.streams)} • {tr.sharePct}%
                  </span>
                </span>
              </div>
            ))}
        </div>

        <div className="st-card">
          <h3 className="t-headline-sm">{d.anHistory}</h3>
          {!demo && empty}
          {demo && (
            <div className="st-history">
              {data.history.map((h) => (
                <div key={h.label.en} className="col">
                  <span className="t-body-sm medium ellipsis">{fmt(Math.round(h.streams / 1000))}K</span>
                  <span className="bar">
                    <span style={{ height: `${(h.streams / historyMax) * 100}%` }} />
                  </span>
                  <span className="t-label-sm medium">{h.label[locale]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <h2 className="st-section-title" style={{ marginTop: 16 }}>
        {d.anByTrack}
      </h2>
    </section>
  );
}

/** Artist Dashboard — Analytics (mobile app/profile/artist/dashboard/analytics.tsx). Mock data only, never telemetry. */
export function AnalyticsTab() {
  const { t, locale } = useDashboardStrings();
  const entries = useArtistStore((s) => s.entries);
  const published = useMemo(() => entries.filter((e) => e.status === 'published'), [entries]);
  const [rawTrackId, setRawTrackId] = useState(published[0]?.track.id);
  const trackId = published.some((e) => e.track.id === rawTrackId) ? rawTrackId : published[0]?.track.id;
  const [period, setPeriod] = useState<TimePeriod>('28d');
  const demo = useIsDemoArtist();
  const { d } = useDemoStrings();

  if (published.length === 0 || !trackId) return <EmptyState icon="show-chart" title={t('analyticsEmptyTitle')} body={t('analyticsEmptyHint')} />;

  const track = published.find((e) => e.track.id === trackId)?.track;
  // Simulated per-track figures only for the labelled demo account; regular artists see "—" and empty states.
  const data = demo ? getTrackAnalytics(trackId, period) : undefined;
  const noData = <NoData text={d.anNoData} hint={d.anNoDataHint} />;
  const periodLabel = t(PERIOD_KEYS.find((p) => p.id === period)?.key ?? 'period28d');
  const num = (n: number) => n.toLocaleString('en-US');

  return (
    <div className="st-col" style={{ gap: 24 }}>
      <ArtistOverviewAnalytics demo={demo} />

      <div className="st-row">
        <Artwork source={track?.coverUri} className="st-track-art" />
        <span className="st-grow">
          <span className="t-label-sm st-primary-text block">{t('inRotation')}</span>
          <span className="t-headline-md ellipsis block">{track?.title ?? t('selectTrack')}</span>
        </span>
      </div>

      {published.length > 1 && <ChipRow label={t('selectTrack')} options={published.map((e) => ({ id: e.track.id, label: e.track.title }))} value={trackId} onChange={setRawTrackId} />}
      <ChipRow label={t('listensOver')} options={PERIOD_KEYS.map((p) => ({ id: p.id, label: t(p.key) }))} value={period} onChange={setPeriod} />

      <div className="st-stats four">
        <StatCard label={t('streams')} value={data ? num(data.streams) : '—'} />
        <StatCard label={t('listeners')} value={data ? num(data.listeners) : '—'} />
        <StatCard label={t('completion')} value={data ? `${data.completionPct}%` : '—'} />
        <StatCard label={t('inPlaylists')} value={data ? num(data.playlistAdds) : '—'} />
      </div>

      <div className="st-analytics-grid">
        <div className="st-card">
          <span className="st-eyebrow">{t('trendSection')}</span>
          <h3 className="t-headline-sm">
            {t('listensOver')} {periodLabel.toLowerCase()}
          </h3>
          {data ? <TrendChart points={data.trend} peakLabel={`${t('peakLabel')} ${num(data.peak)}`} /> : noData}
          <div className="st-row" style={{ justifyContent: 'space-between' }}>
            <span className="t-body-sm medium">{t('averageListenTime')}</span>
            <span className="t-body-sm">{data ? `${Math.floor(data.avgListenSec / 60)}:${String(data.avgListenSec % 60).padStart(2, '0')} (${data.avgListenPct}%)` : '—'}</span>
          </div>
        </div>

        <div className="st-card">
          <span className="st-eyebrow">{t('audienceSection')}</span>
          <h3 className="t-headline-sm">{t('listenerGeography')}</h3>
          {!data && noData}
          {data?.geography.map((g) => (
            <div key={g.city.en} className="st-row" style={{ justifyContent: 'space-between' }}>
              <span className="t-body-sm">
                {g.city[locale]} <span className="medium">{g.country[locale]}</span>
              </span>
              <span className="t-label-lg">{g.pct}%</span>
            </div>
          ))}
        </div>

        <div className="st-card">
          <span className="st-eyebrow">{t('channelsSection')}</span>
          <h3 className="t-headline-sm">{t('discoverySources')}</h3>
          {data ? (
            <div className="st-stats two">
              {data.channels.map((c) => (
                <StatCard key={c.name.en} label={c.name[locale]} value={`${c.pct}%`} />
              ))}
            </div>
          ) : (
            noData
          )}
        </div>
      </div>
    </div>
  );
}
