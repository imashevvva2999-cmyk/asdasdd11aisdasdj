import type { Playlist } from './types';

export const playlists: Playlist[] = [
  { id: 'late-night-flow', title: 'Late Night Flow', curator: 'Brian Eno & Friends', editorial: true, trackCount: 28, durationLabel: '1 hr 45 min' },
  { id: 'late-night-driving', title: 'Late Night Driving', trackCount: 48, durationLabel: '3 hr 12 min' },
  { id: 'lofi-beats-to-code', title: 'Lo-Fi Beats to Code / Relax', curator: 'Mmusic Editorial', editorial: true, trackCount: 120, durationLabel: '7 hr 40 min' },
  { id: 'electronic-essentials', title: 'Electronic Essentials', trackCount: 65, durationLabel: '4 hr 02 min' },
  { id: 'this-is-solaris-echo', title: 'This is Solaris Echo', curator: 'Mmusic Editorial', editorial: true, trackCount: 45, durationLabel: '2 hr 48 min' },
];

export function getPlaylistById(id: string): Playlist | undefined {
  return playlists.find((playlist) => playlist.id === id);
}
