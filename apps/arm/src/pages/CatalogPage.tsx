import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';

import { useCan, useCollection, useRole } from '@mmusic/backoffice/react';
import { checkReason, TRANSITION_ERROR_LABELS } from '@mmusic/backoffice/review';
import { ConfirmDialog, DemoBadge, EmptyState, FilterBar, FilterSelect, PageHeader, PermissionNote, SearchField, StatusBadge } from '@mmusic/backoffice/ui';

import { useArmActions } from '@/data/actions';
import { catalogAlbumRows, catalogArtistName, catalogArtists, catalogGenreRows, catalogPlaylistRows, catalogTrackRows, type DemoAudioState } from '@/domain/catalog';
import type { DemoArtist, ListingStatus, Submission } from '@/domain/types';
import { fill, type ArmStringKey } from '@/strings';
import { formatDuration, ListingBadge, matches, useArm, useQueryState } from '@/ui';

const TABS = ['tracks', 'albums', 'artists', 'genres', 'playlists', 'demo'] as const;
type Tab = (typeof TABS)[number];
const TAB_KEYS: Record<Tab, ArmStringKey> = { tracks: 'tabCatalogTracks', albums: 'tabCatalogAlbums', artists: 'tabCatalogArtists', genres: 'tabCatalogGenres', playlists: 'tabCatalogPlaylists', demo: 'tabDemoListings' };
const AUDIO_KEYS: Record<DemoAudioState, ArmStringKey> = { demo: 'audioDemo', pending: 'audioPending', none: 'audioNone' };
const RELEASE_TYPE_KEYS = { single: 'releaseSingle', ep: 'releaseEp', album: 'releaseAlbum' } as const;

type OnQuery = (key: string, value: string) => void;

/**
 * Catalog (M3, FR-19.1): the app's catalog metadata from @mmusic/core, view only, and the prototype's demo listings —
 * approved fictional demo submissions that staff with arm.catalog.edit can unlist / list again (logged).
 */
export function CatalogPage() {
  const { t } = useArm();
  const query = useQueryState();
  const tab = (TABS as readonly string[]).includes(query.get('tab')) ? (query.get('tab') as Tab) : 'tracks';
  const q = query.get('q');

  return (
    <>
      <PageHeader title={t('catalogPageTitle')} subtitle={t('catalogPageSubtitle')} actions={<DemoBadge />} />
      <nav className="bo-tabs" aria-label={t('catalogPageTitle')}>
        {TABS.map((key) => (
          <Link key={key} to={`/catalog?tab=${key}`} className={key === tab ? 'bo-tab active' : 'bo-tab'} aria-current={key === tab ? 'page' : undefined}>
            {t(TAB_KEYS[key])}
          </Link>
        ))}
      </nav>
      <div style={{ marginBottom: 12 }}>
        <PermissionNote icon={tab === 'demo' ? 'science' : 'lock-outline'} text={tab === 'demo' ? t('demoListingsNote') : t('catalogReadOnlyNote')} />
      </div>
      {tab === 'tracks' && <TracksTab q={q} audio={query.get('audio')} onQuery={query.set} />}
      {(tab === 'albums' || tab === 'artists' || tab === 'genres' || tab === 'playlists') && <SimpleTab q={q} onQuery={query.set} kind={tab} />}
      {tab === 'demo' && <DemoListingsTab q={q} onQuery={query.set} />}
    </>
  );
}

function Empty() {
  const { t } = useArm();
  return <EmptyState icon="search-off" title={t('emptyFiltered')} body={t('emptyFilteredHint')} />;
}

function TracksTab({ q, audio, onQuery }: { q: string; audio: string; onQuery: OnQuery }) {
  const { t } = useArm();
  const canArtists = useCan('arm.artists.view');
  const all = useMemo(() => catalogTrackRows(), []);
  const rows = all.filter((r) => (!audio || r.audio === audio) && (!q || matches(`${r.title} ${r.artistName} ${r.albumTitle ?? ''}`, q)));
  return (
    <>
      <FilterBar summary={fill(t('shown'), { n: rows.length, total: all.length })}>
        <SearchField value={q} onChange={(v) => onQuery('q', v)} placeholder={t('searchCatalog')} />
        <FilterSelect label={t('filterAudio')} value={audio} onChange={(v) => onQuery('audio', v)} options={[{ value: '', label: '—' }, ...(['demo', 'pending', 'none'] as const).map((a) => ({ value: a, label: t(AUDIO_KEYS[a]) }))]} />
      </FilterBar>
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <div className="bo-table-wrap">
          <table className="bo-table">
            <thead>
              <tr>
                <th>{t('colTitle')}</th>
                <th>{t('colArtist')}</th>
                <th>{t('colAlbum')}</th>
                <th>{t('colDuration')}</th>
                <th>{t('colAudio')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.title}
                    {r.explicit && (
                      <span className="bo-status neutral" style={{ marginLeft: 8 }} title={t('explicit')}>
                        E
                      </span>
                    )}
                    {r.lossless && (
                      <span className="bo-status neutral" style={{ marginLeft: 8 }}>
                        Lossless
                      </span>
                    )}
                  </td>
                  <td className="muted">{canArtists ? <Link className="bo-link" to={`/artists/${r.artistId}`}>{r.artistName}</Link> : r.artistName}</td>
                  <td className="muted">{r.albumTitle ?? '—'}</td>
                  <td className="muted nowrap">{formatDuration(r.durationSec)}</td>
                  <td>
                    <StatusBadge tone={r.audio === 'demo' ? 'success' : r.audio === 'pending' ? 'pending' : 'neutral'} label={t(AUDIO_KEYS[r.audio])} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

type Row = { id: string; search: string; cells: ReactNode[] };

/** Albums, artists, genres and playlists: search + a read-only table. */
function SimpleTab({ q, onQuery, kind }: { q: string; onQuery: OnQuery; kind: 'albums' | 'artists' | 'genres' | 'playlists' }) {
  const { t } = useArm();
  const canArtists = useCan('arm.artists.view');
  const artistLink = (id: string, name: string) => (canArtists ? <Link className="bo-link" to={`/artists/${id}`}>{name}</Link> : name);
  let head: string[];
  let all: Row[];
  if (kind === 'albums') {
    head = [t('colTitle'), t('colArtist'), t('colType'), t('colYear'), t('colTrackCount')];
    all = catalogAlbumRows().map((a) => ({ id: a.id, search: `${a.title} ${a.artistName}`, cells: [a.title, artistLink(a.artistId, a.artistName), t(RELEASE_TYPE_KEYS[a.type]), String(a.year), String(a.trackCount)] }));
  } else if (kind === 'artists') {
    head = [t('colName'), t('colGenres'), t('colCity'), t('fieldVerification'), t('colTrackCount')];
    all = catalogArtists().map((a) => ({
      id: a.id,
      search: `${a.name} ${a.genres.join(' ')}`,
      cells: [artistLink(a.id, a.name), a.genres.join(', ') || '—', a.location ?? '—', <StatusBadge key="v" tone={a.verified ? 'success' : 'neutral'} label={a.verified ? t('catalogVerified') : t('catalogNoMark')} />, String(a.tracks.length)],
    }));
  } else if (kind === 'genres') {
    head = [t('colTitle'), t('colDescription')];
    all = catalogGenreRows().map((g) => ({ id: g.id, search: `${g.title} ${g.subtitle ?? ''}`, cells: [g.title, g.subtitle ?? '—'] }));
  } else {
    head = [t('colTitle'), t('colCurator'), t('colEditorial'), t('colTrackCount')];
    all = catalogPlaylistRows().map((p) => ({ id: p.id, search: `${p.title} ${p.curator ?? ''}`, cells: [p.title, p.curator ?? '—', p.editorial ? t('yes') : t('no'), String(p.trackCount)] }));
  }
  const rows = all.filter((r) => !q || matches(r.search, q));
  return (
    <>
      <FilterBar summary={fill(t('shown'), { n: rows.length, total: all.length })}>
        <SearchField value={q} onChange={(v) => onQuery('q', v)} placeholder={t('searchCatalog')} />
      </FilterBar>
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <div className="bo-table-wrap">
          <table className="bo-table">
            <thead>
              <tr>
                {head.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  {r.cells.map((c, i) => (
                    <td key={head[i]} className={i === 0 ? undefined : 'muted'}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/** Approved fictional demo submissions in the prototype's demo catalog: unlist (reason) / list again, both logged. */
function DemoListingsTab({ q, onQuery }: { q: string; onQuery: OnQuery }) {
  const { t, l, date, errorText } = useArm();
  const actions = useArmActions();
  const canEdit = useCan('arm.catalog.edit');
  const canModeration = useCan('arm.moderation.view');
  const role = useRole();
  const subs = useCollection<Submission>('submissions');
  const artists = useCollection<DemoArtist>('artists');
  const [target, setTarget] = useState<{ sub: Submission; to: ListingStatus } | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const artistName = (id: string) => artists.find((a) => a.id === id)?.name ?? catalogArtistName(id) ?? '—';
  const all = subs.filter((s) => s.status === 'approved');
  const rows = all.filter((s) => !q || matches(`${s.title} ${artistName(s.artistId)}`, q)).sort((a, b) => a.title.localeCompare(b.title) || a.kind.localeCompare(b.kind));

  const open = (sub: Submission, to: ListingStatus) => {
    setTarget({ sub, to });
    setReason('');
    setReasonError(undefined);
    setError(undefined);
  };
  const confirm = async () => {
    if (!target) return;
    const invalid = checkReason(reason, target.to === 'unlisted');
    if (invalid) return setReasonError(l(TRANSITION_ERROR_LABELS[invalid]));
    setBusy(true);
    const failed = await actions.changeListing(target.sub.id, target.to, reason);
    setBusy(false);
    if (failed) return setError(errorText(failed));
    setTarget(null);
  };

  return (
    <>
      <FilterBar summary={fill(t('shown'), { n: rows.length, total: all.length })}>
        <SearchField value={q} onChange={(v) => onQuery('q', v)} placeholder={t('searchCatalog')} />
      </FilterBar>
      {!canEdit && <p className="bo-field-error">{fill(t('viewOnlyRole'), { role: role ? l(role.label) : '—' })}</p>}
      {all.length === 0 ? (
        <EmptyState icon="library-music" title={t('noDemoListings')} />
      ) : rows.length === 0 ? (
        <Empty />
      ) : (
        <div className="bo-table-wrap">
          <table className="bo-table">
            <thead>
              <tr>
                <th>{t('colTitle')}</th>
                <th>{t('colKind')}</th>
                <th>{t('colArtist')}</th>
                <th>{t('colListing')}</th>
                <th>{t('colChanged')}</th>
                <th>{t('colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const listing = s.listing ?? 'listed';
                const path = `/moderation/${s.kind === 'track' ? 'tracks' : 'releases'}/${s.id}`;
                return (
                  <tr key={s.id}>
                    <td>{canModeration ? <Link className="bo-link" to={path}>{s.title}</Link> : s.title}</td>
                    <td className="muted">{s.kind === 'track' ? t('kindTrack') : t('kindRelease')}</td>
                    <td className="muted">{artistName(s.artistId)}</td>
                    <td>
                      <ListingBadge status={listing} />
                      {s.listingReason && <span className="muted bo-sub">{s.listingReason}</span>}
                    </td>
                    <td className="muted nowrap">{date(s.listingChangedAt ?? s.decidedAt)}</td>
                    <td>
                      <button type="button" className={listing === 'listed' ? 'bo-btn small danger' : 'bo-btn small'} disabled={!canEdit} onClick={() => open(s, listing === 'listed' ? 'unlisted' : 'listed')}>
                        {listing === 'listed' ? t('unlistAction') : t('relistAction')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={target !== null}
        title={target ? fill(t(target.to === 'unlisted' ? 'confirmUnlist' : 'confirmRelist'), { title: target.sub.title }) : ''}
        body={target?.to === 'unlisted' ? t('confirmUnlistBody') : t('confirmRelistBody')}
        confirmLabel={target?.to === 'unlisted' ? t('unlistAction') : t('relistAction')}
        danger={target?.to === 'unlisted'}
        reason={target ? { required: target.to === 'unlisted', value: reason, onChange: (v) => (setReason(v), setReasonError(undefined)), error: reasonError } : undefined}
        busy={busy}
        error={error}
        onConfirm={() => void confirm()}
        onCancel={() => setTarget(null)}
      />
    </>
  );
}
