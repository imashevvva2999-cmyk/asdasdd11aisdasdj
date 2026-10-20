// First: configures @mmusic/core storage before the persisted locale store is used.
import '@/platform/storage';

import { useNavigate, useSearchParams } from 'react-router';

import { artistBase, useIsGuestPreview } from '@mmusic/core/demo/guest-mode';
import { formatKgsAmount } from '@mmusic/core/lib/format-currency';
import { PROMO_PACKAGES, type PromoPackage } from '@mmusic/core/mocks/promotions';
import { PACKAGE_DETAILS } from '@mmusic/core/promotion/data/package-details';
import { PackageDetailsPromoStrings } from '@mmusic/core/promotion/strings/package-details';
import { useArtistStore } from '@mmusic/core/state/artist-store';
import { useCampaignStore } from '@mmusic/core/state/campaign-store';
import { Icon } from '@mmusic/ui-kit/web';

import { Artwork } from '@/components/Artwork';
import { useAppStrings } from '@/i18n/locale';
import { EmptyState } from '@/ui';

import { SheetCard, useDemoStrings, usePageTitle, usePromoStrings, useStudioToast } from '../kit';
import { useGoBack } from './shared';

type S = Record<keyof (typeof PackageDetailsPromoStrings)['en'], string>;

const formatK = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`);

function InvestmentBlock({ pkg, s, locale }: { pkg: PromoPackage; s: S; locale: 'en' | 'ru' }) {
  return (
    <div className="cp-invest">
      <div className="cp-between">
        <span className="cp-eyebrow">{s.investment.toUpperCase()}</span>
        <span className="cp-perday">
          <Icon name="bolt" size={14} />
          {pkg.perDayLabel?.[locale] ?? s.free}
        </span>
      </div>
      <div className="cp-row">
        <span className="cp-big-price">
          {formatKgsAmount(pkg.priceKgs)} {s.currency}
        </span>
        <span className="t-body-sm cp-variant">/ {pkg.durationDays > 0 ? `${pkg.durationDays} ${s.daysSuffix}` : s.noLimit}</span>
      </div>
    </div>
  );
}

/** Package details (mobile campaign/package-details.tsx, a transparent modal over the package list) — on the
 * website a centered sheet with close. Selecting is refused in the guest preview (read-only toast). */
export function PackageDetailsPage() {
  const [params] = useSearchParams();
  const packageId = params.get('packageId') ?? undefined;
  const s = usePromoStrings(PackageDetailsPromoStrings);
  const { locale } = useAppStrings();
  const { d } = useDemoStrings();
  const guest = useIsGuestPreview();
  const base = artistBase(guest);
  const navigate = useNavigate();
  const goBack = useGoBack();
  const { showToast, toast } = useStudioToast();
  const entries = useArtistStore((st) => st.entries);
  const artist = useArtistStore((st) => st.artist);
  const trackId = useCampaignStore((st) => st.trackId);
  const selectPackage = useCampaignStore((st) => st.selectPackage);

  const pkg = PROMO_PACKAGES.find((p) => p.id === packageId);
  const track = entries.find((e) => e.track.id === trackId)?.track;
  usePageTitle(pkg ? `${s.packagePrefix} ${pkg.name} ${s.titleSuffix}` : s.badge);
  const close = () => goBack(`${base.campaign}/select-package`);

  if (!pkg) {
    return (
      <SheetCard onClose={close} closeLabel={s.close}>
        <EmptyState icon="info-outline" title={s.badge} />
      </SheetCard>
    );
  }

  const detail = PACKAGE_DETAILS[pkg.id];
  const genreLine = artist?.genres?.length ? ` • ${artist.genres.join(' & ')}` : '';

  return (
    <SheetCard title={`${s.packagePrefix} ${pkg.name} ${s.titleSuffix}`} onClose={close} closeLabel={s.close} wide>
      <span className="cp-step-pill">{s.badge.toUpperCase()}</span>

      <div className="cp-card">
        <InvestmentBlock pkg={pkg} s={s} locale={locale} />
        <div className="cp-between">
          <span className="cp-row cp-tertiary t-body-sm">
            <Icon name="local-fire-department" size={16} />
            {detail.popularity[locale]}
          </span>
          <span className="cp-roi">{detail.roi}</span>
        </div>
      </div>

      {track && (
        <div className="cp-track-chip">
          <Artwork source={track.coverUri} className="cp-chip-art" />
          <span className="cp-item-text">
            <span className="cp-eyebrow cp-primary">{s.selectedTrack.toUpperCase()}</span>
            <span className="t-label-lg ellipsis">{track.title}</span>
            <span className="t-body-sm cp-variant ellipsis">
              {track.artistName}
              {genreLine}
            </span>
          </span>
          <button type="button" className="cp-link" onClick={close}>
            {s.change}
          </button>
        </div>
      )}

      <section className="cp-section">
        <h2 className="cp-h2">{s.featuresTitle}</h2>
        {detail.features.map((f) => (
          <div key={f.title.en} className="cp-feature">
            <span className="cp-check">
              <Icon name="check" size={16} />
            </span>
            <span className="cp-item-text">
              <span className="t-label-lg">{f.title[locale]}</span>
              <span className="t-body-sm cp-variant">{f.body[locale]}</span>
            </span>
          </div>
        ))}
      </section>

      <section className="cp-section">
        <div className="cp-between">
          <h2 className="cp-h2">{s.forecastTitle}</h2>
          <span className="cp-ai-pill">{s.aiSimulation.toUpperCase()}</span>
        </div>
        <div className="cp-metrics">
          <div className="cp-metric">
            <span className="cp-mono cp-variant">{s.reachLabel}</span>
            <strong>{pkg.forecastHigh > 0 ? `${formatK(pkg.forecastLow)}-${formatK(pkg.forecastHigh)}` : '—'}</strong>
            <span className="t-body-sm cp-tertiary">{s.reachUnit}</span>
          </div>
          <div className="cp-metric">
            <span className="cp-mono cp-variant">{s.streamsLabel}</span>
            <strong>{detail.streams}</strong>
            <span className="t-body-sm cp-secondary">{s.streamsUnit}</span>
          </div>
          <div className="cp-metric">
            <span className="cp-mono cp-variant">{s.followersLabel}</span>
            <strong>{detail.followers}</strong>
            <span className="t-body-sm cp-primary">{s.followersUnit}</span>
          </div>
        </div>
        <p className="cp-disclaimer">
          <Icon name="info-outline" size={18} />
          <span>{s.disclaimer}</span>
        </p>
      </section>

      <section className="cp-section">
        <h2 className="cp-h2">{s.termsTitle}</h2>
        <div className="cp-card">
          <InvestmentBlock pkg={pkg} s={s} locale={locale} />
          <div className="cp-term">
            <Icon name="verified-user" size={20} className="cp-primary" />
            <span className="cp-item-text">
              <span className="t-label-md">{s.secureTitle}</span>
              <span className="t-body-sm cp-variant">{s.secureBody}</span>
            </span>
          </div>
          <div className="cp-term">
            <Icon name="pause-circle-outline" size={20} className="cp-tertiary" />
            <span className="cp-item-text">
              <span className="t-label-md">{s.controlTitle}</span>
              <span className="t-body-sm cp-variant">{s.controlBody}</span>
            </span>
          </div>
        </div>
      </section>

      <button
        type="button"
        className="ui-btn cp-cta"
        onClick={() => {
          if (guest) return showToast(d.readOnlyToast, 'lock');
          selectPackage(pkg.id);
          void navigate('/profile/artist/campaign/setup', { replace: true });
        }}
      >
        {s.selectFor} {formatKgsAmount(pkg.priceKgs)} {s.currency}
        <Icon name="arrow-forward" size={20} />
      </button>
      <p className="t-body-sm cp-variant cp-center">{s.nextStep}</p>
      {toast}
    </SheetCard>
  );
}
