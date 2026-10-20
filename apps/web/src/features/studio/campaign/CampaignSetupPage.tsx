// First: configures @mmusic/core storage before the persisted locale store is used.
import '@/platform/storage';

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { formatKgsAmount } from '@mmusic/core/lib/format-currency';
import { PROMO_PACKAGES } from '@mmusic/core/mocks/promotions';
import { STITCH_DEFAULT_GENRE_IDS, STITCH_GENRES } from '@mmusic/core/promotion/data/genres';
import { KG_REGIONS, SetupFormPromoStrings, UPLOAD_GENRE_TO_TARGET } from '@mmusic/core/promotion/strings/setup-form';
import { SetupPromoStrings } from '@mmusic/core/promotion/strings/setup';
import { useArtistStore } from '@mmusic/core/state/artist-store';
import { DESCRIPTION_MAX, setupIssues, useCampaignStore, type AgeGroup, type GeoScope } from '@mmusic/core/state/campaign-store';
import { useDashboardStrings } from '@mmusic/core/state/dashboard-locale-store';
import { Icon, type IconName } from '@mmusic/ui-kit/web';

import { Artwork } from '@/components/Artwork';
import { Page } from '@/ui';

import { usePageTitle, usePromoStrings } from '../kit';
import { FieldError, FieldTag, StepSegments, StitchHeader, useGoBack } from './shared';

const AGE_CHIPS: AgeGroup[] = ['all', '18-24', '25-34', '35-44', '45+'];

/** Campaign wizard step 3/4 — audience setup (mobile campaign/setup.tsx): location (required region list when
 * custom), age groups, target genres (at least one), optional description, the package's reach forecast. */
export function CampaignSetupPage() {
  const { locale } = useDashboardStrings();
  const s = usePromoStrings(SetupPromoStrings);
  const f = usePromoStrings(SetupFormPromoStrings);
  usePageTitle(s.title);
  const navigate = useNavigate();
  const goBack = useGoBack();
  const entries = useArtistStore((st) => st.entries);
  const trackId = useCampaignStore((st) => st.trackId);
  const packageId = useCampaignStore((st) => st.packageId);
  const targetGenreIds = useCampaignStore((st) => st.targetGenreIds);
  const geoScope = useCampaignStore((st) => st.geoScope);
  const toggleGenre = useCampaignStore((st) => st.toggleGenre);
  const setGeoScope = useCampaignStore((st) => st.setGeoScope);
  const goToConfirm = useCampaignStore((st) => st.goToConfirm);
  const customRegionIds = useCampaignStore((st) => st.customRegionIds);
  const toggleRegion = useCampaignStore((st) => st.toggleRegion);
  const description = useCampaignStore((st) => st.description);
  const setDescription = useCampaignStore((st) => st.setDescription);
  const ages = useCampaignStore((st) => st.ageGroups);
  const toggleAge = useCampaignStore((st) => st.toggleAgeGroup);
  const [attempted, setAttempted] = useState(false);
  const prechecked = useRef(false);

  useEffect(() => {
    if (!trackId) void navigate('/profile/artist/campaign/select-track', { replace: true });
  }, [trackId, navigate]);

  useEffect(() => {
    if (prechecked.current) return;
    prechecked.current = true;
    // First visit: Stitch's default genres plus the track's own upload genre.
    if (useCampaignStore.getState().targetGenreIds.length === 0) {
      const own = UPLOAD_GENRE_TO_TARGET[entries.find((e) => e.track.id === trackId)?.genre ?? ''];
      new Set([...STITCH_DEFAULT_GENRE_IDS, ...(own ? [own] : [])]).forEach((id) => toggleGenre(id));
    }
  }, [toggleGenre, entries, trackId]);

  const entry = entries.find((e) => e.track.id === trackId);
  const track = entry?.track;
  const issues = setupIssues({ targetGenreIds, geoScope, customRegionIds });
  const showGenreError = issues.includes('noGenres');
  const showRegionError = attempted && issues.includes('noRegions');
  const pkg = PROMO_PACKAGES.find((p) => p.id === packageId);

  if (!trackId || !track || !pkg) return <Page narrow>{null}</Page>;

  const numLocale = locale === 'ru' ? 'ru-RU' : 'en-US';
  const price = `${formatKgsAmount(pkg.priceKgs)} ${s.currency}`;
  const perImpression = pkg.forecastHigh > 0 ? (pkg.priceKgs / pkg.forecastHigh).toFixed(2) : '0.00';
  const toPackages = () => goBack('/profile/artist/campaign/select-package');

  const geoOptions: { scope: GeoScope; title: string; hint: string; idleIcon: IconName }[] = [
    { scope: 'all', title: s.geoAll, hint: s.geoAllHint, idleIcon: 'radio-button-unchecked' },
    { scope: 'bishkek', title: s.geoBishkek, hint: s.geoBishkekHint, idleIcon: 'radio-button-unchecked' },
    { scope: 'bishkek-osh', title: s.geoBishkekOsh, hint: s.geoBishkekOshHint, idleIcon: 'radio-button-unchecked' },
    { scope: 'custom', title: s.geoManual, hint: s.geoManualHint, idleIcon: 'tune' },
  ];
  const included: Record<GeoScope, string> = { all: s.includedAll, bishkek: s.includedBishkek, 'bishkek-osh': s.includedBishkekOsh, custom: s.includedManual };

  function next() {
    setAttempted(true);
    if (issues.length > 0) return;
    goToConfirm();
    void navigate('/profile/artist/campaign/confirm');
  }

  return (
    <Page narrow>
      <StitchHeader title={s.title} onBack={toPackages} />
      <div className="cp-progress-block">
        <div className="cp-between">
          <span className="cp-step-label">{s.step}</span>
          <span className="cp-mono cp-outline">{s.stepCaption}</span>
        </div>
        <div className="cp-bar">
          <span style={{ width: '75%' }} />
        </div>
        <p className="cp-sub">{s.intro}</p>
      </div>

      <div className="cp-card">
        <div className="cp-row">
          <Artwork source={track.coverUri} className="cp-item-art" />
          <span className="cp-item-text">
            <span className="t-headline-sm ellipsis">{track.title}</span>
            <span className="t-body-sm cp-outline ellipsis">
              {track.artistName}
              {entry?.genre ? ` • ${f.genreFromTrack}: ${entry.genre}` : ''}
            </span>
            <span className="cp-eyebrow cp-primary">
              <span className="cp-dot" /> {s.readyToLaunch}
            </span>
          </span>
        </div>
        <div className="cp-package-row">
          <Icon name="stars" size={20} className="cp-secondary" />
          <span className="t-label-md cp-grow">
            {s.tariff} {pkg.name}
            <span className="t-body-sm cp-outline">
              {'   '}
              {pkg.durationDays} {s.days} • {price}
            </span>
          </span>
          <button type="button" className="cp-link" onClick={toPackages}>
            {s.change}
          </button>
        </div>
      </div>

      <section className="cp-section">
        <div className="cp-between">
          <h2 className="cp-h2 cp-row">
            <Icon name="public" size={20} className="cp-primary" />
            {s.geoTitle} <FieldTag text={f.required} required />
          </h2>
          <span className="cp-eyebrow">{s.geoCountry}</span>
        </div>
        <div className="cp-geo-grid">
          {geoOptions.map((opt) => {
            const active = geoScope === opt.scope;
            return (
              <button key={opt.scope} type="button" aria-pressed={active} className={active ? 'cp-geo on' : 'cp-geo'} onClick={() => setGeoScope(opt.scope)}>
                <span className="cp-item-text">
                  <span className="t-label-lg">{opt.title}</span>
                  <span className="t-body-sm cp-outline">{opt.hint}</span>
                </span>
                <Icon name={active ? 'check-circle' : opt.idleIcon} size={20} className={active ? 'cp-primary' : 'cp-faint'} />
              </button>
            );
          })}
        </div>
        {geoScope === 'custom' && (
          <div className="cp-card">
            <span className="t-label-md">{f.regionsTitle}</span>
            <span className="t-body-sm cp-outline">{f.regionsHint}</span>
            <div className="cp-chip-wrap">
              {KG_REGIONS.map((r) => {
                const active = customRegionIds.includes(r.id);
                return (
                  <button key={r.id} type="button" aria-pressed={active} className={active ? 'cp-pill on' : 'cp-pill'} onClick={() => toggleRegion(r.id)}>
                    {r.label[locale]}
                  </button>
                );
              })}
            </div>
            {showRegionError && <FieldError text={f.errNoRegions} />}
          </div>
        )}
        <div className="cp-included">
          <Icon name="explore" size={18} />
          <span className="cp-item-text">
            <span className="cp-eyebrow">{s.includedTitle}</span>
            <span className="t-body-sm cp-variant">{included[geoScope]}</span>
          </span>
        </div>
      </section>

      <section className="cp-section">
        <div className="cp-between">
          <h2 className="cp-h2 cp-row">
            <Icon name="group" size={20} className="cp-primary" />
            {s.ageTitle}
          </h2>
          <span className="cp-age-badge">{s.ageBadge}</span>
        </div>
        <FieldTag text={f.optional} />
        <div className="cp-chip-wrap">
          {AGE_CHIPS.map((chip) => {
            const active = ages.includes(chip);
            return (
              <button key={chip} type="button" aria-pressed={active} className={active ? 'cp-pill on' : 'cp-pill'} onClick={() => toggleAge(chip)}>
                {chip === 'all' ? s.ageAll : chip.replace('-', ' — ')}
              </button>
            );
          })}
        </div>
        <div className="cp-card">
          <div className="cp-between cp-mono">
            <span className="cp-outline">{s.ageMin}</span>
            <strong>{s.ageRange}</strong>
            <span className="cp-outline">{s.ageMax}</span>
          </div>
          <div className="cp-bar range">
            <span />
          </div>
          <span className="t-body-sm cp-outline">{s.ageNote}</span>
        </div>
      </section>

      <section className="cp-section">
        <h2 className="cp-h2 cp-row">
          <Icon name="equalizer" size={20} className="cp-primary" />
          {s.genresTitle} <FieldTag text={f.required} required />
        </h2>
        <p className="t-body-sm cp-variant">{s.genresIntro}</p>
        <div className="cp-genres">
          {STITCH_GENRES.map((g) => {
            const checked = targetGenreIds.includes(g.id);
            return (
              <button key={g.id} type="button" aria-pressed={checked} className={checked ? 'cp-genre on' : 'cp-genre'} onClick={() => toggleGenre(g.id)}>
                <span className={checked ? 'cp-box on' : 'cp-box'}>{checked && <Icon name="check" size={18} />}</span>
                <span className="cp-item-text">
                  <span className="t-label-lg">{g.label[locale]}</span>
                  <span className={g.delta === 'bolt' ? 't-body-sm cp-primary' : 't-body-sm cp-outline'}>{g.hint[locale]}</span>
                </span>
                {g.delta === 'bolt' ? <Icon name="bolt" size={20} className="cp-secondary" /> : <span className="cp-mono cp-outline">{g.delta}</span>}
              </button>
            );
          })}
        </div>
        {showGenreError && <FieldError text={f.errNoGenres} />}
      </section>

      <section className="cp-section">
        <h2 className="cp-h2 cp-row">
          <Icon name="edit-note" size={20} className="cp-primary" />
          {f.descriptionTitle} <FieldTag text={f.optional} />
        </h2>
        <p className="t-body-sm cp-variant">{f.descriptionHint}</p>
        <textarea
          className="ui-input cp-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={DESCRIPTION_MAX}
          placeholder={f.descriptionPlaceholder}
          aria-label={f.descriptionTitle}
        />
        <span className="cp-counter">
          {description.length}/{DESCRIPTION_MAX}
        </span>
      </section>

      <section className="cp-card cp-forecast-card">
        <div className="cp-between">
          <h2 className="cp-h2 cp-row">
            <Icon name="auto-graph" size={22} className="cp-secondary" />
            {s.forecastTitle}
          </h2>
          <span className="cp-live">
            <span className="cp-dot" /> {s.liveAi}
          </span>
        </div>
        <div className="cp-meter">
          <strong>{pkg.forecastLow.toLocaleString(numLocale)}</strong>
          <span className="cp-primary">–</span>
          <strong>{pkg.forecastHigh.toLocaleString(numLocale)}</strong>
        </div>
        <span className="t-body-sm cp-outline">{s.forecastCaption}</span>
        <div className="cp-match">
          <Icon name="verified" size={18} className="cp-secondary" />
          <span className="cp-item-text">
            <span className="t-label-md">{s.relevance}</span>
            <span className="t-body-sm cp-outline">{s.relevanceHint}</span>
          </span>
          <span className="cp-mono cp-secondary">{s.excellent}</span>
        </div>
      </section>

      <div className="cp-footer">
        <div className="cp-between">
          <span className="cp-item-text">
            <span className="cp-eyebrow">{s.total}</span>
            <span className="cp-row">
              <strong className="t-headline-sm">{price}</strong>
              <span className="t-body-sm cp-outline">
                • {pkg.durationDays} {s.showDays}
              </span>
            </span>
          </span>
          <span className="cp-per-chip">
            <Icon name="bolt" size={14} className="cp-primary" />~{perImpression} {s.perImpression}
          </span>
        </div>
        {attempted && issues.length > 0 && <FieldError text={f.fixErrors} center />}
        <div className="cp-row">
          <button type="button" className="icon-btn" aria-label={f.back} onClick={toPackages}>
            <Icon name="arrow-back" size={20} />
          </button>
          <button type="button" className="ui-btn cp-cta cp-grow" onClick={next}>
            {s.cta}
            <Icon name="arrow-forward" size={20} />
          </button>
        </div>
        <StepSegments step={3} />
      </div>
    </Page>
  );
}
