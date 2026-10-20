#!/usr/bin/env node
/**
 * Tests for the artwork palettes behind the adaptive player (Шаг 1 —
 * docs/superpowers/specs/2026-10-08-player-gestures-plan.md §5): every
 * catalog track resolves to a generated palette through the same artwork
 * priority as `mocks/tracks.ts`, the generated file is not stale against
 * `constants/stitch-artwork.ts`, and white text stays readable on every
 * background. Real modules via `tsx`, plain asserts.
 *
 * Usage: npx tsx scripts/verify-palettes.mjs
 */
import './dev-mode.mjs'; // checks development-only (Ошондо) content
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { artworkPathsByMap } from '../src/constants/artwork-palettes.ts';
import { PENDING_ARTWORK_TRACK_IDS } from '../src/constants/stitch-artwork.ts';
import { DEFAULT_PALETTE, contrastRatio, paletteForTrack } from '../src/lib/palette.ts';
import { tracks } from '../src/mocks/index.ts';

let failures = 0;
function check(label, condition) {
  if (condition) {
    console.log(`✓ OK       ${label}`);
  } else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const HEX = /^#[0-9a-f]{6}$/;

// The generated path maps must list exactly the keys of the artwork maps they mirror.
const artworkSource = readFileSync(join(root, 'src/constants/stitch-artwork.ts'), 'utf8');
for (const [mapName, paths] of Object.entries(artworkPathsByMap)) {
  const block = artworkSource.split(`export const ${mapName}`)[1]?.split('};')[0] ?? '';
  // Also matches dev-only entries spread in as `...(cond ? { key: 'asset:…' } : {})`.
  const sourceKeys = [...block.matchAll(/(?:^\s*|\{\s*)'?([a-z0-9-]+)'?:\s*'asset:/gm)].map((m) => m[1]).sort();
  check(`${mapName}: generated paths match stitch-artwork.ts keys`, JSON.stringify(Object.keys(paths).sort()) === JSON.stringify(sourceKeys));
}

for (const track of tracks) {
  if (PENDING_ARTWORK_TRACK_IDS.includes(track.id)) {
    check(`"${track.title}" (${track.id}) is pending artwork and uses the default palette`, paletteForTrack(track) === DEFAULT_PALETTE);
    continue;
  }
  const palette = paletteForTrack(track);
  check(`"${track.title}" (${track.id}) has its own artwork palette`, palette !== DEFAULT_PALETTE);
  check(`"${track.id}" palette colours are #rrggbb`, ['background', 'deep', 'mini', 'accent'].every((k) => HEX.test(palette[k])));
  check(`"${track.id}" white on background ≥ 5:1`, contrastRatio('#ffffff', palette.background) >= 5);
  check(`"${track.id}" white on mini-player ≥ 7:1`, contrastRatio('#ffffff', palette.mini) >= 7);
}

check('unknown track falls back to the default palette', paletteForTrack({ id: 'no-such-track' }) === DEFAULT_PALETTE);
check('missing track falls back to the default palette', paletteForTrack(undefined) === DEFAULT_PALETTE);
check('default palette keeps white text readable', contrastRatio('#ffffff', DEFAULT_PALETTE.background) >= 5 && contrastRatio('#ffffff', DEFAULT_PALETTE.mini) >= 7);
check('contrastRatio is correct for black/white (21:1)', Math.round(contrastRatio('#000000', '#ffffff')) === 21);

if (failures > 0) {
  console.error(`\n${failures} palette check(s) failed.`);
  process.exit(1);
}
console.log('\nAll palette checks passed.');
