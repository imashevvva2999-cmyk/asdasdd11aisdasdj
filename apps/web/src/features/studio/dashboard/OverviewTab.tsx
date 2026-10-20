// First: configures @mmusic/core storage before the persisted player / demo-session / dashboard-locale stores are used.
import '@/platform/storage';

import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { DEMO_SUPPORT_TOTAL_KGS, demoTotals } from '@mmusic/core/demo/demo-fixture';
import { useIsGuestPreview } from '@mmusic/core/demo/guest-mode';
import { formatKgsAmount } from '@mmusic/core/lib/format-currency';
import { useArtistStore, type UploadStatus } from '@mmusic/core/state/artist-store';
import { useDashboardStrings } from '@mmusic/core/state/dashboard-locale-store';
import { useIsDemoArtist } from '@mmusic/core/state/demo-session-store';
import { usePlayerStore } from '@mmusic/core/state/player-store';
import { Icon } from '@mmusic/ui-kit/web';

import { Artwork } from '@/components/Artwork';
import { EmptyState } from '@/ui';

import { ChipRow, ProgressBar, StatCard } from '../kit';

type Filter = 'all' | 'published' | 'review' | 'draft';

/** Filter and status labels: the app shows these in English only; the website adds the Russian half. */
const LABELS = {
  en: { all: 'All', published: 'Published', review: 'In Review', draft: 'Draft', uploading: 'Uploading', processing: 'Transcoding', error: 'Error', single: 'Single' },
  ru: { all: 'Все', published: 'Опубликовано', review: 'На проверке', draft: 'Черновик', uploading: 'Загрузка', processing: 'Обработка', error: 'Ошибка', single: 'Сингл' },
} as const;

/** "Get started" prompt for listeners without an artist profile (Overview / Promotion). */
export function NoArtist() {
  const { t } = useDashboardStrings();
  return (
    <EmptyState icon="mic" title={t('noArtistTitle')} body={t('noArtistHint')}>
      <Link className="ui-btn" to="/profile/artist/become-artist">
        {t('becomeArtistAction')}
      </Link>
    </EmptyState>
  );
}

/**
 * S-27 Artist Dashboard — Overview (mobile app/profile/artist/dashboard/index.tsx). A new local artist honestly has 0
 * listeners / streams / support; the demo account (and guest preview) sums the demo fixture's per-track analytics.
 */
export function OverviewTab() {
  const { t, locale } = useDashboardStrings();
  const L = LABELS[locale];
  const artist = useArtistStore((s) => s.artist);
  const entries = useArtistStore((s) => s.entries);
  const play = usePlayerStore((s) => s.play);
  const [filter, setFilter] = useState<Filter>('all');
  const demo = useIsDemoArtist();
  // Guest preview is read-only and stays inside /demo: no uploads, playback or public-profile jump.
  const guest = useIsGuestPreview();
  const totals = useMemo(() => (demo ? demoTotals(entries) : undefined), [demo, entries]);

  const visible = useMemo(() => {
    if (filter === 'all') return entries;
    if (filter === 'published') return entries.filter((e) => e.status === 'published');
    if (filter === 'draft') return entries.filter((e) => e.status === 'draft');
    return entries.filter((e) => e.status === 'uploading' || e.status === 'processing');
  }, [entries, filter]);

  if (!artist) return <NoArtist />;

  const statusLabel = (s: UploadStatus) => L[s];

  return (
    <div className="st-col" style={{ gap: 32 }}>
      {entries.length > 0 && !guest && (
        <Link className="ui-btn" style={{ justifySelf: 'start' }} to="/profile/artist/upload-track">
          <Icon name="add-circle-outline" size={20} />
          {t('uploadTrack')}
        </Link>
      )}

      <div className="st-stats">
        <StatCard label={t('listeners')} value={totals ? formatKgsAmount(totals.monthlyListeners) : String(artist.monthlyListeners ?? 0)} icon="groups" tone="primary" />
        <StatCard label={t('streams')} value={totals ? formatKgsAmount(totals.streams) : '0'} icon="play-circle-outline" tone="tertiary" />
        <StatCard label={t('supportLabel')} value={`${formatKgsAmount(demo ? DEMO_SUPPORT_TOTAL_KGS : 0)} сом`} icon="volunteer-activism" tone="secondary" />
      </div>

      <section className="st-col" style={{ gap: 12 }}>
        <h2 className="st-section-title">{t('yourReleases')}</h2>
        <ChipRow
          label={t('yourReleases')}
          options={(['all', 'published', 'review', 'draft'] as const).map((id) => ({ id, label: L[id] }))}
          value={filter}
          onChange={setFilter}
        />
        {visible.length === 0 ? (
          <EmptyState icon="upload" title={entries.length === 0 ? t('uploadFirstTrackTitle') : t('emptyFilterTitle')} body={entries.length === 0 ? t('uploadFirstTrackHint') : undefined}>
            {entries.length === 0 && !guest && (
              <Link className="ui-btn" to="/profile/artist/upload-track">
                {t('uploadTrack')}
              </Link>
            )}
          </EmptyState>
        ) : (
          <div className="ui-list">
            {visible.map((entry) => {
              const inProgress = entry.status === 'uploading' || entry.status === 'processing';
              const playable = entry.status === 'published' && !guest;
              const body = (
                <>
                  {inProgress ? (
                    <span className="pending">
                      <Icon name="sync" size={24} />
                    </span>
                  ) : (
                    <Artwork source={entry.track.coverUri} className="art" />
                  )}
                  <span className="t">
                    <span className="t-label-lg ellipsis">{entry.track.title}</span>
                    <span className={`t-body-sm ellipsis st-status-${entry.status}`}>{inProgress ? statusLabel(entry.status) : `${L.single} • ${statusLabel(entry.status)}`}</span>
                    {inProgress && <ProgressBar pct={entry.status === 'processing' ? 75 : 35} />}
                  </span>
                  {playable && <Icon name="play-circle-outline" size={22} />}
                </>
              );
              return (
                <div key={entry.track.id} className="st-release">
                  {playable ? (
                    <button type="button" className="main" aria-label={entry.track.title} onClick={() => play(entry.track.id)}>
                      {body}
                    </button>
                  ) : (
                    <div className="main">{body}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
