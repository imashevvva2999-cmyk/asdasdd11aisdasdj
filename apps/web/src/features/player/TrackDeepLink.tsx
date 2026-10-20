// First: configures @mmusic/core storage before the persisted player store is used.
import '@/platform/storage';

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';

import { getTrackById } from '@mmusic/core/mocks';
import { usePlayerStore } from '@mmusic/core/state/player-store';

import { startAudio } from '@/audio/web-audio';

/**
 * /track/:id (app: app/track/[id].tsx) — the share / deep-link target: plays that track (when it exists in the
 * catalog) and replaces the URL with Now Playing, so Back does not land on the redirect again.
 */
export function TrackDeepLink() {
  const { id } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    startAudio();
    if (id && getTrackById(id)) {
      const player = usePlayerStore.getState();
      if (player.currentTrackId() !== id || player.playback === 'idle') player.play(id);
    }
    void navigate('/player/now-playing', { replace: true });
  }, [id, navigate]);
  return null;
}
