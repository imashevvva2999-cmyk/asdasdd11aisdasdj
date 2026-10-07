import { stitchArtworkByPlaylistId } from '@/constants/stitch-artwork';

import type { Playlist } from './types';

export const playlists: Playlist[] = [
  {
    id: 'late-night-flow',
    title: 'Late Night Flow',
    description: 'Slow-burning ambient and downtempo electronic for the hours after midnight.',
    curator: 'Brian Eno & Friends',
    editorial: true,
    trackCount: 4,
    durationLabel: '16 min',
    trackIds: ['nebula-dreams-t1', 'lost-frequencies-t1', 'velvet-skyline-t1', 'chronos-echoes-t1'],
    updatedLabel: 'Updated 2h ago',
    isPublic: true,
  },
  { id: 'late-night-driving', title: 'Late Night Driving', trackCount: 48, durationLabel: '3 hr 12 min', updatedLabel: 'Updated 1d ago', isPublic: true },
  { id: 'lofi-beats-to-code', title: 'Lo-Fi Beats to Code / Relax', curator: 'Mmusic Editorial', editorial: true, trackCount: 120, durationLabel: '7 hr 40 min' },
  { id: 'electronic-essentials', title: 'Electronic Essentials', trackCount: 65, durationLabel: '4 hr 02 min', updatedLabel: 'Updated 5d ago', isPublic: true },
  { id: 'this-is-solaris-echo', title: 'This is Solaris Echo', curator: 'Mmusic Editorial', editorial: true, trackCount: 45, durationLabel: '2 hr 48 min' },
];

// Fill in recovered Stitch artwork (Фаза 4 restoration pass) — a plain id
// lookup, not a require() of its own; see src/constants/stitch-artwork.ts.
for (const playlist of playlists) {
  const coverUri = stitchArtworkByPlaylistId[playlist.id];
  if (coverUri) playlist.coverUri = coverUri;
}

export function getPlaylistById(id: string): Playlist | undefined {
  return playlists.find((playlist) => playlist.id === id);
}
