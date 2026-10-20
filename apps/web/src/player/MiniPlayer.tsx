// First: configures @mmusic/core storage before the persisted player store is used.
import '@/platform/storage';

import { usePlayerStore } from '@mmusic/core/state/player-store';
import { Icon } from '@mmusic/ui-kit/web';

import { Artwork } from '@/components/Artwork';
import { useAppStrings } from '@/i18n/locale';

import './mini-player.css';

/**
 * The approved mini-player capsule (A3 / the app): appears once something has been played and stays on every page.
 * Like (the shared, persisted liked tracks), previous, play/pause, next — all through the shared player store.
 * A track without audio in this preview shows the store's honest "unavailable" state instead of pretending to play.
 */
export function MiniPlayer() {
  const { t } = useAppStrings();
  const playback = usePlayerStore((s) => s.playback);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const track = usePlayerStore((s) => s.currentTrack());
  const liked = usePlayerStore((s) => (track ? s.likedTrackIds.has(track.id) : false));
  const { togglePlayPause, next, previous, toggleLike } = usePlayerStore.getState();

  if (playback === 'idle' || !track) return null;
  const unavailable = playback === 'unavailable';
  const playLabel = unavailable ? t('playUnavailableLabel') : isPlaying || playback === 'loading' ? t('pauseLabel') : t('playLabel');

  return (
    <section className="capsule glass" aria-label={`${track.title} — ${track.artistName}`}>
      <Artwork source={track.coverUri} className="c-cover" />
      <div className="c-text">
        <span className="t-label-lg ellipsis">{track.title}</span>
        <span className="t-body-sm c-artist ellipsis">
          {track.artistName}
          {isPlaying && (
            <span className="c-eq" aria-hidden="true">
              <Icon name="graphic-eq" size={14} />
            </span>
          )}
        </span>
      </div>
      <button type="button" className={liked ? 'c-btn on' : 'c-btn'} aria-label={liked ? t('likedStateLabel') : t('likeLabel')} aria-pressed={liked} onClick={() => toggleLike(track.id)}>
        <Icon name={liked ? 'favorite' : 'favorite-border'} size={22} />
      </button>
      <button type="button" className="c-btn" aria-label={t('previousTrackLabel')} onClick={previous}>
        <Icon name="skip-previous" size={26} />
      </button>
      <button type="button" className="c-play" aria-label={playLabel} disabled={unavailable} onClick={togglePlayPause}>
        <Icon name={isPlaying || playback === 'loading' ? 'pause' : 'play-arrow'} size={26} />
      </button>
      <button type="button" className="c-btn" aria-label={t('nextTrackLabel')} onClick={next}>
        <Icon name="skip-next" size={26} />
      </button>
    </section>
  );
}
