import { useId, useState } from 'react';
import { useNavigate } from 'react-router';

import { sampleImageChoices } from '@mmusic/core/constants/stitch-artwork';
import { useArtistStore } from '@mmusic/core/state/artist-store';
import { Icon } from '@mmusic/ui-kit/web';

import { Artwork } from '@/components/Artwork';
import { useAppStrings } from '@/i18n/locale';
import { Page, PageHeader } from '@/ui';

import { usePageTitle } from '../kit';
import { GENRE_OPTIONS } from './genres';

const BIO_MAX_LENGTH = 300;

/**
 * S-26 Artist Setup (mobile app/profile/artist/setup.tsx). Local state only: the one validation is a non-empty stage
 * name; genre, bio, location and photo are optional. The photo picker cycles the bundled sample images, exactly as
 * the app does on this screen. No payout binding or verification.
 */
export function ArtistSetupPage() {
  const { t } = useAppStrings();
  const navigate = useNavigate();
  const createArtistProfile = useArtistStore((s) => s.createArtistProfile);
  const [stageName, setStageName] = useState('');
  const [genre, setGenre] = useState<string | undefined>(undefined);
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const photoUri = photoIndex === null ? undefined : sampleImageChoices[photoIndex];
  const ids = useId();
  usePageTitle(t('artistSetupTitle'));

  const trimmedName = stageName.trim();
  const canCreate = trimmedName.length > 0;

  const create = () => {
    if (!canCreate) return;
    createArtistProfile({ stageName: trimmedName, genre, bio: bio.trim() || undefined, location: location.trim() || undefined, photoUri });
    // Back from the Dashboard returns to the Profile hub, not the onboarding.
    void navigate('/profile/artist/dashboard', { replace: true });
  };

  return (
    <Page narrow>
      <PageHeader title={t('artistSetupTitle')} back />
      <form
        className="st-col"
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        <div className="st-col" style={{ justifyItems: 'center', gap: 20, padding: '12px 0 8px' }}>
          <div className="st-avatar">
            <span className="glow" />
            {photoUri ? (
              <Artwork source={photoUri} />
            ) : (
              <span className="ph">
                <Icon name="add-a-photo" size={36} />
              </span>
            )}
            <button
              type="button"
              className="icon-btn cam"
              aria-label={photoUri ? t('changeArtistPhotoLabel') : t('addArtistPhotoLabel')}
              onClick={() => setPhotoIndex((i) => (i === null ? 0 : (i + 1) % sampleImageChoices.length))}
            >
              <Icon name="photo-camera" size={20} />
            </button>
          </div>
          <span className="t-label-lg">{t('artistPhotoLabel')}</span>
        </div>

        <div className="st-card">
          <div className="ui-field">
            <label htmlFor={`${ids}-name`}>{t('stageNameLabel')}</label>
            <input id={`${ids}-name`} className="ui-input" placeholder={t('stageNamePlaceholder')} value={stageName} onChange={(e) => setStageName(e.target.value)} autoComplete="off" />
          </div>
          <div className="ui-field">
            <span className="t-label-md st-primary-text">{t('primaryGenreLabel')}</span>
            <fieldset className="ui-chips st-chips wrap st-fieldset">
              <legend className="visually-hidden">{t('primaryGenreLabel')}</legend>
              {GENRE_OPTIONS.map((option) => (
                <button key={option} type="button" className={genre === option ? 'ui-chip on' : 'ui-chip'} aria-pressed={genre === option} onClick={() => setGenre((g) => (g === option ? undefined : option))}>
                  {option}
                </button>
              ))}
            </fieldset>
          </div>
          <div className="ui-field">
            <label htmlFor={`${ids}-bio`}>{t('shortBioLabel')}</label>
            <textarea id={`${ids}-bio`} className="ui-input" rows={4} maxLength={BIO_MAX_LENGTH} placeholder={t('shortBioPlaceholder')} value={bio} onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX_LENGTH))} />
            <span className="st-counter">
              {bio.length}/{BIO_MAX_LENGTH}
            </span>
          </div>
          <div className="ui-field">
            <label htmlFor={`${ids}-loc`}>{t('locationFieldLabel')}</label>
            <span className="st-input-icon">
              <Icon name="location-on" size={18} />
              <input id={`${ids}-loc`} className="ui-input" placeholder={t('locationFieldPlaceholder')} value={location} onChange={(e) => setLocation(e.target.value)} />
            </span>
          </div>
        </div>

        <button type="submit" className="ui-btn block" disabled={!canCreate}>
          {t('createArtistProfileLabel')}
          <Icon name="arrow-forward" size={20} />
        </button>
        <p className="t-body-sm st-center" style={{ color: 'var(--text-low)', margin: 0 }}>
          {t('artistTermsDisclaimer')}
        </p>
      </form>
    </Page>
  );
}
