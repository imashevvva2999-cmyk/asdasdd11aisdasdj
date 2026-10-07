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
  },
  { id: 'late-night-driving', title: 'Late Night Driving', trackCount: 48, durationLabel: '3 hr 12 min' },
  { id: 'lofi-beats-to-code', title: 'Lo-Fi Beats to Code / Relax', curator: 'Mmusic Editorial', editorial: true, trackCount: 120, durationLabel: '7 hr 40 min' },
  { id: 'electronic-essentials', title: 'Electronic Essentials', trackCount: 65, durationLabel: '4 hr 02 min' },
  { id: 'this-is-solaris-echo', title: 'This is Solaris Echo', curator: 'Mmusic Editorial', editorial: true, trackCount: 45, durationLabel: '2 hr 48 min' },
];

export function getPlaylistById(id: string): Playlist | undefined {
  return playlists.find((playlist) => playlist.id === id);
}
