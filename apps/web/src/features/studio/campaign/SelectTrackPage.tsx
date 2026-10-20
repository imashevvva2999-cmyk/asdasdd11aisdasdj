// First: configures @mmusic/core storage before the persisted locale store is used.
import '@/platform/storage';

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import type { TrackId } from '@mmusic/core/mocks';
import { InteractionPromoStrings } from '@mmusic/core/promotion/strings/interactions';
import { SelectTrackPromoStrings } from '@mmusic/core/promotion/strings/select-track';
import { useArtistStore } from '@mmusic/core/state/artist-store';
import { useCampaignStore } from '@mmusic/core/state/campaign-store';
import { useDashboardStrings } from '@mmusic/core/state/dashboard-locale-store';
import { Icon } from '@mmusic/ui-kit/web';

import { Artwork } from '@/components/Artwork';
import { EmptyState, Page } from '@/ui';

import { usePageTitle, usePromoStrings, useStudioToast } from '../kit';
import { StitchHeader, useGoBack } from './shared';

function formatDuration(durationSec: number) {
  return `${Math.floor(durationSec / 60)}:${String(Math.round(durationSec % 60)).padStart(2, '0')}`;
}

/** Campaign wizard step 1/4 — choose the published track to promote (mobile campaign/select-track.tsx). The
 * selection is committed to campaign-store only on Continue, so backing out never leaves a half-started campaign. */
export function SelectTrackPage() {
  const { t } = useDashboardStrings();
  const s = usePromoStrings(SelectTrackPromoStrings);
  const si = usePromoStrings(InteractionPromoStrings);
  usePageTitle(s.title);
  const navigate = useNavigate();
  const goBack = useGoBack();
  const { showToast, toast } = useStudioToast();
  const artist = useArtistStore((st) => st.artist);
  const entries = useArtistStore((st) => st.entries);
  const startCampaign = useCampaignStore((st) => st.startCampaign);
  const draftTrackId = useCampaignStore((st) => st.trackId);
  const published = useMemo(() => entries.filter((e) => e.status === 'published'), [entries]);

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<TrackId | undefined>(published.some((e) => e.track.id === draftTrackId) ? draftTrackId : published[0]?.track.id);
  const [tab, setTab] = useState<'tracks' | 'albums' | 'profile'>('tracks');
  const albumCount = artist?.releaseAlbumIds?.length ?? 0;
  const filtered = useMemo(() => published.filter((e) => e.track.title.toLowerCase().includes(query.trim().toLowerCase())), [published, query]);
  const selectedTrack = published.find((e) => e.track.id === selectedId)?.track;

  const tabs = [
    ['tracks', `${s.tabTracks} (${published.length})`],
    ['albums', `${s.tabAlbums.replace(/\s*\(\d+\)$/, '')} (${albumCount})`],
    ['profile', s.tabProfile],
  ] as const;

  function next() {
    if (!selectedId) return;
    startCampaign(selectedId);
    void navigate('/profile/artist/campaign/select-package');
  }

  return (
    <Page narrow>
      <StitchHeader title={s.title} onBack={() => goBack('/profile/artist/dashboard/promotion')} />
      <div className="cp-progress-block">
        <div className="cp-between">
          <span className="cp-step-label">{s.step}</span>
          <span className="cp-mono cp-outline">{s.progress}</span>
        </div>
        <div className="cp-bar">
          <span style={{ width: '25%' }} />
        </div>
      </div>

      {published.length === 0 ? (
        <EmptyState icon="library-music" title={t('noPublishedTracksTitle')} body={t('noPublishedTracksBody')} />
      ) : (
        <>
          <p className="cp-sub">{s.subtitle}</p>
          <div className="cp-tabs" role="tablist">
            {tabs.map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>
                {label}
              </button>
            ))}
          </div>

          {tab !== 'profile' && (
            <div className="cp-search">
              <Icon name="search" size={20} />
              <input className="ui-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={s.search} aria-label={s.search} />
              {query.length > 0 && (
                <button type="button" className="icon-btn plain" aria-label={s.clearSearch} onClick={() => setQuery('')}>
                  <Icon name="close" size={18} />
                </button>
              )}
            </div>
          )}

          <div className="cp-list">
            {tab === 'albums' && albumCount === 0 && <p className="cp-outline">{si.albumsEmpty}</p>}
            {tab === 'tracks' &&
              filtered.map((entry) => {
                const selected = entry.track.id === selectedId;
                const year = new Date(entry.createdAt).getFullYear();
                return (
                  <button key={entry.track.id} type="button" aria-pressed={selected} className={selected ? 'cp-item on' : 'cp-item'} onClick={() => setSelectedId(entry.track.id)}>
                    <Artwork source={entry.track.coverUri} className="cp-item-art" />
                    <span className="cp-item-text">
                      <span className="t-label-lg ellipsis">{entry.track.title}</span>
                      <span className="t-body-sm cp-outline ellipsis">
                        {s.single}
                        {entry.genre ? ` • ${entry.genre}` : ''} • {year} • {entry.track.durationSec !== undefined ? formatDuration(entry.track.durationSec) : '—'}
                      </span>
                    </span>
                    <span className={selected ? 'cp-radio on' : 'cp-radio'}>{selected && <Icon name="check" size={16} />}</span>
                  </button>
                );
              })}
            {artist && tab !== 'albums' && (
              <button type="button" aria-pressed={false} className="cp-item" onClick={() => showToast(si.profileToast)}>
                <Artwork source={artist.photoUri} className="cp-item-art round" />
                <span className="cp-item-text">
                  <span className="t-label-lg ellipsis">
                    {s.artistProfile} {artist.name} <Icon name="verified" size={16} className="cp-primary" />
                  </span>
                  <span className="t-body-sm cp-outline ellipsis">{s.artistProfileHint}</span>
                </span>
                <span className="cp-radio" />
              </button>
            )}
          </div>

          <div className="cp-footer">
            <div className="cp-between">
              <span className="t-body-sm ellipsis">
                <span className="cp-dot" /> {s.selected} <strong className="cp-primary">{selectedTrack?.title ?? '—'}</strong>
                <span className="cp-outline"> • {s.single}</span>
              </span>
              <span className="cp-mono cp-outline">{s.stepShort}</span>
            </div>
            <button type="button" className="ui-btn cp-cta" disabled={!selectedId} onClick={next}>
              {s.continue}
              <Icon name="arrow-forward" size={20} />
            </button>
          </div>
        </>
      )}
      {toast}
    </Page>
  );
}
