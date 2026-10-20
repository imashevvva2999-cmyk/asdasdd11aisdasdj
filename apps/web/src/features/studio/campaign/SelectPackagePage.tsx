// First: configures @mmusic/core storage before the persisted locale store is used.
import '@/platform/storage';

import { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { artistBase, useIsGuestPreview } from '@mmusic/core/demo/guest-mode';
import { formatKgsAmount } from '@mmusic/core/lib/format-currency';
import { PROMO_PACKAGES, type PromoPackage } from '@mmusic/core/mocks/promotions';
import { SelectPackagePromoStrings } from '@mmusic/core/promotion/strings/select-package';
import { useArtistStore } from '@mmusic/core/state/artist-store';
import { useCampaignStore } from '@mmusic/core/state/campaign-store';
import { useDashboardStrings } from '@mmusic/core/state/dashboard-locale-store';
import { Icon, type IconName } from '@mmusic/ui-kit/web';

import { Artwork } from '@/components/Artwork';
import { Page } from '@/ui';

import { usePageTitle, usePromoStrings } from '../kit';
import { StepSegments, StitchHeader, useGoBack } from './shared';

type PackageId = PromoPackage['id'];

/** Campaign wizard step 2/4 — choose a promotion package (mobile campaign/select-package.tsx). Redirects to step 1
 * when entered with no track. In the guest preview cards open the read-only details instead of choosing. */
export function SelectPackagePage() {
  const { t, locale } = useDashboardStrings();
  const s = usePromoStrings(SelectPackagePromoStrings);
  usePageTitle(s.title);
  const navigate = useNavigate();
  const goBack = useGoBack();
  const entries = useArtistStore((st) => st.entries);
  const artist = useArtistStore((st) => st.artist);
  const trackId = useCampaignStore((st) => st.trackId);
  const selectPackage = useCampaignStore((st) => st.selectPackage);
  const guest = useIsGuestPreview();
  const base = artistBase(guest);
  const backTo = guest ? `${base.dashboard}/promotion` : `${base.campaign}/select-track`;

  useEffect(() => {
    if (!trackId) void navigate(backTo, { replace: true });
  }, [trackId, navigate, backTo]);

  const track = entries.find((e) => e.track.id === trackId)?.track;
  if (!trackId || !track) return <Page narrow>{null}</Page>;

  const price = (amount: number) => `${locale === 'ru' ? formatKgsAmount(amount).replace(/,/g, ' ') : formatKgsAmount(amount)} ${s.currency}`;
  const forecast = (pkg: PromoPackage) => `${s.forecastPrefix} ${pkg.forecastLabel[locale]}`;
  const openDetails = (packageId: string) => void navigate(`${base.campaign}/package-details?packageId=${packageId}`);
  const choosePackage = (packageId: string) => {
    if (guest) return openDetails(packageId);
    selectPackage(packageId);
    void navigate('/profile/artist/campaign/setup');
  };

  const badgeText: Record<PackageId, string> = { start: s.badgeStart, boost: s.badgeBoost, pro: s.badgePro, spotlight: s.badgeSpotlight };
  const termText: Record<PackageId, string> = { start: s.termStart, boost: s.termBoost, pro: s.termPro, spotlight: s.termSpotlight };
  const linkText: Record<PackageId, string> = { start: s.linkStart, boost: s.linkBoost, pro: s.linkPro, spotlight: s.linkSpotlight };
  const priceNote = (pkg: PromoPackage): { text: string; tone: string } => {
    if (pkg.id === 'start') return { text: s.free, tone: 'cp-outline' };
    const perDay = pkg.perDayLabel?.[locale] ?? '';
    if (pkg.id === 'boost') return { text: perDay, tone: 'cp-secondary' };
    if (pkg.id === 'pro') return { text: `${perDay} • ${s.proDiscount}`, tone: 'cp-primary' };
    return { text: perDay, tone: 'cp-variant' };
  };
  const bullet = (icon: IconName, tone: string, text: string, strong?: boolean) => (
    <li key={text} className={strong ? 'strong' : ''}>
      <Icon name={icon} size={16} className={tone} />
      <span>{text}</span>
    </li>
  );

  return (
    <Page narrow>
      <StitchHeader title={s.title} onBack={() => goBack(backTo)} />
      <div className="cp-between cp-mb">
        <span className="cp-row">
          <span className="cp-step-pill">{s.step}</span>
          <span className="cp-outline">•</span>
          <span className="t-body-sm cp-variant">{s.stepSection}</span>
        </span>
        <StepSegments step={2} />
      </div>
      <p className="cp-sub">{s.subtitle}</p>

      <div className="cp-track-chip">
        <Artwork source={track.coverUri} className="cp-chip-art" />
        <span className="cp-item-text">
          <span className="t-label-lg ellipsis">{track.title}</span>
          <span className="t-body-sm cp-variant ellipsis">{track.artistName || artist?.name || ''}</span>
        </span>
        <button type="button" className="cp-link" onClick={() => goBack(backTo)}>
          {s.change}
        </button>
      </div>

      <div className="cp-packages">
        {PROMO_PACKAGES.map((pkg) => {
          const spotlight = pkg.id === 'spotlight';
          const note = priceNote(pkg);
          const features = pkg.features.map((f) => f[locale]);
          return (
            <article key={pkg.id} className={spotlight ? 'cp-package spotlight' : 'cp-package'}>
              <button type="button" className="cp-package-main" onClick={() => choosePackage(pkg.id)}>
                <span className="cp-package-top">
                  <span className="cp-item-text">
                    <span className="cp-row wrap">
                      <span className="cp-package-name">{pkg.name}</span>
                      <span className={`cp-badge ${pkg.id}`}>{badgeText[pkg.id]}</span>
                    </span>
                    <span className="t-body-sm cp-variant">{termText[pkg.id]}</span>
                  </span>
                  <span className="cp-price-col">
                    <span className={spotlight ? 'cp-price cp-primary' : 'cp-price'}>{price(pkg.priceKgs)}</span>
                    <span className={`cp-mono ${note.tone}`}>{note.text}</span>
                  </span>
                  <Icon name="chevron-right" size={24} className={spotlight ? 'cp-primary' : 'cp-outline'} />
                </span>
                {spotlight && (
                  <span className="cp-forecast-box">
                    <Icon name="local-fire-department" size={20} className="cp-primary" />
                    <span className="t-label-md cp-grow">{forecast(pkg)}</span>
                    <span className="cp-top-tier">{s.topTier}</span>
                  </span>
                )}
                <ul className="cp-bullets">
                  {spotlight ? (
                    <>
                      {bullet('verified', 'cp-primary', features[0] ?? '', true)}
                      {bullet('check-circle-outline', 'cp-primary', features[1] ?? '')}
                      {bullet('check-circle-outline', 'cp-outline', features[2] ?? '')}
                      {bullet('check-circle-outline', 'cp-outline', s.spotlightPush)}
                    </>
                  ) : (
                    <>
                      {pkg.id === 'boost' && bullet('speed', 'cp-secondary', forecast(pkg), true)}
                      {pkg.id === 'pro' && bullet('trending-up', 'cp-primary', forecast(pkg), true)}
                      {features.map((f) => bullet('check-circle-outline', 'cp-outline', f))}
                    </>
                  )}
                </ul>
              </button>
              <button type="button" className={spotlight ? 'cp-details-link cp-primary' : 'cp-details-link'} onClick={() => openDetails(pkg.id)}>
                {linkText[pkg.id]}
                <Icon name="arrow-forward" size={16} />
              </button>
            </article>
          );
        })}
      </div>

      <p className="cp-disclaimer">
        <Icon name="info-outline" size={18} />
        <span>{t('forecastDisclaimerLabel')}</span>
      </p>
    </Page>
  );
}
