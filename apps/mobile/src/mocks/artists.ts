import type { Artist } from './types';

export const artists: Artist[] = [
  { id: 'solaris-echo', name: 'Solaris Echo', verified: true, monthlyListeners: 3_200_000, genres: ['Electronic', 'Ambient'] },
  { id: 'kaelen', name: 'Kaelen', monthlyListeners: 1_800_000, genres: ['Electronic'] },
  { id: 'arlo', name: 'Arlo', monthlyListeners: 540_000, genres: ['Ambient'] },
  { id: 'maya-lin', name: 'Maya Lin', monthlyListeners: 2_100_000, genres: ['Synthwave'] },
  { id: 'tate-vane', name: 'Tate Vane', monthlyListeners: 410_000, genres: ['Electronic'] },
  { id: 'clover-and-the-pulse', name: 'Clover & The Pulse', verified: true, monthlyListeners: 890_000, genres: ['Indie'] },
  { id: 'sable-duo', name: 'Sable Duo', monthlyListeners: 320_000, genres: ['Electronic'] },
  { id: 'yuki-tanaka', name: 'Yuki Tanaka', monthlyListeners: 610_000, genres: ['Dream Pop'] },
  { id: 'elena-rostova', name: 'Elena Rostova', monthlyListeners: 275_000, genres: ['Ambient'] },
  { id: 'nils-frahm', name: 'Nils Frahm', monthlyListeners: 4_500_000, genres: ['Neo-Classical'] },
];

export function getArtistById(id: string): Artist | undefined {
  return artists.find((artist) => artist.id === id);
}
