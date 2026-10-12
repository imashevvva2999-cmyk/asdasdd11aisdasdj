import { create } from 'zustand';

import { getPlayableGenreIds } from '@/lib/genre-tracks';
import type { TrackId } from '@/mocks';

type DiscoveryState = {
  genreIds: string[];
  genreIndex: number;
  lastTrackByGenre: Record<string, TrackId>;
  setGenreIndex: (i: number) => void;
  setGenreById: (genreId: string) => void;
  recordLastTrack: (genreId: string, trackId: TrackId) => void;
};

// Deliberately NOT wrapped in zustand/persist — this is in-memory, scoped to
// the current discovery session, per the plan's amendment constraint.
export const useDiscoveryStore = create<DiscoveryState>((set, get) => ({
  genreIds: getPlayableGenreIds(),
  genreIndex: 0,
  lastTrackByGenre: {},
  setGenreIndex: (i) => set({ genreIndex: i }),
  setGenreById: (genreId) => {
    const idx = get().genreIds.indexOf(genreId);
    set({ genreIndex: idx >= 0 ? idx : 0 });
  },
  recordLastTrack: (genreId, trackId) => set((s) => ({ lastTrackByGenre: { ...s.lastTrackByGenre, [genreId]: trackId } })),
}));
