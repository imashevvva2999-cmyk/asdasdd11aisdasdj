// First: configures @mmusic/core storage before the persisted player store is used.
import '@/platform/storage';

import { useEffect, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';

import { forYouTiles, getAlbumById, getPlaylistById, getTrackById, heroPlaylistId, jumpBackInTrackIds, moodMixes, newReleases, trendingNowAlbumIds, type Album } from '@mmusic/core/mocks';
import { useLibraryStore } from '@mmusic/core/state/library-store';
import { usePlayerStore } from '@mmusic/core/state/player-store';
import { GalaxyScene } from '@mmusic/ui-kit/visuals/living-moods/scenes/galaxy-scene';
import { LiquidChromeScene } from '@mmusic/ui-kit/visuals/living-moods/scenes/liquid-chrome-scene';
import { MetaBallsScene } from '@mmusic/ui-kit/visuals/living-moods/scenes/meta-balls-scene';
import { OrbScene } from '@mmusic/ui-kit/visuals/living-moods/scenes/orb-scene';
import { Icon, type IconName } from '@mmusic/ui-kit/web';

import { Artwork } from '@/components/Artwork';
import { Backdrop } from '@/components/Backdrop';
import { LivingMood, type SceneEngineCtor } from '@/components/LivingMood';
import { ParticleWave } from '@/components/ParticleWave';
import { SectionHead } from '@/components/SectionHead';
import { useAppStrings } from '@/i18n/locale';

import { DesktopHero } from './DesktopHero';
import './home.css';
import './desktop.css';

/** The hero's title, as in the approved app and A3 (a brand name, not translated). */
const STARS_TITLE = 'MMusic Stars';
const MOOD_TINT: Record<string, string> = { primary: 'var(--primary)', secondary: 'var(--secondary)', tertiary: 'var(--tertiary)' };
/** The app's Living Moods scene per mood card (mobile home MOOD_SCENES) and its approved gradient fallback. */
const MOOD_SCENES: Record<string, { scene: SceneEngineCtor; colors: [string, string] }> = {
  'late-night': { scene: GalaxyScene, colors: ['#0a0e16', '#162038'] },
  melancholy: { scene: LiquidChromeScene, colors: ['#1a1a1f', '#3a3a42'] },
  'high-energy': { scene: OrbScene, colors: ['#120a16', '#2a1638'] },
  'flow-state': { scene: MetaBallsScene, colors: ['#1a1014', '#3a1f28'] },
};
const DESKTOP_QUERY = '(min-width: 1024px)';

/** Desktop (≥1024 px) vs phone/tablet, so only one particle-wave WebGL context exists: the desktop hero or the Stars card. */
function useIsDesktop() {
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setDesktop(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return desktop;
}

/** Enter / Space activate a role="button" element, like a native button. */
const onKeyActivate = (action: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    action();
  }
};

/**
 * S-01 Home — the approved A3 Refined Hybrid layout (docs/design-review/desktop-home/a3.html) with the app's own
 * catalog: MMusic Stars + For You, Trending Now, New Releases, Continue Listening, Mood & Vibes. Everything that
 * looks interactive plays through the shared player store or opens its page (albums, the artist radio tile), as in the app.
 */
export function HomePage() {
  const { t } = useAppStrings();
  const play = usePlayerStore((s) => s.play);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const currentTrackId = usePlayerStore((s) => s.currentTrackId());
  const queue = usePlayerStore((s) => s.queue);
  const savedItems = useLibraryStore((s) => s.items);
  const toggleSaved = useLibraryStore((s) => s.toggleSaved);
  const hero = getPlaylistById(heroPlaylistId);
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const waveTrackId = currentTrackId ?? hero?.trackIds?.[0];

  useEffect(() => {
    document.title = `${t('homeTab')} – Mmusic`;
  }, [t]);

  const playList = (ids: readonly string[] | undefined) => {
    if (ids && ids.length > 0) play(ids[0]!, [...ids]);
  };
  // MMusic Stars: starts the hero playlist (or resumes it when it is already in the player), then opens Discover
  // on that track — the app's openStars().
  const startStars = () => {
    const ids = hero?.trackIds ?? [];
    const heroInPlayer = !!currentTrackId && ids.includes(currentTrackId) && queue.length === ids.length;
    let targetTrackId = currentTrackId;
    if (heroInPlayer) {
      if (!usePlayerStore.getState().isPlaying) togglePlayPause();
    } else if (ids.length > 0) {
      targetTrackId = ids[0];
      playList(ids);
    }
    const entry = targetTrackId ?? ids[0];
    void navigate(entry ? `/player/discover?trackId=${encodeURIComponent(entry)}` : '/player/discover');
  };
  const isSaved = (albumId: string) => savedItems.some((item) => item.kind === 'album' && item.refId === albumId);

  // "Для вас": in the desktop hero's upper-left (next to the wheel) on ≥1024 px, under the Stars card below that.
  const forYou = (
    <div className="area-foryou">
      <SectionHead title={t('forYou')} />
      <div className="list">
        {forYouTiles.map((tile) => (
          <button key={tile.id} type="button" className="tile" onClick={() => (tile.artistId ? void navigate(`/artist/${tile.artistId}`) : playList(tile.trackIds))}>
            <Artwork source={tile.coverUri} className="tile-art" />
            <span className="label">
              <span className="label-title">{tile.title}</span>
              {tile.artistId && <span className="d-kind">{t('artistLabel')}</span>}
            </span>
            {/* Artist tiles open the artist page (as in the app): a profile badge, not a play button. */}
            <span className={tile.artistId ? 'd-play artist' : 'd-play'} aria-hidden="true">
              <Icon name={tile.artistId ? 'person' : 'play-arrow'} size={20} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="home">
      <Backdrop />

      {isDesktop ? (
        <DesktopHero onStartStars={startStars} waveTrackId={waveTrackId}>
          {forYou}
        </DesktopHero>
      ) : (
        <section className="hero" aria-label={STARS_TITLE}>
          <div className="area-stars">
            <button type="button" className="stars" aria-label={`${STARS_TITLE} — ${t('starsCtaLabel')}`} onClick={startStars}>
              <span className="art">
                <ParticleWave cover={hero?.coverUri} trackId={waveTrackId} className="artwork" />
              </span>
              <span className="foot">
                <span className="title">{STARS_TITLE}</span>
                <span className="cta" aria-hidden="true">
                  {t('starsCtaLabel')}
                </span>
              </span>
            </button>
          </div>
          {forYou}
        </section>
      )}

      <section aria-labelledby="home-trending">
        <SectionHead id="home-trending" title={t('trendingNow')} />
        <div className="cards">
          {trendingNowAlbumIds.map((id) => getAlbumById(id)).filter((a): a is Album => !!a).map((album) => (
            <AlbumCard key={album.id} album={album} meta={`${album.trackCount} ${t('tracksCountSuffix')}`} onPlay={() => void navigate(`/album/${album.id}`)} saved={isSaved(album.id)} onToggleSaved={() => toggleSaved('album', album.id)} likeLabel={isSaved(album.id) ? t('likedStateLabel') : t('likeLabel')} />
          ))}
        </div>
      </section>

      <section aria-labelledby="home-new">
        <SectionHead id="home-new" title={t('newReleases')} />
        <div className="cards">
          {newReleases.map(({ albumId, label }) => {
            const album = getAlbumById(albumId);
            return album ? <AlbumCard key={album.id} album={album} meta={label} surfaced onPlay={() => void navigate(`/album/${album.id}`)} /> : null;
          })}
        </div>
      </section>

      <section className="duo">
        <div aria-labelledby="home-jump">
          <SectionHead id="home-jump" title={t('jumpBackIn')} />
          <div className="track-list">
            {jumpBackInTrackIds.map((id) => getTrackById(id)).map((track) =>
              track ? (
                <button key={track.id} type="button" className={currentTrackId === track.id ? 'track active' : 'track'} aria-label={`${track.title} — ${track.artistName}`} aria-current={currentTrackId === track.id ? 'true' : undefined} onClick={() => play(track.id, [...jumpBackInTrackIds])}>
                  <Artwork source={track.coverUri} className="track-art" />
                  <span className="t-text">
                    <span className="t-label-lg t-title ellipsis">{track.title}</span>
                    <span className="t-sub">
                      <span className="t-body-sm medium ellipsis">{track.artistName}</span>
                      {track.explicit && <span className="badge-e">E</span>}
                    </span>
                  </span>
                  <span className="d-play" aria-hidden="true">
                    <Icon name={currentTrackId === track.id ? 'graphic-eq' : 'play-arrow'} size={20} />
                  </span>
                </button>
              ) : null,
            )}
          </div>
        </div>
        <div aria-labelledby="home-moods">
          <SectionHead id="home-moods" title={t('moodVibeMixes')} />
          <div className="moods">
            {moodMixes.map((mix) => {
              const mood = MOOD_SCENES[mix.id];
              const [c0, c1] = mood?.colors ?? ['#141418', '#282834'];
              return (
                <button key={mix.id} type="button" className="mood" aria-label={`${mix.title} — ${mix.subtitle}`} style={{ '--c0': c0, '--c1': c1 } as CSSProperties} onClick={() => playList(mix.trackIds)}>
                  {mood && <LivingMood engine={mood.scene} fallbackColors={mood.colors} />}
                  <span className="row">
                    <span style={{ color: MOOD_TINT[mix.tint] ?? 'var(--primary)', display: 'inline-flex' }}>
                      <Icon name={mix.icon as IconName} size={24} />
                    </span>
                    <span className="t-mono-num medium">
                      {mix.trackCount} {t('tracksCountSuffix')}
                    </span>
                  </span>
                  <span className="txt">
                    <span className="t-label-lg">{mix.title}</span>
                    <span className="t-body-sm medium">{mix.subtitle}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

type AlbumCardProps = {
  album: Album;
  meta: string;
  surfaced?: boolean;
  /** Opens the album page (as in the app); absent → the card is not interactive. */
  onPlay?: () => void;
  saved?: boolean;
  onToggleSaved?: () => void;
  likeLabel?: string;
};

/** A3 cover card: square cover with a soft glow on hover, title, artist and a meta line. */
function AlbumCard({ album, meta, surfaced, onPlay, saved, onToggleSaved, likeLabel }: AlbumCardProps) {
  const interactive = onPlay ? { role: 'button', tabIndex: 0, 'aria-label': `${album.title} — ${album.artistName}`, onClick: onPlay, onKeyDown: onKeyActivate(onPlay) } : {};
  return (
    <div className={['cover-card', surfaced && 'surfaced', onPlay && 'playable'].filter(Boolean).join(' ')} {...interactive}>
      <Artwork source={album.coverUri} className="glow" />
      <div className="cover">
        <Artwork source={album.coverUri} />
        {onToggleSaved && (
          <button
            type="button"
            className={saved ? 'like on' : 'like'}
            aria-label={likeLabel}
            aria-pressed={saved}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSaved();
            }}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Icon name={saved ? 'favorite' : 'favorite-border'} size={16} />
          </button>
        )}
      </div>
      <div className="meta-text">
        <span className="t-label-lg ellipsis">{album.title}</span>
        <span className="t-body-sm medium ellipsis">{album.artistName}</span>
        <span className={surfaced ? 't-body-sm release-label ellipsis' : 't-mono-num medium'}>{meta}</span>
      </div>
    </div>
  );
}
