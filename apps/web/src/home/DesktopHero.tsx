// First: configures @mmusic/core storage before the persisted player store is used.
import '@/platform/storage';

import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';

import type { LocalOrRemoteImage } from '@mmusic/core/constants/stitch-artwork';
import { getArtistById, getPlaylistById, getTrackById, heroPlaylistId, type Artist } from '@mmusic/core/mocks';
import { Icon } from '@mmusic/ui-kit/web';

import { Artwork } from '@/components/Artwork';
import { ParticleWave } from '@/components/ParticleWave';
import { useAppStrings } from '@/i18n/locale';

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
 * Desktop-only hero (rendered by Home only at ≥1024 px; below that the approved mobile Home is unchanged): "Для вас"
 * (passed in as `children`) in the upper-left, and on the right the wheel of catalog artists around the particle-wave
 * MMusic Stars core. Every segment opens its artist page; the centre starts MMusic Stars (the Stars card's action).
 */
export function DesktopHero({ onStartStars, waveTrackId, children }: { onStartStars: () => void; waveTrackId?: string; children: ReactNode }) {
  const { t } = useAppStrings();
  const hero = getPlaylistById(heroPlaylistId);
  const wheel = WHEEL_ARTIST_IDS.map((id) => getArtistById(id)).filter((a): a is Artist & { photoUri: LocalOrRemoteImage } => !!a?.photoUri);
  const step = 360 / Math.max(1, wheel.length);
  const ringText = (hero?.trackIds ?? []).map((id) => getTrackById(id)?.title).filter(Boolean).join('  •  ');

  return (
    <section className="d-hero" aria-label={STARS_TITLE}>
      <div className="d-hero-side">{children}</div>

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
            {/* The approved particle wave lives here on desktop (the Stars card has it below 1024 px; never both). */}
            <ParticleWave cover={hero?.coverUri} trackId={waveTrackId} className="artwork" />
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
