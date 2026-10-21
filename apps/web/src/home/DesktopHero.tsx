// First: configures @mmusic/core storage before the persisted player store is used.
import '@/platform/storage';

import type { CSSProperties } from 'react';
import { Link } from 'react-router';

import type { LocalOrRemoteImage } from '@mmusic/core/constants/stitch-artwork';
import { getArtistById, getPlaylistById, getTrackById, heroPlaylistId, type Artist } from '@mmusic/core/mocks';
import type { AppLocale } from '@mmusic/core/state/locale-store';
import { Icon } from '@mmusic/ui-kit/web';

import { Artwork } from '@/components/Artwork';
import { useAppStrings } from '@/i18n/locale';

/** Website-only hero copy (desktop editorial hero; the app has no counterpart). */
const HERO_STRINGS = {
  ru: { lead: 'Музыка,', accent: 'созданная', tail: 'для тебя', body: 'Персональные подборки, свежие релизы и артисты Кыргызстана — в одном месте.', explore: 'Найти музыку', artists: 'Артисты' },
  en: { lead: 'Discover', accent: 'music made', tail: 'for you', body: 'Personal mixes, fresh releases and artists from Kyrgyzstan — all in one place.', explore: 'Explore music', artists: 'Artists' },
} as const satisfies Record<AppLocale, Record<string, string>>;

/** Artists on the wheel: catalog artists with a photo, in this order. */
const WHEEL_ARTIST_IDS = ['solaris-echo', 'maya-lin', 'kaelen', 'clover-and-the-pulse', 'arlo', 'tate-vane'];
const STARS_TITLE = 'MMusic Stars';

/** clip-path for one wheel segment: a wedge from the centre between two angles (degrees, 0 = top, clockwise). */
function wedge(from: number, to: number): string {
  const point = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return `${(50 + 100 * Math.sin(rad)).toFixed(2)}% ${(50 - 100 * Math.cos(rad)).toFixed(2)}%`;
  };
  return `polygon(50% 50%, ${point(from)}, ${point((from + to) / 2)}, ${point(to)})`;
}

/**
 * Desktop-only editorial hero (≥1024 px; hidden below, where the approved mobile Home is unchanged): a bold
 * discovery message with the MMusic Stars start button, and a wheel of catalog artists around the Stars cover.
 * Every segment opens its artist page; the centre starts MMusic Stars (the same action as the Stars card).
 */
export function DesktopHero({ onStartStars }: { onStartStars: () => void }) {
  const { t, locale } = useAppStrings();
  const s = HERO_STRINGS[locale];
  const hero = getPlaylistById(heroPlaylistId);
  const wheel = WHEEL_ARTIST_IDS.map((id) => getArtistById(id)).filter((a): a is Artist & { photoUri: LocalOrRemoteImage } => !!a?.photoUri);
  const step = 360 / Math.max(1, wheel.length);
  const ringText = (hero?.trackIds ?? []).map((id) => getTrackById(id)?.title).filter(Boolean).join('  •  ');

  return (
    <section className="d-hero" aria-label={STARS_TITLE}>
      <div className="d-hero-copy">
        <span className="d-hero-eq" aria-hidden="true">
          <Icon name="graphic-eq" size={40} />
        </span>
        <h1 className="d-hero-title">
          {s.lead} <em>{s.accent}</em> {s.tail}
        </h1>
        <p className="d-hero-body">{s.body}</p>
        <div className="d-hero-actions">
          <button type="button" className="d-hero-cta" onClick={onStartStars}>
            <span className="d-hero-cta-text">
              <span className="d-hero-cta-eyebrow">{STARS_TITLE}</span>
              <span>{t('starsCtaLabel')}</span>
            </span>
            <span className="d-hero-cta-icon" aria-hidden="true">
              <Icon name="play-arrow" size={26} />
            </span>
          </button>
          <Link className="d-hero-explore" to="/search">
            <Icon name="search" size={20} />
            <span>{s.explore}</span>
          </Link>
        </div>
        <ul className="d-hero-faces" aria-label={s.artists}>
          {wheel.slice(0, 4).map((artist) => (
            <li key={artist.id}>
              <Link to={`/artist/${artist.id}`} aria-label={artist.name} title={artist.name}>
                <Artwork source={artist.photoUri} />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="d-wheel-wrap">
        {ringText && (
          <svg className="d-wheel-ring" viewBox="0 0 600 600" aria-hidden="true">
            <defs>
              <path id="d-wheel-path" d="M300,300 m-282,0 a282,282 0 1,1 564,0 a282,282 0 1,1 -564,0" />
            </defs>
            <text>
              {/* Fitted exactly once around the circle (2π·282 ≈ 1772), so the ring reads without a cut-off seam. */}
              <textPath href="#d-wheel-path" textLength={1752} lengthAdjust="spacing">{`${ringText}  •`}</textPath>
            </text>
          </svg>
        )}
        <div className="d-wheel">
          {wheel.map((artist, i) => {
            const mid = i * step + step / 2;
            const rad = (mid * Math.PI) / 180;
            const style = { clipPath: wedge(i * step + 0.8, (i + 1) * step - 0.8), '--x': `${(50 + 30 * Math.sin(rad)).toFixed(2)}%`, '--y': `${(50 - 30 * Math.cos(rad)).toFixed(2)}%` } as CSSProperties;
            return (
              <Link key={artist.id} className="d-wheel-seg" to={`/artist/${artist.id}`} aria-label={artist.name} style={style}>
                <Artwork source={artist.photoUri} />
              </Link>
            );
          })}
          <button type="button" className="d-wheel-core" aria-label={`${STARS_TITLE} — ${t('starsCtaLabel')}`} onClick={onStartStars}>
            <Artwork source={hero?.coverUri} loading="eager" />
            <span className="d-wheel-core-label">
              <span className="d-wheel-core-title">{STARS_TITLE}</span>
              <span className="d-wheel-core-play" aria-hidden="true">
                <Icon name="play-arrow" size={28} />
              </span>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
