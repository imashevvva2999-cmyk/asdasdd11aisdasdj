import { generatedArtworkByTrackId, resolveArtwork, stitchArtworkByTrackId } from '../constants/stitch-artwork';

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
  // durationSec is set only where the real length is confirmed; the rest are
  // unknown until the licensed file is imported (assets/audio/kyrgyz/PENDING.md).
  { id: 'kyrgyzstanym', title: 'Кыргызстан', artistId: 'amirchik', artistName: 'Амирчик', durationSec: 135 },
  { id: 'muras', title: 'Мурас', artistId: 'mirbek-atabekov', artistName: 'Мирбек Атабеков' },
  { id: 'ene-til', title: 'Эне Тил', artistId: 'bayastan', artistName: 'Баястан' },
  { id: 'alai', title: 'Алай', artistId: 'begish', artistName: 'Бегиш' },
  { id: 'kachan-kaitat', title: 'Качан Кайтат', artistId: 'bayastan', artistName: 'Баястан, Бегиш, G-VOO' },
  { id: 'jazym-kelchi', title: 'Жазым келчи', artistId: 'gulnur-satylganova', artistName: 'Гульнур Сатылганова' },
  { id: 'kyrgyz-biyi', title: 'Кыргыз бийи', artistId: 'sultan-sadyraliev', artistName: 'Султан Садыралиев' },
  { id: 'ne-segodnya', title: 'Не сегодня (Семьдесят пятый)', artistId: 'ulukmanapo', artistName: 'Улукманапо' },
  { id: 'kirgiz-jeri', title: 'Кыргыз жери', artistId: 'salamat-sadikova', artistName: 'Саламат Садыкова' },
  { id: 'erke-kyz', title: 'Эрке Кыз', artistId: 'tengir-too', artistName: 'Тенгир-Тоо' },
  { id: 'chopo-choor-fantasy', title: 'Fantasy on the Chopo Choor', artistId: 'nurlanbek-nyshanov', artistName: 'Нурланбек Нышанов' },
  { id: 'kyrgyzstanym-remix', title: 'Кыргызстаным (Remix)', artistId: 'omar-zhanyshov', artistName: 'Омар Жанышов' },
  { id: 'jashtyk-kez', title: 'Жаштык Кез', artistId: 'kairat-kyrgyz', artistName: 'Кайрат Кыргыз' },
  { id: 'kambarkan', title: 'Камбаркан', artistId: 'nurak-abdrakhmanov', artistName: 'Нурак Абдрахманов' },
  { id: 'esimde', title: 'Эсимде', artistId: 'toktobek-asanaliev', artistName: 'Toktobek Asanaliev' },
  { id: 'kyrgyz-bala', title: 'Кыргыз бала', artistId: 'kiggaz', artistName: 'KIGGAZ' },
  { id: 'taimuras', title: 'Таймурас', artistId: 'g-voo', artistName: 'G-VOO' },
  { id: 'ananayyn', title: 'Ананайын', artistId: 'tamga', artistName: 'Тамга' },
  { id: 'eto-lyubov', title: 'Это любовь', artistId: 'aibek-zamirov', artistName: 'Айбек Замиров' },
  { id: 'issyk-kulskiy-vaib', title: 'Иссык-Кульский Вайб', artistId: 'freeman996', artistName: 'FreeMan996' },
  // First real Kyrgyz audio import (not one of the 20 above — a new track,
  // added on top of them, never replacing any). Rights are NOT confirmed —
  // local/dev testing only, see assets/audio/kyrgyz/CREDITS.md. durationSec
  // is the real file's measured length (ffprobe).
  // __DEV__ only (rights not confirmed): absent from production catalogs, pages and bundles.
  ...(typeof __DEV__ !== 'undefined' && __DEV__ ? [{ id: 'oshondo', title: 'Ошондо', artistId: 'mirbek-atabekov', artistName: 'Мирбек Атабеков', durationSec: 201 }] : []),
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
