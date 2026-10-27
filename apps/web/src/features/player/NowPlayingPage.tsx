// First: configures @mmusic/core storage before the persisted player store is used.
import '@/platform/storage';

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { lyricOpenAccessibilityLabel } from '@mmusic/core/lib/i18n';
import { lyricPreview, lyricsStateFor } from '@mmusic/core/lib/lyrics-state';
import { getAlbumById, getTrackById } from '@mmusic/core/mocks';
import { usePlayerStore } from '@mmusic/core/state/player-store';
import { Icon } from '@mmusic/ui-kit/web';

import { Artwork } from '@/components/Artwork';
import { useAppStrings } from '@/i18n/locale';
import { EmptyState } from '@/ui';

import { ArtistSheet } from './ArtistSheet';
import { ProgressRing, Waveform } from './desktop';
import { PlayButton, Screen, SeekBar, useDocumentTitle, useEscape, useGoBack } from './shared';
import { usePlayerStrings } from './strings';

/**
 * S-15 Now Playing (app: app/player/now-playing.tsx) — the Dynamic Premium player on the cover's stage: large
 * artwork, title / artist, like, scrubber, shuffle · previous · play · next · repeat, the current lyric line and
 * Lyrics / Queue. Desktop: artwork and controls side by side; phone: the app's single column.
 * `?trackId=` plays that track first (as in the app).
 */
export function NowPlayingPage() {
  const { t, locale } = useAppStrings();
  const ps = usePlayerStrings();
  const [params] = useSearchParams();
  const trackIdParam = params.get('trackId');
  const track = usePlayerStore((s) => s.currentTrack());
  const playback = usePlayerStore((s) => s.playback);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progressSec = usePlayerStore((s) => s.progressSec);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const liked = usePlayerStore((s) => (track ? s.likedTrackIds.has(track.id) : false));
  const { next, previous, toggleShuffle, cycleRepeat, toggleLike } = usePlayerStore.getState();
  const goBack = useGoBack('/home');
  const [artistSheetOpen, setArtistSheetOpen] = useState(false);
  // While the artist sheet is open, Escape closes the sheet only.
  useEscape(artistSheetOpen ? noop : goBack);
  useDocumentTitle(track ? `${track.title} — ${track.artistName}` : t('nothingPlayingLabel'));

  useEffect(() => {
    const player = usePlayerStore.getState();
    if (trackIdParam && getTrackById(trackIdParam) && trackIdParam !== player.currentTrackId()) player.play(trackIdParam);
  }, [trackIdParam]);

  if (!track || playback === 'idle') {
    return (
      <Screen cover={undefined} className="np">
        <header className="pl-head">
          <button type="button" className="pl-ghost" aria-label={t('collapsePlayerLabel')} onClick={goBack}>
            <Icon name="keyboard-arrow-down" size={30} />
          </button>
        </header>
        <div className="pl-empty-wrap">
          <EmptyState icon="music-note" title={t('nothingPlayingLabel')}>
            <Link className="ui-btn" to="/home">
              {t('homeTab')}
            </Link>
          </EmptyState>
        </div>
      </Screen>
    );
  }

  const album = track.albumId ? getAlbumById(track.albumId) : undefined;
  const lyricLine = lyricPreview(lyricsStateFor(track.id), progressSec * 1000, locale);
  const repeatLabel = repeat === 'one' ? ps('repeatOne') : repeat === 'all' ? ps('repeatAll') : ps('repeatOff');

  return (
    <Screen cover={track.coverUri} className="np">
      <header className="pl-head">
        <button type="button" className="pl-ghost" aria-label={t('collapsePlayerLabel')} onClick={goBack}>
          <Icon name="keyboard-arrow-down" size={30} />
        </button>
        <div className="pl-head-center">
          <span className="pl-eyebrow">{album ? t('playingFromAlbum') : t('playingLabel')}</span>
          <span className="t-label-md ellipsis">{album?.title ?? track.title}</span>
        </div>
        <span className="pl-head-spacer" aria-hidden="true" />
      </header>

      <main className="np-body">
        {/* np-disc / np-seek are layout-neutral (display: contents) below 1024 px; desktop adds the ring and waveform. */}
        <div className="np-disc">
          <ProgressRing />
          <div className={isPlaying ? 'np-art playing' : 'np-art'}>
            <Artwork source={track.coverUri} alt={album?.title ?? track.title} loading="eager" />
          </div>
        </div>

        <div className="np-panel">
          <div className="np-title-row">
            <div className="np-title">
              <h1 className="ellipsis">{track.title}</h1>
              <p className="ellipsis pl-medium">
                {/* The artist sheet (artist + album); the full profile is one click inside it. */}
                <button type="button" className="np-artist-link ellipsis" aria-haspopup="dialog" onClick={() => setArtistSheetOpen(true)}>
                  {track.artistName}
                </button>
                {track.explicit && <span className="badge-e">E</span>}
              </p>
            </div>
            <button type="button" className={liked ? 'pl-ghost np-like on' : 'pl-ghost np-like'} aria-label={liked ? t('unlikeLabel') : t('likeLabel')} aria-pressed={liked} onClick={() => toggleLike(track.id)}>
              <Icon name={liked ? 'favorite' : 'favorite-border'} size={28} />
            </button>
          </div>

          <div className="np-seek">
            <Waveform trackId={track.id} />
            <SeekBar />
          </div>

          <div className="np-transport">
            <button type="button" className={shuffle ? 'pl-ghost pl-mode on' : 'pl-ghost pl-mode'} aria-label={`${t('shuffleLabel')} — ${shuffle ? ps('shuffleOn') : ps('shuffleOff')}`} aria-pressed={shuffle} title={shuffle ? ps('shuffleOn') : ps('shuffleOff')} onClick={toggleShuffle}>
              <Icon name="shuffle" size={24} />
            </button>
            <button type="button" className="pl-ghost pl-skip" aria-label={t('previousTrackLabel')} onClick={previous}>
              <Icon name="skip-previous" size={40} />
            </button>
            <PlayButton size={76} />
            <button type="button" className="pl-ghost pl-skip" aria-label={t('nextTrackLabel')} onClick={next}>
              <Icon name="skip-next" size={40} />
            </button>
            <button type="button" className={repeat !== 'off' ? 'pl-ghost pl-mode on' : 'pl-ghost pl-mode'} aria-label={`${t('repeatLabel')} — ${repeatLabel}`} title={repeatLabel} data-repeat={repeat} onClick={cycleRepeat}>
              <Icon name={repeat === 'one' ? 'repeat-one' : 'repeat'} size={24} />
            </button>
          </div>
          <p className="np-mode-state" aria-live="polite">
            {[shuffle ? ps('shuffleOn') : null, repeat !== 'off' ? repeatLabel : null].filter(Boolean).join(' · ')}
          </p>

          {lyricLine !== undefined && (
            <Link to="/player/lyrics" className="np-lyric" aria-label={lyricOpenAccessibilityLabel(locale, lyricLine.label, lyricLine.text)}>
              <span className="pl-eyebrow">{lyricLine.label}</span>
              <span className="np-lyric-text ellipsis">{lyricLine.text}</span>
            </Link>
          )}

          <nav className="np-actions" aria-label={`${t('lyricsTab')} / ${t('queueTab')}`}>
            <Link to="/player/lyrics" className="np-action">
              <Icon name="lyrics" size={22} />
              <span>{t('lyricsTab')}</span>
            </Link>
            <Link to="/player/queue" className="np-action">
              <Icon name="queue-music" size={22} />
              <span>{t('queueTab')}</span>
            </Link>
          </nav>
        </div>
      </main>
      {artistSheetOpen && <ArtistSheet track={track} onClose={() => setArtistSheetOpen(false)} />}
    </Screen>
  );
}

const noop = () => {};
