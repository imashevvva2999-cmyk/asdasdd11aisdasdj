// First: configures @mmusic/core storage before the persisted player store is used.
import '@/platform/storage';

import { useEffect, useState, type CSSProperties } from 'react';

import { tracks } from '@mmusic/core/mocks';
import { playPosition, usePlayerStore } from '@mmusic/core/state/player-store';

import { artworkUrl } from '@/assets/artwork-assets';
import { audioUrlForTrack } from '@/assets/audio-assets';
import { startAudio } from '@/audio/web-audio';
import { useAppStrings } from '@/i18n/locale';

/**
 * DEVELOPMENT ONLY (W2.4c-3): /dev/player, registered in src/router.tsx behind `import.meta.env.DEV`, so it is
 * absent from production builds and from the site navigation. A functional test bench for the website audio
 * start-up — playback, queue, repeat/shuffle, liked tracks, Media Session — not the W3 player design.
 * Also switches the saved website language (W3.0), until Profile → Language exists on the website.
 */
const playable = tracks.filter((t) => audioUrlForTrack(t.id) !== undefined);
const playableIds = playable.map((t) => t.id);

const row: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', margin: '8px 0' };
const button: CSSProperties = { padding: '6px 12px', borderRadius: 8, border: '1px solid var(--outline, #444)', background: 'var(--surface-l2, #222)', color: 'inherit', cursor: 'pointer' };

function useMediaSessionSnapshot() {
  const [, rerender] = useState(0);
  useEffect(() => usePlayerStore.subscribe(() => rerender((n) => n + 1)), []);
  if (!('mediaSession' in navigator)) return null;
  const m = navigator.mediaSession.metadata;
  return { title: m?.title, artist: m?.artist, album: m?.album, artwork: m?.artwork.map((a) => a.src) ?? [], state: navigator.mediaSession.playbackState };
}

export function PlayerTestPage() {
  useEffect(() => {
    document.title = 'Player test (dev) – Mmusic';
    startAudio();
  }, []);

  const s = usePlayerStore();
  const { locale, setLocale } = useAppStrings();
  const track = s.currentTrack();
  const session = useMediaSessionSnapshot();
  const duration = s.durationSec ?? track?.durationSec ?? 0;

  return (
    <main style={{ padding: 24, maxWidth: 880, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }} data-testid="player-test">
      <h1 style={{ fontSize: 22 }}>Player test — development only</h1>

      <section aria-label="Now playing">
        <p data-testid="now">
          {track ? `${track.title} — ${track.artistName}` : 'Nothing selected'} · <span data-testid="playback">{s.playback}</span> ·{' '}
          <span data-testid="progress">{Math.floor(s.progressSec)}</span>/<span data-testid="duration">{Math.floor(duration)}</span> s · repeat{' '}
          <span data-testid="repeat">{s.repeat}</span> · shuffle <span data-testid="shuffle">{String(s.shuffle)}</span> · position{' '}
          <span data-testid="position">{playPosition(s)}</span>
        </p>
        {track && artworkUrl(track.coverUri) && <img src={artworkUrl(track.coverUri)} alt="" width={96} height={96} style={{ borderRadius: 8, objectFit: 'cover' }} />}
        <div style={row}>
          <button type="button" style={button} onClick={() => s.previous()}>Previous</button>
          <button type="button" style={button} onClick={() => s.togglePlayPause()} data-testid="toggle">
            {s.isPlaying ? 'Pause' : 'Play'}
          </button>
          <button type="button" style={button} onClick={() => s.next()}>Next</button>
          <button type="button" style={button} onClick={() => s.cycleRepeat()}>Repeat</button>
          <button type="button" style={button} onClick={() => s.toggleShuffle()}>Shuffle</button>
          <button type="button" style={button} onClick={() => track && s.toggleLike(track.id)} data-testid="like">
            {track && s.isLiked(track.id) ? 'Unlike' : 'Like'}
          </button>
          <button type="button" style={button} onClick={() => s.seekTo(s.progressSec + 30)}>+30 s</button>
          <button type="button" style={button} onClick={() => setLocale(locale === 'ru' ? 'en' : 'ru')} data-testid="language">
            Language: {locale.toUpperCase()}
          </button>
        </div>
        <label style={row}>
          Seek
          <input type="range" min={0} max={Math.max(1, Math.floor(duration))} value={Math.floor(s.progressSec)} onChange={(e) => s.seekTo(Number(e.target.value))} data-testid="seek" style={{ flex: 1 }} />
        </label>
      </section>

      <section aria-label="Media Session">
        <h2 style={{ fontSize: 16 }}>Media Session</h2>
        <pre data-testid="session" style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{JSON.stringify(session, null, 1)}</pre>
      </section>

      <section aria-label="Liked tracks">
        <h2 style={{ fontSize: 16 }}>Liked ({s.likedTrackIds.size})</h2>
        <p data-testid="liked">{[...s.likedTrackIds].join(', ')}</p>
      </section>

      <section aria-label="Tracks">
        <h2 style={{ fontSize: 16 }}>Playable tracks ({playable.length}) — up next: {s.upcomingTrackIds().length}</h2>
        <ol style={{ paddingLeft: 20 }}>
          {playable.map((t) => (
            <li key={t.id} style={row}>
              <button type="button" style={button} onClick={() => s.play(t.id, playableIds)} data-testid={`play-${t.id}`}>
                Play
              </button>
              <span style={{ fontWeight: track?.id === t.id ? 700 : 400 }}>
                {t.title} — {t.artistName}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
