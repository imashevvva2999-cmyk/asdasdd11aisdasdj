import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';

import type { AppStringKey } from '@mmusic/core/lib/i18n';
import { Icon, type IconName } from '@mmusic/ui-kit/web';

import { useAppStrings } from '@/i18n/locale';
import { Page, PageHeader } from '@/ui';

import { usePageTitle, useStudioToast } from '../kit';

const FEATURES: { icon: IconName; title: AppStringKey; subtitle: AppStringKey }[] = [
  { icon: 'cloud-upload', title: 'shareYourMusicTitle', subtitle: 'shareYourMusicSubtitle' },
  { icon: 'volunteer-activism', title: 'fanSupportTitle', subtitle: 'fanSupportSubtitle' },
  { icon: 'insights', title: 'artistInsightsTitle', subtitle: 'artistInsightsSubtitle' },
];

/**
 * S-25 Become an Artist (mobile app/profile/artist/become-artist.tsx). No identity verification, KYC or backend
 * artist creation — the CTA shows the short "initializing" toast and opens Artist Setup, exactly like the app.
 */
export function BecomeArtistPage() {
  const { t } = useAppStrings();
  const navigate = useNavigate();
  const { showToast, toast } = useStudioToast();
  const timer = useRef<number | undefined>(undefined);
  usePageTitle(t('becomeArtistTitle'));
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const start = () => {
    showToast(t('toastInitializingArtistStudio'), 'sync');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void navigate('/profile/artist/setup'), 600);
  };

  return (
    <Page narrow>
      <PageHeader title={t('becomeArtistTitle')} back="/profile" />
      <div className="st-hero">
        <span className="st-halo">
          <Icon name="graphic-eq" size={44} />
          <span className="badge">
            <Icon name="graphic-eq" size={14} />
          </span>
        </span>
        <h1>{t('shareYourSoundTitle')}</h1>
        <p className="t-body-lg">{t('shareYourSoundSubtitle')}</p>
      </div>
      <div className="st-col" style={{ marginBottom: 32 }}>
        {FEATURES.map((f) => (
          <div key={f.title} className="st-feature">
            <span className="lead">
              <Icon name={f.icon} size={22} />
            </span>
            <span className="st-grow">
              <span className="t-label-lg block">{t(f.title)}</span>
              <span className="t-body-sm medium block">{t(f.subtitle)}</span>
            </span>
          </div>
        ))}
      </div>
      <button type="button" className="ui-btn block" onClick={start}>
        {t('becomeArtistCta')}
        <Icon name="arrow-forward" size={20} />
      </button>
      {toast}
    </Page>
  );
}
