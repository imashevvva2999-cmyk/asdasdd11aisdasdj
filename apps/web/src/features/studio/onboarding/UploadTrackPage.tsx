import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import type { LocalOrRemoteImage } from '@mmusic/core/constants/stitch-artwork';
import { trackPublishedMessage } from '@mmusic/core/lib/i18n';
import { useArtistStore } from '@mmusic/core/state/artist-store';
import { Icon } from '@mmusic/ui-kit/web';

import { Artwork } from '@/components/Artwork';
import { useAppStrings } from '@/i18n/locale';
import { formatDuration, Page, PageHeader } from '@/ui';

import { ChipRow, ProgressBar, usePageTitle, useStudioToast } from '../kit';
import { GENRE_OPTIONS } from './genres';
import { COVER_TYPES, processCoverFile } from './pick-cover-image';

/** Fixed mock duration standing in for real file metadata — no audio is decoded (same as the app). */
const MOCK_FILE_DURATION_SEC = 204;
/** Static decorative waveform for the selected file — an illustration, not a real waveform. */
const WAVEFORM_BARS = [8, 14, 10, 20, 12, 26, 16, 22, 10, 28, 18, 24, 12, 20, 26, 14, 18, 10, 22, 12, 16, 8];
const DASHBOARD = '/profile/artist/dashboard';

/**
 * S-28 Upload Track (mobile app/profile/artist/upload-track.tsx). Local state only: the audio file selection is
 * SIMULATED (no upload, decoding or transcoding); the cover is a real local image (file chooser → downscaled JPEG data
 * URL, kept in this browser). Publishing runs the artist store's simulated upload → processing → published steps.
 */
export function UploadTrackPage() {
  const { t, locale } = useAppStrings();
  const navigate = useNavigate();
  const saveDraft = useArtistStore((s) => s.saveDraft);
  const publishTrack = useArtistStore((s) => s.publishTrack);
  const simulateError = useArtistStore((s) => s.simulateError);
  const retryPublish = useArtistStore((s) => s.retryPublish);
  const entries = useArtistStore((s) => s.entries);
  const { showToast, toast } = useStudioToast();
  const ids = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const draftTimer = useRef<number | undefined>(undefined);
  usePageTitle(t('uploadTrackTitle'));
  useEffect(() => () => window.clearTimeout(draftTimer.current), []);

  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<LocalOrRemoteImage | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [collaborators, setCollaborators] = useState('');
  const [genre, setGenre] = useState<string | undefined>(undefined);
  const [explicit, setExplicit] = useState(false);
  const [releaseMode, setReleaseMode] = useState<'now' | 'schedule'>('now');
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);

  const activeEntry = useMemo(() => entries.find((e) => e.track.id === activeTrackId), [entries, activeTrackId]);
  const canPublish = title.trim().length > 0 && selectedFileName !== null;
  const isBusy = activeEntry?.status === 'uploading' || activeEntry?.status === 'processing' || savingDraft;

  const onCoverChosen = async (file: File | undefined) => {
    const result = await processCoverFile(file);
    if (result.kind === 'picked') setCoverUri(result.uri);
    else if (result.kind === 'invalid-type') showToast(t('coverInvalidType'), 'error-outline');
    else if (result.kind === 'too-large') showToast(t('coverTooLarge'), 'error-outline');
    else if (result.kind === 'unreadable') showToast(t('coverUnreadable'), 'error-outline');
  };

  const buildDraft = () => saveDraft({ title: title.trim(), genre, explicit, durationSec: MOCK_FILE_DURATION_SEC, coverUri });

  const publish = async () => {
    if (!canPublish || isBusy) return;
    const entry = buildDraft();
    setActiveTrackId(entry.track.id);
    await publishTrack(entry.track.id);
  };

  const saveAsDraft = () => {
    if (title.trim().length === 0 || isBusy) return;
    buildDraft();
    setSavingDraft(true);
    showToast(t('toastSavedAsDraft'), 'save');
    draftTimer.current = window.setTimeout(() => void navigate(DASHBOARD), 900);
  };

  const simulate = () => {
    if (!canPublish || isBusy) return;
    const entry = buildDraft();
    setActiveTrackId(entry.track.id);
    simulateError(entry.track.id);
  };

  if (activeEntry?.status === 'published') {
    return (
      <Page narrow>
        <div className="st-result">
          <span className="halo">
            <Icon name="check-circle" size={40} />
          </span>
          <h1 className="t-headline-md">{t('trackPublishedTitle')}</h1>
          <p className="t-body-md">{trackPublishedMessage(locale, activeEntry.track.title)}</p>
          <button type="button" className="ui-btn" onClick={() => void navigate(`/artist/${activeEntry.track.artistId}`, { replace: true })}>
            {t('viewPublicProfileLabel')}
          </button>
          <button type="button" className="ui-btn ghost" onClick={() => void navigate(DASHBOARD, { replace: true })}>
            {t('backToDashboardLabel')}
          </button>
        </div>
      </Page>
    );
  }

  return (
    <Page narrow>
      <PageHeader title={t('uploadTrackTitle')} back={DASHBOARD} />
      <div className="st-col" style={{ gap: 32 }}>
        <section className="st-col">
          <div className="st-row" style={{ justifyContent: 'space-between' }}>
            <h2 className="t-headline-md" style={{ margin: 0 }}>
              {t('uploadAudioLabel')}
            </h2>
            <span className="t-label-sm st-primary-text">{t('highQualityAudioFileHint')}</span>
          </div>
          {selectedFileName ? (
            <div className="st-card">
              <div className="st-file">
                <span className="tile">
                  <Icon name="music-note" size={24} />
                </span>
                <span className="st-grow">
                  <span className="t-label-lg ellipsis block">{selectedFileName}</span>
                  <span className="t-mono-num medium">{formatDuration(MOCK_FILE_DURATION_SEC)}</span>
                </span>
              </div>
              <div className="st-wave" aria-hidden="true">
                {WAVEFORM_BARS.map((h, i) => (
                  <span key={i} style={{ height: h }} />
                ))}
              </div>
              <button type="button" className="st-link-btn" disabled={isBusy} onClick={() => setSelectedFileName('midnight-session-master.wav')}>
                <Icon name="upload-file" size={18} />
                {t('browseFileLabel')}
              </button>
            </div>
          ) : (
            <button type="button" className="ui-btn ghost block" onClick={() => setSelectedFileName('midnight-session-master.wav')}>
              <Icon name="folder-open" size={20} />
              {t('browseFileLabel')}
            </button>
          )}
        </section>

        <section className="st-col">
          <h2 className="t-headline-md" style={{ margin: 0 }}>
            {t('trackDetailsLabel')}
          </h2>
          <div className="ui-field" style={{ margin: 0 }}>
            <label htmlFor={`${ids}-title`}>{t('trackTitleFieldLabel')}</label>
            <input id={`${ids}-title`} className="ui-input" placeholder={t('titleLabel')} value={title} disabled={isBusy} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="ui-field" style={{ margin: 0 }}>
            <label htmlFor={`${ids}-collab`}>{t('artistCollaboratorsLabel')}</label>
            <input id={`${ids}-collab`} className="ui-input" placeholder={t('optionalPlaceholder')} value={collaborators} disabled={isBusy} onChange={(e) => setCollaborators(e.target.value)} />
          </div>
          <div className="ui-field" style={{ margin: 0 }}>
            <span className="t-label-md st-primary-text">{t('genreFieldLabel')}</span>
            <fieldset className="ui-chips st-chips wrap st-fieldset">
              <legend className="visually-hidden">{t('genreFieldLabel')}</legend>
              {GENRE_OPTIONS.map((option) => (
                <button key={option} type="button" className={genre === option ? 'ui-chip on' : 'ui-chip'} aria-pressed={genre === option} disabled={isBusy} onClick={() => setGenre((g) => (g === option ? undefined : option))}>
                  {option}
                </button>
              ))}
            </fieldset>
          </div>
        </section>

        <section className="st-col">
          <h2 className="t-headline-md" style={{ margin: 0 }}>
            {t('coverArtworkLabel')}
          </h2>
          <div className="st-card st-cover">
            {coverUri ? (
              <Artwork source={coverUri} alt={t('coverArtworkLabel')} />
            ) : (
              <span className="ph">
                <Icon name="add-photo-alternate" size={36} />
              </span>
            )}
            <div className="st-col" style={{ gap: 12 }}>
              <span className="t-body-md medium">{t('addHighQualityArtworkHint')}</span>
              <input
                ref={fileInput}
                type="file"
                accept={COVER_TYPES.join(',')}
                className="visually-hidden"
                tabIndex={-1}
                aria-hidden="true"
                data-testid="cover-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  void onCoverChosen(file);
                }}
              />
              <button type="button" className="ui-btn ghost small" style={{ justifySelf: 'start' }} disabled={isBusy} onClick={() => fileInput.current?.click()}>
                <Icon name="image" size={18} />
                {coverUri ? t('changeCoverLabel') : t('chooseCoverLabel')}
              </button>
            </div>
          </div>
        </section>

        <section className="st-col">
          <h2 className="t-headline-md" style={{ margin: 0 }}>
            {t('releaseSettingsLabel')}
          </h2>
          <span className="t-label-md st-primary-text">{t('scheduleReleaseLabel')}</span>
          <ChipRow
            label={t('scheduleReleaseLabel')}
            options={[
              { id: 'now', label: t('releaseNowOptionLabel') },
              { id: 'schedule', label: t('scheduleOptionLabel') },
            ]}
            value={releaseMode}
            onChange={(mode) => {
              if (!isBusy) setReleaseMode(mode);
            }}
          />
          {releaseMode === 'schedule' && <p className="t-body-sm medium" style={{ margin: 0 }}>{t('scheduleHintText')}</p>}
          <label className="st-toggle">
            <span className="t-label-lg">{t('explicitContentLabel')}</span>
            <input type="checkbox" checked={explicit} disabled={isBusy} onChange={(e) => setExplicit(e.target.checked)} />
          </label>
        </section>

        {activeEntry && (activeEntry.status === 'uploading' || activeEntry.status === 'processing') && (
          <div className="st-card" aria-live="polite">
            <div className="st-row st-secondary-text">
              <Icon name="sync" size={20} />
              <span className="t-label-lg" style={{ color: 'var(--text-high)' }}>
                {activeEntry.status === 'uploading' ? t('uploadingStatusLabel') : t('transcodingStatusLabel')}
              </span>
            </div>
            <ProgressBar pct={activeEntry.status === 'processing' ? 75 : 35} label={activeEntry.status === 'uploading' ? t('uploadingStatusLabel') : t('transcodingStatusLabel')} />
          </div>
        )}

        {activeEntry?.status === 'error' && (
          <div className="st-errbar" role="alert">
            <Icon name="error-outline" size={18} />
            <span className="t-label-md st-grow">{t('publishErrorMessage')}</span>
            <button type="button" className="st-link-btn" onClick={() => activeTrackId && void retryPublish(activeTrackId)}>
              {t('retryLabel')}
            </button>
          </div>
        )}

        <div className="st-col" style={{ gap: 4 }}>
          <button type="button" className="ui-btn block" disabled={!canPublish || isBusy} aria-busy={isBusy} onClick={() => void publish()}>
            {isBusy && !savingDraft ? <span className="st-spinner" aria-hidden="true" /> : null}
            {t('publishTrackLabel')}
            {!isBusy && <Icon name="arrow-forward" size={20} />}
          </button>
          <button type="button" className="st-quiet" disabled={isBusy || title.trim().length === 0} onClick={saveAsDraft}>
            {t('saveAsDraftLabel')}
          </button>
          <button type="button" className="st-quiet small" disabled={isBusy || !canPublish} onClick={simulate}>
            {t('simulatePublishErrorLabel')}
          </button>
        </div>
      </div>
      {toast}
    </Page>
  );
}
