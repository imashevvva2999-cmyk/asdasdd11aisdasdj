# Kyrgyz Track Catalog (Metadata + Import Workflow) Implementation Plan

> **STATUS: APPROVED FOR IMPLEMENTATION (2026-10-12), execute SECOND** — after the Artist Dashboard demo-seed plan is implemented and reviewed. Subagent-driven development with independent per-task review. Local only — no push/merge/deploy without separate approval. Task 3 (extending `GENRE_TAG_MAP`) remains gated: do not execute it — the user confirmed the locked mapping stays unchanged until separately approved.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 20 real Kyrgyz songs to the mock catalog as metadata-only `Track`/`Artist` entries (no audio files, no `DEMO_SOURCES` mapping) so they appear honestly as "preview unavailable," plus a documented workflow for dropping in licensed audio later.

**Architecture:** Reuses the existing `Track`/`Artist` mock-entity shapes (`apps/mobile/src/mocks/types.ts`) and the existing static-array pattern already used by `tracks.ts`/`artists.ts` — no schema changes. The existing `hasDemoAudio()` check (consumed by the player UI) already renders an honest unavailable state for any track absent from `DEMO_SOURCES`; this plan deliberately never adds these 20 tracks to that map.

**Tech Stack:** TypeScript, React Native/Expo (no new dependencies).

**Spec:** `docs/superpowers/specs/2026-10-12-mmusic-demo-prep-design.md`

## Global Constraints

- No audio file is downloaded, bundled, or referenced for these 20 tracks (spec: "no copyrighted audio is downloaded or bundled").
- `GENRE_TAG_MAP` in `apps/mobile/src/lib/genre-tracks.ts` is not modified by Task 3 unless the user has given separate, explicit sign-off beyond approving this plan's other tasks — see Task 3's own gate.
- The existing 13 tracks, their `DEMO_SOURCES`/`demoAudioCredits` entries, and `assets/audio/CREDITS.md`'s existing content are untouched.
- New artist/track ids must not collide with any id in the current `apps/mobile/src/mocks/artists.ts` / `tracks.ts`.
- **This project has no test framework (no Jest/Vitest).** Verification is a set of standalone `scripts/verify-*.mjs` files, each run via `tsx` (or `node` for pure-JS ones), using a local `check(label, condition)` helper and `process.exit(1)` on any failure — see any existing file under `apps/mobile/scripts/` (e.g. `verify-artist-store.mjs`, `verify-genre-tracks.mjs`) for the exact pattern. Every new verify script gets a `"verify:<name>"` entry in `apps/mobile/package.json`'s `scripts` block and is appended to the end of the existing `"test"` script's `&&`-chain. Scripts import project source via relative paths (`'../src/mocks/tracks.ts'`), not the `@/` alias — `tsx` does not resolve it the way Metro/the app bundler does.
- `apps/mobile/scripts/verify-demo-audio-coverage.mjs` already asserts **every** track in the static `tracks` array has `hasDemoAudio(track.id) === true`. Adding 20 tracks with no demo audio will fail that existing check unless Task 1 also adds an explicit, honest exemption (see Step 7-8) — this is not optional cleanup, it is required to keep `pnpm test` green.

## Review Focus

- A track with no matching artist id would crash any screen that looks up `getArtistById(track.artistId)` — every new `Track.artistId` must have a corresponding new `Artist.id` (Task 1, Step 3).
- A track/artist id containing Cyrillic or spaces would break route params (`/artist/[id]`, `/track/[id]`) that treat ids as URL-safe strings — all new ids are ASCII kebab-case slugs (Task 1).
- Reusing an existing artist id (e.g. accidentally picking `kaelen`) would silently merge a new Kyrgyz artist into an unrelated existing fictional artist's profile — Task 1 Step 4 checks for collisions before inserting.
- A track with a `coverUri` pointing at a non-existent local asset would throw at bundle time (Metro `require()` resolves at build, not runtime) — Task 1 omits `coverUri` entirely for these entries (falls back to the existing deterministic gradient placeholder, per `types.ts`'s documented fallback policy), rather than inventing a path.
- Running `getPlayableGenreIds()` or the Discover feed after Task 1 but before any `GENRE_TAG_MAP` change must still show zero regression for the 12 genres — Task 1's Step 10 verifies the 13 existing demo tracks' genre/discovery behavior is unchanged.
- Adding tracks absent from `demoAudioCredits` would silently fail the existing `verify-demo-audio-coverage.mjs` invariant ("every catalog track has demo audio") — Task 1 Steps 7-8 add a named, explicit `PENDING_AUDIO_TRACK_IDS` exemption (not a weakening of the check: pending tracks are still verified to have zero fake/invented credits).

---

## Verified track list (research deliverable)

Research method: for each entry, the artist's official Apple Music artist page was fetched and read directly, cross-checked where possible against MusicBrainz's curated official-link relationships and independent press (Kaktus.media, Eurasianet, Zakon.kz, Weproject.media). Entries with no at-least-Medium-confidence official source were dropped. **This list identifies real songs for future licensing outreach; it does not grant any license.** Exact `durationSec` is only confirmed for #1 — all others use a placeholder estimate pending the real file (update when real audio is imported, per Task 2).

| # | Slug (`artistId`) | Artist | Track slug (`id`) | Title | Genre tag | durationSec |
|---|---|---|---|---|---|---|
| 1 | `amirchik` | Амирчик (Amirchik) | `kyrgyzstanym` | Кыргызстан | Pop/patriotic | 135 (confirmed 2:15) |
| 2 | `mirbek-atabekov` | Мирбек Атабеков | `muras` | Мурас | Ballad/pop | 180 (est.) |
| 3 | `bayastan` | Баястан | `ene-til` | Эне Тил | Rap | 180 (est.) |
| 4 | `begish` | Бегиш | `alai` | Алай | Rap | 180 (est.) |
| 5 | `bayastan` (feat. Begish, G-VOO) | Баястан, Бегиш, G-VOO | `kachan-kaitat` | Качан Кайтат | Rap | 180 (est.) |
| 6 | `gulnur-satylganova` | Гульнур Сатылганова | `jazym-kelchi` | Жазым келчи | Pop/estrada | 180 (est.) |
| 7 | `sultan-sadyraliev` | Султан Садыралиев | `kyrgyz-biyi` | Кыргыз бийи | Pop/dance | 180 (est.) |
| 8 | `ulukmanapo` | Улукманапо | `ne-segodnya` | Не сегодня (Семьдесят пятый) | Rap | 180 (est.) |
| 9 | `salamat-sadikova` | Саламат Садыкова | `kirgiz-jeri` | Кыргыз жери | Folk/traditional | 180 (est.) |
| 10 | `tengir-too` | Тенгир-Тоо | `erke-kyz` | Эрке Кыз | Folk/traditional | 180 (est.) |
| 11 | `nurlanbek-nyshanov` | Нурланбек Нышанов | `chopo-choor-fantasy` | Fantasy on the Chopo Choor | Folk/traditional | 180 (est.) |
| 12 | `omar-zhanyshov` | Омар Жанышов | `kyrgyzstanym-remix` | Кыргызстаным (Remix) | Pop/patriotic | 180 (est.) |
| 13 | `kairat-kyrgyz` | Кайрат Кыргыз | `jashtyk-kez` | Жаштык Кез | Pop | 180 (est.) |
| 14 | `nurak-abdrakhmanov` | Нурак Абдрахманов | `kambarkan` | Камбаркан | Folk/komuz | 180 (est.) |
| 15 | `toktobek-asanaliev` | Toktobek Asanaliev | `esimde` | Эсимде | Folk vocal | 180 (est.) |
| 16 | `kiggaz` | KIGGAZ | `kyrgyz-bala` | Кыргыз бала | Rap | 180 (est.) |
| 17 | `g-voo` | G-VOO | `taimuras` | Таймурас | Rap | 180 (est.) |
| 18 | `tamga` | Тамга | `ananayyn` | Ананайын | Pop/rap | 180 (est.) |
| 19 | `aibek-zamirov` | Айбек Замиров | `eto-lyubov` | Это любовь | Pop/ballad | 180 (est.) |
| 20 | `freeman996` | FreeMan996 | `issyk-kulskiy-vaib` | Иссык-Кульский Вайб | Rap/pop | 180 (est.) |

## Task 1: Add 20 Kyrgyz `Artist` and `Track` entries (metadata only)

**Files:**
- Modify: `apps/mobile/src/mocks/artists.ts` (append to the `artists` array, before line 29's closing `];`)
- Modify: `apps/mobile/src/mocks/tracks.ts` (append to the `tracks` array, before line 22's closing `];`)
- Modify: `apps/mobile/src/audio/demo-sources.ts` (add `PENDING_AUDIO_TRACK_IDS` export)
- Modify: `apps/mobile/scripts/verify-demo-audio-coverage.mjs` (exempt pending ids)
- Modify: `apps/mobile/package.json` (register the new verify script)
- Test: `apps/mobile/scripts/verify-kyrgyz-catalog.mjs` (new — this project has no Jest/Vitest; see Global Constraints)

**Interfaces:**
- Consumes: `Artist`, `Track` types from `./types` (unchanged); `demoAudioCredits`/`hasDemoAudio` from `apps/mobile/src/audio/demo-audio.ts` (unchanged).
- Produces: 20 new `Artist.id` and `Track.id` values (listed above) that Task 2 reads by id; a new `PENDING_AUDIO_TRACK_IDS: TrackId[]` export from `demo-sources.ts` that Task 2's import workflow and `verify-demo-audio-coverage.mjs` both read.

- [ ] **Step 1: Write the failing verify script**

Create `apps/mobile/scripts/verify-kyrgyz-catalog.mjs` with this exact content (the `#!/usr/bin/env node` shebang must be the file's literal first line):

```javascript
#!/usr/bin/env node
/**
 * Kyrgyz catalog metadata entries (docs/superpowers/plans/
 * 2026-10-12-kyrgyz-track-catalog.md, Task 1). Usage:
 * npx tsx scripts/verify-kyrgyz-catalog.mjs
 */
import { artists } from '../src/mocks/artists.ts';
import { tracks } from '../src/mocks/tracks.ts';
import { hasDemoAudio } from '../src/audio/demo-audio.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const KYRGYZ_ARTIST_IDS = [
  'amirchik', 'mirbek-atabekov', 'bayastan', 'begish', 'gulnur-satylganova',
  'sultan-sadyraliev', 'ulukmanapo', 'salamat-sadikova', 'tengir-too',
  'nurlanbek-nyshanov', 'omar-zhanyshov', 'kairat-kyrgyz', 'nurak-abdrakhmanov',
  'toktobek-asanaliev', 'kiggaz', 'g-voo', 'tamga', 'aibek-zamirov', 'freeman996',
];
const KYRGYZ_TRACK_IDS = [
  'kyrgyzstanym', 'muras', 'ene-til', 'alai', 'kachan-kaitat', 'jazym-kelchi',
  'kyrgyz-biyi', 'ne-segodnya', 'kirgiz-jeri', 'erke-kyz', 'chopo-choor-fantasy',
  'kyrgyzstanym-remix', 'jashtyk-kez', 'kambarkan', 'esimde', 'kyrgyz-bala',
  'taimuras', 'ananayyn', 'eto-lyubov', 'issyk-kulskiy-vaib',
];

check('exactly 19 new Kyrgyz artists present', artists.filter((a) => KYRGYZ_ARTIST_IDS.includes(a.id)).length === 19);
check('exactly 20 new Kyrgyz tracks present', tracks.filter((t) => KYRGYZ_TRACK_IDS.includes(t.id)).length === 20);

const artistIds = new Set(artists.map((a) => a.id));
for (const trackId of KYRGYZ_TRACK_IDS) {
  const track = tracks.find((t) => t.id === trackId);
  check(`"${trackId}" exists in the tracks array`, !!track);
  if (track) check(`"${trackId}"'s artistId ("${track.artistId}") resolves to a real artist`, artistIds.has(track.artistId));
}

const allTrackIds = tracks.map((t) => t.id);
check('no duplicate track ids in the full catalog', new Set(allTrackIds).size === allTrackIds.length);
const allArtistIds = artists.map((a) => a.id);
check('no duplicate artist ids in the full catalog', new Set(allArtistIds).size === allArtistIds.length);

for (const trackId of KYRGYZ_TRACK_IDS) {
  check(`"${trackId}" has no demo audio (honest unavailable state, no audio supplied yet)`, hasDemoAudio(trackId) === false);
}

if (failures > 0) {
  console.error(`\n${failures} kyrgyz-catalog check(s) failed.`);
  process.exit(1);
}
console.log('\nAll kyrgyz-catalog checks passed.');
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/mobile && npx tsx scripts/verify-kyrgyz-catalog.mjs`
Expected: FAIL — 0 of the 20 expected tracks found, 0 of 19 artists found.

- [ ] **Step 3: Add the 19 `Artist` entries**

In `apps/mobile/src/mocks/artists.ts`, insert before the array's closing `];` (currently line 29):

```typescript
  // Kyrgyz catalog — real artists, metadata only (docs/superpowers/plans/2026-10-12-kyrgyz-track-catalog.md).
  // No audio exists for these yet; see Task 2 for the import workflow once licensed files are supplied.
  { id: 'amirchik', name: 'Амирчик', genres: ['Kyrgyz Pop'], location: 'Kyrgyzstan' },
  { id: 'mirbek-atabekov', name: 'Мирбек Атабеков', genres: ['Kyrgyz Pop'], location: 'Kyrgyzstan' },
  { id: 'bayastan', name: 'Баястан', genres: ['Kyrgyz Rap'], location: 'Kyrgyzstan' },
  { id: 'begish', name: 'Бегиш', genres: ['Kyrgyz Rap'], location: 'Kyrgyzstan' },
  { id: 'gulnur-satylganova', name: 'Гульнур Сатылганова', genres: ['Kyrgyz Pop'], location: 'Kyrgyzstan' },
  { id: 'sultan-sadyraliev', name: 'Султан Садыралиев', genres: ['Kyrgyz Pop'], location: 'Kyrgyzstan' },
  { id: 'ulukmanapo', name: 'Улукманапо', genres: ['Kyrgyz Rap'], location: 'Kyrgyzstan' },
  { id: 'salamat-sadikova', name: 'Саламат Садыкова', genres: ['Kyrgyz Folk'], location: 'Kyrgyzstan' },
  { id: 'tengir-too', name: 'Тенгир-Тоо', genres: ['Kyrgyz Folk'], location: 'Kyrgyzstan' },
  { id: 'nurlanbek-nyshanov', name: 'Нурланбек Нышанов', genres: ['Kyrgyz Folk'], location: 'Kyrgyzstan' },
  { id: 'omar-zhanyshov', name: 'Омар Жанышов', genres: ['Kyrgyz Pop'], location: 'Kyrgyzstan' },
  { id: 'kairat-kyrgyz', name: 'Кайрат Кыргыз', genres: ['Kyrgyz Pop'], location: 'Kyrgyzstan' },
  { id: 'nurak-abdrakhmanov', name: 'Нурак Абдрахманов', genres: ['Kyrgyz Folk'], location: 'Kyrgyzstan' },
  { id: 'toktobek-asanaliev', name: 'Toktobek Asanaliev', genres: ['Kyrgyz Folk'], location: 'Kyrgyzstan' },
  { id: 'kiggaz', name: 'KIGGAZ', genres: ['Kyrgyz Rap'], location: 'Kyrgyzstan' },
  { id: 'g-voo', name: 'G-VOO', genres: ['Kyrgyz Rap'], location: 'Kyrgyzstan' },
  { id: 'tamga', name: 'Тамга', genres: ['Kyrgyz Rap'], location: 'Kyrgyzstan' },
  { id: 'aibek-zamirov', name: 'Айбек Замиров', genres: ['Kyrgyz Pop'], location: 'Kyrgyzstan' },
  { id: 'freeman996', name: 'FreeMan996', genres: ['Kyrgyz Rap'], location: 'Kyrgyzstan' },
```

`bayastan` is one artist record reused for track #5's combined credit (artist id `bayastan`, `Track.artistName: 'Баястан, Бегиш, G-VOO'`) — same pattern as the existing catalog's `'Elena Rostova feat. Solaris Echo'` entry. That is why there are 19 artists for 20 tracks.

- [ ] **Step 4: Check for id collisions before inserting**

Run: `cd apps/mobile && grep -oE "id: '[a-z0-9-]+'" src/mocks/artists.ts | sort | uniq -d`
Expected: no output. If any of the 19 new ids collides with an existing one, rename it (append `-kg`) before proceeding.

- [ ] **Step 5: Add the 20 `Track` entries**

In `apps/mobile/src/mocks/tracks.ts`, insert before the array's closing `];` (currently line 22):

```typescript
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
```

No `coverUri` field is set — these fall back to the existing deterministic gradient placeholder per `types.ts`'s documented artwork policy, not an invented image.

- [ ] **Step 6: Run it again to verify it passes**

Run: `cd apps/mobile && npx tsx scripts/verify-kyrgyz-catalog.mjs`
Expected: PASS — all checks print `✓ OK`, script exits 0.

- [ ] **Step 7: Add the `PENDING_AUDIO_TRACK_IDS` export to `demo-sources.ts`**

In `apps/mobile/src/audio/demo-sources.ts`, add after the `DEMO_SOURCES` object's closing `};`:

```typescript
/**
 * Catalog tracks with no demo audio yet, by design (docs/superpowers/plans/
 * 2026-10-12-kyrgyz-track-catalog.md) — real licensed audio pending, see
 * assets/audio/kyrgyz/PENDING.md. Read by
 * scripts/verify-demo-audio-coverage.mjs to exempt these ids from its
 * "every catalog track has demo audio" check without weakening it for
 * every other track.
 */
export const PENDING_AUDIO_TRACK_IDS: TrackId[] = [
  'kyrgyzstanym', 'muras', 'ene-til', 'alai', 'kachan-kaitat', 'jazym-kelchi',
  'kyrgyz-biyi', 'ne-segodnya', 'kirgiz-jeri', 'erke-kyz', 'chopo-choor-fantasy',
  'kyrgyzstanym-remix', 'jashtyk-kez', 'kambarkan', 'esimde', 'kyrgyz-bala',
  'taimuras', 'ananayyn', 'eto-lyubov', 'issyk-kulskiy-vaib',
];
```

- [ ] **Step 8: Exempt pending tracks in `verify-demo-audio-coverage.mjs`**

In `apps/mobile/scripts/verify-demo-audio-coverage.mjs`, add the import alongside the existing ones (near line 11-12):

```javascript
import { PENDING_AUDIO_TRACK_IDS } from '../src/audio/demo-sources.ts';
```

Replace the coverage loop (lines 26-29):

```javascript
// Every catalog track must have a demo-audio credit (Demo Audio Experience).
for (const track of tracks) {
  check(`"${track.title}" (${track.id}) has demo audio`, hasDemoAudio(track.id));
}
```

with:

```javascript
// Every catalog track must have a demo-audio credit (Demo Audio Experience),
// except tracks explicitly pending real licensed audio (2026-10-12 Kyrgyz
// catalog plan) — those must instead have NO credit at all, never a fake one.
for (const track of tracks) {
  if (PENDING_AUDIO_TRACK_IDS.includes(track.id)) {
    check(`"${track.title}" (${track.id}) is pending audio and correctly has no demo-audio credit`, !hasDemoAudio(track.id));
  } else {
    check(`"${track.title}" (${track.id}) has demo audio`, hasDemoAudio(track.id));
  }
}
```

- [ ] **Step 9: Register the new verify script**

In `apps/mobile/package.json`, add a line after the existing `"verify:dashboard-routes"` entry:

```json
    "verify:kyrgyz-catalog": "tsx scripts/verify-kyrgyz-catalog.mjs",
```

Append ` && tsx scripts/verify-kyrgyz-catalog.mjs` to the end of the `"test"` script's `&&`-chain (after the existing trailing `tsx scripts/verify-genre-tracks.mjs`).

- [ ] **Step 10: Run the full existing test chain and typecheck to confirm no regression**

Run: `cd apps/mobile && pnpm run typecheck && pnpm test`
Expected: both PASS — every existing verify script still prints all `✓ OK` (including `verify-demo-audio-coverage.mjs`, now correctly treating the 20 new tracks as pending rather than failing), and the new `verify-kyrgyz-catalog.mjs` passes as part of the chain.

- [ ] **Step 11: Commit**

```bash
git add apps/mobile/src/mocks/artists.ts apps/mobile/src/mocks/tracks.ts apps/mobile/src/audio/demo-sources.ts apps/mobile/scripts/verify-kyrgyz-catalog.mjs apps/mobile/scripts/verify-demo-audio-coverage.mjs apps/mobile/package.json
git commit -m "feat: add 20 Kyrgyz track/artist metadata entries (no audio yet)"
```

## Task 2: Document the audio import workflow (no audio added now)

**Files:**
- Create: `apps/mobile/assets/audio/kyrgyz/PENDING.md`

**Interfaces:**
- Consumes: the 20 track ids from Task 1.
- Produces: a runbook a future task (once licensed files exist) follows — documentation only, no code interface.

- [ ] **Step 1: Write the import runbook**

```markdown
# Kyrgyz track audio — pending licensed files

None of the 20 Kyrgyz tracks added in
docs/superpowers/plans/2026-10-12-kyrgyz-track-catalog.md have audio yet.
This file is the handoff checklist for wiring in real, licensed files once
they're supplied. Do not add a file here until you have confirmed the
rights holder has authorized its use in this app.

For each track you have a licensed file for:

1. Place the audio file at `apps/mobile/assets/audio/kyrgyz/<track-id>.mp3`
   (track id from the table below — must match the `Track.id` exactly).
2. Add one line to `DEMO_SOURCES` in `apps/mobile/src/audio/demo-sources.ts`:
   `'<track-id>': require('../../assets/audio/kyrgyz/<track-id>.mp3'),`
3. Add a row to a new `apps/mobile/assets/audio/kyrgyz/CREDITS.md` (create
   it the first time, same table format as the existing top-level
   `assets/audio/CREDITS.md`) recording: file name + byte size, the
   rightsholder, the license/permission reference (contract, email,
   written permission — whatever proof your organization requires), and
   the date added.
4. Update this track's `durationSec` in `apps/mobile/src/mocks/tracks.ts`
   from the 180-second placeholder to the real file's duration.
5. Remove this track's row from the table below, and remove its id from
   `PENDING_AUDIO_TRACK_IDS` in `apps/mobile/src/audio/demo-sources.ts`.
6. Run `cd apps/mobile && pnpm test` — `verify-kyrgyz-catalog.mjs`'s "no
   demo audio" check and `verify-demo-audio-coverage.mjs`'s pending-id
   exemption will now correctly fail for this track id (it has real audio
   now); update `verify-kyrgyz-catalog.mjs` to drop the now-playable id
   from its `hasDemoAudio(trackId) === false` assertion list.
7. Manually verify playback: `npx expo start --web`, open the track from
   its artist/genre page, confirm it plays and `now-playing.tsx`'s credits
   sheet reads correctly.

## Pending tracks (20)

| Track id | Title | Artist |
|---|---|---|
| kyrgyzstanym | Кыргызстан | Амирчик |
| muras | Мурас | Мирбек Атабеков |
| ene-til | Эне Тил | Баястан |
| alai | Алай | Бегиш |
| kachan-kaitat | Качан Кайтат | Баястан, Бегиш, G-VOO |
| jazym-kelchi | Жазым келчи | Гульнур Сатылганова |
| kyrgyz-biyi | Кыргыз бийи | Султан Садыралиев |
| ne-segodnya | Не сегодня (Семьдесят пятый) | Улукманапо |
| kirgiz-jeri | Кыргыз жери | Саламат Садыкова |
| erke-kyz | Эрке Кыз | Тенгир-Тоо |
| chopo-choor-fantasy | Fantasy on the Chopo Choor | Нурланбек Нышанов |
| kyrgyzstanym-remix | Кыргызстаным (Remix) | Омар Жанышов |
| jashtyk-kez | Жаштык Кез | Кайрат Кыргыз |
| kambarkan | Камбаркан | Нурак Абдрахманов |
| esimde | Эсимде | Toktobek Asanaliev |
| kyrgyz-bala | Кыргыз бала | KIGGAZ |
| taimuras | Таймурас | G-VOO |
| ananayyn | Ананайын | Тамга |
| eto-lyubov | Это любовь | Айбек Замиров |
| issyk-kulskiy-vaib | Иссык-Кульский Вайб | FreeMan996 |
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/assets/audio/kyrgyz/PENDING.md
git commit -m "docs: add Kyrgyz audio import runbook (no files yet)"
```

## Task 3 (GATED — do not run without separate explicit approval): Extend `GENRE_TAG_MAP`

This task is written out for completeness but **must not be executed** as part of approving this plan. `genre-tracks.ts:6-9` explicitly says the mapping is locked and user-approved-only. If and when the user gives separate, explicit sign-off specifically for this change:

**Files:**
- Modify: `apps/mobile/src/lib/genre-tracks.ts:10-15`
- Modify: `apps/mobile/src/mocks/artists.ts` (the 19 artists from Task 1 each get a `'Kyrgyz'` tag added to their `genres` array, alongside their existing `'Kyrgyz Pop'/'Kyrgyz Rap'/'Kyrgyz Folk'` tag)
- Modify: `apps/mobile/scripts/verify-genre-tracks.mjs` (extend its checks to cover the now-non-empty `kyrgyz-music` genre)

- [ ] **Step 1 (on approval only): add the map entry**

```typescript
export const GENRE_TAG_MAP: Record<string, string[]> = {
  'electronic-dance': ['Electronic'],
  'chill-lofi': ['Ambient', 'Lo-Fi'],
  'rock-indie': ['Indie'],
  'classical-film': ['Neo-Classical'],
  'kyrgyz-music': ['Kyrgyz Pop', 'Kyrgyz Rap', 'Kyrgyz Folk'],
};
```

- [ ] **Step 2 (on approval only): verify and commit**

Run: `cd apps/mobile && pnpm run typecheck && pnpm test`
Then: `git commit -m "feat: surface Kyrgyz tracks under the kyrgyz-music genre (explicit user approval YYYY-MM-DD)"` — the commit message must record the approval date, since the code comment calls out that this change needs it.
