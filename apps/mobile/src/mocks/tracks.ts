import { generatedArtworkByTrackId, resolveArtwork, stitchArtworkByTrackId } from '@/constants/stitch-artwork';

import { albums } from './albums';
import type { Track } from './types';

export const tracks: Track[] = [
  { id: 'midnight-mirage', title: 'Midnight Mirage', artistId: 'solaris-echo', artistName: 'Solaris Echo', albumId: 'horizon-deluxe', durationSec: 240, lossless: true },
  { id: 'vapor-trails', title: 'Vapor Trails', artistId: 'overcast-skies', artistName: 'Overcast Skies', durationSec: 208, explicit: true },
  { id: 'abyssal-bloom', title: 'Abyssal Bloom', artistId: 'elena-rostova', artistName: 'Elena Rostova', albumId: 'still-water', durationSec: 152 },
  { id: 'tape-saturation-4', title: 'Tape Saturation', artistId: 'analog-dreamers', artistName: 'Analog Dreamers', durationSec: 236 },
  { id: 'horizon', title: 'Horizon', artistId: 'solaris-echo', artistName: 'Solaris Echo', albumId: 'horizon-deluxe', durationSec: 184 },
  { id: 'abyssal-bloom-feat', title: 'Abyssal Bloom', artistId: 'elena-rostova', artistName: 'Elena Rostova feat. Solaris Echo', durationSec: 198 },
  // Horizon (Deluxe) album — remaining tracklist (docs/screens.md §3.4 S-09).
  { id: 'obsidian-frequencies', title: 'Obsidian Frequencies', artistId: 'solaris-echo', artistName: 'Solaris Echo', albumId: 'horizon-deluxe', durationSec: 230, lossless: true },
  { id: 'ember-tide', title: 'Ember Tide', artistId: 'solaris-echo', artistName: 'Solaris Echo', albumId: 'horizon-deluxe', durationSec: 162 },
  { id: 'resonant-field-reprise', title: 'Resonant Field (Reprise)', artistId: 'solaris-echo', artistName: 'Solaris Echo', albumId: 'horizon-deluxe', durationSec: 177 },
  // Late Night Flow (editorial playlist) — mock tracklist (docs/screens.md §3.6 S-10/S-11).
  { id: 'nebula-dreams-t1', title: 'Nebula Dreams', artistId: 'kaelen', artistName: 'Kaelen', albumId: 'nebula-dreams', durationSec: 240 },
  { id: 'lost-frequencies-t1', title: 'Lost Frequencies', artistId: 'arlo', artistName: 'Arlo', albumId: 'lost-frequencies', durationSec: 264 },
  { id: 'velvet-skyline-t1', title: 'Velvet Skyline', artistId: 'maya-lin', artistName: 'Maya Lin', albumId: 'velvet-skyline', durationSec: 240, explicit: true },
  { id: 'chronos-echoes-t1', title: 'Chronos Echoes', artistId: 'tate-vane', artistName: 'Tate Vane', albumId: 'chronos-echoes', durationSec: 142 },
  // Kyrgyz catalog — real songs, metadata only, no audio (Task 1 of
  // docs/superpowers/plans/2026-10-12-kyrgyz-track-catalog.md). Deliberately
  // absent from DEMO_SOURCES — the player's existing hasDemoAudio()-false
  // path renders these as "preview unavailable" rather than faking playback.
  { id: 'kyrgyzstanym', title: 'Кыргызстан', artistId: 'amirchik', artistName: 'Амирчик', durationSec: 135 },
  { id: 'muras', title: 'Мурас', artistId: 'mirbek-atabekov', artistName: 'Мирбек Атабеков', durationSec: 180 },
  { id: 'ene-til', title: 'Эне Тил', artistId: 'bayastan', artistName: 'Баястан', durationSec: 180 },
  { id: 'alai', title: 'Алай', artistId: 'begish', artistName: 'Бегиш', durationSec: 180 },
  { id: 'kachan-kaitat', title: 'Качан Кайтат', artistId: 'bayastan', artistName: 'Баястан, Бегиш, G-VOO', durationSec: 180 },
  { id: 'jazym-kelchi', title: 'Жазым келчи', artistId: 'gulnur-satylganova', artistName: 'Гульнур Сатылганова', durationSec: 180 },
  { id: 'kyrgyz-biyi', title: 'Кыргыз бийи', artistId: 'sultan-sadyraliev', artistName: 'Султан Садыралиев', durationSec: 180 },
  { id: 'ne-segodnya', title: 'Не сегодня (Семьдесят пятый)', artistId: 'ulukmanapo', artistName: 'Улукманапо', durationSec: 180 },
  { id: 'kirgiz-jeri', title: 'Кыргыз жери', artistId: 'salamat-sadikova', artistName: 'Саламат Садыкова', durationSec: 180 },
  { id: 'erke-kyz', title: 'Эрке Кыз', artistId: 'tengir-too', artistName: 'Тенгир-Тоо', durationSec: 180 },
  { id: 'chopo-choor-fantasy', title: 'Fantasy on the Chopo Choor', artistId: 'nurlanbek-nyshanov', artistName: 'Нурланбек Нышанов', durationSec: 180 },
  { id: 'kyrgyzstanym-remix', title: 'Кыргызстаным (Remix)', artistId: 'omar-zhanyshov', artistName: 'Омар Жанышов', durationSec: 180 },
  { id: 'jashtyk-kez', title: 'Жаштык Кез', artistId: 'kairat-kyrgyz', artistName: 'Кайрат Кыргыз', durationSec: 180 },
  { id: 'kambarkan', title: 'Камбаркан', artistId: 'nurak-abdrakhmanov', artistName: 'Нурак Абдрахманов', durationSec: 180 },
  { id: 'esimde', title: 'Эсимде', artistId: 'toktobek-asanaliev', artistName: 'Toktobek Asanaliev', durationSec: 180 },
  { id: 'kyrgyz-bala', title: 'Кыргыз бала', artistId: 'kiggaz', artistName: 'KIGGAZ', durationSec: 180 },
  { id: 'taimuras', title: 'Таймурас', artistId: 'g-voo', artistName: 'G-VOO', durationSec: 180 },
  { id: 'ananayyn', title: 'Ананайын', artistId: 'tamga', artistName: 'Тамга', durationSec: 180 },
  { id: 'eto-lyubov', title: 'Это любовь', artistId: 'aibek-zamirov', artistName: 'Айбек Замиров', durationSec: 180 },
  { id: 'issyk-kulskiy-vaib', title: 'Иссык-Кульский Вайб', artistId: 'freeman996', artistName: 'FreeMan996', durationSec: 180 },
];

// Fill in recovered Stitch artwork (Фаза 4 restoration pass) — a plain id
// lookup, not a require() of its own; see src/constants/stitch-artwork.ts.
// Falls back to procedurally generated local artwork (Search Results visual
// cleanup pass) only for the handful of tracks with no recovered Stitch
// asset, so every screen reading `track.coverUri` picks it up consistently.
// A track with neither reuses its own album's cover when it has one and the
// album has real artwork (frontend-wide artwork audit pass) — e.g. the
// 'Nebula Dreams' track reuses the 'Nebula Dreams' album's cover, instead of
// generating a redundant second image for the same concept.
for (const track of tracks) {
  const albumCoverUri = track.albumId ? albums.find((album) => album.id === track.albumId)?.coverUri : undefined;
  const coverUri = resolveArtwork(stitchArtworkByTrackId[track.id], generatedArtworkByTrackId[track.id], albumCoverUri);
  if (coverUri) track.coverUri = coverUri;
}

export function getTrackById(id: string): Track | undefined {
  return tracks.find((track) => track.id === id);
}

/**
 * Insert into the same shared `tracks` array `getTrackById` reads from
 * (Фаза 4, Batch 4 — docs/screens.md S-28). Called by the Artist frontend
 * store only once a locally uploaded track reaches the `'published'` state —
 * this is what makes it resolvable (and playable via the shared player
 * store) by the exact same lookup every other screen already uses, instead
 * of a separate "artist track" model. Session-local only; nothing here is
 * persisted to a backend, transcoded, or uploaded anywhere.
 */
export function addMockTrack(track: Track): void {
  if (tracks.some((existing) => existing.id === track.id)) return;
  tracks.push(track);
}
