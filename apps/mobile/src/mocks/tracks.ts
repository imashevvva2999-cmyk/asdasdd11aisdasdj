import type { Track } from './types';

export const tracks: Track[] = [
  { id: 'midnight-mirage', title: 'Midnight Mirage', artistId: 'solaris-echo', artistName: 'Solaris Echo', albumId: 'horizon-deluxe', durationSec: 258, lossless: true },
  { id: 'vapor-trails', title: 'Vapor Trails', artistId: 'overcast-skies', artistName: 'Overcast Skies', durationSec: 214, explicit: true },
  { id: 'abyssal-bloom', title: 'Abyssal Bloom', artistId: 'elena-rostova', artistName: 'Elena Rostova', durationSec: 236 },
  { id: 'tape-saturation-4', title: 'Tape Saturation #4', artistId: 'analog-dreamers', artistName: 'Analog Dreamers', durationSec: 198 },
  { id: 'horizon', title: 'Horizon', artistId: 'solaris-echo', artistName: 'Solaris Echo', albumId: 'horizon-deluxe', durationSec: 308 },
  { id: 'abyssal-bloom-feat', title: 'Abyssal Bloom', artistId: 'elena-rostova', artistName: 'Elena Rostova feat. Solaris Echo', durationSec: 236 },
];

export function getTrackById(id: string): Track | undefined {
  return tracks.find((track) => track.id === id);
}
