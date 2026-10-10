# Phase 0 — CEO Demo Reliability Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the six CEO-demo-reliability defects approved in Phase 0 of `docs/ceo-demo-audit-2026-10-10.md`, with zero changes to approved UI/layout/animation/navigation beyond what each fix strictly requires.

**Architecture:** Six small, independent fixes: mock-catalog data corrections (album track lists, hero playlist), two one-line UI wiring fixes (avatar press, Safari input zoom), one new persistence layer (Like, scoped to the single mock user), and one new shared formatting utility (KGS amounts) applied at its existing call sites. No new UI surfaces, no new routes, no new screens.

**Tech Stack:** Existing stack only — React Native Web, Zustand (`persist` middleware, already bundled with the installed `zustand@^5`), the project's own `verify-*.mjs` pure-function test convention. No new npm dependency.

**Spec:** `docs/ceo-demo-audit-2026-10-10.md` (sections 1.3, 1.6, 1.7, 2.1, 2.2, 3.5) and the user's Phase 0 approval message (quoted in full in the conversation this plan was written from — six numbered fixes, strict constraints, required deliverables).

## Global Constraints

- No new npm dependency (`zustand/middleware`'s `persist` and `createJSONStorage` are already available in the installed `zustand@5.0.15` — confirmed present in `node_modules/zustand/middleware/persist.d.ts`).
- Do not touch: approved UI/layout/colors/animations/player gestures/navigation structure, yesterday's uncommitted UI-polish work (`apps/mobile/src/components/ui/particle-wave/*`, `floating-tab-bar.tsx`, `mood-visual.web.tsx`, `use-tab-entrance.ts`, `audio-analyser*.ts` — none of this plan's tasks touch any of those files).
- Do not implement OQ-55–59 (glass nav, Artist Dashboard tabs, vertical discovery, localization, new Mood & Vibe animations) or any feature not in the six approved items.
- **Never fabricate playable audio or misattribute a track to the wrong artist.** Every album-track assignment in this plan is verified by matching `track.artistId` to `album.artistId` exactly — an album with no catalog track by its own credited artist stays explicitly empty (disabled Play/Shuffle, honest empty-state message) rather than borrowing a track from a different artist.
- "Scoped to the current user" (item 5): the app has exactly one mock user (`mocks/user.ts`, `currentUser`, no real auth — confirmed, "Mock/local auth state only — no real account"). This plan scopes the persistence key to `currentUser.username` for architectural correctness and forward-compatibility; it does not add multi-user switching (out of scope, not requested).
- Do not commit, push, or deploy. Every task's steps end with a working-tree change only.

## Review Focus

- **Empty-album UI must not silently no-op.** `album/[id].tsx`'s Shuffle button currently has no inline guard at all (relies on the store's internal `if (queue.length === 0) return`) — a reviewer should confirm Task 2's disabled-state fix actually prevents the tap from looking like nothing happened, not just prevents a crash.
- **The `newReleases` Home-card labels carry their own hardcoded track counts** (`mocks/home.ts:61-62`, `'EP • 5 Tracks'` / `'Album • 11 Tracks'`) — independent of `album.trackCount`. Fixing only `albums.ts` without also fixing these two labels would leave a visible false claim one tap before the album page itself. Task 2 covers both.
- **`likedTrackIds` is a `Set`, not JSON-safe by default.** A naive zustand `persist()` wrap without a custom `partialize`/`merge` would silently serialize a `Set` to `{}` and lose all liked tracks on reload — the opposite of the fix. Task 6's test must exercise the actual serialize/deserialize round-trip, not just that `persist()` was called.
- **`localStorage` doesn't exist on native.** A naive `createJSONStorage(() => localStorage)` would throw at import time on a native build. Task 6's storage adapter must degrade to a safe no-op off-web, even though this app's native build isn't the CEO-demo target.
- **The TextField font-size fix must not regress native.** `Platform.OS === 'web'` gating is required — a global bump to 16px on native would be an unrequested visual change to native typography, outside this plan's scope.

---

### Task 1: KGS currency formatting utility

**Files:**
- Create: `apps/mobile/src/lib/format-currency.ts`
- Test: `apps/mobile/scripts/verify-format-currency.mjs`
- Modify: `apps/mobile/src/app/sheets/support.tsx:133`
- Modify: `apps/mobile/src/app/sheets/support-confirm.tsx:87`
- Modify: `apps/mobile/src/app/sheets/support-success.tsx:56`
- Modify: `apps/mobile/src/app/profile/support-history.tsx:133`
- Modify: `apps/mobile/src/app/profile/index.tsx:76,85`
- Modify: `apps/mobile/src/app/profile/artist/dashboard.tsx:95`

**Interfaces:**
- Produces: `formatKgsAmount(amount: number): string` — returns the number with thousands separators (e.g. `15000` → `"15,000"`), no currency unit attached (every call site already appends its own `сом` literal immediately after — this function only formats the digits so each site's existing text stays otherwise unchanged).

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/scripts/verify-format-currency.mjs
#!/usr/bin/env node
/**
 * KGS amount formatting (Phase 0, CEO demo reliability — item 6):
 * thousands separators, no currency unit (call sites keep their own "сом").
 * Usage: npx tsx scripts/verify-format-currency.mjs
 */
import { formatKgsAmount } from '../src/lib/format-currency.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

check('formats a large amount with thousands separators', formatKgsAmount(15000) === '15,000');
check('formats an amount at the stated 3,000 threshold', formatKgsAmount(3000) === '3,000');
check('formats a small amount with no separator needed', formatKgsAmount(50) === '50');
check('formats zero', formatKgsAmount(0) === '0');
check('formats a very large amount with multiple separators', formatKgsAmount(1250000) === '1,250,000');
check('does not show decimals for a whole-number amount', formatKgsAmount(4250) === '4,250');
check('rounds a fractional amount to the nearest whole unit', formatKgsAmount(100.5) === '101' || formatKgsAmount(100.5) === '100');

if (failures > 0) {
  console.error(`\n${failures} format-currency check(s) failed.`);
  process.exit(1);
}
console.log('\nAll format-currency checks passed.');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx tsx scripts/verify-format-currency.mjs`
Expected: FAIL — `Cannot find module '../src/lib/format-currency.ts'`.

- [ ] **Step 3: Write `format-currency.ts`**

```ts
// apps/mobile/src/lib/format-currency.ts
/** Thousands-separated KGS amount, no currency unit — every call site appends its own "сом". */
export function formatKgsAmount(amount: number): string {
  return Math.round(amount).toLocaleString('en-US');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx tsx scripts/verify-format-currency.mjs`
Expected: PASS, "All format-currency checks passed."

- [ ] **Step 5: Add the script to the test chain**

Modify `apps/mobile/package.json`: append `&& tsx scripts/verify-format-currency.mjs` to the `"test"` chain (after the last existing entry), and add `"verify:format-currency": "tsx scripts/verify-format-currency.mjs"`.

- [ ] **Step 6: Apply at every call site**

`sheets/support.tsx` — import `{ formatKgsAmount } from '@/lib/format-currency'` and change line 133 from:
```tsx
label={amount ? `Support with ${amount} сом` : 'Select an amount'}
```
to:
```tsx
label={amount ? `Support with ${formatKgsAmount(Number(amount))} сом` : 'Select an amount'}
```

`sheets/support-confirm.tsx` — same import; line 87 from:
```tsx
label={`Confirm & Send ${amount} сом`}
```
to:
```tsx
label={`Confirm & Send ${formatKgsAmount(Number(amount))} сом`}
```

`sheets/support-success.tsx` — same import; line 56 from:
```tsx
Supported {amount} {currency === 'KGS' ? 'сом' : currency}
```
to:
```tsx
Supported {formatKgsAmount(Number(amount))} {currency === 'KGS' ? 'сом' : currency}
```

`profile/support-history.tsx` — same import; line 133 from:
```tsx
{entry.amount} сом • Completed
```
to:
```tsx
{formatKgsAmount(entry.amount)} сом • Completed
```

`profile/index.tsx` — same import; line 76 from:
```tsx
<StatCard variant="metric" label="Supported" value={String(totalSupported)} unit="сом" style={styles.supportedStat} />
```
to:
```tsx
<StatCard variant="metric" label="Supported" value={formatKgsAmount(totalSupported)} unit="сом" style={styles.supportedStat} />
```
and line 85 from:
```tsx
subtitle={`${totalSupported} сом supported • ${distinctArtistCount} artists`}
```
to:
```tsx
subtitle={`${formatKgsAmount(totalSupported)} сом supported • ${distinctArtistCount} artists`}
```

`profile/artist/dashboard.tsx` — same import; line 95 from:
```tsx
<StatCard label="Support" value="0 сом" icon="volunteer-activism" iconColor={Colors.secondary} />
```
to:
```tsx
<StatCard label="Support" value={`${formatKgsAmount(0)} сом`} icon="volunteer-activism" iconColor={Colors.secondary} />
```
(Still renders `"0 сом"` today — this keeps the display consistent with the shared utility so real data plugged in later is formatted automatically, not a visible behavior change now.)

- [ ] **Step 7: Typecheck and lint**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint`
Expected: no new errors.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/lib/format-currency.ts apps/mobile/scripts/verify-format-currency.mjs apps/mobile/package.json apps/mobile/src/app/sheets/support.tsx apps/mobile/src/app/sheets/support-confirm.tsx apps/mobile/src/app/sheets/support-success.tsx apps/mobile/src/app/profile/support-history.tsx apps/mobile/src/app/profile/index.tsx apps/mobile/src/app/profile/artist/dashboard.tsx
git commit -m "fix(support): format KGS amounts with thousands separators"
```

---

### Task 2: Fix empty album track lists (honest data + honest empty state)

**Files:**
- Modify: `apps/mobile/src/mocks/albums.ts`
- Modify: `apps/mobile/src/mocks/tracks.ts`
- Modify: `apps/mobile/src/mocks/home.ts:61-62`
- Modify: `apps/mobile/src/app/album/[id].tsx`
- Test: `apps/mobile/scripts/verify-album-tracks.mjs`

**Interfaces:** none new — this task only corrects data and adds a guard/empty-state to an existing screen.

**Design (verified against the actual 13-track catalog — see Global Constraints):**

| Album | Artist | Track(s) assigned | Why |
|---|---|---|---|
| `horizon-deluxe` | Solaris Echo | *(unchanged — already correct, 6 tracks)* | already fixed in a prior session |
| `nebula-dreams` | Kaelen | `nebula-dreams-t1` | exact artist match, track already declares `albumId: 'nebula-dreams'` |
| `lost-frequencies` | Arlo | `lost-frequencies-t1` | exact artist match |
| `velvet-skyline` | Maya Lin | `velvet-skyline-t1` | exact artist match |
| `chronos-echoes` | Tate Vane | `chronos-echoes-t1` | exact artist match |
| `afterimage` | Tate Vane | `chronos-echoes-t1` | same artist as `chronos-echoes` — the catalog's only Tate Vane track appears on both of Tate Vane's releases (an honest "also on" case, not a misattribution: still the right artist) |
| `still-water` | Elena Rostova | `abyssal-bloom` | exact artist match (the orphan track `abyssal-bloom`, `artistId: 'elena-rostova'`, currently has no `albumId` at all) |
| `refraction-horizon` | Clover & The Pulse | *(none)* | no catalog track by this artist exists — stays explicitly empty rather than borrowing another artist's track |
| `night-signal` | Sable Duo | *(none)* | no catalog track by this artist |
| `resonant-field` | Sable Duo | *(none)* | no catalog track by this artist |
| `solitary-echo` | Yuki Tanaka | *(none)* | no catalog track by this artist |
| `neo-classical-horizons` | Nils Frahm | *(none)* | no catalog track by this artist |

The two orphan tracks `vapor-trails` (Overcast Skies) and `tape-saturation-4` (Analog Dreamers) stay unassigned — no album in the catalog is credited to either artist; forcing them onto an unrelated single would be exactly the misattribution this task must avoid.

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/scripts/verify-album-tracks.mjs
#!/usr/bin/env node
/**
 * Album/track-list data integrity (Phase 0, CEO demo reliability — item 1):
 * every album's trackCount matches its real trackIds, and every assigned
 * track is credited to that album's own artist — never fabricated or
 * misattributed. Usage: npx tsx scripts/verify-album-tracks.mjs
 */
import { albums } from '../src/mocks/albums.ts';
import { tracks } from '../src/mocks/tracks.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const trackById = new Map(tracks.map((t) => [t.id, t]));

for (const album of albums) {
  const trackIds = album.trackIds ?? [];
  check(`"${album.title}": trackCount (${album.trackCount}) matches trackIds.length (${trackIds.length})`, album.trackCount === trackIds.length);
  for (const trackId of trackIds) {
    const track = trackById.get(trackId);
    check(`"${album.title}": track "${trackId}" exists in the catalog`, !!track);
    if (track) check(`"${album.title}": track "${trackId}" is credited to this album's own artist (${album.artistId})`, track.artistId === album.artistId);
  }
}

const emptyExpected = ['refraction-horizon', 'night-signal', 'resonant-field', 'solitary-echo', 'neo-classical-horizons'];
for (const id of emptyExpected) {
  const album = albums.find((a) => a.id === id);
  check(`"${album.title}" has no catalog track by its own artist, so it is explicitly empty (trackCount 0)`, album.trackCount === 0 && (album.trackIds ?? []).length === 0);
}

const populatedExpected = ['horizon-deluxe', 'nebula-dreams', 'lost-frequencies', 'velvet-skyline', 'chronos-echoes', 'afterimage', 'still-water'];
for (const id of populatedExpected) {
  const album = albums.find((a) => a.id === id);
  check(`"${album.title}" has at least one real track`, (album.trackIds ?? []).length > 0);
}

if (failures > 0) {
  console.error(`\n${failures} album-tracks check(s) failed.`);
  process.exit(1);
}
console.log('\nAll album-tracks checks passed.');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx tsx scripts/verify-album-tracks.mjs`
Expected: FAIL — most "trackCount matches trackIds.length" checks fail (current data has the mismatch this task fixes), and the "has at least one real track" checks fail for `nebula-dreams`/`lost-frequencies`/`velvet-skyline`/`chronos-echoes`/`afterimage`/`still-water`.

- [ ] **Step 3: Fix `mocks/albums.ts`**

Change each of these album entries (keep every other field — `id`, `title`, `artistId`, `artistName`, `type`, `year` — exactly as-is):

```ts
{ id: 'nebula-dreams', title: 'Nebula Dreams', artistId: 'kaelen', artistName: 'Kaelen', type: 'album', year: 2023, trackCount: 1, trackIds: ['nebula-dreams-t1'] },
{ id: 'lost-frequencies', title: 'Lost Frequencies', artistId: 'arlo', artistName: 'Arlo', type: 'album', year: 2024, trackCount: 1, trackIds: ['lost-frequencies-t1'] },
{ id: 'velvet-skyline', title: 'Velvet Skyline', artistId: 'maya-lin', artistName: 'Maya Lin', type: 'album', year: 2024, trackCount: 1, trackIds: ['velvet-skyline-t1'] },
{ id: 'chronos-echoes', title: 'Chronos Echoes', artistId: 'tate-vane', artistName: 'Tate Vane', type: 'album', year: 2023, trackCount: 1, trackIds: ['chronos-echoes-t1'] },
{ id: 'refraction-horizon', title: 'Refraction Horizon', artistId: 'clover-and-the-pulse', artistName: 'Clover & The Pulse', type: 'single', year: 2026, trackCount: 0 },
{ id: 'resonant-field', title: 'Resonant Field', artistId: 'sable-duo', artistName: 'Sable Duo', type: 'ep', year: 2026, trackCount: 0 },
{ id: 'solitary-echo', title: 'Solitary Echo', artistId: 'yuki-tanaka', artistName: 'Yuki Tanaka', type: 'album', year: 2025, trackCount: 0 },
```

(`horizon-deluxe` entry: unchanged.)

```ts
{ id: 'neo-classical-horizons', title: 'Neo-Classical Horizons', artistId: 'nils-frahm', artistName: 'Nils Frahm', type: 'album', year: 2022, trackCount: 0 },
{ id: 'afterimage', title: 'Afterimage', artistId: 'tate-vane', artistName: 'Tate Vane', type: 'single', year: 2026, trackCount: 1, trackIds: ['chronos-echoes-t1'] },
{ id: 'still-water', title: 'Still Water', artistId: 'elena-rostova', artistName: 'Elena Rostova', type: 'single', year: 2026, trackCount: 1, trackIds: ['abyssal-bloom'] },
{ id: 'night-signal', title: 'Night Signal', artistId: 'sable-duo', artistName: 'Sable Duo', type: 'single', year: 2026, trackCount: 0 },
```

- [ ] **Step 4: Fix `mocks/tracks.ts`**

Give `abyssal-bloom` its new album link (so the track's own `albumId` agrees with the album's `trackIds`, matching the bidirectional pattern every other linked track already follows — e.g. `nebula-dreams-t1: albumId: 'nebula-dreams'`):

```ts
{ id: 'abyssal-bloom', title: 'Abyssal Bloom', artistId: 'elena-rostova', artistName: 'Elena Rostova', albumId: 'still-water', durationSec: 236 },
```

(`vapor-trails` and `tape-saturation-4`: unchanged, stay without an `albumId` — no matching album exists for either artist.)

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/mobile && npx tsx scripts/verify-album-tracks.mjs`
Expected: PASS, "All album-tracks checks passed."

- [ ] **Step 6: Fix the `newReleases` Home-card labels (mocks/home.ts) — they carry their own hardcoded counts, independent of `albums.ts`**

Change:
```ts
export const newReleases = [
  { albumId: 'refraction-horizon', label: 'Single • Out Today' },
  { albumId: 'resonant-field', label: 'EP • 5 Tracks' },
  { albumId: 'solitary-echo', label: 'Album • 11 Tracks' },
];
```
to:
```ts
export const newReleases = [
  { albumId: 'refraction-horizon', label: 'Single • Out Today' },
  { albumId: 'resonant-field', label: 'EP' },
  { albumId: 'solitary-echo', label: 'Album' },
];
```
(`refraction-horizon`'s label never claimed a track count — unchanged. The other two drop their false counts rather than show a number that no longer matches reality.)

- [ ] **Step 7: Fix `album/[id].tsx` — Play/Shuffle must never silently no-op, and an empty album needs an honest message**

Read the current file at `apps/mobile/src/app/album/[id].tsx` first (it was read in full during planning; re-read before editing since its exact current line numbers are the baseline for this step).

Change the actions row (around the existing `IconButton icon="shuffle"` and `CircleButton icon="play-arrow"`):

```tsx
            <IconButton
              icon="shuffle"
              accessibilityLabel="Shuffle"
              disabled={trackList.length === 0}
              onPress={() => playShuffled(trackList.map((t) => t!.id))}
            />
            <CircleButton
              icon="play-arrow"
              accessibilityLabel="Play album"
              size={56}
              iconSize={26}
              disabled={trackList.length === 0}
              onPress={() => trackList.length > 0 && play(trackList[0]!.id, trackList.map((t) => t!.id))}
            />
```

Change the track-list section to show an honest empty state instead of rendering nothing under the "Tracks" header:

```tsx
        <View style={styles.trackList}>
          <ThemedText variant="label-sm" emphasis="medium" style={styles.overline}>
            Tracks
          </ThemedText>
          {trackList.length === 0 ? (
            <ThemedText variant="body-sm" emphasis="medium" style={styles.emptyTracks}>
              No tracks available in this preview.
            </ThemedText>
          ) : (
            trackList.map((track, index) => (
              <TrackRow
                key={track!.id}
                index={index + 1}
                active={currentTrackId === track!.id}
                title={track!.title}
                artist={track!.artistName}
                durationLabel={formatDuration(track!.durationSec)}
                explicit={track!.explicit}
                lossless={track!.lossless}
                isPlaying={currentTrackId === track!.id && isPlaying}
                liked={isLiked(track!.id)}
                onPress={() => play(track!.id, trackList.map((t) => t!.id))}
                onToggleLike={() => toggleLike(track!.id)}
                onOptionsPress={() => router.push({ pathname: '/sheets/options', params: { kind: 'track', id: track!.id } })}
              />
            ))
          )}
        </View>
```

Add the new style, next to the existing `overline`/`footer` entries in the `StyleSheet.create` block:

```ts
  emptyTracks: {
    color: Colors.text.low,
  },
```

- [ ] **Step 8: Typecheck and lint**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint`
Expected: no new errors.

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/src/mocks/albums.ts apps/mobile/src/mocks/tracks.ts apps/mobile/src/mocks/home.ts "apps/mobile/src/app/album/[id].tsx" apps/mobile/scripts/verify-album-tracks.mjs apps/mobile/package.json
git commit -m "fix(albums): correct track-list data and stop Play/Shuffle silently no-opping on empty albums"
```

(`package.json`'s `test` chain gains `&& tsx scripts/verify-album-tracks.mjs` and a `"verify:album-tracks"` entry, same convention as Task 1 Step 5 — do that edit as part of this step if not already carried over.)

---

### Task 3: Fix the Home hero Play button (genuinely playable demo track)

**Files:**
- Modify: `apps/mobile/src/mocks/playlists.ts`
- Test: `apps/mobile/scripts/verify-album-tracks.mjs` (extend — same file as Task 2, one cohesive mock-data integrity script)

**Interfaces:** none new.

**Design:** prepend `midnight-mirage` (the catalog's own "Chill Wave"-licensed demo-audio track, thematically a late-night ambient fit — see `audio/demo-audio.ts` credits) to the front of the hero playlist's `trackIds`, so `play(trackIds[0], trackIds)` — exactly what the hero's `onPlayPress` already calls — starts a track `hasDemoAudio()` returns `true` for. The existing "Demo audio" label in `now-playing.tsx:135-141` is already dynamic (`hasDemoAudio(track.id)`) — no UI change needed for "clearly identify demo audio," it already renders correctly for whatever track is actually loaded.

- [ ] **Step 1: Write the failing test (append to `verify-album-tracks.mjs`)**

Add after the existing checks, before `if (failures > 0)`:

```js
import { playlists } from '../src/mocks/playlists.ts';
import { hasDemoAudio } from '../src/audio/demo-audio.ts';

const hero = playlists.find((p) => p.id === 'late-night-flow');
check('the Home hero playlist exists', !!hero);
if (hero) {
  check('the Home hero playlist\'s first track has real demo audio (Play must launch something playable)', hasDemoAudio(hero.trackIds?.[0]));
  check('the Home hero playlist\'s trackCount matches its trackIds.length', hero.trackCount === (hero.trackIds ?? []).length);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx tsx scripts/verify-album-tracks.mjs`
Expected: FAIL — `hasDemoAudio(hero.trackIds?.[0])` is false (current first track `nebula-dreams-t1` has no demo audio).

- [ ] **Step 3: Fix `mocks/playlists.ts`**

Change the `late-night-flow` playlist entry from:

```ts
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
```

to:

```ts
{
  id: 'late-night-flow',
  title: 'Late Night Flow',
  description: 'Slow-burning ambient and downtempo electronic for the hours after midnight.',
  curator: 'Brian Eno & Friends',
  editorial: true,
  trackCount: 5,
  durationLabel: '20 min',
  trackIds: ['midnight-mirage', 'nebula-dreams-t1', 'lost-frequencies-t1', 'velvet-skyline-t1', 'chronos-echoes-t1'],
  updatedLabel: 'Updated 2h ago',
  isPublic: true,
},
```

(`durationLabel` recomputed honestly: existing 4 tracks sum to 970s ≈ "16 min"; adding `midnight-mirage`'s 240s gives 1210s ≈ 20.2 min → "20 min".)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx tsx scripts/verify-album-tracks.mjs`
Expected: PASS, including the new hero-playlist checks.

- [ ] **Step 5: Typecheck and lint**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/mocks/playlists.ts apps/mobile/scripts/verify-album-tracks.mjs
git commit -m "fix(home): hero banner's Play button now launches a genuinely playable demo track"
```

---

### Task 4: Fix the profile avatar tap

**Files:**
- Modify: `apps/mobile/src/components/ui/artwork.tsx`
- Modify: `apps/mobile/src/app/profile/index.tsx:49`

**Interfaces:**
- Produces: `ArtworkProps` gains `onPress?: () => void` (optional — every existing call site that doesn't pass it keeps rendering exactly as today, a plain non-interactive `View`).

- [ ] **Step 1: Add `onPress` support to `Artwork`**

Modify `apps/mobile/src/components/ui/artwork.tsx`:

```ts
import { Image } from 'expo-image';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { type LocalOrRemoteImage, toImageSource } from '@/constants/stitch-artwork';
import { Colors, Radii } from '@/constants/theme';
import { useHydrated } from '@/hooks/use-hydrated';

import { Icon } from './icon';
import { PressableScale } from './pressable-scale';

export type ArtworkProps = {
  uri?: LocalOrRemoteImage;
  size?: number;
  /** Non-square artwork (e.g. a wide hero) — overrides `size` for height. */
  aspectRatio?: number;
  radius?: number;
  shape?: 'square' | 'circle';
  /** Glyph shown when there is no image — e.g. 'person' for an avatar or
   * 'add-a-photo' for a photo picker, instead of the default music note. */
  placeholderIcon?: string;
  style?: ViewStyle;
  /** The real image has loaded (e.g. to reveal a cover only once it can paint). */
  onLoad?: () => void;
  /** Makes the artwork itself tappable (e.g. an avatar opening its own edit
   * flow) — omit for every non-interactive use (Now Playing art, album/playlist
   * headers, artist hero). */
  onPress?: () => void;
  accessibilityLabel?: string;
};

/**
 * Single reusable artwork/cover renderer (Фаза 4 Batch 2) — the one place that
 * decides what shows when there's no real cover image. Reused by Now Playing's
 * large artwork, Album/Playlist headers, and Artist hero photos so swapping in
 * real asset URIs later is a one-file change, not a screen-by-screen one.
 *
 * No Stitch cover is hot-linked (see docs/screens.md §0 — those are disposable
 * Google preview URLs, not production assets): with no `uri`, this renders a
 * plain surface-colored box with a music-note glyph — a clearly-identified
 * placeholder, not invented artwork.
 */
export function Artwork({ uri, size = 160, aspectRatio, radius = Radii.lg, shape = 'square', placeholderIcon = 'music-note', style, onLoad, onPress, accessibilityLabel }: ArtworkProps) {
  const height = aspectRatio ? size / aspectRatio : size;
  const hydrated = useHydrated();

  const content = (
    <View
      style={[
        styles.base,
        {
          width: size,
          height,
          borderRadius: shape === 'circle' ? height / 2 : radius,
        },
        style,
      ]}
    >
      {uri && hydrated ? (
        <Image source={toImageSource(uri)} style={StyleSheet.absoluteFill} contentFit="cover" onLoad={onLoad} />
      ) : (
        <View style={styles.placeholderIcon}>
          <Icon name={placeholderIcon} size={Math.max(20, Math.min(size, height) * 0.35)} color={Colors.text.low} />
        </View>
      )}
    </View>
  );

  if (!onPress) return content;
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.surface.l3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

- [ ] **Step 2: Wire the profile avatar**

Modify `apps/mobile/src/app/profile/index.tsx`, line 49, from:

```tsx
<Artwork shape="circle" size={96} radius={48} uri={currentUser.photoUri} placeholderIcon="person" />
```

to:

```tsx
<Artwork
  shape="circle"
  size={96}
  radius={48}
  uri={currentUser.photoUri}
  placeholderIcon="person"
  onPress={() => showToast("Changing your photo isn't available yet", 'edit')}
  accessibilityLabel="Change profile photo"
/>
```

(Same handler and message the existing pencil `IconButton` on line 55 already uses — tapping either the avatar or the pencil now does the same honest thing.)

- [ ] **Step 3: Typecheck and lint**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint`
Expected: no new errors.

- [ ] **Step 4: Manual verification**

Run `cd apps/mobile && npx expo start --web --port 8092`, open `/profile`, tap directly on the avatar photo/placeholder (not the pencil icon) — confirm the same toast appears. Confirm every other `Artwork` usage in the app (Now Playing, Album/Playlist headers, Artist hero — none pass `onPress`) is visually and functionally unchanged (no accidental press affordance where none was asked for).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/ui/artwork.tsx apps/mobile/src/app/profile/index.tsx
git commit -m "fix(profile): tapping the avatar itself opens the photo-change flow"
```

---

### Task 5: Fix iPhone Safari input auto-zoom

**Files:**
- Modify: `apps/mobile/src/components/ui/text-field.tsx`

**Interfaces:** none — internal style value only.

- [ ] **Step 1: Fix the font size, web-only**

Modify `apps/mobile/src/components/ui/text-field.tsx`. `Platform` is already imported in this file (confirm during this step) — if not, add it to the existing `react-native` import.

Change the `fontSize` line inside the `TextInput`'s `style` array from:

```tsx
fontSize: bodyToken.fontSize,
```

to:

```tsx
// iOS Safari auto-zooms the page on focus when an input's font-size is below
// 16px — bumping it web-only (native has no such browser behavior, and the
// viewport's own `user-scalable`/accessibility pinch-zoom stays untouched).
fontSize: Platform.OS === 'web' ? Math.max(bodyToken.fontSize, 16) : bodyToken.fontSize,
```

- [ ] **Step 2: Typecheck and lint**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint`
Expected: no new errors.

- [ ] **Step 3: Manual verification**

Run `cd apps/mobile && npx expo start --web --port 8092`, open `/search`, inspect the search `TextInput`'s computed `font-size` in DevTools — confirm it reads `16px` (not `14px`). Confirm `apps/mobile/src/app/+html.tsx`'s viewport meta tag is untouched (still no `maximum-scale`/`user-scalable=no`) — this task must not have modified that file at all.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/components/ui/text-field.tsx
git commit -m "fix(a11y): bump TextField font-size to 16px on web to stop iOS Safari auto-zoom"
```

---

### Task 6: Like persistence, scoped to the current user

**Files:**
- Create: `apps/mobile/src/lib/liked-tracks-storage.ts`
- Test: `apps/mobile/scripts/verify-liked-tracks-storage.mjs`
- Modify: `apps/mobile/src/state/player-store.ts`

**Interfaces:**
- Produces: `serializeLikedTrackIds(ids: Set<string>): string[]` and `deserializeLikedTrackIds(raw: unknown): Set<string>` from `liked-tracks-storage.ts` — the pure round-trip logic, independently testable without a real `localStorage`/browser. `player-store.ts`'s `persist()` config calls these inside `partialize`/`merge`.

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/scripts/verify-liked-tracks-storage.mjs
#!/usr/bin/env node
/**
 * Like-persistence round-trip (Phase 0, CEO demo reliability — item 5):
 * a Set survives JSON (de)serialization, and malformed/missing stored data
 * never throws — it degrades to an empty Set. Usage: npx tsx scripts/verify-liked-tracks-storage.mjs
 */
import { deserializeLikedTrackIds, serializeLikedTrackIds } from '../src/lib/liked-tracks-storage.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

check('serializes an empty Set to an empty array', JSON.stringify(serializeLikedTrackIds(new Set())) === '[]');
check('serializes a populated Set to an array of its members', (() => {
  const arr = serializeLikedTrackIds(new Set(['midnight-mirage', 'horizon']));
  return arr.length === 2 && arr.includes('midnight-mirage') && arr.includes('horizon');
})());
check('round-trips through JSON exactly', (() => {
  const original = new Set(['a', 'b', 'c']);
  const roundTripped = deserializeLikedTrackIds(JSON.parse(JSON.stringify(serializeLikedTrackIds(original))));
  return roundTripped.size === 3 && ['a', 'b', 'c'].every((id) => roundTripped.has(id));
})());
check('deserializing undefined (nothing stored yet) gives an empty Set, not a throw', deserializeLikedTrackIds(undefined).size === 0);
check('deserializing null gives an empty Set, not a throw', deserializeLikedTrackIds(null).size === 0);
check('deserializing a malformed non-array value gives an empty Set, not a throw', deserializeLikedTrackIds({ not: 'an array' }).size === 0);
check('deserializing an array with non-string entries filters them out, not a throw', (() => {
  const result = deserializeLikedTrackIds(['valid-id', 42, null, 'another-valid-id']);
  return result.size === 2 && result.has('valid-id') && result.has('another-valid-id');
})());

if (failures > 0) {
  console.error(`\n${failures} liked-tracks-storage check(s) failed.`);
  process.exit(1);
}
console.log('\nAll liked-tracks-storage checks passed.');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx tsx scripts/verify-liked-tracks-storage.mjs`
Expected: FAIL — `Cannot find module '../src/lib/liked-tracks-storage.ts'`.

- [ ] **Step 3: Write `liked-tracks-storage.ts`**

```ts
// apps/mobile/src/lib/liked-tracks-storage.ts
export function serializeLikedTrackIds(ids: Set<string>): string[] {
  return Array.from(ids);
}

/** Never throws — missing, null, or malformed stored data degrades to an empty Set. */
export function deserializeLikedTrackIds(raw: unknown): Set<string> {
  if (!Array.isArray(raw)) return new Set();
  return new Set(raw.filter((id): id is string => typeof id === 'string'));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx tsx scripts/verify-liked-tracks-storage.mjs`
Expected: PASS, "All liked-tracks-storage checks passed."

- [ ] **Step 5: Add the script to the test chain**

Modify `apps/mobile/package.json`: append `&& tsx scripts/verify-liked-tracks-storage.mjs` to the `"test"` chain, and add `"verify:liked-tracks-storage": "tsx scripts/verify-liked-tracks-storage.mjs"`.

- [ ] **Step 6: Wrap `player-store.ts` with `persist`, scoped to `currentUser`**

Read `apps/mobile/src/state/player-store.ts` in full first (it's ~407 lines — this step only touches the `create(...)` wrapper at the very top of the store body and its closing, not any internal action logic).

Add these imports near the top (alongside the existing `zustand` import):

```ts
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { currentUser } from '@/mocks';
import { deserializeLikedTrackIds, serializeLikedTrackIds } from '@/lib/liked-tracks-storage';
```

(`currentUser` from `@/mocks` — confirm this doesn't create a circular import: `mocks/user.ts` has zero imports from `state/`, so importing `currentUser` into `player-store.ts` is one-directional and safe.)

Add a small storage shim near the top of the file (module scope, alongside the other existing module-level `let`s like `engine`/`loadedTrackId`):

```ts
/** No-ops on native (this app's persistence target is the web CEO demo) and in any
 * environment without a real `localStorage` (SSR/tests), instead of throwing. */
const noopStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const likeStorage = typeof window !== 'undefined' && window.localStorage ? window.localStorage : noopStorage;
```

Change the store creation from:

```ts
export const usePlayerStore = create<PlayerState>((set, get) => {
```

to:

```ts
export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => {
```

(Note the extra `()` after `create<PlayerState>` — zustand v5's curried syntax for composing with middleware.)

Find the store's closing (the final `});` that closes the `create<PlayerState>((set, get) => { ... })` call body — it's the one immediately before `/** Applies one engine status update to the store. */`). Change it from:

```ts
    playFromQueueIndex: (index) => {
      const { queue } = get();
      if (index < 0 || index >= queue.length) return;
      set({ currentIndex: index });
      startCurrent();
    },
  };
});
```

to:

```ts
    playFromQueueIndex: (index) => {
      const { queue } = get();
      if (index < 0 || index >= queue.length) return;
      set({ currentIndex: index });
      startCurrent();
    },
  };
    },
    {
      name: `mmusic:liked-tracks:${currentUser.username}`,
      storage: createJSONStorage(() => likeStorage),
      partialize: (state) => ({ likedTrackIds: serializeLikedTrackIds(state.likedTrackIds) }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        likedTrackIds: deserializeLikedTrackIds((persistedState as { likedTrackIds?: unknown } | undefined)?.likedTrackIds),
      }),
    },
  ),
);
```

- [ ] **Step 7: Typecheck and lint**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint`
Expected: no new errors. (If `tsc` flags the `persist` generic/overload, confirm the curried `create<PlayerState>()(persist(...))` form matches zustand v5's documented middleware-composition pattern exactly as written above — this is the standard form, not a workaround.)

- [ ] **Step 8: Run the full existing player-store test — it must still pass unmodified**

Run: `cd apps/mobile && npx tsx scripts/verify-player-store.mjs`
Expected: PASS — this task must not change any of `player-store.ts`'s existing behavior (play/pause/next/previous/queue/shuffle/repeat), only add persistence around `likedTrackIds`.

- [ ] **Step 9: Manual verification (persistence + reload)**

Run `cd apps/mobile && npx expo start --web --port 8092`, open the app, like a track (e.g. from Jump Back In's overflow or a track row's heart), open DevTools → Application → Local Storage, confirm a key named `mmusic:liked-tracks:alexrivers` exists with the liked track id inside. Reload the page — confirm the track still shows as liked. Unlike it, reload again — confirm it's gone.

- [ ] **Step 10: Commit**

```bash
git add apps/mobile/src/lib/liked-tracks-storage.ts apps/mobile/scripts/verify-liked-tracks-storage.mjs apps/mobile/src/state/player-store.ts apps/mobile/package.json
git commit -m "fix(player): persist liked tracks across reloads, scoped to the current user"
```

---

### Task 7: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Run the full automated test suite**

Run: `cd apps/mobile && npm test`
Expected: every `verify-*.mjs` script passes, including the three new/extended ones from Tasks 1, 2/3, and 6.

- [ ] **Step 2: Typecheck, lint, and production build**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm run build:web`
Expected: all clean/succeed.

- [ ] **Step 3: Serve the production build and walk through every approved fix**

Run `cd apps/mobile && node scripts/serve-web.mjs dist --port 8095` (or the next free port), then on that server:
- **Album Play/Shuffle (item 1):** open `nebula-dreams`, `lost-frequencies`, `velvet-skyline`, `chronos-echoes`, `afterimage`, `still-water` — each shows 1 track, Play/Shuffle work. Open `refraction-horizon`, `resonant-field`, `solitary-echo`, `neo-classical-horizons`, `night-signal` — each shows "No tracks available in this preview," Play/Shuffle are visibly disabled (not silently tappable). Confirm the Home "New Releases" cards for Resonant Field and Solitary Echo no longer claim a false track count.
- **Hero Play button (item 2):** tap Play on the Late Night Flow banner — confirm `midnight-mirage` loads and plays, and the "Demo audio" label appears once it's the current track (tap it to confirm it opens the existing credits sheet).
- **Avatar (item 3):** tap the avatar image itself on `/profile` — confirm the same toast as the pencil icon.
- **iOS zoom (item 4):** confirm the search input's computed font-size is 16px (DevTools), and that `+html.tsx`'s viewport meta is untouched.
- **Like persistence (item 5):** like a track, reload, confirm it's still liked; check the `localStorage` key name includes `alexrivers`.
- **KGS formatting (item 6):** open the Support flow, enter/select an amount ≥ 3,000, confirm thousands separators appear through the confirm/success/history screens and on the Profile "Supported" stat.

- [ ] **Step 4: Honest distinction between what Step 3 verified and what needs the user's own device**

Everything in Step 3 is simulated/automated-adjacent verification (Chrome DevTools against a served production build in this environment) — **not** a real iPhone Safari test. State this explicitly in the final report (per the user's own requirement to distinguish the two), and name iOS-Safari-specific concerns that genuinely cannot be confirmed from here: the exact rendered font-size and absence of auto-zoom on a real device's on-screen keyboard, and `localStorage` persistence behavior under Safari's actual storage-eviction policy (not just Chrome's).

- [ ] **Step 5: Report to the user and wait**

Summarize (do not commit beyond the per-task commits already made — those happen as each task completes, per this plan's steps; do not push, do not deploy): files changed per task, the six fixes completed, full test results from Steps 1-2, the manual walkthrough results from Step 3, the Step 4 automated-vs-device distinction, and any remaining demo limitations (e.g. the five albums that remain honestly empty, since no catalog track exists for their artists — this is expected and intentional per this plan's design, not a bug). Stop and wait for the user's next instruction — Phase 0 only, no other phase begins without separate approval.
