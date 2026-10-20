// First: configures @mmusic/core storage before the persisted player store is used.
import '@/platform/storage';

import { useMemo } from 'react';

import { removeItemAccessibilityLabel } from '@mmusic/core/lib/i18n';
import { getTrackById, type Track } from '@mmusic/core/mocks';
import { usePlayerStore } from '@mmusic/core/state/player-store';
import { Icon } from '@mmusic/ui-kit/web';

import { Artwork } from '@/components/Artwork';
import { useAppStrings } from '@/i18n/locale';
import { EmptyState } from '@/ui';

import { Screen, SubHeader, Transport, useDocumentTitle } from './shared';

/** "—" when the length is unknown — never a made-up time (as in the app). */
const formatDuration = (sec: number | undefined) => (sec === undefined ? '—' : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`);

/**
 * S-17 Playback Queue (app: app/player/queue.tsx): now playing, "Playing next" in play order (shuffle included),
 * tap to play, remove from the queue, and Infinity Autoplay — all through the shared player store, with the
 * playback controls always below.
 */
export function QueuePage() {
  const { t, locale } = useAppStrings();
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const order = usePlayerStore((s) => s.order);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const autoplay = usePlayerStore((s) => s.autoplay);
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const { playFromQueueIndex, removeFromQueue, toggleAutoplay, toggleLike } = usePlayerStore.getState();
  useDocumentTitle(t('queueTab'));

  // Derived locally from the stable id array (the store's queueTracks() allocates a new array per call).
  const queueTracks = useMemo(() => queue.map((id) => getTrackById(id)), [queue]);
  const current = queueTracks[currentIndex];
  const currentLiked = current ? likedTrackIds.has(current.id) : false;
  const upcomingIndices = useMemo(() => order.slice(order.indexOf(currentIndex) + 1), [order, currentIndex]);
  const upcoming = upcomingIndices.map((index) => ({ index, track: queueTracks[index] })).filter((u): u is { index: number; track: Track } => Boolean(u.track));

  return (
    <Screen cover={current?.coverUri} className="pl-sub">
      <SubHeader active="queue" />
      <main className="pl-sub-body">
        {current && (
          <section className="q-section" aria-labelledby="q-now">
            <h2 id="q-now" className="q-eyebrow">
              <Icon name="graphic-eq" size={16} />
              {t('nowPlayingEyebrowLabel')}
            </h2>
            <div className="q-now">
              <span className="q-now-art">
                <Artwork source={current.coverUri} />
                {isPlaying && (
                  <span className="q-eq" aria-hidden="true">
                    <Icon name="graphic-eq" size={20} />
                  </span>
                )}
              </span>
              <span className="q-now-text">
                <span className="q-now-title ellipsis">{current.title}</span>
                <span className="t-body-md pl-medium ellipsis">{current.artistName}</span>
                <span className="t-mono-num pl-low">{formatDuration(current.durationSec)}</span>
              </span>
              <button type="button" className={currentLiked ? 'pl-ghost on' : 'pl-ghost'} aria-label={currentLiked ? t('unlikeLabel') : t('likeLabel')} aria-pressed={currentLiked} onClick={() => toggleLike(current.id)}>
                <Icon name={currentLiked ? 'favorite' : 'favorite-border'} size={26} />
              </button>
            </div>
          </section>
        )}

        <section className="q-section" aria-labelledby="q-next">
          <h2 id="q-next" className="q-heading">
            {t('playingNextLabel')}
          </h2>
          {upcoming.length === 0 ? (
            <EmptyState icon="queue-music" title={t('queueEmpty')} body={t('queueEmptyHint')} />
          ) : (
            <ol className="q-list">
              {upcoming.map(({ index, track }) => (
                <li key={`${track.id}-${index}`} className="q-row">
                  <button type="button" className="q-row-main" aria-label={`${track.title} — ${track.artistName}`} onClick={() => playFromQueueIndex(index)}>
                    <Artwork source={track.coverUri} className="q-row-art" />
                    <span className="q-row-text">
                      <span className="t-label-lg ellipsis">{track.title}</span>
                      <span className="t-body-sm pl-medium ellipsis">{track.artistName}</span>
                    </span>
                    <span className="t-mono-num pl-medium">{formatDuration(track.durationSec)}</span>
                  </button>
                  <button type="button" className="pl-ghost q-remove" aria-label={removeItemAccessibilityLabel(locale, track.title)} onClick={() => removeFromQueue(track.id)}>
                    <Icon name="remove-circle-outline" size={22} />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="q-autoplay">
          <span className="q-autoplay-icon">
            <Icon name="all-inclusive" size={24} />
          </span>
          <span className="q-autoplay-text">
            <span className="t-label-lg">{t('infinityAutoplay')}</span>
            <span className="t-body-sm pl-medium">{t('keepPlayingSimilarMusicHint')}</span>
          </span>
          <button type="button" role="switch" aria-checked={autoplay} aria-label={t('infinityAutoplay')} className={autoplay ? 'q-switch on' : 'q-switch'} onClick={toggleAutoplay}>
            <span className="q-switch-knob" />
          </button>
        </div>
      </main>
      <footer className="pl-sub-foot">
        <Transport />
      </footer>
    </Screen>
  );
}
